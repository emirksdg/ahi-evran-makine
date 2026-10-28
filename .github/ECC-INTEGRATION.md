# ECC integration for Copilot

This repository includes a project-local adaptation of [affaan-m/ECC](https://github.com/affaan-m/ECC) version 2.2.3 for GitHub Copilot.

Included:

- 71 Copilot CLI agent profiles in `.github/agents/`.
- The complete catalog of 311 ECC skills in `.github/skills/`.
- Five reusable Copilot Chat prompts in `.github/prompts/`.
- Shared project guidance in `AGENTS.md` and `.github/copilot-instructions.md`.
- VS Code prompt and instruction settings in `.vscode/settings.json`.

In Copilot CLI, use `/agent` to select an agent and `copilot skill list` to inspect discovered skills. In VS Code Copilot Chat, use `/` to select a prompt.

This is not the complete ECC runtime. ECC's Claude-oriented hooks, command shims, and runtime scripts are not installed: they do not run as Copilot features. Language-specific ECC rules are also not imported wholesale; use this repository's guidance and the relevant skill instead. Some skills describe optional external tools or services that are not installed or configured here. Review a skill's prerequisites before following those steps.

The upstream MIT license is included as `agents/ECC-LICENSE.txt`.
