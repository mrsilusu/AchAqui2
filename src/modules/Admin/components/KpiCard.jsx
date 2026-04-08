import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { s } from '../AdminStyles';

export function KpiCard({ label, value, icon, color, trend, onPress }) {
  const trendValue = typeof trend === 'number' ? trend : null;
  const trendPrefix = trendValue !== null && trendValue > 0 ? '+' : '';

  return (
    <TouchableOpacity
      style={[s.kpiCard, { borderLeftColor: color }]}
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={s.kpiIcon}>{icon}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {trendValue !== null ? (
        <Text style={[s.kpiTrend, { color: trendValue >= 0 ? COLORS.green : COLORS.red }]}> 
          {trendPrefix}{trendValue}%
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
