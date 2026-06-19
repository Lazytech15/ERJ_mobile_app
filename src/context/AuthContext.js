import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../util/supabase';
import { getAccountByAuthUid, getSubscription } from '../util/db';

const AuthContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // check every 30 s

function isDeactivatedStatus(status) {
  const s = (status ?? 'active').toString().toLowerCase().trim();
  return s === 'inactive' || s === 'deactivated' || s === 'disabled';
}

// Find the enrolledEmployees[] entry that matches this account's employeeId.
// Mirrors the matching logic used elsewhere (Dashboard/Attendance/Leave screens).
function findEnrolledEmployee(subscription, employeeId) {
  if (!subscription || !employeeId) return null;
  const empId = String(employeeId).trim();
  return (subscription.enrolledEmployees ?? []).find(e => {
    const byId           = String(e.id               ?? '').trim();
    const byAccountEmpId = String(e.accountEmployeeId ?? '').trim();
    const byEmployeeId   = String(e.employeeId       ?? e.employee_id ?? '').trim();
    return byId === empId || byAccountEmpId === empId || byEmployeeId === empId;
  });
}

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
  const [authReady,    setAuthReady]    = useState(false);
  const [showForced,   setShowForced]   = useState(false);

  const pollRef = useRef(null);

  // Guards against onAuthStateChange's SIGNED_IN firing a second, redundant
  // hydrate right after login() already did one (signInWithPassword itself
  // triggers SIGNED_IN).
  const hydratingRef = useRef(false);

  // ── Sign out of Supabase + clear local state ────────────────────────────
  const clearSession = useCallback(async () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore — we're clearing local state regardless
    }
    setAccount(null);
    setSubscription(null);
  }, []);

  // ── Given a Supabase Auth user, load profile + subscription, run the
  //    deactivation checks, and update state. Returns the profile on success,
  //    or null if the account/employee is deactivated or has no profile row. ──
  const hydrateFromAuthUser = useCallback(async (authUser) => {
    hydratingRef.current = true;
    try {
      const profile = await getAccountByAuthUid(authUser.id);
      if (!profile) {
        await clearSession();
        return null;
      }

      let sub = null;
      if (profile.subscriptionId) {
        sub = await getSubscription(profile.subscriptionId);
      }

      const enrolledEmp = findEnrolledEmployee(sub, profile.employeeId);
      if (enrolledEmp && isDeactivatedStatus(enrolledEmp.status)) {
        await clearSession();
        setShowForced(true);
        return null;
      }

      setAccount(profile);
      setSubscription(sub);
      setShowForced(false);
      return profile;
    } finally {
      hydratingRef.current = false;
    }
  }, [clearSession]);

  // ── login(email, password) — sign in via Supabase Auth, then hydrate ───
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password.trim(),
    });

    if (error) {
      throw new Error('Invalid email or password.');
    }

    const profile = await hydrateFromAuthUser(data.user);
    if (!profile) {
      // hydrateFromAuthUser already signed out (and, if relevant, surfaced
      // the ForcedLogoutModal) — give the caller a message to show instead.
      throw new Error('This account is no longer active. Please contact your HR Department.');
    }

    return profile;
  }, [hydrateFromAuthUser]);

  const logout = useCallback(async () => {
    await clearSession();
    setShowForced(false);
  }, [clearSession]);

  // ── Bootstrap: restore session on mount + listen for auth changes ──────
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        await hydrateFromAuthUser(session.user);
      }
      setAuthReady(true);
    })();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setAccount(null);
          setSubscription(null);
          setAuthReady(true);
        } else if (event === 'TOKEN_REFRESHED') {
          // Silently refresh the profile/subscription when the JWT renews.
          hydrateFromAuthUser(session.user);
        } else if (event === 'SIGNED_IN' && !hydratingRef.current) {
          // Covers cold-start session restores; login() already handles its
          // own hydrate, so hydratingRef avoids doing it twice in a row.
          await hydrateFromAuthUser(session.user);
          setAuthReady(true);
        }
      },
    );

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [hydrateFromAuthUser]);

  // ── Status checker (periodic re-check while logged in) ──────────────────
  const checkStatus = useCallback(async (currentAccount) => {
    if (!currentAccount?.subscriptionId || !currentAccount?.employeeId) return;

    try {
      const sub = await getSubscription(currentAccount.subscriptionId);
      if (!sub) return;

      const emp = findEnrolledEmployee(sub, currentAccount.employeeId);
      if (!emp) return;

      if (isDeactivatedStatus(emp.status)) {
        await clearSession();
        setShowForced(true);
      }
    } catch (_) {
      // network hiccup — silently ignore, will retry next interval
    }
  }, [clearSession]);

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
    <AuthContext.Provider value={{ account, subscription, authReady, login, logout, setSubscription }}>
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
