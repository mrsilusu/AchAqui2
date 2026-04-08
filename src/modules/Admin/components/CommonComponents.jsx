import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, COLORS } from '../../../core/AchAqui_Core';
import { s } from '../AdminStyles';

export function Loader() {
  return (
    <View style={s.emptyState}>
      <ActivityIndicator size="large" color={COLORS.red} />
    </View>
  );
}

export function EmptyState({ emoji, title, text }) {
  return (
    <View style={s.emptyState}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function StatsRow({ label, value, accent }) {
  return (
    <View style={s.statsRow}>
      <Text style={s.statsRowLabel}>{label}</Text>
      <Text style={[s.statsRowValue, accent ? { color: accent } : null]}>{value ?? '—'}</Text>
    </View>
  );
}

export function ActionIconBtn({ icon, color, loading, onPress }) {
  return (
    <TouchableOpacity
      style={s.actionIconBtn}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon name={icon} size={16} color={color} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}
