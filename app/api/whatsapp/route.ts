import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const message = params.get("Body");

  console.log("Incoming WhatsApp message:", message);

  return new Response(
    `<Response>
      <Message>Got your message: ${message}</Message>
    </Response>`,
    {
      headers: {
        "Content-Type": "text/xml",
      },
    }
  );
}