mod session;
mod shell;
mod types;

pub use session::TerminalSessions;
pub use types::{TerminalInfo, TerminalOutput, TerminalSize};

use session::TerminalSession;
use shell::get_shell_command;

use portable_pty::{native_pty_system, PtySize};
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub fn default_terminal_sessions() -> TerminalSessions {
    Arc::new(Mutex::new(std::collections::HashMap::new()))
}

/// Фильтрует опасные escape-последовательности которые могут сломать layout терминала
fn filter_dangerous_escapes(data: &str) -> String {
    let mut result = String::with_capacity(data.len());
    let mut chars = data.chars().peekable();
    
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // Начало escape-последовательности
            if let Some(&next) = chars.peek() {
                if next == '[' {
                    chars.next(); // consume '['
                    let mut seq = String::new();
                    
                    // Собираем параметры последовательности
                    while let Some(&ch) = chars.peek() {
                        if ch.is_ascii_digit() || ch == ';' || ch == '?' || ch == '>' || ch == '!' {
                            seq.push(chars.next().unwrap());
                        } else {
                            break;
                        }
                    }
                    
                    // Получаем финальный символ команды
                    let cmd = chars.next();
                    
                    // Проверяем, является ли это опасной последовательностью
                    let is_dangerous = match cmd {
                        // DECCOLM - переключение 80/132 колонок
                        Some('h') | Some('l') if seq.contains("?3") => true,
                        // Resize window sequences
                        Some('t') if seq.starts_with('8') => true,
                        // DECSCNM - reverse video (может вызвать визуальные проблемы)
                        Some('h') | Some('l') if seq.contains("?5") => true,
                        _ => false,
                    };
                    
                    if !is_dangerous {
                        // Восстанавливаем безопасную последовательность
                        result.push('\x1b');
                        result.push('[');
                        result.push_str(&seq);
                        if let Some(cmd_char) = cmd {
                            result.push(cmd_char);
                        }
                    }
                    // Опасные последовательности просто пропускаем
                } else if next == ']' {
                    // OSC последовательности (например, изменение заголовка окна)
                    chars.next(); // consume ']'
                    let mut seq = String::new();
                    
                    // Читаем до BEL или ST
                    while let Some(&ch) = chars.peek() {
                        if ch == '\x07' {
                            chars.next();
                            break;
                        } else if ch == '\x1b' {
                            chars.next();
                            if chars.peek() == Some(&'\\') {
                                chars.next();
                                break;
                            }
                        } else {
                            seq.push(chars.next().unwrap());
                        }
                    }
                    
                    // Пропускаем OSC последовательности которые меняют размер окна
                    // OSC 4 - изменение цвета, безопасно
                    // OSC 0,1,2 - изменение заголовка, безопасно
                    if !seq.starts_with("10") && !seq.starts_with("11") {
                        result.push('\x1b');
                        result.push(']');
                        result.push_str(&seq);
                        result.push('\x07');
                    }
                } else {
                    result.push(c);
                    result.push(chars.next().unwrap());
                }
            } else {
                result.push(c);
            }
        } else {
            result.push(c);
        }
    }
    
    result
}

#[tauri::command(rename_all = "camelCase")]
pub async fn create_terminal(
    app: AppHandle,
    terminal_type: Option<String>,
    workspace_path: Option<String>,
    initial_size: Option<TerminalSize>,
    state: State<'_, TerminalSessions>,
) -> Result<TerminalInfo, String> {
    let terminal_id = Uuid::new_v4().to_string();
    let pty_system = native_pty_system();

    // Используем переданный размер или дефолтный
    let (rows, cols) = initial_size
        .map(|s| (s.rows, s.cols))
        .unwrap_or((24, 80));

    let pty_size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(pty_size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let cmd = get_shell_command(terminal_type.as_deref(), workspace_path.as_deref())?;

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    let pid = child.process_id().unwrap_or(0);
    let process_name = shell::get_process_name(terminal_type.as_deref());

    drop(pair.slave);

    let master_arc = Arc::new(Mutex::new(pair.master));
    let child_arc = Arc::new(Mutex::new(child));

    let writer = {
        let master = master_arc.lock().unwrap();
        master
            .take_writer()
            .map_err(|e| format!("Failed to take master writer: {}", e))?
    };
    let writer_arc = Arc::new(Mutex::new(writer));

    let mut master_reader = {
        let master = master_arc.lock().unwrap();
        master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone master reader: {}", e))?
    };

    let should_stop = Arc::new(AtomicBool::new(false));
    let should_stop_clone = should_stop.clone();
    let app_clone = app.clone();
    let id_clone = terminal_id.clone();
    let child_clone = child_arc.clone();

    let reader_task = std::thread::spawn(move || {
        let mut buf = vec![0u8; 4096];
        loop {
            if should_stop_clone.load(Ordering::Relaxed) {
                break;
            }

            {
                let mut child = child_clone.lock().unwrap();
                match child.try_wait() {
                    Ok(Some(_)) => break,
                    Ok(None) => {}
                    Err(_) => break,
                }
            }

            match master_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]);
                    // Фильтруем BEL символ (ASCII 7) чтобы убрать beep звук
                    let filtered_data: String = data.chars().filter(|&c| c != '\x07').collect();
                    // Фильтруем опасные escape-последовательности которые могут сломать layout
                    // DECCOLM (132/80 column mode), resize sequences и т.д.
                    let filtered_data = filter_dangerous_escapes(&filtered_data);
                    if !filtered_data.is_empty() {
                        let _ = app_clone.emit(
                            "terminal-output",
                            TerminalOutput {
                                terminal_id: id_clone.clone(),
                                data: filtered_data,
                            },
                        );
                    }
                }
                Err(e) => {
                    if e.to_string().contains("would block") {
                        std::thread::sleep(Duration::from_millis(10));
                        continue;
                    }
                    break;
                }
            }
        }
    });

    let session = TerminalSession::new(
        terminal_id.clone(),
        master_arc,
        writer_arc,
        child_arc,
        Some(reader_task),
        should_stop,
        pid,
        process_name.clone(),
    );

    state.lock().unwrap().insert(terminal_id.clone(), session);

    Ok(TerminalInfo {
        terminal_id,
        pid,
        process_name,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_terminal_info(
    terminal_id: String,
    state: State<'_, TerminalSessions>,
) -> Result<TerminalInfo, String> {
    let sessions = state.lock().unwrap();
    let session = sessions
        .get(&terminal_id)
        .ok_or_else(|| format!("Terminal not found: {}", terminal_id))?;

    Ok(TerminalInfo {
        terminal_id,
        pid: session.pid(),
        process_name: session.process_name().to_string(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn write_terminal(
    terminal_id: String,
    data: String,
    state: State<'_, TerminalSessions>,
) -> Result<(), String> {
    let sessions = state.lock().unwrap();
    let session = sessions
        .get(&terminal_id)
        .ok_or_else(|| format!("Terminal not found: {}", terminal_id))?;

    session.write(data.as_bytes())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn resize_terminal(
    terminal_id: String,
    size: TerminalSize,
    state: State<'_, TerminalSessions>,
) -> Result<(), String> {
    let sessions = state.lock().unwrap();
    let session = sessions
        .get(&terminal_id)
        .ok_or_else(|| format!("Terminal not found: {}", terminal_id))?;

    session.resize(size.rows, size.cols)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn close_terminal(
    terminal_id: String,
    state: State<'_, TerminalSessions>,
) -> Result<(), String> {
    let mut sessions = state.lock().unwrap();
    let session = sessions
        .remove(&terminal_id)
        .ok_or_else(|| format!("Terminal not found: {}", terminal_id))?;

    session.close();
    Ok(())
}
