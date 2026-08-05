/**
 * Storage abstraction. Generated images and source uploads are written through
 * this interface so we can start on local disk and move to S3/R2 later without
 * touching the rest of the app. Assets are private and served only through an
 * authenticated route — never a public bucket URL.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
