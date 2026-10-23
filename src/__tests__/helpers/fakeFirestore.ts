/**
 * Minimal in-memory Firestore stand-in for pipeline integration tests.
 * Supports the document, query, and transaction APIs used by the pipeline.
 */

export type FakeData = Record<string, unknown>;

type Filter = { field: string; op: string; value: unknown };

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function matches(data: FakeData, filter: Filter): boolean {
  const actual = data[filter.field];
  switch (filter.op) {
    case "==":
      return actual === filter.value;
    case "!=":
      return actual !== filter.value;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(actual);
    case ">":
      return (actual as never) > (filter.value as never);
    case ">=":
      return (actual as never) >= (filter.value as never);
    case "<":
      return (actual as never) < (filter.value as never);
    case "<=":
      return (actual as never) <= (filter.value as never);
    default:
      throw new Error(`Unsupported query operator: ${filter.op}`);
  }
}

export class FakeDocSnapshot {
  constructor(
    public readonly id: string,
    private readonly value: FakeData | undefined,
    public readonly ref: FakeDocRef
  ) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : clone(this.value);
  }
}

export class FakeQuerySnapshot {
  constructor(public readonly docs: FakeDocSnapshot[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }
}

export class FakeDocRef {
  constructor(
    public readonly db: FakeFirestore,
    public readonly collectionName: string,
    public readonly id: string
  ) {}

  async get(): Promise<FakeDocSnapshot> {
    return this.db.getDoc(this.collectionName, this.id);
  }

  async set(data: FakeData, options?: { merge?: boolean }): Promise<void> {
    this.db.setDoc(this.collectionName, this.id, data, options);
  }

  async update(data: FakeData): Promise<void> {
    this.db.updateDoc(this.collectionName, this.id, data);
  }
}

export class FakeQuery {
  constructor(
    public readonly db: FakeFirestore,
    public readonly collectionName: string,
    public readonly filters: Filter[] = [],
    public readonly limitCount?: number
  ) {}

  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(
      this.db,
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.limitCount
    );
  }

  limit(count: number): FakeQuery {
    return new FakeQuery(this.db, this.collectionName, this.filters, count);
  }

  async get(): Promise<FakeQuerySnapshot> {
    return this.db.runQuery(this.collectionName, this.filters, this.limitCount);
  }
}

export class FakeCollectionRef extends FakeQuery {
  constructor(db: FakeFirestore, name: string) {
    super(db, name);
  }

  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.db, this.collectionName, id ?? this.db.nextId());
  }
}

export class FakeTransaction {
  constructor(private readonly db: FakeFirestore) {}

  async get(target: { get: () => Promise<FakeDocSnapshot | FakeQuerySnapshot> }) {
    return target.get();
  }

  set(ref: FakeDocRef, data: FakeData, options?: { merge?: boolean }): void {
    this.db.setDoc(ref.collectionName, ref.id, data, options);
  }

  update(ref: FakeDocRef, data: FakeData): void {
    this.db.updateDoc(ref.collectionName, ref.id, data);
  }
}

export class FakeFirestore {
  private readonly collections = new Map<string, Map<string, FakeData>>();
  private counter = 0;

  reset(): void {
    this.collections.clear();
    this.counter = 0;
  }

  nextId(): string {
    this.counter += 1;
    return `auto_${this.counter}`;
  }

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this, name);
  }

  seed(collectionName: string, id: string, data: FakeData): void {
    this.ensureCollection(collectionName).set(id, clone(data));
  }

  all(collectionName: string): Array<{ id: string; data: FakeData }> {
    return Array.from(this.ensureCollection(collectionName).entries()).map(
      ([id, data]) => ({ id, data: clone(data) })
    );
  }

  async runTransaction<T>(
    fn: (transaction: FakeTransaction) => Promise<T>
  ): Promise<T> {
    return fn(new FakeTransaction(this));
  }

  getDoc(collectionName: string, id: string): FakeDocSnapshot {
    const data = this.ensureCollection(collectionName).get(id);
    return new FakeDocSnapshot(
      id,
      data,
      new FakeDocRef(this, collectionName, id)
    );
  }

  setDoc(
    collectionName: string,
    id: string,
    data: FakeData,
    options?: { merge?: boolean }
  ): void {
    const collection = this.ensureCollection(collectionName);
    const next =
      options?.merge && collection.has(id)
        ? { ...collection.get(id), ...clone(data) }
        : clone(data);
    collection.set(id, next);
  }

  updateDoc(collectionName: string, id: string, data: FakeData): void {
    const collection = this.ensureCollection(collectionName);
    const existing = collection.get(id);
    if (!existing) {
      throw new Error(`No document to update: ${collectionName}/${id}`);
    }
    collection.set(id, { ...existing, ...clone(data) });
  }

  runQuery(
    collectionName: string,
    filters: Filter[],
    limitCount?: number
  ): FakeQuerySnapshot {
    let rows = Array.from(this.ensureCollection(collectionName).entries()).map(
      ([id, data]) => ({ id, data })
    );

    for (const filter of filters) {
      rows = rows.filter((row) => matches(row.data, filter));
    }

    if (limitCount !== undefined) rows = rows.slice(0, limitCount);

    const docs = rows.map(
      (row) =>
        new FakeDocSnapshot(
          row.id,
          row.data,
          new FakeDocRef(this, collectionName, row.id)
        )
    );
    return new FakeQuerySnapshot(docs);
  }

  private ensureCollection(name: string): Map<string, FakeData> {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Map<string, FakeData>();
      this.collections.set(name, collection);
    }
    return collection;
  }
}
