import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { randomUUID } from 'crypto';

const uploadDir = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname) || '';
            cb(null, `${randomUUID()}${ext}`);
        }
    }),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB for now
    }
});