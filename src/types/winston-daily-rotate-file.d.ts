/**
 * Type declarations for winston-daily-rotate-file
 *
 * Allows using standard ES6 import syntax instead of require()
 */

import * as winston from 'winston';

declare module 'winston-daily-rotate-file' {
  interface DailyRotateFileTransportOptions {
    filename?: string;
    datePattern?: string;
    zippedArchive?: boolean;
    maxSize?: string;
    maxFiles?: string;
    level?: string;
    format?: winston.Logform.Format;
    auditFile?: string;
    utc?: boolean;
    extension?: string;
    createSymlink?: boolean;
    symlinkName?: string;
  }

  class DailyRotateFile extends winston.transports.File {
    constructor(options?: DailyRotateFileTransportOptions);
  }

  export = DailyRotateFile;
}
