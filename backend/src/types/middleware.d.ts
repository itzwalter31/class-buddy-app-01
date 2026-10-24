declare module 'morgan' {
  import type { Request, Response, NextFunction } from 'express';
  type MorganFormat = string;
  type MorganMiddleware = (req: Request, res: Response, next: NextFunction) => void;
  const morgan: (format?: MorganFormat, options?: unknown) => MorganMiddleware;
  export default morgan;
}

declare module 'multer' {
  import type { Request, Response, NextFunction } from 'express';

  export interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  export type DestinationCallback = (error: Error | null, destination: string) => void;
  export type FileNameCallback = (error: Error | null, filename: string) => void;
  export type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;
  export type MulterHandler = (req: Request, res: Response, next: NextFunction) => void;

  export interface DiskStorageOptions {
    destination?: string | ((req: Request, file: MulterFile, cb: DestinationCallback) => void);
    filename?: (req: Request, file: MulterFile, cb: FileNameCallback) => void;
  }

  export interface FileFilterOptions {
    fileFilter?: (req: Request, file: MulterFile, cb: FileFilterCallback) => void;
  }

  export interface Limits {
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  }

  export interface MulterInstance {
    array(fieldname: string, maxCount?: number): MulterHandler;
    single(fieldname: string): MulterHandler;
  }

  interface MulterStatic {
    (options?: FileFilterOptions & { storage?: unknown; limits?: Limits }): MulterInstance;
    diskStorage(options: DiskStorageOptions): unknown;
  }

  const multer: MulterStatic;
  export default multer;
}
