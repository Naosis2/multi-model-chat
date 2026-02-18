import { NextRequest, NextResponse } from "next/server";
import { getAllKnowledge, addKnowledge, updateKnowledge, deleteKnowledge, getKnowledgeLayers } from "@/lib/db";

export async function GET() {
  try {
    const [entries, layers] = await Promise.all([getAllKnowledge(), getKnowledgeLayers()]);
    return NextResponse.json({ entries, layers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { layer, title, content } = await req.json();
    if (!layer || !title || !content) {
      return NextResponse.json({ error: "layer, title, and content are required" }, { status: 400 });
    }
    const result = await addKnowledge(layer.toLowerCase().trim(), title.trim(), content.trim());
    return NextResponse.json({ ok: true, id: (result as { id: number }[])[0]?.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, title, content } = await req.json();
    if (!id || !title || !content) {
      return NextResponse.json({ error: "id, title, and content are required" }, { status: 400 });
    }
    await updateKnowledge(Number(id), title.trim(), content.trim());
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await deleteKnowledge(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
