use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Extension {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub catalog_source: String,
    pub installed_at: String,
    pub status: String,
    pub commands: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub templates: Vec<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionListResult {
    pub installed: Vec<Extension>,
    pub available: Vec<Extension>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PresetListResult {
    pub installed: Vec<Preset>,
    pub available: Vec<Preset>,
}

/// Read extensions state from .specify/extensions.json if it exists,
/// otherwise return mock data.
#[tauri::command]
pub fn list_extensions(project_path: String) -> Result<ExtensionListResult, String> {
    let extensions_path = PathBuf::from(&project_path)
        .join(".specify")
        .join("extensions.json");

    if extensions_path.exists() {
        let content = fs::read_to_string(&extensions_path)
            .map_err(|e| format!("Failed to read extensions.json: {}", e))?;
        let result: ExtensionListResult = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse extensions.json: {}", e))?;
        return Ok(result);
    }

    // Return mock data for initial implementation
    Ok(get_mock_extensions())
}

/// Install an extension by ID — updates .specify/extensions.json
#[tauri::command]
pub fn install_extension(project_path: String, extension_id: String) -> Result<Extension, String> {
    let specify_dir = PathBuf::from(&project_path).join(".specify");
    let extensions_path = specify_dir.join("extensions.json");

    let mut state = if extensions_path.exists() {
        let content = fs::read_to_string(&extensions_path)
            .map_err(|e| format!("Failed to read extensions.json: {}", e))?;
        serde_json::from_str::<ExtensionListResult>(&content)
            .map_err(|e| format!("Failed to parse extensions.json: {}", e))?
    } else {
        get_mock_extensions()
    };

    // Find the extension in available list
    let ext_index = state
        .available
        .iter()
        .position(|e| e.id == extension_id)
        .ok_or_else(|| format!("Extension not found: {}", extension_id))?;

    let mut ext = state.available.remove(ext_index);
    ext.installed_at = chrono_now();
    ext.status = "Active".to_string();

    state.installed.push(ext.clone());

    // Ensure .specify directory exists
    fs::create_dir_all(&specify_dir)
        .map_err(|e| format!("Failed to create .specify directory: {}", e))?;

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize extensions: {}", e))?;
    fs::write(&extensions_path, json)
        .map_err(|e| format!("Failed to write extensions.json: {}", e))?;

    Ok(ext)
}

/// Remove an installed extension by ID
#[tauri::command]
pub fn remove_extension(project_path: String, extension_id: String) -> Result<bool, String> {
    let specify_dir = PathBuf::from(&project_path).join(".specify");
    let extensions_path = specify_dir.join("extensions.json");

    let mut state = if extensions_path.exists() {
        let content = fs::read_to_string(&extensions_path)
            .map_err(|e| format!("Failed to read extensions.json: {}", e))?;
        serde_json::from_str::<ExtensionListResult>(&content)
            .map_err(|e| format!("Failed to parse extensions.json: {}", e))?
    } else {
        return Err(format!("Extension not installed: {}", extension_id));
    };

    let ext_index = state
        .installed
        .iter()
        .position(|e| e.id == extension_id)
        .ok_or_else(|| format!("Extension not installed: {}", extension_id))?;

    let mut ext = state.installed.remove(ext_index);
    ext.installed_at = String::new();
    ext.status = "Disabled".to_string();
    state.available.push(ext);

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize extensions: {}", e))?;
    fs::write(&extensions_path, json)
        .map_err(|e| format!("Failed to write extensions.json: {}", e))?;

    Ok(true)
}

/// List presets from .specify/presets.json or return mock data
#[tauri::command]
pub fn list_presets(project_path: String) -> Result<PresetListResult, String> {
    let presets_path = PathBuf::from(&project_path)
        .join(".specify")
        .join("presets.json");

    if presets_path.exists() {
        let content = fs::read_to_string(&presets_path)
            .map_err(|e| format!("Failed to read presets.json: {}", e))?;
        let result: PresetListResult = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse presets.json: {}", e))?;
        return Ok(result);
    }

    Ok(get_mock_presets())
}

/// Install a preset by ID
#[tauri::command]
pub fn install_preset(project_path: String, preset_id: String) -> Result<Preset, String> {
    let specify_dir = PathBuf::from(&project_path).join(".specify");
    let presets_path = specify_dir.join("presets.json");

    let mut state = if presets_path.exists() {
        let content = fs::read_to_string(&presets_path)
            .map_err(|e| format!("Failed to read presets.json: {}", e))?;
        serde_json::from_str::<PresetListResult>(&content)
            .map_err(|e| format!("Failed to parse presets.json: {}", e))?
    } else {
        get_mock_presets()
    };

    let preset_index = state
        .available
        .iter()
        .position(|p| p.id == preset_id)
        .ok_or_else(|| format!("Preset not found: {}", preset_id))?;

    let preset = state.available.remove(preset_index);
    state.installed.push(preset.clone());

    fs::create_dir_all(&specify_dir)
        .map_err(|e| format!("Failed to create .specify directory: {}", e))?;

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize presets: {}", e))?;
    fs::write(&presets_path, json)
        .map_err(|e| format!("Failed to write presets.json: {}", e))?;

    Ok(preset)
}

/// Remove an installed preset by ID
#[tauri::command]
pub fn remove_preset(project_path: String, preset_id: String) -> Result<bool, String> {
    let specify_dir = PathBuf::from(&project_path).join(".specify");
    let presets_path = specify_dir.join("presets.json");

    let mut state = if presets_path.exists() {
        let content = fs::read_to_string(&presets_path)
            .map_err(|e| format!("Failed to read presets.json: {}", e))?;
        serde_json::from_str::<PresetListResult>(&content)
            .map_err(|e| format!("Failed to parse presets.json: {}", e))?
    } else {
        return Err(format!("Preset not installed: {}", preset_id));
    };

    let preset_index = state
        .installed
        .iter()
        .position(|p| p.id == preset_id)
        .ok_or_else(|| format!("Preset not installed: {}", preset_id))?;

    let mut preset = state.installed.remove(preset_index);
    preset.is_active = false;
    state.available.push(preset);

    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize presets: {}", e))?;
    fs::write(&presets_path, json)
        .map_err(|e| format!("Failed to write presets.json: {}", e))?;

    Ok(true)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn chrono_now() -> String {
    // Simple ISO date without chrono dependency
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Approximate: days since epoch
    let days = now / 86400;
    let years = 1970 + days / 365;
    let remaining_days = days % 365;
    let month = remaining_days / 30 + 1;
    let day = remaining_days % 30 + 1;
    format!("{:04}-{:02}-{:02}", years, month.min(12), day.min(28))
}

fn get_mock_extensions() -> ExtensionListResult {
    ExtensionListResult {
        installed: vec![
            Extension {
                id: "ext-specify-lint".to_string(),
                name: "Specify Lint".to_string(),
                description: "Lint spec files for consistency, missing fields, and structural issues.".to_string(),
                version: "1.2.0".to_string(),
                catalog_source: "official".to_string(),
                installed_at: "2025-12-01".to_string(),
                status: "Active".to_string(),
                commands: vec!["specify lint".to_string(), "specify lint --fix".to_string()],
            },
            Extension {
                id: "ext-spec-metrics".to_string(),
                name: "Spec Metrics".to_string(),
                description: "Generate coverage and quality metrics for your specifications.".to_string(),
                version: "0.9.1".to_string(),
                catalog_source: "official".to_string(),
                installed_at: "2025-11-15".to_string(),
                status: "Active".to_string(),
                commands: vec!["specify metrics".to_string(), "specify metrics --report".to_string()],
            },
        ],
        available: vec![
            Extension {
                id: "ext-ai-clarify".to_string(),
                name: "AI Clarifier".to_string(),
                description: "Use AI to identify ambiguous requirements and suggest clarification questions.".to_string(),
                version: "2.0.0".to_string(),
                catalog_source: "community".to_string(),
                installed_at: String::new(),
                status: "Disabled".to_string(),
                commands: vec!["specify clarify".to_string(), "specify clarify --auto".to_string()],
            },
            Extension {
                id: "ext-export-pdf".to_string(),
                name: "PDF Export".to_string(),
                description: "Export specifications, plans, and task lists as formatted PDF documents.".to_string(),
                version: "1.0.3".to_string(),
                catalog_source: "official".to_string(),
                installed_at: String::new(),
                status: "Disabled".to_string(),
                commands: vec!["specify export --pdf".to_string()],
            },
            Extension {
                id: "ext-jira-sync".to_string(),
                name: "Jira Sync".to_string(),
                description: "Synchronize tasks and user stories with Jira issues bidirectionally.".to_string(),
                version: "0.5.0".to_string(),
                catalog_source: "community".to_string(),
                installed_at: String::new(),
                status: "Disabled".to_string(),
                commands: vec!["specify jira sync".to_string(), "specify jira push".to_string(), "specify jira pull".to_string()],
            },
            Extension {
                id: "ext-diagram-gen".to_string(),
                name: "Diagram Generator".to_string(),
                description: "Auto-generate entity-relationship and flow diagrams from specifications.".to_string(),
                version: "1.1.0".to_string(),
                catalog_source: "official".to_string(),
                installed_at: String::new(),
                status: "Disabled".to_string(),
                commands: vec!["specify diagram".to_string()],
            },
        ],
    }
}

fn get_mock_presets() -> PresetListResult {
    PresetListResult {
        installed: vec![Preset {
            id: "preset-web-app".to_string(),
            name: "Web Application".to_string(),
            description: "Templates for full-stack web application specifications.".to_string(),
            version: "1.0.0".to_string(),
            templates: vec![
                "spec-webapp.md".to_string(),
                "plan-webapp.md".to_string(),
                "tasks-webapp.md".to_string(),
                "checklist-webapp.md".to_string(),
            ],
            is_active: true,
        }],
        available: vec![
            Preset {
                id: "preset-api".to_string(),
                name: "REST API".to_string(),
                description: "Templates optimized for API-first projects.".to_string(),
                version: "1.0.0".to_string(),
                templates: vec![
                    "spec-api.md".to_string(),
                    "plan-api.md".to_string(),
                    "tasks-api.md".to_string(),
                    "checklist-api.md".to_string(),
                ],
                is_active: false,
            },
            Preset {
                id: "preset-mobile".to_string(),
                name: "Mobile App".to_string(),
                description: "Cross-platform mobile application templates.".to_string(),
                version: "0.9.0".to_string(),
                templates: vec![
                    "spec-mobile.md".to_string(),
                    "plan-mobile.md".to_string(),
                    "tasks-mobile.md".to_string(),
                ],
                is_active: false,
            },
            Preset {
                id: "preset-library".to_string(),
                name: "Library / Package".to_string(),
                description: "Templates for reusable libraries and npm/crate packages.".to_string(),
                version: "1.0.0".to_string(),
                templates: vec![
                    "spec-library.md".to_string(),
                    "plan-library.md".to_string(),
                    "tasks-library.md".to_string(),
                ],
                is_active: false,
            },
            Preset {
                id: "preset-microservice".to_string(),
                name: "Microservice".to_string(),
                description: "Templates for microservice architecture with service boundaries.".to_string(),
                version: "0.8.0".to_string(),
                templates: vec![
                    "spec-microservice.md".to_string(),
                    "plan-microservice.md".to_string(),
                    "tasks-microservice.md".to_string(),
                    "contract-microservice.md".to_string(),
                ],
                is_active: false,
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_list_extensions_no_file() {
        let tmp = TempDir::new().unwrap();
        let result = list_extensions(tmp.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let list = result.unwrap();
        assert!(!list.installed.is_empty());
        assert!(!list.available.is_empty());
    }

    #[test]
    fn test_list_presets_no_file() {
        let tmp = TempDir::new().unwrap();
        let result = list_presets(tmp.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let list = result.unwrap();
        assert!(!list.installed.is_empty());
        assert!(!list.available.is_empty());
    }
}
