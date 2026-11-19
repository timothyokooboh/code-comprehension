import { join } from 'node:path';
import { CliError, cliErrorCodes } from '../errors.js';
import { ensureProductDirectory, productPaths, projectRoot, readOptional, writeAtomic } from './project.js';
import { inspectTracking, reconcileIgnore } from './ignore.js';
import { configSchema, productStatuses, type ProductConfig } from './contract.js';

export async function readConfig(root: string): Promise<ProductConfig | undefined> {
  const content = await readOptional(join(root, productPaths.config));
  if (content === undefined) return undefined;
  try { return configSchema.parse(JSON.parse(content)); }
  catch (cause) { throw new CliError(cliErrorCodes.productConfigInvalid, { cause }); }
}

export async function reconcileProductSetup(repo: string) {
  const root = await projectRoot(repo);
  const config = await readConfig(root);
  if (config) await reconcileIgnore(root, config);
  return { status: config ? productStatuses.ready : productStatuses.setupRequired, root, config, conflicts: config ? await inspectTracking(root, config) : [] };
}

export async function configureProduct(repo: string, tracking: string) {
  const parsed = configSchema.safeParse({ version: 1, bankTracking: tracking });
  if (!parsed.success) throw new CliError(cliErrorCodes.productConfigInvalid);
  const root = await projectRoot(repo);
  try {
    await ensureProductDirectory(root);
    await writeAtomic(join(root, productPaths.config), `${JSON.stringify(parsed.data, null, 2)}\n`);
  } catch (cause) { throw new CliError(cliErrorCodes.productStorageFailed, { cause }); }
  return reconcileProductSetup(root);
}
