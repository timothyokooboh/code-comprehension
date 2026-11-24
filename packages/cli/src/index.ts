#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands.js';
import { automaticPort, parsePort, parseQuestionCount, parseQuestionFormat } from './options.js';
import { formatHelp, reportFailure } from './command-output.js';
import { messages } from './locales/en.js';

await new Command()
  .name('code-comprehension')
  .description(messages.description)
  .configureHelp({ formatHelp })
  .configureOutput({ writeErr: () => {} })
  .exitOverride()
  .helpOption('-h, --help', messages.help)
  .option('--wait-review <session>', messages.review.wait)
  .option('--review-feedback <path>', messages.review.feedback)
  .option('--review-session <session>', messages.review.sessionOption)
  .option('--active-assessment <url>', messages.assessment.active)
  .option('--revise-assessment <path>', messages.assessment.revise)
  .option('--runtime <url>', messages.assessment.runtime)
  .option('--retain-product <path>', messages.product.retain)
  .option('--check-product <id>', messages.product.check)
  .option('--refresh', messages.product.refresh)
  .option('--validate-product <path>', messages.product.validate)
  .option('--save-product <path>', messages.product.save)
  .option('--format <format>', messages.questionFormat, parseQuestionFormat)
  .option('--written-questions <count>', messages.writtenCount, parseQuestionCount)
  .option('--questions <count>', messages.product.questions, parseQuestionCount)
  .option('--product-bank <ids...>', messages.product.start)
  .option('--product-status', messages.product.status)
  .option('--configure-product <tracking>', messages.product.configure)
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
