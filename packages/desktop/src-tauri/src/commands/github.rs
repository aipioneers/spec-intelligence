// T085: GitHub integration commands for Tauri desktop
// Provides issue preview and export functionality.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IssuePreview {
    pub task_id: String,
    pub title: String,
    pub body: String,
    pub labels: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportResult {
    pub task_id: String,
    pub success: bool,
    pub issue_number: Option<u64>,
    pub issue_url: Option<String>,
    pub error: Option<String>,
}

/// Parse task lines from tasks.md and build issue preview data.
#[tauri::command]
pub fn preview_issue_export(
    project_path: String,
    slug: String,
) -> Result<Vec<IssuePreview>, String> {
    let tasks_path = PathBuf::from(&project_path)
        .join("specs")
        .join(&slug)
        .join("tasks.md");

    if !tasks_path.exists() {
        return Err(format!("Tasks file not found for feature: {}", slug));
    }

    let content = fs::read_to_string(&tasks_path)
        .map_err(|e| format!("Failed to read tasks.md: {}", e))?;

    let mut previews = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Match task checkbox lines: "- [ ] T001 ..." or "- [x] T001 ..."
        if !trimmed.starts_with("- [") {
            continue;
        }

        // Extract task ID
        let id_start = trimmed.find('T').unwrap_or(0);
        let rest = &trimmed[id_start..];
        let id_end = rest
            .find(|c: char| !c.is_ascii_alphanumeric())
            .unwrap_or(rest.len());
        let task_id = &rest[..id_end];

        if task_id.len() < 4 || !task_id.starts_with('T') {
            continue;
        }

        // Extract description: everything after the task ID and markers
        let mut description = rest[id_end..].trim().to_string();
        // Remove [P] marker
        description = description.replace("[P]", "").trim().to_string();
        // Remove [USX] markers
        if let Some(us_start) = description.find("[US") {
            if let Some(us_end) = description[us_start..].find(']') {
                description = format!(
                    "{}{}",
                    &description[..us_start],
                    &description[us_start + us_end + 1..]
                )
                .trim()
                .to_string();
            }
        }

        let title = format!("[{}] {}", task_id, description);
        let body = format!(
            "## {}: {}\n\n**Feature**: `{}`\n\n---\n_Exported from Spec Intelligence_",
            task_id, description, slug
        );

        previews.push(IssuePreview {
            task_id: task_id.to_string(),
            title,
            body,
            labels: vec!["spec-intelligence".to_string()],
        });
    }

    Ok(previews)
}

/// Export tasks as GitHub issues using the GitHub API via reqwest.
/// Requires a GitHub token passed as a parameter.
#[tauri::command]
pub async fn export_to_github(
    project_path: String,
    slug: String,
    repository: String,
    task_ids: Vec<String>,
    github_token: String,
) -> Result<Vec<ExportResult>, String> {
    // Get previews for the selected tasks
    let all_previews = preview_issue_export(project_path, slug)?;
    let selected: Vec<&IssuePreview> = all_previews
        .iter()
        .filter(|p| task_ids.contains(&p.task_id))
        .collect();

    if selected.is_empty() {
        return Err("No matching tasks found for export".to_string());
    }

    // Parse owner/repo
    let parts: Vec<&str> = repository.split('/').collect();
    if parts.len() != 2 {
        return Err(format!(
            "Invalid repository format: {}. Expected owner/repo",
            repository
        ));
    }
    let owner = parts[0];
    let repo = parts[1];

    let client = reqwest::Client::new();
    let mut results = Vec::new();

    for preview in selected {
        let url = format!(
            "https://api.github.com/repos/{}/{}/issues",
            owner, repo
        );

        let payload = serde_json::json!({
            "title": preview.title,
            "body": preview.body,
            "labels": preview.labels,
        });

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", github_token))
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "spec-intelligence-desktop")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .json(&payload)
            .send()
            .await;

        match response {
            Ok(res) => {
                if res.status().is_success() {
                    let body: serde_json::Value = res
                        .json()
                        .await
                        .unwrap_or(serde_json::Value::Null);

                    let issue_number = body
                        .get("number")
                        .and_then(|v| v.as_u64());
                    let issue_url = body
                        .get("html_url")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    results.push(ExportResult {
                        task_id: preview.task_id.clone(),
                        success: true,
                        issue_number,
                        issue_url,
                        error: None,
                    });
                } else {
                    let status = res.status().as_u16();
                    let error_body = res.text().await.unwrap_or_default();
                    results.push(ExportResult {
                        task_id: preview.task_id.clone(),
                        success: false,
                        issue_number: None,
                        issue_url: None,
                        error: Some(format!(
                            "GitHub API error ({}): {}",
                            status, error_body
                        )),
                    });
                }
            }
            Err(e) => {
                results.push(ExportResult {
                    task_id: preview.task_id.clone(),
                    success: false,
                    issue_number: None,
                    issue_url: None,
                    error: Some(format!("Request failed: {}", e)),
                });
            }
        }
    }

    Ok(results)
}
