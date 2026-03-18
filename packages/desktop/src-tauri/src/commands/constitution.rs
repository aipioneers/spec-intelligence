use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Principle {
    pub name: String,
    pub description: String,
    pub rationale: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Constitution {
    pub principles: Vec<Principle>,
    pub constraints: Vec<String>,
    pub development_guidelines: Vec<String>,
    pub version: String,
    pub last_amended: String,
}

/// Read constitution.md from the project root and return its raw content.
/// The frontend can parse the markdown into the Constitution structure.
#[tauri::command]
pub fn get_constitution(project_path: String) -> Result<Option<String>, String> {
    let constitution_path = PathBuf::from(&project_path).join("constitution.md");

    if !constitution_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&constitution_path)
        .map_err(|e| format!("Failed to read constitution.md: {}", e))?;

    Ok(Some(content))
}

/// Write constitution.md with the provided content.
/// The frontend serializes the Constitution structure to markdown before calling this.
#[tauri::command]
pub fn update_constitution(project_path: String, content: String) -> Result<(), String> {
    let constitution_path = PathBuf::from(&project_path).join("constitution.md");

    // Safety check: ensure we're writing within the project directory
    let canonical_project = PathBuf::from(&project_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve project path: {}", e))?;

    if let Ok(canonical_constitution) = constitution_path.canonicalize() {
        if !canonical_constitution.starts_with(&canonical_project) {
            return Err("Security error: constitution path is outside project directory".to_string());
        }
    }
    // If canonicalize fails, the file doesn't exist yet, which is fine for creation

    fs::write(&constitution_path, content)
        .map_err(|e| format!("Failed to write constitution.md: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_get_constitution_not_found() {
        let tmp = TempDir::new().unwrap();
        let result = get_constitution(tmp.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn test_get_constitution_exists() {
        let tmp = TempDir::new().unwrap();
        let constitution_path = tmp.path().join("constitution.md");
        fs::write(&constitution_path, "# Project Constitution\n\n## Core Principles\n").unwrap();

        let result = get_constitution(tmp.path().to_string_lossy().to_string());
        assert!(result.is_ok());
        let content = result.unwrap().unwrap();
        assert!(content.contains("Core Principles"));
    }

    #[test]
    fn test_update_constitution() {
        let tmp = TempDir::new().unwrap();
        let content = "# Project Constitution\n\n## Core Principles\n\n### Test\n\nA test principle.\n";

        let result = update_constitution(
            tmp.path().to_string_lossy().to_string(),
            content.to_string(),
        );
        assert!(result.is_ok());

        let written = fs::read_to_string(tmp.path().join("constitution.md")).unwrap();
        assert!(written.contains("Test"));
    }
}
