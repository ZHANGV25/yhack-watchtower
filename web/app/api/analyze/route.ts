import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  const body = await req.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: `You are an AI security camera system for an elderly care facility.
Analyze the described scene and give a concise 2-3 sentence clinical assessment covering:
patient status, any risks or concerns, and recommended action if needed.
Be direct and professional. Plain text only, no markdown.`,
    messages: [
      {
        role: "user",
        content: `Patient ${body.patientName}, age ${body.age}, Room ${body.room}.
Scene: ${body.scene}. Status: ${body.status}. Movement: ${body.movement}.
Posture: ${body.posture}. Activity: ${body.activity}. Risk score: ${body.risk}/10.
Provide a fresh AI scene analysis.`,
      },
    ],
  });

  const text =
    message.content.find((b) => b.type === "text")?.text ?? "";
  return Response.json({ analysis: text });
}
