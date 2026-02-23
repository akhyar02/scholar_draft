import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
