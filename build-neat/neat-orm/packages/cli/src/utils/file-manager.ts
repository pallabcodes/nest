/**
 * File Manager
 *
 * Handles file operations for CLI commands.
 *
 * @module cli/utils/file-manager
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * File Manager
 *
 * Provides file system utilities for CLI operations.
 */
export class FileManager {
  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Check if file exists
   */
  async fileExists(filepath: string): Promise<boolean> {
    return fs.pathExists(filepath);
  }

  /**
   * Read file content
   */
  async readFile(filepath: string): Promise<string> {
    return fs.readFile(filepath, 'utf-8');
  }

  /**
   * Write file content
   */
  async writeFile(filepath: string, content: string): Promise<void> {
    await fs.writeFile(filepath, content);
  }

  /**
   * Create backup of file
   */
  async backupFile(filepath: string): Promise<string> {
    const backupPath = `${filepath}.backup.${Date.now()}`;
    await fs.copy(filepath, backupPath);
    return backupPath;
  }

  /**
   * Get relative path
   */
  getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }
}
