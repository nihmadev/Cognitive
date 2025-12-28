use globset::{Glob, GlobSet, GlobSetBuilder};

pub fn build_globset(patterns_csv: &str) -> Result<Option<GlobSet>, String> {
    let parts: Vec<String> = patterns_csv
        .split(',')
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .map(|p| p.to_string())
        .collect();

    if parts.is_empty() {
        return Ok(None);
    }

    let mut builder = GlobSetBuilder::new();
    for p in parts {
        let glob = Glob::new(&p).map_err(|e| e.to_string())?;
        builder.add(glob);
    }
    let set = builder.build().map_err(|e| e.to_string())?;
    Ok(Some(set))
}

pub fn is_ignored_dir(component: &std::ffi::OsStr) -> bool {
    let s = component.to_string_lossy();
    matches!(s.as_ref(), "node_modules" | ".git" | "dist" | "build" | "target" | ".vscode")
}
