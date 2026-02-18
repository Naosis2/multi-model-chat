import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

export async function GET() {
  try {
    await setupDB();
    return NextResponse.json({ ok: true, message: "Database ready" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
