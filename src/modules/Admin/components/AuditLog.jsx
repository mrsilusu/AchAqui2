import React from 'react';
import { View, Text } from 'react-native';
import { s } from '../AdminStyles';

export function AuditLog({ entries = [] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Log de Auditoria</Text>
      {entries.length === 0 ? (
        <Text style={s.sectionCaption}>Sem entradas recentes.</Text>
      ) : entries.map((entry) => (
        <View key={entry.id} style={s.historyClaimRow}>
          <Text style={s.historyClaimTitle}>{entry.action}</Text>
          <Text style={s.historyClaimSub}>{entry.actor}</Text>
          <Text style={s.historyClaimSub}>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-PT') : '—'}</Text>
        </View>
      ))}
    </View>
  );
}
