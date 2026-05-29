import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const { conversationId, message } = await req.json();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await sendWhatsAppMessage(conversation.waId, message);

  await prisma.message.create({
    data: {
      conversationId,
      role: "AGENT",
      content: message,
    },
  });

  return NextResponse.json({ status: "sent" });
}
