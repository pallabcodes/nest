import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * General application exceptions
 */
export class ValidationException extends BadRequestException {
  constructor(errors: Array<{ field: string; message: string; value?: any }>) {
    super({
      message: 'Validation failed',
      errorCode: 'VALIDATION_FAILED',
      errors,
    });
  }
}

export class DatabaseException extends InternalServerErrorException {
  constructor(operation: string, details?: any) {
    super({
      message: 'Database operation failed',
      errorCode: 'DATABASE_ERROR',
      details: { operation, ...details },
    });
  }
}

export class ExternalServiceException extends ServiceUnavailableException {
  constructor(serviceName: string, details?: any) {
    super({
      message: `External service ${serviceName} is unavailable`,
      errorCode: 'EXTERNAL_SERVICE_ERROR',
      details: { serviceName, ...details },
    });
  }
}

export class FileUploadException extends BadRequestException {
  constructor(reason: string, details?: any) {
    super({
      message: 'File upload failed',
      errorCode: 'FILE_UPLOAD_ERROR',
      details: { reason, ...details },
    });
  }
}

export class ConfigurationException extends InternalServerErrorException {
  constructor(configKey: string) {
    super({
      message: 'Application configuration error',
      errorCode: 'CONFIGURATION_ERROR',
      details: { configKey },
    });
  }
}
