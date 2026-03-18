use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Feature {
    pub number: String,
    pub short_name: String,
    pub slug: String,
    pub branch_name: String,
    pub status: String,
    pub created_at: String,
    pub spec_path: String,
    pub plan_path: Option<String>,
    pub tasks_path: Option<String>,
}

/// Derive a human-readable status from the artifacts present in a feature directory.
///
/// Status rules:
/// - If tasks.md exists and contains checked items -> InProgress or Complete
/// - If plan.md exists -> Planned
/// - If spec.md exists but is small / empty -> Draft
/// - If spec.md has substantial content -> Clarifying
fn derive_status(feature_dir: &PathBuf) -> String {
    let tasks_path = feature_dir.join("tasks.md");
    let plan_path = feature_dir.join("plan.md");
    let spec_path = feature_dir.join("spec.md");

    if tasks_path.exists() {
        if let Ok(content) = fs::read_to_string(&tasks_path) {
            let total_tasks = content.matches("- [ ]").count() + content.matches("- [x]").count();
            let completed = content.matches("- [x]").count();
            if total_tasks > 0 && completed == total_tasks {
                return "Complete".to_string();
            }
            if completed > 0 {
                return "InProgress".to_string();
            }
        }
        return "Planned".to_string();
    }

    if plan_path.exists() {
        return "Planned".to_string();
    }

    if spec_path.exists() {
        if let Ok(content) = fs::read_to_string(&spec_path) {
            // A spec with more than a few lines of real content is past Draft
            let meaningful_lines = content
                .lines()
                .filter(|l| {
                    let trimmed = l.trim();
                    !trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.starts_with("---")
                })
                .count();
            if meaningful_lines > 5 {
                return "Clarifying".to_string();
            }
        }
    }

    "Draft".to_string()
}

/// Extract the NNN prefix and the remaining slug from a directory name like "001-spec-kit-ui".
fn parse_feature_dir_name(name: &str) -> Option<(String, String)> {
    if name.len() < 4 {
        return None;
    }
    let prefix = &name[..3];
    if !prefix.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    // The rest after the leading hyphen is the short name / slug
    let rest = if name.len() > 3 && name.as_bytes()[3] == b'-' {
        &name[4..]
    } else {
        &name[3..]
    };
    Some((prefix.to_string(), rest.to_string()))
}

/// Scan the `specs/` directory for feature directories matching the NNN-name pattern.
/// For each directory, check which artifacts exist and derive a status.
#[tauri::command]
pub fn list_features(project_path: String) -> Result<Vec<Feature>, String> {
    let specs_dir = PathBuf::from(&project_path).join("specs");

    if !specs_dir.exists() {
        return Ok(Vec::new());
    }

    let entries =
        fs::read_dir(&specs_dir).map_err(|e| format!("Failed to read specs directory: {}", e))?;

    let mut features: Vec<Feature> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let dir_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        let (number, short_name) = match parse_feature_dir_name(&dir_name) {
            Some(parsed) => parsed,
            None => continue,
        };

        let spec_path = path.join("spec.md");
        let plan_path = path.join("plan.md");
        let tasks_path = path.join("tasks.md");

        // Get the directory creation time as created_at
        let created_at = fs::metadata(&path)
            .and_then(|m| m.created())
            .map(|t| {
                let duration = t
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default();
                // ISO 8601 basic format
                let secs = duration.as_secs();
                format!("{}", secs)
            })
            .unwrap_or_default();

        let status = derive_status(&path);

        features.push(Feature {
            number: number.clone(),
            short_name: short_name.clone(),
            slug: dir_name.clone(),
            branch_name: dir_name.clone(),
            status,
            created_at,
            spec_path: spec_path.to_string_lossy().to_string(),
            plan_path: if plan_path.exists() {
                Some(plan_path.to_string_lossy().to_string())
            } else {
                None
            },
            tasks_path: if tasks_path.exists() {
                Some(tasks_path.to_string_lossy().to_string())
            } else {
                None
            },
        });
    }

    // Sort by feature number ascending
    features.sort_by(|a, b| a.number.cmp(&b.number));

    Ok(features)
}

/// Create a new feature by shelling out to the create-new-feature.sh script.
/// The script handles branch numbering, git branch creation, spec template copying, etc.
/// Returns the parsed JSON output from the script plus the initial spec content.
#[tauri::command]
pub fn create_feature(
    project_path: String,
    description: String,
    short_name: Option<String>,
) -> Result<serde_json::Value, String> {
    let script_path = PathBuf::from(&project_path)
        .join(".specify")
        .join("scripts")
        .join("bash")
        .join("create-new-feature.sh");

    if !script_path.exists() {
        return Err(format!(
            "Create feature script not found at: {}",
            script_path.display()
        ));
    }

    let mut cmd = Command::new("bash");
    cmd.arg(script_path.to_string_lossy().as_ref());
    cmd.arg("--json");

    if let Some(ref name) = short_name {
        cmd.arg("--short-name");
        cmd.arg(name);
    }

    cmd.arg(&description);
    cmd.current_dir(&project_path);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute create feature script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Create feature script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stdout_trimmed = stdout.trim();

    let script_result: serde_json::Value = serde_json::from_str(stdout_trimmed)
        .map_err(|e| format!("Failed to parse script output as JSON: {} (output: {})", e, stdout_trimmed))?;

    // Read the spec file content that the script created
    let spec_content = if let Some(spec_file) = script_result.get("SPEC_FILE").and_then(|v| v.as_str()) {
        fs::read_to_string(spec_file).unwrap_or_default()
    } else {
        String::new()
    };

    // Build a combined response
    let mut result = serde_json::Map::new();
    if let Some(branch) = script_result.get("BRANCH_NAME") {
        result.insert("branch_name".to_string(), branch.clone());
    }
    if let Some(spec_file) = script_result.get("SPEC_FILE") {
        result.insert("spec_file".to_string(), spec_file.clone());
    }
    if let Some(num) = script_result.get("FEATURE_NUM") {
        result.insert("feature_num".to_string(), num.clone());
    }
    result.insert(
        "spec_content".to_string(),
        serde_json::Value::String(spec_content),
    );

    Ok(serde_json::Value::Object(result))
}

/// Read a feature directory and return its metadata plus the content of spec, plan, and tasks
/// files if they exist.
#[tauri::command]
pub fn get_feature(project_path: String, slug: String) -> Result<serde_json::Value, String> {
    let feature_dir = PathBuf::from(&project_path).join("specs").join(&slug);

    if !feature_dir.exists() {
        return Err(format!("Feature directory not found: {}", slug));
    }

    let (number, short_name) = parse_feature_dir_name(&slug)
        .unwrap_or_else(|| ("000".to_string(), slug.clone()));

    let spec_path = feature_dir.join("spec.md");
    let plan_path = feature_dir.join("plan.md");
    let tasks_path = feature_dir.join("tasks.md");

    let status = derive_status(&feature_dir);

    let spec_content = if spec_path.exists() {
        Some(fs::read_to_string(&spec_path).map_err(|e| format!("Failed to read spec.md: {}", e))?)
    } else {
        None
    };

    let plan_content = if plan_path.exists() {
        Some(fs::read_to_string(&plan_path).map_err(|e| format!("Failed to read plan.md: {}", e))?)
    } else {
        None
    };

    let tasks_content = if tasks_path.exists() {
        Some(
            fs::read_to_string(&tasks_path)
                .map_err(|e| format!("Failed to read tasks.md: {}", e))?,
        )
    } else {
        None
    };

    // Collect any other markdown files in the feature directory
    let mut other_files = serde_json::Map::new();
    if let Ok(entries) = fs::read_dir(&feature_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "md" {
                        let fname = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or_default()
                            .to_string();
                        // Skip the main files we already handle
                        if fname != "spec.md" && fname != "plan.md" && fname != "tasks.md" {
                            if let Ok(content) = fs::read_to_string(&path) {
                                other_files.insert(
                                    fname,
                                    serde_json::Value::String(content),
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // List subdirectories (e.g. checklists/, contracts/)
    let mut subdirs: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(&feature_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    subdirs.push(name.to_string());
                }
            }
        }
    }
    subdirs.sort();

    let mut result = serde_json::Map::new();
    result.insert("number".to_string(), serde_json::Value::String(number));
    result.insert(
        "short_name".to_string(),
        serde_json::Value::String(short_name),
    );
    result.insert("slug".to_string(), serde_json::Value::String(slug));
    result.insert("status".to_string(), serde_json::Value::String(status));
    result.insert(
        "spec_content".to_string(),
        match spec_content {
            Some(c) => serde_json::Value::String(c),
            None => serde_json::Value::Null,
        },
    );
    result.insert(
        "plan_content".to_string(),
        match plan_content {
            Some(c) => serde_json::Value::String(c),
            None => serde_json::Value::Null,
        },
    );
    result.insert(
        "tasks_content".to_string(),
        match tasks_content {
            Some(c) => serde_json::Value::String(c),
            None => serde_json::Value::Null,
        },
    );
    result.insert(
        "spec_path".to_string(),
        serde_json::Value::String(spec_path.to_string_lossy().to_string()),
    );
    result.insert(
        "plan_path".to_string(),
        if plan_path.exists() {
            serde_json::Value::String(plan_path.to_string_lossy().to_string())
        } else {
            serde_json::Value::Null
        },
    );
    result.insert(
        "tasks_path".to_string(),
        if tasks_path.exists() {
            serde_json::Value::String(tasks_path.to_string_lossy().to_string())
        } else {
            serde_json::Value::Null
        },
    );
    result.insert(
        "other_files".to_string(),
        serde_json::Value::Object(other_files),
    );
    result.insert(
        "subdirectories".to_string(),
        serde_json::Value::Array(subdirs.into_iter().map(serde_json::Value::String).collect()),
    );

    Ok(serde_json::Value::Object(result))
}

/// Delete a feature directory (the specs/NNN-name folder). Does NOT delete the git branch.
#[tauri::command]
pub fn delete_feature(project_path: String, slug: String) -> Result<bool, String> {
    let feature_dir = PathBuf::from(&project_path).join("specs").join(&slug);

    if !feature_dir.exists() {
        return Err(format!("Feature directory not found: {}", slug));
    }

    // Safety check: ensure the path is inside specs/ directory
    let specs_dir = PathBuf::from(&project_path).join("specs");
    let canonical_feature = feature_dir
        .canonicalize()
        .map_err(|e| format!("Failed to resolve feature path: {}", e))?;
    let canonical_specs = specs_dir
        .canonicalize()
        .map_err(|e| format!("Failed to resolve specs path: {}", e))?;

    if !canonical_feature.starts_with(&canonical_specs) {
        return Err("Security error: feature path is outside specs directory".to_string());
    }

    fs::remove_dir_all(&feature_dir)
        .map_err(|e| format!("Failed to delete feature directory: {}", e))?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_feature_dir_name_valid() {
        let (num, name) = parse_feature_dir_name("001-spec-kit-ui").unwrap();
        assert_eq!(num, "001");
        assert_eq!(name, "spec-kit-ui");
    }

    #[test]
    fn test_parse_feature_dir_name_no_hyphen() {
        let (num, name) = parse_feature_dir_name("002something").unwrap();
        assert_eq!(num, "002");
        assert_eq!(name, "something");
    }

    #[test]
    fn test_parse_feature_dir_name_too_short() {
        assert!(parse_feature_dir_name("01").is_none());
    }

    #[test]
    fn test_parse_feature_dir_name_non_numeric() {
        assert!(parse_feature_dir_name("abc-feature").is_none());
    }
}
