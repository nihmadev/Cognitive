mod command_palette;
mod fs;
mod git;
mod keybindings;
mod npm;
mod outline;
mod ports;
mod problems;
mod session;
mod settings;
mod timeline;
mod lsp;
mod agent;
mod storage;

use std::sync::Mutex;
use tauri::Manager;
use crate::fs::{FileWatcherState, AudioCache};

#[derive(Clone, serde::Serialize)]
struct InitialState {
    workspace: Option<String>,
    profile: Option<String>,
}

struct AppState {
    initial_state: InitialState,
}

fn parse_cli_args() -> InitialState {
    let args: Vec<String> = std::env::args().collect();
    let mut workspace = None;
    let mut profile = None;
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--workspace" => {
                if i + 1 < args.len() {
                    workspace = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "--profile" => {
                if i + 1 < args.len() {
                    profile = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }
    
    InitialState { workspace, profile }
}

#[tauri::command]
fn get_initial_state(state: tauri::State<Mutex<AppState>>) -> InitialState {
    state.lock().unwrap().initial_state.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_state = parse_cli_args();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_pty::init())
        .manage(npm::RunningScriptsState::default())
        .manage(FileWatcherState::default())
        .manage(AudioCache::new(50, 24))
        .manage(keybindings::KeybindingsState::new(keybindings::KeybindingsStore::new()))
        .manage(settings::SettingsState::new())
        .manage(session::SessionState::new())
        .manage(command_palette::CommandPaletteState::new())
        .manage(lsp::LspState::new())
        .manage(agent::AgentState::default())
        .manage(Mutex::new(AppState { 
            initial_state,
        }))
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let db_manager = storage::DatabaseManager::new(&handle).await.expect("failed to initialize database");
                handle.manage(db_manager);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_state,
            storage::commands::get_recent_projects,
            storage::commands::save_project,
            storage::commands::install_extension,
            storage::commands::get_installed_extensions,
            storage::commands::toggle_extension,
            storage::commands::load_workspace_state,
            storage::commands::save_workspace_state,
            storage::commands::save_unsaved_buffer,
            storage::commands::get_unsaved_buffer,
            storage::commands::get_user_setting,
            storage::commands::set_user_setting,
            fs::read_dir,
            fs::read_file,
            fs::read_file_binary,
            fs::get_file_size,
            fs::read_file_binary_chunked,
            fs::get_asset_url,
            fs::write_file,
            fs::create_file,
            fs::create_folder,
            fs::rename_path,
            fs::rename_file_with_result,
            fs::delete_path,
            fs::open_file_dialog,
            fs::open_folder_dialog,
            fs::save_file_dialog,
            fs::open_terminal,
            fs::search_in_files,
            fs::replace_all,
            fs::get_all_files,
            fs::file_exists,
            fs::open_new_window,
            fs::start_file_watcher,
            fs::stop_file_watcher,
            fs::add_watch_path,
            fs::is_path_ignored,
            git::git_status,
            git::git_info,
            git::git_clone,
            git::git_stage,
            git::git_unstage,
            git::git_stage_all,
            git::git_unstage_all,
            git::git_commit,
            git::git_commit_amend,
            git::push::git_push,
            git::push::git_push_with_force,
            git::push::git_list_remotes,
            git::push::git_get_remote_url,
            git::git_discard_changes,
            git::git_diff,
            git::git_contributors,
            git::git_log,
            git::git_list_branches,
            git::git_create_branch,
            git::git_checkout_branch,
            git::git_delete_branch,
            git::git_github_auth_status,
            git::git_github_auth_login,
            git::git_pull,
            git::git_fetch,
            git::git_stash_save,
            git::git_stash_pop,
            git::git_stash_list,
            git::git_stash_drop,
            git::git_add_remote,
            git::git_remove_remote,
            git::git_rename_remote,
            git::git_create_tag,
            git::git_delete_tag,
            git::git_list_tags,
            git::git_merge_branch,
            git::git_rebase,
            git::git_reset_hard,
            git::git_reset_soft,
            git::git_commit_files,
            git::git_file_at_commit,
            git::git_file_at_parent_commit,
            npm::npm_get_scripts,
            npm::npm_run_script,
            npm::npm_stop_script,
            npm::npm_get_running_scripts,
            npm::npm_run_script_in_terminal,
            ports::get_listening_ports,
            ports::get_port_changes,
            problems::get_problems,
            problems::clear_problems_cache,
            problems::invalidate_problems_cache,
            problems::get_problems_cache_stats,
            problems::check_files,
            outline::get_outline,
            outline::get_outline_from_content,
            timeline::timeline_save_snapshot,
            timeline::timeline_get_history,
            timeline::timeline_get_content,
            timeline::timeline_get_diff,
            timeline::timeline_restore,
            timeline::timeline_delete_entry,
            timeline::timeline_clear_history,
            fs::get_cached_audio,
            fs::cache_audio,
            fs::clear_audio_cache,
            fs::get_audio_cache_stats,
            fs::get_audio_cover_art,
            fs::get_audio_metadata,
            keybindings::keybindings_init,
            keybindings::keybindings_get_all,
            keybindings::keybindings_lookup,
            keybindings::keybindings_lookup_chord,
            keybindings::keybindings_set,
            keybindings::keybindings_remove,
            keybindings::keybindings_disable,
            keybindings::keybindings_get_conflicts,
            keybindings::keybindings_reset,
            keybindings::keybindings_format_display,
            settings::settings_init,
            settings::settings_get_all,
            settings::settings_get_user,
            settings::settings_get_workspace,
            settings::settings_update_section,
            settings::settings_update_value,
            settings::settings_set_workspace,
            settings::settings_clear_workspace,
            settings::settings_reload,
            settings::settings_get_paths,
            settings::settings_reset,
            session::session_init,
            session::session_get_global,
            session::session_update_window,
            session::session_update_zoom,
            session::session_get_recent_workspaces,
            session::session_remove_recent_workspace,
            session::session_get_last_workspace,
            session::session_open_workspace,
            session::session_close_workspace,
            session::session_get_workspace,
            session::session_save_workspace,
            session::session_open_tab,
            session::session_close_tab,
            session::session_set_active_file,
            session::session_update_editor_state,
            session::session_get_editor_state,
            session::session_update_panels,
            session::session_update_split_view,
            session::session_update_expanded_folders,
            session::session_save_all,
            session::session_delete_workspace,
            session::session_get_paths,
            command_palette::command_palette_init,
            command_palette::command_palette_search,
            command_palette::command_palette_get_all,
            command_palette::command_palette_get,
            command_palette::command_palette_register,
            command_palette::command_palette_register_many,
            command_palette::command_palette_unregister,
            command_palette::command_palette_unregister_source,
            command_palette::command_palette_set_enabled,
            command_palette::command_palette_update,
            command_palette::command_palette_count,
            command_palette::command_palette_categories,
            lsp::lsp_initialize,
            lsp::lsp_did_open,
            lsp::lsp_did_change,
            lsp::css_lsp_initialize,
            lsp::css_lsp_did_open,
            lsp::css_lsp_did_change,
            lsp::css_lsp_did_close,
            agent::agentrouter_configure,
            agent::agentrouter_set_workspace,
            agent::agentrouter_index_codebase,
            agent::agentrouter_list_ollama_models,
            agent::agent_execute_tool,
            agent::agentrouter_get_system_prompt,
            agent::agentrouter_chat_complete,
            agent::agentrouter_chat_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
