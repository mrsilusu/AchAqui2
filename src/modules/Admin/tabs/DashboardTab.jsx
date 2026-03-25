import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';
import { KpiCard } from '../components/KpiCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { Loader, StatsRow } from '../components/CommonComponents';

export function DashboardTab({ accessToken, onOpenClaims, onOpenBusinesses, onOpenUsers, onOpenModeration }) {
  const [stats, setStats] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [moderationData, setModerationData] = useState({ total: 0 });
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, claimsData, moderation] = await Promise.all([
        apiRequest('/admin/stats', { accessToken }),
        apiRequest('/admin/claims?status=PENDING', { accessToken }),
        apiRequest('/admin/content/moderation?type=all', { accessToken }).catch(() => ({ total: 0 })),
      ]);
      setStats(statsData);
      setPendingClaims(Array.isArray(claimsData) ? claimsData : []);
      setModerationData(moderation || { total: 0 });
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const oldPendingCount = useMemo(() => {
    const now = Date.now();
    return pendingClaims.filter((c) => {
      const createdAt = new Date(c?.createdAt || 0).getTime();
      const ageDays = Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));
      return ageDays >= 7;
    }).length;
  }, [pendingClaims]);

  const alerts = useMemo(() => {
    const items = [];
    if (oldPendingCount > 0) {
      items.push({
        id: 'claims-old',
        title: `Claims pendentes antigos: ${oldPendingCount}`,
        sub: 'Existem claims com mais de 7 dias.',
        onPress: () => onOpenClaims?.('PENDING'),
      });
    }

    if ((moderationData?.total || 0) > 0) {
      items.push({
        id: 'moderation',
        title: `Conteudo para moderacao: ${moderationData.total}`,
        sub: 'Reviews/Q&A sinalizados requerem acao.',
        onPress: () => onOpenModeration?.(),
      });
    }

    const growthBusinesses = Number(stats?.growth?.businesses?.changePct || 0);
    if (growthBusinesses > 0) {
      items.push({
        id: 'growth',
        title: `Negocios em crescimento (+${growthBusinesses}%)`,
        sub: `${stats?.growth?.businesses?.current || 0} novos no periodo atual.`,
        onPress: () => onOpenBusinesses?.({ filter: 'all' }),
      });
    }

    return items;
  }, [oldPendingCount, moderationData?.total, onOpenClaims, onOpenModeration, stats?.growth?.businesses?.changePct, stats?.growth?.businesses?.current, onOpenBusinesses]);

  if (loading) return <Loader />;

  const activity = Array.isArray(stats?.recentActivity) ? stats.recentActivity : [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Alertas Operacionais</Text>
        {!alerts.length ? (
          <Text style={s.sectionCaption}>Sem alertas criticos agora.</Text>
        ) : alerts.map((alertItem) => (
          <TouchableOpacity key={alertItem.id} style={s.alertCard} onPress={alertItem.onPress} activeOpacity={0.8}>
            <Text style={s.alertTitle}>{alertItem.title}</Text>
            <Text style={s.alertSub}>{alertItem.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Visao Geral</Text>
        <Text style={s.sectionCaption}>
          Ultimos {rangeDays} dias · atualizado {stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString('pt-PT') : 'agora'}
        </Text>

        <View style={s.rangeRow}>
          {[7, 30].map((days) => (
            <TouchableOpacity key={days} style={[s.rangeChip, rangeDays === days ? s.rangeChipActive : null]} onPress={() => setRangeDays(days)}>
              <Text style={[s.rangeChipText, rangeDays === days ? s.rangeChipTextActive : null]}>{days}d</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.kpiGrid}>
          <KpiCard label="Utilizadores" value={stats?.users?.total ?? '—'} icon="👥" color="#3B82F6" trend={stats?.growth?.users?.changePct} onPress={onOpenUsers} />
          <KpiCard label="Negocios" value={stats?.businesses?.total ?? '—'} icon="🏢" color="#10B981" trend={stats?.growth?.businesses?.changePct} onPress={() => onOpenBusinesses?.({ filter: 'all' })} />
          <KpiCard label="Premium" value={stats?.businesses?.premium ?? '—'} icon="👑" color="#F59E0B" onPress={() => onOpenBusinesses?.({ filter: 'premium' })} />
          <KpiCard label="Reclamados" value={`${stats?.businesses?.claimedPercent ?? 0}%`} icon="✅" color="#22A06B" onPress={() => onOpenBusinesses?.({ filter: 'claimed' })} />
          <KpiCard label="Claims pend." value={stats?.claims?.pending ?? '—'} icon="⏳" color="#EF4444" trend={stats?.growth?.claims?.changePct} onPress={() => onOpenClaims?.('PENDING')} />
        </View>

        <View style={s.quickStatsRow}>
          <Text style={s.quickStatsText}>Novos utilizadores hoje: <Text style={{ fontWeight: '700' }}>{stats?.usersNew?.today ?? 0}</Text></Text>
          <Text style={s.quickStatsText}>Esta semana: <Text style={{ fontWeight: '700' }}>{stats?.usersNew?.week ?? 0}</Text></Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Negocios</Text>
        <StatsRow label="Total" value={stats?.businesses?.total} />
        <StatsRow label="Reclamados" value={stats?.businesses?.claimed} accent={COLORS.green} />
        <StatsRow label="Por reclamar" value={stats?.businesses?.unclaimed} />
        <StatsRow label="Do Google" value={stats?.businesses?.fromGoogle} accent="#4285F4" />
        <StatsRow label="Criados manual." value={stats?.businesses?.manual} />
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Atividade Recente</Text>
        <ActivityFeed items={activity} />
      </View>
    </ScrollView>
  );
}
