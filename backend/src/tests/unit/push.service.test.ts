import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
vi.mock('../../config/webpush.js', () => ({
  pushEnabled: true,
  vapidPublicKey: 'test-public-key',
  webpush: { sendNotification },
}));

const repo = {
  getByUser: vi.fn(),
  markUsed: vi.fn(),
  deleteByEndpoint: vi.fn(),
  claimNearTurnTokens: vi.fn(),
};
vi.mock('../../modules/push/push.repository.js', () => ({ pushRepository: repo }));

const { pushService, nearTurnPayload, NEAR_TURN_THRESHOLD } = await import('../../modules/push/push.service.js');

const token = (ahead: number) => ({
  id: 'tok-1', patient_id: 'pat-1', token_number: 14, ahead, clinic_name: 'City Clinic', doctor_name: 'Dr Rahman',
});
const sub = (endpoint: string) => ({ id: endpoint, user_id: 'pat-1', endpoint, p256dh: 'p', auth: 'a' });

describe('push alerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alerts at 3 patients ahead', () => {
    expect(NEAR_TURN_THRESHOLD).toBe(3);
    expect(nearTurnPayload(token(3)).title).toBe('3 patients ahead of you');
    expect(nearTurnPayload(token(1)).title).toBe('1 patient ahead of you');
    expect(nearTurnPayload(token(0)).title).toBe("You're next");
    expect(nearTurnPayload(token(3)).body).toContain('#14');
  });

  it('claims with the threshold and sends to each claimed patient', async () => {
    repo.claimNearTurnTokens.mockResolvedValue([token(3)]);
    repo.getByUser.mockResolvedValue([sub('https://push.example/1')]);
    sendNotification.mockResolvedValue({ statusCode: 201 });

    await pushService.notifyNearTurn('session-1');

    expect(repo.claimNearTurnTokens).toHaveBeenCalledWith('session-1', 3);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(repo.markUsed).toHaveBeenCalledWith('https://push.example/1');
  });

  it('prunes subscriptions the push service reports as gone', async () => {
    repo.getByUser.mockResolvedValue([sub('https://push.example/gone'), sub('https://push.example/ok')]);
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
      .mockResolvedValueOnce({ statusCode: 201 });

    const delivered = await pushService.sendToUser('pat-1', nearTurnPayload(token(2)));

    expect(delivered).toBe(1);
    expect(repo.deleteByEndpoint).toHaveBeenCalledWith('https://push.example/gone');
    expect(repo.deleteByEndpoint).toHaveBeenCalledTimes(1);
  });

  it('keeps subscriptions on temporary failures', async () => {
    repo.getByUser.mockResolvedValue([sub('https://push.example/flaky')]);
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('Server error'), { statusCode: 500 }));

    expect(await pushService.sendToUser('pat-1', nearTurnPayload(token(1)))).toBe(0);
    expect(repo.deleteByEndpoint).not.toHaveBeenCalled();
  });
});
