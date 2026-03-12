<p align="center">
  <h1 align="center">envi</h1>
  <p align="center">
    Universal .env file manager — switch, diff, and validate environments with one command.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/envi-switch"><img src="https://img.shields.io/npm/v/envi-switch.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/sup3x/envi/actions/workflows/ci.yml"><img src="https://github.com/sup3x/envi/actions/workflows/ci.yml/badge.svg" alt="Node.js CI"></a>
</p>

<p align="center">
  <!-- Replace with an actual demo GIF: -->
  <img src="https://raw.githubusercontent.com/sup3x/envi/main/demo.gif" alt="envi demo" width="600">
</p>

---

## The Problem

- You juggle `.env.development`, `.env.staging`, `.env.production` by hand-copying files.
- You have no idea which variables are missing from which environment until something crashes.
- Comparing two `.env` files means squinting at two tabs side by side.

## The Solution

- **One command** to switch your active `.env` — no copy-pasting, no mistakes.
- **Instant validation** across all environments — catch missing keys before they hit production.
- **Side-by-side diff** with masked values — see exactly what differs without leaking secrets.

## Quick Start

```bash
npm install -g envi-switch

cd your-project
envi init
envi use development
```

That's it. Your `.env` is now managed.

## Commands

### `envi init`

Scans your project for `.env.*` files and initializes envi.

```
$ envi init

  Found 3 environment files:
    .env.development
    .env.staging
    .env.production

  ✔ envi initialized. Use "envi use <env>" to switch environments.
```

### `envi use <environment>`

Switch the active `.env` to a specific environment. Backs up the current `.env` automatically.

```
$ envi use production
  ✔ Switched from development → production
  ℹ Previous .env backed up to .env.backup
```

Flags:
- `-f, --force` — Discard unsaved changes without prompting.

### `envi ls`

List all available environments and highlight the active one.

```
$ envi ls

  ●  development  (12 vars)
  ○  staging      (12 vars)
  ○  production   (11 vars)
```

### `envi diff [env1] [env2]`

Compare two environments side by side. Values are masked by default.

```
$ envi diff development production

  Comparing development ↔ production

  ┌──────────────┬─────────────┬──────────────┐
  │ Variable     │ development │ production   │
  ├──────────────┼─────────────┼──────────────┤
  │ DATABASE_URL │ loc•••••••• │ rds•••••••   │
  │ API_KEY      │ dev•••••••• │ pk_•••••••   │
  │ DEBUG        │ true        │ ✗ missing    │
  └──────────────┴─────────────┴──────────────┘

  Summary: 2 different, 1 only in development, 0 only in production
```

Run with zero arguments to get a summary comparing every environment against the active one:

```
$ envi diff
  Comparing against active: development

  staging:    1 different, 0 missing, 0 extra
  production: 2 different, 1 missing, 0 extra
```

Flags:
- `--show-values` — Show actual values instead of masking.

### `envi validate`

Check all environments for missing or inconsistent variables. Returns exit code 1 on failure — perfect for CI.

```
$ envi validate
  ✔ development: all 12 variables present
  ✔ staging: all 12 variables present
  ⚠ production: missing 1 variables
    - DEBUG

$ echo $?
1
```

Flags:
- `--strict` — Also flag empty values.
- `--env <name>` — Validate a single environment.

### `envi create <name>`

Create a new environment by cloning an existing one.

```
$ envi create qa --from staging
  ✔ Created .env.qa
```

Flags:
- `--from <env>` — Copy from a specific environment (defaults to the active one).
- `--empty` — Copy keys only, leave values blank.

### `envi save`

Save changes made to `.env` back to the source environment file.

```
$ envi save
  ✔ Changes saved to .env.development
    + 1 added
    ~ 2 changed
```

### `envi export <environment>`

Export an environment in different formats. Output goes to stdout so you can pipe it.

```
$ envi export production --format json
{
  "DATABASE_URL": "postgres://...",
  "API_KEY": "pk_live_..."
}

$ envi export staging --format shell
export DATABASE_URL="postgres://..."
export API_KEY="sk_test_..."

$ envi export production --format docker > .env.docker
```

Flags:
- `--format <format>` — Output format: `dotenv` (default), `json`, `shell`, `docker`, `yaml`.
- `--mask` — Mask values for safe review or sharing.
- `--output <file>` — Write to a file instead of stdout.

## Comparison

| Feature | envi | direnv | dotenv-vault | Manual |
|---------|------|--------|-------------|--------|
| Switch environments | one command | - | yes | manual cp |
| Diff environments | yes | - | - | - |
| Validate all envs | yes | - | - | - |
| Free & local | yes | yes | paid | yes |
| Zero config | yes | .envrc needed | account needed | yes |
| Cross-platform | yes | Unix only | yes | yes |

## How It Works

When you run `envi init`, envi scans for `.env.*` files and creates a small `.envi` state file (JSON) that tracks:

- Which environments exist
- Which one is currently active
- When the last switch happened

When you `envi use staging`, envi:

1. Backs up your current `.env` to `.env.backup`
2. Copies `.env.staging` to `.env`
3. Updates `.envi` state

Your environment files (`.env.development`, `.env.production`, etc.) are never modified — they remain your source of truth. Only `.env` changes.

The `.envi` and `.env.backup` files are automatically added to `.gitignore`.

## CI/CD Integration

Add `envi validate` to your CI pipeline to catch missing environment variables before deployment:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  validate-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx envi-switch init
      - run: npx envi-switch validate --strict
```

If any environment is missing variables, the step fails and your PR gets a red check.

## Contributing

Contributions are welcome! Here's how to get started:

```bash
git clone https://github.com/sup3x/envi.git
cd envi
npm install
npm test        # Run the test suite
npm run build   # Build for production
```

**Development workflow:**

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Run `npm test` to ensure all tests pass
5. Submit a pull request

Please make sure all existing tests pass and new features include appropriate test coverage.

## License

[MIT](LICENSE) -- Kerim Gulen
