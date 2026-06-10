import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as fs from 'fs';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Creates a strict document-only multer configuration.
 * 
 * @param uploadDir The target directory under ./uploads/ (e.g., 'cv', 'talent-pool', 'assessment-results')
 * @returns MulterOptions configured for strict document validation
 */
export function getMulterPdfConfig(uploadDir: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: (req, file, callback) => {
        const destPath = `./uploads/${uploadDir}`;
        
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
      
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return callback(
          new BadRequestException(
            `Invalid file extension. Only PDF, DOC, and DOCX files are allowed.`
          ),
          false,
        );
      }

      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Invalid MIME type. Only application/pdf, application/msword, and application/vnd.openxmlformats-officedocument.wordprocessingml.document are allowed.`
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
}
