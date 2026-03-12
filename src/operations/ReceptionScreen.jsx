import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';
import { FolioScreen } from './FolioScreen';

const STATUS = {
  PENDING:     { label: 'Pendente',   color: '#D97706', bg: '#FFFBEB' },
  CONFIRMED:   { label: 'Confirmada', color: '#1565C0', bg: '#EFF6FF' },
  CHECKED_IN:  { label: 'Em Casa',    color: '#22A06B', bg: '#F0FDF4' },
  CHECKED_OUT: { label: 'Checkout',   color: '#6B7280', bg: '#F9FAFB' },
  NO_SHOW:     { label: 'No-Show',    color: '#DC2626', bg: '#FEF2F2' },
  CANCELLED:   { label: 'Cancelada',  color: '#7C3AED', bg: '#F5F3FF' },
};

const TABS = [
  { key: 'arrivals',   label: 'Chegadas (7d)', icon: 'reservation' },
  { key: 'departures', label: 'Saídas (7d)',   icon: 'arrow'       },
  { key: 'guests',     label: 'Em Casa',        icon: 'hotel'       },
];

function fmt(dateStr, mode = 'date') {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (mode === 'time') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function nights(s, e) {
  if (!s || !e) return 0;
  return Math.round((new Date(e) - new Date(s)) / 86400000);
}

// ─── Card de reserva individual ───────────────────────────────────────────────
function BookingCard({ booking, tab, roomTypes, onAction, actionLoading }) {
  const [open, setOpen] = useState(false);
  const st   = STATUS[booking.status] || STATUS.PENDING;
  const room = roomTypes?.find(r => r.id === booking.roomTypeId);
  const nts  = nights(booking.startDate, booking.endDate);
  const busy = actionLoading === booking.id;

  return (
    <View style={[rS.card, { borderLeftColor: st.color }]}>

      {/* ── Resumo — sempre visível ── */}
      <TouchableOpacity style={rS.cardHead} onPress={() => setOpen(p => !p)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={rS.guestName} numberOfLines={1}>
            {booking.guestName || booking.user?.name || 'Hóspede'}
          </Text>
          <Text style={rS.guestSub}>
            {room?.name || 'Quarto'}
            {booking.room?.number ? ` · Nº ${booking.room.number}` : ''}
            {' · '}{nts} noite{nts !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={rS.cardHeadRight}>
          <View style={[rS.badge, { backgroundColor: st.bg }]}>
            <Text style={[rS.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.grayText} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      {/* ── Detalhes expandidos ── */}
      {open && (
        <View style={rS.cardBody}>
          <View style={rS.row}>
            <Icon name="calendar" size={13} color={COLORS.grayText} strokeWidth={2} />
            <Text style={rS.rowText}>{fmt(booking.startDate)} → {fmt(booking.endDate)}</Text>
          </View>
          <View style={rS.row}>
            <Icon name="users" size={13} color={COLORS.grayText} strokeWidth={2} />
            <Text style={rS.rowText}>
              {booking.adults || 1} adulto{(booking.adults || 1) !== 1 ? 's' : ''}
              {booking.children > 0 ? ` · ${booking.children} criança${booking.children !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          {booking.guestPhone ? (
            <View style={rS.row}>
              <Icon name="phone" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={rS.rowText}>{booking.guestPhone}</Text>
            </View>
          ) : null}
          {booking.checkedInAt ? (
            <View style={rS.row}>
              <Icon name="clock" size={13} color={COLORS.green} strokeWidth={2} />
              <Text style={[rS.rowText, { color: COLORS.green }]}>Check-in às {fmt(booking.checkedInAt, 'time')}</Text>
            </View>
          ) : null}
          {booking.totalPrice ? (
            <View style={rS.row}>
              <Icon name="payment" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={rS.rowText}>
                {booking.totalPrice.toLocaleString()} Kz
                {booking.paymentStatus === 'PAID' ? ' · ✅ Pago' : ' · ⏳ Pendente'}
              </Text>
            </View>
          ) : null}
          {booking.notes ? (
            <View style={rS.row}>
              <Icon name="briefcase" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={[rS.rowText, { flex: 1 }]}>{booking.notes}</Text>
            </View>
          ) : null}

          {/* ── Botões por tab ── */}
          <View style={rS.actions}>
            {tab === 'arrivals' && (
              <>
                {booking.status === 'PENDING' && (
                  <TouchableOpacity style={[rS.btn, rS.btnBlue]} onPress={() => onAction(booking.id, 'confirm')} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={rS.btnWhite}>Confirmar</Text>}
                  </TouchableOpacity>
                )}
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[rS.btn, rS.btnGreen]} onPress={() => onAction(booking.id, 'checkin')} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                      <><Icon name="reservation" size={14} color="#fff" strokeWidth={2.5} /><Text style={rS.btnWhite}>Check-In</Text></>
                    )}
                  </TouchableOpacity>
                )}
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[rS.btn, rS.btnRed]} onPress={() => onAction(booking.id, 'noshow')} disabled={busy}>
                    <Text style={[rS.btnText, { color: '#DC2626' }]}>No-Show</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {(tab === 'departures' || tab === 'guests') && booking.status === 'CHECKED_IN' && (
              <>
                <TouchableOpacity style={[rS.btn, { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' }]} onPress={() => onAction(booking.id, 'folio', booking)} disabled={busy}>
                  <Icon name="briefcase" size={14} color="#1565C0" strokeWidth={2} />
                  <Text style={[rS.btnText, { color: '#1565C0', fontWeight: '600' }]}>Folio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[rS.btn, rS.btnOrange]} onPress={() => onAction(booking.id, 'checkout')} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                    <><Icon name="arrow" size={14} color="#fff" strokeWidth={2.5} /><Text style={rS.btnWhite}>Check-Out</Text></>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// [GHOST] alive ref limpa estado ao desmontar — padrão do OperationalLayerRenderer
// ─────────────────────────────────────────────────────────────────────────────
export function ReceptionScreen({ businessId, accessToken, roomTypes, onClose }) {
  const [tab, setTab]                   = useState('arrivals');
  const [data, setData]                 = useState({ arrivals: [], departures: [], guests: [] });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [folioBooking, setFolioBooking] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!businessId || !accessToken) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [a, d, g] = await Promise.all([
        backendApi.getHtArrivals(businessId, accessToken),
        backendApi.getHtDepartures(businessId, accessToken),
        backendApi.getHtCurrentGuests(businessId, accessToken),
      ]);
      if (!alive.current) return;
      setData({
        arrivals:   Array.isArray(a) ? a : [],
        departures: Array.isArray(d) ? d : [],
        guests:     Array.isArray(g) ? g : [],
      });
    } catch (e) {
      if (alive.current) Alert.alert('Erro ao carregar', e?.message || 'Não foi possível carregar os dados da receção.');
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [businessId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (bookingId, action, bookingObj = null) => {
    const labels = { checkin: 'Check-In', checkout: 'Check-Out', noshow: 'No-Show', confirm: 'Confirmar' };
    const msgs   = {
      checkin:  'Confirmar check-in do hóspede?',
      checkout: 'Confirmar checkout? O quarto ficará marcado como sujo.',
      noshow:   'Marcar como No-Show? O quarto será libertado.',
      confirm:  'Confirmar esta reserva?',
    };
    // Folio não precisa de confirmação — abre directamente
    if (action === 'folio') {
      // Usar o booking passado directamente; fallback: procurar em data
      const bk = bookingObj || [...(data.guests || []), ...(data.arrivals || []), ...(data.departures || [])].find(b => b.id === bookingId);
      if (bk) setFolioBooking(bk);
      return;
    }

    Alert.alert(labels[action], msgs[action], [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: labels[action],
        style: action === 'noshow' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(bookingId);
          try {
            if (action === 'checkin')  await backendApi.htCheckIn(bookingId, {}, accessToken);
            if (action === 'checkout') await backendApi.htCheckOut(bookingId, accessToken);
            if (action === 'noshow')   await backendApi.htNoShow(bookingId, accessToken);
            if (action === 'confirm')  await backendApi.confirmBooking(bookingId, { businessId }, accessToken);
            await load(true);
          } catch (e) {
            Alert.alert('Erro', e?.message || 'Operação falhou. Tenta novamente.');
          } finally {
            if (alive.current) setActionLoading(null);
          }
        },
      },
    ]);
  }, [accessToken, businessId, load]);

  const list = data[tab] || [];
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={rS.root}>

        {/* Header */}
        <View style={rS.header}>
          <TouchableOpacity style={rS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={rS.headerTitle}>Receção</Text>
            <Text style={rS.headerSub}>{todayStr}</Text>
          </View>
          <TouchableOpacity style={rS.iconBtn} onPress={() => load(true)}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Contadores */}
        <View style={rS.counters}>
          {[
            { key: 'arrivals',   n: data.arrivals.length,   color: '#1565C0', label: 'Chegadas 7d' },
            { key: 'departures', n: data.departures.length, color: '#D97706', label: 'Saídas 7d'   },
            { key: 'guests',     n: data.guests.length,     color: '#22A06B', label: 'Em Casa'     },
          ].map((c, i) => (
            <React.Fragment key={c.key}>
              {i > 0 && <View style={rS.divider} />}
              <View style={rS.counter}>
                <Text style={[rS.counterN, { color: c.color }]}>{c.n}</Text>
                <Text style={rS.counterL}>{c.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Tabs */}
        <View style={rS.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[rS.tab, tab === t.key && rS.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={15} color={tab === t.key ? COLORS.blue : COLORS.grayText} strokeWidth={2} />
              <Text style={[rS.tabLabel, tab === t.key && rS.tabLabelActive]}>{t.label}</Text>
              {data[t.key]?.length > 0 && (
                <View style={[rS.tabBadge, tab === t.key && { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[rS.tabBadgeText, tab === t.key && { color: COLORS.blue }]}>
                    {data[t.key].length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        {loading ? (
          <View style={rS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={{ marginTop: 10, color: COLORS.grayText, fontSize: 13 }}>A carregar...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={rS.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.blue} />}
          >
            {list.length === 0 ? (
              <View style={rS.empty}>
                <Text style={{ fontSize: 40, marginBottom: 14 }}>
                  {tab === 'arrivals' ? '🛬' : tab === 'departures' ? '🛫' : '🛏️'}
                </Text>
                <Text style={rS.emptyTitle}>
                  {tab === 'arrivals' ? 'Sem chegadas hoje' : tab === 'departures' ? 'Sem saídas hoje' : 'Sem hóspedes em casa'}
                </Text>
                <Text style={rS.emptySub}>
                  {tab === 'arrivals'
                    ? 'Não há reservas confirmadas para hoje.'
                    : tab === 'departures'
                    ? 'Não há checkouts previstos para hoje.'
                    : 'Nenhum hóspede está actualmente hospedado.'}
                </Text>
              </View>
            ) : (
              list.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  tab={tab}
                  roomTypes={roomTypes}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
      {folioBooking && (
        <FolioScreen
          booking={folioBooking}
          businessId={businessId}
          accessToken={accessToken}
          onClose={() => { setFolioBooking(null); load(true); }}
        />
      )}
    </Modal>
  );
}

const rS = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F7F6F2' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:     { fontSize: 12, color: '#888', marginTop: 1 },
  counters:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3', paddingVertical: 14 },
  counter:       { flex: 1, alignItems: 'center' },
  counterN:      { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  counterL:      { fontSize: 11, color: '#888', marginTop: 2 },
  divider:       { width: 1, backgroundColor: '#ECEAE3', marginVertical: 4 },
  tabs:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: '#1565C0' },
  tabLabel:      { fontSize: 12, fontWeight: '600', color: '#888' },
  tabLabelActive: { color: '#1565C0' },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText:  { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  listPad:       { padding: 14, gap: 10, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
  cardHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestName:     { fontSize: 14, fontWeight: '700', color: '#111' },
  guestSub:      { fontSize: 12, color: '#888', marginTop: 2 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  cardBody:      { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#F0EDE6', gap: 6 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowText:       { fontSize: 13, color: '#444', flex: 1 },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, minWidth: 80, justifyContent: 'center' },
  btnGreen:      { backgroundColor: '#22A06B' },
  btnOrange:     { backgroundColor: '#D97706' },
  btnBlue:       { backgroundColor: '#1565C0' },
  btnRed:        { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnWhite:      { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnText:       { fontSize: 13, fontWeight: '700' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:         { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub:      { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
});