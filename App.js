import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

// Inner navigator — watches account so forced logout auto-redirects to Login
function RootNavigator() {
  const { account, authReady } = useAuth();
  const navRef = useRef(null);

  useEffect(() => {
    if (!account && navRef.current) {
      // account was cleared (forced logout) — go back to Login
      navRef.current.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [account]);

  // Wait for the Supabase session restore (AuthContext bootstrap) to finish
  // before deciding whether to show Login or the Main app — avoids a flash
  // of the Login screen for users who are already signed in.
  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {account ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
