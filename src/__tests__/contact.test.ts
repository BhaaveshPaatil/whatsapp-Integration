jest.mock("@/lib/firebase", () => ({ db: {} }));

import { mapContactDoc } from "@/lib/services/contact";

function snapshot(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("Contact document mapping", () => {
  it("uses the stored id, falling back to the document id", () => {
    expect(mapContactDoc(snapshot("doc_1", { name: "Ada" })).id).toBe("doc_1");
    expect(
      mapContactDoc(snapshot("doc_1", { id: "stored_id", name: "Ada" })).id
    ).toBe("stored_id");
  });

  it("defaults verifiedFields and filters invalid skills", () => {
    const contact = mapContactDoc(
      snapshot("doc_1", {
        name: "Ada",
        skills: ["TypeScript", 42, "React"],
      })
    );

    expect(contact.verifiedFields).toEqual([]);
    expect(contact.skills).toEqual(["TypeScript", "React"]);
  });

  it("normalizes Firestore Timestamps to ISO strings", () => {
    const timestamp = {
      toDate: () => new Date("2026-01-02T03:04:05.000Z"),
    };

    const contact = mapContactDoc(
      snapshot("doc_1", {
        name: "Ada",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    );

    expect(contact.createdAt).toBe("2026-01-02T03:04:05.000Z");
    expect(contact.updatedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("keeps ISO date strings unchanged", () => {
    const contact = mapContactDoc(
      snapshot("doc_1", {
        name: "Ada",
        createdAt: "2026-05-06T07:08:09.000Z",
      })
    );

    expect(contact.createdAt).toBe("2026-05-06T07:08:09.000Z");
  });
});
