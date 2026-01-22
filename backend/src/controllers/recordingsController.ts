import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { pool } from '../db/pool';
import { convertToWav } from '../services/convertToWav';
import { transcribeWhisperCpp } from '../services/transcribeWhisperCpp';

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

    // insert initial row as transcribing
    const inserted = await pool.query(
        `
            INSERT INTO recordings (audio_path, mime_type, status)
            VALUES ($1, $2, 'transcribing')
            RETURNING id, created_at, audio_path, mime_type, status
        `,
        [audioPath, mimeType]
    );

    const recording = inserted.rows[0] as {
        id: string;
        created_at: string;
        audio_path: string;
        mime_type: string;
        status: string;
    };

    try {
        // convert to wav
        const absAudioPath = path.resolve(process.cwd(), audioPath);
        const wavPath = await convertToWav(absAudioPath);

        // run whisper.cpp
        const transcript = await transcribeWhisperCpp(wavPath, recording.id);

        // optional: cleanup wav to save space
        try {
            if(fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        } catch (err) {
            // ignore clean up errors
        }

        // update db row with transcript
        const updated = await pool.query(
            `
                UPDATE recordings
                SET transcript = $1, status = 'complete', error = NULL
                WHERE id = $2
                RETURNING id,  created_at, audio_path, mime_type, transcript, status
            `,
            [transcript, recording.id]
        );

        return res.status(201).json({ recording: updated.rows[0] });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown transcription error';

        await pool.query(
            `
                UPDATE recordings
                SET status = 'failed', error = $1
                WHERE id = $2
            `,
            [msg, recording.id]
        );

        // return id so you can inspect the DB row even on failure
        return res.status(500).json({
            error: 'Transciption failed',
            recordingId: recording.id,
            details: msg
        });
    }

}