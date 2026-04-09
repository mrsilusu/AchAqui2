// ReservationMapModal.jsx — Mapa de Reservas Gantt
// Arquitectura corrigida: scroll vertical exterior, scroll horizontal único interior.
// O ScrollView vertical envolve TUDO (header + linhas).
// A coluna de rótulos é sticky à esquerda via posicionamento absoluto.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Layout ───────────────────────────────────────────────────────────────────
const CELL_W  = 44;
const ROW_H   = 50;
const LABEL_W = 80;
const HDR_H   = 56;

// ─── Dados estáticos ──────────────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_MINI = ['D','S','T','Q','Q','S','S'];

const STATUS_CFG = {
  PENDING:     { bg: '#FDE68A', border: '#F59E0B', text: '#78350F', label: 'Pendente'   },
  CONFIRMED:   { bg: '#BFDBFE', border: '#3B82F6', text: '#1E3A8A', label: 'Confirmada' },
  CHECKED_IN:  { bg: '#A7F3D0', border: '#10B981', text: '#064E3B', label: 'Hospedado'  },
  CHECKED_OUT: { bg: '#E5E7EB', border: '#9CA3AF', text: '#374151', label: 'Saída'      },
  CANCELLED:   { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'Cancelada'  },
};

const pad      = n => String(n).padStart(2, '0');
const sod      = d => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const dateKey  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const diffDays = (a, b) => Math.round((sod(b) - sod(a)) / 86400000);
const fmtDate  = d => {
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()}`;
};
const fmtMoney = v => v != null ? `${Math.round(v).toLocaleString()} Kz` : '—';

// ─── Barra de reserva ─────────────────────────────────────────────────────────
function BookingBar({ bk, days, onPress }) {
  const cfg      = STATUS_CFG[bk.status] || STATUS_CFG.CONFIRMED;
  const first    = sod(days[0]);
  const bkStart  = sod(new Date(bk.startDate));
  const bkEnd    = sod(new Date(bk.endDate));
  const startOff = Math.max(0, diffDays(first, bkStart));
  const rawEnd   = diffDays(first, bkEnd);
  const endOff   = Math.min(days.length, rawEnd);
  const barDays  = endOff - startOff;
  if (barDays <= 0) return null;

  const clipsLeft  = diffDays(first, bkStart) < 0;
  const clipsRight = rawEnd > days.length;

  return (
    <TouchableOpacity
      onPress={() => onPress(bk)}
      activeOpacity={0.85}
      style={[gS.bar, {
        left:            startOff * CELL_W,
        width:           barDays * CELL_W,
        backgroundColor: cfg.bg,
        borderColor:     cfg.border,
        borderLeftWidth: clipsLeft  ? 0 : 3,
        borderRightWidth:clipsRight ? 0 : 1,
        borderRadius:    clipsLeft && clipsRight ? 0 : clipsLeft ? '0 6px 6px 0' : clipsRight ? '6px 0 0 6px' : 6,
      }]}
    >
      <Text style={[gS.barText, { color: cfg.text }]} numberOfLines={1}>
        {bk.guestName}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Modal de detalhes da reserva (estilo idêntico ao card da Receção) ──────
function BookingDetailModal({ bk, onClose, onAction }) {
  if (!bk) return null;
  const cfg    = STATUS_CFG[bk.status] || STATUS_CFG.CONFIRMED;
  const nights = diffDays(new Date(bk.startDate), new Date(bk.endDate));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dS.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dS.sheet} onPress={() => {}}>

          {/* Card — idêntico ao BookingCard da Receção */}
          <View style={[dS.card, { borderLeftColor: cfg.border }]}>

            {/* ── Cabeçalho ── */}
            <View style={dS.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={dS.guestName}>{bk.guestName}</Text>
                <Text style={dS.guestSub}>
                  {bk.typeName || 'Quarto'}
                  {bk.roomNumber ? ` · Nº ${bk.roomNumber}` : ''}
                  {' · '}{nights} noite{nights !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[dS.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[dS.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 6, marginLeft: 4 }}>
                <Icon name="x" size={16} color="#aaa" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* ── Detalhes ── */}
            <View style={dS.cardBody}>
              <View style={dS.row}>
                <Icon name="calendar" size={13} color="#888" strokeWidth={2} />
                <Text style={dS.rowText}>
                  {fmtDate(bk.startDate)} → {fmtDate(bk.endDate)}
                </Text>
              </View>
              {bk.adults != null && (
                <View style={dS.row}>
                  <Icon name="users" size={13} color="#888" strokeWidth={2} />
                  <Text style={dS.rowText}>
                    {bk.adults} adulto{bk.adults !== 1 ? 's' : ''}
                    {bk.children > 0 ? ` · ${bk.children} criança${bk.children !== 1 ? 's' : ''}` : ''}
                  </Text>
                </View>
              )}
              {bk.guestPhone ? (
                <View style={dS.row}>
                  <Icon name="phone" size={13} color="#888" strokeWidth={2} />
                  <Text style={dS.rowText}>{bk.guestPhone}</Text>
                </View>
              ) : null}
              {bk.totalPrice != null && (
                <View style={dS.row}>
                  <Icon name="payment" size={13} color="#888" strokeWidth={2} />
                  <Text style={dS.rowText}>
                    {fmtMoney(bk.totalPrice)}
                    {bk.paymentStatus === 'PAID' ? ' · ✅ Pago' : ' · ⏳ Pendente'}
                  </Text>
                </View>
              )}
              {bk.cancelReason ? (
                <View style={dS.row}>
                  <Icon name="x" size={13} color="#DC2626" strokeWidth={2} />
                  <Text style={[dS.rowText, { color: '#991B1B' }]}>Motivo: {bk.cancelReason}</Text>
                </View>
              ) : null}

              {/* ── Botões de acção (mesmo padrão da Receção) ── */}
              <View style={dS.actions}>
                {bk.status === 'PENDING' && (
                  <TouchableOpacity style={[dS.btn, dS.btnBlue]}
                    onPress={() => { onClose(); onAction(bk.id, 'confirm', bk); }}>
                    <Text style={dS.btnWhite}>Confirmar</Text>
                  </TouchableOpacity>
                )}
                {(bk.status === 'PENDING' || bk.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[dS.btn, dS.btnGreen]}
                    onPress={() => { onClose(); onAction(bk.id, 'checkin', bk); }}>
                    <Icon name="reservation" size={13} color="#fff" strokeWidth={2.5} />
                    <Text style={dS.btnWhite}>Check-In</Text>
                  </TouchableOpacity>
                )}
                {(bk.status === 'PENDING' || bk.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[dS.btn, dS.btnEdit]}
                    onPress={() => { onClose(); onAction(bk.id, 'edit', bk); }}>
                    <Text style={dS.btnEditText}>✏️ Editar</Text>
                  </TouchableOpacity>
                )}
                {bk.status === 'CHECKED_IN' && (
                  <TouchableOpacity style={[dS.btn, dS.btnOrange]}
                    onPress={() => { onClose(); onAction(bk.id, 'checkout', bk); }}>
                    <Icon name="arrow" size={13} color="#fff" strokeWidth={2.5} />
                    <Text style={dS.btnWhite}>Check-Out</Text>
                  </TouchableOpacity>
                )}
                {(bk.status === 'PENDING' || bk.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[dS.btn, dS.btnRed]}
                    onPress={() => { onClose(); onAction(bk.id, 'noshow', bk); }}>
                    <Text style={[dS.btnText, { color: '#DC2626' }]}>No-Show</Text>
                  </TouchableOpacity>
                )}
                {(bk.status === 'PENDING' || bk.status === 'CONFIRMED') && (
                  <TouchableOpacity style={[dS.btn, dS.btnCancel]}
                    onPress={() => { onClose(); onAction(bk.id, 'cancel', bk); }}>
                    <Text style={[dS.btnText, { color: '#DC2626' }]}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReservationMapModal({ businessId, accessToken, onClose, onBookingAction }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('month');
  const [baseDate,  setBaseDate]  = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [collapsed,    setCollapsed]    = useState({});
  const [selectedBk,   setSelectedBk]  = useState(null);
  const alive = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // ─── Período ─────────────────────────────────────────────────────────────
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const d   = new Date(baseDate);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); // segunda-feira
      return Array.from({ length: 14 }, (_, i) => addDays(d, i));
    }
    const y = baseDate.getFullYear(), m = baseDate.getMonth();
    const n = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
  }, [viewMode, baseDate]);

  const totalW = days.length * CELL_W;
  const today  = dateKey(new Date());

  // ─── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!businessId || !accessToken) return;
    setLoading(true);
    try {
      const from = addDays(days[0], -1).toISOString();
      const to   = addDays(days[days.length - 1], 1).toISOString();
      const res  = await backendApi.getHtMap(businessId, from, to, accessToken);
      if (alive.current) setData(res);
    } catch (e) {
      if (alive.current) Alert.alert('Erro', e?.message || 'Não foi possível carregar.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [businessId, accessToken, days]);

  useEffect(() => { load(); }, [load]);

  const navigate = dir => {
    setBaseDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'week') d.setDate(d.getDate() + dir * 14);
      else d.setMonth(d.getMonth() + dir, 1);
      return d;
    });
  };

  // ─── Dados processados ────────────────────────────────────────────────────
  // Apenas quartos com reservas activas (excluir DIRTY/MAINTENANCE sem reserva)
  const bkByRoom = useMemo(() => {
    if (!data) return {};
    const m = {};
    (data.bookings || []).forEach(bk => {
      if (!bk.roomId) return;
      if (!m[bk.roomId]) m[bk.roomId] = [];
      m[bk.roomId].push(bk);
    });
    return m;
  }, [data]);

  const bkByType = useMemo(() => {
    if (!data) return {};
    const m = {};
    (data.bookings || []).filter(bk => !bk.roomId && bk.roomTypeId).forEach(bk => {
      if (!m[bk.roomTypeId]) m[bk.roomTypeId] = [];
      m[bk.roomTypeId].push(bk);
    });
    return m;
  }, [data]);

  // Meses para o cabeçalho
  const monthGroups = useMemo(() => {
    const g = [];
    let cur = null;
    days.forEach((d, i) => {
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (!cur || cur.key !== mk) {
        cur = { key: mk, label: `${MONTHS_SH[d.getMonth()]} ${d.getFullYear()}`, count: 1 };
        g.push(cur);
      } else { cur.count++; }
    });
    return g;
  }, [days]);

  const title = viewMode === 'week'
    ? `${pad(days[0].getDate())} ${MONTHS_SH[days[0].getMonth()]} — ${pad(days[13].getDate())} ${MONTHS_SH[days[13].getMonth()]} ${days[13].getFullYear()}`
    : `${MONTHS_PT[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

  // ─── Enriquecer bookings com dados adicionais para o modal ───────────────
  const enrichBk = bk => {
    const rt = (data?.roomTypes || []).find(t =>
      t.rooms.some(r => r.id === bk.roomId)
    );
    const room = rt?.rooms.find(r => r.id === bk.roomId);
    return { ...bk, typeName: rt?.name || bk.typeName, roomNumber: room?.number };
  };

  // ─── Render de uma linha de quarto ────────────────────────────────────────
  const renderRoomRow = (room, bks, even) => (
    <View key={room.id} style={[gS.rowGrid, even && gS.rowGridEven, { width: totalW }]}>
      {/* Células de fundo */}
      {days.map((d, di) => {
        const isToday = dateKey(d) === today;
        const isWknd  = d.getDay() === 0 || d.getDay() === 6;
        return (
          <View key={di} style={[gS.cell,
            isToday && gS.cellToday,
            isWknd  && gS.cellWknd]} />
        );
      })}
      {/* Barras */}
      {bks.map(bk => (
        <BookingBar key={bk.id} bk={bk} days={days}
          onPress={b => setSelectedBk(enrichBk(b))} />
      ))}
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={gS.root}>

        {/* Header */}
        <View style={[gS.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={gS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={gS.headerTitle}>Mapa de Reservas</Text>
          <TouchableOpacity style={gS.iconBtn} onPress={load}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Navegação */}
        <View style={gS.nav}>
          <TouchableOpacity style={gS.navBtn} onPress={() => navigate(-1)}>
            <Icon name="back" size={15} color="#444" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={gS.navTitle}>{title}</Text>
          <TouchableOpacity style={gS.navBtn} onPress={() => navigate(1)}>
            <Icon name="chevronRight" size={15} color="#444" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={gS.pills}>
            {[['week','2 sem'],['month','Mês']].map(([k,l]) => (
              <TouchableOpacity key={k}
                style={[gS.pill, viewMode === k && gS.pillActive]}
                onPress={() => { setViewMode(k); setBaseDate(new Date()); }}>
                <Text style={[gS.pillText, viewMode === k && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legenda */}
        <View style={gS.legend}>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <View key={k} style={gS.legendItem}>
              <View style={[gS.legendDot, { backgroundColor: v.bg, borderColor: v.border }]} />
              <Text style={gS.legendText}>{v.label}</Text>
            </View>
          ))}
        </View>

        {/* Corpo */}
        {loading ? (
          <View style={gS.center}><ActivityIndicator size="large" color={COLORS.blue} /></View>
        ) : (data?.roomTypes || []).length === 0 ? (
          <View style={gS.center}>
            <Text style={{ fontSize: 13, color: '#888' }}>Sem quartos configurados.</Text>
          </View>
        ) : (
          /*
           * ARQUITECTURA:
           * Um único ScrollView horizontal envolve TUDO (cabeçalho + linhas).
           * O scroll vertical é feito pelo ScrollView exterior ao Modal (pageSheet).
           * A coluna de rótulos é renderizada numa View separada à esquerda,
           * fora do ScrollView horizontal, mas com alturas idênticas às linhas
           * do Gantt para ficarem alinhadas.
           */
          <View style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Layout de duas colunas */}
              <View style={{ flexDirection: 'row' }}>

                {/* ── Coluna de rótulos (fixa à esquerda) ── */}
                <View style={{ width: LABEL_W }}>
                  {/* Espaço do cabeçalho de dias */}
                  <View style={{ height: HDR_H, backgroundColor: '#1E3A5F',
                                 justifyContent: 'flex-end', paddingBottom: 6,
                                 paddingLeft: 8, borderBottomWidth: 1, borderBottomColor: '#2D5286' }}>
                    <Text style={{ fontSize: 9, color: '#93C5FD', fontWeight: '700',
                                   letterSpacing: 0.5 }}>QUARTO</Text>
                  </View>

                  {/* Rótulos por tipo */}
                  {(data?.roomTypes || []).map(rt => {
                    const isCollapsed = !!collapsed[rt.id];
                    const rooms = rt.rooms || [];
                    const unassigned = bkByType[rt.id] || [];
                    return (
                      <View key={rt.id}>
                        {/* Rótulo tipo — clicável */}
                        <TouchableOpacity
                          style={gS.typeLabel}
                          onPress={() => setCollapsed(p => ({ ...p, [rt.id]: !p[rt.id] }))}
                          activeOpacity={0.8}
                        >
                          <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'}
                            size={11} color="#93C5FD" strokeWidth={2.5} />
                          <Text style={gS.typeLabelText} numberOfLines={2}>{rt.name}</Text>
                        </TouchableOpacity>
                        {!isCollapsed && rooms.map((room, i) => (
                          <View key={room.id} style={[gS.labelCell, i % 2 === 1 && gS.labelCellEven]}>
                            <Text style={gS.labelNum}>Nº {room.number}</Text>
                            {room.floor != null &&
                              <Text style={gS.labelFloor}>P{room.floor}</Text>}
                          </View>
                        ))}
                        {/* Linha pendentes sem quarto */}
                        {!isCollapsed && unassigned.length > 0 && (
                          <View style={[gS.labelCell, { backgroundColor: '#FFFBEB' }]}>
                            <Text style={[gS.labelNum, { fontSize: 9, color: '#D97706' }]}>
                              Pendentes
                            </Text>
                            <Text style={[gS.labelFloor, { color: '#D97706' }]}>
                              s/quarto
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <View style={{ height: 40 }} />
                </View>

                {/* ── Coluna Gantt (scroll horizontal) ── */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1 }}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View style={{ width: totalW }}>

                    {/* Cabeçalho: linha de meses + linha de dias */}
                    <View style={{ height: HDR_H, borderBottomWidth: 1, borderBottomColor: '#D6D3CC' }}>
                      {/* Meses */}
                      <View style={{ flexDirection: 'row', height: 20, backgroundColor: '#1E3A5F' }}>
                        {monthGroups.map(m => (
                          <View key={m.key} style={{ width: m.count * CELL_W,
                            justifyContent: 'center', paddingLeft: 6,
                            borderRightWidth: 1, borderRightColor: '#2D5286' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#93C5FD' }}>
                              {m.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {/* Dias */}
                      <View style={{ flexDirection: 'row', height: HDR_H - 20,
                                     backgroundColor: '#EFF2F6' }}>
                        {days.map((d, i) => {
                          const isToday = dateKey(d) === today;
                          const isWknd  = d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <View key={i} style={[gS.dayCell,
                              isToday && gS.dayCellToday,
                              isWknd  && gS.dayCellWknd]}>
                              <Text style={[gS.dayCellD, isToday && { color: '#D32323' }]}>
                                {DAYS_MINI[d.getDay()]}
                              </Text>
                              <Text style={[gS.dayCellN, isToday && { color: '#D32323', fontWeight: '800' }]}>
                                {pad(d.getDate())}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Linhas por tipo */}
                    {(data?.roomTypes || []).map(rt => {
                      const isCollapsed = !!collapsed[rt.id];
                      const rooms = rt.rooms || [];
                      const unassigned = bkByType[rt.id] || [];
                      return (
                        <View key={rt.id}>
                          {/* Faixa de cabeçalho do tipo */}
                          <View style={[gS.typeRowFiller, { width: totalW }]} />
                          {/* Linhas de quarto */}
                          {!isCollapsed && rooms.map((room, i) =>
                            renderRoomRow(room, bkByRoom[room.id] || [], i % 2 === 1)
                          )}
                          {/* Linha pendentes */}
                          {!isCollapsed && unassigned.length > 0 && (
                            <View style={[gS.rowGrid, gS.rowGridPending, { width: totalW }]}>
                              {days.map((_, di) => (
                                <View key={di} style={[gS.cell, { backgroundColor: '#FFFBEB' }]} />
                              ))}
                              {unassigned.map(bk => (
                                <BookingBar key={bk.id} bk={bk} days={days}
                                  onPress={b => setSelectedBk(enrichBk(b))} />
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <View style={{ height: 40 }} />
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Modal de detalhe da reserva */}
      <BookingDetailModal
        bk={selectedBk}
        onClose={() => setSelectedBk(null)}
        onAction={(id, action, bk) => {
          onBookingAction?.(id, action, bk);
        }}
      />
    </Modal>
  );
}

// ─── Estilos do Gantt ─────────────────────────────────────────────────────────
const gS = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#F5F4F0' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: 16, paddingBottom: 12,
                    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E1D8' },
  iconBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: '#111' },
  nav:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
                    paddingVertical: 10, backgroundColor: '#fff',
                    borderBottomWidth: 1, borderBottomColor: '#ECEAE3', gap: 6 },
  navBtn:         { width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#F0EDE6', borderRadius: 8 },
  navTitle:       { flex: 1, fontSize: 13, fontWeight: '700', color: '#111', textAlign: 'center' },
  pills:          { flexDirection: 'row', gap: 4 },
  pill:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#F0EDE6' },
  pillActive:     { backgroundColor: '#1565C0' },
  pillText:       { fontSize: 11, fontWeight: '700', color: '#555' },
  legend:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12,
                    paddingVertical: 7, backgroundColor: '#fff',
                    borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendText:     { fontSize: 10, color: '#555', fontWeight: '600' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  // Cabeçalho dias
  dayCell:        { width: CELL_W, height: HDR_H - 20, alignItems: 'center', justifyContent: 'center',
                    borderRightWidth: 1, borderRightColor: '#D8DCE6' },
  dayCellToday:   { backgroundColor: '#FEE2E2' },
  dayCellWknd:    { backgroundColor: '#E8EBF3' },
  dayCellD:       { fontSize: 9, color: '#777', fontWeight: '700' },
  dayCellN:       { fontSize: 12, fontWeight: '600', color: '#222', marginTop: 2 },
  // Rótulos
  typeLabel:      { height: ROW_H - 8, backgroundColor: '#1E3A5F', flexDirection: 'row',
                    alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  typeLabelText:  { fontSize: 10, fontWeight: '700', color: '#fff', flex: 1 },
  labelCell:      { height: ROW_H, justifyContent: 'center', paddingHorizontal: 8,
                    borderBottomWidth: 1, borderBottomColor: '#ECEAE3', backgroundColor: '#FAFAF8' },
  labelCellEven:  { backgroundColor: '#F4F3EF' },
  labelNum:       { fontSize: 11, fontWeight: '700', color: '#222' },
  labelFloor:     { fontSize: 9, color: '#888', marginTop: 1 },
  // Linhas grid
  typeRowFiller:  { height: ROW_H - 8, backgroundColor: '#1E3A5F',
                    borderBottomWidth: 1, borderBottomColor: '#2D5286' },
  rowGrid:        { height: ROW_H, flexDirection: 'row', backgroundColor: '#fff',
                    borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  rowGridEven:    { backgroundColor: '#FAFAF8' },
  rowGridPending: { backgroundColor: '#FFFBEB' },
  cell:           { width: CELL_W, height: ROW_H, borderRightWidth: 1, borderRightColor: '#ECEAE3' },
  cellToday:      { backgroundColor: 'rgba(220,50,50,0.07)' },
  cellWknd:       { backgroundColor: 'rgba(100,100,180,0.04)' },
  // Barra
  bar:            { position: 'absolute', top: 8, height: ROW_H - 16,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 8, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  barText:        { fontSize: 11, fontWeight: '700', flexShrink: 1 },
});

// ─── Estilos do modal de detalhe (idênticos ao BookingCard da Receção) ────────
const dS = StyleSheet.create({
  // Overlay toca para fechar
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
                justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 32 },
  sheet:      { width: '100%' },
  // Card — mesmo estilo que rS.card na Receção
  card:       { backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 3,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, overflow: 'hidden' },
  cardHead:   { flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', padding: 14 },
  guestName:  { fontSize: 14, fontWeight: '700', color: '#111' },
  guestSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:  { fontSize: 11, fontWeight: '600' },
  cardBody:   { paddingHorizontal: 14, paddingBottom: 14,
                borderTopWidth: 1, borderTopColor: '#F0EDE6', gap: 6 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowText:    { fontSize: 13, color: '#444', flex: 1 },
  // Botões — mesmo estilo que rS.btn na Receção
  actions:    { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 14, paddingVertical: 9,
                borderRadius: 8, minWidth: 80, justifyContent: 'center' },
  btnGreen:   { backgroundColor: '#22A06B' },
  btnOrange:  { backgroundColor: '#D97706' },
  btnBlue:    { backgroundColor: '#1565C0' },
  btnRed:     { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnEdit:    { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#C4B5FD' },
  btnCancel:  { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnWhite:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnText:    { fontSize: 13, fontWeight: '700' },
  btnEditText:{ fontSize: 13, fontWeight: '700', color: '#7C3AED' },
});