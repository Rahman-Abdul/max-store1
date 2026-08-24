import { auth } from "@/auth";
import { NextResponse } from "next/server";

// In-memory SSE clients store
const clients = new Map<string, { controller: ReadableStreamDefaultController; shopId?: string }>();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId") || undefined;
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      clients.set(clientId, { controller, shopId });
      // Send initial ping
      controller.enqueue(`data: ${JSON.stringify({ type: "CONNECTED", title: "Connected", message: "Real-time connected" })}\n\n`);
    },
    cancel() {
      clients.delete(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { event, data, shopId } = body;

  const payload = `data: ${JSON.stringify({ type: event, ...data })}\n\n`;

  clients.forEach(({ controller, shopId: clientShopId }) => {
    try {
      if (!shopId || !clientShopId || clientShopId === shopId) {
        controller.enqueue(payload);
      }
    } catch {
      // Client disconnected
    }
  });

  return NextResponse.json({ success: true, clients: clients.size });
}
