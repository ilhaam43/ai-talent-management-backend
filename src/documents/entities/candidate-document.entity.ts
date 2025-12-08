export interface CandidateDocumentEntity {
  id: string;
  candidateId: string;
  documentTypeId: string;
  originalFilename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
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


