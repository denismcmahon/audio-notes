import path from 'path';
import fs from 'fs';
import { runCmd } from './runCmd';

const ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';

export async function convertToWav(inputFilePath: string): Promise<string> {
    const dir = path.dirname(inputFilePath);
    const base = path.basename(inputFilePath, path.extname(inputFilePath));
    const wavPath = path.join(dir, `${base}.wav`);

    // if it already exists (e.g. retry), overwrite
    if (fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
    }

    // 16kHz mono PCM WAV is a safe baseline for speech models
    await runCmd(ffmpegBin, [
        '-y',
        '-i',
        inputFilePath,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        wavPath
    ]);

    return wavPath;
}