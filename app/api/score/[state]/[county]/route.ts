import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL?.replace(/\/+$/, "");

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ state: string; county: string }> }
) {
  try {
    const { state, county } = await context.params;

    if (!API_BASE) {
      return NextResponse.json(
        { detail: "Missing NEXT_PUBLIC_API_BASE_URL" },
        { status: 500 }
      );
    }

    const res = await fetch(`${API_BASE}/score/${state}/${county}`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed";

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}