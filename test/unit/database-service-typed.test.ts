vi.mock('../../../src/main/services/databaseService', () => ({
  initialize: vi.fn().mockResolvedValue({ success: true, data: true }),
  disconnect: vi.fn().mockResolvedValue({ success: true, data: true }),
  saveTypingSession: vi.fn().mockResolvedValue({ success: true, data: 'sess_1' }),
  getTypingSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getTypingStats: vi.fn().mockResolvedValue({ success: true, data: { wpm: 0 } }),
  getAnalyticsData: vi.fn().mockResolvedValue({ success: true, data: { generatedAt: new Date().toISOString() } }),
}));

import service from '../../../src/main/database/services/service';

describe('database typed service adapter', () => {
  it('initialize delegates to underlying service', async () => {
    const res = await service.initialize();
    expect(res.success).toBe(true);
  });

  it('saveTypingSession returns id', async () => {
    const r = await (service as any).saveTypingSession({ userId: 'u1', content: 'hi', startTime: new Date(), endTime: new Date(), keyCount: 10, wpm: 40, accuracy: 95, windowTitle: 'w', appName: 'a' });
    expect(r.success).toBe(true);
    expect(r.data).toBe('sess_1');
  });

  it('getAnalyticsData delegates', async () => {
    const r = await (service as any).getAnalyticsData();
    expect(r.success).toBe(true);
    expect(r.data).toHaveProperty('generatedAt');
  });
});
