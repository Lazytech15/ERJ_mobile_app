import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

const leaveBalances = [
  { label: 'Sick Leave', value: 14, color: colors.present },
  { label: 'Casual Leave', value: 12, color: colors.late },
  { label: 'Earned Leave', value: 4, color: colors.absent },
];

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// January 2023 grid (starts Sunday)
const calendarRows = [
  [null, null, null, null, null, null, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, 31, null, null, null, null, null],
];

const holidayDates = new Set([10, 20, 24]); // highlighted in red

const holidays = [
  {
    icon: 'trophy', iconBg: '#FEF3C7', iconColor: '#F59E0B',
    title: 'Sunday, 10 January', subtitle: 'Annual Picnic of Uipik',
  },
  {
    icon: 'leaf', iconBg: '#DCFCE7', iconColor: colors.present,
    title: 'Wednesday, 20 January', subtitle: 'Annual Picnic of Uipik',
  },
  {
    icon: 'calendar', iconBg: '#E0E7FF', iconColor: colors.purple,
    title: 'Sunday, 24 January', subtitle: 'Annual Picnic of Uipik',
  },
];

const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave'];

export default function LeaveScreen() {
  const [tab, setTab] = useState('request');
  const [leaveType, setLeaveType] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleApply = () => {
    setShowSuccess(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Leave Balance */}
          <Text style={styles.sectionTitle}>Leave Balance</Text>
          <View style={styles.balanceRow}>
            {leaveBalances.map((b, i) => (
              <View
                key={b.label}
                style={[
                  styles.balanceCard,
                  { backgroundColor: b.color + '18' },
                ]}
              >
                <Text style={[styles.balanceNum, { color: b.color }]}>{b.value}</Text>
                <Text style={styles.balanceLabel}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
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
              {/* Form */}
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
                    {leaveTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setLeaveType(type);
                          setShowTypeMenu(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Duration</Text>
                <TouchableOpacity style={styles.selectInput}>
                  <Text style={styles.selectPlaceholder}>Select</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason</Text>
                <View style={styles.textArea}>
                  <Text style={styles.selectPlaceholder}>Write here</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Apply for Leave</Text>
              </TouchableOpacity>

              {/* Upcoming Holidays */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Upcoming Holidays</Text>

              {/* Calendar */}
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarArrow}>
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>Jan 2023</Text>
                  <TouchableOpacity style={styles.calendarArrow}>
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekRow}>
                  {weekDays.map((d) => (
                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                  ))}
                </View>

                {calendarRows.map((row, ri) => (
                  <View key={ri} style={styles.calendarRow}>
                    {row.map((day, ci) => {
                      const isHoliday = day && holidayDates.has(day);
                      return (
                        <View key={ci} style={styles.calendarCell}>
                          {day ? (
                            <View style={[styles.dayCircle, isHoliday && styles.dayCircleHoliday]}>
                              <Text style={[styles.dayText, isHoliday && styles.dayTextHoliday]}>
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

              {/* Holiday list */}
              {holidays.map((h, i) => (
                <View key={i} style={styles.holidayItem}>
                  <View style={[styles.holidayIcon, { backgroundColor: h.iconBg }]}>
                    <FontAwesome5 name={h.icon} size={16} color={h.iconColor} solid />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.holidayTitle}>{h.title}</Text>
                    <Text style={styles.holidaySubtitle}>{h.subtitle}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.historyEmpty}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.textMuted} />
              <Text style={styles.historyEmptyText}>No leave history yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
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

  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  balanceCard: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  balanceNum: { fontSize: 26, fontWeight: '800' },
  balanceLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

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
    alignItems: 'flex-start',
  },

  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  applyBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

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
  dayCircleHoliday: { backgroundColor: colors.absent },
  dayText: { fontSize: 13, color: colors.text },
  dayTextHoliday: { color: colors.white, fontWeight: '700' },
  dayTextEmpty: { fontSize: 13 },

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
  holidayIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  holidayTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  holidaySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  historyEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  historyEmptyText: { fontSize: 14, color: colors.textMuted },

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
