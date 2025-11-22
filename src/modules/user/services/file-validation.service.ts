import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fileType from 'file-type';

/**
 * File Validation Service
 *
 * Handles file type and size validation.
 * Separated from FileStorageService for better single responsibility.
 */
@Injectable()
export class FileValidationService {
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp'];

  /**
   * Validate file by checking actual MIME type (not just extension)
   */
  async validateFileType(buffer: Buffer, originalName: string): Promise<void> {
    const ext = path.extname(originalName).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${this.allowedExtensions.join(', ')}`,
      );
    }

    const fileTypeResult = await fileType.fromBuffer(buffer);

    if (!fileTypeResult) {
      throw new BadRequestException('Unable to determine file type. File may be corrupted.');
    }

    if (!this.allowedMimeTypes.includes(fileTypeResult.mime)) {
      throw new BadRequestException(
        `Invalid file type. Detected: ${fileTypeResult.mime}. Allowed: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    const expectedExt = this.getExtensionFromMimeType(fileTypeResult.mime);
    if (ext !== expectedExt) {
      throw new BadRequestException(
        `File extension (${ext}) does not match actual file type (${fileTypeResult.mime}). File may have been renamed.`,
      );
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number): void {
    if (size > this.maxFileSize) {
      throw new BadRequestException(
        `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${this.maxFileSize / 1024 / 1024}MB)`,
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
}
