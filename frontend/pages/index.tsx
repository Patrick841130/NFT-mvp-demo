import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('카페 로얄티 카드');

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Nifty MVP</h1>
      <input value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button onClick={() => alert('생성: ' + prompt)}>AI 생성</button>
    </div>
  );
}
