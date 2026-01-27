import { diskStorage, Options } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as fs from 'fs';

// Document type to subdirectory mapping (based on documentType names in DB)
const DOCUMENT_TYPE_FOLDERS: Record<string, string> = {
  'cv/resume': 'cv',
  'cv': 'cv',
  'resume': 'cv',
  'ijazah': 'ijazah',
  'diploma': 'ijazah',
  'ktp': 'ktp',
  'transcript': 'transcript',
  'academic transcript': 'transcript',
  'portfolio': 'other',
  'additional': 'other',
  'other': 'other',
};

// File type configurations per document type folder
const FOLDER_ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'cv': ['.pdf', '.docx', '.doc'],
  'ijazah': ['.pdf'],
  'ktp': ['.pdf', '.jpg', '.jpeg', '.png'],
  'transcript': ['.pdf'],
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
  storage: diskStorage({
    destination: (req, file, callback) => {
      // Get document type from body (set by frontend or lookup in controller)
      const documentTypeName = (req as any).documentTypeName || 'other';
      const folder = getFolderFromDocumentType(documentTypeName);
      const destPath = `./uploads/documents/${folder}`;

      // Create directory if not exists
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      callback(null, destPath);
    },
    filename: (req, file, callback) => {
      const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueFilename);
    },
  }),
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
