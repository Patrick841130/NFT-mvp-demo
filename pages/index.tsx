import { useState } from 'react';
import { ethers } from 'ethers';

// 여러 지갑이 있는 경우 메타마스크를 골라서 가져오는 헬퍼
function getMetaMaskProvider(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;

  // 여러 provider가 주입된 경우
  if (w.ethereum && Array.isArray(w.ethereum.providers)) {
    const mm = w.ethereum.providers.find((p: any) => p.isMetaMask);
    return w.ethereum.providers[0];
  }

  // 하나만 있는 경우
  if (w.ethereum) return w.ethereum;
  return null;
}
//  한글도 되는 base64 인코더
function toBase64Json(obj: any): string {
  // 1) JSON으로 만들고
  const json = JSON.stringify(obj);
  // 2) UTF-8로 먼저 바꾼 다음
  const utf8 = new TextEncoder().encode(json);
  // 3) 그걸 base64로 변환
  let binary = '';
  utf8.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export default function Home() {
  const [prompt, setPrompt] = useState('카페 로얄티 카드, 귀여운 스타일');
  const [image, setImage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1) AI 이미지 생성 (/api/generate 호출)
  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      // ❗️항상 먼저 문자열로 받고 → 가능하면 JSON 파싱
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || data.detail)) ||
          raw ||
          `HTTP ${res.status}`;
        alert('이미지 생성 실패: ' + msg);
        return;
      }

      if (data?.imageUrl) {
        setImage(data.imageUrl);
        setTxHash(null);
      } else {
        alert('이미지 생성 실패: 응답에 imageUrl이 없습니다.');
      }
    } catch (e: any) {
      console.error(e);
      alert('이미지 생성 중 오류가 발생했습니다: ' + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const AMOY_CHAIN_ID_HEX = '0x13882'; // 80002

  async function ensureAmoy(ethereum: any) {
    const targetChainId = AMOY_CHAIN_ID_HEX;
    try {
      const current = await ethereum.request({ method: 'eth_chainId' });
      if (current?.toLowerCase() !== targetChainId) {
       await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      }
    } catch (switchErr: any) {
      // 지갑에 네트워크가 없으면 추가
      if (switchErr?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetChainId,
            chainName: 'Polygon Amoy',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: ['https://rpc-amoy.polygon.technology/'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/'],
          }],
        });
      } else {
        throw switchErr;
      }
    }
  }

  // 2) 실제 민팅
  const mintNFT = async () => {
    if (!image) {
      alert('먼저 이미지를 생성해주세요!');
      return;
    }

    const ethereum = getMetaMaskProvider();
    if (!ethereum) {
      alert('MetaMask가 필요합니다. 다른 지갑 확장자가 켜져 있으면 잠깐 꺼주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1) 지갑 연결을 10초 타임아웃으로 감싼다 (확장자가 멈출 때 대비)
      await Promise.race([
        ethereum.request({ method: 'eth_requestAccounts' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('지갑 응답이 없습니다. 다시 시도해주세요.')), 10000)
        ),
      ]);

      // 2) provider / signer
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      // 3) 메타데이터(JSON) → base64 → data:application/json 으로 감싸기
      const metadata = {
        name: `AI NFT ${Date.now()}`,
        description: `Generated from prompt: ${prompt}`,
        image: image, // 실제 생성된 이미지 URL
      };
      const tokenURI = 'data:application/json;base64,' + toBase64Json(metadata);

      // 4) 컨트랙트 세팅
      const contractAddress = '0xada5b4b0f2446f3f8532c309c0de222821ef572d';
      const abi = ['function safeMint(address to, string memory uri) public'];
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const userAddress = await signer.getAddress();

      // 5) 민팅 트랜잭션 보내기
      const tx = await contract.safeMint(userAddress, tokenURI);
      // 먼저 해시를 보여주자
      setTxHash(tx.hash);

      // 6) 블록 포함 대기 (20초 이상 기다리지 않게)
      await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  '트랜잭션이 아직 블록에 포함되지 않았습니다. 나중에 Polygonscan에서 해시로 확인해주세요.'
                )
              ),
            20000
          )
        ),
      ]);

      alert('민팅 성공!');
    } catch (err: any) {
      console.error(err);
      alert('민팅 실패: ' + (err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: '3rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.6rem',
            fontWeight: 700,
            color: '#059669',
            marginBottom: '0.5rem',
          }}
        >
          Nifty MVP
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          AI로 생성 이미지를 NFT로 만들자!!
        </p>

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="프롬프트 입력"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '9999px',
            border: '1px solid #e5e7eb',
            marginBottom: '1.3rem',
            outline: 'none',
            fontSize: '1rem',
          }}
        />

        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#6ee7b7' : '#10b981',
            color: '#fff',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          이미지 생성하기
        </button>

        {image && (
          <div style={{ marginTop: '2.2rem' }}>
            <img
              src={image}
              alt="generated"
              style={{
                width: '100%',
                borderRadius: '16px',
                boxShadow: '0 20px 30px rgba(0,0,0,0.1)',
              }}
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
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '민팅 중...' : '테스트 민팅하기'}
            </button>

            {txHash && (
              <p style={{ marginTop: '1rem' }}>
                트랜잭션:{' '}
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
