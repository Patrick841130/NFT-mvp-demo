import { useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [prompt, setPrompt] = useState('카페 로얄티 카드, 귀여운 스타일');
  const [image, setImage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // AI 생성 (플레이스홀더 → 나중에 Replicate로 교체)
  const generate = async () => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setImage(data.imageUrl);
  };


  // 실제 민팅 함수
  const mintNFT = async () => {
    if (!image) return alert('먼저 이미지를 생성해주세요!');
    if (typeof window.ethereum === 'undefined') return alert('MetaMask 설치해주세요!');

    setLoading(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 간단한 ERC-721 민팅 (테스트용)
      const contractAddress = "0xada5b4b0f2446f3f8532c309c0de222821ef572d"; // 테스트넷 컨트랙트 (나중에 배포)
      const abi = [
        "function safeMint(address to, string memory uri) public"
      ];
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.safeMint(
        await signer.getAddress(),
        image
      );
      await tx.wait();
      setTxHash(tx.hash);
      alert('민팅 성공!');
    } catch (err: any) {
      alert('민팅 실패: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '3rem', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.8rem', marginBottom: '1rem', color: '#10b981' }}>Nifty MVP</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.2rem' }}>
        AI로 1분 만에 단골 NFT 만들기
      </p>

      <input
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e5e7eb', marginBottom: '1.5rem' }}
        placeholder="프롬프트 입력"
      />

      <button
        onClick={generate}
        style={{ width: '100%', padding: '1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.3rem', marginBottom: '1rem', cursor: 'pointer' }}
      >
        AI 이미지 생성
      </button>

      {image && (
        <div style={{ marginTop: '2rem' }}>
          <img src={image} alt="NFT" style={{ borderRadius: '16px', maxWidth: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} />
          
          <button
            onClick={mintNFT}
            disabled={loading}
            style={{ width: '100%', padding: '1.2rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.3rem', marginTop: '1.5rem', cursor: 'pointer' }}
          >
            {loading ? '민팅 중...' : '실제 민팅하기 (Polygon Amoy)'}
          </button>

          {txHash && (
            <p style={{ marginTop: '1rem', wordBreak: 'break-all', background: '#f3e8ff', padding: '1rem', borderRadius: '8px' }}>
              성공! Tx: 
              <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" style={{ color: '#7c3aed' }}>
                확인하기
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
