import Recorder from "./features/recording/Recorder";

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>audio-notes</h1>
      <Recorder />
    </div>
  );
}