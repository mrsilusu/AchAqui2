// =============================================================================
// DashboardPMS.jsx — Sprint 2 PMS
// Dashboard operacional: ocupação, quartos, chegadas/saídas, receita do dia
// Props:
//   businessId   — ID do negócio
//   accessToken  — JWT do owner
//   onOpenReception — callback para abrir o ReceptionScreen
//   onOpenFolio   — callback para abrir o FolioScreen (reserva seleccionada)
//   onClose       — fechar o modal
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';
import { Alert } from 'react-native';

// ─── Constantes de cor por estado do quarto ──────────────────────────────────
const ROOM_STATUS = {
  CLEAN:       { label: 'Livre',        color: '#22A06B', bg: '#F0FDF4' },
  DIRTY:       { label: 'Sujo',         color: '#D97706', bg: '#FFFBEB' },
  CLEANING:    { label: 'A limpar',     color: '#1565C0', bg: '#EFF6FF' },
  MAINTENANCE: { label: 'Manutenção',   color: '#DC2626', bg: '#FEF2F2' },
  INSPECTING:  { label: 'Inspecção',    color: '#7C3AED', bg: '#F5F3FF' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function fmtMoney(n) {
  if (!n) return '0 Kz';
  return `${Number(n).toLocaleString('pt-PT')} Kz`;
}

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, color, sub }) {
  return (
    <View style={[dS.metricCard, { borderTopColor: color }]}>
      <Icon name={icon} size={18} color={color} strokeWidth={2} />
      <Text style={[dS.metricValue, { color }]}>{value}</Text>
      <Text style={dS.metricLabel}>{label}</Text>
      {sub ? <Text style={dS.metricSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Card de quarto ───────────────────────────────────────────────────────────
function RoomCard({ room }) {
  const st = ROOM_STATUS[room.status] || ROOM_STATUS.CLEAN;
  const hasGuest = !!room.guest;

  return (
    <View style={[dS.roomCard, { borderLeftColor: st.color }]}>
      <View style={dS.roomCardTop}>
        <Text style={dS.roomNumber}>Nº {room.number}</Text>
        <View style={[dS.roomBadge, { backgroundColor: st.bg }]}>
          <Text style={[dS.roomBadgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={dS.roomType}>{room.typeName}</Text>
      {hasGuest && (
        <View style={dS.roomGuest}>
          <Icon name="user" size={11} color={COLORS.grayText} strokeWidth={2} />
          <Text style={dS.roomGuestText} numberOfLines={1}>{room.guest}</Text>
          {room.checkOut && (
            <Text style={dS.roomCheckOut}>saída {fmtDate(room.checkOut)}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DashboardPMS({ businessId, accessToken, onOpenReception, onClose }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [seeding, setSeeding]       = useState(false);

  const seedRooms = useCallback(async () => {
    if (!businessId || !accessToken) return;
    setSeeding(true);
    try {
      const res = await backendApi.seedHtRooms(businessId, accessToken);
      Alert.alert('Quartos gerados', res.message || 'Quartos físicos criados com sucesso.');
      load(); // recarregar dashboard
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível gerar os quartos.');
    } finally {
      setSeeding(false);
    }
  }, [businessId, accessToken, load]);
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
      setData(result);
    } catch (e) {
      if (!alive.current) return;
      setError(e?.message || 'Erro ao carregar dashboard. Verifique a ligação.');
      setData(null);
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [businessId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const todayStr = fmtDate(today);

  // ─── Agrupar quartos por piso ───────────────────────────────────────────
  const roomsByFloor = {};
  (data?.rooms || []).forEach(r => {
    const floor = r.floor != null ? `Piso ${r.floor}` : 'Sem piso';
    if (!roomsByFloor[floor]) roomsByFloor[floor] = [];
    roomsByFloor[floor].push(r);
  });

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={dS.root}>

        {/* ── Header ── */}
        <View style={dS.header}>
          <TouchableOpacity style={dS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={dS.headerTitle}>Dashboard</Text>
            <Text style={dS.headerSub}>{todayStr}</Text>
          </View>
          <TouchableOpacity style={dS.iconBtn} onPress={() => load(true)}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={dS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={dS.loadingText}>A carregar dashboard...</Text>
          </View>
        ) : error ? (
          <View style={dS.center}>
            <Icon name="alertCircle" size={36} color="#DC2626" strokeWidth={1.5} />
            <Text style={dS.errorTitle}>Erro ao carregar</Text>
            <Text style={dS.errorText}>{error}</Text>
            <TouchableOpacity style={dS.retryBtn} onPress={() => load()}>
              <Text style={dS.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={dS.scroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.blue} />
            }
          >
            {/* ── Taxa de ocupação ── */}
            <View style={dS.occupancyCard}>
              <View style={dS.occupancyLeft}>
                <Text style={dS.occupancyLabel}>Taxa de Ocupação</Text>
                <Text style={dS.occupancyValue}>{data?.occupancyRate ?? 0}%</Text>
                <Text style={dS.occupancySub}>
                  {data?.today?.guests ?? 0} hóspedes · {data?.roomStats?.total ?? 0} quartos
                </Text>
              </View>
              {/* Barra de ocupação */}
              <View style={dS.occupancyBarWrap}>
                <View style={dS.occupancyBarBg}>
                  <View style={[dS.occupancyBarFill, { width: `${data?.occupancyRate ?? 0}%` }]} />
                </View>
                <View style={dS.occupancyLegend}>
                  {[
                    { label: 'Livres',     n: data?.roomStats?.clean ?? 0,       color: '#22A06B' },
                    { label: 'Sujos',      n: data?.roomStats?.dirty ?? 0,       color: '#D97706' },
                    { label: 'Manut.',     n: data?.roomStats?.maintenance ?? 0, color: '#DC2626' },
                  ].map(l => (
                    <View key={l.label} style={dS.legendItem}>
                      <View style={[dS.legendDot, { backgroundColor: l.color }]} />
                      <Text style={dS.legendText}>{l.n} {l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Métricas do dia ── */}
            <Text style={dS.sectionTitle}>Hoje</Text>
            <View style={dS.metricsRow}>
              <MetricCard
                icon="reservation"   label="Chegadas"
                value={data?.today?.arrivals ?? 0}
                color="#1565C0"
              />
              <MetricCard
                icon="arrow"  label="Saídas"
                value={data?.today?.departures ?? 0}
                color="#D97706"
              />
              <MetricCard
                icon="home"     label="Em Casa"
                value={data?.today?.guests ?? 0}
                color="#22A06B"
              />
              <MetricCard
                icon="settings"     label="Housekeeping"
                value={data?.housekeeping?.pendingTasks ?? 0}
                color={data?.housekeeping?.pendingTasks > 0 ? '#DC2626' : '#6B7280'}
                sub="tarefas"
              />
            </View>

            {/* ── Receita do dia ── */}
            <View style={dS.revenueCard}>
              <Icon name="analytics" size={18} color="#22A06B" strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={dS.revenueLabel}>Receita do Dia</Text>
                <Text style={dS.revenueValue}>{fmtMoney(data?.today?.revenue)}</Text>
              </View>
              <Text style={dS.revenueSub}>checkouts pagos</Text>
            </View>

            {/* ── Botões PMS ── */}
            <View style={dS.pmsButtons}>
              <TouchableOpacity style={dS.receptionBtn} onPress={onOpenReception}>
                <Icon name="hotel" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Receção</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* ── Room Rack ── */}
            <Text style={dS.sectionTitle}>Quartos</Text>
            {data?.rooms?.length === 0 || !data ? (
              <View style={dS.empty}>
                <Icon name="hotel" size={32} color="#CCC" strokeWidth={1.5} />
                <Text style={dS.emptyText}>{'Ainda não há quartos físicos.\nOs tipos de quarto existem mas precisam de ser gerados.'}</Text>
                <TouchableOpacity
                  style={[dS.retryBtn, seeding && { opacity: 0.6 }]}
                  onPress={seedRooms}
                  disabled={seeding}
                >
                  <Text style={dS.retryBtnText}>
                    {seeding ? 'A gerar...' : 'Gerar quartos físicos'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              Object.entries(roomsByFloor).map(([floor, rooms]) => (
                <View key={floor}>
                  <Text style={dS.floorLabel}>{floor}</Text>
                  <View style={dS.roomGrid}>
                    {rooms.map(r => <RoomCard key={r.id} room={r} />)}
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const dS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F7F6F2' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:    { fontSize: 12, color: '#888', marginTop: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText:  { marginTop: 10, color: '#888', fontSize: 13 },
  scroll:       { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 8 },

  // Ocupação
  occupancyCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  occupancyLeft:    { marginBottom: 12 },
  occupancyLabel:   { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  occupancyValue:   { fontSize: 36, fontWeight: '800', color: '#111', letterSpacing: -1, marginTop: 2 },
  occupancySub:     { fontSize: 13, color: '#888', marginTop: 2 },
  occupancyBarWrap: { gap: 8 },
  occupancyBarBg:   { height: 8, backgroundColor: '#F0EDE6', borderRadius: 4, overflow: 'hidden' },
  occupancyBarFill: { height: '100%', backgroundColor: '#22A06B', borderRadius: 4 },
  occupancyLegend:  { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:        { width: 8, height: 8, borderRadius: 4 },
  legendText:       { fontSize: 12, color: '#666' },

  // Métricas
  metricsRow:   { flexDirection: 'row', gap: 8 },
  metricCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  metricValue:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel:  { fontSize: 11, color: '#888', fontWeight: '600', textAlign: 'center' },
  metricSub:    { fontSize: 10, color: '#aaa' },

  // Receita
  revenueCard:  { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  revenueLabel: { fontSize: 12, color: '#166534', fontWeight: '600' },
  revenueValue: { fontSize: 20, fontWeight: '800', color: '#166534', letterSpacing: -0.5, marginTop: 2 },
  revenueSub:   { fontSize: 11, color: '#16a34a' },

  // Botão Receção
  receptionBtn:     { backgroundColor: '#22A06B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  receptionBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },

  // Room rack
  floorLabel:   { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 6, marginTop: 4 },
  roomGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  roomCard:     { width: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  roomCardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomNumber:   { fontSize: 14, fontWeight: '700', color: '#111' },
  roomBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roomBadgeText:{ fontSize: 10, fontWeight: '700' },
  roomType:     { fontSize: 11, color: '#888', marginBottom: 4 },
  roomGuest:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  roomGuestText:{ fontSize: 11, color: '#444', flex: 1 },
  roomCheckOut: { fontSize: 10, color: '#D97706' },

  // Empty
  empty:        { alignItems: 'center', padding: 24 },
  emptyText:    { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
});