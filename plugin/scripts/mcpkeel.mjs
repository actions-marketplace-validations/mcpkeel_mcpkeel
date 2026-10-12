// Runs the mcpkeel the plugin pins, with the arguments given, in the project.
import { spawnSync } from "node:child_process";
import { mcpkeelCommand, projectDir } from "./lib.mjs";

const project = projectDir();
const [command, base] = mcpkeelCommand(project);
const child = spawnSync(command, [...base, ...process.argv.slice(2)], { cwd: project, stdio: "inherit", env: { ...process.env, NO_COLOR: "1" } });
process.exit(child.status ?? 2);
