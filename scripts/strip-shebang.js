import fs from "node:fs";

const target = process.argv[2];

if (!target) {
  console.error("strip-shebang: missing target file path");
  process.exitCode = 1;
  process.exit();
}

const contents = fs.readFileSync(target, "utf8");
if (contents.startsWith("#!")) {
  const nextLineIndex = contents.indexOf("\n");
  const stripped = nextLineIndex === -1 ? "" : contents.slice(nextLineIndex + 1);
  fs.writeFileSync(target, stripped);
}
