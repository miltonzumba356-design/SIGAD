import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Garantir que a pasta de uploads existe
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/webp',
    'text/plain'
  ]);
  const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp']);
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas PDF, Word e Imagens são permitidos.'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
