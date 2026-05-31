import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { IMediaStorageProvider, UploadResult } from './storage.interface';

/**
 * Provider de stockage local (développement / Phase MVP).
 * Les fichiers sont écrits sur le disque dans le dossier MEDIA_LOCAL_DIR.
 * En production : swapper pour S3StorageProvider ou GCSStorageProvider.
 *
 * D-06 : MediaAsset centralise les métadonnées. Ce provider stocke uniquement les octets.
 */
@Injectable()
export class LocalStorageProvider implements IMediaStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.baseDir = process.env.MEDIA_LOCAL_DIR ?? join(process.cwd(), 'uploads');
    this.baseUrl = process.env.MEDIA_BASE_URL ?? 'http://localhost:3000/uploads';
  }

  async upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult> {
    const dirPath = join(this.baseDir, folder);

    // Créer le répertoire si inexistant
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const filePath = join(dirPath, fileName);
    await writeFile(filePath, buffer);

    const key = `${folder}/${fileName}`;
    this.logger.debug(`Fichier écrit : ${filePath}`);

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      size: buffer.length,
      mimeType,
    };
  }

  async getUrl(key: string, _ttlSeconds?: number): Promise<string> {
    // Local : URL statique. Pour S3, générer une signed URL ici.
    return `${this.baseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = join(this.baseDir, key);
    await unlink(fullPath).catch((err) => {
      this.logger.warn(`Impossible de supprimer ${key}: ${err.message}`);
    });
  }
}
