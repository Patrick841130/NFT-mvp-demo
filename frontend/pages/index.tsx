import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('카페 로얄티 카드, 귀여운 스타일');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      // 임시: 플레이스홀더 이미지 (Replicate API 나중에)
      setImageUrl('https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=Nifty+NFT');
      alert('AI 생성 완료! (실제 API 연결 시 이미지 로드)');
    } catch (err) {
      alert('생성 에러');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Nifty MVP Demo</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>AI로 1분 NFT 로얄티 카드 만들기</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="프롬프트 입력 (e.g., 미용실 멤버십 카드)"
        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
      />
      <button 
        onClick={generate} 
        disabled={loading}
        style={{ width: '100%', padding: '0.75rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '1rem' }}
      >
        {loading ? 'AI 생성 중...' : 'AI 이미지 생성'}
      </button>

      {imageUrl && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <img src={imageUrl} alt="AI 생성 NFT" style={{ maxWidth: '300px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
          <p>민팅 버튼은 다음 업데이트에서! (지금은 플레이스홀더)</p>
        </div>
      )}
    </div>
  );
}
