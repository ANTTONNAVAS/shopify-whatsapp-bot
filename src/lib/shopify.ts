import axios from "axios";

const shopifyClient = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

export async function getOrderByEmail(email: string) {
  const { data } = await shopifyClient.get(`/orders.json?email=${email}&status=any&limit=5`);
  return data.orders;
}

export async function getOrderByName(orderName: string) {
  const name = orderName.startsWith("#") ? orderName : `#${orderName}`;
  const { data } = await shopifyClient.get(`/orders.json?name=${encodeURIComponent(name)}&status=any`);
  return data.orders[0] ?? null;
}

export function formatOrderStatus(order: any): string {
  const fulfillment = order.fulfillment_status ?? "sin procesar";
  const financial = order.financial_status;
  const tracking = order.fulfillments?.[0]?.tracking_url;

  let msg = `Pedido ${order.name}: ${fulfillment} | Pago: ${financial}`;
  if (tracking) msg += `\nSeguimiento: ${tracking}`;
  return msg;
}
