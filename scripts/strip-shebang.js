import fs from "node:fs";

const target = process.argv[2];
const SHEBANG = "#!/usr/bin/env node";

if (!target) {
  console.error("strip-shebang: missing target file path");
  process.exitCode = 1;
  process.exit();
}

const contents = fs.readFileSync(target, "utf8");
const nextLineIndex = contents.startsWith("#!") ? contents.indexOf("\n") : -1;
const body = nextLineIndex === -1 ? contents : contents.slice(nextLineIndex + 1);

fs.writeFileSync(target, `${SHEBANG}\n${body}`);
fs.chmodSync(target, 0o755);
