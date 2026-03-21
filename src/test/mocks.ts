import { vi } from 'vitest';

// ─── Supabase mock builder ───────────────────────────────────────────────────

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

export function createMockQueryBuilder(data: unknown = [], error: unknown = null): MockQueryBuilder {
  const result = { data, error };
  const builder: MockQueryBuilder = {} as MockQueryBuilder;

  const chainable = () => builder;
  const terminal = () => Promise.resolve(result);

  builder.select = vi.fn().mockImplementation(() => builder);
  builder.insert = vi.fn().mockImplementation(() => builder);
  builder.update = vi.fn().mockImplementation(() => builder);
  builder.upsert = vi.fn().mockImplementation(() => builder);
  builder.delete = vi.fn().mockImplementation(() => builder);
  builder.eq = vi.fn().mockImplementation(() => builder);
  builder.in = vi.fn().mockImplementation(() => builder);
  builder.order = vi.fn().mockImplementation(() => builder);
  builder.limit = vi.fn().mockImplementation(() => builder);
  builder.single = vi.fn().mockImplementation(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(result));

  // Make the builder thenable so `await supabase.from(...).select(...)` works
  (builder as any).then = (resolve: Function) => resolve(result);

  return builder;
}

export function createMockSupabase(fromMap: Record<string, MockQueryBuilder> = {}) {
  const defaultBuilder = createMockQueryBuilder();
  return {
    from: vi.fn((table: string) => fromMap[table] || defaultBuilder),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };
}
