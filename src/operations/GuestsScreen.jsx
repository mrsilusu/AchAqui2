// =============================================================================
// GuestsScreen.jsx — Gestão de Hóspedes PMS
// Lista todos os hóspedes únicos, histórico de estadias, métricas e perfil.
// Agrega dados a partir de activeBookings (local) + API opcional.
// Props:
//   businessId   — ID do negócio
//   accessToken  — JWT do owner
//   bookings     — activeBookings do HospitalityModule (fallback local)
//   roomTypes    — tipos de quarto para resolver nomes
//   onClose      — fechar o modal
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  if (str.includes('/')) return str;
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function fmtMoney(n) {
  if (!n) return '0 Kz';
  return `${Number(n).toLocaleString('pt-PT')} Kz`;
}

function fmtShort(str) {
  if (!str) return '—';
  if (str.includes('/')) {
    const [d, m] = str.split('/');
    return `${d}/${m}`;
  }
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

// Converte qualquer formato de data para timestamp comparável
function toTs(str) {
  if (!str) return 0;
  if (str.includes('/')) {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return new Date(str).getTime();
}

// Determina o status do hóspede com base nas reservas
function resolveGuestStatus(bookings) {
  const now = Date.now();
  const active = bookings.filter(b =>
    ['CHECKED_IN', 'confirmed', 'CONFIRMED'].includes(b.status) &&
    toTs(b.checkOut) > now
  );
  if (active.some(b => ['CHECKED_IN'].includes(b.status))) return 'in_house';
  if (active.length > 0) return 'upcoming';
  return 'past';
}

const GUEST_STATUS = {
  in_house: { label: 'Em Casa',        color: '#22A06B', bg: '#F0FDF4' },
  upcoming: { label: 'Reserva futura', color: '#1565C0', bg: '#EFF6FF' },
  past:     { label: 'Hóspede anterior', color: '#6B7280', bg: '#F9FAFB' },
};

const FILTERS = [
  { key: 'all',      label: 'Todos'         },
  { key: 'in_house', label: 'Em Casa'       },
  { key: 'upcoming', label: 'Com Reserva'   },
  { key: 'past',     label: 'Anteriores'    },
];

// ─── Agregar bookings em perfis de hóspede ────────────────────────────────────
function buildGuestProfiles(bookings, roomTypes) {
  const map = {};
  const roomMap = Object.fromEntries((roomTypes || []).map(r => [r.id, r.name]));

  bookings.forEach(b => {
    const key = (b.guestPhone || '').trim() || (b.guestName || '').trim() || b.id;
    if (!key) return;
    if (!map[key]) {
      map[key] = {
        id:               key,
        name:             b.guestName || 'Hóspede',
        phone:            b.guestPhone || '—',
        bookings:         [],
        totalSpent:       0,
        totalNights:      0,
        roomTypeCounts:   {},
        specialRequests:  new Set(),
      };
    }
    const g = map[key];
    g.bookings.push(b);
    g.totalSpent  += Number(b.totalPrice)  || 0;
    g.totalNights += Number(b.nights)      || 0;

    const rtId   = b.roomTypeId;
    const rtName = roomMap[rtId] || rtId || 'Quarto';
    if (rtName) g.roomTypeCounts[rtName] = (g.roomTypeCounts[rtName] || 0) + 1;

    if (b.specialRequest) g.specialRequests.add(b.specialRequest);
    if (b.notes)          g.specialRequests.add(b.notes);
  });

  return Object.values(map).map(g => {
    const sorted = [...g.bookings].sort((a, b) => toTs(b.checkIn) - toTs(a.checkIn));
    const now    = Date.now();
    const past   = sorted.filter(b => toTs(b.checkOut) <= now);
    const future = sorted.filter(b => toTs(b.checkIn) > now);
    const preferredRoom = Object.entries(g.roomTypeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      ...g,
      bookings:         sorted,
      totalStays:       sorted.length,
      avgSpend:         g.totalNights > 0 ? Math.round(g.totalSpent / sorted.length) : 0,
      preferredRoom,
      specialRequests:  [...g.specialRequests].filter(Boolean),
      status:           resolveGuestStatus(g.bookings),
      lastStay:         past[0]   || null,
      nextStay:         future[future.length - 1] || null,
      firstStay:        sorted[sorted.length - 1] || null,
    };
  }).sort((a, b) => {
    // Em casa primeiro, depois upcoming, depois past por total gasto
    const order = { in_house: 0, upcoming: 1, past: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.totalSpent - a.totalSpent;
  });
}

// ─── Perfil detalhado do hóspede ──────────────────────────────────────────────
function GuestProfile({ guest, onClose }) {
  const st = GUEST_STATUS[guest.status] || GUEST_STATUS.past;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={gS.root}>

        {/* Header */}
        <View style={gS.header}>
          <TouchableOpacity style={gS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={gS.headerTitle}>{guest.name}</Text>
            <Text style={gS.headerSub}>{guest.phone}</Text>
          </View>
          <View style={[gS.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[gS.statusBadgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={gS.profileScroll}>

          {/* Métricas */}
          <View style={gS.metricsRow}>
            <View style={gS.metricBox}>
              <Text style={gS.metricVal}>{guest.totalStays}</Text>
              <Text style={gS.metricLbl}>Estadias</Text>
            </View>
            <View style={gS.metricDivider} />
            <View style={gS.metricBox}>
              <Text style={gS.metricVal}>{guest.totalNights}</Text>
              <Text style={gS.metricLbl}>Noites</Text>
            </View>
            <View style={gS.metricDivider} />
            <View style={gS.metricBox}>
              <Text style={[gS.metricVal, { fontSize: 14 }]}>{fmtMoney(guest.totalSpent)}</Text>
              <Text style={gS.metricLbl}>Total gasto</Text>
            </View>
          </View>

          {/* Perfil */}
          <View style={gS.section}>
            <Text style={gS.sectionTitle}>Perfil</Text>
            <View style={gS.infoCard}>
              <Row icon="user"    label="Nome"           value={guest.name} />
              <Row icon="phone"   label="Telefone"       value={guest.phone} />
              <Row icon="home"    label="Quarto preferido" value={guest.preferredRoom} />
              <Row icon="payment" label="Média por estadia" value={fmtMoney(guest.avgSpend)} />
              {guest.firstStay && (
                <Row icon="calendar" label="Primeiro hóspede"
                  value={fmtDate(guest.firstStay.checkIn)} />
              )}
            </View>
          </View>

          {/* Pedidos especiais históricos */}
          {guest.specialRequests.length > 0 && (
            <View style={gS.section}>
              <Text style={gS.sectionTitle}>Pedidos Especiais</Text>
              {guest.specialRequests.map((req, i) => (
                <View key={i} style={gS.reqChip}>
                  <Icon name="briefcase" size={12} color="#92400E" strokeWidth={2} />
                  <Text style={gS.reqText}>{req}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Histórico de reservas */}
          <View style={gS.section}>
            <Text style={gS.sectionTitle}>Histórico de Estadias</Text>
            {guest.bookings.map((b, i) => {
              const isPast   = toTs(b.checkOut) <= Date.now();
              const isActive = b.status === 'CHECKED_IN';
              const lineColor = isActive ? '#22A06B' : isPast ? '#D1D5DB' : '#1565C0';
              return (
                <View key={b.id || i} style={gS.timelineItem}>
                  <View style={[gS.timelineDot, { backgroundColor: lineColor }]} />
                  {i < guest.bookings.length - 1 && (
                    <View style={[gS.timelineLine, { backgroundColor: lineColor + '40' }]} />
                  )}
                  <View style={gS.timelineContent}>
                    <View style={gS.timelineRow}>
                      <Text style={gS.timelineDates}>
                        {fmtShort(b.checkIn)} → {fmtShort(b.checkOut)}
                        {b.nights ? `  ·  ${b.nights} noite${b.nights !== 1 ? 's' : ''}` : ''}
                      </Text>
                      {b.totalPrice > 0 && (
                        <Text style={gS.timelinePrice}>{fmtMoney(b.totalPrice)}</Text>
                      )}
                    </View>
                    {b.roomTypeId && (
                      <Text style={gS.timelineRoom}>{b.roomTypeId}</Text>
                    )}
                    {isActive && (
                      <View style={gS.activeTag}>
                        <Text style={gS.activeTagText}>Em Casa agora</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={gS.infoRow}>
      <Icon name={icon} size={14} color={COLORS.grayText} strokeWidth={2} />
      <Text style={gS.infoLabel}>{label}</Text>
      <Text style={gS.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Card de hóspede na lista ─────────────────────────────────────────────────
function GuestCard({ guest, onPress }) {
  const st = GUEST_STATUS[guest.status] || GUEST_STATUS.past;
  const initials = guest.name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const avatarColor = guest.status === 'in_house' ? '#22A06B'
                    : guest.status === 'upcoming'  ? '#1565C0' : '#9CA3AF';
  return (
    <TouchableOpacity style={gS.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[gS.avatar, { backgroundColor: avatarColor + '20' }]}>
        <Text style={[gS.avatarText, { color: avatarColor }]}>{initials || '?'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={gS.cardTopRow}>
          <Text style={gS.guestName} numberOfLines={1}>{guest.name}</Text>
          <View style={[gS.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[gS.statusBadgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={gS.guestPhone}>{guest.phone}</Text>
        <View style={gS.cardMeta}>
          <Text style={gS.cardMetaText}>
            {guest.totalStays} estadia{guest.totalStays !== 1 ? 's' : ''}
            {' · '}{guest.totalNights} noite{guest.totalNights !== 1 ? 's' : ''}
          </Text>
          {guest.totalSpent > 0 && (
            <Text style={gS.cardSpent}>{fmtMoney(guest.totalSpent)}</Text>
          )}
        </View>
        {guest.status === 'in_house' && guest.nextStay && (
          <Text style={gS.cardNextStay}>
            Saída: {fmtDate(guest.nextStay?.checkOut || guest.lastStay?.checkOut)}
          </Text>
        )}
        {guest.status === 'upcoming' && guest.nextStay && (
          <Text style={[gS.cardNextStay, { color: '#1565C0' }]}>
            Chegada: {fmtDate(guest.nextStay.checkIn)}
          </Text>
        )}
      </View>

      <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function GuestsScreen({ businessId, bookings = [], roomTypes = [], onClose }) {
  const [search,        setSearch]        = useState('');
  const [activeFilter,  setActiveFilter]  = useState('all');
  const [selectedGuest, setSelectedGuest] = useState(null);

  const guests = useMemo(
    () => buildGuestProfiles(bookings, roomTypes),
    [bookings, roomTypes]
  );

  const filtered = useMemo(() => {
    let list = guests;
    if (activeFilter !== 'all') list = list.filter(g => g.status === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) || g.phone.includes(q)
      );
    }
    return list;
  }, [guests, activeFilter, search]);

  const counts = useMemo(() => ({
    all:      guests.length,
    in_house: guests.filter(g => g.status === 'in_house').length,
    upcoming: guests.filter(g => g.status === 'upcoming').length,
    past:     guests.filter(g => g.status === 'past').length,
  }), [guests]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={gS.root}>

        {/* Header */}
        <View style={gS.header}>
          <TouchableOpacity style={gS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={gS.headerTitle}>Hóspedes</Text>
            <Text style={gS.headerSub}>{guests.length} hóspede{guests.length !== 1 ? 's' : ''} registado{guests.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Barra de pesquisa */}
        <View style={gS.searchWrap}>
          <Icon name="search" size={16} color={COLORS.grayText} strokeWidth={2} />
          <TextInput
            style={gS.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar por nome ou telefone..."
            placeholderTextColor={COLORS.grayText}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="x" size={14} color={COLORS.grayText} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={gS.filterBar}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[gS.filterChip, activeFilter === f.key && gS.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[gS.filterChipText, activeFilter === f.key && gS.filterChipTextActive]}>
                {f.label}
                {counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista */}
        {filtered.length === 0 ? (
          <View style={gS.empty}>
            <Text style={{ fontSize: 40, marginBottom: 14 }}>👤</Text>
            <Text style={gS.emptyTitle}>
              {search ? 'Sem resultados' : 'Sem hóspedes ainda'}
            </Text>
            <Text style={gS.emptySub}>
              {search
                ? `Nenhum hóspede encontrado para "${search}".`
                : 'Os perfis de hóspedes são criados automaticamente a partir das reservas.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={gS.listPad}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map(g => (
              <GuestCard key={g.id} guest={g} onPress={() => setSelectedGuest(g)} />
            ))}
          </ScrollView>
        )}

      </View>

      {selectedGuest && (
        <GuestProfile guest={selectedGuest} onClose={() => setSelectedGuest(null)} />
      )}
    </Modal>
  );
}

export default GuestsScreen;

// ─── Estilos ──────────────────────────────────────────────────────────────────
const gS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F7F6F2' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
                  backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:    { fontSize: 12, color: '#888', marginTop: 1 },

  // Search
  searchWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10,
                  margin: 12, paddingHorizontal: 14, paddingVertical: 10,
                  backgroundColor: '#fff', borderRadius: 12,
                  borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput:  { flex: 1, fontSize: 14, color: '#111', padding: 0 },

  // Filters
  filterBar:    { maxHeight: 44, marginBottom: 4 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#1565C0' + '15', borderColor: '#1565C0' },
  filterChipText:   { fontSize: 12, fontWeight: '600', color: '#888' },
  filterChipTextActive: { color: '#1565C0' },

  // Guest card
  listPad:      { padding: 14, gap: 10, paddingBottom: 40 },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  avatar:       { width: 46, height: 46, borderRadius: 23,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 16, fontWeight: '800' },
  cardTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  guestName:    { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  guestPhone:   { fontSize: 12, color: '#888', marginTop: 2 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardMetaText: { fontSize: 11, color: '#888' },
  cardSpent:    { fontSize: 12, fontWeight: '700', color: '#22A06B' },
  cardNextStay: { fontSize: 11, fontWeight: '600', color: '#22A06B', marginTop: 4 },

  // Status badge
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  // Empty state
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub:     { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },

  // ── Guest Profile ────────────────────────────────────────────────────────
  profileScroll: { padding: 16, paddingBottom: 40, gap: 16 },

  // Métricas
  metricsRow:    { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row',
                   overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                   shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  metricBox:     { flex: 1, alignItems: 'center', paddingVertical: 16 },
  metricVal:     { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  metricLbl:     { fontSize: 11, color: '#888', marginTop: 2 },
  metricDivider: { width: 1, backgroundColor: '#ECEAE3', marginVertical: 12 },

  // Secções
  section:       { gap: 8 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#888',
                   textTransform: 'uppercase', letterSpacing: 0.5 },

  // Info card
  infoCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 4,
                   shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                   shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: 10,
                   paddingHorizontal: 14, paddingVertical: 10,
                   borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel:     { fontSize: 12, color: '#888', width: 120 },
  infoValue:     { fontSize: 13, fontWeight: '600', color: '#111', flex: 1 },

  // Pedidos especiais
  reqChip:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                   backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10 },
  reqText:       { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 },

  // Timeline de reservas
  timelineItem:  { flexDirection: 'row', gap: 12 },
  timelineDot:   { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  timelineLine:  { position: 'absolute', left: 4, top: 14, width: 2, bottom: -16 },
  timelineContent: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12,
                     marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                     shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  timelineRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineDates: { fontSize: 13, fontWeight: '600', color: '#111' },
  timelinePrice: { fontSize: 13, fontWeight: '700', color: '#22A06B' },
  timelineRoom:  { fontSize: 11, color: '#888', marginTop: 3 },
  activeTag:     { marginTop: 6, alignSelf: 'flex-start',
                   backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeTagText: { fontSize: 10, fontWeight: '700', color: '#22A06B' },
});
