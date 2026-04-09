import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Icon, COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { ImportModal } from '../ImportModal';
import { BIZ_FILTERS } from '../constants';
import { s } from '../AdminStyles';
import { Loader } from '../components/CommonComponents';
import { BusinessAdminRow } from '../components/BusinessAdminRow';

export function BusinessesTab({
  accessToken,
  onImpersonationSession,
  forcedFilter,
  forcedSearch,
  onConsumeForcedFilter,
  onConsumeForcedSearch,
  onOpenClaims,
}) {
  const [businesses, setBusinesses] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [acting, setActing] = useState({});
  const [editBiz, setEditBiz] = useState(null);
  const [claimHistory, setClaimHistory] = useState(null);
  const [claimHistoryLoading, setClaimHistoryLoading] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async (pg = 1, q = search, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pg === 1) setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(pg), limit: '20' });
      if (q.trim()) params.append('search', q.trim());
      const data = await apiRequest(`/admin/businesses?${params}`, { accessToken });
      if (pg === 1) setBusinesses(data.data || []);
      else setBusinesses((prev) => [...prev, ...(data.data || [])]);
      setMeta(data.meta);
      setPage(pg);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar negocios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    load(1, '', false);
  }, []);

  useEffect(() => {
    if (!forcedFilter) return;
    setFilter(forcedFilter);
    onConsumeForcedFilter?.();
  }, [forcedFilter, onConsumeForcedFilter]);

  useEffect(() => {
    if (!forcedSearch) return;
    setSearch(forcedSearch);
    load(1, forcedSearch, false);
    onConsumeForcedSearch?.();
  }, [forcedSearch, onConsumeForcedSearch]);

  function handleSearch(text) {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, text), 350);
  }

  const availableCategories = useMemo(() => {
    const all = businesses.map((biz) => (biz?.category || '').trim()).filter(Boolean);
    return ['all', ...Array.from(new Set(all)).slice(0, 20)];
  }, [businesses]);

  const displayed = businesses.filter((biz) => {
    if (filter === 'claimed') return biz.isClaimed;
    if (filter === 'unclaimed') return !biz.isClaimed;
    if (filter === 'active') return biz.isActive !== false;
    if (filter === 'inactive') return biz.isActive === false;
    if (filter === 'premium') return !!biz.metadata?.isPremium;
    if (filter === 'google') return biz.source === 'GOOGLE';
    if (filter === 'manual') return biz.source !== 'GOOGLE';
    return true;
  }).filter((biz) => {
    if (categoryFilter === 'all') return true;
    return (biz?.category || '').toLowerCase() === categoryFilter.toLowerCase();
  });

  const setAct = (id, type, val) => {
    setActing((prev) => (val ? { ...prev, [id]: type } : { ...prev, [id]: undefined }));
  };

  async function handleToggleActive(biz) {
    setAct(biz.id, 'active', true);
    try {
      const res = await apiRequest(`/admin/businesses/${biz.id}/toggle-active`, { method: 'PATCH', accessToken });
      setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, isActive: res.isActive } : b)));
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Falhou.');
    } finally {
      setAct(biz.id, 'active', false);
    }
  }

  async function handleTogglePremium(biz) {
    setAct(biz.id, 'premium', true);
    try {
      const res = await apiRequest(`/admin/businesses/${biz.id}/toggle-premium`, { method: 'PATCH', accessToken });
      setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, metadata: res.metadata } : b)));
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Falhou.');
    } finally {
      setAct(biz.id, 'premium', false);
    }
  }

  function handleUnclaim(biz) {
    if (!biz.isClaimed) return;
    Alert.alert('Remover dono', `Remover o dono de "${biz.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setAct(biz.id, 'unclaim', true);
          try {
            await apiRequest(`/admin/businesses/${biz.id}/unclaim`, { method: 'PATCH', accessToken });
            setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? { ...b, isClaimed: false, owner: null } : b)));
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Falhou.');
          } finally {
            setAct(biz.id, 'unclaim', false);
          }
        },
      },
    ]);
  }

  function handleDelete(biz) {
    Alert.alert('Eliminar negocio', `Eliminar "${biz.name}"? Esta acao e irreversivel.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setAct(biz.id, 'delete', true);
          try {
            await apiRequest(`/admin/businesses/${biz.id}`, { method: 'DELETE', accessToken });
            setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
            setMeta((prev) => (prev ? { ...prev, total: prev.total - 1 } : prev));
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Falhou.');
          } finally {
            setAct(biz.id, 'delete', false);
          }
        },
      },
    ]);
  }

  async function handleOpenClaimHistory(biz) {
    setClaimHistoryLoading(true);
    try {
      const data = await apiRequest(`/admin/businesses/${biz.id}/claims`, { accessToken });
      setClaimHistory(data);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar historico de claims.');
    } finally {
      setClaimHistoryLoading(false);
    }
  }

  function handleImpersonateOwner(biz) {
    if (!biz?.owner?.id) {
      Alert.alert('Sem dono', 'Este negocio ainda nao tem dono associado.');
      return;
    }

    Alert.alert('Entrar no modo dono', `Entrar temporariamente como dono de "${biz.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Entrar',
        onPress: async () => {
          setAct(biz.id, 'impersonate', true);
          try {
            const session = await apiRequest(`/admin/businesses/${biz.id}/impersonate-owner`, {
              method: 'POST',
              body: { durationMinutes: 20 },
              accessToken,
            });
            if (!session?.accessToken || !session?.user) throw new Error('Resposta invalida da impersonacao.');
            await onImpersonationSession?.(session);
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Nao foi possivel entrar no modo dono.');
          } finally {
            setAct(biz.id, 'impersonate', false);
          }
        },
      },
    ]);
  }

  async function saveBusinessEdit() {
    if (!editBiz?.id) return;
    setAct(editBiz.id, 'edit', true);
    try {
      const res = await apiRequest(`/admin/businesses/${editBiz.id}`, {
        method: 'PATCH',
        body: {
          name: editBiz.name,
          category: editBiz.category,
          description: editBiz.description,
          isActive: editBiz.isActive,
        },
        accessToken,
      });
      setBusinesses((prev) => prev.map((b) => (b.id === res.id ? { ...b, ...res } : b)));
      setEditBiz(null);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel atualizar negocio.');
    } finally {
      setAct(editBiz.id, 'edit', false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
        <View style={[s.searchBoxInTab, { flex: 1 }]}>
          <Icon name="search" size={16} color={COLORS.grayText} strokeWidth={2} />
          <TextInput style={s.searchInputInTab} placeholder="Pesquisar negocio..." placeholderTextColor={COLORS.grayText} value={search} onChangeText={handleSearch} />
        </View>
        <TouchableOpacity style={s.importBtn} onPress={() => setShowImport(true)} activeOpacity={0.7}>
          <Icon name="upload" size={18} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScrollRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
        {BIZ_FILTERS.map((f) => (
          <TouchableOpacity key={f.id} style={[s.filterChip, filter === f.id ? s.filterChipActive : null]} onPress={() => setFilter(f.id)}>
            <Text style={[s.filterChipText, filter === f.id ? s.filterChipTextActive : null]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScrollRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
        {availableCategories.map((cat) => (
          <TouchableOpacity key={cat} style={[s.filterChip, categoryFilter === cat ? s.filterChipActive : null]} onPress={() => setCategoryFilter(cat)}>
            <Text style={[s.filterChipText, categoryFilter === cat ? s.filterChipTextActive : null]}>{cat === 'all' ? 'Categoria: todas' : cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ImportModal visible={showImport} onClose={() => { setShowImport(false); load(1, search, true); }} accessToken={accessToken} />

      {loading ? (
        <Loader />
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, search, true)} tintColor={COLORS.red} />}>
          {meta ? <Text style={s.metaText}>{meta.total} negocios{(filter !== 'all' || categoryFilter !== 'all') ? ` · ${displayed.length} filtrados` : ''}</Text> : null}

          {displayed.map((biz) => (
            <BusinessAdminRow
              key={biz.id}
              biz={biz}
              actingType={acting[biz.id]}
              claimHistoryLoading={claimHistoryLoading}
              onToggleActive={() => handleToggleActive(biz)}
              onTogglePremium={() => handleTogglePremium(biz)}
              onUnclaim={() => handleUnclaim(biz)}
              onImpersonate={() => handleImpersonateOwner(biz)}
              onEdit={() => setEditBiz({
                id: biz.id,
                name: biz.name || '',
                category: biz.category || '',
                description: biz.description || '',
                isActive: biz.isActive !== false,
              })}
              onClaimHistory={() => handleOpenClaimHistory(biz)}
              onDelete={() => handleDelete(biz)}
            />
          ))}

          {meta && page < meta.totalPages ? (
            <TouchableOpacity style={s.loadMoreBtn} onPress={() => load(page + 1)}>
              <Text style={s.loadMoreText}>Carregar mais</Text>
            </TouchableOpacity>
          ) : null}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {editBiz ? (
        <View style={s.noteModalOverlay}>
          <View style={s.noteModal}>
            <Text style={s.noteModalTitle}>Editar Negocio</Text>
            <TextInput style={s.noteInput} placeholder="Nome" value={editBiz.name} onChangeText={(t) => setEditBiz((p) => ({ ...p, name: t }))} />
            <TextInput style={[s.noteInput, { marginTop: 8 }]} placeholder="Categoria" value={editBiz.category} onChangeText={(t) => setEditBiz((p) => ({ ...p, category: t }))} />
            <TextInput style={[s.noteInput, { marginTop: 8, minHeight: 90 }]} multiline textAlignVertical="top" placeholder="Descricao" value={editBiz.description} onChangeText={(t) => setEditBiz((p) => ({ ...p, description: t }))} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={s.noteModalCancelBtn} onPress={() => setEditBiz(null)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.noteModalConfirmBtn} onPress={saveBusinessEdit}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {claimHistory ? (
        <View style={s.noteModalOverlay}>
          <View style={[s.noteModal, { maxHeight: '82%' }]}>
            <Text style={s.noteModalTitle}>Historico de Claims</Text>
            <Text style={s.noteModalSub}>{claimHistory.business?.name}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {(claimHistory.claims || []).map((claim) => (
                <View key={claim.id} style={s.historyClaimRow}>
                  <Text style={s.historyClaimTitle}>{claim.status}</Text>
                  <Text style={s.historyClaimSub}>{claim.user?.name || claim.user?.email}</Text>
                  <Text style={s.historyClaimSub}>{claim.createdAt ? new Date(claim.createdAt).toLocaleString('pt-PT') : '—'}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={s.noteModalCancelBtn} onPress={() => setClaimHistory(null)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.noteModalConfirmBtn}
                onPress={() => {
                  setClaimHistory(null);
                  onOpenClaims?.('PENDING');
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>Abrir tab Claims</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
