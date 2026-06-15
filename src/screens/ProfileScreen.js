import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

const menuItems = [
  { icon: 'person-outline', label: 'My Profile', color: colors.purple },
  { icon: 'briefcase-outline', label: 'Leave Management', color: colors.primary },
  { icon: 'cash-outline', label: 'Payroll', color: colors.present },
  { icon: 'settings-outline', label: 'Settings', color: colors.textSecondary },
  { icon: 'help-circle-outline', label: 'Help & Support', color: colors.late },
  { icon: 'log-out-outline', label: 'Logout', color: colors.absent },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RM</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Emmanuel S. Ablao</Text>
            <Text style={styles.profileRole}>IT Specialist</Text>
            <Text style={styles.profileEmail}>emmanuelablao16@gmail.com</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.present }]}>19</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.stat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.late }]}>3</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.absent }]}>1</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>v1.0.0 • ERJ Smart Solutions</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },

  profileCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brown,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 18 },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
  profileRole: { fontSize: 13, color: colors.primary, marginTop: 2 },
  profileEmail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  menuCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
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
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
});
