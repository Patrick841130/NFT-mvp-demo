// pages/api/generate.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ error: 'POST only' });
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ detail: 'HF_TOKEN is missing on server' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const prompt: string | undefined = (body as any)?.prompt;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    // Hugging Face Router Inference API (text-to-image)
    // 문서: https://huggingface.co/docs/api-inference/quicktour#text-to-image-generation
    const endpoint =
      'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3.5-medium';

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        // 바이너리 이미지를 직접 받는다
        'Accept': 'image/png',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: '',
          width: 1024,
          height: 1024,
          num_inference_steps: 40,
          guidance_scale: 4.5,
        },
      }),
    });

    if (!upstream.ok) {
      // 실패시 텍스트로 원인 반환
      const text = await upstream.text();
      return res.status(upstream.status).json({ detail: text || 'upstream error' });
    }

    // 성공: PNG 바이너리를 받아서 data URL로 변환
    const arrayBuf = await upstream.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl: dataUrl });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ detail: e?.message ?? 'fetch failed (server)' });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
