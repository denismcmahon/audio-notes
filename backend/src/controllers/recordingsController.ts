import { Request, Response } from 'express';
import path from 'path';
import { pool } from '../db/pool';

export async function postRecording(req: Request, res: Response) {
    const file = req.file;

    if(!file) {
        return res.status(400).json({ error: "Missing file field 'audio'"});
    }

    const mimeType = file.mimetype || 'application/octet-stream';

    // store a relative path so it works if project folder moves
    const audioPath = path
        .relative(process.cwd(), file.path)
        .replaceAll('\\', '/');

    const result = await pool.query(
        `
            INSERT INTO recordings (audio_path, mime_type, status)
            VALUES ($1, $2, 'uploaded')
            RETURNING id, created_at, audio_path, mime_type, status
        `,
        [audioPath, mimeType]
    );

    return res.status(201).json({ recording: result.rows[0] });
}