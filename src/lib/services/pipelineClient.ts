import { db } from "@/lib/firebase";
import type { AiExtractionRecord, AnalyticsEvent, InboundMessage } from "@/types";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

function byCreatedAtDesc<T extends { createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aMs = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bMs = b.createdAt ? Date.parse(b.createdAt) : 0;
    return (Number.isNaN(bMs) ? 0 : bMs) - (Number.isNaN(aMs) ? 0 : aMs);
  });
}

export function subscribeToAiExtractions(
  orgId: string,
  onData: (rows: AiExtractionRecord[]) => void,
  onError: (error: Error) => void,
  max = 50
): Unsubscribe {
  const q = query(collection(db, "aiExtractions"), where("orgId", "==", orgId));

  return onSnapshot(
    q,
    (snap) =>
      onData(byCreatedAtDesc(snap.docs.map((d) => d.data() as AiExtractionRecord)).slice(0, max)),
    (err) => {
      console.error(err);
      onError(new Error(`Unable to load AI extraction logs. (${err.code})`));
    }
  );
}

export function subscribeToAnalyticsEvents(
  orgId: string,
  onData: (rows: AnalyticsEvent[]) => void,
  onError: (error: Error) => void,
  max = 500
): Unsubscribe {
  const q = query(collection(db, "analyticsEvents"), where("orgId", "==", orgId));

  return onSnapshot(
    q,
    (snap) =>
      onData(byCreatedAtDesc(snap.docs.map((d) => d.data() as AnalyticsEvent)).slice(0, max)),
    (err) => {
      console.error(err);
      onError(new Error(`Unable to load analytics events. (${err.code})`));
    }
  );
}

export function subscribeToWhatsAppMessages(
  orgId: string,
  onData: (rows: InboundMessage[]) => void,
  onError: (error: Error) => void,
  max = 40
): Unsubscribe {
  const q = query(collection(db, "whatsappMessages"), where("orgId", "==", orgId));

  return onSnapshot(
    q,
    (snap) =>
      onData(byCreatedAtDesc(snap.docs.map((d) => d.data() as InboundMessage)).slice(0, max)),
    (err) => {
      console.error(err);
      onError(new Error(`Unable to load WhatsApp messages. (${err.code})`));
    }
  );
}
