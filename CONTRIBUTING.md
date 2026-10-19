# Contributing to Vitae

Vitae is a personal hobby project, but ideas and bug reports are welcome.

## Reporting a bug or suggesting something

Open an issue and say what you expected, what happened, and (for a bug) the steps to reproduce it. A screenshot helps. Please do not include real personal data from a CV.

## Making a change

1. Fork the repository and create a branch from `dev`.
2. Set the project up as described in the [README](README.md#how-to-install-and-run-the-project).
3. Keep the change small and focused. Follow the folder layout and import rules in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
4. New texts go in all three languages: `apps/web/src/i18n/locales/{en,bg,de}` (the build fails if one is missing).
5. Add or update tests for what you changed.
6. Before you push, run:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm e2e
   ```

   A pre-commit hook formats and lints the files you commit.

7. Open a pull request against `dev` and describe what changed and why. CI runs the same checks.

## Secrets

Never commit API keys, passwords or `.env` files. If you find a security problem, please open a private security advisory on GitHub instead of a public issue.
