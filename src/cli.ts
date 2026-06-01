#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { argv, exitCode, stderr, stdout } from "node:process";
import { lintComposeConfigEnvUsage } from "./index.js";

function printHelp() {
  stdout.write(`compose-config-env-lint

Usage:
  compose-config-env-lint [--json] <compose.yml> [more-compose-files...]

Checks Docker Compose configs.*.content blocks for unescaped runtime env
references such as $POSTGRES_PASSWORD. Use $$POSTGRES_PASSWORD when the
generated config file should keep the variable for the container runtime.

Options:
  --json  Print findings as a JSON array for CI integrations.
`);
}

const args = argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const jsonOutput = args.includes("--json");
const filePaths = args.filter((arg) => arg !== "--json");

if (filePaths.length === 0) {
  printHelp();
  process.exit(2);
}

let findingCount = 0;
const allFindings = [];

for (const filePath of filePaths) {
  try {
    const source = await readFile(filePath, "utf8");
    const findings = lintComposeConfigEnvUsage(source, { filePath });
    findingCount += findings.length;
    allFindings.push(...findings);

    if (!jsonOutput) {
      for (const finding of findings) {
        stdout.write(`${finding.filePath}:${finding.line}:${finding.column} ${finding.message}\n`);
        stdout.write(`  config: ${finding.configName}\n`);
        stdout.write(`  suggestion: ${finding.suggestion}\n`);
      }
    }
  } catch (error) {
    findingCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${basename(filePath)}: ${message}\n`);
  }
}

if (jsonOutput) {
  stdout.write(`${JSON.stringify(allFindings, null, 2)}\n`);
}

process.exit(findingCount > 0 ? 1 : exitCode ?? 0);
