use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: String,
    pub created_at: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRegistry {
    pub projects: Vec<Project>,
}

impl Default for ProjectRegistry {
    fn default() -> Self {
        Self {
            projects: Vec::new(),
        }
    }
}

/// Returns the path to ~/.spec-intelligence/projects.json
fn registry_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home.join(".spec-intelligence").join("projects.json"))
}

/// Loads the project registry from disk. Returns an empty registry if the file doesn't exist.
fn load_registry() -> Result<ProjectRegistry, String> {
    let path = registry_path()?;
    if !path.exists() {
        return Ok(ProjectRegistry::default());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read registry: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse registry: {}", e))
}

/// Saves the project registry to disk, creating ~/.spec-intelligence/ if needed.
fn save_registry(registry: &ProjectRegistry) -> Result<(), String> {
    let path = registry_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create registry directory: {}", e))?;
    }
    let content = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write registry: {}", e))
}

/// Returns the current time as an ISO 8601 string.
fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Lists all projects from the registry, filtering out entries whose paths no longer exist on disk.
#[tauri::command]
pub fn list_projects() -> Result<Vec<Project>, String> {
    let mut registry = load_registry()?;
    let original_len = registry.projects.len();

    // Filter out projects whose paths no longer exist
    registry.projects.retain(|p| Path::new(&p.path).exists());

    // If we filtered anything out, persist the cleaned registry
    if registry.projects.len() != original_len {
        save_registry(&registry)?;
    }

    Ok(registry.projects)
}

/// Opens (or re-opens) a project by path. If a project with the same canonical path already
/// exists in the registry, its `last_opened` is updated. Otherwise a new entry is created.
#[tauri::command]
pub fn open_project(path: String, name: String) -> Result<Project, String> {
    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Failed to canonicalize path '{}': {}", path, e))?;
    let canonical_str = canonical
        .to_str()
        .ok_or_else(|| "Path contains invalid UTF-8".to_string())?
        .to_string();

    let mut registry = load_registry()?;
    let now = now_iso();

    // Check if a project with the same canonical path already exists
    if let Some(existing) = registry
        .projects
        .iter_mut()
        .find(|p| p.path == canonical_str)
    {
        existing.last_opened = now;
        // Update name if a new one is provided
        if !name.is_empty() {
            existing.name = name;
        }
        let project = existing.clone();
        save_registry(&registry)?;
        return Ok(project);
    }

    // Create new project entry
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: if name.is_empty() {
            canonical
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Untitled")
                .to_string()
        } else {
            name
        },
        path: canonical_str,
        last_opened: now.clone(),
        created_at: now,
        description: None,
    };

    registry.projects.push(project.clone());
    save_registry(&registry)?;

    Ok(project)
}

/// Initializes a new spec project at the given path by creating specs/ and a constitution.md
/// template, then registers the project via open_project.
#[tauri::command]
pub fn init_project(path: String) -> Result<Project, String> {
    let specs_dir = Path::new(&path).join("specs");
    fs::create_dir_all(&specs_dir)
        .map_err(|e| format!("Failed to create specs directory: {}", e))?;

    let constitution_path = specs_dir.join("constitution.md");
    if !constitution_path.exists() {
        let template = r#"# Project Constitution

## Purpose
<!-- Describe the purpose of this project -->

## Principles
<!-- List the guiding principles -->

## Constraints
<!-- List any constraints or boundaries -->

## Glossary
<!-- Define key terms used in this project -->
"#;
        fs::write(&constitution_path, template)
            .map_err(|e| format!("Failed to write constitution template: {}", e))?;
    }

    // Derive project name from directory name
    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled")
        .to_string();

    open_project(path, name)
}

/// Updates a project's name and/or description in the registry.
#[tauri::command]
pub fn update_project(
    id: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<Project, String> {
    let mut registry = load_registry()?;

    let project = registry
        .projects
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Project with id '{}' not found", id))?;

    if let Some(new_name) = name {
        if !new_name.is_empty() {
            project.name = new_name;
        }
    }
    if let Some(new_description) = description {
        project.description = if new_description.is_empty() {
            None
        } else {
            Some(new_description)
        };
    }

    let updated = project.clone();
    save_registry(&registry)?;

    Ok(updated)
}

/// Removes a project from the registry by id. Does not delete files on disk.
#[tauri::command]
pub fn remove_project(id: String) -> Result<(), String> {
    let mut registry = load_registry()?;
    let original_len = registry.projects.len();

    registry.projects.retain(|p| p.id != id);

    if registry.projects.len() == original_len {
        return Err(format!("Project with id '{}' not found", id));
    }

    save_registry(&registry)?;
    Ok(())
}

/// Checks whether the given path is a spec project (i.e., contains a specs/ directory).
#[tauri::command]
pub fn check_is_spec_project(path: String) -> Result<bool, String> {
    let specs_dir = Path::new(&path).join("specs");
    Ok(specs_dir.exists() && specs_dir.is_dir())
}
