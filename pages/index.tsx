import { useState } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [prompt, setPrompt] = useState('카페 로얄티 카드, 귀여운 스타일');
  const [image, setImage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1) 더미 이미지 생성
  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setImage(data.imageUrl);
        setTxHash(null);
      } else {
        alert('이미지 생성 실패: ' + (data.error ?? 'unknown'));
      }
    } catch (e) {
      console.error(e);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2) 실제 민팅
  const mintNFT = async () => {
    if (!image) {
      alert('먼저 이미지를 생성해주세요!');
      return;
    }
    if (typeof window === 'undefined') {
      alert('브라우저 환경이 아닙니다.');
      return;
    }
    const { ethereum } = window as any;
    if (!ethereum) {
      alert('MetaMask가 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      // 지갑 연결
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });

      // ethers v6 스타일
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // 👉 여기 네가 Amoy에 방금 배포한 컨트랙트 주소
      const contractAddress = '0xada5b4b0f2446f3f8532c309c0de222821ef572d';

      // 👉 우리가 Remix에서 만든 컨트랙트 시그니처
      const abi = [
        'function safeMint(address to, string memory uri) public'
      ];

      const contract = new ethers.Contract(contractAddress, abi, signer);

      const userAddress = await signer.getAddress();

      // 이미지 URL을 그대로 tokenURI로 넣는다 (나중에 IPFS로 교체)
      const tx = await contract.safeMint(userAddress, image);
      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      alert('민팅 성공!');
    } catch (err: any) {
      console.error(err);
      alert('민팅 실패: ' + (err.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '3rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
          Nifty MVP
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          AI로 1분 만에 단골 NFT 만들기
        </p>

        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="프롬프트 입력"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '9999px',
            border: '1px solid #e5e7eb',
            marginBottom: '1.3rem',
            outline: 'none',
            fontSize: '1rem'
          }}
        />

        <button
          onClick={generate}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#10b981',
            color: '#fff',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          AI 이미지 생성
        </button>

        {image && (
          <div style={{ marginTop: '2.2rem' }}>
            <img
              src={image}
              alt="generated"
              style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 30px rgba(0,0,0,0.1)' }}
            />
            <button
              onClick={mintNFT}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1rem',
                background: loading ? '#a855f7' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.05rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '민팅 중...' : 'Polygon Amoy에 민팅하기'}
            </button>

            {txHash && (
              <p style={{ marginTop: '1rem' }}>
                트랜잭션:{" "}
                <a
                  href={`https://amoy.polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#7c3aed' }}
                >
                  확인하기
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
