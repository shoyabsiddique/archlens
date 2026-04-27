#!/usr/bin/env node
import { Command } from "commander";

import pkg from "../../package.json" with { type: "json" };
import { createCaptureCommand } from "./commands/capture.js";
import { createCheckCommand } from "./commands/check.js";
import { createImportCommand } from "./commands/import.js";
import { createInitCommand } from "./commands/init.js";
import { createLogCommand } from "./commands/log.js";
import { createResolveCommand } from "./commands/resolve.js";
import { createServeCommand } from "./commands/serve.js";
import { createShowCommand } from "./commands/show.js";

const program = new Command();

program
  .name("archlens")
  .description("Architectural decision intelligence for AI-assisted development")
  .version(pkg.version);

program.addCommand(createInitCommand());
program.addCommand(createCaptureCommand());
program.addCommand(createCheckCommand());
program.addCommand(createImportCommand());
program.addCommand(createLogCommand());
program.addCommand(createResolveCommand());
program.addCommand(createServeCommand());
program.addCommand(createShowCommand());

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
