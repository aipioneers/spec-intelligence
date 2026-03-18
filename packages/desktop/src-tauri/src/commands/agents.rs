// T091: Agent management commands for Tauri desktop
// Provides list, add, remove, and sync operations for AI agent integrations.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    pub agent_type: String,
    pub directory_path: String,
    pub context_file_path: String,
    pub commands_dir: Option<String>,
    pub sync_status: String,
    pub last_synced_at: Option<String>,
}

struct AgentMapping {
    directory: &'static str,
    context_file: &'static str,
    commands_dir: Option<&'static str>,
}

fn get_agent_mappings() -> HashMap<&'static str, AgentMapping> {
    let mut map = HashMap::new();
    map.insert(
        "claude",
        AgentMapping {
            directory: ".claude",
            context_file: ".claude/CLAUDE.md",
            commands_dir: Some(".claude/commands"),
        },
    );
    map.insert(
        "cursor",
        AgentMapping {
            directory: ".cursor",
            context_file: ".cursor/rules",
            commands_dir: None,
        },
    );
    map.insert(
        "copilot",
        AgentMapping {
            directory: ".github/copilot",
            context_file: ".github/copilot/instructions.md",
            commands_dir: None,
        },
    );
    map.insert(
        "gemini",
        AgentMapping {
            directory: ".gemini",
            context_file: ".gemini/settings.json",
            commands_dir: None,
        },
    );
    map.insert(
        "windsurf",
        AgentMapping {
            directory: ".windsurf",
            context_file: ".windsurf/rules",
            commands_dir: None,
        },
    );
    map.insert(
        "qwen",
        AgentMapping {
            directory: ".qwen",
            context_file: ".qwen/config.json",
            commands_dir: None,
        },
    );
    map
}

fn detect_sync_status(context_path: &PathBuf) -> (String, Option<String>) {
    if !context_path.exists() {
        return ("NotInitialized".to_string(), None);
    }

    match fs::metadata(context_path) {
        Ok(meta) => {
            if let Ok(modified) = meta.modified() {
                if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                    let secs = duration.as_secs();
                    let now = std::time::SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    let age = now.saturating_sub(secs);
                    let one_day = 24 * 60 * 60;

                    let status = if age < one_day {
                        "UpToDate"
                    } else {
                        "Stale"
                    };

                    return (
                        status.to_string(),
                        Some(format!("{}", secs)),
                    );
                }
            }
            ("NotInitialized".to_string(), None)
        }
        Err(_) => ("NotInitialized".to_string(), None),
    }
}

/// List all configured agents by scanning for known agent directories.
#[tauri::command]
pub fn list_agents(project_path: String) -> Result<Vec<AgentConfig>, String> {
    let root = PathBuf::from(&project_path);
    let mappings = get_agent_mappings();
    let mut agents = Vec::new();

    for (agent_type, mapping) in &mappings {
        let dir_path = root.join(mapping.directory);
        if dir_path.exists() {
            let context_path = root.join(mapping.context_file);
            let (sync_status, last_synced_at) = detect_sync_status(&context_path);

            agents.push(AgentConfig {
                agent_type: agent_type.to_string(),
                directory_path: dir_path.to_string_lossy().to_string(),
                context_file_path: context_path.to_string_lossy().to_string(),
                commands_dir: mapping
                    .commands_dir
                    .map(|d| root.join(d).to_string_lossy().to_string()),
                sync_status,
                last_synced_at,
            });
        }
    }

    // Sort by agent type for consistent ordering
    agents.sort_by(|a, b| a.agent_type.cmp(&b.agent_type));

    Ok(agents)
}

/// Add a new agent by creating its directory structure.
#[tauri::command]
pub fn add_agent(
    project_path: String,
    agent_type: String,
) -> Result<AgentConfig, String> {
    let mappings = get_agent_mappings();
    let mapping = mappings
        .get(agent_type.as_str())
        .ok_or_else(|| format!("Unknown agent type: {}", agent_type))?;

    let root = PathBuf::from(&project_path);
    let dir_path = root.join(mapping.directory);

    // Create directory
    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("Failed to create agent directory: {}", e))?;

    // Create commands directory if applicable
    if let Some(commands_dir) = mapping.commands_dir {
        fs::create_dir_all(root.join(commands_dir))
            .map_err(|e| format!("Failed to create commands directory: {}", e))?;
    }

    // Create default context file
    let context_path = root.join(mapping.context_file);
    if !context_path.exists() {
        // Ensure parent directory exists
        if let Some(parent) = context_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create context file directory: {}", e))?;
        }

        let default_content = if agent_type == "gemini" || agent_type == "qwen" {
            "{}".to_string()
        } else {
            format!(
                "# {} Context\n\nProject configuration for {}.\n",
                capitalize(&agent_type),
                agent_type
            )
        };

        fs::write(&context_path, &default_content)
            .map_err(|e| format!("Failed to write context file: {}", e))?;
    }

    let (sync_status, last_synced_at) = detect_sync_status(&context_path);

    Ok(AgentConfig {
        agent_type,
        directory_path: dir_path.to_string_lossy().to_string(),
        context_file_path: context_path.to_string_lossy().to_string(),
        commands_dir: mapping
            .commands_dir
            .map(|d| root.join(d).to_string_lossy().to_string()),
        sync_status,
        last_synced_at,
    })
}

/// Remove an agent by deleting its directory.
#[tauri::command]
pub fn remove_agent(
    project_path: String,
    agent_type: String,
) -> Result<bool, String> {
    let mappings = get_agent_mappings();
    let mapping = mappings
        .get(agent_type.as_str())
        .ok_or_else(|| format!("Unknown agent type: {}", agent_type))?;

    let root = PathBuf::from(&project_path);
    let dir_path = root.join(mapping.directory);

    if dir_path.exists() {
        // Safety: ensure path is inside project root
        let canonical_dir = dir_path
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path: {}", e))?;
        let canonical_root = root
            .canonicalize()
            .map_err(|e| format!("Failed to resolve root: {}", e))?;

        if !canonical_dir.starts_with(&canonical_root) {
            return Err("Security error: agent path is outside project directory".to_string());
        }

        fs::remove_dir_all(&dir_path)
            .map_err(|e| format!("Failed to remove agent directory: {}", e))?;
    }

    Ok(true)
}

/// Sync agent context by updating the context file's modification time.
/// In a real implementation, this would regenerate the context from specs/.
#[tauri::command]
pub fn sync_agent_context(
    project_path: String,
    agent_type: String,
) -> Result<AgentConfig, String> {
    let mappings = get_agent_mappings();
    let mapping = mappings
        .get(agent_type.as_str())
        .ok_or_else(|| format!("Unknown agent type: {}", agent_type))?;

    let root = PathBuf::from(&project_path);
    let context_path = root.join(mapping.context_file);
    let dir_path = root.join(mapping.directory);

    if !context_path.exists() {
        return Err(format!("Agent {} is not configured", agent_type));
    }

    // Touch the file to update mtime (simulating a sync)
    let content = fs::read_to_string(&context_path)
        .map_err(|e| format!("Failed to read context file: {}", e))?;
    fs::write(&context_path, &content)
        .map_err(|e| format!("Failed to update context file: {}", e))?;

    Ok(AgentConfig {
        agent_type,
        directory_path: dir_path.to_string_lossy().to_string(),
        context_file_path: context_path.to_string_lossy().to_string(),
        commands_dir: mapping
            .commands_dir
            .map(|d| root.join(d).to_string_lossy().to_string()),
        sync_status: "UpToDate".to_string(),
        last_synced_at: Some(
            std::time::SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string(),
        ),
    })
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
        None => String::new(),
    }
}
