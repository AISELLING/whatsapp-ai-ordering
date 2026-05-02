export async function GET() {
  return new Response('WhatsApp webhook is live ✅', {
    status: 200,
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const params = new URLSearchParams(body)

  const message = params.get('Body') || 'No message received'

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Got your message: ${message}</Message>
</Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    }
  )
}