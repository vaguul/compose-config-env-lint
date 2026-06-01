import { LineCounter, isMap, isScalar, parseDocument } from "yaml";

export interface ComposeConfigEnvFinding {
  filePath: string;
  configName: string;
  variable: string;
  line: number;
  column: number;
  message: string;
  suggestion: string;
}

export interface LintOptions {
  filePath?: string;
}

const ENV_REFERENCE_PATTERN = /(?<!\$)\$(?:\{[A-Za-z_][A-Za-z0-9_]*(?::[-?][^}]*)?\}|[A-Za-z_][A-Za-z0-9_]*)/g;

export function lintComposeConfigEnvUsage(source: string, options: LintOptions = {}): ComposeConfigEnvFinding[] {
  const filePath = options.filePath ?? "compose.yml";
  const lineCounter = new LineCounter();
  const document = parseDocument(source, { lineCounter });

  if (document.errors.length > 0) {
    const [error] = document.errors;
    const position = error?.pos?.[0] ? lineCounter.linePos(error.pos[0]) : { line: 1, col: 1 };
    return [
      {
        filePath,
        configName: "<parse-error>",
        variable: "<yaml>",
        line: position.line,
        column: position.col,
        message: `Could not parse Compose YAML: ${error.message}`,
        suggestion: "Fix the YAML syntax before running this lint."
      }
    ];
  }

  const configs = document.get("configs", true);
  if (!isMap(configs)) {
    return [];
  }

  const findings: ComposeConfigEnvFinding[] = [];

  for (const configPair of configs.items) {
    const configName = isScalar(configPair.key) ? String(configPair.key.value) : "<unknown>";
    const configValue = configPair.value;
    if (!isMap(configValue)) {
      continue;
    }

    const contentPair = configValue.items.find((pair) => isScalar(pair.key) && pair.key.value === "content");
    const contentValue = contentPair?.value;
    if (!isScalar(contentValue) || typeof contentValue.value !== "string") {
      continue;
    }

    const contentSourceStart = contentValue.range?.[0] ?? 0;
    const content = contentValue.value;

    for (const match of content.matchAll(ENV_REFERENCE_PATTERN)) {
      const variable = match[0];
      const position = lineCounter.linePos(contentSourceStart + match.index);
      findings.push({
        filePath,
        configName,
        variable,
        line: position.line,
        column: position.col,
        message: `Compose will interpolate ${variable} inside configs.${configName}.content before the container starts.`,
        suggestion: `Use ${variable.replace(/^\$/, "$$$$")} when the generated file should keep the runtime environment reference.`
      });
    }
  }

  return findings;
}
