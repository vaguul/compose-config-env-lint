import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("prints JSON findings when --json is used", async () => {
  try {
    await execFileAsync("npx", ["tsx", "src/cli.ts", "--json", "examples/bad-compose.yml"]);
    assert.fail("Expected CLI to exit with findings");
  } catch (error) {
    const result = error as { stdout?: string; stderr?: string; code?: number };
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");

    const findings = JSON.parse(result.stdout ?? "[]") as Array<{ configName: string; variable: string }>;
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.configName, "roles");
    assert.equal(findings[0]?.variable, "$POSTGRES_PASSWORD");
  }
});
