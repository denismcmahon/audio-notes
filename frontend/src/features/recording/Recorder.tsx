import { useEffect, useRef, useState } from 'react';

type RecordingResponse = {
  recording: {
    id: string;
    created_at: string;
    audio_path: string;
    mime_type: string;
    transcript?: string | null;
    status: string;
    error?: string | null;
  };
};

type Status = 'idle' | 'recording' | 'ready' | 'uploading' | 'done' | 'error';

export default function Recorder() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<string>('');
  const [recordingId, setRecordingId] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // cleanup object URL + mic stream on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
    setTranscript('');
    setRecordingId('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError('Your browser does not support audio recording (getUserMedia).');
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === 'audioinput');
      if (!hasMic) {
        setStatus('error');
        setError('No microphone device found. Plug in/enable a mic and try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // try to requrst a common mimeType; browser may ignore if unsupported
      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];

      const mimeType = preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        setStatus('ready');
      };

      recorder.start();
      setStatus('recording');
    } catch (e) {
      setStatus('error');

      if (e instanceof DOMException) {
        setError(`${e.name}: ${e.message}`);
        return;
      }

      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function stopRecording() {
    setError(null);
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === 'recording') {
      recorder.stop();
    }

    // stop mic stream so the browser mic indicator turns off
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }

  async function transcribe() {
    if (!audioBlob) return;

    setError(null);
    setStatus('uploading');
    setTranscript('');
    setRecordingId('');

    try {
      // turn blob into a file so it has a name + type
      const ext = audioBlob.type.includes('ogg')
        ? 'ogg'
        : audioBlob.type.includes('wav')
          ? 'wav'
          : 'webm';

      const file = new File([audioBlob], `recording.${ext}`, {
        type: audioBlob.type || 'audio/webm',
      });

      const form = new FormData();
      form.append('audio', file);

      const res = await fetch('http://localhost:4000/recordings', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = (await res.json()) as RecordingResponse;

      setRecordingId(data.recording.id);
      setTranscript(data.recording.transcript || '');
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function reset() {
    setError(null);
    setTranscript('');
    setRecordingId('');
    setAudioBlob(null);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    setStatus('idle');
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Record & Transcribe</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {status !== 'recording' && (
          <button onClick={startRecording} disabled={status === 'uploading'}>
            🎙️ Start recording
          </button>
        )}

        {status === 'recording' && <button onClick={stopRecording}>⏹️ Stop</button>}

        <button
          onClick={transcribe}
          disabled={!audioBlob || status === 'recording' || status === 'uploading'}
        >
          📝 Transcribe
        </button>

        <button onClick={reset} disabled={status === 'uploading'}>
          Reset
        </button>
      </div>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {audioUrl && (
        <div style={{ marginTop: 12 }}>
          <p>
            <strong>Preview:</strong>
          </p>
          <audio controls src={audioUrl} />
        </div>
      )}

      {status === 'done' && (
        <div style={{ marginTop: 16 }}>
          <p>
            <strong>Recording ID:</strong> {recordingId}
          </p>
          <p>
            <strong>Transcript:</strong>
          </p>
          <div style={{ whiteSpace: 'pre-wrap', background: '#321313', padding: 12 }}>
            {transcript || '(No transcript returned)'}
          </div>
        </div>
      )}
    </div>
  );
}
