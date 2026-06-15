import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

export default function LoginScreen({ navigation }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.heroSection}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={28} color={colors.white} />
            <View style={styles.sparkle1} />
            <View style={styles.sparkle2} />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to ERJ</Text>
          <Text style={styles.welcomeSubtitle}>Login to access your account</Text>
        </View>

        <View style={styles.formSection}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}>
              <Entypo name="text-document" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>ATTENDANCE MANAGEMENT</Text>
            </View>
          </View>

          {/* ID Input */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Enter your ID number"
              placeholderTextColor={colors.textMuted}
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderBottomWidth: 0, paddingHorizontal: 0 }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputUnderline} />
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation && navigation.replace && navigation.replace('Main')}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Are you a new user? </Text>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },

  heroSection: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  checkBadge: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.purple,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  sparkle1: {
    position: 'absolute', top: -6, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.white, opacity: 0.8,
  },
  sparkle2: {
    position: 'absolute', bottom: 4, left: -10,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.white, opacity: 0.7,
  },
  welcomeTitle: {
    fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
  },

  formSection: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl + 8,
    borderTopRightRadius: radius.xl + 8,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.xxl,
  },
  brandLogo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brown,
    justifyContent: 'center', alignItems: 'center',
  },
  brandName: { fontSize: 13, fontWeight: '800', color: colors.brown, letterSpacing: 1 },

  inputGroup: { marginBottom: spacing.xl },
  input: {
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  inputUnderline: {
    height: 1, backgroundColor: colors.border,
  },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: spacing.xxl },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  signInBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  signInText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 13, color: colors.textSecondary },
  registerLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
});
