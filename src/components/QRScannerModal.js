import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

/**
 * QRScannerModal
 *
 * Props:
 *   visible   {boolean}  — controls modal visibility
 *   onClose   {fn}       — called when user dismisses
 *   onScanned {fn(data)} — called with the raw QR string once a code is read
 *
 * QR payload expected from the web Shift Manager:
 *   JSON string: {
 *     type:           "attendance_qr",
 *     subscriptionId: string,
 *     shiftId:        number | string,
 *     issuedAt:       ISO timestamp,
 *     permanent:      boolean,          // true = print-once QR, never expires
 *     date?:          "YYYY-MM-DD",     // only present for daily QR codes
 *     expiresAt?:     ISO timestamp,    // only present for daily QR codes
 *   }
 *
 * The parent (AttendanceScreen) validates subscriptionId + date/expiry (skipped
 * entirely for permanent codes) and calls handleClockAction() normally so all
 * the existing clock-in logic is reused.
 */
export default function QRScannerModal({ visible, onClose, onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [torch, setTorch]               = useState(false);
  const cooldownRef                     = useRef(false);

  // Reset scan-lock each time the modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      cooldownRef.current = false;
    }
  }, [visible]);

  // ── permission not yet determined ────────────────────────────────────────
  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={s.overlay}>
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      </Modal>
    );
  }

  // ── camera permission denied ─────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.permCard}>
            <View style={s.permIcon}>
              <Ionicons name="camera-outline" size={34} color={colors.primary} />
            </View>
            <Text style={s.permTitle}>Camera Access Needed</Text>
            <Text style={s.permBody}>
              To scan the QR code from your shift manager, please allow camera access.
            </Text>
            <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={s.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.permCancelBtn} onPress={onClose}>
              <Text style={s.permCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── handle a barcode scan result ─────────────────────────────────────────
  function handleBarCodeScanned({ data }) {
    if (cooldownRef.current) return;      // ignore rapid duplicates
    cooldownRef.current = true;
    setScanned(true);

    // Brief delay so the UI shows the "scanned" state before closing
    setTimeout(() => {
      onScanned(data);
      onClose();
    }, 400);
  }

  // ── camera view ──────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        {/* ── top bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Scan Attendance QR</Text>
          <TouchableOpacity style={s.topBtn} onPress={() => setTorch(t => !t)}>
            <Ionicons
              name={torch ? 'flashlight' : 'flashlight-outline'}
              size={20}
              color={torch ? colors.primary : colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* ── camera ── */}
        <CameraView
          style={s.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* ── viewfinder overlay ── */}
        <View style={s.overlay} pointerEvents="none">
          {/* dark corners */}
          <View style={s.darkTop} />
          <View style={s.middleRow}>
            <View style={s.darkSide} />
            <View style={[s.finder, scanned && s.finderScanned]}>
              {/* corner marks */}
              {[
                { top: 0,    left: 0,    borderTopWidth: 3,    borderLeftWidth: 3  },
                { top: 0,    right: 0,   borderTopWidth: 3,    borderRightWidth: 3 },
                { bottom: 0, left: 0,    borderBottomWidth: 3, borderLeftWidth: 3  },
                { bottom: 0, right: 0,   borderBottomWidth: 3, borderRightWidth: 3 },
              ].map((corner, i) => (
                <View key={i} style={[s.corner, corner,
                  scanned ? { borderColor: colors.present } : { borderColor: colors.white }
                ]} />
              ))}
              {scanned && (
                <View style={s.scannedIcon}>
                  <Ionicons name="checkmark-circle" size={52} color={colors.present} />
                </View>
              )}
            </View>
            <View style={s.darkSide} />
          </View>
          <View style={s.darkBottom} />
        </View>

        {/* ── hint text ── */}
        <View style={s.hint}>
          <Ionicons name="qr-code-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={s.hintText}>
            {scanned
              ? 'QR code detected!'
              : 'Point your camera at the QR code\ndisplayed by your shift manager'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const FINDER_SIZE = 260;
const CORNER_SIZE = 24;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topBtn:   { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Overlay / finder
  overlay:  { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  darkTop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' },
  darkBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.58)' },
  middleRow: { flexDirection: 'row', height: FINDER_SIZE },
  darkSide:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' },

  finder: {
    width: FINDER_SIZE, height: FINDER_SIZE,
    position: 'relative',
    justifyContent: 'center', alignItems: 'center',
  },
  finderScanned: { /* just for state tracking, visuals handled by corner color */ },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: '#fff',
    borderRadius: 3,
  },

  scannedIcon: { position: 'absolute' },

  // Hint
  hint: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingBottom: Platform.OS === 'android' ? 48 : 60,
    paddingTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hintText: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 20,
  },

  // Permission card
  permCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xxl, marginHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 28, elevation: 16,
  },
  permIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  permTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  permBody:  { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl },
  permBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 14, paddingHorizontal: spacing.xxl * 2,
    width: '100%', alignItems: 'center', marginBottom: spacing.sm,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  permBtnText:    { color: colors.white, fontWeight: '700', fontSize: 15 },
  permCancelBtn:  { paddingVertical: spacing.sm },
  permCancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
});