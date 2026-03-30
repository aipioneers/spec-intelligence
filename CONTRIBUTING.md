# Contributing to spec-intelligence

Contributions are welcome. Whether it's a bug report, feature suggestion, or pull request — thank you for helping improve spec-intelligence.

## Reporting Bugs

Open an issue using the **Bug Report** template. Include steps to reproduce, expected behavior, and your environment.

## Suggesting Features

Open an issue using the **Feature Request** template. Describe the use case and why it matters.

## Prerequisites

- **Node.js 20+** (web app)
- **Rust** (desktop app via Tauri — optional)
- **Ollama** (LLM features — optional, everything works without it)

## Development Setup

```bash
git clone https://github.com/aipioneers/spec-intelligence.git
cd spec-intelligence
npm install
make dev          # Web app on localhost:3333
make test         # Run all tests
make desktop      # Tauri desktop app (requires Rust)
```

## Project Structure

```
packages/
├── web/       # Next.js 14 web application
├── desktop/   # Tauri 2 desktop wrapper
└── ui/        # Shared React component library
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Write tests for new functionality
3. Run `make test` and make sure everything passes
4. Open a PR with a clear description of what and why

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind.
