import express from 'express';
import cors from 'cors';
import { pool } from './db/pool';
import recordingRoutes from './routes/recordingsRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.get('/health/db', async (_req, res) => {
    try {
        const result = await pool.query('SELECT 1 as ok');
        res.json({ ok: true, db: result.rows[0].ok })
    } catch (err) {
        res.status(500).json({
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown DB error'
        });
    }
});

app.use('/recordings', recordingRoutes);

export default app;