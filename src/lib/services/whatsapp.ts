export async function sendWhatsAppMessage(
  toPhone: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp API credentials missing in .env.local, simulating response.");
    return { success: true, messageId: "simulated_msg_" + Date.now() };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: messageText },
        }),
      }
    );

    const data = await res.json();
    if (res.ok) {
      return { success: true, messageId: data.messages?.[0]?.id };
    } else {
      return { success: false, error: data.error?.message || "WhatsApp API error" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
