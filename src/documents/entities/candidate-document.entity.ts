export interface CandidateDocumentEntity {
  id: string;
  candidateId: string;
  documentTypeId: string;
  filePath: string;
  objectKey?: string | null;
  bucket?: string | null;
  storageType: 'LOCAL' | 'MINIO';
  mimeType?: string | null;
  sizeBytes?: number | null;
  originalName?: string | null;
  uploadStatus: 'PENDING' | 'CONFIRMED';
  extractedText?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTypeEntity {
  id: string;
  documentType: string;
  createdAt: Date;
  updatedAt: Date;
}


