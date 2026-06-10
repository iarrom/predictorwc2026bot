import { NextResponse } from "next/server";

interface ClientErrorPayload {
  type?: string;
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  name?: string;
}

export async function POST(request: Request) {
  let payload: ClientErrorPayload = {};

  try {
    payload = (await request.json()) as ClientErrorPayload;
  } catch {
    payload = { message: "Invalid client error payload" };
  }

  console.error("[client-error]", {
    type: payload.type ?? "unknown",
    message: payload.message ?? "No message",
    name: payload.name,
    source: payload.source,
    lineno: payload.lineno,
    colno: payload.colno,
    stack: payload.stack,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
