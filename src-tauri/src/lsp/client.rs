use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Write, BufWriter, Read};
use std::thread;
use tauri::{AppHandle, Emitter};
use serde_json::json;
use crate::lsp::protocol::*;

pub struct LspClient {
    process: Option<Child>,
    writer: Option<Arc<Mutex<BufWriter<std::process::ChildStdin>>>>,
    sequence_id: u64,
}

impl LspClient {
    pub fn new() -> Self {
        Self {
            process: None,
            writer: None,
            sequence_id: 0,
        }
    }

    pub fn start(&mut self, app_handle: AppHandle) -> Result<(), String> {
        let mut cmd = Command::new("npx");
        cmd.args(&["typescript-language-server", "--stdio"])
           .stdin(Stdio::piped())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            cmd = Command::new("cmd");
            cmd.args(&["/C", "npx", "typescript-language-server", "--stdio"]);
            cmd.stdin(Stdio::piped());
            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn LSP: {}", e))?;
        
        let stdin = child.stdin.take().ok_or("Failed to open stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

        let writer = Arc::new(Mutex::new(BufWriter::new(stdin)));
        self.writer = Some(writer.clone());
        self.process = Some(child);

        // Stdout reader (LSP messages)
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            loop {
                let mut header = String::new();
                if reader.read_line(&mut header).unwrap_or(0) == 0 {
                    break;
                }

                if header.trim().is_empty() {
                    continue;
                }

                let parts: Vec<&str> = header.split(": ").collect();
                if parts.len() == 2 && parts[0] == "Content-Length" {
                    let len: usize = parts[1].trim().parse().unwrap_or(0);
                    // Skip empty line
                    let mut empty = String::new();
                    reader.read_line(&mut empty).unwrap();

                    let mut body_buf = vec![0; len];
                    if reader.read_exact(&mut body_buf).is_ok() {
                        let body_str = String::from_utf8_lossy(&body_buf);
                        if let Ok(msg) = serde_json::from_str::<LspMessage>(&body_str) {
                            match msg {
                                LspMessage::Notification(notif) => {
                                    if notif.method == "textDocument/publishDiagnostics" {
                                        if let Some(params) = notif.params {
                                           if let Ok(diag_params) = serde_json::from_value::<PublishDiagnosticsParams>(params) {
                                                println!("[LSP] Publishing diagnostics for: {}, count: {}", diag_params.uri, diag_params.diagnostics.len());
                                                let _ = app_handle_clone.emit("lsp:diagnostics", diag_params);
                                           }
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        });

        // Stderr reader (Logs)
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(_l) = line {
                    // LSP stderr logging commented out
                }
            }
        });

        Ok(())
    }

    fn write(&mut self, method: &str, params: serde_json::Value, is_notification: bool) -> Result<(), String> {
        if let Some(writer) = &self.writer {
            self.sequence_id += 1;
            let msg = if is_notification {
                json!({
                    "jsonrpc": "2.0",
                    "method": method,
                    "params": params
                })
            } else {
                 json!({
                    "jsonrpc": "2.0",
                    "id": self.sequence_id,
                    "method": method,
                    "params": params
                })
            };

            let body = msg.to_string();
            let content = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);
            
            let mut w = writer.lock().map_err(|_| "Failed to lock writer")?;
            w.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
            w.flush().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn initialize(&mut self, root_uri: String) -> Result<(), String> {
        let params = InitializeParams {
            process_id: Some(std::process::id()),
            root_uri: Some(root_uri),
            capabilities: ClientCapabilities::default(),
        };
        self.write("initialize", serde_json::to_value(params).unwrap(), false)?;
        // Send initialized notification immediately after (usually you wait for response, but for simple servers it often works to just send it)
        // Ideally we wait for response, but implementing async req/res in this simple struct is hard.
        // typescript-language-server usually responds fast.
        self.write("initialized", json!({}), true)?;
        Ok(())
    }

    pub fn did_open(&mut self, uri: String, content: String) -> Result<(), String> {
        // Определяем язык по расширению файла
        let language_id = if uri.ends_with(".ts") || uri.ends_with(".tsx") {
            "typescript"
        } else if uri.ends_with(".js") || uri.ends_with(".jsx") {
            "javascript"
        } else {
            "typescript" // По умолчанию
        };
        
        let params = DidOpenTextDocumentParams {
            text_document: TextDocumentItem {
                uri,
                language_id: language_id.into(),
                version: 1,
                text: content,
            },
        };
        self.write("textDocument/didOpen", serde_json::to_value(params).unwrap(), true)
    }

    pub fn did_change(&mut self, uri: String, content: String, version: i32) -> Result<(), String> {
         let params = DidChangeTextDocumentParams {
            text_document: VersionedTextDocumentIdentifier {
                uri,
                version,
            },
            content_changes: vec![TextDocumentContentChangeEvent {
                text: content
            }],
        };
        self.write("textDocument/didChange", serde_json::to_value(params).unwrap(), true)
    }
}
