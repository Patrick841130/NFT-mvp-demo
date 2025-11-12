// pages/api/generate.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    // 1) 여기만 네가 실제로 고른 Space 주소로 바꾸면 됨
    // 예시: https://stabilityai-stable-diffusion.hf.space/run/predict
    const spaceUrl = "https://stabilityai/stable-diffusion-3.5-medium";

    const resp = await fetch(spaceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // gradio space는 보통 이런 형식으로 prompt를 받는다
      body: JSON.stringify({
        data: [prompt],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const result = await resp.json();
    // 보통 result.data[0] 에 이미지 url 혹은 base64가 들어있다
    const imageUrl = result.data?.[0]?.url || result.data?.[0];

    if (!imageUrl) {
      return res.status(500).json({ error: "no image in space response" });
    }

    return res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message ?? "image generation failed" });
  }
}
