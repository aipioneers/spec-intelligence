use pulldown_cmark::{html, Options, Parser};

pub fn markdown_to_html(markdown_input: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(markdown_input, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

pub fn extract_frontmatter(content: &str) -> Option<(&str, &str)> {
    if !content.starts_with("---") {
        return None;
    }

    let rest = &content[3..];
    if let Some(end) = rest.find("---") {
        let frontmatter = rest[..end].trim();
        let body = rest[end + 3..].trim();
        Some((frontmatter, body))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_to_html() {
        let input = "# Hello\n\nThis is a **test**.";
        let output = markdown_to_html(input);
        assert!(output.contains("<h1>Hello</h1>"));
        assert!(output.contains("<strong>test</strong>"));
    }

    #[test]
    fn test_extract_frontmatter() {
        let input = "---\ntitle: Test\n---\n\n# Content";
        let (frontmatter, body) = extract_frontmatter(input).unwrap();
        assert_eq!(frontmatter, "title: Test");
        assert_eq!(body, "# Content");
    }

    #[test]
    fn test_no_frontmatter() {
        let input = "# Just content";
        assert!(extract_frontmatter(input).is_none());
    }
}
