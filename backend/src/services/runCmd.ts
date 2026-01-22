import { spawn } from 'child_process';

export function runCmd(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

        let stderr = '';
        child.stderr.on('data', (d) => (stderr += d.toString()));

        child.on('error', (err) => reject(err));

        child.on('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`${command} exited with code ${code}. ${stderr}`.trim()));
        });
    });
}