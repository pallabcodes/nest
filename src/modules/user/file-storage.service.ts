import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { FileValidationService } from './services/file-validation.service';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

/**
 * FileStorageService
 *
 * Handles file uploads with proper validation.
 * Delegates validation to FileValidationService.
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly validationService: FileValidationService,
  ) {
    this.uploadDir = path.join(
      process.cwd(),
      this.configService.get<string>('UPLOAD_DIR', 'uploads'),
    );
    this.ensureUploadDirectoryExists();
  }

  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.uploadDir, { recursive: true });
      await mkdir(path.join(this.uploadDir, 'avatars'), { recursive: true });
      await mkdir(path.join(this.uploadDir, 'files'), { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}${ext}`;
  }

  async saveFile(file: Express.Multer.File, subfolder: string = 'avatars'): Promise<string> {
    try {
      this.validationService.validateFileSize(file.size);

      const buffer = await readFile(file.path);
      await this.validationService.validateFileType(buffer, file.originalname);

      const fileName = this.generateFileName(file.originalname);
      const subfolderPath = path.join(this.uploadDir, subfolder);

      await mkdir(subfolderPath, { recursive: true });

      const filePath = path.join(subfolderPath, fileName);
      await writeFile(filePath, buffer);

      if (file.path && file.path !== filePath) {
        try {
          await unlink(file.path);
        } catch (error) {
          this.logger.warn(`Failed to delete temporary file: ${error.message}`);
        }
      }

      return path.join(subfolder, fileName).replace(/\\/g, '/');
    } catch (error) {
      if (file.path) {
        try {
          await unlink(file.path);
        } catch (unlinkError) {
          this.logger.warn(`Failed to delete temporary file: ${unlinkError.message}`);
        }
      }
      throw error;
    }
  }

  async saveFiles(files: Express.Multer.File[], subfolder: string = 'avatars'): Promise<string[]> {
    const savedPaths: string[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      try {
        const path = await this.saveFile(file, subfolder);
        savedPaths.push(path);
      } catch (error) {
        errors.push(error);
        this.logger.error(`Failed to save file ${file.originalname}: ${error.message}`);
      }
    }

    if (errors.length > 0 && savedPaths.length === 0) {
      throw new BadRequestException(
        `Failed to save files: ${errors.map((e) => e.message).join('; ')}`,
      );
    }

    if (errors.length > 0) {
      this.logger.warn(`Some files failed to save: ${errors.map((e) => e.message).join('; ')}`);
    }

    return savedPaths;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await unlink(fullPath);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  getFilePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, relativePath);
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
