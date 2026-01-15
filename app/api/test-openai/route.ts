import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "BRAK OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "OPENAI_API_KEY działa ‰",
    keyLength: process.env.OPENAI_API_KEY.length,
  });
}
