import { sessionService, isActiveSessionConflict, ActiveSessionError } from '@/services/sessionService';
import { supabase } from '@/lib/supabase';

// Chainable query-builder mock: select/eq/insert return the same object; maybeSingle
// (getActive) and single (insert) are the terminal, per-test configurable resolvers.
jest.mock('@/lib/supabase', () => {
  const q: Record<string, jest.Mock> = {};
  const chain = () => q;
  q.select = jest.fn(chain);
  q.eq = jest.fn(chain);
  q.insert = jest.fn(chain);
  q.maybeSingle = jest.fn();
  q.single = jest.fn();
  return {
    supabase: {
      auth: { getUser: jest.fn() },
      from: jest.fn(() => q),
      __q: q,
    },
  };
});

const mock = supabase as unknown as {
  auth: { getUser: jest.Mock };
  from: jest.Mock;
  __q: { maybeSingle: jest.Mock; single: jest.Mock; insert: jest.Mock };
};

const params = {
  start_location: 'A', destination: 'B', route_data: null,
  checkin_interval_minutes: 30, location_sharing_enabled: false, contact_ids: [] as string[],
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
});

// @feature US-018 @priority must
// Bug 2: the "one active session per user" constraint must never surface as a raw DB
// error; detect it and raise a typed ActiveSessionError instead.
describe('isActiveSessionConflict (Bug 2)', () => {
  it('flags SQLSTATE 23505', () => {
    expect(isActiveSessionConflict({ code: '23505', message: 'duplicate key' })).toBe(true);
  });
  it('flags the constraint/index name in the message', () => {
    expect(isActiveSessionConflict({ message: 'violates unique constraint "uq_safety_sessions_one_active"' })).toBe(true);
  });
  it('does not flag unrelated errors', () => {
    expect(isActiveSessionConflict({ code: '23503', message: 'foreign key' })).toBe(false);
    expect(isActiveSessionConflict(null)).toBe(false);
  });
});

describe('sessionService.create active-session handling (Bug 2)', () => {
  it('throws ActiveSessionError and does NOT insert when a session is already active', async () => {
    mock.__q.maybeSingle.mockResolvedValue({ data: { id: 's-existing', status: 'active' }, error: null });
    await expect(sessionService.create(params)).rejects.toBeInstanceOf(ActiveSessionError);
    expect(mock.__q.insert).not.toHaveBeenCalled(); // existing session is never destroyed
  });

  it('translates a race-condition 23505 on insert into ActiveSessionError', async () => {
    mock.__q.maybeSingle.mockResolvedValue({ data: null, error: null }); // no active session at check time
    mock.__q.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    await expect(sessionService.create(params)).rejects.toBeInstanceOf(ActiveSessionError);
  });

  it('creates normally when there is no active session', async () => {
    mock.__q.maybeSingle.mockResolvedValue({ data: null, error: null });
    mock.__q.single.mockResolvedValue({ data: { id: 's-new', status: 'active' }, error: null });
    const created = await sessionService.create(params);
    expect(created.id).toBe('s-new');
  });
});
