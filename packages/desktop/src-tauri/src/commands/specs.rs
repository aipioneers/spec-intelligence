use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

/// Read the spec.md file for a given feature slug and return the raw markdown content.
/// The frontend TypeScript parser handles parsing the markdown into structured data.
#[tauri::command]
pub fn get_spec(project_path: String, slug: String) -> Result<String, String> {
    let spec_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("spec.md");

    if !spec_path.exists() {
        return Err(format!(
            "Spec file not found: specs/{}/spec.md",
            slug
        ));
    }

    fs::read_to_string(&spec_path)
        .map_err(|e| format!("Failed to read spec file: {}", e))
}

/// Get the file modification time as an ISO-like timestamp string for conflict detection.
fn get_file_modified_time(path: &PathBuf) -> Option<String> {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| {
            // Use seconds + nanoseconds for precision
            format!("{}.{}", d.as_secs(), d.subsec_nanos())
        })
}

/// Write spec content to the spec.md file with optional conflict detection.
///
/// If `last_modified` is provided, the function checks whether the file has been
/// modified since that timestamp. If it has, the write is rejected to prevent
/// overwriting concurrent edits (similar to HTTP ETag / If-Match semantics).
///
/// Returns a JSON object with the new modification timestamp and the written path.
#[tauri::command]
pub fn update_spec(
    project_path: String,
    slug: String,
    content: String,
    last_modified: Option<String>,
) -> Result<serde_json::Value, String> {
    let spec_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("spec.md");

    // Ensure the parent directory exists
    if let Some(parent) = spec_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create spec directory: {}", e))?;
    }

    // Conflict detection: if the caller provides a last_modified timestamp,
    // verify the file hasn't changed since then.
    if let Some(ref expected_mtime) = last_modified {
        if spec_path.exists() {
            if let Some(current_mtime) = get_file_modified_time(&spec_path) {
                if &current_mtime != expected_mtime {
                    return Err(format!(
                        "Conflict: spec.md has been modified since last read. Expected mtime={}, current mtime={}. Re-read the file and try again.",
                        expected_mtime, current_mtime
                    ));
                }
            }
        }
    }

    fs::write(&spec_path, &content)
        .map_err(|e| format!("Failed to write spec file: {}", e))?;

    // Get the new modification time after writing
    let new_mtime = get_file_modified_time(&spec_path).unwrap_or_default();

    let mut result = serde_json::Map::new();
    result.insert(
        "path".to_string(),
        serde_json::Value::String(spec_path.to_string_lossy().to_string()),
    );
    result.insert(
        "last_modified".to_string(),
        serde_json::Value::String(new_mtime),
    );
    result.insert(
        "bytes_written".to_string(),
        serde_json::Value::Number(serde_json::Number::from(content.len())),
    );

    Ok(serde_json::Value::Object(result))
}

/// Scan spec.md for [NEEDS CLARIFICATION: ...] markers and return them as JSON.
///
/// Returns a JSON array of objects, each with:
///  - `marker_text`: the full marker string
///  - `question`: the extracted question
///  - `line`: the 1-based line number
///  - `index`: the character offset within the line
#[tauri::command]
pub fn get_clarification_markers(
    project_path: String,
    slug: String,
) -> Result<serde_json::Value, String> {
    let spec_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("spec.md");

    if !spec_path.exists() {
        return Err(format!(
            "Spec file not found: specs/{}/spec.md",
            slug
        ));
    }

    let content = fs::read_to_string(&spec_path)
        .map_err(|e| format!("Failed to read spec file: {}", e))?;

    let re = regex::Regex::new(r"\[NEEDS CLARIFICATION:\s*([^\]]+)\]")
        .map_err(|e| format!("Regex error: {}", e))?;

    let mut markers = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        for cap in re.captures_iter(line) {
            let full_match = cap.get(0).unwrap();
            let question = cap.get(1).unwrap().as_str().trim();

            let mut marker = serde_json::Map::new();
            marker.insert(
                "marker_text".to_string(),
                serde_json::Value::String(full_match.as_str().to_string()),
            );
            marker.insert(
                "question".to_string(),
                serde_json::Value::String(question.to_string()),
            );
            marker.insert(
                "line".to_string(),
                serde_json::Value::Number(serde_json::Number::from(line_idx + 1)),
            );
            marker.insert(
                "index".to_string(),
                serde_json::Value::Number(serde_json::Number::from(full_match.start())),
            );
            markers.push(serde_json::Value::Object(marker));
        }
    }

    Ok(serde_json::Value::Array(markers))
}

/// Resolve a [NEEDS CLARIFICATION: ...] marker in spec.md.
///
/// Replaces the marker text with the provided answer, and appends an entry
/// to the Clarifications section of the spec. If no Clarifications section
/// exists, one is created at the end of the file.
///
/// Returns a JSON object with the resolution details and remaining markers.
#[tauri::command]
pub fn resolve_clarification(
    project_path: String,
    slug: String,
    marker_text: String,
    answer: String,
) -> Result<serde_json::Value, String> {
    let spec_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("spec.md");

    if !spec_path.exists() {
        return Err(format!(
            "Spec file not found: specs/{}/spec.md",
            slug
        ));
    }

    let content = fs::read_to_string(&spec_path)
        .map_err(|e| format!("Failed to read spec file: {}", e))?;

    if !content.contains(&marker_text) {
        return Err("Marker text not found in spec.md".to_string());
    }

    // Extract the question from the marker
    let question_re = regex::Regex::new(r"\[NEEDS CLARIFICATION:\s*([^\]]+)\]")
        .map_err(|e| format!("Regex error: {}", e))?;

    let question = question_re
        .captures(&marker_text)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_else(|| marker_text.clone());

    // 1. Replace the marker with the answer
    let mut updated = content.replace(&marker_text, &answer);

    // 2. Add clarification entry
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let entry = format!(
        "\n- **{}** — Q: {} — A: {}",
        today, question, answer
    );

    // Check if Clarifications section exists
    let section_re = regex::Regex::new(r"(?m)^##\s+Clarifications?\s*$")
        .map_err(|e| format!("Regex error: {}", e))?;

    if let Some(mat) = section_re.find(&updated) {
        // Insert the entry right after the heading
        let insert_pos = mat.end();
        updated.insert_str(insert_pos, &entry);
    } else {
        // Append a new Clarifications section
        updated = format!(
            "{}\n\n## Clarifications\n{}\n",
            updated.trim_end(),
            entry
        );
    }

    // Write back
    fs::write(&spec_path, &updated)
        .map_err(|e| format!("Failed to write spec file: {}", e))?;

    // Count remaining markers
    let remaining_re = regex::Regex::new(r"\[NEEDS CLARIFICATION:\s*[^\]]+\]")
        .map_err(|e| format!("Regex error: {}", e))?;
    let remaining_count = remaining_re.find_iter(&updated).count();

    let mut result = serde_json::Map::new();
    result.insert(
        "resolved".to_string(),
        serde_json::Value::Bool(true),
    );
    result.insert(
        "question".to_string(),
        serde_json::Value::String(question),
    );
    result.insert(
        "answer".to_string(),
        serde_json::Value::String(answer),
    );
    result.insert(
        "remaining_markers".to_string(),
        serde_json::Value::Number(serde_json::Number::from(remaining_count)),
    );

    Ok(serde_json::Value::Object(result))
}

/// Write raw markdown directly to the spec.md file without conflict detection.
/// This is a simpler variant of update_spec for cases where conflict detection
/// is not needed (e.g., initial creation or explicit overwrite).
///
/// Returns the file path that was written.
#[tauri::command]
pub fn update_spec_raw(
    project_path: String,
    slug: String,
    markdown: String,
) -> Result<String, String> {
    let spec_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("spec.md");

    // Ensure the parent directory exists
    if let Some(parent) = spec_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create spec directory: {}", e))?;
    }

    fs::write(&spec_path, &markdown)
        .map_err(|e| format!("Failed to write spec file: {}", e))?;

    Ok(spec_path.to_string_lossy().to_string())
}
