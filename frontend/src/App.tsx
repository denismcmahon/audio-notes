import { useEffect, useState } from "react";

type Health = { ok: boolean };
type Recording = {
  id: string;
  created_at: string;
  audio_path: string;
  mime_type: string;
  status: string;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<Recording | null>(null);

  useEffect(() => {
    fetch("http://localhost:4000/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploaded(null);

    try {
      const form = new FormData();
      form.append("audio", file);

      const res = await fetch("http://localhost:4000/recordings", {
        method: "POST", 
        body: form
      });

      if(!res.ok) { 
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      setUploaded(data.recording);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>audio-notes</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!health && !error && <p>Checking backend...</p>}
      {health && <p>Backend health: ok ✅</p>}

      <hr style={{ margin: "16px 0" }} />

      <h2>Upload a test audio file</h2>
      <input 
        type="file" 
        accept="audio/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {uploading && <p>Uploading...</p>}

      {uploaded && (
        <pre style={{ background: "#321313", padding: 12, marginTop: 12 }}>
          {JSON.stringify(uploaded, null, 2)}
        </pre>
      )}
    </div>
  );
}