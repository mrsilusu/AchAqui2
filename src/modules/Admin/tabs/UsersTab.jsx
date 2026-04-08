import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Icon, COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';
import { Loader } from '../components/CommonComponents';
import { UserAdminRow, getNextRole } from '../components/UserAdminRow';

export function UsersTab({ accessToken, onOpenBusinesses }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [acting, setActing] = useState({});
  const [userBusinessesModal, setUserBusinessesModal] = useState(null);
  const [userBusinessesLoading, setUserBusinessesLoading] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async (pg = 1, q = search, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pg === 1) setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(pg), limit: '20' });
      if (q.trim()) params.append('search', q.trim());
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter === 'ACTIVE') params.append('suspended', 'false');
      if (statusFilter === 'SUSPENDED') params.append('suspended', 'true');
      if (businessFilter === 'WITH') params.append('hasBusinesses', 'true');
      if (businessFilter === 'WITHOUT') params.append('hasBusinesses', 'false');
      const data = await apiRequest(`/admin/users?${params}`, { accessToken });
      if (pg === 1) setUsers(data.data || []);
      else setUsers((prev) => [...prev, ...(data.data || [])]);
      setMeta(data.meta);
      setPage(pg);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar utilizadores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, search, roleFilter, statusFilter, businessFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(text) {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, text), 350);
  }

  const setAct = (id, type, val) => {
    setActing((prev) => (val ? { ...prev, [id]: type } : { ...prev, [id]: undefined }));
  };

  async function handleChangeRole(user) {
    const nextRole = getNextRole(user.role);
    Alert.alert('Alterar role', `Alterar ${user.name || user.email} de ${user.role} para ${nextRole}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Alterar',
        onPress: async () => {
          setAct(user.id, 'role', true);
          try {
            const res = await apiRequest(`/admin/users/${user.id}/role`, { method: 'PATCH', body: { role: nextRole }, accessToken });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: res.role } : u)));
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Falhou.');
          } finally {
            setAct(user.id, 'role', false);
          }
        },
      },
    ]);
  }

  function handleDelete(user) {
    Alert.alert('Eliminar conta', `Eliminar a conta de "${user.name || user.email}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setAct(user.id, 'delete', true);
          try {
            await apiRequest(`/admin/users/${user.id}`, { method: 'DELETE', accessToken });
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setMeta((prev) => (prev ? { ...prev, total: prev.total - 1 } : prev));
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Falhou.');
          } finally {
            setAct(user.id, 'delete', false);
          }
        },
      },
    ]);
  }

  async function handleToggleSuspend(user) {
    const target = !user.isSuspended;
    Alert.alert(target ? 'Suspender conta' : 'Reativar conta', target ? `Suspender ${user.name || user.email}?` : `Reativar ${user.name || user.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: target ? 'Suspender' : 'Reativar',
        style: target ? 'destructive' : 'default',
        onPress: async () => {
          setAct(user.id, 'suspend', true);
          try {
            const res = await apiRequest(`/admin/users/${user.id}/suspend`, {
              method: 'PATCH',
              body: { suspended: target, reason: target ? 'Suspensa via painel admin' : null },
              accessToken,
            });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res } : u)));
          } catch (err) {
            Alert.alert('Erro', err?.message || 'Falhou.');
          } finally {
            setAct(user.id, 'suspend', false);
          }
        },
      },
    ]);
  }

  async function handleOpenUserBusinesses(user) {
    setUserBusinessesLoading(true);
    try {
      const data = await apiRequest(`/admin/users/${user.id}/businesses`, { accessToken });
      setUserBusinessesModal(data);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar negocios do utilizador.');
    } finally {
      setUserBusinessesLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.searchBoxInTab, { marginRight: 16 }]}> 
        <Icon name="search" size={16} color={COLORS.grayText} strokeWidth={2} />
        <TextInput style={s.searchInputInTab} placeholder="Pesquisar por nome ou email..." placeholderTextColor={COLORS.grayText} value={search} onChangeText={handleSearch} />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => { setSearch(''); load(1, ''); }}>
            <Icon name="x" size={14} color={COLORS.grayText} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScrollRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
        {['ALL', 'CLIENT', 'OWNER', 'ADMIN'].map((rf) => (
          <TouchableOpacity key={rf} style={[s.filterChip, roleFilter === rf ? s.filterChipActive : null]} onPress={() => setRoleFilter(rf)}>
            <Text style={[s.filterChipText, roleFilter === rf ? s.filterChipTextActive : null]}>{rf === 'ALL' ? 'Role: todas' : rf}</Text>
          </TouchableOpacity>
        ))}
        {[
          { id: 'ALL', label: 'Estado: todos' },
          { id: 'ACTIVE', label: 'Ativo' },
          { id: 'SUSPENDED', label: 'Suspenso' },
        ].map((sf) => (
          <TouchableOpacity key={sf.id} style={[s.filterChip, statusFilter === sf.id ? s.filterChipActive : null]} onPress={() => setStatusFilter(sf.id)}>
            <Text style={[s.filterChipText, statusFilter === sf.id ? s.filterChipTextActive : null]}>{sf.label}</Text>
          </TouchableOpacity>
        ))}
        {[
          { id: 'ALL', label: 'Negocios: todos' },
          { id: 'WITH', label: 'Com negocios' },
          { id: 'WITHOUT', label: 'Sem negocios' },
        ].map((bf) => (
          <TouchableOpacity key={bf.id} style={[s.filterChip, businessFilter === bf.id ? s.filterChipActive : null]} onPress={() => setBusinessFilter(bf.id)}>
            <Text style={[s.filterChipText, businessFilter === bf.id ? s.filterChipTextActive : null]}>{bf.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Loader />
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, search, true)} tintColor={COLORS.red} />}>
          {meta ? <Text style={s.metaText}>{meta.total} utilizadores</Text> : null}

          {users.map((user) => (
            <UserAdminRow
              key={user.id}
              user={user}
              actingType={acting[user.id]}
              userBusinessesLoading={userBusinessesLoading}
              onChangeRole={() => handleChangeRole(user)}
              onOpenBusinesses={() => handleOpenUserBusinesses(user)}
              onToggleSuspend={() => handleToggleSuspend(user)}
              onDelete={() => handleDelete(user)}
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

      {userBusinessesModal ? (
        <View style={s.noteModalOverlay}>
          <View style={[s.noteModal, { maxHeight: '82%' }]}>
            <Text style={s.noteModalTitle}>Negocios do Utilizador</Text>
            <Text style={s.noteModalSub}>{userBusinessesModal.user?.name || userBusinessesModal.user?.email}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(userBusinessesModal.ownedBusinesses || []).map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={s.historyClaimRow}
                  onPress={() => {
                    setUserBusinessesModal(null);
                    onOpenBusinesses?.({ search: biz.id });
                  }}
                >
                  <Text style={s.historyClaimTitle}>{biz.name}</Text>
                  <Text style={s.historyClaimSub}>{biz.category} · {biz.isClaimed ? 'Reclamado' : 'Por reclamar'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.noteModalCancelBtn, { marginTop: 12 }]} onPress={() => setUserBusinessesModal(null)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
