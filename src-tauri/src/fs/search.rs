use regex::{Regex, RegexBuilder};

use super::types::SearchOptions;

pub fn build_search_regex(options: &SearchOptions) -> Result<Regex, String> {
    if options.query.trim().is_empty() {
        return Err("Empty query".to_string());
    }

    let mut pattern = options.query.clone();
    if !options.is_regex {
        pattern = regex::escape(&pattern);
    }
    if options.is_whole_word {
        pattern = format!(r"\b{}\b", pattern);
    }

    let mut builder = RegexBuilder::new(&pattern);
    builder.case_insensitive(!options.is_case_sensitive);
    builder.multi_line(true);
    builder.dot_matches_new_line(false);

    builder.build().map_err(|e| e.to_string())
}

pub fn preserve_case(replacement: &str, matched: &str) -> String {
    if matched.is_empty() {
        return replacement.to_string();
    }

    let is_all_upper = matched.chars().any(|c| c.is_alphabetic())
        && matched
            .chars()
            .filter(|c| c.is_alphabetic())
            .all(|c| c.is_uppercase());
    if is_all_upper {
        return replacement.to_uppercase();
    }

    let is_all_lower = matched.chars().any(|c| c.is_alphabetic())
        && matched
            .chars()
            .filter(|c| c.is_alphabetic())
            .all(|c| c.is_lowercase());
    if is_all_lower {
        return replacement.to_lowercase();
    }

    let mut chars = matched.chars();
    let first = chars.next().unwrap_or(' ');
    let rest: String = chars.collect();
    let is_capitalized = first.is_uppercase()
        && rest.chars().any(|c| c.is_alphabetic())
        && rest
            .chars()
            .filter(|c| c.is_alphabetic())
            .all(|c| c.is_lowercase());
    if is_capitalized {
        let mut rep_chars = replacement.chars();
        let rep_first = rep_chars.next();
        let rep_rest: String = rep_chars.collect();
        if let Some(rf) = rep_first {
            return format!("{}{}", rf.to_uppercase(), rep_rest);
        }
        return replacement.to_string();
    }

    replacement.to_string()
}
