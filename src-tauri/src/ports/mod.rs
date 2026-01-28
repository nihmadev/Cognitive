use serde::Serialize;
use std::collections::HashSet;
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub local_address: String,
    pub state: String,
}

struct PortCache {
    data: Vec<PortInfo>,
    timestamp: Instant,
    process_cache: std::collections::HashMap<u32, String>,
    process_cache_timestamp: Instant,
}

impl PortCache {
    fn new() -> Self {
        Self {
            data: Vec::new(),
            timestamp: Instant::now() - Duration::from_secs(10),
            process_cache: std::collections::HashMap::new(),
            process_cache_timestamp: Instant::now() - Duration::from_secs(30),
        }
    }
}

lazy_static::lazy_static! {
    static ref PORT_CACHE: Mutex<PortCache> = Mutex::new(PortCache::new());
}

#[tauri::command]
pub async fn get_listening_ports() -> Result<Vec<PortInfo>, String> {
    let mut cache = PORT_CACHE.lock().unwrap();
    
    // Return cached data if less than 2 seconds old
    if cache.timestamp.elapsed() < Duration::from_secs(2) && !cache.data.is_empty() {
        return Ok(cache.data.clone());
    }

    #[cfg(target_os = "windows")]
    {
        match get_ports_windows_cached(&mut cache) {
            Ok(ports) => {
                cache.data = ports.clone();
                cache.timestamp = Instant::now();
                Ok(ports)
            }
            Err(e) => {
                Err(e)
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        match get_ports_linux() {
            Ok(ports) => {
                cache.data = ports.clone();
                cache.timestamp = Instant::now();
                Ok(ports)
            }
            Err(e) => Err(e),
        }
    }

    #[cfg(target_os = "macos")]
    {
        match get_ports_macos() {
            Ok(ports) => {
                cache.data = ports.clone();
                cache.timestamp = Instant::now();
                Ok(ports)
            }
            Err(e) => Err(e),
        }
    }
}

#[tauri::command]
pub async fn get_port_changes() -> Result<Vec<PortInfo>, String> {
    let mut cache = PORT_CACHE.lock().unwrap();
    
    // Get current ports using platform-specific logic
    #[cfg(target_os = "windows")]
    {
        let current_ports = match get_ports_windows_cached(&mut cache) {
            Ok(ports) => ports,
            Err(e) => return Err(e),
        };
        
        // Compare with cached data
        let changes = if cache.data.is_empty() {
            current_ports.clone() // First time, return all
        } else {
            // Find differences
            let old_set: std::collections::HashSet<(u16, String)> = cache.data.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            let _new_set: std::collections::HashSet<(u16, String)> = current_ports.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            
            // Return ports that are new or changed
            current_ports.clone().into_iter()
                .filter(|p| !old_set.contains(&(p.port, p.protocol.clone())))
                .collect()
        };
        
        // Update cache
        cache.data = current_ports;
        cache.timestamp = Instant::now();
        
        Ok(changes)
    }

    #[cfg(target_os = "linux")]
    {
        let current_ports = match get_ports_linux() {
            Ok(ports) => ports,
            Err(e) => return Err(e),
        };
        
        // Compare with cached data
        let changes = if cache.data.is_empty() {
            current_ports.clone() // First time, return all
        } else {
            // Find differences
            let old_set: std::collections::HashSet<(u16, String)> = cache.data.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            let _new_set: std::collections::HashSet<(u16, String)> = current_ports.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            
            // Return ports that are new or changed
            current_ports.clone().into_iter()
                .filter(|p| !old_set.contains(&(p.port, p.protocol.clone())))
                .collect()
        };
        
        // Update cache
        cache.data = current_ports;
        cache.timestamp = Instant::now();
        
        Ok(changes)
    }

    #[cfg(target_os = "macos")]
    {
        let current_ports = match get_ports_macos() {
            Ok(ports) => ports,
            Err(e) => return Err(e),
        };
        
        // Compare with cached data
        let changes = if cache.data.is_empty() {
            current_ports.clone() // First time, return all
        } else {
            // Find differences
            let old_set: std::collections::HashSet<(u16, String)> = cache.data.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            let _new_set: std::collections::HashSet<(u16, String)> = current_ports.iter()
                .map(|p| (p.port, p.protocol.clone()))
                .collect();
            
            // Return ports that are new or changed
            current_ports.clone().into_iter()
                .filter(|p| !old_set.contains(&(p.port, p.protocol.clone())))
                .collect()
        };
        
        // Update cache
        cache.data = current_ports;
        cache.timestamp = Instant::now();
        
        Ok(changes)
    }
}





#[cfg(target_os = "windows")]
fn get_ports_windows_cached(cache: &mut PortCache) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| {
            let err_msg = format!("Failed to execute netstat: {}", e);
            err_msg
        })?;

    if !output.status.success() {
        let err_msg = "netstat command failed".to_string();
        return Err(err_msg);
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    // Use cached process data if less than 30 seconds old
    if cache.process_cache_timestamp.elapsed() > Duration::from_secs(30) {
        cache.process_cache = build_process_cache_windows();
        cache.process_cache_timestamp = Instant::now();
    }

    let mut _line_count = 0;
    for line in stdout.lines().skip(4) {
        _line_count += 1;
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

        
        if protocol == "TCP" && state != "LISTENING" {
            continue;
        }

        
        let port = match local_addr.rsplit(':').next() {
            Some(port_str) => match port_str.parse::<u16>() {
                Ok(p) if p > 0 => p,
                _ => continue,
            },
            None => continue,
        };

        
        let key = (port, protocol.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        
        let pid = parts.last().and_then(|s| s.parse::<u32>().ok());
        let process_name = pid.and_then(|p| cache.process_cache.get(&p).cloned());

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





#[cfg(target_os = "linux")]
fn get_ports_linux() -> Result<Vec<PortInfo>, String> {
    
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

        
        let key = (port, protocol.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        
        
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

        
        let key = (port, protocol_clean.clone());
        if seen_ports.contains(&key) {
            continue;
        }
        seen_ports.insert(key);

        
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
    
    let mut pid = None;
    let mut name = None;

    
    if let Some(p) = info.find("pid=") {
        let rest = &info[p + 4..];
        if let Some(end) = rest.find(|c| c == ',' || c == ')') {
            pid = rest[..end].parse::<u32>().ok();
        }
    }

    
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
    
    if info == "-" {
        return (None, None);
    }

    let parts: Vec<&str> = info.splitn(2, '/').collect();
    let pid = parts.first().and_then(|s| s.parse::<u32>().ok());
    let name = parts.get(1).map(|s| s.to_string());

    (pid, name)
}





#[cfg(target_os = "macos")]
fn get_ports_macos() -> Result<Vec<PortInfo>, String> {
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen_ports: HashSet<(u16, String)> = HashSet::new();

    
    if let Ok(tcp_ports) = get_ports_macos_tcp() {
        for port_info in tcp_ports {
            let key = (port_info.port, port_info.protocol.clone());
            if !seen_ports.contains(&key) {
                seen_ports.insert(key);
                ports.push(port_info);
            }
        }
    }

    
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
