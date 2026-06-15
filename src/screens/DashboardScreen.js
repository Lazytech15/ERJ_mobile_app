import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import BarChart from '../components/BarChart';

export default function DashboardScreen() {
  const [month, setMonth] = useState('Feb');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Brown Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>EA</Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={styles.headerName}>Emmanuel S. Ablao</Text>
                <Text style={styles.headerRole}>IT Specialist</Text>
              </View>
            </View>
            <View style={styles.notifBadge}>
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              <View style={styles.badge} />
            </View>
          </View>

          {/* Date */}
          <Text style={styles.headerDate}>June 15, 2026</Text>

          {/* Working Time Card */}
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>Working Time</Text>
            <View style={styles.clockRow}>
              <Text style={styles.clockNum}>09</Text>
              <Text style={styles.clockColon}>:</Text>
              <Text style={styles.clockNum}>00</Text>
              <Text style={styles.clockColon}>:</Text>
              <Text style={styles.clockAMPM}>PM</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.locationText}>B-3, L-11, South Carolina St.Joyous Heights Subd., Hinapao San Jose, Antipolo City</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn}>
              <Ionicons name="time-outline" size={16} color={colors.white} />
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Attendance Days */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Total Attendance (Days)</Text>
            <TouchableOpacity style={styles.monthPicker}>
              <Text style={styles.monthText}>{month}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: colors.present }]}>8</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={[styles.statNum, { color: colors.late }]}>2</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: colors.absent }]}>1</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>

          {/* Working Hours */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <TouchableOpacity style={styles.dateRangeBtn}>
              <Text style={styles.dateRangeText}>5 Jan - 12 Jan</Text>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hoursCard}>
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
            <BarChart style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brown },
  scroll: { flex: 1, backgroundColor: colors.cream },

  header: {
    backgroundColor: colors.brown,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  headerName: { color: colors.white, fontWeight: '700', fontSize: 15 },
  headerRole: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  notifBadge: { position: 'relative', padding: 6 },
  badge: {
    position: 'absolute', top: 5, right: 5,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  headerDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: spacing.md,
  },

  timeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  timeLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  clockRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clockNum: { fontSize: 44, fontWeight: '800', color: colors.text, letterSpacing: 2 },
  clockColon: { fontSize: 44, fontWeight: '800', color: colors.text, marginHorizontal: 2 },
  clockAMPM: { fontSize: 28, fontWeight: '700', color: colors.text, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 8 },
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationText: { fontSize: 12, color: colors.textMuted, marginLeft: 4, textAlign: 'center', width: '80%' },
  checkoutBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
    gap: 6,
  },
  checkoutText: { color: colors.white, fontWeight: '600', fontSize: 14 },

  body: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  monthPicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  monthText: { fontSize: 13, color: colors.textSecondary },
  dateRangeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dateRangeText: { fontSize: 12, color: colors.textSecondary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statCardMiddle: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
  },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  hoursCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hoursLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  hoursValue: { fontSize: 13, fontWeight: '700', color: colors.text },
});
