/**
 * @neo-hexo/fs — File System Operations
 *
 * Thin wrapper over Node.js fs/promises. No graceful-fs needed in modern Node.
 * All paths are normalized to forward slashes for cross-platform consistency.
 */

import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

// ─── Path Normalization ──────────────────────────────────────────────────────

/** Normalize path separators to forward slashes (cross-platform). */
export function normalizePath(p: string): string {
  return p.split(nodePath.sep).join('/');
}

/** Resolve and normalize a path. */
export function resolvePath(...segments: string[]): string {
  return normalizePath(nodePath.resolve(...segments));
}

/** Join and normalize path segments. */
export function joinPath(...segments: string[]): string {
  return normalizePath(nodePath.join(...segments));
}

// ─── File Operations ─────────────────────────────────────────────────────────

/** Read a file as a UTF-8 string. */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/** Read a file as a Buffer. */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

/** Write a string to a file, creating parent directories if needed. */
export async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  await ensureDir(nodePath.dirname(filePath));
  await fs.writeFile(filePath, content, typeof content === 'string' ? 'utf-8' : undefined);
}

/** Copy a file, creating parent directories for the destination if needed. */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(nodePath.dirname(dest));
  await fs.copyFile(src, dest);
}

/** Delete a file. Does not throw if the file doesn't exist. */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

// ─── Directory Operations ────────────────────────────────────────────────────

/** Create a directory and all parent directories. */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Remove a directory and all its contents. Does not throw if it doesn't exist. */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/** Copy a directory recursively. */
export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.cp(src, dest, { recursive: true });
}

/**
 * List files in a directory (non-recursive).
 * Returns paths relative to the directory, normalized to forward slashes.
 */
export async function listDir(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

/**
 * List all files recursively under a directory.
 * Returns paths relative to the root directory, normalized to forward slashes.
 */
export async function listDirRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(nodePath.join(current, entry.name), rel);
      } else if (entry.isFile()) {
        results.push(rel);
      }
    }
  }

  await walk(dirPath, '');
  return results;
}

// ─── File Info ───────────────────────────────────────────────────────────────

/** Get file stats. Returns null if the file doesn't exist. */
export async function stat(filePath: string): Promise<fs.FileHandle extends never ? never : import('node:fs').Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Check if a path exists. */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Check if a path is a directory. */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const s = await fs.stat(filePath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a file using streaming (memory-efficient for large files).
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hasher = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hasher.update(chunk));
    stream.on('end', () => resolve(hasher.digest('hex')));
    stream.on('error', reject);
  });
}

/** Compute SHA-256 hash of a string or buffer. */
export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
