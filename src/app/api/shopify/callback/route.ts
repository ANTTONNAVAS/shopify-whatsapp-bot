import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  if (!code || !shop) {
    return new NextResponse("Missing code or shop", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET ?? "";

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const data = await res.json() as { access_token?: string; error?: string };

  if (data.access_token) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:40px">
        <h2>Token obtenido</h2>
        <p>Copia este token y ponlo en Vercel como <strong>SHOPIFY_ACCESS_TOKEN</strong>:</p>
        <code style="background:#f0f0f0;padding:10px;display:block;word-break:break-all">${data.access_token}</code>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(JSON.stringify(data), { status: 400 });
}
