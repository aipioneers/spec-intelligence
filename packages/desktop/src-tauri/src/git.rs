use git2::Repository;

pub struct SpecRepository {
    repo: Repository,
}

impl SpecRepository {
    pub fn open(path: &str) -> Result<Self, String> {
        let repo = Repository::open(path).map_err(|e| format!("Failed to open repository: {}", e))?;
        Ok(Self { repo })
    }

    pub fn current_branch(&self) -> Result<String, String> {
        let head = self
            .repo
            .head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;

        head.shorthand()
            .map(|s| s.to_string())
            .ok_or_else(|| "Failed to get branch name".to_string())
    }

    pub fn has_changes(&self) -> Result<bool, String> {
        let mut opts = git2::StatusOptions::new();
        opts.include_untracked(true);

        let statuses = self
            .repo
            .statuses(Some(&mut opts))
            .map_err(|e| format!("Failed to get status: {}", e))?;

        Ok(!statuses.is_empty())
    }

    pub fn changed_files(&self) -> Result<Vec<String>, String> {
        let mut opts = git2::StatusOptions::new();
        opts.include_untracked(true);

        let statuses = self
            .repo
            .statuses(Some(&mut opts))
            .map_err(|e| format!("Failed to get status: {}", e))?;

        let files: Vec<String> = statuses
            .iter()
            .filter_map(|entry| entry.path().map(|p| p.to_string()))
            .collect();

        Ok(files)
    }
}
