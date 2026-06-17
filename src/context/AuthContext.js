import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSubscription } from '../util/db';

const AuthContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // check every 30 s

// ── Deactivated-while-logged-in modal ────────────────────────────────────────
function ForcedLogoutModal({ visible, onLogout }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={ms.overlay}>
        <View style={ms.card}>
          <View style={ms.iconCircle}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>

          <Text style={ms.title}>Account Deactivated</Text>

          <Text style={ms.body}>
            Your account has been{' '}
            <Text style={ms.bold}>deactivated</Text> and you can no longer
            access this application or any of its services.
          </Text>

          <View style={ms.infoBox}>
            <Ionicons
              name="people-outline"
              size={18}
              color="#EF4444"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={ms.infoText}>
              Please visit your{' '}
              <Text style={ms.infoTextBold}>HR Department</Text> to follow up
              and inquire about the reason for deactivation.
            </Text>
          </View>

          <TouchableOpacity style={ms.btn} onPress={onLogout} activeOpacity={0.85}>
            <Text style={ms.btnText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [account,      setAccount]      = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [showForced,   setShowForced]   = useState(false);

  const pollRef = useRef(null);

  const login = (accountData, subscriptionData) => {
    setAccount(accountData);
    setSubscription(subscriptionData);
    setShowForced(false);
  };

  const logout = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAccount(null);
    setSubscription(null);
    setShowForced(false);
  }, []);

  // ── Status checker ──────────────────────────────────────────────────────
  const checkStatus = useCallback(async (currentAccount) => {
    if (!currentAccount?.subscriptionId || !currentAccount?.employeeId) return;

    try {
      const sub = await getSubscription(currentAccount.subscriptionId);
      if (!sub) return;

      const empId = String(currentAccount.employeeId).trim();
      const emp = (sub.enrolledEmployees ?? []).find(e => {
        const byId           = String(e.id               ?? '').trim();
        const byAccountEmpId = String(e.accountEmployeeId ?? '').trim();
        const byEmployeeId   = String(e.employeeId       ?? e.employee_id ?? '').trim();
        return byId === empId || byAccountEmpId === empId || byEmployeeId === empId;
      });

      if (!emp) return;

      const status = (emp.status ?? 'active').toString().toLowerCase().trim();
      if (status === 'inactive' || status === 'deactivated' || status === 'disabled') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setShowForced(true);
      }
    } catch (_) {
      // network hiccup — silently ignore, will retry next interval
    }
  }, []);

  // ── Start / stop polling whenever account changes ───────────────────────
  useEffect(() => {
    if (!account) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Kick off first check immediately after login
    checkStatus(account);

    pollRef.current = setInterval(() => {
      checkStatus(account);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [account, checkStatus]);

  return (
    <AuthContext.Provider value={{ account, subscription, login, logout, setSubscription }}>
      {children}

      {/* Overlays everything — rendered inside the provider so it always shows */}
      <ForcedLogoutModal
        visible={showForced}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── Modal styles ──────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
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
