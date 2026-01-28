



#[derive(Debug, Clone)]
pub struct FuzzyMatch {
    pub score: i32,
    pub matched_indices: Vec<usize>,
}



pub fn fuzzy_match(pattern: &str, text: &str) -> Option<FuzzyMatch> {
    if pattern.is_empty() {
        return Some(FuzzyMatch {
            score: 0,
            matched_indices: vec![],
        });
    }

    let pattern_lower: Vec<char> = pattern.to_lowercase().chars().collect();
    let text_lower: Vec<char> = text.to_lowercase().chars().collect();
    let text_chars: Vec<char> = text.chars().collect();

    
    let mut pi = 0;
    for &tc in &text_lower {
        if pi < pattern_lower.len() && tc == pattern_lower[pi] {
            pi += 1;
        }
    }
    if pi != pattern_lower.len() {
        return None;
    }

    
    let (score, indices) = find_best_match(&pattern_lower, &text_lower, &text_chars)?;

    Some(FuzzyMatch {
        score,
        matched_indices: indices,
    })
}

fn find_best_match(
    pattern: &[char],
    text_lower: &[char],
    text_original: &[char],
) -> Option<(i32, Vec<usize>)> {
    let n = pattern.len();
    let m = text_lower.len();

    if n == 0 {
        return Some((0, vec![]));
    }
    if n > m {
        return None;
    }

    
    
    let mut dp = vec![vec![i32::MIN / 2; m + 1]; n + 1];
    let mut from = vec![vec![(0usize, 0usize); m + 1]; n + 1];

    dp[0][0] = 0;
    for j in 1..=m {
        dp[0][j] = 0;
    }

    for i in 1..=n {
        for j in i..=m {
            
            if dp[i][j - 1] > dp[i][j] {
                dp[i][j] = dp[i][j - 1];
                from[i][j] = (i, j - 1);
            }

            
            if pattern[i - 1] == text_lower[j - 1] {
                let bonus = calculate_match_bonus(j - 1, text_original, i == 1);
                let score = dp[i - 1][j - 1] + bonus;
                if score > dp[i][j] {
                    dp[i][j] = score;
                    from[i][j] = (i - 1, j - 1);
                }
            }
        }
    }

    if dp[n][m] == i32::MIN / 2 {
        return None;
    }

    
    let mut indices = Vec::with_capacity(n);
    let mut i = n;
    let mut j = m;
    while i > 0 {
        let (pi, pj) = from[i][j];
        if pi < i {
            
            indices.push(j - 1);
        }
        i = pi;
        j = pj;
    }
    indices.reverse();

    Some((dp[n][m], indices))
}


fn calculate_match_bonus(pos: usize, text: &[char], is_first: bool) -> i32 {
    let mut bonus = 10; 

    
    if is_first && pos == 0 {
        bonus += 15;
    }

    
    if pos > 0 {
        let prev = text[pos - 1];
        if is_separator(prev) {
            bonus += 20; 
        } else if prev.is_lowercase() && text[pos].is_uppercase() {
            bonus += 15; 
        }
    } else {
        bonus += 20; 
    }

    
    if pos < text.len() && text[pos].is_uppercase() {
        bonus += 5;
    }

    

    bonus
}

fn is_separator(c: char) -> bool {
    matches!(c, ' ' | '.' | '_' | '-' | '/' | ':' | '\\')
}


pub fn fuzzy_match_multi(
    pattern: &str,
    label: &str,
    description: Option<&str>,
    category: &str,
) -> Option<FuzzyMatch> {
    
    if let Some(mut m) = fuzzy_match(pattern, label) {
        m.score += 100; 
        return Some(m);
    }

    
    let category_label = format!("{}: {}", category, label);
    if let Some(mut m) = fuzzy_match(pattern, &category_label) {
        m.score += 50;
        return Some(m);
    }

    
    if let Some(desc) = description {
        if let Some(mut m) = fuzzy_match(pattern, desc) {
            m.score += 25;
            
            m.matched_indices.clear();
            return Some(m);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_match() {
        let result = fuzzy_match("save", "Save File").unwrap();
        assert!(result.score > 0);
        assert_eq!(result.matched_indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn test_fuzzy_match() {
        let result = fuzzy_match("sf", "Save File").unwrap();
        assert!(result.score > 0);
        assert_eq!(result.matched_indices, vec![0, 5]);
    }

    #[test]
    fn test_no_match() {
        assert!(fuzzy_match("xyz", "Save File").is_none());
    }

    #[test]
    fn test_empty_pattern() {
        let result = fuzzy_match("", "Save File").unwrap();
        assert_eq!(result.score, 0);
        assert!(result.matched_indices.is_empty());
    }

    #[test]
    fn test_camel_case() {
        let result = fuzzy_match("gc", "gitCommit").unwrap();
        assert!(result.score > 0);
    }
}
