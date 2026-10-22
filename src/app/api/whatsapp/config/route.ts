import { NextRequest, NextResponse } from "next/server";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    let uid: string;
    try {
      const adminAuth = getAuth(getAdminApp());
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch (authErr: unknown) {
      const message = authErr instanceof Error ? authErr.message : "Unknown authentication error";
      return NextResponse.json({ error: `Authentication failed: ${message}` }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await req.json();
    const {
      orgId,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      whatsappAccessToken,
      geminiApiKey,
      orgName,
    } = body;

    if (!orgId || !whatsappPhoneNumberId || !whatsappBusinessAccountId || !whatsappAccessToken) {
      return NextResponse.json(
        { error: "orgId, whatsappPhoneNumberId, whatsappBusinessAccountId, and whatsappAccessToken are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 3. Authorize user (must be admin of the organization)
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userProfile = userDoc.data() || {};
    if (userProfile.orgId !== orgId || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin role required for this organization" }, { status: 403 });
    }

    // 4. Check for duplicate mapping
    const dupSnap = await db.collection("whatsappConnections")
      .where("phoneNumberId", "==", whatsappPhoneNumberId)
      .where("active", "==", true)
      .get();

    const duplicate = dupSnap.docs.find((doc) => doc.data().orgId !== orgId);
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Phone number ID ${whatsappPhoneNumberId} is already mapped to another active organization (${duplicate.data().orgId}).`,
        },
        { status: 400 }
      );
    }

    // 5. Verify token with Meta API
    let displayPhoneNumber = "Simulated Number";
    const isNonProd = process.env.NODE_ENV !== "production";
    const isSimulated = whatsappAccessToken.startsWith("simulated_") || whatsappAccessToken === "test" || whatsappAccessToken === "dev";
    if (isSimulated && isNonProd) {
      displayPhoneNumber = `+1555019${whatsappPhoneNumberId.slice(-4) || "9999"}`;
    } else if (isSimulated && !isNonProd) {
      return NextResponse.json(
        { error: "Simulated tokens are not allowed in production" },
        { status: 400 }
      );
    } else {
      try {
        // Use Authorization header instead of query param to avoid token leaking into logs
        const metaUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}`;
        const metaRes = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${whatsappAccessToken}` },
        });
        const metaData = await metaRes.json();
        if (!metaRes.ok) {
          return NextResponse.json(
            {
              error: `Meta API verification failed: ${metaData.error?.message || "Unknown Meta API error"}`,
            },
            { status: 400 }
          );
        }
        displayPhoneNumber = metaData.display_phone_number || metaData.verified_name || "WhatsApp Business Number";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error";
        return NextResponse.json(
          { error: `Failed to contact Meta API: ${message}` },
          { status: 500 }
        );
      }
    }

    // 6. Encrypt token and perform atomic writes in transaction
    const encryptedToken = encrypt(whatsappAccessToken);
    const orgRef = db.collection("organizations").doc(orgId);
    const connRef = db.collection("whatsappConnections").doc(whatsappPhoneNumberId);

    const now = new Date().toISOString();

    const orgUpdates: Record<string, unknown> = {
      whatsappConfigured: true,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      whatsappAccessToken: encryptedToken,
      updatedAt: now,
    };

    if (geminiApiKey !== undefined) {
      // Encrypt the Gemini API key the same way as the WhatsApp token
      orgUpdates.geminiApiKey = geminiApiKey ? encrypt(geminiApiKey) : "";
      orgUpdates.aiConfigured = Boolean(geminiApiKey);
    }

    if (orgName) {
      orgUpdates.name = orgName;
      orgUpdates.slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    }

    await db.runTransaction(async (transaction) => {
      transaction.update(orgRef, orgUpdates);

      const connData = {
        id: whatsappPhoneNumberId,
        orgId,
        phoneNumberId: whatsappPhoneNumberId,
        businessAccountId: whatsappBusinessAccountId,
        displayPhoneNumber,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(connRef, connData, { merge: true });
    });

    return NextResponse.json({ success: true, displayPhoneNumber }, { status: 200 });
  } catch (error: unknown) {
    console.error("========== WHATSAPP CONFIG ERROR ==========");
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
