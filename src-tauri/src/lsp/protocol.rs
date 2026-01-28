use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct InitializeParams {
    #[serde(rename = "processId")]
    pub process_id: Option<u32>,
    #[serde(rename = "rootUri")]
    pub root_uri: Option<String>,
    pub capabilities: ClientCapabilities,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ClientCapabilities {
    #[serde(rename = "textDocument")]
    pub text_document: Option<TextDocumentClientCapabilities>,
    pub workspace: Option<WorkspaceClientCapabilities>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct TextDocumentClientCapabilities {
    pub completion: Option<CompletionClientCapabilities>,
    #[serde(rename = "publishDiagnostics")]
    pub publish_diagnostics: Option<PublishDiagnosticsCapabilities>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CompletionClientCapabilities {
    #[serde(rename = "completionItem")]
    pub completion_item: Option<CompletionItemCapabilities>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CompletionItemCapabilities {
    #[serde(rename = "snippetSupport")]
    pub snippet_support: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct PublishDiagnosticsCapabilities {
    #[serde(rename = "tagSupport")]
    pub tag_support: Option<DiagnosticTagSupport>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct DiagnosticTagSupport {
    #[serde(rename = "valueSet")]
    pub value_set: Vec<i32>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct WorkspaceClientCapabilities {
    #[serde(rename = "workspaceFolders")]
    pub workspace_folders: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DidOpenTextDocumentParams {
    #[serde(rename = "textDocument")]
    pub text_document: TextDocumentItem,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TextDocumentItem {
    pub uri: String,
    #[serde(rename = "languageId")]
    pub language_id: String,
    pub version: i32,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DidChangeTextDocumentParams {
    #[serde(rename = "textDocument")]
    pub text_document: VersionedTextDocumentIdentifier,
    #[serde(rename = "contentChanges")]
    pub content_changes: Vec<TextDocumentContentChangeEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionedTextDocumentIdentifier {
    pub uri: String,
    pub version: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TextDocumentContentChangeEvent {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PublishDiagnosticsParams {
    pub uri: String,
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Diagnostic {
    pub range: Range,
    pub severity: Option<i32>, // 1: Error, 2: Warning, 3: Info, 4: Hint
    pub code: Option<serde_json::Value>, // Number or String
    pub source: Option<String>,
    pub message: String,
    pub tags: Option<Vec<i32>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Range {
    pub start: Position,
    pub end: Position,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub line: u32,
    pub character: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum LspMessage {
    Response(Response),
    Notification(Notification),
    Request(Request),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub id: Option<u64>,
    pub result: Option<serde_json::Value>,
    pub error: Option<ResponseError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseError {
    pub code: i32,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Notification {
    pub method: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    pub id: u64,
    pub method: String,
    pub params: Option<serde_json::Value>,
}
