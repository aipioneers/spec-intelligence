// Prevents additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod commands;
mod fs_watcher;
mod git;
mod markdown;
mod watcher;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Existing generic commands
            commands::greet,
            commands::read_spec_file,
            commands::write_spec_file,
            commands::list_spec_files,
            // Feature commands (T028 + T036)
            commands::features::list_features,
            commands::features::create_feature,
            commands::features::get_feature,
            commands::features::delete_feature,
            // Spec commands (T037)
            commands::specs::get_spec,
            commands::specs::update_spec,
            commands::specs::update_spec_raw,
            // Clarification commands (T062)
            commands::specs::get_clarification_markers,
            commands::specs::resolve_clarification,
            // Plan commands (T046)
            commands::plans::get_plan,
            commands::plans::generate_plan,
            commands::plans::update_plan,
            // Task commands (T054)
            commands::tasks::list_tasks,
            commands::tasks::generate_tasks,
            commands::tasks::update_task_status,
            // Constitution commands (T070)
            commands::constitution::get_constitution,
            commands::constitution::update_constitution,
            // Extension & Preset commands (T079)
            commands::extensions::list_extensions,
            commands::extensions::install_extension,
            commands::extensions::remove_extension,
            commands::extensions::list_presets,
            commands::extensions::install_preset,
            commands::extensions::remove_preset,
            // GitHub commands (T085)
            commands::github::preview_issue_export,
            commands::github::export_to_github,
            // Agent commands (T091)
            commands::agents::list_agents,
            commands::agents::add_agent,
            commands::agents::remove_agent,
            commands::agents::sync_agent_context,
            // Analysis commands (T099)
            commands::analysis::run_analysis,
            // Project commands
            commands::projects::list_projects,
            commands::projects::open_project,
            commands::projects::init_project,
            commands::projects::update_project,
            commands::projects::remove_project,
            commands::projects::check_is_spec_project,
        ])
        .setup(|app| {
            // Start file watcher for the specs/ directory
            let app_handle = app.handle().clone();
            let specs_dir = {
                let mut dir = std::env::current_dir().unwrap_or_default();
                // Walk up to find specs/ directory
                loop {
                    if dir.join("specs").exists() {
                        break;
                    }
                    if !dir.pop() {
                        break;
                    }
                }
                dir.join("specs").to_string_lossy().to_string()
            };

            if std::path::Path::new(&specs_dir).exists() {
                match watcher::start_watcher(app_handle, &specs_dir) {
                    Ok(handle) => {
                        // Store the handle to keep the watcher alive
                        app.manage(handle);
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to start file watcher: {}", e);
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Spec Intelligence application");
}
