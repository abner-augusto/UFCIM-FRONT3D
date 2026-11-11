# Issue tracker: GitHub

Issues for the whole UFCIM product live in this repository's GitHub Issues, including work that lands in the backend (`ufcim-backend-proto`). The backend has no tracker of its own. Use the `gh` CLI for every operation.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file>`, with the body in Brazilian Portuguese.
- **Read an issue**: `gh issue view <number> --comments`, including its labels.
- **List issues**: `gh issue list` with state and label filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close an issue**: `gh issue close <number> --comment "..."`.

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Issue shape

Title: `area: o que muda`, in Portuguese (`reservas:`, `chamados:`, `maquete 3D:`, `dados:`, `auth:`, `release:`).

Body sections, in order:

- `## Problema`: what the user hits today, with `file:line` pointers when known.
- `## O que fazer`: the change, naming each repository it touches (front, back, D1 data, GLB/manifest).
- `## Critérios de aceite`: `- [ ]` items, each observable by a test or runtime evidence.
- `## Decisões em aberto`: only while the issue is `needs-triage` or `needs-info`.
- Closing lines: `Esforço: PP | P | M | G | GG`, an optional `Needs: live | gui | design` line, and an optional `Blocked by #N` line.

## Public repository

This repository is public. Issues name people by role (for example "técnico administrativo do IAUD"), never by name or e-mail. They carry no credentials, local backup paths or production identifiers beyond what the code already shows.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares one number space across issues and pull requests. Resolve ambiguous references by checking the pull request first and then the issue.

## Skill operations

- When a skill says **publish to the issue tracker**, create a GitHub issue here.
- When a skill says **fetch the relevant ticket**, read the issue and its comments with `gh`.
- Publish dependency blockers before blocked tickets so bodies can reference real issue numbers.
- Use native GitHub issue dependencies when available; otherwise record a `Blocked by` line in the issue body.
- Apply `ready-for-agent` only when the ticket is fully specified and has verifiable acceptance criteria.
- Work waiting on the requester's validation in production stays open as `needs-info` and closes once they confirm.

## History

Cards before 2026-11-11 lived on an Obsidian Kanban board outside the repository. Migrated issues name their old card ID (`BUG-0XX`, `MEL-0XX`, `WP-X`) in the body. Specs and finished cards remain in that vault.
