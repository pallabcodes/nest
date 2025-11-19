import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileType = require('file-type');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

/**
 * FileStorageService
 * 
 * Handles file uploads with proper validation:
 * - Validates actual file type (MIME type) not just extension
 * - Enforces file size limits
 * - Stores files in organized directory structure
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  private readonly allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp'];

  constructor(private readonly configService: ConfigService) {
    // Use environment variable or default to 'uploads' directory
    this.uploadDir = path.join(process.cwd(), this.configService.get<string>('UPLOAD_DIR', 'uploads'));
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

  /**
   * Validate file by checking actual MIME type (not just extension)
   * This prevents users from renaming PDFs to .png and uploading them
   */
  private async validateFileType(buffer: Buffer, originalName: string): Promise<void> {
    // Check file extension
    const ext = path.extname(originalName).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${this.allowedExtensions.join(', ')}`
      );
    }

    // Check actual file type using file-type library
    const fileTypeResult = await fileType.fromBuffer(buffer);
    
    if (!fileTypeResult) {
      throw new BadRequestException('Unable to determine file type. File may be corrupted.');
    }

    // Validate MIME type matches allowed types
    if (!this.allowedMimeTypes.includes(fileTypeResult.mime)) {
      throw new BadRequestException(
        `Invalid file type. Detected: ${fileTypeResult.mime}. Allowed: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    // Ensure extension matches detected MIME type
    const expectedExt = this.getExtensionFromMimeType(fileTypeResult.mime);
    if (ext !== expectedExt) {
      throw new BadRequestException(
        `File extension (${ext}) does not match actual file type (${fileTypeResult.mime}). File may have been renamed.`
      );
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return mimeToExt[mimeType] || '';
  }

  /**
   * Validate file size
   */
  private validateFileSize(size: number): void {
    if (size > this.maxFileSize) {
      throw new BadRequestException(
        `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${this.maxFileSize / 1024 / 1024}MB)`
      );
    }
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Save single file
   */
  async saveFile(file: Express.Multer.File, subfolder: string = 'avatars'): Promise<string> {
    try {
      // Validate file size
      this.validateFileSize(file.size);

      // Read file buffer
      const buffer = await readFile(file.path);

      // Validate actual file type (not just extension)
      await this.validateFileType(buffer, file.originalname);

      // Generate unique filename
      const fileName = this.generateFileName(file.originalname);
      const subfolderPath = path.join(this.uploadDir, subfolder);
      
      // Ensure subfolder exists
      await mkdir(subfolderPath, { recursive: true });

      // Save file
      const filePath = path.join(subfolderPath, fileName);
      await writeFile(filePath, buffer);

      // Delete temporary file if it exists
      if (file.path && file.path !== filePath) {
        try {
          await unlink(file.path);
        } catch (error) {
          this.logger.warn(`Failed to delete temporary file: ${error.message}`);
        }
      }

      // Return relative path for storage in database
      return path.join(subfolder, fileName).replace(/\\/g, '/');
    } catch (error) {
      // Clean up temporary file on error
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

  /**
   * Save multiple files
   */
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
        `Failed to save files: ${errors.map(e => e.message).join('; ')}`
      );
    }

    if (errors.length > 0) {
      this.logger.warn(`Some files failed to save: ${errors.map(e => e.message).join('; ')}`);
    }

    return savedPaths;
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await unlink(fullPath);
    } catch (error) {
      // File might not exist, log but don't throw
      this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Get file path for serving
   */
  getFilePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * Check if file exists
   */
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

