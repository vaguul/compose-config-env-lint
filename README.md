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

Install from a GitHub release tag:

```bash
npm install --global github:vaguul/compose-config-env-lint#v0.1.2
compose-config-env-lint compose.yml
compose-config-env-lint --json compose.yml
```

Local development:

```bash
npm install
npm run validate
npx tsx src/cli.ts compose.yml
npx tsx src/cli.ts --json compose.yml
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

JSON output:

```json
[
  {
    "filePath": "compose.yml",
    "configName": "roles",
    "variable": "$POSTGRES_PASSWORD",
    "line": 12,
    "column": 27,
    "message": "Compose will interpolate $POSTGRES_PASSWORD inside configs.roles.content before the container starts.",
    "suggestion": "Use $$POSTGRES_PASSWORD when the generated file should keep the runtime environment reference."
  }
]
```

## What It Checks

- top-level `configs`
- each config with a `content` value
- unescaped `$VAR` and `${VAR}` references inside that content
- escaped `$$VAR` references are allowed

## Compose Interpolation Notes

Docker Compose interpolates variables while it reads the Compose file. That is useful for values that should come from the host shell or a local `.env` file, but it is surprising when `configs.*.content` is used to generate a file that should read environment variables later inside the container.

These values are host-side Compose interpolation and should be treated as suspicious inside `configs.*.content`:

```yaml
configs:
  app-config:
    content: |
      token=$APP_TOKEN
      database=${DATABASE_URL}
      fallback=${APP_MODE:-development}
```

If the generated file should keep the literal runtime reference, escape the dollar sign with `$$`:

```yaml
configs:
  app-config:
    content: |
      token=$$APP_TOKEN
      database=$${DATABASE_URL}
```

Use unescaped `$VAR` only when the Compose host should resolve the value before the container is created. Use `$$VAR` when the generated config file, shell script, SQL file, or entrypoint fragment should resolve the value inside the running container.

## Why This Exists

This is a narrow maintenance utility for self-hosted Docker and Coolify workflows. It is intentionally small, testable, and safe to run in CI before publishing Compose snippets in docs.

## License

MIT
