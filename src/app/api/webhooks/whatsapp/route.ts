import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBotResponse } from "@/lib/anthropic";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getOrderByName, formatOrderStatus } from "@/lib/shopify";

const SYSTEM_PROMPT = `Eres un asistente de atención al cliente para una tienda de ecommerce en Shopify.
Respondes en español, de forma amable y concisa.
Si el cliente pregunta por un pedido y te da el número, indícalo claramente para que el sistema lo consulte con el formato [PEDIDO:#XXXX].
Si no puedes resolver el problema, di que transferirás con un agente humano escribiendo [ESCALAR].
No inventes información sobre pedidos o envíos.`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message || message.type !== "text") {
    return NextResponse.json({ status: "ignored" });
  }

  const from = message.from;
  const text = message.text.body;
  const contactName = change.value?.contacts?.[0]?.profile?.name ?? "Cliente";

  let conversation = await prisma.conversation.findUnique({ where: { waId: from } });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        waId: from,
        customerPhone: from,
        customerName: contactName,
        status: "BOT",
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "CUSTOMER",
      content: text,
    },
  });

  if (conversation.status === "HUMAN") {
    return NextResponse.json({ status: "human_handling" });
  }

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const messages = history.map((m) => ({
    role: m.role === "CUSTOMER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  let botReply = await generateBotResponse(messages, SYSTEM_PROMPT);

  // Si Claude detecta un pedido, consultamos Shopify
  const orderMatch = botReply.match(/\[PEDIDO:(#?\d+)\]/);
  if (orderMatch) {
    const order = await getOrderByName(orderMatch[1]);
    if (order) {
      const orderInfo = formatOrderStatus(order);
      botReply = botReply.replace(orderMatch[0], orderInfo);
    } else {
      botReply = botReply.replace(orderMatch[0], "No encontré ese número de pedido.");
    }
  }

  // Si Claude decide escalar
  if (botReply.includes("[ESCALAR]")) {
    botReply = botReply.replace("[ESCALAR]", "").trim();
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "HUMAN" },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "BOT",
      content: botReply,
    },
  });

  await sendWhatsAppMessage(from, botReply);

  return NextResponse.json({ status: "ok" });
}
