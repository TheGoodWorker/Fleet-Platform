// Interface d'abstraction stockage fichiers — D-06
// Permet de swapper LocalStorage → S3 → GCS sans toucher au service métier.

export interface UploadResult {
  key: string;      // Clé unique dans le store (path relatif ou S3 key)
  url: string;      // URL directe (locale) ou signée (cloud) — courte durée pour cloud
  size: number;     // Taille en octets
  mimeType: string;
}

export interface IMediaStorageProvider {
  /**
   * Upload d'un fichier dans le store.
   * @param buffer   Contenu du fichier
   * @param fileName Nom de fichier normalisé (uuid + extension)
   * @param mimeType MIME type du fichier
   * @param folder   Chemin relatif de rangement (ex: 'vehicles/{id}/photos')
   */
  upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult>;

  /**
   * Génère une URL d'accès au fichier.
   * Pour LocalStorage : URL statique.
   * Pour S3/GCS : URL signée avec TTL court (15 min par défaut).
   */
  getUrl(key: string, ttlSeconds?: number): Promise<string>;

  /** Supprime un fichier du store. Silencieux si non trouvé. */
  delete(key: string): Promise<void>;
}

/** Token d'injection pour le provider de stockage */
export const STORAGE_PROVIDER = Symbol('MEDIA_STORAGE_PROVIDER');
