import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  if (!process.env.HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN is missing on server' });
  }

  try {
    // 👇 핵심: 모델은 쿼리스트링으로 넘긴다
    const response = await fetch(
      'https://router.huggingface.co/hf-inference?model=stabilityai/stable-diffusion-2-1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
          // 이미지로 받고 싶을 때
          Accept: 'image/png',
        },
        body: JSON.stringify({
          inputs: prompt,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    // 라우터는 바이너리 이미지로 돌려준다
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message ?? 'image generation failed' });
  }
}
