import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { sendOrderUpdateMessage } from "@/lib/whatsapp";
import crypto from "crypto";

function verifyShopifyWebhook(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return hash === hmac;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "";

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = JSON.parse(rawBody);

  if (topic === "orders/fulfilled" || topic === "orders/updated") {
    const phone = order.shipping_address?.phone ?? order.billing_address?.phone;
    if (!phone) return NextResponse.json({ status: "no_phone" });

    const normalized = phone.replace(/\D/g, "");

    const conversation = await prisma.conversation.findFirst({
      where: { customerPhone: { contains: normalized.slice(-9) } },
    });

    if (conversation) {
      await sendOrderUpdateMessage(conversation.waId, order.name, order.fulfillment_status);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "BOT",
          content: `📦 Actualización enviada: pedido ${order.name} → ${order.fulfillment_status}`,
        },
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
