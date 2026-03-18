use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;

pub struct SpecFileWatcher {
    _watcher: RecommendedWatcher,
}

impl SpecFileWatcher {
    pub fn new<F>(path: &str, callback: F) -> Result<Self, String>
    where
        F: Fn(Event) + Send + 'static,
    {
        let (tx, rx) = mpsc::channel();

        let mut watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                if let Ok(event) = result {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher
            .watch(Path::new(path), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                callback(event);
            }
        });

        Ok(Self { _watcher: watcher })
    }
}
