// pages/api/generate.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    // 실제 네가 방금 본 Space의 endpoint
    const spaceUrl = "https://stabilityai-stable-diffusion-3-5-medium.hf.space/run/infer";

    const resp = await fetch(spaceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          prompt,   // prompt
          "",       // negative_prompt
          0,        // seed
          true,     // randomize_seed
          1024,     // width
          1024,     // height
          4.5,      // guidance_scale
          40        // num_inference_steps
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ detail: text });
    }

    const result = await resp.json();
    const imageUrl = result.data?.[0]?.url || result.data?.[0];

    if (!imageUrl) {
      return res.status(500).json({ detail: "no image in response" });
    }

    return res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ detail: err.message ?? "fetch failed" });
  }
}
