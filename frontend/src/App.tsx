import { useEffect, useState } from "react";

type Health = { ok: boolean };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:4000/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>audio-notes</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!health && !error && <p>Checking backend...</p>}
      {health && <p>Backend health: ok ✅</p>}
    </div>
  )
}