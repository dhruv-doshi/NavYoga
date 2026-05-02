import { CONFIG } from "@/lib/config";

export const runtime = "nodejs";

interface AnalyzeVideoRequest {
  frames: string[]; // base64 JPEG strings (no data URI prefix)
  difficulty: "beginner" | "intermediate" | "advanced";
  poseName: string;
}

function buildSystemPrompt(poseName: string, difficulty: string, min: number, max: number): string {
  return `You are a warm, encouraging yoga instructor AI analyzing sequential video frames from an instructional video.
The frames show an instructor demonstrating "${poseName}" (difficulty: ${difficulty}).

Your task:
1. Analyze ALL frames as a temporal sequence (frame 0 is earliest, last frame is latest)
2. Identify ${min}–${max} distinct body-position transitions that represent key teaching moments — spanning the FULL video from entry to final hold
3. For each step, pick the SINGLE best representative frame index
4. Write a clear, natural second-person instruction (≤30 words) for that body position
5. List which joints are the focus in camelCase

Voice & tone rules (CRITICAL):
- Use warm, natural language a beginner would immediately understand
- DO: "reach your arms out wide", "soften your knees", "lift your chest", "stretch your right arm higher", "press your back foot firmly down"
- DON'T: "increase the angle at your elbow", "set your knee flexion to 90°", "adjust hip abduction", "extend the joint"
- Always say "your" before a body part, not "the"
- Second person present tense: "Stand with your feet...", "Bring your arms..."
- Encouraging, not clinical

Coverage rules:
- Steps MUST span the full video chronologically — first step from early frames, last step from late frames
- Do NOT pick adjacent frames that look nearly identical — each step must show meaningfully different body position
- Ignore frames where instructor is clearly walking away or stopping the recording

focusJoints must be camelCase from: leftKnee, rightKnee, leftHip, rightHip, leftElbow, rightElbow, leftShoulder, rightShoulder, leftAnkle, rightAnkle

Return ONLY a JSON array, no other text:
[
  { "frameIndex": 0, "title": "Step title", "instruction": "Instruction text.", "focusJoints": ["joint1"] }
]`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  let body: AnalyzeVideoRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { frames, difficulty, poseName } = body;

  console.log(`[analyze-video] Request: poseName="${poseName}" difficulty="${difficulty}" frames=${frames?.length}`);

  if (!frames?.length || frames.length < 2) {
    return Response.json({ error: "Need at least 2 frames" }, { status: 400 });
  }
  if (!difficulty || !poseName) {
    return Response.json({ error: "Missing difficulty or poseName" }, { status: 400 });
  }

  const stepsConfig = CONFIG.STEPS_BY_DIFFICULTY[difficulty];

  // Build content array: image blocks + text prompt
  const imageBlocks = frames.map((b64: string) => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${b64}` },
  }));

  const systemPrompt = buildSystemPrompt(poseName, difficulty, stepsConfig.min, stepsConfig.max);
  console.log(`[analyze-video] Calling model="${CONFIG.CLAUDE_VISION_MODEL}" url="${CONFIG.LLM_BASE_URL}" imageBlocks=${imageBlocks.length} stepsRange=${stepsConfig.min}-${stepsConfig.max}`);

  try {
    const response = await fetch(`${CONFIG.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CONFIG.CLAUDE_VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: `I've provided ${frames.length} frames from the video in chronological order. Identify the key pose transitions and return step-by-step instructions as a JSON array.`,
              },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[analyze-video] OpenRouter HTTP ${response.status}:`, JSON.stringify(error));
      return Response.json(
        { error: error.error?.message || "Vision analysis failed" },
        { status: response.status }
      );
    }

    const result = await response.json() as Record<string, unknown>;
    console.log("[analyze-video] Raw result:", JSON.stringify(result).slice(0, 800));

    const choices = result.choices as unknown[];
    const message = (choices?.[0] as Record<string, unknown>)?.message as Record<string, unknown>;
    const rawContent = message?.content;

    // Vision models may return content as an array of blocks or as a plain string
    let content: string;
    if (typeof rawContent === "string") {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      content = rawContent
        .map((block: unknown) => {
          const b = block as Record<string, unknown>;
          return b.type === "text" ? String(b.text ?? "") : "";
        })
        .join("");
    } else {
      console.error("[analyze-video] Unexpected content type:", typeof rawContent, rawContent);
      return Response.json({ error: "No response from model" }, { status: 500 });
    }

    if (!content.trim()) {
      return Response.json({ error: "No response from model" }, { status: 500 });
    }

    console.log("[analyze-video] Content preview:", content.slice(0, 300));

    // Strip markdown code fences and thinking blocks before extracting JSON
    const stripped = content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```/g, "");

    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[analyze-video] Could not find JSON array in:", stripped.slice(0, 500));
      return Response.json({ error: "Could not parse steps JSON from model response" }, { status: 500 });
    }

    let steps: unknown[];
    try {
      steps = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[analyze-video] JSON.parse failed:", parseErr);
      console.error("[analyze-video] Matched JSON string:", jsonMatch[0].slice(0, 500));
      return Response.json({ error: "Could not parse steps JSON from model response" }, { status: 500 });
    }
    console.log(`[analyze-video] Parsed ${(steps as unknown[]).length} steps:`, JSON.stringify(steps));
    return Response.json({ steps });
  } catch (error) {
    console.error("[analyze-video] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
