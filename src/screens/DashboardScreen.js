import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import BarChart from '../components/BarChart';
import { useAuth } from '../context/AuthContext';
import { getSubscription } from '../util/db';

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeRecord(r) {
  return {
    // Try every known field name variant
    employeeId: r.employeeId ?? r.employee_id ?? r.empId ?? r.emp_id ?? '',
    // date is stored as plain "YYYY-MM-DD" from the web app
    date:       r.date ?? r.attendanceDate ?? r.attendance_date ?? r.day ?? '',
    checkIn:    r.checkIn    ?? r.check_in  ?? r.timeIn  ?? r.time_in  ?? r.clockIn  ?? r.clock_in  ?? null,
    checkOut:   r.checkOut   ?? r.check_out ?? r.timeOut ?? r.time_out ?? r.clockOut ?? r.clock_out ?? null,
    // Preserve split-shift session punches so the dashboard time card can
    // render Morning / Afternoon / Evening rows instead of a single pair.
    sessions:   Array.isArray(r.sessions) ? r.sessions : [],
    status:     (r.status ?? '').toString().toLowerCase(),
    hours:      r.hours      ?? r.hoursWorked ?? r.hours_worked ?? null,
  };
}

/**
 * Robustly extract YYYY-MM-DD from any date value.
 * Handles: ISO timestamps, plain "YYYY-MM-DD", "DD/MM/YYYY", Date objects.
 */
function toDateKey(val) {
  if (!val) return '';

  // Already a YYYY-MM-DD string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }

  // Try parsing as a Date
  const d = new Date(val);
  if (!Number.isNaN(d.getTime())) {
    // Use local date parts to avoid UTC-offset shifting the day
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(val).slice(0, 10);
}

/** Today's date as YYYY-MM-DD in local time */
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse hours from a checkIn/checkOut pair.
 * The web app stores times as "HH:MM" strings (not full ISO), so we
 * compute the difference by parsing just the time portion.
 */
function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  // "HH:MM" format (what the web app stores)
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const inMatch  = String(checkIn).match(timeRegex);
  const outMatch = String(checkOut).match(timeRegex);

  if (inMatch && outMatch) {
    const inMins  = parseInt(inMatch[1],  10) * 60 + parseInt(inMatch[2],  10);
    const outMins = parseInt(outMatch[1], 10) * 60 + parseInt(outMatch[2], 10);
    const diff = (outMins - inMins) / 60;
    return diff > 0 ? diff : 0;
  }

  // Fall back to ISO timestamp diff
  const inT  = new Date(checkIn);
  const outT = new Date(checkOut);
  if (Number.isNaN(inT.getTime()) || Number.isNaN(outT.getTime())) return 0;
  const diff = (outT - inT) / 3_600_000;
  return diff > 0 ? diff : 0;
}

/** Format decimal hours → "HH:MM hrs" */
function fmtHours(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} hrs`;
}

/** Format a "HH:MM" time string to "08:00 AM" */
function fmtTime(val) {
  if (!val) return '--';
  const m = String(val).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return val;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = String(h % 12 || 12).padStart(2, '0');
  return `${h12}:${min} ${ampm}`;
}

function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── component ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { account } = useAuth();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear]  = useState(now.getFullYear());
  const [clockTime, setClockTime]   = useState(new Date());
  const [loading,   setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [stats,       setStats]       = useState({ present: 0, late: 0, absent: 0 });
  const [workingHours, setWorkingHours] = useState({ total: 0, overtime: 0 });
  const [employee,    setEmployee]    = useState(null);

  // Live clock — isolated effect, never causes data re-fetch
  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Extract stable primitives — objects in deps cause infinite re-renders
  const subscriptionId = account?.subscriptionId ?? null;
  const employeeId     = account?.employeeId     ?? null;

  useEffect(() => {
    if (!subscriptionId || !employeeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const sub = await getSubscription(subscriptionId);
        if (cancelled || !sub) return;

        // ── Debug: log first few raw records so you can see the exact shape
        if (__DEV__) {
          const sample = (sub.attendanceRecords ?? []).slice(0, 3);
          console.log('[Dashboard] employeeId from account:', employeeId);
          console.log('[Dashboard] sample attendance_records:', JSON.stringify(sample, null, 2));
          console.log('[Dashboard] enrolledEmployees[0]:', JSON.stringify((sub.enrolledEmployees ?? [])[0], null, 2));
        }

        // ── find the employee ───────────────────────────────────────────
        // accountEmployeeId is the id stored in accounts.employee_id (what the
        // mobile app uses). e.id is the enrolledEmployee's own generated id.
        // We match on EITHER so the lookup works regardless of which was stored.
        const empId = String(employeeId ?? '').trim();
        const emp = (sub.enrolledEmployees ?? []).find(e => {
          const byId            = String(e.id             ?? '').trim();
          const byAccountEmpId  = String(e.accountEmployeeId ?? '').trim();
          const byEmployeeId    = String(e.employeeId     ?? e.employee_id ?? '').trim();
          return byId === empId || byAccountEmpId === empId || byEmployeeId === empId;
        }) ?? null;

        if (__DEV__) {
          console.log('[Dashboard] empId looking for:', empId);
          console.log('[Dashboard] emp found:', emp ? `${emp.firstName} ${emp.lastName}` : 'NOT FOUND');
          console.log('[Dashboard] profilePhotoUrl:', emp?.profilePhotoUrl ?? 'none');
          console.log('[Dashboard] employeeCode:', emp?.employeeCode ?? 'none');
        }

        // ── filter records for this employee ────────────────────────────
        const allRecords = (sub.attendanceRecords ?? [])
          .map(normalizeRecord)
          .filter(r => String(r.employeeId).trim() === String(employeeId).trim());

        if (__DEV__) {
          console.log('[Dashboard] matched records count:', allRecords.length);
          console.log('[Dashboard] todayKey:', todayKey());
          console.log('[Dashboard] record dates:', allRecords.map(r => r.date));
        }

        // ── today ───────────────────────────────────────────────────────
        const tKey   = todayKey();
        const todayRec = allRecords.find(r => toDateKey(r.date) === tKey) ?? null;

        // ── monthly stats ───────────────────────────────────────────────
        const prefix       = monthPrefix(selectedYear, selectedMonth);
        const monthRecords = allRecords.filter(r => toDateKey(r.date).startsWith(prefix));

        const present = monthRecords.filter(r => r.status === 'present').length;
        const late    = monthRecords.filter(r => r.status === 'late').length;
        const absent  = monthRecords.filter(r => r.status === 'absent').length;

        // ── working hours ───────────────────────────────────────────────
        const STANDARD_HOURS = 8;
        let totalH = 0, overtimeH = 0;
        for (const r of monthRecords) {
          const h = r.hours != null
            ? Number(r.hours)
            : hoursBetween(r.checkIn, r.checkOut);
          totalH += h;
          if (h > STANDARD_HOURS) overtimeH += h - STANDARD_HOURS;
        }

        if (!cancelled) {
          setEmployee(emp);
          setTodayRecord(todayRec);
          setStats({ present, late, absent });
          setWorkingHours({ total: totalH, overtime: overtimeH });
        }
      } catch (err) {
        console.warn('[Dashboard] fetch error:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [subscriptionId, employeeId, selectedMonth, selectedYear, refreshing]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => setRefreshing(true), []);

  // ── derived display values ──────────────────────────────────────────────
  const displayName = employee
    ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
    : (account?.name ?? '');

  const initials = displayName
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const role         = employee?.role ?? account?.role ?? '';
  const department   = employee?.department ?? '';
  const employeeCode = employee?.employeeCode ?? employee?.employee_code ?? employee?.empCode ?? employee?.emp_code ?? employee?.code ?? '';
  const joinDate     = employee?.joinDate ?? employee?.join_date ?? employee?.startDate ?? employee?.start_date ?? '';
  const email        = employee?.email ?? account?.email ?? '';
  const shift        = employee?.shiftName ?? employee?.shift ?? '';
  const address        = employee?.address ?? employee?.location ?? '';
  const profilePhotoUrl = employee?.profilePhotoUrl ?? employee?.profile_photo_url ?? employee?.photoUrl ?? employee?.photo_url ?? employee?.avatar ?? employee?.avatarUrl ?? employee?.avatar_url ?? null;

  function fmtJoinDate(val) {
    if (!val) return '';
    const d = new Date(`${String(val).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const hh   = clockTime.getHours();
  const mm   = String(clockTime.getMinutes()).padStart(2, '0');
  const ss   = String(clockTime.getSeconds()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hh12 = String(hh % 12 || 12).padStart(2, '0');

  const todayLabel = now.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const prevMonth = () => setSelectedMonth(m => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setSelectedMonth(m => (m === 11 ? 0 : m + 1));

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.white}
            colors={[colors.primary]}
            progressBackgroundColor={colors.brown}
            progressViewOffset={0}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          {/* Top row: greeting + notif */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerGreeting}>Good {hh < 12 ? 'Morning' : hh < 17 ? 'Afternoon' : 'Evening'} 👋</Text>
              <Text style={styles.headerDate}>{todayLabel}</Text>
            </View>
            <View style={styles.notifBadge}>
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              <View style={styles.badge} />
            </View>
          </View>

          {/* Profile card — centered */}
          <View style={styles.profileCard}>
            {/* Avatar: photo or initials fallback */}
            <View style={styles.profileAvatarWrap}>
              {profilePhotoUrl ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.profileAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileAvatarFallback}>
                  <Text style={styles.profileAvatarText}>{initials || '?'}</Text>
                </View>
              )}
              <View style={styles.profileActiveDot} />
            </View>

            {/* Name / role / code stacked centered */}
            <Text style={styles.profileName} numberOfLines={1}>{displayName || 'Employee'}</Text>
            {!!role && (
              <Text style={styles.profileRole}>
                {role}{!!department ? ` · ${department}` : ''}
              </Text>
            )}
            {!!employeeCode && (
              <View style={styles.profileCodeBadge}>
                <Text style={styles.profileCodeText}>{employeeCode}</Text>
              </View>
            )}
          </View>

          {/* Detail rows — centered */}
          {(!!email || !!shift || !!joinDate) && (
            <View style={styles.profileDetails}>
              {!!email && (
                <View style={styles.profileDetailRow}>
                  <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.profileDetailText} numberOfLines={1}>{email}</Text>
                </View>
              )}
              {!!shift && (
                <View style={styles.profileDetailRow}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.profileDetailText}>{shift}</Text>
                </View>
              )}
              {!!joinDate && (
                <View style={styles.profileDetailRow}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.profileDetailText}>Joined {fmtJoinDate(joinDate)}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>Working Time</Text>
            <View style={styles.clockRow}>
              <Text style={styles.clockNum}>{hh12}</Text>
              <Text style={styles.clockColon}>:</Text>
              <Text style={styles.clockNum}>{mm}</Text>
              <Text style={styles.clockColon}>:</Text>
              <Text style={styles.clockSec}>{ss}</Text>
              <Text style={styles.clockAMPM}>{ampm}</Text>
            </View>

            {todayRecord?.checkIn ? (
              todayRecord.sessions?.length >= 1 ? (
                /* ── Split shift: one row per session ── */
                <View style={styles.sessionsContainer}>
                  {todayRecord.sessions.map((s, idx) => {
                    const hasIn  = !!s.clockIn;
                    const hasOut = !!s.clockOut;
                    const isOpen = hasIn && !hasOut;
                    return (
                      <View key={s.sessionId ?? idx} style={styles.sessionRow}>
                        <View style={[
                          styles.sessionDot,
                          { backgroundColor: hasIn ? (isOpen ? colors.late : colors.present) : colors.border },
                        ]} />
                        <Text style={styles.sessionLabel}>{s.label || `Session ${idx + 1}`}</Text>
                        <View style={styles.sessionTimes}>
                          <Ionicons name="log-in-outline" size={11} color={hasIn ? colors.present : colors.border} />
                          <Text style={[styles.sessionTime, !hasIn && styles.sessionTimeMuted]}>
                            {hasIn ? fmtTime(s.clockIn) : '--:--'}
                          </Text>
                          <Text style={styles.sessionDash}>–</Text>
                          <Ionicons name="log-out-outline" size={11} color={hasOut ? colors.absent : colors.border} />
                          <Text style={[styles.sessionTime, !hasOut && styles.sessionTimeMuted]}>
                            {hasOut ? fmtTime(s.clockOut) : isOpen ? 'ongoing' : '--:--'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* ── Standard single pair ── */
                <View style={styles.checkTimesRow}>
                  <View style={styles.checkTimeItem}>
                    <Ionicons name="log-in-outline" size={13} color={colors.present} />
                    <Text style={styles.checkTimeLabel}>In  </Text>
                    <Text style={styles.checkTimeValue}>{fmtTime(todayRecord.checkIn)}</Text>
                  </View>
                  {todayRecord?.checkOut ? (
                    <View style={styles.checkTimeItem}>
                      <Ionicons name="log-out-outline" size={13} color={colors.absent} />
                      <Text style={styles.checkTimeLabel}>Out  </Text>
                      <Text style={styles.checkTimeValue}>{fmtTime(todayRecord.checkOut)}</Text>
                    </View>
                  ) : null}
                </View>
              )
            ) : null}

            {!!address && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={styles.locationText} numberOfLines={2}>{address}</Text>
              </View>
            )}

            <View style={[
              styles.statusBadge,
              { backgroundColor: !todayRecord            ? colors.textMuted
                  : todayRecord.status === 'present'     ? colors.present
                  : todayRecord.status === 'late'        ? colors.late
                  : colors.absent },
            ]}>
              <Text style={styles.statusBadgeText}>
                {!todayRecord
                  ? 'Not Recorded Yet'
                  : todayRecord.status.charAt(0).toUpperCase() + todayRecord.status.slice(1) + ' Today'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <View style={styles.bodyWrap}>
        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Total Attendance (Days)</Text>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{MONTHS[selectedMonth]}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: colors.present }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={[styles.statNum, { color: colors.late }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: colors.absent }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <Text style={styles.dateRangeText}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          </View>

          <View style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Ionicons name="time-outline" size={15} color={colors.purple} />
              <Text style={styles.hoursLabel}>Total Hours</Text>
              <Text style={styles.hoursValue}>{fmtHours(workingHours.total)}</Text>
            </View>
            <View style={[styles.hoursRow, { marginTop: spacing.sm }]}>
              <MaterialCommunityIcons name="lightning-bolt-circle" size={15} color={colors.late} />
              <Text style={styles.hoursLabel}>Overtime</Text>
              <Text style={[styles.hoursValue, { color: colors.late }]}>
                {fmtHours(workingHours.overtime)}
              </Text>
            </View>
            <BarChart style={{ marginTop: spacing.md }} />
          </View>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.brown },
  // ScrollView bg is brown so the overscroll bounce area matches the header
  scroll: { flex: 1, backgroundColor: colors.brown },
  scrollContent: { flexGrow: 1 },
  // Cream wrapper only covers the body section, not the overscroll zone
  bodyWrap: { backgroundColor: colors.cream },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.brown,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  headerGreeting: { color: colors.white, fontWeight: '700', fontSize: 16 },
  headerDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  notifBadge:  { position: 'relative', padding: 6 },
  badge: {
    position: 'absolute', top: 5, right: 5,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Profile card inside header — centered layout
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileAvatarWrap: { position: 'relative', marginBottom: spacing.md },
  // The outer circle (border ring) — used for fallback View
  profileAvatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  // Explicit img style so RN Image gets width/height directly
  profileAvatarImg: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  profileAvatarFallback: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { color: colors.white, fontWeight: '800', fontSize: 28 },
  profileActiveDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.present,
    borderWidth: 2, borderColor: colors.brown,
  },
  profileName: { color: colors.white, fontWeight: '800', fontSize: 20, textAlign: 'center' },
  profileRole: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 3, textAlign: 'center' },
  profileCodeBadge: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full,
  },
  profileCodeText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 1 },

  profileDetails: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    alignSelf: 'center',           // shrink-wrap to content width
    alignItems: 'center',          // center each row
    minWidth: '60%',
  },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  profileDetailText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  timeCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  timeLabel:  { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  clockRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
  clockNum:   { fontSize: 44, fontWeight: '800', color: colors.text, letterSpacing: 2 },
  clockColon: { fontSize: 44, fontWeight: '800', color: colors.text, marginHorizontal: 2 },
  clockSec:   { fontSize: 28, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  clockAMPM:  { fontSize: 20, fontWeight: '700', color: colors.text, marginLeft: 6, marginBottom: 8 },

  checkTimesRow:  { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.sm },
  checkTimeItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkTimeLabel: { fontSize: 12, color: colors.textMuted },
  checkTimeValue: { fontSize: 12, fontWeight: '700', color: colors.text },

  // Split-shift session rows inside the time card
  sessionsContainer: {
    width: '100%',
    marginBottom: spacing.sm,
    gap: 0,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  sessionDot:       { width: 7, height: 7, borderRadius: 3.5 },
  sessionLabel:     { fontSize: 11, fontWeight: '700', color: colors.textSecondary, width: 70 },
  sessionTimes:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  sessionTime:      { fontSize: 11, fontWeight: '600', color: colors.text },
  sessionTimeMuted: { color: colors.textMuted },
  sessionDash:      { fontSize: 11, color: colors.textMuted, marginHorizontal: 1 },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  locationText: {
    fontSize: 12, color: colors.textMuted,
    marginLeft: 4, textAlign: 'center', width: '80%',
  },
  statusBadge: {
    paddingHorizontal: spacing.lg, paddingVertical: 6,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  statusBadgeText: { color: colors.white, fontWeight: '600', fontSize: 13 },

  body: { padding: spacing.xl, paddingTop: spacing.xxl },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  monthSelector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.sm,
    paddingVertical: 4, paddingHorizontal: spacing.xs, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  monthArrow:    { padding: 2 },
  monthText:     { fontSize: 13, color: colors.textSecondary, minWidth: 28, textAlign: 'center' },
  dateRangeText: { fontSize: 12, color: colors.textSecondary },

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statCard:       { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statCardMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statNum:        { fontSize: 28, fontWeight: '800' },
  statLabel:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  hoursCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  hoursRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hoursLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  hoursValue: { fontSize: 13, fontWeight: '700', color: colors.text },
});