import { mkdtemp, writeFile, realpath, lstat, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { readExplainerJson, ExplainerValidationError } from '../load.js';
import { CliError, cliErrorCodes } from '../../errors.js';
import { projectRoot } from '../../product/project.js';
import {
  captureProductExplainerEvidence,
  productExplainerScope,
} from './evidence.js';
import {
  productExplainerFiles as files,
  productExplainerManifestSchema,
  productExplainerPlanSchema,
  productExplainerStatuses,
} from './contract.js';

export async function prepareProductExplainer(repo: string, inputPath: string) {
  const parsed = productExplainerPlanSchema.safeParse(
    await readExplainerJson(inputPath),
  );
  if (!parsed.success) throw new ExplainerValidationError(parsed.error.issues);
  const root = await projectRoot(repo);
  const { sources, ...revision } = await captureProductExplainerEvidence(
    root,
    parsed.data,
  );
  const snapshot = { ...revision, capturedAt: new Date().toISOString() };
  const manifest = {
    version: 1,
    repo: root,
    plan: parsed.data,
    snapshot,
    sources,
  };
  const content = JSON.stringify(manifest);
  if (Buffer.byteLength(content) > files.maximumManifestBytes)
    throw new CliError(cliErrorCodes.productExplainerStorageFailed);
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(await realpath(tmpdir()), files.prefix));
    await writeFile(join(directory, files.manifest), content, { mode: 0o600 });
    return {
      status: productExplainerStatuses.prepared,
      directory,
      explainerPath: join(directory, files.content),
      scope: productExplainerScope(parsed.data),
      snapshot,
      sources,
    };
  } catch (cause) {
    if (directory) {
      try {
        await rm(directory, { recursive: true, force: true });
      } catch (cleanupCause) {
        throw new CliError(cliErrorCodes.productExplainerStorageFailed, {
          cause: new AggregateError([cause, cleanupCause]),
        });
      }
    }
    throw new CliError(cliErrorCodes.productExplainerStorageFailed, { cause });
  }
}
export async function readProductExplainerSession(path: string) {
  try {
    const directory = resolve(path);
    if (
      !(await lstat(directory)).isDirectory() ||
      dirname(directory) !== (await realpath(tmpdir())) ||
      !basename(directory).startsWith(files.prefix)
    )
      throw new CliError(cliErrorCodes.productExplainerSessionInvalid);
    const manifest = productExplainerManifestSchema.parse(
      await readExplainerJson(join(directory, files.manifest)),
    );
    return {
      directory,
      manifest,
      explainerPath: join(directory, files.content),
    };
  } catch (cause) {
    throw new CliError(cliErrorCodes.productExplainerSessionInvalid, { cause });
  }
}
export async function discardProductExplainer(path: string) {
  const { directory } = await readProductExplainerSession(path);
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (cause) {
    throw new CliError(cliErrorCodes.productExplainerCleanupFailed, { cause });
  }
}
