# compose-config-env-lint

![CI](https://github.com/vaguul/compose-config-env-lint/actions/workflows/ci.yml/badge.svg)
![MIT License](https://img.shields.io/badge/license-MIT-8fe3c7)

Small CLI lint for Docker Compose files that use `configs.*.content`.

It catches a subtle mistake: `$POSTGRES_PASSWORD` inside a Compose `configs` content block is interpolated by Compose before the container starts. If the generated file should keep a runtime environment reference, use `$$POSTGRES_PASSWORD`.

## Example

```yaml
configs:
  roles:
    content: |
      \set pgpass `echo "$POSTGRES_PASSWORD"`
```

The generated config may receive a blank or host-side value. Prefer this when the target file should read the variable inside the container:

```yaml
configs:
  roles:
    content: |
      \set pgpass `echo "$$POSTGRES_PASSWORD"`
```

## Usage

```bash
npm install
npm run validate
npx tsx src/cli.ts compose.yml
```

Try the fixtures:

```bash
npx tsx src/cli.ts examples/bad-compose.yml
npx tsx src/cli.ts examples/good-compose.yml
```

Output:

```text
compose.yml:12:27 Compose will interpolate $POSTGRES_PASSWORD inside configs.roles.content before the container starts.
  config: roles
  suggestion: Use $$POSTGRES_PASSWORD when the generated file should keep the runtime environment reference.
```

## What It Checks

- top-level `configs`
- each config with a `content` value
- unescaped `$VAR` and `${VAR}` references inside that content
- escaped `$$VAR` references are allowed

## Why This Exists

This is a narrow maintenance utility for self-hosted Docker and Coolify workflows. It is intentionally small, testable, and safe to run in CI before publishing Compose snippets in docs.

## License

MIT
