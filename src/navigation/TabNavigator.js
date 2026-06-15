import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import LeaveScreen from '../screens/LeaveScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ReportScreen from '../screens/ReportScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, label, badge }) {
  return (
    <View style={styles.tabItem}>
      <View style={focused ? styles.activeIconBg : null}>
        {focused && label === 'Report' ? (
          <View style={styles.activeReportBtn}>
            <Ionicons name={name} size={22} color={colors.white} />
          </View>
        ) : (
          <Ionicons
            name={name}
            size={22}
            color={focused ? colors.primary : colors.textMuted}
          />
        )}
      </View>
      {!focused && (
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
          {label}
        </Text>
      )}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} label="Dashboard" />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'finger-print' : 'finger-print-outline'} focused={focused} label="Attendance" />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.reportBtn, focused && styles.reportBtnActive]}>
                <Ionicons name="bar-chart" size={20} color={colors.white} />
                <Text style={styles.reportBtnText}>Report</Text>
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Leave"
        component={LeaveScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} label="Leave" />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'menu' : 'menu-outline'} focused={focused} label="Menu" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  tabLabelActive: { color: colors.primary },
  reportBtn: {
    backgroundColor: colors.textMuted,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    marginTop: -8,
  },
  reportBtnActive: { backgroundColor: colors.primary },
  reportBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
