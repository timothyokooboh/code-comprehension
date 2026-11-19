#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands.js';
import { automaticPort, parsePort } from './options.js';
import { formatHelp, reportFailure } from './command-output.js';
import { messages } from './locales/en.js';

await new Command()
  .name('code-comprehension')
  .description(messages.description)
  .configureHelp({ formatHelp })
  .configureOutput({ writeErr: () => {} })
  .exitOverride()
  .helpOption('-h, --help', messages.help)
  .option('--prepare-pr', messages.pr.prepare)
  .option('--target <ref>', messages.pr.target)
  .option('--baseline <ref>', messages.pr.baseline)
  .option('--repo <path>', messages.pr.repo)
  .option('--validate-pr <directory>', messages.pr.validate)
  .option('--pr-session <directory>', messages.pr.start)
  .option('--discard-pr <directory>', messages.pr.discard)
  .option('--port <number>', messages.portOption, parsePort, automaticPort)
  .option('--quiz <path>', messages.quizOption)
  .option('--no-open', messages.noOpenOption)
  .action(runCommand)
  .parseAsync()
  .catch(reportFailure);
