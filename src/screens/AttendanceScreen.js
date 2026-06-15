import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

const attendanceList = [
  { date: '12 Feb, 2024', day: 'Mon', checkIn: '09:00 AM', checkOut: '06:15 PM', status: 'present' },
  { date: '11 Feb, 2024', day: 'Sun', checkIn: '09:05 AM', checkOut: '06:00 PM', status: 'late' },
  { date: '10 Feb, 2024', day: 'Sat', checkIn: '--', checkOut: '--', status: 'absent' },
  { date: '09 Feb, 2024', day: 'Fri', checkIn: '08:55 AM', checkOut: '06:05 PM', status: 'present' },
  { date: '08 Feb, 2024', day: 'Thu', checkIn: '09:12 AM', checkOut: '06:30 PM', status: 'late' },
  { date: '07 Feb, 2024', day: 'Wed', checkIn: '08:50 AM', checkOut: '06:00 PM', status: 'present' },
];

const statusColors = {
  present: colors.present,
  late: colors.late,
  absent: colors.absent,
};

const statusLabels = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
};

// Stylized map: green landscape blocks + road network + location pin
function FakeMap() {
  return (
    <View style={styles.mapContainer}>
      {/* Base terrain */}
      <View style={styles.mapBase} />

      {/* Green landscape patches */}
      <View style={[styles.mapPatch, { top: 10, left: 12, width: 70, height: 50 }]} />
      <View style={[styles.mapPatch, { top: 70, left: 90, width: 90, height: 70 }]} />
      <View style={[styles.mapPatch, { top: 5, right: 15, width: 60, height: 40 }]} />
      <View style={[styles.mapPatch, { bottom: 10, left: 20, width: 80, height: 45 }]} />
      <View style={[styles.mapPatch, { bottom: 15, right: 10, width: 55, height: 55 }]} />

      {/* Road network */}
      <View style={[styles.roadH, { top: 40 }]} />
      <View style={[styles.roadH, { top: 95 }]} />
      <View style={[styles.roadV, { left: 60 }]} />
      <View style={[styles.roadV, { left: 180 }]} />
      <View style={styles.roadDiag} />

      {/* Buildings */}
      <View style={[styles.building, { top: 50, left: 100, width: 24, height: 18 }]} />
      <View style={[styles.building, { top: 55, left: 130, width: 18, height: 14 }]} />
      <View style={[styles.building, { top: 105, left: 30, width: 20, height: 16 }]} />

      {/* Pin */}
      <View style={styles.pinContainer}>
        <View style={styles.pinOuter}>
          <View style={styles.pinInner}>
            <Ionicons name="location" size={18} color={colors.purple} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const [tab, setTab] = useState('today');
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'today' && styles.tabActive]}
            onPress={() => setTab('today')}
          >
            <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>
              Today's Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'list' && styles.tabActive]}
            onPress={() => setTab('list')}
          >
            <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>
              Attendance List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'today' ? (
          <View style={styles.body}>
            <Text style={styles.date}>12 Feb, 2024</Text>

            {/* Time Card */}
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <View style={styles.clockRow}>
                <Text style={styles.clockNum}>09</Text>
                <Text style={styles.clockColon}>:</Text>
                <Text style={styles.clockNum}>00</Text>
                <Text style={styles.clockColon}>:</Text>
                <Text style={styles.clockAMPM}>PM</Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={styles.locationText}>Kuwaiti Mosque Rd. Dhaka 1212</Text>
              </View>
            </View>

            {/* Map */}
            <FakeMap />

            {/* Check In Button */}
            <View style={styles.checkInWrapper}>
              <TouchableOpacity
                style={[styles.checkInBtn, checkedIn && styles.checkInBtnOut]}
                onPress={() => setCheckedIn(!checkedIn)}
              >
                <Ionicons name="finger-print-outline" size={28} color={colors.white} />
                <Text style={styles.checkInText}>{checkedIn ? 'Check Out' : 'Check In'}</Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="refresh-outline" size={20} color={colors.purple} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="reload-outline" size={20} color={colors.purple} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="time-outline" size={20} color={colors.purple} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.listBody}>
            {attendanceList.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listDate}>
                  <Text style={styles.listDay}>{item.day}</Text>
                  <Text style={styles.listDateText}>{item.date}</Text>
                </View>
                <View style={styles.listTimes}>
                  <View style={styles.listTimeRow}>
                    <Ionicons name="log-in-outline" size={13} color={colors.present} />
                    <Text style={styles.listTimeText}>{item.checkIn}</Text>
                  </View>
                  <View style={styles.listTimeRow}>
                    <Ionicons name="log-out-outline" size={13} color={colors.absent} />
                    <Text style={styles.listTimeText}>{item.checkOut}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                    {statusLabels[item.status]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    padding: 3,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '700' },

  body: { padding: spacing.xl },
  date: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },

  timeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  timeLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  clockRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  clockNum: { fontSize: 40, fontWeight: '800', color: colors.text, letterSpacing: 2 },
  clockColon: { fontSize: 40, fontWeight: '800', color: colors.text, marginHorizontal: 2 },
  clockAMPM: { fontSize: 24, fontWeight: '700', color: colors.text, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },

  mapContainer: {
    height: 160,
    backgroundColor: '#EAF4EC',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapBase: {
    position: 'absolute',
    width: '100%', height: '100%',
    backgroundColor: '#F1F4ED',
  },
  mapPatch: {
    position: 'absolute',
    backgroundColor: '#CFE8D2',
    borderRadius: 6,
  },
  roadH: {
    position: 'absolute',
    left: -10, right: -10,
    height: 6,
    backgroundColor: '#FFFFFF',
  },
  roadV: {
    position: 'absolute',
    top: -10, bottom: -10,
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  roadDiag: {
    position: 'absolute',
    top: -20, left: 100,
    width: 300,
    height: 5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '35deg' }],
  },
  building: {
    position: 'absolute',
    backgroundColor: '#E2E5DC',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D7DBCF',
  },
  pinContainer: { alignItems: 'center', justifyContent: 'center' },
  pinOuter: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  pinInner: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },

  checkInWrapper: { alignItems: 'center', marginBottom: spacing.xl },
  checkInBtn: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.present,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.present,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  checkInBtnOut: { backgroundColor: colors.absent, shadowColor: colors.absent },
  checkInText: { color: colors.white, fontSize: 11, fontWeight: '700', marginTop: 4 },

  actionsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.xl,
  },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },

  listBody: { padding: spacing.xl },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  listDate: { width: 80 },
  listDay: { fontSize: 13, fontWeight: '700', color: colors.text },
  listDateText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  listTimes: { flex: 1, gap: 4 },
  listTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listTimeText: { fontSize: 12, color: colors.textSecondary },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
});
