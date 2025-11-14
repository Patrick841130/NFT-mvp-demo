// pages/api/ipfs-upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } }, // 큰 이미지 허용
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const token = process.env.WEB3_STORAGE_TOKEN;
    if (!token) return res.status(500).json({ error: 'WEB3_STORAGE_TOKEN is missing' });

    const { imageUrl, name, description } = (typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body) as {
      imageUrl: string; // 허깅페이스에서 받은 최종 이미지 URL 또는 data URL
      name?: string;
      description?: string;
    };

    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

    // 1) 이미지 가져오기 (data URL이면 base64 파싱, http(s)면 다운로드)
    let imageBuffer: Buffer;
    let imageExt = 'png';
    let imageMime = 'image/png';

    if (imageUrl.startsWith('data:image/')) {
      const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'invalid data URL' });
      imageMime = match[1];
      imageExt = imageMime.split('/')[1] || 'png';
      imageBuffer = Buffer.from(match[2], 'base64');
    } else {
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        const t = await imgResp.text().catch(() => '');
        return res.status(400).json({ error: `failed to download image: ${t}` });
      }
      const ab = await imgResp.arrayBuffer();
      imageBuffer = Buffer.from(ab);
      const ct = imgResp.headers.get('content-type') || '';
      if (ct.startsWith('image/')) {
        imageMime = ct;
        imageExt = ct.split('/')[1] || imageExt;
      }
    }

    // helper: web3.storage HTTP 업로드
    async function w3sUpload(content: Buffer | string, contentType: string) {
      const resp = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: typeof content === 'string' ? Buffer.from(content) : content,
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`web3.storage upload failed: ${resp.status} ${txt}`);
      }
      const json = await resp.json();
      // json.cid
      return {
        cid: json.cid as string,
        url: `https://w3s.link/ipfs/${json.cid}`,
        ipfs: `ipfs://${json.cid}`,
      };
    }

    // 2) 이미지 업로드
    const imgUp = await w3sUpload(imageBuffer, imageMime);

    // 3) 메타데이터 생성 -> 업로드
    const metadata = {
      name: name ?? 'AI NFT',
      description: description ?? 'Minted from Nifty MVP',
      image: imgUp.ipfs, // 지갑/마켓 호환 위해 ipfs://CID 사용
    };
    const metaJson = JSON.stringify(metadata);
    const metaUp = await w3sUpload(metaJson, 'application/json');

    // tokenURI는 메타데이터 CID를 가리키게 한다
    const tokenURI = `${metaUp.ipfs}`;
    const gatewayImage = `${imgUp.url}`;

    return res.status(200).json({
      tokenURI,        // ← 컨트랙트 safeMint에 이 값 넣기
      gatewayImage,    // 디버그/미리보기용
      imageCid: imgUp.cid,
      metadataCid: metaUp.cid,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? 'internal error' });
  }
}
