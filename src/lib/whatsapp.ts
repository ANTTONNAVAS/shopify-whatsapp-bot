import axios from "axios";

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;

export async function sendWhatsAppMessage(to: string, text: string) {
  await axios.post(
    `${WA_API_URL}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function sendOrderUpdateMessage(to: string, orderName: string, status: string) {
  const statusMap: Record<string, string> = {
    confirmed: "confirmado ✅",
    fulfilled: "enviado 🚚",
    delivered: "entregado 📦",
    cancelled: "cancelado ❌",
  };

  const text = `📦 Actualización de tu pedido *${orderName}*: ha sido *${statusMap[status] ?? status}*. ¿Tienes alguna pregunta?`;
  await sendWhatsAppMessage(to, text);
}
