import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';
import { Loader } from '../components/CommonComponents';
import { AuditLog } from '../components/AuditLog';

export function AuditLogTab({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [entries, setEntries] = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ limit: '80' });
      if (moduleFilter !== 'ALL') params.append('module', moduleFilter);
      const data = await apiRequest(`/admin/audit-logs?${params.toString()}`, { accessToken });
      const rows = Array.isArray(data?.items) ? data.items : [];
      setEntries(rows.map((row) => ({
        id: row.id,
        action: `${row.module} · ${row.action}`,
        actor: `${row.actorName}${row.businessName ? ` · ${row.businessName}` : ''}`,
        createdAt: row.createdAt,
      })));
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar log de auditoria.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, moduleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScrollRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
        {['ALL', 'HT', 'DI', 'BW', 'EV', 'HE', 'ED', 'PS'].map((mod) => (
          <TouchableOpacity key={mod} style={[s.filterChip, moduleFilter === mod ? s.filterChipActive : null]} onPress={() => setModuleFilter(mod)}>
            <Text style={[s.filterChipText, moduleFilter === mod ? s.filterChipTextActive : null]}>{mod === 'ALL' ? 'Modulo: todos' : mod}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}
      >
        <AuditLog entries={entries} />
      </ScrollView>
    </View>
  );
}
