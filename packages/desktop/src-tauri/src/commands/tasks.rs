use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskData {
    pub id: String,
    pub phase: String,
    pub user_story_ref: Option<String>,
    pub description: String,
    pub priority: String,
    pub status: String,
    pub is_parallel: bool,
    pub dependencies: Vec<String>,
    pub file_paths: Vec<String>,
}

/// Parse tasks.md content into a vector of TaskData.
fn parse_tasks_content(content: &str) -> Vec<TaskData> {
    let mut tasks = Vec::new();
    let mut current_phase = "Foundation".to_string();

    for line in content.lines() {
        // Track phase headings
        if let Some(phase_str) = line.strip_prefix("## Phase: ") {
            current_phase = phase_str.trim().to_string();
            continue;
        }

        // Match task lines: - [ ] **T001** (meta): Description [depends: ...] [files: ...]
        if !line.starts_with("- [") {
            continue;
        }

        let is_done = line.contains("[x]") || line.contains("[X]");

        // Extract task ID
        let id = match extract_between(line, "**", "**") {
            Some(id) => id.trim().to_string(),
            None => continue,
        };

        // Extract meta section (in parentheses after task ID)
        let meta = extract_between(line, "(", ")").unwrap_or_default();

        // Extract description (after the colon)
        let description = line
            .find("):")
            .map(|pos| &line[pos + 2..])
            .or_else(|| {
                // Fallback: after **ID**:
                let id_end = line.find("**:").map(|p| p + 3);
                id_end.map(|p| &line[p..])
            })
            .unwrap_or("")
            .trim();

        // Parse phase from meta or use current heading phase
        let phase = extract_field(&meta, "Phase")
            .unwrap_or_else(|| current_phase.clone());

        // Parse user story reference
        let user_story_ref = extract_field(&meta, "US")
            .or_else(|| extract_bracketed(description, "US"));

        // Parse priority
        let priority = extract_priority(&meta)
            .or_else(|| extract_priority(description))
            .unwrap_or_else(|| "P2".to_string());

        // Parse parallel marker
        let is_parallel = meta.contains("[P]") || description.contains("[P]");

        // Parse dependencies
        let dependencies = extract_bracketed_list(description, "depends")
            .or_else(|| extract_bracketed_list(description, "depend"))
            .unwrap_or_default();

        // Parse file paths
        let file_paths = extract_bracketed_list(description, "files")
            .or_else(|| extract_bracketed_list(description, "file"))
            .unwrap_or_default();

        // Clean description
        let clean_desc = clean_description(description);

        // Determine status
        let status = if is_done {
            "Done".to_string()
        } else if description.contains("[InProgress]") || description.contains("[in-progress]") {
            "InProgress".to_string()
        } else if description.contains("[Blocked]") || description.contains("[blocked]") {
            "Blocked".to_string()
        } else {
            "Todo".to_string()
        };

        tasks.push(TaskData {
            id,
            phase,
            user_story_ref,
            description: if clean_desc.is_empty() {
                "Untitled task".to_string()
            } else {
                clean_desc
            },
            priority,
            status,
            is_parallel,
            dependencies,
            file_paths,
        });
    }

    tasks
}

/// Extract text between two delimiter strings (first occurrence).
fn extract_between<'a>(text: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let start_pos = text.find(start)? + start.len();
    let remaining = &text[start_pos..];
    let end_pos = remaining.find(end)?;
    Some(&remaining[..end_pos])
}

/// Extract a key: value field from a metadata string.
fn extract_field(meta: &str, key: &str) -> Option<String> {
    let pattern = format!("{}:", key);
    let lower_pattern = format!("{}:", key.to_lowercase());

    for segment in meta.split(',') {
        let trimmed = segment.trim();
        if trimmed.starts_with(&pattern) || trimmed.starts_with(&lower_pattern) {
            let value = trimmed
                .splitn(2, ':')
                .nth(1)
                .map(|v| v.trim().to_string());
            return value;
        }
    }
    None
}

/// Extract a [key: value] bracketed field from text.
fn extract_bracketed(text: &str, key: &str) -> Option<String> {
    let pattern = format!("[{}:", key);
    let lower_pattern = format!("[{}:", key.to_lowercase());

    if let Some(pos) = text
        .find(&pattern)
        .or_else(|| text.find(&lower_pattern))
    {
        let start = pos + pattern.len().max(lower_pattern.len());
        if let Some(end) = text[start..].find(']') {
            return Some(text[start..start + end].trim().to_string());
        }
    }
    None
}

/// Extract a comma-separated list from [key: val1, val2] brackets.
fn extract_bracketed_list(text: &str, key: &str) -> Option<Vec<String>> {
    extract_bracketed(text, key).map(|val| {
        val.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    })
}

/// Extract priority (P1, P2, P3) from text.
fn extract_priority(text: &str) -> Option<String> {
    // Match standalone P1, P2, or P3
    for p in &["P1", "P2", "P3"] {
        if text.contains(p) {
            return Some(p.to_string());
        }
    }
    None
}

/// Remove meta markers from description text.
fn clean_description(desc: &str) -> String {
    let mut result = desc.to_string();

    // Remove [depends: ...], [files: ...], [US: ...], [P], [InProgress], [Blocked], priority
    let patterns = [
        (r"\[depends?:\s*[^\]]+\]", ""),
        (r"\[files?:\s*[^\]]+\]", ""),
        (r"\[US:\s*\w+\]", ""),
        (r"\[P\]", ""),
        (r"\[InProgress\]", ""),
        (r"\[in-progress\]", ""),
        (r"\[Blocked\]", ""),
        (r"\[blocked\]", ""),
    ];

    for (pattern, _replacement) in &patterns {
        // Simple string-based removal (avoid regex dependency)
        while let Some(start) = result.find(&pattern[..pattern.find('\\').unwrap_or(pattern.len())]) {
            if let Some(end) = result[start..].find(']') {
                result = format!("{}{}", &result[..start], &result[start + end + 1..]);
            } else {
                break;
            }
        }
    }

    // Remove standalone priority markers
    result = result.replace(" P1 ", " ").replace(" P2 ", " ").replace(" P3 ", " ");

    result.trim().to_string()
}

/// Convert TaskData back to a markdown line.
fn task_to_markdown_line(task: &TaskData) -> String {
    let checkbox = if task.status == "Done" { "[x]" } else { "[ ]" };

    let mut meta_parts = Vec::new();
    meta_parts.push(format!("Phase: {}", task.phase));
    if let Some(ref us) = task.user_story_ref {
        meta_parts.push(format!("US: {}", us));
    }
    meta_parts.push(task.priority.clone());
    if task.is_parallel {
        meta_parts.push("[P]".to_string());
    }

    let mut line = format!(
        "- {} **{}** ({}): {}",
        checkbox,
        task.id,
        meta_parts.join(", "),
        task.description
    );

    if !task.dependencies.is_empty() {
        line.push_str(&format!(" [depends: {}]", task.dependencies.join(", ")));
    }
    if !task.file_paths.is_empty() {
        line.push_str(&format!(" [files: {}]", task.file_paths.join(", ")));
    }
    if task.status == "InProgress" {
        line.push_str(" [InProgress]");
    } else if task.status == "Blocked" {
        line.push_str(" [Blocked]");
    }

    line
}

/// Read tasks.md and return the parsed task data as JSON.
#[tauri::command]
pub fn list_tasks(project_path: String, slug: String) -> Result<Vec<TaskData>, String> {
    let tasks_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("tasks.md");

    if !tasks_path.exists() {
        return Err(format!(
            "Tasks file not found: specs/{}/tasks.md",
            slug
        ));
    }

    let content = fs::read_to_string(&tasks_path)
        .map_err(|e| format!("Failed to read tasks file: {}", e))?;

    Ok(parse_tasks_content(&content))
}

/// Generate a template tasks.md for a feature.
///
/// Creates a basic task template. Actual AI-powered task generation
/// requires the CLI tool (`specify tasks <slug>`).
///
/// Returns the parsed tasks and the path to the created file.
#[tauri::command]
pub fn generate_tasks(project_path: String, slug: String) -> Result<serde_json::Value, String> {
    let feature_dir = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug);

    if !feature_dir.exists() {
        return Err(format!("Feature directory not found: specs/{}", slug));
    }

    let tasks_path = feature_dir.join("tasks.md");

    // Generate a human-readable title from the slug
    let title: String = slug
        .trim_start_matches(|c: char| c.is_ascii_digit() || c == '-')
        .split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");

    let template = format!(
        r#"# Tasks: {title}

## Phase: Setup

- [ ] **T001** (Phase: Setup, P1): Initialize project structure for {title}
- [ ] **T002** (Phase: Setup, P1, [P]): Set up development dependencies and tooling [depends: T001] [files: package.json]

## Phase: Foundation

- [ ] **T003** (Phase: Foundation, P1): Create core types and interfaces [depends: T001] [files: src/types/index.ts]
- [ ] **T004** (Phase: Foundation, P2, [P]): Implement base components [depends: T003] [files: src/components/]

## Phase: Polish

- [ ] **T005** (Phase: Polish, P3, [P]): Add tests and documentation [depends: T004] [files: tests/]
"#
    );

    fs::write(&tasks_path, &template)
        .map_err(|e| format!("Failed to write tasks.md: {}", e))?;

    let tasks = parse_tasks_content(&template);

    let mut result = serde_json::Map::new();
    result.insert(
        "path".to_string(),
        serde_json::Value::String(tasks_path.to_string_lossy().to_string()),
    );
    result.insert(
        "tasks".to_string(),
        serde_json::to_value(&tasks).unwrap_or(serde_json::Value::Array(vec![])),
    );

    Ok(serde_json::Value::Object(result))
}

/// Update a specific task's status in tasks.md.
///
/// Reads the file, finds the task by ID, updates its checkbox and status marker,
/// then writes the file back.
///
/// Returns the updated task and any affected tasks (tasks whose blocking status changed).
#[tauri::command]
pub fn update_task_status(
    project_path: String,
    slug: String,
    task_id: String,
    status: String,
) -> Result<serde_json::Value, String> {
    let tasks_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("tasks.md");

    if !tasks_path.exists() {
        return Err(format!(
            "Tasks file not found: specs/{}/tasks.md",
            slug
        ));
    }

    let content = fs::read_to_string(&tasks_path)
        .map_err(|e| format!("Failed to read tasks file: {}", e))?;

    let mut tasks = parse_tasks_content(&content);

    // Find the target task
    let task_index = tasks
        .iter()
        .position(|t| t.id == task_id)
        .ok_or_else(|| format!("Task not found: {}", task_id))?;

    // Update the task status
    tasks[task_index].status = status.clone();

    // Find affected tasks
    let mut affected_tasks: Vec<TaskData> = Vec::new();

    if status == "Done" {
        // When completed, check if blocked tasks can be unblocked
        for i in 0..tasks.len() {
            if i == task_index {
                continue;
            }
            if !tasks[i].dependencies.contains(&task_id) {
                continue;
            }
            let all_deps_done = tasks[i].dependencies.iter().all(|dep_id| {
                tasks.iter().any(|t| t.id == *dep_id && t.status == "Done")
            });
            if all_deps_done && tasks[i].status == "Blocked" {
                tasks[i].status = "Todo".to_string();
                affected_tasks.push(tasks[i].clone());
            }
        }
    } else {
        // When un-completed, check if dependent tasks should be blocked
        for i in 0..tasks.len() {
            if i == task_index {
                continue;
            }
            if !tasks[i].dependencies.contains(&task_id) {
                continue;
            }
            if tasks[i].status != "Done" {
                tasks[i].status = "Blocked".to_string();
                affected_tasks.push(tasks[i].clone());
            }
        }
    }

    // Rebuild the markdown file
    let mut lines = Vec::new();

    // Preserve the title
    for line in content.lines() {
        if line.starts_with("# ") {
            lines.push(line.to_string());
            lines.push(String::new());
            break;
        }
    }

    // Group tasks by phase and write them
    let phases = ["Setup", "Foundation", "UserStory", "Polish"];
    for phase in &phases {
        let phase_tasks: Vec<&TaskData> = tasks.iter().filter(|t| t.phase == *phase).collect();
        if phase_tasks.is_empty() {
            continue;
        }

        lines.push(format!("## Phase: {}", phase));
        lines.push(String::new());

        for task in phase_tasks {
            lines.push(task_to_markdown_line(task));
        }

        lines.push(String::new());
    }

    let updated_content = lines.join("\n");
    fs::write(&tasks_path, &updated_content)
        .map_err(|e| format!("Failed to write tasks file: {}", e))?;

    let mut result = serde_json::Map::new();
    result.insert(
        "task".to_string(),
        serde_json::to_value(&tasks[task_index]).unwrap_or(serde_json::Value::Null),
    );
    result.insert(
        "affected_tasks".to_string(),
        serde_json::to_value(&affected_tasks).unwrap_or(serde_json::Value::Array(vec![])),
    );

    Ok(serde_json::Value::Object(result))
}
