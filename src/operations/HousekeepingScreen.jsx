import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

const TASK_PRIORITY = {
  URGENT:  { label: 'Urgente',  color: '#DC2626', bg: '#FEF2F2' },
  HIGH:    { label: 'Alta',     color: '#D97706', bg: '#FFFBEB' },
  NORMAL:  { label: 'Normal',   color: '#1565C0', bg: '#EFF6FF' },
  LOW:     { label: 'Baixa',    color: '#6B7280', bg: '#F9FAFB' },
};

const ROOM_STATUS_LABEL = {
  CLEAN:       { label: 'Limpo',      color: '#22A06B' },
  DIRTY:       { label: 'Sujo',       color: '#D97706' },
  CLEANING:    { label: 'A limpar',   color: '#1565C0' },
  MAINTENANCE: { label: 'Manutenção', color: '#DC2626' },
};

function fmt(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

// ─── Card de quarto ────────────────────────────────────────────────────────────
function RoomTaskCard({ room, onMarkClean, onMarkMaintenance, loading }) {
  const [open, setOpen] = useState(false);
  const pendingTasks = (room.tasks || []).filter(t => !t.completedAt);
  const st = ROOM_STATUS_LABEL[room.status] || ROOM_STATUS_LABEL.CLEAN;
  const busy = loading === room.id;

  return (
    <View style={hkS.card}>
      <TouchableOpacity style={hkS.cardHead} onPress={() => setOpen(p => !p)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={hkS.roomNum}>Nº {room.number}</Text>
            {pendingTasks.length > 0 && (
              <View style={hkS.taskBadge}>
                <Text style={hkS.taskBadgeText}>{pendingTasks.length}</Text>
              </View>
            )}
          </View>
          <Text style={hkS.roomType}>{room.roomType?.name || 'Quarto'} · Piso {room.floor ?? 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[hkS.statusBadge, { backgroundColor: st.color + '20' }]}>
            <Text style={[hkS.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={COLORS.grayText} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={hkS.cardBody}>
          {/* Tarefas pendentes */}
          {pendingTasks.length > 0 ? (
            <>
              <Text style={hkS.sectionLabel}>TAREFAS PENDENTES</Text>
              {pendingTasks.map(task => {
                const pr = TASK_PRIORITY[task.priority] || TASK_PRIORITY.NORMAL;
                return (
                  <View key={task.id} style={hkS.taskRow}>
                    <View style={[hkS.priorityDot, { backgroundColor: pr.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={hkS.taskLabel}>{pr.label} · {fmt(task.createdAt)}</Text>
                    </View>
                    <TouchableOpacity
                      style={hkS.completeBtn}
                      onPress={() => onMarkClean(room.id, task.id)}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={COLORS.green} />
                      ) : (
                        <Icon name="check" size={16} color={COLORS.green} strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={hkS.noTasks}>Sem tarefas pendentes</Text>
          )}

          {/* Acções rápidas */}
          <View style={hkS.actions}>
            {room.status !== 'CLEAN' && (
              <TouchableOpacity
                style={[hkS.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
                onPress={() => onMarkClean(room.id, null)}
                disabled={busy}
              >
                <Icon name="check" size={14} color={COLORS.green} strokeWidth={2.5} />
                <Text style={[hkS.actionBtnText, { color: COLORS.green }]}>Marcar Limpo</Text>
              </TouchableOpacity>
            )}
            {room.status !== 'MAINTENANCE' && (
              <TouchableOpacity
                style={[hkS.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
                onPress={() => onMarkMaintenance(room.id)}
                disabled={busy}
              >
                <Icon name="info" size={14} color='#DC2626' strokeWidth={2.5} />
                <Text style={[hkS.actionBtnText, { color: '#DC2626' }]}>Manutenção</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function HousekeepingScreen({ businessId, accessToken, onClose }) {
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter]       = useState('dirty'); // dirty | all
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!businessId || !accessToken) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await backendApi.getHtDashboard(businessId, accessToken);
      if (!alive.current) return;
      // O dashboard retorna rooms com tasks via include
      // Buscar rooms com tasks directamente via getHtRooms
      const roomsData = await backendApi.getHtRooms(businessId, accessToken);
      if (!alive.current) return;
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (e) {
      if (alive.current) Alert.alert('Erro', e?.message || 'Não foi possível carregar.');
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [businessId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleMarkClean = useCallback(async (roomId, taskId) => {
    setActionLoading(roomId);
    try {
      // Completar tarefa específica se fornecida
      if (taskId) {
        await backendApi.completeHousekeepingTask(taskId, accessToken);
      }
      // Marcar o quarto como CLEAN
      await backendApi.updateHtRoom(roomId, { status: 'CLEAN' }, accessToken);
      await load(true);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Operação falhou.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, load]);

  const handleMarkMaintenance = useCallback(async (roomId) => {
    Alert.alert('Manutenção', 'Marcar quarto como em manutenção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setActionLoading(roomId);
          try {
            await backendApi.updateHtRoom(roomId, { status: 'MAINTENANCE' }, accessToken);
            await load(true);
          } catch (e) {
            Alert.alert('Erro', e?.message || 'Operação falhou.');
          } finally {
            if (alive.current) setActionLoading(null);
          }
        },
      },
    ]);
  }, [accessToken, load]);

  const filtered = filter === 'dirty'
    ? rooms.filter(r => r.status === 'DIRTY' || r.status === 'CLEANING' || r.status === 'MAINTENANCE')
    : rooms;

  const dirtyCount = rooms.filter(r => r.status === 'DIRTY' || r.status === 'CLEANING').length;
  const maintCount = rooms.filter(r => r.status === 'MAINTENANCE').length;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={hkS.root}>

        {/* Header */}
        <View style={hkS.header}>
          <TouchableOpacity style={hkS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={hkS.headerTitle}>Housekeeping</Text>
            <Text style={hkS.headerSub}>{rooms.length} quartos · {dirtyCount} para limpar · {maintCount} manutenção</Text>
          </View>
          <TouchableOpacity style={hkS.iconBtn} onPress={() => load(true)}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={hkS.filters}>
          {[
            ['dirty', `⚠️ Para limpar (${dirtyCount + maintCount})`],
            ['all',   `🏨 Todos (${rooms.length})`],
          ].map(([k, l]) => (
            <TouchableOpacity
              key={k}
              style={[hkS.filterBtn, filter === k && hkS.filterBtnActive]}
              onPress={() => setFilter(k)}
            >
              <Text style={[hkS.filterBtnText, filter === k && hkS.filterBtnTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        {loading ? (
          <View style={hkS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={hkS.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          >
            {filtered.length === 0 ? (
              <View style={hkS.empty}>
                <Text style={{ fontSize: 40, marginBottom: 14 }}>✅</Text>
                <Text style={hkS.emptyTitle}>Todos os quartos limpos</Text>
                <Text style={hkS.emptySub}>Não há quartos pendentes de limpeza.</Text>
              </View>
            ) : (
              filtered.map(room => (
                <RoomTaskCard
                  key={room.id}
                  room={room}
                  onMarkClean={handleMarkClean}
                  onMarkMaintenance={handleMarkMaintenance}
                  loading={actionLoading}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const hkS = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F7F6F2' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
                   backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:     { fontSize: 11, color: '#888', marginTop: 1 },
  filters:       { flexDirection: 'row', padding: 12, gap: 8,
                   backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  filterBtn:     { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                   backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#E5E7EB' },
  filterBtnActive: { backgroundColor: '#1565C020', borderColor: '#1565C0' },
  filterBtnText:   { fontSize: 12, fontWeight: '600', color: '#666' },
  filterBtnTextActive: { color: '#1565C0' },
  listPad:       { padding: 14, gap: 10, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEB',
                   overflow: 'hidden' },
  cardHead:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardBody:      { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1,
                   borderTopColor: '#F0EDE6', gap: 8, paddingTop: 10 },
  roomNum:       { fontSize: 15, fontWeight: '700', color: '#111' },
  roomType:      { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:    { fontSize: 11, fontWeight: '600' },
  taskBadge:     { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#DC2626',
                   alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  taskBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  sectionLabel:  { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 0.8, marginBottom: 4 },
  taskRow:       { flexDirection: 'row', alignItems: 'center', gap: 8,
                   paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  priorityDot:   { width: 8, height: 8, borderRadius: 4 },
  taskLabel:     { fontSize: 12, color: '#555' },
  completeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0FDF4',
                   alignItems: 'center', justifyContent: 'center' },
  noTasks:       { fontSize: 12, color: '#888', fontStyle: 'italic' },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                   gap: 5, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:         { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub:      { fontSize: 13, color: '#888', textAlign: 'center' },
});
