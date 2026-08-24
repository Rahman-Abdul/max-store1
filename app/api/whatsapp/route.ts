import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // IMPORTANT for Prisma + auth

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { phone, message, saleId } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "Phone and message are required" },
      { status: 400 }
    );
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      { error: "WhatsApp not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/[^0-9]/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    const result = await response.json();

    // ✅ LOG TO DATABASE (now matches Prisma schema)
    if (saleId) {
      await prisma.whatsAppLog
        .create({
          data: {
            saleId,
            phone,
            message,
            status: response.ok ? "SENT" : "FAILED",
            response: result, // ✅ FIXED (no stringify needed)
            sentAt: response.ok ? new Date() : null,
          },
        })
        .catch(() => {});
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to send WhatsApp message",
          details: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
