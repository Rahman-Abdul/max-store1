/**
 * SSE-based notification broadcaster.
 * Call these server-side to push events to connected clients.
 */

// In-memory set of SSE response writers (Next.js Route Handler pattern)
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function registerClient(shopId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(shopId)) clients.set(shopId, new Set());
  clients.get(shopId)!.add(controller);
}

export function unregisterClient(shopId: string, controller: ReadableStreamDefaultController) {
  clients.get(shopId)?.delete(controller);
}

export function broadcastToShop(
  shopId: string,
  event: { type: string; title: string; message: string; data?: any }
) {
  const shopClients = clients.get(shopId);
  if (!shopClients?.size) return;

  const payload = `data: ${JSON.stringify({ ...event, shopId })}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const controller of shopClients) {
    try {
      controller.enqueue(encoded);
    } catch {
      shopClients.delete(controller);
    }
  }
}

export function broadcastLowStock(shopId: string, productName: string, stock: number) {
  broadcastToShop(shopId, {
    type: "LOW_STOCK",
    title: "Low Stock Alert",
    message: `${productName} is running low (${stock} remaining)`,
    data: { productName, stock },
  });
}

export function broadcastNewSale(shopId: string, amount: number, orderCode: string) {
  broadcastToShop(shopId, {
    type: "NEW_SALE",
    title: "New Sale",
    message: `Order ${orderCode} — ₦${amount.toLocaleString()}`,
    data: { amount, orderCode },
  });
}

export function broadcastRefund(shopId: string, amount: number, saleId: string) {
  broadcastToShop(shopId, {
    type: "REFUND",
    title: "Refund Requested",
    message: `Refund of ₦${amount.toLocaleString()} requested for sale ${saleId}`,
    data: { amount, saleId },
  });
}
