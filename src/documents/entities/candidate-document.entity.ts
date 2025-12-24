export interface CandidateDocumentEntity {
  id: string;
  candidateId: string;
  documentTypeId: string;
  filePath: string;
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


