import { Router } from 'express';
import { upload } from '../services/uploadStorage';
import { postRecording } from '../controllers/recordingsController';

const router = Router();

// field name must be "audio"
router.post('/', upload.single('audio'), postRecording);

export default router;