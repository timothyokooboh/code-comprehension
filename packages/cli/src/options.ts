import { InvalidArgumentError } from 'commander';
import { messages } from './locales/en.js';

export const automaticPort = 0;
export const maximumPort = 65_535;

export function parsePort(value: string) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < automaticPort || port > maximumPort) {
    throw new InvalidArgumentError(messages.invalidPort(maximumPort));
  }
  return port;
}
