import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getSubscription, putSubscription } from '../util/db';

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKey(val) {
  if (!val) return null;
  const d = new Date(`${String(val).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeLeave(r) {
  return {
    id:          r.id ?? null,
    employeeId:  r.employeeId ?? r.employee_id ?? '',
    type:        r.type ?? r.leaveType ?? r.leave_type ?? '',
    startDate:   r.startDate ?? r.start_date ?? r.from ?? '',
    endDate:     r.endDate   ?? r.end_date   ?? r.to   ?? r.startDate ?? r.start_date ?? r.from ?? '',
    reason:      r.reason ?? '',
    status:      (r.status ?? 'pending').toString().toLowerCase(),
    submittedAt: r.submittedAt ?? r.submitted_at ?? r.createdAt ?? r.created_at ?? null,
  };
}

/** Inclusive day count between two YYYY-MM-DD dates */
function daysBetween(startKey, endKey) {
  const s = parseDateKey(startKey);
  const e = parseDateKey(endKey || startKey);
  if (!s || !e) return 0;
  const diff = Math.round((e - s) / 86_400_000) + 1;
  return diff > 0 ? diff : 0;
}

function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRange(startKey, endKey) {
  const s = parseDateKey(startKey);
  const e = parseDateKey(endKey || startKey);
  if (!s) return '--';
  if (!e || toDateKey(s) === toDateKey(e)) return fmtDate(s);
  return `${fmtDate(s)} - ${fmtDate(e)}`;
}

/** Returns all date keys (YYYY-MM-DD) between startKey and endKey inclusive */
function dateKeysInRange(startKey, endKey) {
  const keys = [];
  const s = parseDateKey(startKey);
  const e = parseDateKey(endKey || startKey);
  if (!s || !e) return keys;
  const cur = new Date(s);
  while (cur <= e) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

const BALANCE_COLORS = [colors.present, '#7C3AED', colors.absent, '#8b5cf6', '#f97316', '#06b6d4'];

const STATUS_COLORS = { approved: colors.present, pending: colors.late, rejected: colors.absent };
const STATUS_LABELS = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Calendar highlight colors
const CAL_HOLIDAY_BG   = '#EF4444';   // red for holidays
const CAL_LEAVE_BG     = '#3B82F6';   // blue for filed leave (approved)
const CAL_PENDING_BG   = '#F59E0B';   // amber for pending leave

/** Build a calendar grid (array of weeks, each 7 cells) for a given month */
function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function LeaveScreen() {
  const { account, subscription, setSubscription } = useAuth();
  const [tab, setTab] = useState('request');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType]     = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [startDate, setStartDate]     = useState(null);
  const [endDate, setEndDate]         = useState(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear]   = useState(new Date().getFullYear());
  const [reason, setReason]           = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear]   = useState(new Date().getFullYear());

  const subscriptionId = account?.subscriptionId ?? null;
  const employeeId     = account?.employeeId     ?? null;

  const fetchData = useCallback(async () => {
    if (!subscriptionId) { setLoading(false); return; }
    try {
      const sub = await getSubscription(subscriptionId);
      if (sub) setSubscription(sub);
    } catch (err) {
      console.warn('[Leave] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  useEffect(() => { fetchData(); }, [fetchData, refreshing]);

  const onRefresh = useCallback(() => setRefreshing(true), []);

  // ── derive this employee's leave requests ───────────────────────────────
  const allLeaveRequests = (subscription?.leaveRequests ?? [])
    .map(normalizeLeave)
    .filter(r => String(r.employeeId).trim() === String(employeeId ?? '').trim())
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));

  // ── Real leave types & balances from Supabase ───────────────────────────
  const leaveTypes = subscription?.settings?.leaveTypes ?? [];

  const thisEmployee = (subscription?.enrolledEmployees ?? [])
    .find(e => String(e.id) === String(employeeId ?? ''));

  // Count approved days per leave type from actual approved leave requests.
  // This is the source of truth — we never rely on the stored leaveBalances
  // field alone because the web admin approval flow does not always write a
  // deduction back to enrolledEmployees.leaveBalances.
  const approvedDaysByType = {};
  allLeaveRequests
    .filter(r => r.status === 'approved')
    .forEach(r => {
      const days = daysBetween(r.startDate, r.endDate);
      approvedDaysByType[r.type] = (approvedDaysByType[r.type] ?? 0) + days;
    });

  const leaveBalances = leaveTypes.map((type, i) => {
    const defaultBalance = type.defaultBalance ?? 0;
    // Remaining = total allocation − days already used in approved requests.
    const used = approvedDaysByType[type.name] ?? 0;
    const value = Math.max(0, defaultBalance - used);
    return {
      label: type.name,
      value,
      defaultBalance,
      used,
      color: BALANCE_COLORS[i % BALANCE_COLORS.length],
    };
  });

  // ── holidays from subscription settings ────────────────────────────────
  const holidayList = (subscription?.settings?.holidays ?? [])
    .map(h => ({ date: parseDateKey(h.date ?? h), title: h.title ?? h.name ?? 'Holiday' }))
    .filter(h => h.date)
    .sort((a, b) => a.date - b.date);

  const upcomingHolidays = holidayList.filter(h => h.date >= new Date(new Date().setHours(0, 0, 0, 0)));
  const holidayDateKeys = new Set(holidayList.map(h => toDateKey(h.date)));

  // ── build leave date maps (approved = blue, pending = amber) ────────────
  const approvedLeaveDateKeys = new Set();
  const pendingLeaveDateKeys  = new Set();

  allLeaveRequests.forEach(r => {
    const keys = dateKeysInRange(r.startDate, r.endDate);
    if (r.status === 'approved') {
      keys.forEach(k => approvedLeaveDateKeys.add(k));
    } else if (r.status === 'pending') {
      keys.forEach(k => pendingLeaveDateKeys.add(k));
    }
  });

  const calendarRows = buildCalendar(calYear, calMonth);

  const prevCalMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextCalMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── duration picker ─────────────────────────────────────────────────────
  const pickerRows = buildCalendar(pickerYear, pickerMonth);
  const todayKey = toDateKey(new Date());

  const prevPickerMonth = () => {
    setPickerMonth(m => {
      if (m === 0) { setPickerYear(y => y - 1); return 11; }
      return m - 1;
    });
  };
  const nextPickerMonth = () => {
    setPickerMonth(m => {
      if (m === 11) { setPickerYear(y => y + 1); return 0; }
      return m + 1;
    });
  };

  const openDurationPicker = () => {
    const base = startDate || new Date();
    setPickerMonth(base.getMonth());
    setPickerYear(base.getFullYear());
    setShowDurationPicker(true);
  };

  const handlePickerDayPress = (day) => {
    if (!day) return;
    const picked = new Date(pickerYear, pickerMonth, day);
    picked.setHours(0, 0, 0, 0);
    if (toDateKey(picked) < todayKey) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(picked);
      setEndDate(null);
    } else if (picked < startDate) {
      setStartDate(picked);
      setEndDate(null);
    } else {
      setEndDate(picked);
    }
  };

  const isInPickerRange = (day) => {
    if (!day || !startDate) return false;
    const cur = new Date(pickerYear, pickerMonth, day);
    cur.setHours(0, 0, 0, 0);
    const end = endDate || startDate;
    return cur >= startDate && cur <= end;
  };

  const isPickerEndpoint = (day) => {
    if (!day || !startDate) return false;
    const cur = toDateKey(new Date(pickerYear, pickerMonth, day));
    return cur === toDateKey(startDate) || (endDate && cur === toDateKey(endDate));
  };

  // ── submit a new leave request ───────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (!subscriptionId || !employeeId) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    if (!leaveType) {
      Alert.alert('Missing Info', 'Please select a leave type.');
      return;
    }
    if (!startDate) {
      Alert.alert('Missing Info', 'Please select a duration.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing Info', 'Please write a reason for your leave.');
      return;
    }

    setSubmitting(true);
    try {
      const sub = await getSubscription(subscriptionId);
      if (!sub) throw new Error('Failed to load subscription data.');

      const newRequest = {
        id:          `leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        employeeId:  String(employeeId),
        type:        leaveType,
        startDate:   toDateKey(startDate),
        endDate:     toDateKey(endDate || startDate),
        reason:      reason.trim(),
        status:      'pending',
        submittedAt: new Date().toISOString(),
      };

      const updatedRequests = [...(sub.leaveRequests ?? []), newRequest];
      const updatedSub = { ...sub, leaveRequests: updatedRequests };

      await putSubscription(updatedSub);
      setSubscription(updatedSub);

      setLeaveType('');
      setStartDate(null);
      setEndDate(null);
      setReason('');
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [subscriptionId, employeeId, leaveType, startDate, endDate, reason, setSubscription]);

  const durationLabel = startDate
    ? fmtRange(toDateKey(startDate), toDateKey(endDate || startDate))
    : 'Select';

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.body}>

          {/* ── Leave Balance ─────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Leave Balance</Text>

          {leaveBalances.length === 0 ? (
            <View style={styles.noBalanceBox}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={colors.textMuted} />
              <Text style={styles.noBalanceText}>No leave types configured yet</Text>
            </View>
          ) : (
            <View style={styles.balanceGrid}>
              {leaveBalances.map((b) => (
                <View
                  key={b.label}
                  style={[styles.balanceCard, { borderLeftColor: b.color }]}
                >
                  <View style={styles.balanceTopRow}>
                    <Text style={[styles.balanceNum, { color: b.color }]}>{b.value}</Text>
                    {b.defaultBalance > 0 && (
                      <Text style={styles.balanceDenom}>/ {b.defaultBalance}</Text>
                    )}
                  </View>
                  <Text style={styles.balanceLabel} numberOfLines={2}>{b.label}</Text>
                  {b.used > 0 && (
                    <Text style={styles.balanceUsed}>{b.used} day{b.used !== 1 ? 's' : ''} used</Text>
                  )}
                  {b.defaultBalance > 0 && (
                    <View style={styles.balanceBar}>
                      <View
                        style={[
                          styles.balanceBarFill,
                          {
                            backgroundColor: b.color,
                            width: `${Math.min(100, Math.round((b.value / b.defaultBalance) * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'request' && styles.tabBtnActive]}
              onPress={() => setTab('request')}
            >
              <Text style={[styles.tabText, tab === 'request' && styles.tabTextActive]}>
                Leave Request
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
                Leave History
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'request' ? (
            <>
              {/* ── Form ──────────────────────────────────────────────── */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Leave Type</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowTypeMenu(!showTypeMenu)}
                >
                  <Text style={leaveType ? styles.selectValue : styles.selectPlaceholder}>
                    {leaveType || 'Select'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showTypeMenu && (
                  <View style={styles.dropdown}>
                    {leaveTypes.length === 0 ? (
                      <View style={styles.dropdownItem}>
                        <Text style={[styles.dropdownText, { color: colors.textMuted }]}>
                          No leave types configured
                        </Text>
                      </View>
                    ) : (
                      leaveTypes.map((type) => (
                        <TouchableOpacity
                          key={type.name}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setLeaveType(type.name);
                            setShowTypeMenu(false);
                          }}
                        >
                          <Text style={styles.dropdownText}>{type.name}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Duration</Text>
                <TouchableOpacity style={styles.selectInput} onPress={openDurationPicker}>
                  <Text style={startDate ? styles.selectValue : styles.selectPlaceholder}>
                    {durationLabel}
                  </Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Write here"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.applyBtn, submitting && { opacity: 0.7 }]}
                onPress={handleApply}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.applyBtnText}>Apply for Leave</Text>
                )}
              </TouchableOpacity>

              {/* ── Unified Calendar (Leave + Holidays) ───────────────── */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>
                Schedule Overview
              </Text>

              <View style={styles.calendarCard}>
                {/* Month nav */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarArrow} onPress={prevCalMonth}>
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>{MONTHS[calMonth]} {calYear}</Text>
                  <TouchableOpacity style={styles.calendarArrow} onPress={nextCalMonth}>
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CAL_LEAVE_BG }]} />
                    <Text style={styles.legendText}>Approved Leave</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CAL_PENDING_BG }]} />
                    <Text style={styles.legendText}>Pending Leave</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CAL_HOLIDAY_BG }]} />
                    <Text style={styles.legendText}>Holiday</Text>
                  </View>
                </View>

                {/* Weekday headers */}
                <View style={styles.weekRow}>
                  {WEEK_DAYS.map((d) => (
                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                  ))}
                </View>

                {/* Calendar grid */}
                {calendarRows.map((row, ri) => (
                  <View key={ri} style={styles.calendarRow}>
                    {row.map((day, ci) => {
                      const dayKey = day ? toDateKey(new Date(calYear, calMonth, day)) : null;
                      const isHoliday  = dayKey && holidayDateKeys.has(dayKey);
                      const isApproved = dayKey && approvedLeaveDateKeys.has(dayKey);
                      const isPending  = dayKey && pendingLeaveDateKeys.has(dayKey);
                      const isToday    = dayKey === todayKey;

                      // Priority: holiday > approved leave > pending leave
                      let dotBg = null;
                      if (isHoliday)  dotBg = CAL_HOLIDAY_BG;
                      else if (isApproved) dotBg = CAL_LEAVE_BG;
                      else if (isPending)  dotBg = CAL_PENDING_BG;

                      // Tooltip info for long-press would need RN Tooltip; just use dot for now
                      const hasHighlight = !!dotBg;

                      // Find holiday title for the day (if any)
                      const holidayForDay = isHoliday
                        ? holidayList.find(h => toDateKey(h.date) === dayKey)
                        : null;

                      return (
                        <View key={ci} style={styles.calendarCell}>
                          {day ? (
                            <View style={[
                              styles.dayCircle,
                              isToday && styles.dayCircleToday,
                              hasHighlight && { backgroundColor: dotBg },
                            ]}>
                              <Text style={[
                                styles.dayText,
                                isToday && !hasHighlight && styles.dayTextToday,
                                hasHighlight && styles.dayTextHighlight,
                              ]}>
                                {day}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.dayTextEmpty} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* ── Upcoming Holidays list ─────────────────────────────── */}
              {upcomingHolidays.length === 0 ? (
                <View style={styles.noHolidays}>
                  <Text style={styles.noHolidaysText}>No upcoming holidays scheduled</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.sectionSubtitle, { marginBottom: spacing.sm }]}>
                    Upcoming Holidays
                  </Text>
                  {upcomingHolidays.map((h, i) => (
                    <View key={i} style={styles.holidayItem}>
                      <View style={[styles.holidayDot, { backgroundColor: CAL_HOLIDAY_BG }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.holidayTitle}>{h.title}</Text>
                        <Text style={styles.holidaySubtitle}>
                          {h.date.toLocaleDateString('en-US', {
                            weekday: 'long', day: 'numeric', month: 'long',
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ── Pending / Approved leave list ─────────────────────── */}
              {allLeaveRequests.filter(r => r.status === 'approved' || r.status === 'pending').length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                    Filed Leave
                  </Text>
                  {allLeaveRequests
                    .filter(r => r.status === 'approved' || r.status === 'pending')
                    .map((r) => (
                      <View key={r.id} style={styles.holidayItem}>
                        <View style={[
                          styles.holidayDot,
                          { backgroundColor: r.status === 'approved' ? CAL_LEAVE_BG : CAL_PENDING_BG },
                        ]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.holidayTitle}>{r.type}</Text>
                          <Text style={styles.holidaySubtitle}>{fmtRange(r.startDate, r.endDate)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[r.status] ?? colors.textMuted) + '20' }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLORS[r.status] ?? colors.textMuted }]}>
                            {STATUS_LABELS[r.status] ?? r.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  }
                </>
              )}
            </>
          ) : (
            allLeaveRequests.length === 0 ? (
              <View style={styles.historyEmpty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.textMuted} />
                <Text style={styles.historyEmptyText}>No leave history yet</Text>
              </View>
            ) : (
              allLeaveRequests.map((r) => (
                <View key={r.id} style={styles.historyItem}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyType}>{r.type}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[r.status] ?? colors.textMuted) + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[r.status] ?? colors.textMuted }]}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyDates}>{fmtRange(r.startDate, r.endDate)}</Text>
                  {!!r.reason && <Text style={styles.historyReason}>{r.reason}</Text>}
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* ── Duration Picker Modal ────────────────────────────────────────── */}
      <Modal visible={showDurationPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeaderRow}>
              <Text style={styles.pickerTitle}>Select Duration</Text>
              <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarArrow} onPress={prevPickerMonth}>
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{MONTHS[pickerMonth]} {pickerYear}</Text>
              <TouchableOpacity style={styles.calendarArrow} onPress={nextPickerMonth}>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((d) => (
                <Text key={d} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>

            {pickerRows.map((row, ri) => (
              <View key={ri} style={styles.calendarRow}>
                {row.map((day, ci) => {
                  const inRange = isInPickerRange(day);
                  const isEndpoint = isPickerEndpoint(day);
                  const dayKey = day ? toDateKey(new Date(pickerYear, pickerMonth, day)) : null;
                  const isPast = dayKey && dayKey < todayKey;
                  return (
                    <TouchableOpacity
                      key={ci}
                      style={styles.calendarCell}
                      disabled={!day || isPast}
                      onPress={() => handlePickerDayPress(day)}
                    >
                      {day ? (
                        <View style={[
                          styles.dayCircle,
                          inRange && styles.dayCircleInRange,
                          isEndpoint && styles.dayCircleSelected,
                        ]}>
                          <Text style={[
                            styles.dayText,
                            isPast && styles.dayTextPast,
                            (inRange || isEndpoint) && styles.dayTextSelected,
                          ]}>
                            {day}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.dayTextEmpty} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={styles.pickerHint}>
              {!startDate
                ? 'Tap a day to start, then tap another to set the end date'
                : !endDate
                  ? `Start: ${fmtDate(startDate)} — tap another day to set the end date, or confirm for a single day`
                  : `${fmtDate(startDate)} - ${fmtDate(endDate)}`}
            </Text>

            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.pickerClearBtn}
                onPress={() => { setStartDate(null); setEndDate(null); }}
              >
                <Text style={styles.pickerClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerConfirmBtn, !startDate && { opacity: 0.5 }]}
                disabled={!startDate}
                onPress={() => setShowDurationPicker(false)}
              >
                <Text style={styles.pickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ────────────────────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconOuter}>
              <View style={styles.modalIconInner}>
                <Ionicons name="checkmark" size={28} color={colors.white} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Congratulations</Text>
            <Text style={styles.modalSubtitle}>
              Your leave application has been applied successfully
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },

  body: { padding: spacing.xl },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  sectionSubtitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },

  // ── Leave Balance ──────────────────────────────────────────────────────
  noBalanceBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  noBalanceText: { fontSize: 13, color: colors.textMuted },

  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  balanceCard: {
    // Takes half the row minus gap; on small screens can wrap to full width
    minWidth: '47%',
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  balanceTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 2 },
  balanceNum: { fontSize: 28, fontWeight: '800' },
  balanceDenom: { fontSize: 13, color: colors.textMuted },
  balanceLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  balanceBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  balanceUsed: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  balanceBarFill: { height: '100%', borderRadius: 2 },

  // ── Tabs ──────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tabBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },

  // ── Form ──────────────────────────────────────────────────────────────
  formGroup: { marginBottom: spacing.lg },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  selectInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectValue: { fontSize: 14, color: colors.text },
  selectPlaceholder: { fontSize: 14, color: colors.textMuted },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: { fontSize: 14, color: colors.text },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 90,
    fontSize: 14,
    color: colors.text,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  applyBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  // ── Calendar ──────────────────────────────────────────────────────────
  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  calendarArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.cream,
    justifyContent: 'center', alignItems: 'center',
  },
  calendarTitle: { fontSize: 14, fontWeight: '700', color: colors.text },

  legendRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary },

  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekDayText: {
    flex: 1, textAlign: 'center',
    fontSize: 12, color: colors.textMuted, fontWeight: '600',
  },
  calendarRow: { flexDirection: 'row', marginBottom: spacing.xs },
  calendarCell: { flex: 1, alignItems: 'center' },
  dayCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayText: { fontSize: 13, color: colors.text },
  dayTextToday: { color: colors.primary, fontWeight: '700' },
  dayTextHighlight: { color: colors.white, fontWeight: '700' },
  dayTextEmpty: { fontSize: 13 },

  dayCircleInRange: { backgroundColor: colors.primary + '22' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayTextPast: { color: colors.textMuted, opacity: 0.4 },
  dayTextSelected: { color: colors.white, fontWeight: '700' },

  // ── Holiday / Filed Leave items ───────────────────────────────────────
  noHolidays: { paddingVertical: spacing.lg, alignItems: 'center' },
  noHolidaysText: { fontSize: 13, color: colors.textMuted },

  holidayItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  holidayDot: {
    width: 10, height: 10, borderRadius: 5,
    marginTop: 2,
    flexShrink: 0,
  },
  holidayTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  holidaySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // ── History ───────────────────────────────────────────────────────────
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  historyEmptyText: { fontSize: 14, color: colors.textMuted },

  historyItem: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  historyType: { fontSize: 14, fontWeight: '700', color: colors.text },
  historyDates: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  historyReason: { fontSize: 12, color: colors.textMuted },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  statusText: { fontSize: 11, fontWeight: '700' },

  // ── Modals ────────────────────────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pickerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
  },
  pickerHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  pickerHint: {
    fontSize: 12, color: colors.textSecondary, textAlign: 'center',
    marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 17,
  },
  pickerActions: { flexDirection: 'row', gap: spacing.sm },
  pickerClearBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerClearText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  pickerConfirmBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pickerConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  modalIconOuter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.purple + '18',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconInner: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.purple,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  modalSubtitle: {
    fontSize: 13, color: colors.textMuted, textAlign: 'center',
    marginBottom: spacing.xl, lineHeight: 18,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});