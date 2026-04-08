import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';
import { EmptyState, Loader } from '../components/CommonComponents';

export function ModerationTab({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState('all');
  const [items, setItems] = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiRequest(`/admin/content/moderation?type=${encodeURIComponent(type)}`, { accessToken });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar moderacao.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(item) {
    try {
      const endpoint = item.itemType === 'QUESTION' ? `/admin/content/questions/${item.id}` : `/admin/content/reviews/${item.id}`;
      await apiRequest(endpoint, { method: 'DELETE', accessToken });
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel remover conteudo.');
    }
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.filterRowCompact}>
        {[
          { id: 'all', label: 'Tudo' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'questions', label: 'Q&A' },
        ].map((opt) => (
          <TouchableOpacity key={opt.id} style={[s.filterChip, type === opt.id ? s.filterChipActive : null]} onPress={() => setType(opt.id)}>
            <Text style={[s.filterChipText, type === opt.id ? s.filterChipTextActive : null]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}>
        <View style={s.section}>
          {!items.length ? (
            <EmptyState emoji="🛡️" title="Sem conteudo sinalizado" text="Nao foram encontrados itens para moderacao." />
          ) : items.map((item) => (
            <View key={`${item.itemType}-${item.id}`} style={s.adminClaimCard}>
              <View style={s.adminClaimTop}>
                <Text style={s.adminClaimBizName}>{item.business?.name || 'Negocio'}</Text>
                <View style={[s.statusBadge, { backgroundColor: item.severity === 'high' ? '#FFF0F0' : '#FFFBEB' }]}>
                  <Text style={[s.statusBadgeText, { color: item.severity === 'high' ? COLORS.red : '#B45309' }]}>{item.itemType}</Text>
                </View>
              </View>
              <Text style={s.adminClaimUserText}>{item.user?.name || item.user?.email || 'Utilizador'}</Text>
              <Text style={s.adminClaimEvidence}>{item.text}</Text>
              <View style={s.adminClaimActions}>
                <TouchableOpacity style={[s.adminActionBtn, s.rejectBtn]} onPress={() => handleRemove(item)}>
                  <Text style={s.rejectBtnText}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
