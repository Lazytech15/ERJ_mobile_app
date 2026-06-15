import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const values = [0, 8, 8.5, 8, 7.5, 6, 0]; // 0 = holiday/absent
const labels = [null, null, null, null, null, null, null];
const specials = ['Absent', null, null, null, null, 'Holiday', 'Holiday'];

const MAX_H = 10;

export default function BarChart({ style }) {
  return (
    <View style={[styles.container, style]}>
      {/* Y axis labels */}
      <View style={styles.yAxis}>
        {[10, 8, 6, 4, 2, 0].map(v => (
          <Text key={v} style={styles.yLabel}>{v}h</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={styles.barsContainer}>
        {days.map((day, i) => {
          const isSpecial = !!specials[i];
          const barHeight = isSpecial ? 0 : (values[i] / MAX_H) * 120;
          const isHighlight = i === 1 || i === 3; // Mon, Wed tallest
          return (
            <View key={day} style={styles.barCol}>
              <View style={styles.barTrack}>
                {isSpecial ? (
                  <View style={styles.specialLabel}>
                    <Text style={styles.specialText}>{specials[i]}</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isHighlight ? colors.purple : colors.purpleLight,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.dayLabel}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 140,
    paddingBottom: 20,
    marginRight: 4,
  },
  yLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 24,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '80%',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  specialLabel: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialText: {
    fontSize: 9,
    color: colors.textMuted,
    transform: [{ rotate: '-90deg' }],
    width: 50,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
