// pages/api/generate.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    return res.status(400).json({ error: "prompt required" });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "HF_TOKEN missing on server" });
  }

  try {
    // ✅ HF가 지금 쓰라고 한 라우터 엔드포인트
    const resp = await fetch("https://router.huggingface.co/hf-inference", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        // ✅ 네가 목록에서 본, 라우터에서 바로 되는 모델
        model: "black-forest-labs/FLUX.1-dev",
        inputs: prompt,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const arrayBuffer = await resp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message ?? "image generation failed" });
  }
}
