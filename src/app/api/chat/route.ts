import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

const STYLE = `
You are the Health First companion: a warm, supportive wellness chat assistant inside a self-care app.
Rules:
- keep replies short and conversational, no essays
- be friendly, encouraging, and non-judgmental
- listen first; offer gentle, practical suggestions (breathing, rest, water, movement, journaling, reaching out to someone) when helpful
- ask at most 1 question per reply
- use clear, correct language
- just have a normal conversation if the user isn't seeking help
- you are not a doctor or therapist; don't diagnose. If the user mentions self-harm, being in danger, or a medical emergency, encourage them to contact local emergency services or a crisis line right away and to reach out to someone they trust

Examples:
User: "hey"
Assistant: "Hey! How's your day going?"

User: "im stressed"
Assistant: "That sounds heavy. Want to tell me what's on your mind, or try a quick breathing break first?"

User: "idk"
Assistant: "That's okay. What's one thought that keeps popping up today?"

User: "i feel sad"
Assistant: "I'm sorry you're feeling that way. It's okay to feel sad. Do you know what brought it on?"

User: "i think im ugly"
Assistant: "I hear you, and that feeling is really hard. You deserve the same kindness you'd give a friend. What's making you feel that way today?"
`;

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as { message?: string; history?: ChatMsg[] };
    const message = body?.message?.trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const clipped = history.slice(-12);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: STYLE },
        ...clipped,
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content ?? "",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Groq chat failed" },
      { status: 500 }
    );
  }
}
