import { CONFIG } from "@/lib/config";

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenRouter API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = body as Record<string, unknown>;
  const system = data.system as string;
  const user = data.user as string;

  if (!system || !user) {
    return new Response(
      JSON.stringify({ error: "Missing system or user prompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(`${CONFIG.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CONFIG.LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || "LLM request failed" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json() as Record<string, unknown>;
    const messages = result.choices as unknown[];
    const firstChoice = (messages?.[0] as Record<string, unknown>) || {};
    const messageContent = firstChoice.message as Record<string, unknown>;
    const content = messageContent?.content as string;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from LLM" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse JSON from LLM response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const steps = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(steps), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[API] LLM error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
