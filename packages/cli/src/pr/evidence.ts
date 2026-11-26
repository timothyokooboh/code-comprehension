import { readSession } from './session.js';
import { captureComparison } from './comparison.js';
import { CliError, cliErrorCodes } from '../errors.js';

export async function readCurrentPrEvidence(directory: string) {
  const session = await readSession(directory);
  const { manifest } = session;
  const snapshot = await captureComparison(
    manifest.repo,
    manifest.comparison.target,
    manifest.baselineOverride,
  );
  if (snapshot.fingerprint !== manifest.fingerprint)
    throw new CliError(cliErrorCodes.prChanged);
  return session;
}
