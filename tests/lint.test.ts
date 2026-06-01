import test from "node:test";
import assert from "node:assert/strict";
import { lintComposeConfigEnvUsage } from "../src/index.js";

test("reports unescaped runtime env references inside configs content", () => {
  const source = `
services:
  app:
    image: example/app
    configs:
      - source: roles
        target: /docker-entrypoint-initdb.d/99-roles.sql

configs:
  roles:
    content: |
      \\set pgpass \`echo "$POSTGRES_PASSWORD"\`
      ALTER USER app WITH PASSWORD :'pgpass';
`;

  const findings = lintComposeConfigEnvUsage(source, { filePath: "compose.yml" });

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.configName, "roles");
  assert.equal(findings[0]?.variable, "$POSTGRES_PASSWORD");
  assert.match(findings[0]?.suggestion ?? "", /\$\$POSTGRES_PASSWORD/);
});

test("does not report escaped compose variables", () => {
  const source = `
configs:
  roles:
    content: |
      \\set pgpass \`echo "$$POSTGRES_PASSWORD"\`
`;

  assert.deepEqual(lintComposeConfigEnvUsage(source), []);
});

test("reports braced variables with defaults", () => {
  const source = `
configs:
  app:
    content: |
      password = "\${POSTGRES_PASSWORD:-password}"
`;

  const findings = lintComposeConfigEnvUsage(source);

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.variable, "${POSTGRES_PASSWORD:-password}");
  assert.match(findings[0]?.suggestion ?? "", /\$\$\{POSTGRES_PASSWORD:-password\}/);
});

test("ignores environment outside configs content", () => {
  const source = `
services:
  app:
    image: example/app
    environment:
      POSTGRES_PASSWORD: $POSTGRES_PASSWORD
`;

  assert.deepEqual(lintComposeConfigEnvUsage(source), []);
});
