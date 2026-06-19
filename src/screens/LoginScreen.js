import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const logo = require('../assets/logo.png');
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../context/AuthContext';

// ── Deactivated Account Modal ─────────────────────────────────────────────────
function DeactivatedModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>

          {/* Centered circular icon */}
          <View style={modalStyles.iconCircle}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>

          <Text style={modalStyles.title}>Account Deactivated</Text>

          <Text style={modalStyles.body}>
            Your account has been{' '}
            <Text style={modalStyles.bold}>deactivated</Text> and you can no
            longer access this application or any of its services.
          </Text>

          {/* HR instruction box */}
          <View style={modalStyles.infoBox}>
            <Ionicons name="people-outline" size={18} color="#EF4444" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={modalStyles.infoText}>
              Please visit your{' '}
              <Text style={modalStyles.infoTextBold}>HR Department</Text> to
              follow up and inquire about the reason for deactivation.
            </Text>
          </View>

          <TouchableOpacity style={modalStyles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={modalStyles.btnText}>I Understand</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const { login } = useAuth();

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // AuthContext.login() handles the Supabase Auth sign-in, profile fetch,
      // subscription fetch, and the deactivated-employee check all in one go.
      await login(trimmedEmail, trimmedPassword);
    } catch (err) {
      const message = err?.message || '';
      if (message.toLowerCase().includes('no longer active')) {
        setShowDeactivated(true);
      } else if (message.toLowerCase().includes('invalid email or password')) {
        Alert.alert('Login Failed', 'Incorrect email or password.');
      } else {
        Alert.alert('Error', message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Decorative floating blobs ── */}
      <View style={styles.topRightDecor} pointerEvents="none">
        <View style={[styles.blob, styles.blobOuter, { top: -70, right: -70 }]} />
        <View style={[styles.blob, styles.blobMid, { top: -25, right: -35 }]} />
        <View style={[styles.blob, styles.blobCore, { top: 45, right: 0 }]} />
      </View>
      <View style={styles.bottomLeftDecor} pointerEvents="none">
        <View style={[styles.blob, styles.blobOuter, { bottom: -70, left: -70 }]} />
        <View style={[styles.blob, styles.blobMid, { bottom: -25, left: -35 }]} />
        <View style={[styles.blob, styles.blobCoreAlt, { bottom: 45, left: 0 }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrap}>
            {/* ── Hero Section ── */}
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={logo}
                  style={{ width: 100, height: 100 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to ERJ</Text>
              <Text style={styles.welcomeSubtitle}>Login to access your account</Text>
            </View>

            {/* ── Form Section ── */}
            <View style={styles.formSection}>
              <Text style={styles.formHeading}>Sign In</Text>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.signInBtn, loading && { opacity: 0.7 }]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.signInText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Deactivated account modal */}
      <DeactivatedModal
        visible={showDeactivated}
        onClose={() => setShowDeactivated(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BG = '#F3F4F4';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  scrollContent: { flexGrow: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl * 2,
  },

  // ── Decorative blobs ──
  topRightDecor: { position: 'absolute', top: 0, right: 0, width: 260, height: 260, zIndex: 0 },
  bottomLeftDecor: { position: 'absolute', bottom: 0, left: 0, width: 260, height: 260, zIndex: 0 },
  blob: { position: 'absolute', borderRadius: 999 },
  blobOuter: {
    width: 220, height: 220,
    backgroundColor: 'rgba(249,115,22,0.10)',
  },
  blobMid: {
    width: 150, height: 150,
    backgroundColor: 'rgba(249,115,22,0.22)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  blobCore: {
    width: 86, height: 86,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  blobCoreAlt: {
    width: 86, height: 86,
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },

  // ── Hero ──
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  welcomeSubtitle: { fontSize: 13.5, color: colors.textSecondary },

  // ── Form card ──
  formSection: {
    backgroundColor: colors.white,
    borderRadius: 28,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 10,
  },
  formHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xl,
    letterSpacing: 0.2,
  },
  inputGroup: { marginBottom: spacing.lg },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#EAEBEC',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 14.5, color: colors.text, padding: 0 },
  signInBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,30,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: '700',
    color: '#EF4444',
  },
  btn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});