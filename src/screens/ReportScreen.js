import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import BarChart from '../components/BarChart';

const months = [
  { month: 'Jan', present: 19, late: 3, absent: 1 },
  { month: 'Feb', present: 8, late: 2, absent: 1 },
  { month: 'Mar', present: 21, late: 1, absent: 0 },
];

export default function ReportScreen() {
  const [selectedMonth, setSelectedMonth] = useState('Jan');
  const current = months.find(m => m.month === selectedMonth) || months[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Working Hours Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <TouchableOpacity style={styles.dateRangeBtn}>
              <Text style={styles.dateRangeText}>5 Jan - 12 Jan</Text>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.hoursRow}>
              <Ionicons name="time-outline" size={15} color={colors.purple} />
              <Text style={styles.hoursLabel}>Total Hours</Text>
              <Text style={styles.hoursValue}>38:24 hrs</Text>
            </View>
            <View style={[styles.hoursRow, { marginTop: spacing.sm }]}>
              <MaterialCommunityIcons name="lightning-bolt-circle" size={15} color={colors.late} />
              <Text style={styles.hoursLabel}>Overtime</Text>
              <Text style={[styles.hoursValue, { color: colors.late }]}>01:20 hrs</Text>
            </View>
            <BarChart style={{ marginTop: spacing.lg }} />
          </View>

          {/* Total Attendance */}
          <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
            <Text style={styles.sectionTitle}>Total Attendance (Days)</Text>
            <TouchableOpacity style={styles.monthPicker}>
              <Text style={styles.monthText}>{selectedMonth}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
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
            {months.map((m) => (
              <TouchableOpacity
                key={m.month}
                style={[styles.monthRow, selectedMonth === m.month && styles.monthRowActive]}
                onPress={() => setSelectedMonth(m.month)}
              >
                <Text style={styles.monthRowLabel}>{m.month} 2024</Text>
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
              <Text style={[styles.summaryNum, { color: colors.present }]}>48</Text>
              <Text style={styles.summaryLabel}>Total Present</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.late + '15' }]}>
              <Text style={[styles.summaryNum, { color: colors.late }]}>6</Text>
              <Text style={styles.summaryLabel}>Total Late</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.absent + '15' }]}>
              <Text style={[styles.summaryNum, { color: colors.absent }]}>2</Text>
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
