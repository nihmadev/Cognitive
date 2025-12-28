use serde::Serialize;
use std::collections::HashSet;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub local_address: String,
    pub state: String,
}

#[tauri::command]
pub async fn get_listening_ports() -> Result<Vec<PortInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        get_ports_windows()
    }

    #[cfg(target_os = "linux")]
    {
        get_ports_linux()
    }

    #[cfg(target_os = "macos")]
    {
        get_ports_macos()
    }
}

// ============================================================================
// Windows Implementation
// ============================================================================

#[cfg(target_os = "windows")]
fn get_ports_windows() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| format!("Failed to execute netstat: {}", e))?;

    if !output.status.success() {
        return Err("netstat command failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    // Build process name cache for better performance
    let process_cache = build_process_cache_windows();

    for line in stdout.lines().skip(4) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        let protocol = parts[0].to_uppercase();
        if protocol != "TCP" && protocol != "UDP" {
            continue;
        }

        let local_addr = parts[1];
        let state = if protocol == "TCP" && parts.len() > 3 {
            parts[3].to_string()
        } else {
            "LISTENING".to_string()
        };

        // Only show LISTENING TCP or UDP ports
        if protocol == "TCP" && state != "LISTENING" {
            continue;
        }

        // Parse port from address (format: 0.0.0.0:port or [::]:port)
        let port = match local_addr.rsplit(':').next() {
            Some(port_str) => match port_str.parse::<u16>() {
                Ok(p) if p > 0 => p,
                _ => continue,
            },
            None => continue,
        };

        // Skip duplicates by (port, protocol)
        let key = (port, protocol.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        // PID is always the last column in netstat -ano output
        let pid = parts.last().and_then(|s| s.parse::<u32>().ok());
        let process_name = pid.and_then(|p| process_cache.get(&p).cloned());

        ports.push(PortInfo {
            port,
            protocol,
            pid,
            process_name,
            local_address: local_addr.to_string(),
            state,
        });
    }

    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

#[cfg(target_os = "windows")]
fn build_process_cache_windows() -> std::collections::HashMap<u32, String> {
    use std::collections::HashMap;
    let mut cache: HashMap<u32, String> = HashMap::new();

    let output = match Command::new("tasklist")
        .args(["/FO", "CSV", "/NH"])
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return cache,
    };

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        // Parse CSV format: "process.exe","pid","Session Name","Session#","Mem Usage"
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() < 2 {
            continue;
        }

        let name = fields[0].trim_matches('"');
        let pid_str = fields[1].trim_matches('"');

        if let Ok(pid) = pid_str.parse::<u32>() {
            if !name.is_empty() && !name.contains("INFO:") {
                cache.insert(pid, name.to_string());
            }
        }
    }

    cache
}

// ============================================================================
// Linux Implementation
// ============================================================================

#[cfg(target_os = "linux")]
fn get_ports_linux() -> Result<Vec<PortInfo>, String> {
    // Try ss first, fallback to netstat if not available
    match get_ports_linux_ss() {
        Ok(ports) => Ok(ports),
        Err(_) => get_ports_linux_netstat(),
    }
}

#[cfg(target_os = "linux")]
fn get_ports_linux_ss() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("ss")
        .args(["-tulnp"])
        .output()
        .map_err(|e| format!("Failed to execute ss: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ss command failed (may require sudo): {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let protocol = parts[0].to_uppercase();
        let local_addr = parts[4];

        let port = match local_addr.rsplit(':').next() {
            Some(port_str) => match port_str.parse::<u16>() {
                Ok(p) if p > 0 => p,
                _ => continue,
            },
            None => continue,
        };

        // Skip duplicates by (port, protocol)
        let key = (port, protocol.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        // Find the users: field - it's not always at a fixed position
        // Look for field starting with "users:" in the line
        let (pid, process_name) = parts
            .iter()
            .find(|&&field| field.starts_with("users:"))
            .map(|&field| parse_linux_process_info(field))
            .unwrap_or((None, None));

        ports.push(PortInfo {
            port,
            protocol,
            pid,
            process_name,
            local_address: local_addr.to_string(),
            state: "LISTEN".to_string(),
        });
    }

    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

#[cfg(target_os = "linux")]
fn get_ports_linux_netstat() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("netstat")
        .args(["-tulnp"])
        .output()
        .map_err(|e| format!("Failed to execute netstat: {}", e))?;

    if !output.status.success() {
        return Err("netstat command failed (may require sudo)".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        let protocol = parts[0].to_uppercase();
        if !protocol.starts_with("TCP") && !protocol.starts_with("UDP") {
            continue;
        }

        let protocol_clean = if protocol.starts_with("TCP") {
            "TCP".to_string()
        } else {
            "UDP".to_string()
        };

        let local_addr = parts[3];

        let port = match local_addr.rsplit(':').next() {
            Some(port_str) => match port_str.parse::<u16>() {
                Ok(p) if p > 0 => p,
                _ => continue,
            },
            None => continue,
        };

        // Skip duplicates
        let key = (port, protocol_clean.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        // PID/Program is the last column in netstat -tulnp
        let (pid, process_name) = parts
            .last()
            .map(|&field| parse_netstat_process_info(field))
            .unwrap_or((None, None));

        ports.push(PortInfo {
            port,
            protocol: protocol_clean,
            pid,
            process_name,
            local_address: local_addr.to_string(),
            state: "LISTEN".to_string(),
        });
    }

    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

#[cfg(target_os = "linux")]
fn parse_linux_process_info(info: &str) -> (Option<u32>, Option<String>) {
    // Format: users:(("process",pid=1234,fd=3)) or users:(("ssh",pid=1234,fd=12),("ssh",pid=5678,fd=13))
    let mut pid = None;
    let mut name = None;

    // Extract PID
    if let Some(p) = info.find("pid=") {
        let rest = &info[p + 4..];
        if let Some(end) = rest.find(|c| c == ',' || c == ')') {
            pid = rest[..end].parse::<u32>().ok();
        }
    }

    // Extract process name
    if let Some(start) = info.find("((\"") {
        let rest = &info[start + 3..];
        if let Some(end) = rest.find('"') {
            name = Some(rest[..end].to_string());
        }
    }

    (pid, name)
}

#[cfg(target_os = "linux")]
fn parse_netstat_process_info(info: &str) -> (Option<u32>, Option<String>) {
    // Format: 1234/process_name or -
    if info == "-" {
        return (None, None);
    }

    let parts: Vec<&str> = info.splitn(2, '/').collect();
    let pid = parts.first().and_then(|s| s.parse::<u32>().ok());
    let name = parts.get(1).map(|s| s.to_string());

    (pid, name)
}

// ============================================================================
// macOS Implementation
// ============================================================================

#[cfg(target_os = "macos")]
fn get_ports_macos() -> Result<Vec<PortInfo>, String> {
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    // Get TCP LISTEN ports
    if let Ok(tcp_ports) = get_ports_macos_tcp() {
        for port_info in tcp_ports {
            let key = (port_info.port, port_info.protocol.clone());
            if !seen_ports.contains(&key) {
                seen_ports.insert(key);
                ports.push(port_info);
            }
        }
    }

    // Get UDP ports
    if let Ok(udp_ports) = get_ports_macos_udp() {
        for port_info in udp_ports {
            let key = (port_info.port, port_info.protocol.clone());
            if !seen_ports.contains(&key) {
                seen_ports.insert(key);
                ports.push(port_info);
            }
        }
    }

    if ports.is_empty() {
        return Err("Failed to get port information (may require sudo)".to_string());
    }

    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

#[cfg(target_os = "macos")]
fn get_ports_macos_tcp() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-iTCP", "-sTCP:LISTEN", "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to execute lsof: {}", e))?;

    if !output.status.success() {
        return Err("lsof command failed".to_string());
    }

    parse_lsof_output(&output.stdout, "TCP", "LISTEN")
}

#[cfg(target_os = "macos")]
fn get_ports_macos_udp() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-iUDP", "-P", "-n"])
        .output()
        .map_err(|e| format!("Failed to execute lsof: {}", e))?;

    if !output.status.success() {
        return Err("lsof command failed".to_string());
    }

    parse_lsof_output(&output.stdout, "UDP", "UDP")
}

#[cfg(target_os = "macos")]
fn parse_lsof_output(stdout: &[u8], protocol: &str, state: &str) -> Result<Vec<PortInfo>, String> {
    let stdout = String::from_utf8_lossy(stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<u16> = HashSet::new();

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let process_name = Some(parts[0].to_string());
        let pid = parts[1].parse::<u32>().ok();
        let local_addr = parts[8];

        let port = match local_addr.rsplit(':').next() {
            Some(port_str) => match port_str.parse::<u16>() {
                Ok(p) if p > 0 => p,
                _ => continue,
            },
            None => continue,
        };

        if seen_ports.contains(&port) {
            continue;
        }
        seen_ports.insert(port);

        ports.push(PortInfo {
            port,
            protocol: protocol.to_string(),
            pid,
            process_name,
            local_address: local_addr.to_string(),
            state: state.to_string(),
        });
    }

    Ok(ports)
}
