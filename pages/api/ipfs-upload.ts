// pages/api/ipfs-upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Web3Storage, File } from 'web3.storage';

function getClient() {
  const token = process.env.WEB3_STORAGE_TOKEN;
  if (!token) throw new Error('WEB3_STORAGE_TOKEN is missing');
  return new Web3Storage({ token });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' });
      return;
    }

    const { imageUrl, name, description } = req.body as {
      imageUrl: string;
      name?: string;
      description?: string;
    };
    if (!imageUrl) {
      res.status(400).json({ error: 'imageUrl is required' });
      return;
    }

    // 1) 이미지 다운로드
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      res.status(400).json({ error: 'failed to download image' });
      return;
    }
    const arrayBuffer = await imgResp.arrayBuffer();
    const extGuess =
      imageUrl.endsWith('.png') ? 'png' :
      imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg') ? 'jpg' :
      'png';
    const imgFile = new File([Buffer.from(arrayBuffer)], `image.${extGuess}`, {
      type: extGuess === 'png' ? 'image/png' : 'image/jpeg',
    });

    // 2) 메타데이터(JSON) 생성 (image 필드는 ipfs 상대경로로)
    const metadata = {
      name: name ?? 'AI NFT',
      description: description ?? 'Minted from Nifty MVP',
      image: 'ipfs://image', // 디렉터리 내 파일 참조
    };
    const metaFile = new File([Buffer.from(JSON.stringify(metadata))], 'metadata.json', {
      type: 'application/json',
    });

    // 3) 디렉터리 업로드 (image + metadata.json)
    const client = getClient();
    const cid = await client.put([imgFile, metaFile], {
      name: `nifty-${Date.now()}`,
      wrapWithDirectory: true,
    });

    // 4) tokenURI는 디렉터리 내 metadata.json을 가리킴
    const tokenURI = `ipfs://${cid}/metadata.json`;
    // 게이트웨이 미리보기(디버그용)
    const gatewayImage = `https://w3s.link/ipfs/${cid}/image.${extGuess}`;

    res.status(200).json({ cid, tokenURI, gatewayImage });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message ?? 'internal error' });
  }
}
