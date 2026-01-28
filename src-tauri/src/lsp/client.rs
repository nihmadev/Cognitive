use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Write, BufWriter, Read};
use std::thread;
use tauri::{AppHandle, Emitter};
use serde_json::json;
use crate::lsp::protocol::*;

#[derive(Debug, Clone)]
pub enum LanguageServerType {
    TypeScript,
    Go,
    Python,
}

pub struct LspClient {
    process: Option<Child>,
    writer: Option<Arc<Mutex<BufWriter<std::process::ChildStdin>>>>,
    sequence_id: u64,
    server_type: Option<LanguageServerType>,
}

impl LspClient {
    pub fn new() -> Self {
        Self {
            process: None,
            writer: None,
            sequence_id: 0,
            server_type: None,
        }
    }

    pub fn start(&mut self, app_handle: AppHandle, server_type: LanguageServerType) -> Result<(), String> {
        self.server_type = Some(server_type.clone());
        
        let mut cmd = match server_type {
            LanguageServerType::TypeScript => {
                let mut c = Command::new("npx");
                c.args(&["typescript-language-server", "--stdio"]);
                c
            }
            LanguageServerType::Go => {
                let c = Command::new("gopls");
                c
            }
            LanguageServerType::Python => {
                let c = Command::new("pylsp");
                c
            }
        };
        
        cmd.stdin(Stdio::piped())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            cmd = match server_type {
                LanguageServerType::TypeScript => {
                    let mut c = Command::new("cmd");
                    c.args(&["/C", "npx", "typescript-language-server", "--stdio"]);
                    c
                }
                LanguageServerType::Go => {
                    let mut c = Command::new("cmd");
                    c.args(&["/C", "gopls"]);
                    c
                }
                LanguageServerType::Python => {
                    let mut c = Command::new("cmd");
                    c.args(&["/C", "pylsp"]);
                    c
                }
            };
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
                                                let _ = app_handle_clone.emit("lsp:diagnostics", diag_params);
                                           }
                                        }
                                    }
                                }
                                LspMessage::Response(resp) => {
                                    let _ = app_handle_clone.emit("lsp:response", format!("LSP Response: {:?}", resp));
                                }
                                _ => {
                                    let _ = app_handle_clone.emit("lsp:log", format!("LSP Message: {:?}", msg));
                                }
                            }
                        } else {
                            let _ = app_handle_clone.emit("lsp:log", format!("Failed to parse LSP message: {}", body_str));
                        }
                    }
                }
            }
        });

        // Stderr reader (Logs)
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    // Send LSP stderr logs to frontend for debugging
                    let _ = app_handle_clone.emit("lsp:log", format!("LSP stderr: {}", l));
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
            root_uri: Some(root_uri.clone()),
            capabilities: ClientCapabilities {
                text_document: Some(TextDocumentClientCapabilities {
                    completion: Some(CompletionClientCapabilities {
                        completion_item: Some(CompletionItemCapabilities {
                            snippet_support: Some(true),
                        }),
                    }),
                    publish_diagnostics: Some(PublishDiagnosticsCapabilities {
                        tag_support: Some(DiagnosticTagSupport {
                            value_set: vec![1, 2], // 1: Unnecessary, 2: Deprecated
                        }),
                    }),
                }),
                workspace: Some(WorkspaceClientCapabilities {
                    workspace_folders: Some(false),
                }),
            },
        };
        self.write("initialize", serde_json::to_value(params).unwrap(), false)?;
        // Send initialized notification immediately after
        self.write("initialized", json!({}), true)?;
        
        // Request diagnostics for current workspace
        self.write("textDocument/diagnostic", json!({
            "textDocument": {
                "uri": root_uri
            }
        }), true)?;
        
        Ok(())
    }

    pub fn did_open(&mut self, uri: String, content: String) -> Result<(), String> {
        // Определяем язык по расширению файла
        let language_id = if uri.ends_with(".ts") || uri.ends_with(".tsx") {
            "typescript"
        } else if uri.ends_with(".js") || uri.ends_with(".jsx") {
            "javascript"
        } else if uri.ends_with(".go") {
            "go"
        } else if uri.ends_with(".py") {
            "python"
        } else {
            // Определяем на основе типа сервера
            match self.server_type {
                Some(LanguageServerType::Go) => "go",
                Some(LanguageServerType::Python) => "python",
                _ => "typescript" // По умолчанию
            }
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
