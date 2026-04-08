import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { s } from '../AdminStyles';

export function ActivityFeed({ items = [], onPressItem }) {
  if (!items.length) {
    return <Text style={s.sectionCaption}>Sem atividade recente.</Text>;
  }

  return items.map((item) => (
    <TouchableOpacity
      key={`${item.type}-${item.id}`}
      style={s.activityRow}
      onPress={() => onPressItem?.(item)}
      disabled={!onPressItem}
      activeOpacity={0.75}
    >
      <View style={s.activityDot} />
      <View style={{ flex: 1 }}>
        <Text style={s.activityTitle}>{item.title}</Text>
        <Text style={s.activitySub}>{item.subtitle}</Text>
      </View>
      <Text style={s.activityTime}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-PT') : '—'}
      </Text>
    </TouchableOpacity>
  ));
}
