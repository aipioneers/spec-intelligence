use std::fs;
use std::path::PathBuf;

/// Read the plan.md file for a given feature slug and return the raw markdown content.
/// The frontend TypeScript parser handles parsing the markdown into structured data.
#[tauri::command]
pub fn get_plan(project_path: String, slug: String) -> Result<String, String> {
    let plan_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("plan.md");

    if !plan_path.exists() {
        return Err(format!(
            "Plan file not found: specs/{}/plan.md",
            slug
        ));
    }

    fs::read_to_string(&plan_path)
        .map_err(|e| format!("Failed to read plan file: {}", e))
}

/// Generate a template plan.md for a feature.
///
/// This creates a basic plan template. Actual AI-powered plan generation
/// requires the CLI tool (`specify plan <slug>`).
///
/// Returns the path to the created file and the content.
#[tauri::command]
pub fn generate_plan(project_path: String, slug: String) -> Result<serde_json::Value, String> {
    let feature_dir = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug);

    if !feature_dir.exists() {
        return Err(format!("Feature directory not found: specs/{}", slug));
    }

    let plan_path = feature_dir.join("plan.md");

    // Check spec prerequisites
    let spec_path = feature_dir.join("spec.md");
    if spec_path.exists() {
        let spec_content = fs::read_to_string(&spec_path)
            .map_err(|e| format!("Failed to read spec.md: {}", e))?;

        if spec_content.contains("[NEEDS CLARIFICATION]") {
            return Err(
                "Cannot generate plan: specification has unresolved [NEEDS CLARIFICATION] markers"
                    .to_string(),
            );
        }
    }

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
        r#"# Implementation Plan: {title}

Implementation plan for {title}. This is a template plan - use the CLI to generate a detailed plan from the specification.

## Technical Context

**Language**:
**Dependencies**:
**Storage**:
**Testing**:
**Target Platform**:
**Project Type**:
**Performance Goals**:
**Constraints**:
**Scale/Scope**:

## Project Structure

```
src/
  components/
  lib/
  types/
```

## Constitution Check

Status: PASS

- Template plan - no violations detected
"#
    );

    fs::write(&plan_path, &template)
        .map_err(|e| format!("Failed to write plan.md: {}", e))?;

    let mut result = serde_json::Map::new();
    result.insert(
        "path".to_string(),
        serde_json::Value::String(plan_path.to_string_lossy().to_string()),
    );
    result.insert(
        "content".to_string(),
        serde_json::Value::String(template),
    );

    Ok(serde_json::Value::Object(result))
}

/// Update plan.md with new content.
///
/// Writes the provided content directly to plan.md.
/// Returns the path to the updated file.
#[tauri::command]
pub fn update_plan(
    project_path: String,
    slug: String,
    content: String,
) -> Result<String, String> {
    let plan_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("plan.md");

    // Ensure the parent directory exists
    if let Some(parent) = plan_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create plan directory: {}", e))?;
    }

    fs::write(&plan_path, &content)
        .map_err(|e| format!("Failed to write plan file: {}", e))?;

    Ok(plan_path.to_string_lossy().to_string())
}
