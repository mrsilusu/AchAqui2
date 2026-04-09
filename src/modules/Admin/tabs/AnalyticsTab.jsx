import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';
import { Loader, StatsRow } from '../components/CommonComponents';

export function AnalyticsTab({ accessToken }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiRequest(`/admin/analytics?days=${days}`, { accessToken });
      setData(payload);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar analytics avancados.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader />;

  const maxValue = Math.max(1, ...(data?.trends || []).map((t) => t.users + t.businesses + t.claims));

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Analytics Avancados</Text>
        <View style={s.rangeRow}>
          {[7, 30, 90].map((d) => (
            <TouchableOpacity key={d} style={[s.rangeChip, days === d ? s.rangeChipActive : null]} onPress={() => setDays(d)}>
              <Text style={[s.rangeChipText, days === d ? s.rangeChipTextActive : null]}>{d}d</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionCaption}>Tendencia diaria (users + negocios + claims)</Text>
        <View style={s.sparklineRow}>
          {(data?.trends || []).slice(-14).map((t) => {
            const total = t.users + t.businesses + t.claims;
            const h = Math.max(8, Math.round((total / maxValue) * 72));
            return <View key={t.date} style={[s.sparkBar, { height: h }]} />;
          })}
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Funil</Text>
        <StatsRow label="Claims submetidos" value={data?.funnel?.claimsSubmitted ?? 0} />
        <StatsRow label="Claims aprovados" value={data?.funnel?.claimsApproved ?? 0} accent="#22A06B" />
        <StatsRow label="Taxa aprovacao" value={`${data?.funnel?.claimApprovalRate ?? 0}%`} />
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Segmentacao</Text>
        {(data?.segmentation?.usersByRole || []).map((row) => (
          <StatsRow key={row.role} label={`Utilizadores ${row.role}`} value={row.count} />
        ))}
        {(data?.segmentation?.businessesBySource || []).map((row) => (
          <StatsRow key={row.source} label={`Negocios ${row.source}`} value={row.count} />
        ))}
      </View>
    </ScrollView>
  );
}
