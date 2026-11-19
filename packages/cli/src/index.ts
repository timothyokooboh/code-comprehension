#!/usr/bin/env node
import { Command } from 'commander';
import { launch } from './launch.js';
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
  .option('--port <number>', messages.portOption, parsePort, automaticPort)
  .option('--quiz <path>', messages.quizOption)
  .option('--no-open', messages.noOpenOption)
  .action(launch)
  .parseAsync()
  .catch(reportFailure);
