// pages/api/ipfs-upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { Web3Storage, File } = await import('web3.storage');

    const token = process.env.WEB3_STORAGE_TOKEN;
    if (!token) throw new Error('WEB3_STORAGE_TOKEN is missing');

    const client = new Web3Storage({ token });

    const { name, data, contentType } = req.body as {
      name: string;
      data: string;
      contentType?: string;
    };

    if (!name || !data) return res.status(400).json({ error: 'name and data are required' });

    const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(data.replace(/\n/g, ''));
    const buffer = isBase64 ? Buffer.from(data, 'base64') : Buffer.from(data);

    const files = [new File([buffer], name, { type: contentType || 'application/octet-stream' })];
    const cid = await client.put(files, { wrapWithDirectory: false });
    const url = `https://w3s.link/ipfs/${cid}`;

    res.status(200).json({ cid, url });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message ?? 'upload failed' });
  }
}
