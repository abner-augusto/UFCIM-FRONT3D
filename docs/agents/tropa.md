# Tropa

Machine config lives in [`tropa.toml`](tropa.toml): check command, tracker, autonomy and night eligibility. This file holds what the TOML cannot say.

## Check

`bash scripts/check` runs the pre-commit gate from `AGENTS.md` (`npm run lint`, `npm run type-check`, `npm test` with V8 coverage) and then `tropa quality`, and needs the `tropa` CLI on PATH. Its last line is `check: passed` or `check: FAILED (<parts>)`.

`tropa quality` holds TypeScript, JavaScript and Vue components (`<script>` blocks, whole file against the line limit) to the `[quality]` limits in `tropa.toml`; today's debt is in [`quality-baseline.json`](quality-baseline.json), which only shrinks (`tropa quality --shrink-baseline`). The check writes `coverage/coverage-final.json` (git-ignored) with `@vitest/coverage-v8`, and CRAP reads it. No unit test mounts a `.vue` file, so a component's CRAP is measured only once a test imports it.

Enable the pre-push hook once per clone with `git config core.hooksPath scripts/git-hooks`. It reruns the check unless the check already passed on every pushed tree.

Run the Playwright suite (`npm run test:e2e`) as well before a PR that changes broad user behavior; it needs the sibling `../ufcim-backend-proto`.

## Tracker and ledger

GitHub Issues in this repository, as in [`issue-tracker.md`](issue-tracker.md), for front and back alike. The decision ledger goes in an issue comment: decision, why, confidence (high/medium/low), what you would have asked.

## Autonomy

Features and cross-cutting changes go on a `feat/...` or `fix/...` branch with a PR. Nothing is pushed without Abner's explicit authorization: UFCIM has users running it. Production D1 writes and Worker deploys always need his approval.

## Night shift

Not eligible (`[night] eligible = false`). The tracker follows the tropa shape for consistency with the other repositories, not to run overnight.

## Needs

Add a `Needs:` line to an issue whose work requires more than the local stack:

- `Needs: live`: production D1, the deployed Worker or Pages, or real users' data;
- `Needs: gui`: checking the 3D viewer or a mobile layout by eye;
- `Needs: design`: a Blender or GLB change (new geometry or pins).
