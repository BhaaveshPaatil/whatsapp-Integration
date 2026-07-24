import { decrypt } from "@/lib/crypto";

/**
 * Load org-specific WhatsApp credentials from Firestore via firebase-admin.
 * Falls back to env vars when orgId is not provided.
 */
async function getOrgCredentials(orgId?: string): Promise<{
  phoneNumberId: string;
  accessToken: string;
} | null> {
  if (!orgId) return null;

  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    const orgDoc = await db.collection("organizations").doc(orgId).get();
    if (!orgDoc.exists) return null;

    const org = orgDoc.data();
    if (!org?.whatsappPhoneNumberId || !org?.whatsappAccessToken) return null;

    return {
      phoneNumberId: org.whatsappPhoneNumberId,
      accessToken: decrypt(org.whatsappAccessToken),
    };
  } catch (error) {
    console.error("Failed to load org WhatsApp credentials:", error);
    return null;
  }
}

export async function sendWhatsAppMessage(
  toPhone: string,
  messageText: string,
  orgId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Try org-specific credentials first
  const orgCreds = await getOrgCredentials(orgId);

  const phoneNumberId = orgCreds?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = orgCreds?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp API credentials missing, simulating response.");
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
