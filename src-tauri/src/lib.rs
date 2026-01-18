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
mod ollama;
mod agentrouter;
mod openai;
mod anthropic;
mod google;
mod xai;
mod api_keys;
mod proxy_config;

use tauri::Manager;
use std::sync::Mutex;
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
        .plugin(tauri_plugin_pty::init())
        .manage(npm::RunningScriptsState::default())
        .manage(FileWatcherState::default())
        .manage(AudioCache::new(50, 24)) 
        .manage(ollama::OllamaState::default())
        .manage(agentrouter::AgentRouterState::default())
        
        .manage(Mutex::new(api_keys::ApiKeyStore::default()))
        .manage(keybindings::KeybindingsState::new(keybindings::KeybindingsStore::new()))
        .manage(settings::SettingsState::new())
        .manage(session::SessionState::new())
        .manage(command_palette::CommandPaletteState::new())
        .manage(Mutex::new(AppState { 
            initial_state,
        }))
        .setup(move |app| {
            
            let asset_protocol_scope = app.asset_protocol_scope();
            asset_protocol_scope.allow_directory("**", true).unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_state,
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
            fs::open_new_window,
            fs::start_file_watcher,
            fs::stop_file_watcher,
            fs::add_watch_path,
            git::git_status,
            git::git_info,
            git::git_clone,
            git::git_stage,
            git::git_unstage,
            git::git_stage_all,
            git::git_unstage_all,
            git::git_commit,
            git::push::git_push,
            git::push::git_push_with_force,
            git::push::git_list_remotes,
            git::push::git_get_remote_url,
            git::git_discard_changes,
            git::git_diff,
            git::git_contributors,
            git::git_log,
            git::git_list_branches,
            git::git_github_auth_status,
            git::git_github_auth_login,
            git::git_create_branch,
            git::git_checkout_branch,
            git::git_delete_branch,
            npm::npm_get_scripts,
            npm::npm_run_script,
            npm::npm_stop_script,
            npm::npm_get_running_scripts,
            npm::npm_run_script_in_terminal,
            ports::get_listening_ports,
            problems::get_problems,
            problems::clear_problems_cache,
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
            ollama::ollama_chat,
            ollama::ollama_chat_stream,
            ollama::ollama_list_models,
            ollama::ollama_pull_model,
            ollama::ollama_generate,
            ollama::ollama_list_local_models,
            agentrouter::agentrouter_configure,
            agentrouter::agentrouter_chat,
            agentrouter::agentrouter_chat_stream,
            agentrouter::agentrouter_list_models,
            openai::openai_chat,
            openai::openai_chat_stream,
            anthropic::anthropic_chat,
            anthropic::anthropic_chat_stream,
            google::google_chat,
            google::google_chat_stream,
            xai::xai_chat,
            xai::xai_chat_stream,
            api_keys::set_api_key,
            api_keys::get_api_keys,
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
            command_palette::command_palette_categories
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
