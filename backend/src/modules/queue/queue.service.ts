import { queueRepository } from './queue.repository.js';
import { redis } from '../../config/redis.js';
import { pool } from '../../config/database.js';
import { calculateETAs, DEFAULT_CONSULTATION_MINUTES } from '../../utils/eta.js';
import { enqueueNearTurnCheck } from '../../workers/push.worker.js';
import type {
  OpenSessionInput,
  GiveTokenInput,
  MarkFeeInput,
  DoctorBreakInput,
  UpdateNotesInput,
} from './queue.schema.js';

// ─── STANDALONE ETA RECALCULATOR ─────────────────────────────
// extracted outside queueService so it can be called internally

// notifyNearTurn: false when a token is just issued, so a patient isn't pinged the moment they
// join; the next queue movement alerts them if they are within 3 of the front.
const recalculateETAs = async (sessionId: string, { notifyNearTurn = true } = {}) => {
  const [waitingTokens, avgTime, breakTimeRemaining] = await Promise.all([
    queueRepository.getWaitingTokens(sessionId),
    queueRepository.getAvgConsultationTime(sessionId),
    queueRepository.getActiveBreak(sessionId),
  ]);

  const etas = calculateETAs(
    waitingTokens,
    avgTime,
    breakTimeRemaining ?? 0,
  );

  await redis.publish(
    `queue:${sessionId}`,
    JSON.stringify({
      event: 'eta_update',
      session_id: sessionId,
      etas,
      avg_consultation_time: avgTime ?? 10,
      waiting_count: waitingTokens.length,
    })
  );

  if (notifyNearTurn) await enqueueNearTurnCheck(sessionId);

  return etas;
};

// ─── QUEUE SERVICE ────────────────────────────────────────────

export const queueService = {

  async openSession(tenantId: string, input: OpenSessionInput) {
    const session = await queueRepository.openSession({
      tenant_id: tenantId,
      doctor_id: input.doctor_id,
      department_id: input.department_id,
      session_date: input.session_date,
      max_tokens: input.max_tokens,
    });
    return session;
  },

  async getSessionById(sessionId: string) {
    return queueRepository.getSessionById(sessionId);
  },

  async closeSession(sessionId: string) {
    const session = await queueRepository.closeSession(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'session_closed', sessionId })
    );

    return session;
  },

  async giveToken(tenantId: string, input: GiveTokenInput) {
    const idempotencyKey = `idempotency:${input.idempotency_key}`;
    const cached = await redis.get(idempotencyKey);
    if (cached) return JSON.parse(cached);

    const patient = await queueRepository.findPatientByPhone(input.phone);
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    const token = await queueRepository.giveToken({
      session_id: input.session_id,
      patient_id: patient.id,
      fee_amount: input.fee_amount,
    });

    await redis.setex(idempotencyKey, 86400, JSON.stringify(token));

    await redis.publish(
      `queue:${input.session_id}`,
      JSON.stringify({
        event:        'token_issued',
        session_id:   input.session_id,
        token_number: token.token_number,
        total_issued: token.token_number,
        patient_id:   patient.id,          // ← needed so gateway can notify patient's personal room
      })
    );

    // Notify the new patient (and re-confirm positions for others) via ETA update.
    // The new patient just joined the personal room (join:personal / join:session)
    // so they will receive this immediately.
    await recalculateETAs(input.session_id, { notifyNearTurn: false });

    return { token, patient };
  },

  async callNextToken(sessionId: string) {
    const token = await queueRepository.callNextToken(sessionId);

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'token_called',
        session_id: sessionId,
        token_number: token.token_number,
        patient_id: token.patient_id,
      })
    );

    await recalculateETAs(sessionId); // ← direct call now

    return token;
  },

  async checkinToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.checkinToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'token_checkin',
        tokenId,
        session_id: sessionId,
      })
    );

    return token;
  },

  async skipToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.skipToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_skipped', tokenId, patient_id: token.patient_id })
    );

    await recalculateETAs(sessionId); // ← direct call

    return token;
  },


  async readmitToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.readmitToken(tokenId, sessionId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_issued', token_number: token.token_number, patient_id: token.patient_id, session_id: sessionId })
    );

    await recalculateETAs(sessionId);

    return token;
  },

  async completeToken(tokenId: string, _sessionId?: string) {
    const token = await queueRepository.completeToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    // Use session_id from the DB row — the caller may not supply it
    const sid: string = token.session_id;

    await redis.publish(
      `queue:${sid}`,
      JSON.stringify({ event: 'token_completed', tokenId, patient_id: token.patient_id })
    );

    await recalculateETAs(sid);

    return token;
  },

  async markFeePaid(tokenId: string, input: MarkFeeInput) {
    const token = await queueRepository.markFeePaid(tokenId, input.fee_amount);
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    return token;
  },

  async updateNotes(tokenId: string, input: UpdateNotesInput) {
    const token = await queueRepository.updateNotes(
      tokenId,
      input.notes,
      input.notes_version
    );
    if (!token) throw new Error('VERSION_CONFLICT');
    return token;
  },

  async startBreak(sessionId: string, doctorId: string, input: DoctorBreakInput) {
    const breakRecord = await queueRepository.startBreak({
      session_id: sessionId,
      doctor_id: doctorId,
      expected_duration: input.expected_duration,
    });

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'doctor_break_started',
        session_id: sessionId,
        expected_duration: input.expected_duration,
      })
    );

    await recalculateETAs(sessionId); // ← direct call

    return breakRecord;
  },

  async endBreak(breakId: string, sessionId: string) {
    const breakRecord = await queueRepository.endBreak(breakId);
    if (!breakRecord) throw new Error('BREAK_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'doctor_break_ended',
        session_id: sessionId,
      })
    );

    await recalculateETAs(sessionId); // ← direct call

    return breakRecord;
  },

  async getSessionStatus(sessionId: string) {
    const status = await queueRepository.getSessionStatus(sessionId);
    if (!status) throw new Error('SESSION_NOT_FOUND');
    return status;
  },

  async getTodaySessions(tenantId: string) {
    return queueRepository.getTodaySessionsByTenant(tenantId);
  },

  async getMyToken(sessionId: string, patientId: string) {
    const token = await queueRepository.getPatientToken(sessionId, patientId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    return token;
  },



  async getSessionTokens(sessionId: string) {
    return queueRepository.getSessionTokens(sessionId);
  },



  async removeToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.removeToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event:      'token_cancelled',
        tokenId:    token.id,
        session_id: sessionId,
        patient_id: token.patient_id,
      })
    );

    await recalculateETAs(sessionId);

    return token;
  },

  async cancelMyToken(tokenId: string, patientId: string) {
    const token = await queueRepository.cancelToken(tokenId, patientId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${token.session_id}`,
      JSON.stringify({
        event: 'token_cancelled',
        tokenId: token.id,
        session_id: token.session_id,
        patient_id: patientId,
      })
    );

    await recalculateETAs(token.session_id); // shift everyone's ETA up

    return token;
  },

  async getMyActiveToken(patientId: string) {
    const token = await queueRepository.getMyActiveToken(patientId);
    if (!token) return null;

    // Attach initial ETA so the page shows a value on first load (before any socket update).
    // If the token is not in a waiting state, skip the computation.
    if (token.status === 'waiting') {
      const [avgTime, breakRemaining] = await Promise.all([
        queueRepository.getAvgConsultationTime(token.session_id),
        queueRepository.getActiveBreak(token.session_id),
      ]);
      const avg     = avgTime ?? DEFAULT_CONSULTATION_MINUTES;
      const ahead   = parseInt(String(token.patients_ahead), 10);
      // Position 1 = next up (+1 to account for the patient currently being served),
      // then +1 for each patient ahead in the waiting list.
      const etaMinutes = Math.round((ahead + 1) * avg + (breakRemaining ?? 0));
      return { ...token, eta_minutes: etaMinutes };
    }

    return token;
  },


  async reopenSession(sessionId: string) {
    const session = await queueRepository.reopenSession(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'session_reopened', sessionId })
    );

    return session;
  },

  // expose recalculateETAs publicly so noShow worker can call it
  recalculateETAs,
};