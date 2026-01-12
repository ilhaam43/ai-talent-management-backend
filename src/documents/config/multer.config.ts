import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Allowed file types for CV upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/documents',
    filename: (req, file, callback) => {
      const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueFilename);
    },
  }),
  fileFilter: (req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    
    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return callback(
        new BadRequestException(
          `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`,
        ),
        false,
      );
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid MIME type. Only PDF and DOCX files are allowed.',
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


