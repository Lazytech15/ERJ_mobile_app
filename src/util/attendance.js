// ── Multi-session clock helpers ──────────────────────────────────────────────
// Mirrors src/utils/dateTime.js on the web app so both apps agree on the same
// attendance record shape. A shift can now be 'standard' (one clock in/out
// pair a day) or 'split' (several labeled sessions a day — e.g. Morning,
// Afternoon, Evening — each with its own clock in/out pair). A "session" on
// a shift is `{ id, label, start, end }`; a "punch" on an attendance record
// is `{ sessionId, label, clockIn, clockOut }`.

/** Minutes between two "HH:mm" strings. Treats a smaller end-time as crossing midnight. */
export function hhmmDiffMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const a = String(clockIn).match(/^(\d{1,2}):(\d{2})/);
  const b = String(clockOut).match(/^(\d{1,2}):(\d{2})/);
  if (!a || !b) return 0;
  let diff = (parseInt(b[1], 10) * 60 + parseInt(b[2], 10)) - (parseInt(a[1], 10) * 60 + parseInt(a[2], 10));
  if (diff < 0) diff += 24 * 60;
  return diff;
}

/** Total worked minutes for an attendance record. Sums every clocked session
 *  (so a lunch-break gap on a split shift isn't counted as worked time).
 *  Falls back to the legacy single clockIn/clockOut pair when no session
 *  breakdown is present, so old records keep working unchanged. */
export function computeWorkedMinutes(record) {
  if (record?.sessions?.length) {
    return record.sessions.reduce((acc, s) => acc + hhmmDiffMinutes(s.clockIn, s.clockOut), 0);
  }
  return hhmmDiffMinutes(record?.clockIn, record?.clockOut);
}

/** Normalized list of { sessionId, label, clockIn, clockOut } punches for
 *  display, whether the record uses the new multi-session shape or the
 *  legacy single pair. */
export function getSessionPunches(record) {
  if (record?.sessions?.length) return record.sessions;
  if (record?.clockIn || record?.clockOut) {
    return [{ sessionId: 'full', label: '', clockIn: record?.clockIn || '', clockOut: record?.clockOut || '' }];
  }
  return [];
}

/** The session blocks an employee is expected to clock against for a shift.
 *  'split' shifts use their configured sessions array; everything else
 *  (including no shift at all) is treated as one plain session. */
export function getShiftSessions(shift) {
  if (!shift) return [{ id: 'full', label: '', start: '', end: '' }];
  if (shift.clockType === 'split' && shift.sessions?.length) return shift.sessions;
  return [{ id: 'full', label: '', start: shift.start, end: shift.end }];
}

/** "H 'h' MM 'm'" formatter for a minute count, e.g. 780 -> "13h 00m". */
export function minutesToHHMM(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
}

/** Build the day's punch list for an employee's shift, carrying over
 *  whatever has already been clocked on the existing record (if any), so a
 *  record started under one shift configuration still lines up correctly. */
export function buildSessionsForShift(shift, existingRecord) {
  const shiftSessions = getShiftSessions(shift);
  // If the record already has a sessions array, ONLY use explicit per-session
  // data — never fall back to the top-level clockIn/clockOut for individual
  // sessions. The legacy top-level pair is only used when the record has NO
  // sessions at all (i.e. it was created before multi-session support).
  const hasSessionData = (existingRecord?.sessions?.length ?? 0) > 0;
  return shiftSessions.map((ss, i) => {
    const existing = existingRecord?.sessions?.find(s => s.sessionId === ss.id)
      ?? existingRecord?.sessions?.[i];
    return {
      sessionId: ss.id,
      label: ss.label || '',
      clockIn:  existing?.clockIn
        ?? (!hasSessionData && i === 0 ? (existingRecord?.clockIn || '') : ''),
      clockOut: existing?.clockOut
        ?? (!hasSessionData && i === shiftSessions.length - 1 ? (existingRecord?.clockOut || '') : ''),
    };
  });
}

/** Index of the session the employee should act on next.
 *
 *  Sessions are processed STRICTLY IN ORDER — a session must be fully
 *  completed (clockIn AND clockOut) before the next one becomes actionable.
 *  Within the current session:
 *    - no clockIn yet       → next action is Clock In
 *    - clockIn but no clockOut → next action is Clock Out
 *  Returns -1 when every session is fully punched. */
export function nextActionableSessionIndex(sessions) {
  for (let i = 0; i < sessions.length; i++) {
    // Not yet clocked in → clock in here
    if (!sessions[i].clockIn) return i;
    // Clocked in but not out → clock out here before moving to next session
    if (!sessions[i].clockOut) return i;
    // Fully complete → check next session
  }
  return -1;
}

/** Collapses a sessions array back into the legacy top-level clockIn/clockOut
 *  pair (first session's in, last session's out) so older parts of the app
 *  that only know about a single pair — and the web app's own list views —
 *  keep working unchanged. */
export function deriveLegacyPair(sessions) {
  const withPunches = (sessions || []).filter(s => s.clockIn || s.clockOut);
  return {
    clockIn: withPunches[0]?.clockIn || '',
    clockOut: withPunches[withPunches.length - 1]?.clockOut || '',
  };
}