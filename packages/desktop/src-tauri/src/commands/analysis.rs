// T099: Analysis commands for Tauri desktop
// Scans specs, checks requirement coverage, and returns JSON results.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisIssue {
    pub severity: String,   // "error" | "warning" | "info"
    pub category: String,   // "orphaned_requirement" | "missing_coverage" | "constitution_violation" | "inconsistency"
    pub message: String,
    pub feature_slug: String,
    pub artifact: String,   // "spec" | "plan" | "tasks" | "constitution"
    pub section: String,
    pub line: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisSummary {
    pub total_issues: u32,
    pub errors: u32,
    pub warnings: u32,
    pub infos: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub issues: Vec<AnalysisIssue>,
    pub summary: AnalysisSummary,
}

/// Extract FR-XXX requirement IDs from text.
fn extract_requirement_ids(text: &str) -> HashSet<String> {
    let mut ids = HashSet::new();
    let re_pattern = "FR-";

    for (i, _) in text.match_indices(re_pattern) {
        let rest = &text[i..];
        let end = rest
            .find(|c: char| !c.is_ascii_alphanumeric() && c != '-')
            .unwrap_or(rest.len());
        let id = &rest[..end];
        if id.len() > 3 {
            // At least "FR-X"
            ids.insert(id.to_string());
        }
    }

    ids
}

/// Extract requirement definitions from spec content.
fn extract_spec_requirements(content: &str) -> Vec<(String, String)> {
    let mut requirements = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("- ").or_else(|| trimmed.strip_prefix("* ")) {
            if let Some(colon_pos) = rest.find(": ") {
                let potential_id = &rest[..colon_pos];
                if potential_id.starts_with("FR-") {
                    let desc = rest[colon_pos + 2..].trim().to_string();
                    requirements.push((potential_id.to_string(), desc));
                }
            }
        }
    }

    requirements
}

/// Extract task IDs and their content from tasks.md.
fn extract_tasks(
    content: &str,
) -> Vec<(String, String, Option<String>, Vec<String>)> {
    // Returns: (id, description, user_story_ref, dependencies)
    let mut tasks = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("- [") {
            continue;
        }

        // Find task ID
        if let Some(t_pos) = trimmed.find('T') {
            let rest = &trimmed[t_pos..];
            let id_end = rest
                .find(|c: char| !c.is_ascii_alphanumeric())
                .unwrap_or(rest.len());
            let task_id = &rest[..id_end];

            if task_id.len() < 4 || !task_id.starts_with('T') {
                continue;
            }

            let description = rest[id_end..].trim().to_string();

            // Extract user story ref
            let us_ref = if let Some(us_start) = description.find("[US") {
                if let Some(us_end) = description[us_start..].find(']') {
                    let ref_text = &description[us_start + 1..us_start + us_end];
                    Some(ref_text.to_string())
                } else {
                    None
                }
            } else {
                None
            };

            // Extract dependencies
            let mut deps = Vec::new();
            let lower = description.to_lowercase();
            if let Some(dep_pos) = lower.find("depends on ") {
                let dep_rest = &description[dep_pos + 11..];
                let dep_end = dep_rest
                    .find(|c: char| !c.is_ascii_alphanumeric())
                    .unwrap_or(dep_rest.len());
                let dep_id = &dep_rest[..dep_end];
                if dep_id.starts_with('T') {
                    deps.push(dep_id.to_string());
                }
            }

            tasks.push((task_id.to_string(), description, us_ref, deps));
        }
    }

    tasks
}

/// Run analysis across all features and return results.
#[tauri::command]
pub fn run_analysis(project_path: String) -> Result<AnalysisResult, String> {
    let root = PathBuf::from(&project_path);
    let specs_dir = root.join("specs");

    if !specs_dir.exists() {
        return Ok(AnalysisResult {
            issues: Vec::new(),
            summary: AnalysisSummary {
                total_issues: 0,
                errors: 0,
                warnings: 0,
                infos: 0,
            },
        });
    }

    let mut all_issues: Vec<AnalysisIssue> = Vec::new();

    // Check for constitution
    let constitution_path = root.join("constitution.md");
    let has_constitution = constitution_path.exists();
    let constitution_content = if has_constitution {
        fs::read_to_string(&constitution_path).ok()
    } else {
        None
    };

    // Scan feature directories
    let entries = fs::read_dir(&specs_dir)
        .map_err(|e| format!("Failed to read specs directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let dir_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        // Must match NNN-name pattern
        if dir_name.len() < 4 || !dir_name[..3].chars().all(|c| c.is_ascii_digit()) {
            continue;
        }

        let feature_slug = dir_name;
        let feature_dir = specs_dir.join(&feature_slug);

        // Read spec
        let spec_path = feature_dir.join("spec.md");
        if !spec_path.exists() {
            continue;
        }

        let spec_content = match fs::read_to_string(&spec_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let spec_requirements = extract_spec_requirements(&spec_content);
        let spec_req_ids: HashSet<String> =
            spec_requirements.iter().map(|(id, _)| id.clone()).collect();

        // Read tasks
        let tasks_path = feature_dir.join("tasks.md");
        let tasks = if tasks_path.exists() {
            match fs::read_to_string(&tasks_path) {
                Ok(c) => extract_tasks(&c),
                Err(_) => Vec::new(),
            }
        } else {
            Vec::new()
        };

        // Collect all requirement refs from tasks
        let mut task_req_refs = HashSet::new();
        for (_, desc, _, _) in &tasks {
            for ref_id in extract_requirement_ids(desc) {
                task_req_refs.insert(ref_id);
            }
        }

        // 1. Orphaned requirements
        for (req_id, req_desc) in &spec_requirements {
            if !task_req_refs.contains(req_id) {
                all_issues.push(AnalysisIssue {
                    severity: "warning".to_string(),
                    category: "orphaned_requirement".to_string(),
                    message: format!(
                        "Requirement {} is not referenced by any task: \"{}\"",
                        req_id,
                        req_desc.chars().take(80).collect::<String>()
                    ),
                    feature_slug: feature_slug.clone(),
                    artifact: "spec".to_string(),
                    section: "Requirements".to_string(),
                    line: None,
                });
            }
        }

        // 2. Missing coverage
        for ref_id in &task_req_refs {
            if !spec_req_ids.contains(ref_id) {
                all_issues.push(AnalysisIssue {
                    severity: "error".to_string(),
                    category: "missing_coverage".to_string(),
                    message: format!(
                        "Requirement {} is referenced in tasks but not defined in spec",
                        ref_id
                    ),
                    feature_slug: feature_slug.clone(),
                    artifact: "tasks".to_string(),
                    section: "Requirements".to_string(),
                    line: None,
                });
            }
        }

        // 3. User story consistency
        let us_numbers: HashSet<String> = {
            let mut set = HashSet::new();
            for line in spec_content.lines() {
                if let Some(pos) = line.to_lowercase().find("user story ") {
                    let rest = &line[pos + 11..];
                    let num_end = rest
                        .find(|c: char| !c.is_ascii_digit())
                        .unwrap_or(rest.len());
                    if num_end > 0 {
                        set.insert(format!("US{}", &rest[..num_end]));
                    }
                }
            }
            set
        };

        for (task_id, _, us_ref, _) in &tasks {
            if let Some(ref us) = us_ref {
                if !us_numbers.contains(us) {
                    all_issues.push(AnalysisIssue {
                        severity: "error".to_string(),
                        category: "inconsistency".to_string(),
                        message: format!(
                            "Task {} references {} which is not in the spec",
                            task_id, us
                        ),
                        feature_slug: feature_slug.clone(),
                        artifact: "tasks".to_string(),
                        section: "User Story References".to_string(),
                        line: None,
                    });
                }
            }
        }

        // 4. Task dependency consistency
        let task_ids: HashSet<String> = tasks.iter().map(|(id, _, _, _)| id.clone()).collect();
        for (task_id, _, _, deps) in &tasks {
            for dep in deps {
                if !task_ids.contains(dep) {
                    all_issues.push(AnalysisIssue {
                        severity: "error".to_string(),
                        category: "inconsistency".to_string(),
                        message: format!(
                            "Task {} depends on {} which does not exist",
                            task_id, dep
                        ),
                        feature_slug: feature_slug.clone(),
                        artifact: "tasks".to_string(),
                        section: "Dependencies".to_string(),
                        line: None,
                    });
                }
            }
        }

        // 5. Constitution compliance (basic check)
        if let Some(ref _constitution) = constitution_content {
            let plan_path = feature_dir.join("plan.md");
            if plan_path.exists() {
                if let Ok(plan_content) = fs::read_to_string(&plan_path) {
                    let plan_lower = plan_content.to_lowercase();
                    if plan_lower.contains("constitution") && plan_lower.contains("fail") {
                        all_issues.push(AnalysisIssue {
                            severity: "error".to_string(),
                            category: "constitution_violation".to_string(),
                            message: "Plan reports a constitution check failure".to_string(),
                            feature_slug: feature_slug.clone(),
                            artifact: "plan".to_string(),
                            section: "Constitution Check".to_string(),
                            line: None,
                        });
                    }
                }
            }
        }
    }

    // Sort by severity
    all_issues.sort_by(|a, b| {
        let order = |s: &str| -> u8 {
            match s {
                "error" => 0,
                "warning" => 1,
                "info" => 2,
                _ => 3,
            }
        };
        order(&a.severity).cmp(&order(&b.severity))
    });

    let errors = all_issues.iter().filter(|i| i.severity == "error").count() as u32;
    let warnings = all_issues
        .iter()
        .filter(|i| i.severity == "warning")
        .count() as u32;
    let infos = all_issues.iter().filter(|i| i.severity == "info").count() as u32;

    Ok(AnalysisResult {
        summary: AnalysisSummary {
            total_issues: all_issues.len() as u32,
            errors,
            warnings,
            infos,
        },
        issues: all_issues,
    })
}
