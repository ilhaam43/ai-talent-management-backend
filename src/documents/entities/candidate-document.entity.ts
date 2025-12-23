export interface CandidateDocumentEntity {
  id: string;
  candidateId: string;
  documentTypeId: string;
  originalFilename: string | null;
  filePath: string;
  mimeType: string | null;
  fileSize: number | null;
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


