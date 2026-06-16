import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import BarChart from '../components/BarChart';
import { useAuth } from '../context/AuthContext';
import { getSubscription } from '../util/db';

// ─── helpers ────────────────────────────────────────────────────────────────
// Same normalization/parsing conventions used by DashboardScreen and
// AttendanceScreen, so all three screens agree on the numbers they show.

function normalizeRecord(r) {
  return {
    employeeId: r.employeeId ?? r.employee_id ?? r.empId ?? r.emp_id ?? '',
    date:       r.date ?? r.attendanceDate ?? r.attendance_date ?? r.day ?? '',
    // Records are written with clockIn/clockOut (see AttendanceScreen's
    // handleClockAction) — check those first, then fall back to legacy aliases.
    checkIn:    r.clockIn  ?? r.checkIn  ?? r.check_in  ?? r.timeIn  ?? r.time_in  ?? null,
    checkOut:   r.clockOut ?? r.checkOut ?? r.check_out ?? r.timeOut ?? r.time_out ?? null,
    status:     (r.status ?? '').toString().toLowerCase(),
    hours:      r.hours ?? r.hoursWorked ?? r.hours_worked ?? null,
  };
}

/** Robustly extract YYYY-MM-DD from any stored date value */
function toDateKey(val) {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(val).slice(0, 10);
}

/** Compute hours between two "HH:MM" clock-in/out strings */
function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const inMatch  = String(checkIn).match(timeRegex);
  const outMatch = String(checkOut).match(timeRegex);
  if (inMatch && outMatch) {
    const inMins  = parseInt(inMatch[1],  10) * 60 + parseInt(inMatch[2],  10);
    const outMins = parseInt(outMatch[1], 10) * 60 + parseInt(outMatch[2], 10);
    const diff = (outMins - inMins) / 60;
    return diff > 0 ? diff : 0;
  }
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

function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STANDARD_HOURS = 8;

// ─── component ──────────────────────────────────────────────────────────────

export default function ReportScreen({ navigation }) {
  const { account } = useAuth();

  const now = new Date();
  const [selectedYear]    = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRecords, setAllRecords] = useState([]);

  const subscriptionId = account?.subscriptionId ?? null;
  const employeeId     = account?.employeeId     ?? null;

  const fetchData = useCallback(async () => {
    if (!subscriptionId || !employeeId) { setLoading(false); return; }
    try {
      const sub = await getSubscription(subscriptionId);
      if (!sub) return;
      const records = (sub.attendanceRecords ?? [])
        .map(normalizeRecord)
        .filter(r => String(r.employeeId).trim() === String(employeeId).trim());
      setAllRecords(records);
    } catch (err) {
      console.warn('[Report] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subscriptionId, employeeId]);

  useEffect(() => { fetchData(); }, [fetchData, refreshing]);

  const onRefresh = useCallback(() => setRefreshing(true), []);

  // ── per-month breakdown for the whole year (for the month list) ─────────
  const months = MONTHS.map((label, idx) => {
    const prefix = monthPrefix(selectedYear, idx);
    const recs = allRecords.filter(r => toDateKey(r.date).startsWith(prefix));
    return {
      month:   label,
      present: recs.filter(r => r.status === 'present').length,
      late:    recs.filter(r => r.status === 'late').length,
      absent:  recs.filter(r => r.status === 'absent').length,
    };
  });

  const current = months[selectedMonth] ?? months[0];

  // ── working hours for the selected month ────────────────────────────────
  const selectedPrefix  = monthPrefix(selectedYear, selectedMonth);
  const monthRecords    = allRecords.filter(r => toDateKey(r.date).startsWith(selectedPrefix));

  let totalH = 0, overtimeH = 0;
  for (const r of monthRecords) {
    const h = r.hours != null ? Number(r.hours) : hoursBetween(r.checkIn, r.checkOut);
    totalH += h;
    if (h > STANDARD_HOURS) overtimeH += h - STANDARD_HOURS;
  }

  // ── year-to-date totals (Summary card) ───────────────────────────────────
  const totalPresent = months.reduce((sum, m) => sum + m.present, 0);
  const totalLate    = months.reduce((sum, m) => sum + m.late, 0);
  const totalAbsent  = months.reduce((sum, m) => sum + m.absent, 0);

  // ── date range label for the Working Hours card ─────────────────────────
  const monthStart = new Date(selectedYear, selectedMonth, 1);
  const monthEnd   = new Date(selectedYear, selectedMonth + 1, 0);
  const dateRangeLabel = `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.body}>
          {/* Working Hours Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <View style={styles.dateRangeBtn}>
              <Text style={styles.dateRangeText}>{dateRangeLabel}</Text>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.hoursRow}>
              <Ionicons name="time-outline" size={15} color={colors.purple} />
              <Text style={styles.hoursLabel}>Total Hours</Text>
              <Text style={styles.hoursValue}>{fmtHours(totalH)}</Text>
            </View>
            <View style={[styles.hoursRow, { marginTop: spacing.sm }]}>
              <MaterialCommunityIcons name="lightning-bolt-circle" size={15} color={colors.late} />
              <Text style={styles.hoursLabel}>Overtime</Text>
              <Text style={[styles.hoursValue, { color: colors.late }]}>{fmtHours(overtimeH)}</Text>
            </View>
            {/* Bars reflect this week's actual clock in/out hours per day */}
            <BarChart style={{ marginTop: spacing.lg }} />
          </View>

          {/* Total Attendance */}
          <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
            <Text style={styles.sectionTitle}>Total Attendance (Days)</Text>
            <View style={styles.monthPicker}>
              <Text style={styles.monthText}>{MONTHS[selectedMonth]}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceStat}>
                <Text style={[styles.bigNum, { color: colors.present }]}>{current.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={[styles.attendanceStat, styles.statMiddle]}>
                <Text style={[styles.bigNum, { color: colors.late }]}>{current.late}</Text>
                <Text style={styles.statLabel}>Late Login</Text>
              </View>
              <View style={styles.attendanceStat}>
                <Text style={[styles.bigNum, { color: colors.absent }]}>{current.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Month rows */}
            {months.map((m, idx) => (
              <TouchableOpacity
                key={m.month}
                style={[styles.monthRow, selectedMonth === idx && styles.monthRowActive]}
                onPress={() => setSelectedMonth(idx)}
              >
                <Text style={styles.monthRowLabel}>{m.month} {selectedYear}</Text>
                <View style={styles.monthBars}>
                  <View style={styles.monthStat}>
                    <View style={[styles.dot, { backgroundColor: colors.present }]} />
                    <Text style={styles.monthStatText}>{m.present}</Text>
                  </View>
                  <View style={styles.monthStat}>
                    <View style={[styles.dot, { backgroundColor: colors.late }]} />
                    <Text style={styles.monthStatText}>{m.late}</Text>
                  </View>
                  <View style={styles.monthStat}>
                    <View style={[styles.dot, { backgroundColor: colors.absent }]} />
                    <Text style={styles.monthStatText}>{m.absent}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary card */}
          <View style={[styles.card, { marginTop: spacing.md, flexDirection: 'row', gap: spacing.md }]}>
            <View style={[styles.summaryItem, { backgroundColor: colors.present + '15' }]}>
              <Text style={[styles.summaryNum, { color: colors.present }]}>{totalPresent}</Text>
              <Text style={styles.summaryLabel}>Total Present</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.late + '15' }]}>
              <Text style={[styles.summaryNum, { color: colors.late }]}>{totalLate}</Text>
              <Text style={styles.summaryLabel}>Total Late</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.absent + '15' }]}>
              <Text style={[styles.summaryNum, { color: colors.absent }]}>{totalAbsent}</Text>
              <Text style={styles.summaryLabel}>Total Absent</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },

  body: { padding: spacing.xl },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  dateRangeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dateRangeText: { fontSize: 12, color: colors.textSecondary },
  monthPicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  monthText: { fontSize: 13, color: colors.textSecondary },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hoursLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  hoursValue: { fontSize: 13, fontWeight: '700', color: colors.text },

  attendanceRow: { flexDirection: 'row' },
  attendanceStat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  bigNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  monthRowActive: { backgroundColor: colors.primary + '10' },
  monthRowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  monthBars: { flexDirection: 'row', gap: spacing.md, marginRight: spacing.sm },
  monthStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  monthStatText: { fontSize: 12, color: colors.textSecondary, minWidth: 16 },

  summaryItem: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
});