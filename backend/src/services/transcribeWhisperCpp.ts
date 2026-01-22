import path from 'path';
import fs from 'fs';
import { runCmd } from './runCmd';

function mustGetEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

export async function transcribeWhisperCpp(wavPath: string, recordingId: string): Promise<string> {
    const whisperBin = mustGetEnv('WHISPER_BIN_PATH');
    const modelPath = mustGetEnv('WHISPER_MODEL_PATH');

    const transcriptsDir = path.resolve(process.cwd(), 'transcripts');
    if (!fs.existsSync(transcriptsDir)) {
        fs.mkdirSync(transcriptsDir, { recursive: true });
    }

    const outBase = path.join(transcriptsDir, recordingId);

    // produces `${outBase}.txt` when using -otxt
    await runCmd(whisperBin, [
        '-m',
        modelPath,
        '-f',
        wavPath,
        '-otxt',
        '-of',
        outBase
    ]);

    const outTxt = `${outBase}.txt`;
    if (!fs.existsSync(outTxt)) {
        throw new Error(`Expected transcript output not found: ${outTxt}`);
    }

    const transcript = fs.readFileSync(outTxt, 'utf-8').trim();
    return transcript;
}