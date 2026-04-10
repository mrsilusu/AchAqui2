// =============================================================================
// DashboardPMS.jsx — Sprint 2 PMS
// Dashboard operacional: ocupação, quartos, chegadas/saídas, receita do dia
// Props:
//   businessId   — ID do negócio
//   accessToken  — JWT do owner
//   onOpenReception — callback para abrir o ReceptionScreen
//   onOpenStaff  — callback para abrir gestão de Staff
//   onOpenFolio   — callback para abrir o FolioScreen (reserva seleccionada)
//   onClose       — fechar o modal
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';
import { HousekeepingScreen } from './HousekeepingScreen';
import { ReceptionScreen } from './ReceptionScreen';
import { ReservationMapModal } from './ReservationMapModal';
import { GuestsScreen } from './GuestsScreen';
import { RoomGanttScreen } from './RoomGanttScreen';
import StaffManagementModal from './StaffManagementModal';
import StaffProfileSheet from './StaffProfileSheet';
import StaffActivityLog from './StaffActivityLog';
import { canSeeSection } from '../lib/staffPermissions';

// ─── Constantes de cor por estado do quarto ──────────────────────────────────
const ROOM_STATUS = {
  CLEAN:       { label: 'Livre',        color: '#22A06B', bg: '#F0FDF4' },
  OCCUPIED:    { label: 'Ocupado',      color: '#1565C0', bg: '#EFF6FF' },
  DIRTY:       { label: 'Sujo',         color: '#D97706', bg: '#FFFBEB' },
  CLEANING:    { label: 'A limpar',     color: '#6B7280', bg: '#F9FAFB' },
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

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload || !globalThis.atob) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
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
function RoomCard({ room, onMarkClean, onMarkMaintenance, actionLoading }) {
  const hasGuest   = !!room.guest;
  const hasTasks   = room.pendingTasks?.length > 0;
  const st         = hasGuest ? ROOM_STATUS.OCCUPIED : (ROOM_STATUS[room.status] || ROOM_STATUS.CLEAN);
  const busy       = actionLoading === room.id;
  const isNeedClean = room.status === 'DIRTY' || room.status === 'CLEANING';

  return (
    <View style={[dS.roomCard, { borderLeftColor: st.color }]}>
      <View style={dS.roomCardTop}>
        <Text style={dS.roomNumber}>Nº {room.number}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {hasTasks && (
            <View style={dS.taskDot}>
              <Text style={dS.taskDotText}>{room.pendingTasks.length}</Text>
            </View>
          )}
          <View style={[dS.roomBadge, { backgroundColor: st.bg }]}>
            <Text style={[dS.roomBadgeText, { color: st.color }]}>{st.label}</Text>
          </View>
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
      {/* Botão rápido para marcar limpo — só aparece quando sujo */}
      {isNeedClean && onMarkClean && (
        <TouchableOpacity
          style={dS.markCleanBtn}
          onPress={() => onMarkClean(room.id, room.pendingTasks?.[0]?.id || null)}
          disabled={busy}
        >
          {busy
            ? <ActivityIndicator size="small" color={COLORS.green} />
            : <Text style={dS.markCleanBtnText}>✓ Limpo</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Room Rack Modal ─────────────────────────────────────────────────────────
function RoomRackModal({ rooms, onMarkClean, onMarkMaintenance, actionLoading, onClose }) {
  const roomsByFloor = {};
  rooms.forEach(r => {
    const floor = r.floor != null ? `Piso ${r.floor}` : 'Sem piso';
    if (!roomsByFloor[floor]) roomsByFloor[floor] = [];
    roomsByFloor[floor].push(r);
  });

  const cleanCount    = rooms.filter(r => r.status === 'CLEAN' && !r.guest).length;
  const occupiedCount = rooms.filter(r => r.guest).length;
  const dirtyCount    = rooms.filter(r => r.status === 'DIRTY' || r.status === 'CLEANING').length;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={dS.root} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={dS.header}>
          <TouchableOpacity style={dS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={dS.headerTitle}>Quartos</Text>
            <Text style={dS.headerSub}>
              {cleanCount} livres · {occupiedCount} ocupados · {dirtyCount} para limpar
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {rooms.length === 0 ? (
            <View style={dS.empty}>
              <Text style={dS.emptyText}>Sem quartos configurados.</Text>
            </View>
          ) : (
            Object.entries(roomsByFloor).map(([floor, floorRooms]) => (
              <View key={floor}>
                <Text style={dS.floorLabel}>{floor}</Text>
                <View style={dS.roomGrid}>
                  {floorRooms.map(r => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      onMarkClean={onMarkClean}
                      onMarkMaintenance={onMarkMaintenance}
                      actionLoading={actionLoading}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DashboardPMS({
  businessId,
  accessToken,
  staffToken = null,
  onLogout,
  staffRole = null,
  onAuthExpired,
  onOpenReception,
  onClose,
  reloadTrigger = 0,
  guestBookings = [],
  roomTypes = [],
  noShowAlertBookings = [],
  onDismissNoShowAlert,
}) {
  const insets = useSafeAreaInsets();
  const isKioskStaff = !!staffToken;
  const isJwtStaff = !!staffRole && !staffToken;
  const isStaffMode = isKioskStaff || isJwtStaff;
  const effectiveAccessToken = staffToken || accessToken || null;
  const authPayload = decodeJwtPayload(effectiveAccessToken);
  const loggedUserLabel = String(
    authPayload?.fullName
      || authPayload?.name
      || authPayload?.email
      || authPayload?.sub
      || '',
  ).trim();
  const canAccessReception = !isStaffMode
    || (isJwtStaff ? (staffRole === 'HT_RECEPTIONIST' || staffRole === 'HT_MANAGER' || staffRole === 'GENERAL_MANAGER')
      : canSeeSection(staffToken, 'reception'));
  const canAccessHousekeeping = !isStaffMode
    || (isJwtStaff ? (staffRole === 'HT_HOUSEKEEPER' || staffRole === 'HT_MANAGER' || staffRole === 'GENERAL_MANAGER')
      : canSeeSection(staffToken, 'housekeeping'));
  const canAccessBookingsMgr = !isStaffMode
    || (isJwtStaff ? (staffRole === 'HT_RECEPTIONIST' || staffRole === 'HT_MANAGER' || staffRole === 'GENERAL_MANAGER')
      : canSeeSection(staffToken, 'bookingsManager'));
  const canAccessStaff = !isStaffMode
    || (isJwtStaff ? (staffRole === 'HT_MANAGER' || staffRole === 'GENERAL_MANAGER')
      : canSeeSection(staffToken, 'staffManager'));

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [sellablePercentInput, setSellablePercentInput] = useState('100');
  const [policySaving, setPolicySaving] = useState(false);
  const [businessMetadata, setBusinessMetadata] = useState({});
  const [showHousekeeping, setShowHousekeeping] = useState(false);
  const [showRooms, setShowRooms]               = useState(false);
  const [showReception, setShowReception]       = useState(false);
  const [showGuests, setShowGuests]             = useState(false);
  const [showGantt, setShowGantt]               = useState(false);
  const [pendingReceptionAction, setPendingReceptionAction] = useState(null);
  const [showMap, setShowMap]                   = useState(false);
  const [cancelBookingFromMap, setCancelBookingFromMap] = useState(null);
  const [cancelReasonFromMap, setCancelReasonFromMap] = useState('');
  const [cancelMapLoading, setCancelMapLoading] = useState(false);
  // ── Staff state (self-contained inside this modal) ───────────────────────
  const [showStaffMgmt, setShowStaffMgmt]       = useState(false);
  const [selectedStaff, setSelectedStaff]       = useState(null);
  const [showStaffProfile, setShowStaffProfile] = useState(false);
  const [showStaffActivity, setShowStaffActivity] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const handleAuthError = useCallback((error) => {
    if (!isStaffMode || error?.type !== 'token') return false;
    if (typeof onAuthExpired === 'function') {
      onAuthExpired();
      return true;
    }
    return false;
  }, [isStaffMode, onAuthExpired]);

  const load = useCallback(async (isRefresh = false) => {
    if (!businessId || !effectiveAccessToken) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await backendApi.getHtDashboard(businessId, effectiveAccessToken);
      if (!alive.current) return;
      setData(result);
    } catch (e) {
      if (!alive.current) return;
      if (handleAuthError(e)) return;
      // Falha silenciosa — mostrar dados vazios em vez de crashar
      setData(null);
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [businessId, effectiveAccessToken, handleAuthError]);

  // Recarregar quando reloadTrigger muda (ex: depois de acções na Receção)
  useEffect(() => { load(); }, [load, reloadTrigger]);

  useEffect(() => {
    let cancelled = false;
    const loadBusinessPolicy = async () => {
      if (!businessId) return;
      try {
        const biz = await backendApi.getBusiness(businessId, effectiveAccessToken);
        if (cancelled) return;
        const metadata = (biz?.metadata && typeof biz.metadata === 'object') ? biz.metadata : {};
        const raw = Number(metadata?.pms?.sellablePercent ?? 100);
        const safe = Number.isFinite(raw) ? Math.max(50, Math.min(150, Math.round(raw))) : 100;
        setBusinessMetadata(metadata);
        setSellablePercentInput(String(safe));
      } catch (e) {
        if (cancelled) return;
        if (handleAuthError(e)) return;
        setBusinessMetadata({});
        setSellablePercentInput('100');
      }
    };
    loadBusinessPolicy();
    return () => { cancelled = true; };
  }, [businessId, effectiveAccessToken, handleAuthError]);

  const submitCancelFromMap = useCallback(async () => {
    if (!cancelBookingFromMap) return;
    const reason = String(cancelReasonFromMap || '').trim();
    if (reason.length < 3) {
      Alert.alert('Motivo obrigatório', 'Descreva o motivo do cancelamento (mínimo 3 caracteres).');
      return;
    }
    setCancelMapLoading(true);
    try {
      await backendApi.cancelBooking(cancelBookingFromMap.id, { reason }, effectiveAccessToken);
      setCancelBookingFromMap(null);
      setCancelReasonFromMap('');
      load(true);
    } catch (e) {
      if (handleAuthError(e)) return;
      Alert.alert('Erro', e?.message || 'Operação falhou.');
    } finally {
      if (alive.current) setCancelMapLoading(false);
    }
  }, [cancelBookingFromMap, cancelReasonFromMap, effectiveAccessToken, handleAuthError, load]);

  const handleSaveSellablePercent = useCallback(async () => {
    const raw = Number(sellablePercentInput);
    if (!Number.isFinite(raw)) {
      Alert.alert('Valor inválido', 'Insira um número entre 50 e 150.');
      return;
    }
    const safe = Math.max(50, Math.min(150, Math.round(raw)));
    const currentPms = (businessMetadata?.pms && typeof businessMetadata.pms === 'object')
      ? businessMetadata.pms
      : {};
    const metadata = {
      ...(businessMetadata || {}),
      pms: { ...currentPms, sellablePercent: safe },
    };

    try {
      setPolicySaving(true);
      await backendApi.htUpdatePmsConfig(businessId, { overbookingBuffer: safe }, effectiveAccessToken);
      if (!alive.current) return;
      setBusinessMetadata(metadata);
      setSellablePercentInput(String(safe));
      Alert.alert('Política guardada', `Capacidade vendável definida para ${safe}%.`);
      await load(true);
    } catch (e) {
      if (!alive.current) return;
      if (handleAuthError(e)) return;
      Alert.alert('Erro', e?.message || 'Não foi possível guardar a política de capacidade.');
    } finally {
      if (alive.current) setPolicySaving(false);
    }
  }, [sellablePercentInput, businessMetadata, businessId, effectiveAccessToken, handleAuthError, load]);

  // ─── Housekeeping: marcar quarto como limpo ou em manutenção ─────────────
  const handleMarkClean = useCallback(async (roomId, taskId) => {
    setActionLoading(roomId);
    try {
      if (taskId) await backendApi.completeHousekeepingTask(taskId, effectiveAccessToken);
      else await backendApi.updateHtRoom(roomId, { status: 'INSPECTING' }, effectiveAccessToken);
      await load(true);
    } catch (e) {
      if (handleAuthError(e)) return;
      Alert.alert('Erro', e?.message || 'Não foi possível marcar o quarto como limpo.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [effectiveAccessToken, handleAuthError, load]);

  const handleMarkMaintenance = useCallback(async (roomId) => {
    Alert.alert('Manutenção', 'Marcar quarto como em manutenção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setActionLoading(roomId);
          try {
            await backendApi.updateHtRoom(roomId, { status: 'MAINTENANCE' }, effectiveAccessToken);
            await load(true);
          } catch (e) {
            if (handleAuthError(e)) return;
            Alert.alert('Erro', e?.message || 'Operação falhou.');
          } finally {
            if (alive.current) setActionLoading(null);
          }
        },
      },
    ]);
  }, [effectiveAccessToken, handleAuthError, load]);

  const today = new Date();
  const todayStr = fmtDate(today);
  const showNoShowBanner = noShowAlertBookings.length > 0;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={dS.root} edges={['left', 'right']}>

        {/* ── Header ── */}
        <View style={[dS.header, { paddingTop: Math.max(14, insets.top + 8) }]}>
          <TouchableOpacity style={dS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={dS.headerTitle}>Dashboard</Text>
            <Text style={dS.headerSub}>{todayStr}</Text>
            {!!loggedUserLabel && (
              <Text style={dS.headerUserText} numberOfLines={1}>
                Utilizador: {loggedUserLabel}
              </Text>
            )}
          </View>
          {isStaffMode && typeof onLogout === 'function' ? (
            <TouchableOpacity style={[dS.iconBtn, dS.logoutBtn]} onPress={onLogout}>
              <Text style={dS.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={dS.iconBtn} onPress={() => load(true)}>
              <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={dS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={dS.loadingText}>A carregar dashboard...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={dS.scroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.blue} />
            }
          >
            {showNoShowBanner && (
              <View style={{
                marginHorizontal: 16, marginBottom: 12, padding: 14,
                backgroundColor: '#FEF2F2', borderRadius: 12,
                borderWidth: 1, borderColor: '#FECACA',
                flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                    {noShowAlertBookings.length} reserva{noShowAlertBookings.length !== 1 ? 's' : ''}
                    {' '}sem check-in — Verificar antes de marcar No-Show
                  </Text>
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 3 }}>
                    Ir à Receção para gerir estas reservas.
                  </Text>
                </View>
                <TouchableOpacity onPress={onDismissNoShowAlert} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, color: '#DC2626', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

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
                    { label: 'Livres',    n: data?.roomStats?.clean ?? 0,       color: '#22A06B' },
                    { label: 'Ocupados',  n: data?.roomStats?.occupied ?? 0,    color: '#1565C0' },
                    { label: 'Sujos',     n: data?.roomStats?.dirty ?? 0,       color: '#D97706' },
                    { label: 'Manut.',    n: data?.roomStats?.maintenance ?? 0, color: '#DC2626' },
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
              <View style={dS.metricsRow}>
                <MetricCard
                  icon="analytics"  label="ADR"
                  value={`${(data?.kpis?.adr ?? 0).toLocaleString()} Kz`}
                  color="#0891B2"
                />
                <MetricCard
                  icon="analytics"  label="RevPAR"
                  value={`${(data?.kpis?.revpar ?? 0).toLocaleString()} Kz`}
                  color="#7C3AED"
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

            {/* ── Overbooking Buffer / Stop-Sell ── */}
            {!isStaffMode && (
              <View style={dS.policyCard}>
              <Text style={dS.policyTitle}>Overbooking Buffer / Stop-Sell</Text>
              <Text style={dS.policyText}>
                Define a capacidade vendável por tipo de quarto. 100% = capacidade real; 90% = buffer operacional; 105% = overbooking controlado.
              </Text>
              <View style={dS.policyRow}>
                <TextInput
                  style={dS.policyInput}
                  value={sellablePercentInput}
                  onChangeText={setSellablePercentInput}
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!policySaving}
                />
                <Text style={dS.policySuffix}>%</Text>
                <TouchableOpacity style={[dS.policyBtn, policySaving && { opacity: 0.7 }]} onPress={handleSaveSellablePercent} disabled={policySaving}>
                  <Text style={dS.policyBtnText}>{policySaving ? 'A guardar...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
              </View>
            )}

            {/* ── Botões PMS ── */}
            <View style={dS.pmsButtons}>
              {canAccessReception && (
              <TouchableOpacity style={dS.receptionBtn} onPress={() => setShowReception(true)}>
                <Icon name="home" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Receção</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessHousekeeping && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#7C3AED' }]}
                onPress={() => setShowHousekeeping(true)}
              >
                <Icon name="star" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>
                  Housekeeping
                  {(() => {
                    const n = (data?.rooms || []).filter(r =>
                      r.status === 'DIRTY' || r.status === 'CLEANING' || r.status === 'INSPECTING' || r.status === 'MAINTENANCE'
                    ).length;
                    return n > 0 ? ` · ${n} pendente${n !== 1 ? 's' : ''}` : '';
                  })()}
                </Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessHousekeeping && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#1565C0' }]}
                onPress={() => setShowRooms(true)}
              >
                <Icon name="hotel" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>
                  Quartos{data?.rooms?.length > 0 ? ` · ${data.rooms.length} total` : ''}
                </Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessBookingsMgr && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#D32323' }]}
                onPress={() => setShowMap(true)}
              >
                <Icon name="calendar" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Mapa de Reservas</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessBookingsMgr && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#0891B2' }]}
                onPress={() => setShowGantt(true)}
                activeOpacity={0.8}
              >
                <Icon name="calendar" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Mapa · Gantt · Quartos</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessBookingsMgr && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#7C3AED' }]}
                onPress={() => setShowGuests(true)}
              >
                <Icon name="user" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Hóspedes · Perfis / Histórico</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
              {canAccessStaff && (
              <TouchableOpacity
                style={[dS.receptionBtn, { backgroundColor: '#D97706' }]}
                onPress={() => setShowStaffMgmt(true)}
              >
                <Icon name="users" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={dS.receptionBtnText}>Staff</Text>
                <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              )}
            </View>

            {/* ── Room Calendar (vista semanal) ── */}
            {(() => {
              const today7 = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i);
                return { date: d, label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` };
              });
              const rooms7 = data?.rooms || [];
              if (rooms7.length === 0) return null;
              return (
                <>
                  <Text style={dS.sectionTitle}>Calendário — 7 dias</Text>
                  <View style={dS.calendarWrap}>
                    {/* Header dias */}
                    <View style={dS.calHeaderRow}>
                      <View style={dS.calRoomCol}><Text style={dS.calHeaderText}>Quarto</Text></View>
                      {today7.map((d, i) => (
                        <View key={i} style={[dS.calDayCol, i === 0 && dS.calDayColToday]}>
                          <Text style={[dS.calHeaderText, i === 0 && { color: '#D32323' }]}>{d.label}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Linhas por quarto */}
                    {rooms7.map(room => (
                      <View key={room.id} style={dS.calRow}>
                        <View style={dS.calRoomCol}>
                          <Text style={dS.calRoomNum} numberOfLines={1}>Nº {room.number}</Text>
                          <Text style={dS.calRoomType} numberOfLines={1}>{room.typeName}</Text>
                        </View>
                        {today7.map((d, i) => {
                          // Verificar se o quarto tem hóspede neste dia
                          const hasGuest = room.guest && (() => {
                            const co = room.checkOut ? new Date(room.checkOut) : null;
                            return co ? d.date <= co : room.status === 'CLEAN' && !!room.guest;
                          })();
                          const isDirty = !hasGuest && (room.status === 'DIRTY' || room.status === 'CLEANING');
                          const isMaint = room.status === 'MAINTENANCE';
                          return (
                            <View key={i} style={[
                              dS.calDayCol,
                              i === 0 && dS.calDayColToday,
                              hasGuest && dS.calCellOccupied,
                              isDirty  && dS.calCellDirty,
                              isMaint  && dS.calCellMaint,
                            ]}>
                              {hasGuest && i === 0 && (
                                <Text style={dS.calCellText} numberOfLines={1}>
                                  {room.guest?.split(' ')[0]}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
      {showReception && (
        <ReceptionScreen
          businessId={businessId}
          accessToken={effectiveAccessToken}
          roomTypes={[]}
          pendingAction={pendingReceptionAction}
          onPendingActionConsumed={() => setPendingReceptionAction(null)}
          onClose={() => { setShowReception(false); load(true); }}
        />
      )}
      {showHousekeeping && (
        <HousekeepingScreen
          businessId={businessId}
          accessToken={effectiveAccessToken}
          onTaskCompleted={() => load(true)}
          onClose={() => { setShowHousekeeping(false); load(true); }}
        />
      )}
      {showMap && (
        <ReservationMapModal
          businessId={businessId}
          accessToken={effectiveAccessToken}
          onClose={() => { setShowMap(false); load(true); }}
          onBookingAction={async (bookingId, action, bk) => {
            setShowMap(false);
            const token = effectiveAccessToken;
            try {
              // Regra: check-in requer CONFIRMED
              if (action === 'checkin') {
                if (bk?.status === 'PENDING') {
                  Alert.alert(
                    '⚠️ Reserva não confirmada',
                    'Não é possível fazer check-in numa reserva pendente.\nConfirme primeiro a reserva.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Confirmar Reserva', onPress: async () => {
                          try { await backendApi.confirmBooking(bookingId, { businessId }, token); load(true); }
                          catch (e) { Alert.alert('Erro', e?.message || 'Não foi possível confirmar.'); }
                      }},
                    ]
                  );
                  return;
                }
                setPendingReceptionAction({ bookingId, action: 'checkin', bk });
                setShowReception(true);
                return;
              }
              // Regra: checkout requer folio encerrado
              if (action === 'checkout') {
                let balance = 0;
                try {
                  const folio = await backendApi.getHtFolio(bookingId, token);
                  balance = folio?.summary?.balance ?? 0;
                  // paymentStatus = 'PAID' significa que o checkout financeiro foi concluído
                  if (folio?.booking?.paymentStatus === 'PAID') balance = 0;
                } catch { /* best effort */ }
                if (balance > 0) {
                  Alert.alert(
                    '⚠️ Folio não encerrado',
                    `Existe um saldo em dívida de ${balance.toLocaleString('pt-PT')} Kz.\nEncerre o folio antes do check-out.`,
                    [{ text: 'OK', style: 'cancel' }]
                  );
                  return;
                }
                await backendApi.htCheckOut(bookingId, token);
                load(true);
                return;
              }
              if (action === 'confirm')  await backendApi.confirmBooking(bookingId, { businessId }, token);
              if (action === 'noshow')   await backendApi.htNoShow(bookingId, token);
              if (action === 'cancel')   {
                if (!(bk?.status === 'PENDING' || bk?.status === 'CONFIRMED')) {
                  Alert.alert('Cancelamento indisponível', 'Só é possível cancelar reservas pendentes ou confirmadas.');
                  return;
                }
                setCancelReasonFromMap('');
                setCancelBookingFromMap({ id: bookingId, guestName: bk?.guestName || 'Hóspede' });
                return;
              }
              if (action === 'edit')     {
                setPendingReceptionAction({ bookingId, action: 'edit', bk });
                setShowReception(true);
                return;
              }
              load(true);
            } catch (e) {
              if (handleAuthError(e)) return;
              Alert.alert('Erro', e?.message || 'Operação falhou.');
            }
          }}
        />
      )}
      {showRooms && (
        <RoomRackModal
          rooms={data?.rooms || []}
          onMarkClean={handleMarkClean}
          onMarkMaintenance={handleMarkMaintenance}
          actionLoading={actionLoading}
          onClose={() => setShowRooms(false)}
        />
      )}
      {showGuests && (
        <GuestsScreen
          businessId={businessId}
          accessToken={effectiveAccessToken}
          onClose={() => setShowGuests(false)}
        />
      )}
      {showGantt && (
        <RoomGanttScreen
          businessId={businessId}
          accessToken={effectiveAccessToken}
          bookings={guestBookings}
          overbookingBuffer={Number(businessMetadata?.pms?.sellablePercent ?? 100)}
          onClose={() => setShowGantt(false)}
        />
      )}

      <Modal visible={!!cancelBookingFromMap} transparent animationType="fade" onRequestClose={() => !cancelMapLoading && setCancelBookingFromMap(null)}>
        <View style={dS.cancelOverlay}>
          <View style={dS.cancelCard}>
            <Text style={dS.cancelTitle}>Cancelar Reserva</Text>
            <Text style={dS.cancelSub}>
              Indique o motivo do cancelamento para {cancelBookingFromMap?.guestName || 'o hóspede'}.
            </Text>
            <TextInput
              style={dS.cancelInput}
              placeholder="Ex.: cliente pediu cancelamento"
              value={cancelReasonFromMap}
              onChangeText={setCancelReasonFromMap}
              multiline
              editable={!cancelMapLoading}
              maxLength={500}
            />
            <View style={dS.cancelActions}>
              <TouchableOpacity
                style={[dS.cancelBtn, { backgroundColor: '#F3F4F6' }]}
                onPress={() => {
                  if (cancelMapLoading) return;
                  setCancelBookingFromMap(null);
                  setCancelReasonFromMap('');
                }}
                disabled={cancelMapLoading}
              >
                <Text style={[dS.cancelBtnText, { color: '#374151' }]}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dS.cancelBtn, { backgroundColor: '#DC2626', opacity: cancelMapLoading ? 0.7 : 1 }]}
                onPress={submitCancelFromMap}
                disabled={cancelMapLoading}
              >
                {cancelMapLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={dS.cancelBtnText}>Confirmar Cancelamento</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── STAFF MODALS (rendered inside DashboardPMS modal tree for iOS) ─ */}
      <StaffManagementModal
        visible={showStaffMgmt}
        businessId={businessId}
        accessToken={effectiveAccessToken}
        onClose={() => setShowStaffMgmt(false)}
        onOpenProfile={(staff) => {
          setSelectedStaff(staff);
          setShowStaffMgmt(false);
          setShowStaffProfile(true);
        }}
      />
      <StaffProfileSheet
        visible={showStaffProfile}
        staff={selectedStaff}
        businessId={businessId}
        accessToken={effectiveAccessToken}
        onClose={() => { setShowStaffProfile(false); setShowStaffMgmt(true); }}
        onRefresh={() => {}}
        onOpenActivity={(staff) => {
          setSelectedStaff(staff);
          setShowStaffProfile(false);
          setShowStaffActivity(true);
        }}
      />
      <StaffActivityLog
        visible={showStaffActivity}
        staff={selectedStaff}
        businessId={businessId}
        accessToken={effectiveAccessToken}
        onClose={() => { setShowStaffActivity(false); setShowStaffProfile(true); }}
      />
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const dS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F7F6F2' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoutBtn:    { minWidth: 72, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#D32323' },
  logoutBtnText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:    { fontSize: 12, color: '#888', marginTop: 1 },
  headerUserText:{ fontSize: 12, color: '#555', marginTop: 2, fontWeight: '600', maxWidth: 210 },
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

  // Overbooking policy
  policyCard:   { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  policyTitle:  { fontSize: 13, fontWeight: '800', color: '#111827' },
  policyText:   { marginTop: 6, fontSize: 12, lineHeight: 18, color: '#4B5563' },
  policyRow:    { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  policyInput:  { minWidth: 68, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#fff', textAlign: 'center', fontWeight: '700', color: '#111827' },
  policySuffix: { fontSize: 14, fontWeight: '700', color: '#374151' },
  policyBtn:    { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#111827' },
  policyBtnText:{ fontSize: 12, fontWeight: '700', color: '#fff' },



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

  // PMS Buttons
  pmsButtons:       { gap: 8 },
  receptionBtn:     { backgroundColor: '#22A06B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  receptionBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },

  // Housekeeping inline
  hkList:       { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 4,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  hkRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                  borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  hkDot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  hkRoomNum:    { fontSize: 13, fontWeight: '700', color: '#111' },
  hkStatus:     { fontSize: 11, color: '#888', marginTop: 1 },
  hkTaskCount:  { fontSize: 11, color: '#D97706', fontWeight: '600', marginRight: 4 },
  hkBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  hkBtnMaint:   { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  hkBtnText:    { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  // Room card extras
  taskDot:      { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DC2626',
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  taskDotText:  { fontSize: 9, fontWeight: '700', color: '#fff' },
  markCleanBtn: { marginTop: 8, paddingVertical: 6, borderRadius: 6,
                  backgroundColor: '#F0FDF4', alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  markCleanBtnText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  // Room Calendar
  calendarWrap:    { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
                     borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 4 },
  calHeaderRow:    { flexDirection: 'row', backgroundColor: '#F7F7F8',
                     borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  calRow:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  calRoomCol:      { width: 64, paddingHorizontal: 6, paddingVertical: 8, justifyContent: 'center' },
  calDayCol:       { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center',
                     borderLeftWidth: 1, borderLeftColor: '#F0F0F0' },
  calDayColToday:  { backgroundColor: '#FFF9F9' },
  calHeaderText:   { fontSize: 9, fontWeight: '700', color: '#888', textAlign: 'center' },
  calRoomNum:      { fontSize: 10, fontWeight: '700', color: '#111' },
  calRoomType:     { fontSize: 9, color: '#888', marginTop: 1 },
  calCellOccupied: { backgroundColor: '#DBEAFE' },
  calCellDirty:    { backgroundColor: '#FEF9C3' },
  calCellMaint:    { backgroundColor: '#FEE2E2' },
  calCellText:     { fontSize: 8, color: '#1D4ED8', fontWeight: '600', paddingHorizontal: 2, textAlign: 'center' },

  // Cancel modal (from map actions)
  cancelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cancelCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  cancelTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cancelSub: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 10 },
  cancelInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  cancelActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 11 },
  cancelBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty
  empty:        { alignItems: 'center', padding: 24 },
  emptyText:    { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
});