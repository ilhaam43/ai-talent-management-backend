import { memoryStorage, Options } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as fs from 'fs';

// Document type to subdirectory mapping (based on documentType names in DB)
const DOCUMENT_TYPE_FOLDERS: Record<string, string> = {
  // CV variants
  'cv/resume': 'cv',
  'cv': 'cv',
  'resume': 'cv',
  // ID Card / KTP variants — DB stores as "ID Card"
  'id card': 'ktp',
  'ktp': 'ktp',
  // Ijazah / Diploma variants
  'ijazah': 'ijazah',
  'diploma': 'ijazah',
  // Transcript variants — DB stores as "Academic Transcript"
  'transcript': 'transcript',
  'academic transcript': 'transcript',
  // Certificate variants
  'certificate': 'certificate',
  'certification': 'certificate',
  // Portfolio
  'portfolio': 'portfolio',
  // Additional / Supporting docs — DB stores as "Supporting Document" or "Additional"
  'additional': 'additional',
  'supporting document': 'additional',
  'cover letter': 'additional',
  'reference letter': 'additional',
  'work sample': 'additional',
  // Fallback
  'other': 'other',
};

// File type configurations per document type folder
const FOLDER_ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'cv': ['.pdf', '.docx', '.doc'],
  'ijazah': ['.pdf'],
  'ktp': ['.pdf', '.jpg', '.jpeg', '.png'],
  'transcript': ['.pdf'],
  'certificate': ['.pdf', '.jpg', '.jpeg', '.png'],
  'portfolio': ['.pdf', '.jpg', '.jpeg', '.png'],
  'additional': ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  'other': ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
};

const FOLDER_ALLOWED_MIMES: Record<string, string[]> = {
  'cv': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  'ijazah': ['application/pdf'],
  'ktp': ['application/pdf', 'image/jpeg', 'image/png'],
  'transcript': ['application/pdf'],
  'certificate': ['application/pdf', 'image/jpeg', 'image/png'],
  'portfolio': ['application/pdf', 'image/jpeg', 'image/png'],
  'additional': [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ],
  'other': [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ],
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Get folder name from document type (case-insensitive match)
export function getFolderFromDocumentType(documentType: string): string {
  const normalized = documentType.toLowerCase().trim();
  return DOCUMENT_TYPE_FOLDERS[normalized] || 'other';
}

export const multerConfig: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    const documentTypeName = (req as any).documentTypeName || 'other';
    const folder = getFolderFromDocumentType(documentTypeName);

    const allowedExtensions = FOLDER_ALLOWED_EXTENSIONS[folder] || FOLDER_ALLOWED_EXTENSIONS['other'];
    const allowedMimes = FOLDER_ALLOWED_MIMES[folder] || FOLDER_ALLOWED_MIMES['other'];

    // Check extension
    if (!allowedExtensions.includes(ext)) {
      return callback(
        new BadRequestException(
          `Invalid file type for ${folder}. Allowed: ${allowedExtensions.join(', ')}`,
        ),
        false,
      );
    }

    // Check MIME type
    if (!allowedMimes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Invalid MIME type for ${folder}. Allowed types: ${allowedMimes.join(', ')}`,
        ),
        false,
      );
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};
