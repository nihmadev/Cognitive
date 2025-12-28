use portable_pty::PtySize;
use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub type TerminalSessions = Arc<Mutex<HashMap<String, TerminalSession>>>;

pub struct TerminalSession {
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    reader_task: Option<std::thread::JoinHandle<()>>,
    should_stop: Arc<AtomicBool>,
    pid: u32,
    process_name: String,
}

impl TerminalSession {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        _id: String,
        master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
        writer: Arc<Mutex<Box<dyn Write + Send>>>,
        child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
        reader_task: Option<std::thread::JoinHandle<()>>,
        should_stop: Arc<AtomicBool>,
        pid: u32,
        process_name: String,
    ) -> Self {
        Self {
            master,
            writer,
            child,
            reader_task,
            should_stop,
            pid,
            process_name,
        }
    }

    pub fn pid(&self) -> u32 {
        self.pid
    }

    pub fn process_name(&self) -> &str {
        &self.process_name
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock().unwrap();
        writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush terminal: {}", e))
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let master = self.master.lock().unwrap();
        master
            .resize(pty_size)
            .map_err(|e| format!("Failed to resize terminal: {}", e))
    }

    pub fn close(mut self) {
        self.should_stop.store(true, Ordering::SeqCst);

        #[cfg(windows)]
        {
            if self.pid > 0 {
                let _ = std::process::Command::new("taskkill")
                    .args(&["/F", "/T", "/PID", &self.pid.to_string()])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .output();
            }
        }

        {
            let mut child = self.child.lock().unwrap();
            let _ = child.kill();
            let _ = child.wait();
        }

        drop(self.writer);
        drop(self.master);

        if let Some(handle) = self.reader_task.take() {
            let join_result = std::thread::spawn(move || handle.join());
            std::thread::sleep(Duration::from_millis(500));
            drop(join_result);
        }
    }
}
