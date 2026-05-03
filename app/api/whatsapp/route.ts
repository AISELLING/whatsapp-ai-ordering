import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return NextResponse.json({ ok: true });

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    // 🔹 Get customer
    let { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", from)
      .single();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          phone: from,
          name: "Customer",
          current_step: "idle",
        })
        .select()
        .single();

      customer = newCustomer;
    }

    // 🔥 STEP LOGIC ENGINE

    // =========================
    // STEP: WAITING FOR ORDER TYPE
    // =========================
    if (customer.current_step === "awaiting_type") {
      let orderType = "collection";

      if (text.includes("delivery")) orderType = "delivery";

      // Update last order
      await supabase
        .from("orders")
        .update({ order_type: orderType })
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // Reset step
      await supabase
        .from("customers")
        .update({ current_step: "idle" })
        .eq("id", customer.id);

      await sendWhatsAppMessage(
        from,
        `✅ Got it — ${orderType}.\n\nYour order is being prepared.`
      );

      return NextResponse.json({ ok: true });
    }

    // =========================
    // STEP: "I'M ON THE WAY"
    // =========================
    if (text.includes("on the way")) {
      await sendWhatsAppMessage(
        from,
        "🔥 Nice — we’ll time it perfectly.\n\nYour order will be ready when you arrive."
      );
      return NextResponse.json({ ok: true });
    }

    // =========================
    // NORMAL ORDER PARSING
    // =========================

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract food order into JSON:
          
          {
            "items": [{"name":"Burger","qty":1,"price":5}],
            "total":7
          }`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    let parsed;

    try {
      parsed = JSON.parse(aiResponse.choices[0].message.content!);
    } catch {
      await sendWhatsAppMessage(
        from,
        "Sorry, I didn’t understand that. Try again."
      );
      return NextResponse.json({ ok: true });
    }

    // Save order
    const { data: order } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        items: parsed.items,
        total: parsed.total,
        status: "pending",
      })
      .select()
      .single();

    // Set step → WAITING FOR TYPE
    await supabase
      .from("customers")
      .update({ current_step: "awaiting_type" })
      .eq("id", customer.id);

    await sendWhatsAppMessage(
      from,
      `Got it 👌\n\n${parsed.items
        .map((i: any) => `${i.qty}x ${i.name}`)
        .join("\n")}\n\nTotal: £${parsed.total}\n\nIs that for collection or delivery?`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, body: string) {
  await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );
}