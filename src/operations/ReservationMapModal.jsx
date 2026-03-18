// ReservationMapModal.jsx — Mapa de Reservas (Gantt por quarto)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Constantes de layout ─────────────────────────────────────────────────────
const CELL_W  = 40;   // largura de cada célula de dia
const ROW_H   = 46;   // altura de cada linha de quarto
const LABEL_W = 70;   // largura fixa da coluna de rótulos
const HDR_H   = 48;   // altura do cabeçalho de dias

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS_CFG = {
  PENDING:     { bar: '#FCD34D', text: '#92400E', label: 'Pendente'   },
  CONFIRMED:   { bar: '#60A5FA', text: '#1D4ED8', label: 'Confirmada' },
  CHECKED_IN:  { bar: '#34D399', text: '#065F46', label: 'Hospedado'  },
  CHECKED_OUT: { bar: '#9CA3AF', text: '#374151', label: 'Saída'      },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtD   = d => String(d.getDate()).padStart(2,'0');
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const sod     = d => { const r = new Date(d); r.setHours(0,0,0,0); return r; };

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReservationMapModal({ businessId, accessToken, onClose }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState('month');
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  // Tipos retraídos/expandidos
  const [collapsed, setCollapsed] = useState({});
  const alive = useRef(true);
  // Scroll horizontal sincronizado: header + corpo
  const headerScrollRef = useRef(null);
  const bodyScrollRef   = useRef(null);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Dias a mostrar
  const days = React.useMemo(() => {
    if (viewMode === 'week') {
      return Array.from({ length: 7 }, (_, i) => addDays(baseDate, i));
    }
    const y = baseDate.getFullYear(), m = baseDate.getMonth();
    const n = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
  }, [viewMode, baseDate]);

  const totalW = days.length * CELL_W;
  const today  = dateKey(new Date());

  const load = useCallback(async () => {
    if (!businessId || !accessToken) return;
    setLoading(true);
    try {
      const from = days[0].toISOString();
      const to   = days[days.length - 1].toISOString();
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
      if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir, 1);
      return d;
    });
  };

  // Scroll sincronizado header ↔ corpo
  const onHScroll = (ref, other) => e => {
    const x = e.nativeEvent.contentOffset.x;
    other.current?.scrollTo?.({ x, animated: false });
  };

  // Mapa roomId → bookings
  const bkByRoom = React.useMemo(() => {
    if (!data) return {};
    const m = {};
    (data.bookings || []).forEach(bk => {
      if (!bk.roomId) return;
      if (!m[bk.roomId]) m[bk.roomId] = [];
      m[bk.roomId].push(bk);
    });
    return m;
  }, [data]);

  // Renderizar barra de reserva — posição absoluta dentro da linha
  const renderBar = bk => {
    const st  = sod(new Date(bk.startDate));
    const end = sod(new Date(bk.endDate));
    const col = STATUS_CFG[bk.status] || STATUS_CFG.CONFIRMED;
    const firstDay   = sod(days[0]);
    const startOff   = Math.max(0, Math.round((st - firstDay) / 86400000));
    const endOff     = Math.min(days.length, Math.round((end - firstDay) / 86400000));
    const barDays    = endOff - startOff;
    if (barDays <= 0) return null;
    return (
      <View key={bk.id} pointerEvents="none" style={[rmS.bar, {
        left:            startOff * CELL_W + 2,
        width:           barDays * CELL_W - 4,
        backgroundColor: col.bar,
      }]}>
        <Text style={[rmS.barText, { color: col.text }]} numberOfLines={1}>
          {bk.guestName}
        </Text>
      </View>
    );
  };

  const title = viewMode === 'week'
    ? `${fmtD(days[0])} ${MONTHS_SH[days[0].getMonth()]} — ${fmtD(days[6])} ${MONTHS_SH[days[6].getMonth()]} ${days[6].getFullYear()}`
    : `${MONTHS_PT[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={rmS.root}>

        {/* ── Header ── */}
        <View style={rmS.header}>
          <TouchableOpacity style={rmS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={rmS.headerTitle}>Mapa de Reservas</Text>
          <TouchableOpacity style={rmS.iconBtn} onPress={load}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Navegação + modo ── */}
        <View style={rmS.nav}>
          <TouchableOpacity style={rmS.navBtn} onPress={() => navigate(-1)}>
            <Icon name="back" size={16} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={rmS.navTitle}>{title}</Text>
          <TouchableOpacity style={rmS.navBtn} onPress={() => navigate(1)}>
            <Icon name="chevronRight" size={16} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={rmS.modePills}>
            {[['week','7 dias'],['month','Mês']].map(([k,l]) => (
              <TouchableOpacity key={k}
                style={[rmS.modePill, viewMode === k && rmS.modePillActive]}
                onPress={() => { setViewMode(k); if (k==='week') setBaseDate(new Date()); }}>
                <Text style={[rmS.modePillText, viewMode === k && { color:'#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Legenda ── */}
        <View style={rmS.legend}>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <View key={k} style={rmS.legendItem}>
              <View style={[rmS.legendDot, { backgroundColor: v.bar }]} />
              <Text style={rmS.legendText}>{v.label}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={rmS.center}><ActivityIndicator size="large" color={COLORS.blue} /></View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* ── Cabeçalho de dias (header fixo com scroll sincronizado) ── */}
            <View style={rmS.dayHeaderRow}>
              {/* Espaço alinhado com a coluna de rótulos */}
              <View style={[rmS.labelCol, rmS.dayHeaderLabel]}>
                <Text style={{ fontSize: 9, color: '#888', fontWeight: '600' }}>UH</Text>
              </View>
              {/* Dias scrolláveis */}
              <ScrollView
                ref={headerScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}   // controlado pelo body
                style={{ flex: 1 }}
              >
                <View style={{ width: totalW, flexDirection: 'row' }}>
                  {days.map((d, i) => {
                    const isToday = dateKey(d) === today;
                    const isWknd  = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <View key={i} style={[rmS.dayCell,
                        isToday && rmS.dayCellToday,
                        isWknd  && rmS.dayCellWknd]}>
                        <Text style={[rmS.dayCellDay,  isToday && { color: '#D32323' }]}>
                          {DAYS_PT[d.getDay()][0]}
                        </Text>
                        <Text style={[rmS.dayCellNum, isToday && { color: '#D32323', fontWeight: '800' }]}>
                          {fmtD(d)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* ── Corpo scrollável verticalmente + linha de tipo/quarto ── */}
            <ScrollView style={{ flex: 1 }}>
              {(data?.roomTypes || []).length === 0 ? (
                <View style={rmS.empty}>
                  <Text style={rmS.emptyText}>Sem quartos configurados.</Text>
                </View>
              ) : (data?.roomTypes || []).map(rt => {
                const isCollapsed = !!collapsed[rt.id];
                const rooms = rt.rooms || [];
                return (
                  <View key={rt.id}>
                    {/* ── Cabeçalho do tipo (retrátil) ── */}
                    <TouchableOpacity
                      style={rmS.typeHeader}
                      onPress={() => setCollapsed(p => ({ ...p, [rt.id]: !p[rt.id] }))}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={isCollapsed ? 'chevronRight' : 'chevronDown'}
                        size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={rmS.typeName}>{rt.name}</Text>
                      <Text style={rmS.typeCount}>{rooms.length} quarto{rooms.length !== 1 ? 's' : ''}</Text>
                    </TouchableOpacity>

                    {/* ── Linhas dos quartos (ocultas se retraído) ── */}
                    {!isCollapsed && rooms.map(room => {
                      const bks = bkByRoom[room.id] || [];
                      return (
                        <View key={room.id} style={rmS.roomRow}>
                          {/* Rótulo fixo */}
                          <View style={rmS.labelCol}>
                            <Text style={rmS.roomNum}>Nº {room.number}</Text>
                            {room.floor != null &&
                              <Text style={rmS.roomFloor}>Piso {room.floor}</Text>}
                          </View>
                          {/* Grid + barras — scroll horizontal sincronizado */}
                          <ScrollView
                            ref={bodyScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ flex: 1 }}
                            onScroll={onHScroll(bodyScrollRef, headerScrollRef)}
                            scrollEventThrottle={16}
                          >
                            <View style={{ width: totalW, height: ROW_H }}>
                              {/* Fundo de células */}
                              <View style={StyleSheet.absoluteFill} >
                                <View style={{ flexDirection: 'row', height: ROW_H }}>
                                  {days.map((d, i) => {
                                    const isToday = dateKey(d) === today;
                                    const isWknd  = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                      <View key={i} style={[rmS.cell,
                                        isToday && rmS.cellToday,
                                        isWknd  && rmS.cellWknd]} />
                                    );
                                  })}
                                </View>
                              </View>
                              {/* Barras de reserva */}
                              {bks.map(renderBar)}
                            </View>
                          </ScrollView>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const rmS = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F7F6F2' },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
                   backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E1D8' },
  iconBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#111' },

  // Navegação
  nav:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
                   paddingVertical: 10, backgroundColor: '#fff',
                   borderBottomWidth: 1, borderBottomColor: '#ECEAE3', gap: 6 },
  navBtn:        { width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
                   backgroundColor: '#F0EDE6', borderRadius: 8 },
  navTitle:      { flex: 1, fontSize: 13, fontWeight: '700', color: '#111', textAlign: 'center' },
  modePills:     { flexDirection: 'row', gap: 4 },
  modePill:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
                   backgroundColor: '#F0EDE6' },
  modePillActive:{ backgroundColor: '#1565C0' },
  modePillText:  { fontSize: 11, fontWeight: '700', color: '#555' },

  // Legenda
  legend:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 12,
                   paddingVertical: 8, backgroundColor: '#fff',
                   borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 10, height: 10, borderRadius: 5 },
  legendText:    { fontSize: 10, color: '#555', fontWeight: '600' },

  // Cabeçalho de dias
  dayHeaderRow:  { flexDirection: 'row', backgroundColor: '#ECEAE3',
                   borderBottomWidth: 1, borderBottomColor: '#D6D3CC', height: HDR_H },
  dayHeaderLabel:{ justifyContent: 'center', alignItems: 'center',
                   borderRightWidth: 1, borderRightColor: '#D6D3CC' },
  dayCell:       { width: CELL_W, height: HDR_H, alignItems: 'center', justifyContent: 'center',
                   borderRightWidth: 1, borderRightColor: '#E5E1D8' },
  dayCellToday:  { backgroundColor: '#FFE4E4' },
  dayCellWknd:   { backgroundColor: '#E8E5DF' },
  dayCellDay:    { fontSize: 9, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  dayCellNum:    { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 1 },

  // Coluna de rótulo (fixa)
  labelCol:      { width: LABEL_W, borderRightWidth: 1, borderRightColor: '#E5E1D8',
                   backgroundColor: '#FAFAF8', justifyContent: 'center', paddingHorizontal: 8 },

  // Cabeçalho de tipo
  typeHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8,
                   backgroundColor: '#1E3A5F', paddingHorizontal: 12, paddingVertical: 9 },
  typeName:      { flex: 1, fontSize: 12, fontWeight: '700', color: '#fff' },
  typeCount:     { fontSize: 10, color: '#93C5FD', fontWeight: '600' },

  // Linha de quarto
  roomRow:       { flexDirection: 'row', height: ROW_H,
                   borderBottomWidth: 1, borderBottomColor: '#ECEAE3', backgroundColor: '#fff' },
  roomNum:       { fontSize: 12, fontWeight: '700', color: '#111' },
  roomFloor:     { fontSize: 10, color: '#888', marginTop: 1 },

  // Células de dia
  cell:          { width: CELL_W, height: ROW_H, borderRightWidth: 1, borderRightColor: '#F0EDE6' },
  cellToday:     { backgroundColor: '#FFF5F5' },
  cellWknd:      { backgroundColor: '#F9F7F3' },

  // Barra de reserva
  bar:           { position: 'absolute', top: 8, height: ROW_H - 16,
                   borderRadius: 6, justifyContent: 'center', paddingHorizontal: 7,
                   shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                   shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  barText:       { fontSize: 10, fontWeight: '700' },

  // Estado vazio
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:         { padding: 40, alignItems: 'center' },
  emptyText:     { fontSize: 13, color: '#888', textAlign: 'center' },
});
