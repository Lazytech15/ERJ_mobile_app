import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtJoinDate(val) {
  if (!val) return '';
  const d = new Date(`${String(val).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Current-month Present / Late / Absent from attendanceRecords */
function useMonthlyStats(account, subscription) {
  return useMemo(() => {
    const empty = { present: 0, late: 0, absent: 0 };
    if (!account || !subscription) return empty;

    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const empId = String(account.employeeId ?? '').trim();

    const records = (subscription.attendanceRecords ?? []).filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      const rEmpId = String(r.employeeId ?? r.employee_id ?? '').trim();
      return rEmpId === empId;
    });

    return records.reduce((acc, r) => {
      const s = (r.status ?? '').toLowerCase();
      if (s === 'present')     acc.present += 1;
      else if (s === 'late')   acc.late    += 1;
      else if (s === 'absent') acc.absent  += 1;
      return acc;
    }, { ...empty });
  }, [account, subscription]);
}

/** Find the enrolled employee record matching this account */
function useEmployee(account, subscription) {
  return useMemo(() => {
    if (!account || !subscription) return null;
    const empId = String(account.employeeId ?? '').trim();
    return (subscription.enrolledEmployees ?? []).find(e => {
      const byId           = String(e.id               ?? '').trim();
      const byAccountEmpId = String(e.accountEmployeeId ?? '').trim();
      const byEmployeeId   = String(e.employeeId       ?? e.employee_id ?? '').trim();
      return byId === empId || byAccountEmpId === empId || byEmployeeId === empId;
    }) ?? null;
  }, [account, subscription]);
}

// ── Menu items ────────────────────────────────────────────────────────────────

const MENU = [
  {
    key:   'leave',
    icon:  'briefcase-outline',
    label: 'Leave Management',
    color: colors.primary,
    tab:   'Leave',
  },
  {
    key:   'logout',
    icon:  'log-out-outline',
    label: 'Logout',
    color: colors.absent,
    tab:   null,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { account, subscription, logout } = useAuth();
  const navigation = useNavigation();

  const employee = useEmployee(account, subscription);
  const stats    = useMonthlyStats(account, subscription);

  // Derived display values — mirrors DashboardScreen logic
  const displayName = employee
    ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
    : (account?.name ?? '');

  const initials = displayName
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const role       = employee?.role       ?? account?.role ?? '';
  const department = employee?.department ?? '';
  const employeeCode = employee?.employeeCode ?? employee?.employee_code ?? employee?.empCode ?? employee?.code ?? '';
  const joinDate   = employee?.joinDate   ?? employee?.join_date ?? employee?.startDate ?? '';
  const email      = employee?.email      ?? account?.email ?? '';
  const shift      = employee?.shiftName  ?? employee?.shift ?? '';

  const profilePhotoUrl =
    employee?.profilePhotoUrl   ??
    employee?.profile_photo_url ??
    employee?.photoUrl          ??
    employee?.photo_url         ??
    employee?.avatar            ??
    employee?.avatarUrl         ??
    null;

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : '';

  function handleMenuPress(item) {
    if (item.key === 'logout') {
      Alert.alert(
        'Logout',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: () => logout() },
        ],
      );
      return;
    }
    if (item.tab) {
      navigation.navigate(item.tab);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Brown header banner ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {profilePhotoUrl ? (
              <Image
                source={{ uri: profilePhotoUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.activeDot} />
          </View>

          {/* Name / role / code */}
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName || 'Employee'}
          </Text>
          {!!roleLabel && (
            <Text style={styles.profileRole}>
              {roleLabel}{!!department ? ` · ${department}` : ''}
            </Text>
          )}
          {!!employeeCode && (
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{employeeCode}</Text>
            </View>
          )}

          {/* Detail rows */}
          {(!!email || !!shift || !!joinDate) && (
            <View style={styles.detailsBox}>
              {!!email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.detailText} numberOfLines={1}>{email}</Text>
                </View>
              )}
              {!!shift && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.detailText}>{shift}</Text>
                </View>
              )}
              {!!joinDate && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.detailText}>Joined {fmtJoinDate(joinDate)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Cream body ── */}
        <View style={styles.body}>

          {/* Monthly Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.present }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.stat, styles.statMiddle]}>
              <Text style={[styles.statNum, { color: colors.late }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.absent }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>

          {/* Menu */}
          <View style={styles.menuCard}>
            {MENU.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  i < MENU.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[
                  styles.menuLabel,
                  item.key === 'logout' && { color: colors.absent },
                ]}>
                  {item.label}
                </Text>
                {item.key !== 'logout' && (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.version}>v1.0.0 • ERJ Smart Solutions</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.brown },
  scroll:        { flex: 1, backgroundColor: colors.brown },
  scrollContent: { flexGrow: 1 },

  // ── Brown header ──
  header: {
    backgroundColor: colors.brown,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.lg,
  },

  // Avatar
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 32 },
  activeDot: {
    position: 'absolute', bottom: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.present,
    borderWidth: 2, borderColor: colors.brown,
  },

  // Name / role / code
  profileName: {
    color: colors.white, fontWeight: '800', fontSize: 20,
    textAlign: 'center',
  },
  profileRole: {
    color: colors.primary, fontSize: 13, fontWeight: '600',
    marginTop: 3, textAlign: 'center',
  },
  codeBadge: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full,
  },
  codeText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 1 },

  // Detail rows
  detailsBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
    alignSelf: 'center',
    alignItems: 'center',
    minWidth: '60%',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  // ── Cream body ──
  body: {
    flex: 1,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xl,
    marginTop: -radius.xl,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    marginBottom: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statMiddle: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: colors.border,
  },
  statNum:   { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Menu
  menuCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },

  version: {
    textAlign: 'center', fontSize: 12, color: colors.textMuted,
    marginTop: spacing.xl, marginBottom: spacing.xxl,
  },
});