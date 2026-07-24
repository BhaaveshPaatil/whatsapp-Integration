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
    } catch (authErr: any) {
      return NextResponse.json({ error: `Authentication failed: ${authErr.message}` }, { status: 401 });
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

    // 5. Verify token with Meta API (allow "simulated_" prefix for testing/development)
    let displayPhoneNumber = "Simulated Number";
    if (whatsappAccessToken.startsWith("simulated_") || whatsappAccessToken === "test" || whatsappAccessToken === "dev") {
      displayPhoneNumber = `+1555019${whatsappPhoneNumberId.slice(-4) || "9999"}`;
    } else {
      try {
        const metaUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}?access_token=${whatsappAccessToken}`;
        const metaRes = await fetch(metaUrl);
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
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to contact Meta API: ${err.message || "Network error"}` },
          { status: 500 }
        );
      }
    }

    // 6. Encrypt token and perform atomic writes in transaction
    const encryptedToken = encrypt(whatsappAccessToken);
    const orgRef = db.collection("organizations").doc(orgId);
    const connRef = db.collection("whatsappConnections").doc(whatsappPhoneNumberId);

    const now = new Date().toISOString();

    const orgUpdates: Record<string, any> = {
      whatsappConfigured: true,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      whatsappAccessToken: encryptedToken,
      updatedAt: now,
    };

    if (geminiApiKey !== undefined) {
      orgUpdates.geminiApiKey = geminiApiKey;
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
  } catch (error: any) {
    console.error("========== WHATSAPP CONFIG ERROR ==========");
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
