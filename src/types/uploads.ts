export interface UploadedFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  /**
   * When using disk storage, files are usually written to a temporary path.
   * When using memory storage, `buffer` is typically populated instead.
   */
  path?: string;
  buffer?: Buffer;
  /**
   * Allow additional adapter specific properties without losing type safety
   * for the common fields we actually use.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

