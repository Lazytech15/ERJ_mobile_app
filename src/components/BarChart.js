import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../util/supabase';
import { getSubscription } from '../util/db';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_H = 10; // chart ceiling in hours

// The `attendance_records` column on `subscriptions` is a JSON array, and we
// don't have a confirmed schema for what's inside each entry — this maps a
// handful of likely field-name variants so the chart has the best chance of
// working as-is. If your actual columns differ, adjust the lookups below.
function normalizeRecord(r) {
  return {
    employeeId: r.employeeId ?? r.employee_id ?? r.empId ?? r.emp_id ?? '',
    date: r.date ?? r.attendanceDate ?? r.attendance_date ?? r.day ?? '',
    // Records are written with clockIn/clockOut (see AttendanceScreen's
    // handleClockAction) — check those first, then fall back to legacy aliases.
    checkIn: r.clockIn ?? r.checkIn ?? r.check_in ?? r.timeIn ?? r.time_in ?? null,
    checkOut: r.clockOut ?? r.checkOut ?? r.check_out ?? r.timeOut ?? r.time_out ?? null,
    status: (r.status ?? '').toString().toLowerCase(),
    hours: r.hours ?? r.hoursWorked ?? r.hours_worked ?? null,
  };
}

/**
 * Compute hours between two "HH:MM" clock-in/out strings (what the app
 * actually stores). Falls back to parsing full ISO timestamps if present.
 */
function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const inMatch = String(checkIn).match(timeRegex);
  const outMatch = String(checkOut).match(timeRegex);

  if (inMatch && outMatch) {
    const inMins = parseInt(inMatch[1], 10) * 60 + parseInt(inMatch[2], 10);
    const outMins = parseInt(outMatch[1], 10) * 60 + parseInt(outMatch[2], 10);
    const diff = (outMins - inMins) / 60;
    return diff > 0 ? diff : 0;
  }

  const inTime = new Date(checkIn);
  const outTime = new Date(checkOut);
  if (Number.isNaN(inTime.getTime()) || Number.isNaN(outTime.getTime())) return 0;
  const diff = (outTime - inTime) / 1000 / 60 / 60;
  return diff > 0 ? diff : 0;
}

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay()); // back up to Sunday
  return date;
}

/** YYYY-MM-DD using local date parts (avoids UTC-offset day shifting) */
function toDateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Robustly extract YYYY-MM-DD from any stored date value */
function toRecordDateKey(val) {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (!Number.isNaN(d.getTime())) return toDateKey(d);
  return String(val).slice(0, 10);
}

export default function BarChart({ style }) {
  const { account, subscription, setSubscription } = useAuth();
  const [loading, setLoading] = useState(!subscription);
  const channelKey = useRef(Math.random().toString(36).slice(2)).current;

  // Load the freshest subscription row, then keep listening for live
  // changes (e.g. an admin clocking someone in/out from the desktop app)
  // so the chart updates in real time without needing a manual refresh.
  useEffect(() => {
    if (!account?.subscriptionId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      const fresh = await getSubscription(account.subscriptionId);
      if (!isMounted) return;
      if (fresh) setSubscription(fresh);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`bar-chart-${account.subscriptionId}-${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `subscription_id=eq.${account.subscriptionId}`,
        },
        async () => {
          const fresh = await getSubscription(account.subscriptionId);
          if (isMounted && fresh) setSubscription(fresh);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.subscriptionId]);

  // Reduce this week's records (for the logged-in employee only) down to
  // one value/special-label per day.
  const { values, specials } = useMemo(() => {
    const weekStart = startOfWeek();
    const dayValues = [0, 0, 0, 0, 0, 0, 0];
    const daySpecials = [null, null, null, null, null, null, null];

    const records = (subscription?.attendanceRecords ?? [])
      .map(normalizeRecord)
      .filter(r => !account?.employeeId || String(r.employeeId).trim() === String(account.employeeId).trim());

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayKey = toDateKey(day);

      const record = records.find(r => toRecordDateKey(r.date) === dayKey);
      if (!record) continue; // no record yet for that day — leave the bar empty

      if (record.status === 'absent') {
        daySpecials[i] = 'Absent';
      } else if (record.status === 'leave') {
        daySpecials[i] = 'Leave';
      } else if (record.status === 'holiday') {
        daySpecials[i] = 'Holiday';
      } else {
        const hrs = record.hours ?? hoursBetween(record.checkIn, record.checkOut);
        dayValues[i] = Math.min(hrs, MAX_H);
      }
    }

    return { values: dayValues, specials: daySpecials };
  }, [subscription, account?.employeeId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingState, style]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  const todayIndex = new Date().getDay();

  return (
    <View style={[styles.container, style]}>
      {/* Y axis labels */}
      <View style={styles.yAxis}>
        {[10, 8, 6, 4, 2, 0].map(v => (
          <Text key={v} style={styles.yLabel}>{v}h</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={styles.barsContainer}>
        {DAY_LABELS.map((day, i) => {
          const isSpecial = !!specials[i];
          const barHeight = isSpecial ? 0 : (values[i] / MAX_H) * 120;
          const isToday = i === todayIndex;
          return (
            <View key={day} style={styles.barCol}>
              <View style={styles.barTrack}>
                {isSpecial ? (
                  <View style={styles.specialLabel}>
                    <Text style={styles.specialText}>{specials[i]}</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isToday ? colors.purple : colors.purpleLight,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.dayLabel}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 140,
    paddingBottom: 20,
    marginRight: 4,
  },
  yLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 24,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '80%',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  specialLabel: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialText: {
    fontSize: 9,
    color: colors.textMuted,
    transform: [{ rotate: '-90deg' }],
    width: 50,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
});