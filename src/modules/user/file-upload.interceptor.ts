import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multer from 'multer';
import { ConfigService } from '@nestjs/config';

/**
 * FileUploadInterceptor
 * 
 * Configures multer for file uploads with size and type validation
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Multer configuration
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, '/tmp'); // Temporary storage, will be moved by FileStorageService
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
      },
    });

    const upload = (multer as any)({
      storage,
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        // Basic MIME type check (will be validated more thoroughly in FileStorageService)
        if (this.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${this.allowedMimeTypes.join(', ')}`
            ),
            false
          );
        }
      },
    });

    // Apply multer middleware
    return new Observable((observer) => {
      upload.single('file')(request, null, (err) => {
        if (err) {
          observer.error(err);
          return;
        }
        next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (error) => observer.error(error),
          complete: () => observer.complete(),
        });
      });
    });
  }
}

