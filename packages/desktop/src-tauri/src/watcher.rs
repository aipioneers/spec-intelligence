use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    /// "created" | "modified" | "deleted"
    #[serde(rename = "type")]
    pub change_type: String,
    /// Relative path within the specs/ directory
    pub path: String,
    /// Feature slug extracted from the path, e.g. "001-spec-kit-ui"
    pub feature_slug: Option<String>,
    /// Artifact type derived from the filename
    pub artifact: String,
    /// Unix-epoch milliseconds
    pub timestamp: u64,
}

/// Handle returned by `start_watcher`; dropping it stops the watcher.
pub struct WatcherHandle {
    _watcher: RecommendedWatcher,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Returns true for temp / swap files that editors create.
fn is_temp_file(path: &Path) -> bool {
    let name = match path.file_name().and_then(|n| n.to_str()) {
        Some(n) => n,
        None => return true,
    };

    name.ends_with(".swp")
        || name.ends_with(".swo")
        || name.ends_with(".tmp")
        || name.ends_with('~')
        || name.starts_with('.')
        || name.starts_with('~')
        || name.ends_with(".bak")
        || name == "4913" // Vim temp file
}

/// Derive the artifact type from a filename.
fn artifact_type(path: &Path) -> &'static str {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if name == "spec.md" {
        "spec"
    } else if name == "plan.md" {
        "plan"
    } else if name == "tasks.md" {
        "tasks"
    } else if name.ends_with(".md")
        && path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            == Some("checklists")
    {
        "checklist"
    } else {
        "unknown"
    }
}

/// Extract the feature slug from a path like `specs/001-my-feature/spec.md`.
fn extract_feature_slug(path: &Path, specs_root: &Path) -> Option<String> {
    let relative = path.strip_prefix(specs_root).ok()?;
    let first_component = relative.components().next()?;
    let dir_name = first_component.as_os_str().to_str()?;

    // Validate that it matches the NNN-slug pattern
    if dir_name.len() >= 5
        && dir_name.chars().take(3).all(|c| c.is_ascii_digit())
        && dir_name.chars().nth(3) == Some('-')
    {
        Some(dir_name.to_string())
    } else {
        None
    }
}

/// Map a `notify` EventKind to our change type string.
fn change_type_from_kind(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("created"),
        EventKind::Modify(_) => Some("modified"),
        EventKind::Remove(_) => Some("deleted"),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Start watching the `specs/` directory and emit `fs-change` events to the
/// Tauri frontend.  Returns a `WatcherHandle`; the watcher runs until the
/// handle is dropped.
pub fn start_watcher(app_handle: AppHandle, specs_dir: &str) -> Result<WatcherHandle, String> {
    let specs_root = PathBuf::from(specs_dir);

    if !specs_root.exists() {
        return Err(format!("specs directory does not exist: {}", specs_dir));
    }

    let specs_root_clone = specs_root.clone();
    let app = app_handle.clone();

    // Debounce state: track last-emitted path + instant so we don't flood
    // the frontend with duplicate events within 300ms.
    let last_emitted: Arc<Mutex<Option<(PathBuf, Instant)>>> = Arc::new(Mutex::new(None));
    let last_emitted_clone = last_emitted.clone();

    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            let event = match result {
                Ok(e) => e,
                Err(_) => return,
            };

            let change = match change_type_from_kind(&event.kind) {
                Some(c) => c,
                None => return,
            };

            for path in &event.paths {
                // Skip temporary / swap files
                if is_temp_file(path) {
                    continue;
                }

                // Debounce: skip if we emitted for the same path within 300ms
                {
                    let mut guard = last_emitted_clone.lock().unwrap();
                    if let Some((ref last_path, ref last_time)) = *guard {
                        if last_path == path && last_time.elapsed() < Duration::from_millis(300) {
                            continue;
                        }
                    }
                    *guard = Some((path.clone(), Instant::now()));
                }

                let slug = extract_feature_slug(path, &specs_root_clone);
                let artifact = artifact_type(path).to_string();
                let relative = path
                    .strip_prefix(&specs_root_clone)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|_| path.to_string_lossy().to_string());

                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);

                let payload = FileChangeEvent {
                    change_type: change.to_string(),
                    path: relative,
                    feature_slug: slug,
                    artifact,
                    timestamp,
                };

                let _ = app.emit("fs-change", &payload);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(specs_root.as_path(), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    Ok(WatcherHandle { _watcher: watcher })
}
