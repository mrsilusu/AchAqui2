/**
 * ============================================================================
 * RoomGanttScreen — Mapa de Reservas Gantt (PMS Hoteleiro)
 * ============================================================================
 * Sprint 1: Canvas estático com demo data
 * Sprint 2: Integração com API real + iCal blocks
 * Sprint 3: Interacções (tap célula → criar reserva, tap barra → detalhe)
 * Sprint 4: Integrado em DashboardPMS (ver DashboardPMS.jsx + HospitalityModule.jsx)
 *
 * Segurança multi-tenant: businessId + accessToken obrigatórios em todos os
 * pedidos à API. Nunca expor dados de um tenant a outro.
 * ============================================================================
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, ActivityIndicator, RefreshControl, FlatList,
  SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Constantes de layout ─────────────────────────────────────────────────────
const ROOM_COL_WIDTH = 90;
// Garante exactamente 7 dias visíveis em qualquer tamanho de ecrã
const { width: SCREEN_W } = Dimensions.get('window');
const DATE_COL_WIDTH = Math.max(40, Math.floor((SCREEN_W - ROOM_COL_WIDTH) / 7));
const ROW_HEIGHT     = 52;
const BAR_HEIGHT     = 28;

// ─── Cores por status de reserva ─────────────────────────────────────────────
const BOOKING_COLORS = {
  pending:      '#D97706',
  PENDING:      '#D97706',
  confirmed:    '#1565C0',
  CONFIRMED:    '#1565C0',
  CHECKED_IN:   '#22A06B',
  checked_in:   '#22A06B',
  checked_out:  '#9CA3AF',
  CHECKED_OUT:  '#9CA3AF',
  cancelled:    '#EF4444',
  CANCELLED:    '#EF4444',
  ical_block:   '#4338CA',
};

// Legenda de cores — regra de negócio visual
const LEGEND_BOOKINGS = [
  { label: 'Pendente',      color: '#D97706' },
  { label: 'Confirmado',    color: '#1565C0' },
  { label: 'Check-in',      color: '#22A06B' },
  { label: 'Check-out',     color: '#9CA3AF' },
  { label: 'Cancelado',     color: '#EF4444' },
  { label: 'Externo/iCal',  color: '#4338CA' },
];
const LEGEND_HK = [
  { label: 'Limpo',       icon: '🟢' },
  { label: 'Sujo',        icon: '🟡' },
  { label: 'A limpar',    icon: '🟠' },
  { label: 'Manutenção',  icon: '🔴' },
  { label: 'Inspecção',   icon: '🔵' },
];

function LegendPanel({ visible }) {
  if (!visible) return null;
  return (
    <View style={gS.legendPanel}>
      <View style={gS.legendSection}>
        <Text style={gS.legendTitle}>Reservas</Text>
        <View style={gS.legendRow}>
          {LEGEND_BOOKINGS.map((item) => (
            <View key={item.label} style={gS.legendItem}>
              <View style={[gS.legendDot, { backgroundColor: item.color }]} />
              <Text style={gS.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[gS.legendSection, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 6, paddingTop: 6 }]}>
        <Text style={gS.legendTitle}>Housekeeping</Text>
        <View style={gS.legendRow}>
          {LEGEND_HK.map((item) => (
            <View key={item.label} style={gS.legendItem}>
              <Text style={{ fontSize: 12 }}>{item.icon}</Text>
              <Text style={gS.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Ícones por status de housekeeping ───────────────────────────────────────
const HK_ICONS = {
  CLEAN:       '🟢',
  DIRTY:       '🟡',
  CLEANING:    '🟠',
  MAINTENANCE: '🔴',
  INSPECTING:  '🔵',
};

// ─── Helpers de data ──────────────────────────────────────────────────────────
function toYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function dayOfWeek(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  return d.getDay(); // 0=Dom, 6=Sáb
}

function isWeekend(ymd) {
  const dw = dayOfWeek(ymd);
  return dw === 0 || dw === 6;
}

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function fmtDayLabel(ymd) {
  const d = new Date(ymd + 'T00:00:00');
  return {
    weekday: DAY_ABBR[d.getDay()],
    day:     String(d.getDate()).padStart(2, '0'),
    month:   String(d.getMonth() + 1).padStart(2, '0'),
  };
}

function fmtFull(ymd) {
  if (!ymd) return '';
  const { day, month } = fmtDayLabel(ymd);
  const year = ymd.slice(0, 4);
  return `${day}/${month}/${year}`;
}

function buildDateWindow(startYmd, numDays) {
  return Array.from({ length: numDays }, (_, i) => addDays(startYmd, i));
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const TODAY = toYMD(new Date());

const DEMO_ROOMS = [
  { id: 'r1', roomNumber: 101, floor: 1, typeName: 'Suite Executiva',  status: 'CLEAN'       },
  { id: 'r2', roomNumber: 102, floor: 1, typeName: 'Suite Executiva',  status: 'DIRTY'       },
  { id: 'r3', roomNumber: 103, floor: 1, typeName: 'Standard',         status: 'CLEAN'       },
  { id: 'r4', roomNumber: 104, floor: 1, typeName: 'Standard',         status: 'MAINTENANCE' },
  { id: 'r5', roomNumber: 201, floor: 2, typeName: 'Deluxe',           status: 'CLEAN'       },
  { id: 'r6', roomNumber: 202, floor: 2, typeName: 'Deluxe',           status: 'INSPECTING'  },
  { id: 'r7', roomNumber: 203, floor: 2, typeName: 'Standard',         status: 'CLEAN'       },
];

const DEMO_BOOKINGS = [
  {
    id: 'b1', guestName: 'Ana Silva', guestPhone: '+244 912 111 001',
    checkIn: addDays(TODAY, -1), checkOut: addDays(TODAY, 2), nights: 3,
    totalPrice: 45000, status: 'CHECKED_IN', roomId: 'r1',
    source: 'direct', specialRequest: '',
  },
  {
    id: 'b2', guestName: 'João Mendes', guestPhone: '+244 923 222 002',
    checkIn: addDays(TODAY, -3), checkOut: TODAY, nights: 3,
    totalPrice: 36000, status: 'checked_out', roomId: 'r2',
    source: 'booking.com', specialRequest: '',
  },
  // Turnover: checkout de b2 = checkin de b3 no quarto 102 no mesmo dia
  {
    id: 'b3', guestName: 'Maria Antónia', guestPhone: '+244 934 333 003',
    checkIn: TODAY, checkOut: addDays(TODAY, 4), nights: 4,
    totalPrice: 52000, status: 'CONFIRMED', roomId: 'r2',
    source: 'airbnb', specialRequest: 'Cama extra',
  },
  {
    id: 'b4', guestName: 'Carlos Neto', guestPhone: '+244 945 444 004',
    checkIn: addDays(TODAY, 1), checkOut: addDays(TODAY, 3), nights: 2,
    totalPrice: 28000, status: 'pending', roomId: 'r3',
    source: 'direct', specialRequest: '',
  },
  {
    id: 'b5', guestName: 'BLOQUEIO Manutenção', guestPhone: '',
    checkIn: addDays(TODAY, -2), checkOut: addDays(TODAY, 5), nights: 7,
    totalPrice: 0, status: 'cancelled', roomId: 'r5',
    source: 'direct', specialRequest: '',
  },
  {
    id: 'b6', guestName: 'Booking.com Block', guestPhone: '',
    checkIn: addDays(TODAY, 2), checkOut: addDays(TODAY, 6), nights: 4,
    totalPrice: 0, status: 'ical_block', roomId: 'r6',
    source: 'booking.com', specialRequest: '',
  },
];

// ─── GanttHeader ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function GanttHeader({ dates, onScroll, scrollRef }) {
  return (
    <View>
      {/* Faixa de meses */}
      <View style={[gS.headerRow, { borderBottomWidth: 0, paddingVertical: 0 }]}>
        <View style={[gS.cornerCell, { height: 18 }]} />
        <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            {(() => {
              const segments = [];
              let cur = null; let count = 0;
              dates.forEach((ymd) => {
                const m = Number(ymd.slice(5, 7)) - 1;
                if (cur === null || m !== cur) {
                  if (cur !== null) segments.push({ month: cur, count });
                  cur = m; count = 1;
                } else { count++; }
              });
              if (cur !== null) segments.push({ month: cur, count });
              return segments.map((seg, i) => (
                <View key={i} style={{ width: seg.count * DATE_COL_WIDTH, justifyContent: 'center',
                  alignItems: 'flex-start', paddingLeft: 4, height: 18,
                  borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {MONTH_NAMES[seg.month]}
                  </Text>
                </View>
              ));
            })()}
          </View>
        </ScrollView>
      </View>
      {/* Faixa de dias — scrollEnabled=true, master de scroll */}
      <View style={gS.headerRow}>
        <View style={gS.cornerCell}>
          <Text style={gS.cornerText}>QUARTO</Text>
        </View>
        <ScrollView
          horizontal
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: 'row' }}>
            {dates.map((ymd) => {
              const isToday = ymd === TODAY;
              const weekend = isWeekend(ymd);
              const { weekday, day } = fmtDayLabel(ymd);
              return (
                <View
                  key={ymd}
                  style={[
                    gS.dateCell,
                    weekend && gS.dateCellWeekend,
                    isToday && gS.dateCellToday,
                    { width: DATE_COL_WIDTH },
                  ]}
                >
                  <Text style={[gS.dateWeekday, isToday && gS.dateTodayText]}>{weekday}</Text>
                  <Text style={[gS.dateDay, isToday && gS.dateTodayText]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── GanttBar ────────────────────────────────────────────────────────────────
function GanttBar({ booking, dates, onPress, hasConflict }) {
  const startIdx = dates.findIndex((d) => d >= booking.checkIn);
  // clip ao início da janela se checkIn está antes
  const clippedStart = booking.checkIn < dates[0] ? 0 : startIdx;

  const endIdx = dates.findIndex((d) => d >= booking.checkOut);
  // clip ao fim se checkOut passa o fim da janela
  const clippedEnd = endIdx === -1 ? dates.length : endIdx;

  if (clippedStart === -1 || clippedStart >= dates.length || clippedEnd <= clippedStart) {
    return null;
  }

  const isCancelled = booking.status === 'cancelled' || booking.status === 'CANCELLED';
  const isIcal      = booking.status === 'ical_block';
  const color       = BOOKING_COLORS[booking.status] || '#9CA3AF';

  const width = (clippedEnd - clippedStart) * DATE_COL_WIDTH - 4;
  const left  = clippedStart * DATE_COL_WIDTH + 2;

  let label = booking.guestName;
  if (isIcal) {
    const src = (booking.source || '').toLowerCase();
    label = src.includes('booking') ? 'Bk.com' : src.includes('airbnb') ? 'Airbnb' : 'Externo';
  }

  return (
    <TouchableOpacity
      style={[
        gS.bar,
        {
          left,
          width: Math.max(width, DATE_COL_WIDTH - 4),
          backgroundColor: isCancelled ? color + '80' : color,
          borderColor: hasConflict ? '#DC2626' : 'transparent',
          borderWidth: hasConflict ? 2 : 0,
        },
      ]}
      onPress={() => onPress(booking)}
      activeOpacity={0.8}
      accessibilityLabel={`Reserva de ${booking.guestName}, ${booking.nights} noites`}
    >
      <Text style={gS.barText} numberOfLines={1}>
        {width > 60 ? `${label} · ${booking.nights}n` : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── GanttRoomRow ────────────────────────────────────────────────────────────
const GanttRoomRow = memo(function GanttRoomRow({
  room, dates, bookings, onCellPress, onBarPress, onRoomPress, hasConflict, scrollRef, onScroll,
}) {
  return (
    <View style={[gS.roomRow, { height: ROW_HEIGHT }]}>
      {/* Coluna fixa do quarto */}
      <TouchableOpacity
        style={gS.roomLabel}
        onPress={() => onRoomPress(room)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={gS.roomNumber}>{room.roomNumber}</Text>
          <Text style={gS.roomHkIcon}>{HK_ICONS[room.status] || '⚪'}</Text>
          {hasConflict && <Text style={{ fontSize: 9 }}>⚠️</Text>}
        </View>
        <Text style={gS.roomType} numberOfLines={1}>{room.typeName || '—'}</Text>
      </TouchableOpacity>

      {/* Células de datas — scroll horizontal habilitado, sincronizado */}
      <ScrollView
        horizontal
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ flexDirection: 'row', position: 'relative', height: ROW_HEIGHT }}>
          {/* Fundo das células */}
          {dates.map((ymd) => {
            const isToday = ymd === TODAY;
            const weekend = isWeekend(ymd);
            return (
              <TouchableOpacity
                key={ymd}
                style={[
                  gS.cell,
                  weekend && gS.cellWeekend,
                  isToday && gS.cellToday,
                  { width: DATE_COL_WIDTH, height: ROW_HEIGHT },
                ]}
                onPress={() => onCellPress(room, ymd)}
                activeOpacity={0.6}
                accessibilityLabel={`Quarto ${room.roomNumber}, ${ymd}, disponível`}
              />
            );
          })}
          {/* Barras de reserva — zIndex alto para receber toques */}
          {bookings.map((bk) => (
            <GanttBar
              key={bk.id}
              booking={bk}
              dates={dates}
              onPress={onBarPress}
              hasConflict={hasConflict}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

// ─── GanttFooter ─────────────────────────────────────────────────────────────
function GanttFooter({ dates, rooms, bookings, overbookingBuffer, scrollRef, onScroll }) {
  const totalRooms = rooms.length;

  return (
    <View style={gS.footerRow}>
      <View style={gS.footerCorner}>
        <Text style={gS.footerCornerText}>Ocup.</Text>
      </View>
      <ScrollView
        horizontal
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ flexDirection: 'row' }}>
          {dates.map((ymd) => {
            const occupiedCount = bookings.filter((bk) => {
              const isCancelled = bk.status === 'cancelled' || bk.status === 'CANCELLED';
              if (isCancelled) return false;
              return bk.checkIn <= ymd && bk.checkOut > ymd;
            }).length;

            const rate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
            const realCapacity = overbookingBuffer < 100
              ? Math.floor(totalRooms * overbookingBuffer / 100)
              : totalRooms;
            // stopSell: só activar se houver realmente capacidade definida e ocupação acima do buffer
            const stopSell = overbookingBuffer < 100 && realCapacity > 0 && occupiedCount >= realCapacity;

            const cellColor = stopSell ? '#FEF3C7'
              : rate > 90 ? '#FEE2E2'
              : rate > 80 ? '#FFFBEB'
              : '#F0FDF4';
            const textColor = stopSell ? '#92400E'
              : rate > 90 ? '#DC2626'
              : rate > 80 ? '#D97706'
              : '#166534';

            return (
              <TouchableOpacity
                key={ymd}
                style={[gS.footerCell, { width: DATE_COL_WIDTH, backgroundColor: cellColor }]}
                onLongPress={() => {
                  if (stopSell) Alert.alert('Stop-Sell activo', `Buffer: ${overbookingBuffer}%\nOcupados: ${occupiedCount}/${realCapacity}`);
                }}
                activeOpacity={0.7}
              >
                <Text style={[gS.footerRate, { color: textColor }]}>{rate}%</Text>
                <Text style={[gS.footerSub, { color: textColor + 'CC' }]}>{occupiedCount}/{totalRooms}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── BookingDetailSheet ───────────────────────────────────────────────────────
function BookingDetailSheet({ booking, rooms, onClose, onAction, onUpdateRooms }) {
  const [loading, setLoading] = useState(false);
  if (!booking) return null;

  const room = rooms.find((r) => r.id === booking.roomId);
  const color = BOOKING_COLORS[booking.status] || '#9CA3AF';
  const isIcal = booking.status === 'ical_block';

  const STATUS_LABELS = {
    pending: 'Pendente', PENDING: 'Pendente',
    confirmed: 'Confirmado', CONFIRMED: 'Confirmado',
    CHECKED_IN: 'Check-in feito', checked_in: 'Check-in feito',
    checked_out: 'Check-out', CHECKED_OUT: 'Check-out',
    cancelled: 'Cancelado', CANCELLED: 'Cancelado',
    ical_block: 'Bloco Externo',
  };

  const todayYmd = toYMD(new Date());
  const showConfirm  = booking.status === 'pending' || booking.status === 'PENDING';
  const showCancel   = booking.status === 'pending' || booking.status === 'PENDING';
  // Check-in apenas disponível quando CONFIRMED (regra: não permite check-in em PENDING)
  const showCheckin  = (booking.status === 'CONFIRMED') && booking.checkIn === todayYmd;
  const showCheckout = booking.status === 'CHECKED_IN' || booking.status === 'checked_in';

  async function doAction(action) {
    setLoading(true);
    try { await onAction(booking, action); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={gS.sheetOverlay}>
        <View style={[gS.sheet, { maxHeight: '88%' }]}>
          <View style={gS.sheetHandle} />
          <View style={gS.sheetHeader}>
            <Text style={gS.sheetTitle}>{isIcal ? 'Bloco Externo' : booking.guestName}</Text>
            <TouchableOpacity onPress={onClose} style={gS.sheetClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            <View style={[gS.statusPill, { backgroundColor: color + '22' }]}>
              <Text style={[gS.statusPillText, { color }]}>
                {STATUS_LABELS[booking.status] || booking.status}
              </Text>
            </View>
            {!isIcal && booking.guestPhone ? (
              <Text style={gS.sheetMeta}>📞 {booking.guestPhone}</Text>
            ) : null}
            <Text style={gS.sheetMeta}>
              📅 {fmtFull(booking.checkIn)} → {fmtFull(booking.checkOut)}
            </Text>
            <Text style={gS.sheetMeta}>🌙 {booking.nights} noite{booking.nights !== 1 ? 's' : ''}</Text>
            {room && (
              <Text style={gS.sheetMeta}>🚪 Quarto {room.roomNumber} · {room.typeName}</Text>
            )}
            {booking.totalPrice > 0 && (
              <Text style={gS.sheetMeta}>💵 {booking.totalPrice.toLocaleString('pt-PT')} Kz</Text>
            )}
            {booking.specialRequest ? (
              <Text style={gS.sheetMeta} numberOfLines={2}>📝 {booking.specialRequest}</Text>
            ) : null}
          </ScrollView>

          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.blue} />
            </View>
          ) : (
            <View style={gS.sheetActions}>
              {showConfirm && (
                <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#1565C0' }]} onPress={() => doAction('confirm')}>
                  <Text style={gS.actionBtnText}>Confirmar</Text>
                </TouchableOpacity>
              )}
              {showCancel && (
                <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => doAction('cancel')}>
                  <Text style={gS.actionBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              {showCheckin && (
                <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#22A06B' }]} onPress={() => doAction('checkin')}>
                  <Text style={gS.actionBtnText}>Check-in</Text>
                </TouchableOpacity>
              )}
              {showCheckout && (
                <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#D97706' }]} onPress={() => doAction('checkout')}>
                  <Text style={gS.actionBtnText}>Check-out</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#F3F4F6' }]} onPress={onClose}>
                <Text style={[gS.actionBtnText, { color: '#374151' }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── RoomDetailSheet ──────────────────────────────────────────────────────────
function RoomDetailSheet({ room, onClose, accessToken, onUpdateRoom }) {
  const [loading, setLoading] = useState(false);
  if (!room) return null;

  const HK_STATUS_OPTIONS = ['CLEAN', 'DIRTY', 'CLEANING', 'MAINTENANCE', 'INSPECTING'];
  const HK_LABELS = {
    CLEAN: 'Limpo', DIRTY: 'Sujo', CLEANING: 'A limpar',
    MAINTENANCE: 'Manutenção', INSPECTING: 'Em inspecção',
  };

  async function handleChangeStatus() {
    Alert.alert(
      `Quarto ${room.roomNumber} — Estado`,
      'Seleccionar novo estado housekeeping:',
      HK_STATUS_OPTIONS.map((st) => ({
        text: `${HK_ICONS[st]} ${HK_LABELS[st]}`,
        onPress: async () => {
          setLoading(true);
          try {
            await backendApi.updateHtRoom(room.id, { status: st }, accessToken);
            onUpdateRoom(room.id, { status: st });
          } catch {
            Alert.alert('Erro', 'Não foi possível actualizar o estado.');
          } finally {
            setLoading(false);
            onClose();
          }
        },
      })).concat([{ text: 'Cancelar', style: 'cancel' }]),
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={gS.sheetOverlay}>
        <View style={gS.sheet}>
          <View style={gS.sheetHandle} />
          <View style={gS.sheetHeader}>
            <Text style={gS.sheetTitle}>Quarto {room.roomNumber}</Text>
            <TouchableOpacity onPress={onClose} style={gS.sheetClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 8, paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={gS.sheetMeta}>🏨 {room.typeName}</Text>
            <Text style={gS.sheetMeta}>🏢 Piso {room.floor}</Text>
            {/* Estado housekeeping em português com ícone e rótulo */}
            <View style={[gS.statusPill, { backgroundColor: '#F3F4F6', alignSelf: 'flex-start' }]}>
              <Text style={{ fontSize: 14, color: '#374151' }}>
                {HK_ICONS[room.status]}
                {'  '}
                <Text style={{ fontWeight: '700' }}>{HK_LABELS[room.status] || room.status}</Text>
              </Text>
            </View>
            {/* Legenda de housekeeping */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {LEGEND_HK.map((item) => (
                <View key={item.label} style={[gS.legendItem, { backgroundColor: '#F9FAFB', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }]}>
                  <Text style={{ fontSize: 11 }}>{item.icon}</Text>
                  <Text style={[gS.legendLabel, { fontSize: 10, color: '#6B7280' }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            {loading ? (
              <ActivityIndicator color={COLORS.blue} style={{ marginTop: 12 }} />
            ) : (
              <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#1565C0', marginTop: 12, flexDirection: 'row', gap: 6 }]} onPress={handleChangeStatus}>
                <Text style={{ fontSize: 16 }}>🔄</Text>
                <Text style={gS.actionBtnText}>Mudar estado de housekeeping</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[gS.actionBtn, { backgroundColor: '#F3F4F6', marginTop: 4, flexDirection: 'row', gap: 6 }]} onPress={onClose}>
              <Text style={{ fontSize: 16 }}>✕</Text>
              <Text style={[gS.actionBtnText, { color: '#374151' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function RoomGanttScreen({
  businessId,
  accessToken,
  bookings: bookingsProp = [],
  icalBlocks = [],
  overbookingBuffer = 100,
  onClose,
  onOpenBooking,
}) {
  const [rooms,     setRooms]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [windowDays,setWindowDays]= useState(7);
  const [startDate, setStartDate] = useState(() => addDays(TODAY, -1));
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoom,    setSelectedRoom]    = useState(null);
  const [showLegend,      setShowLegend]      = useState(false);
  const alive = useRef(true);
  const loadingRef = useRef(false);
  // Refs estáveis para props array — evitam loop infinito de useEffect
  const bookingsPropRef = useRef(bookingsProp);
  const icalBlocksRef   = useRef(icalBlocks);
  useEffect(() => { bookingsPropRef.current = bookingsProp; }, [bookingsProp]);
  useEffect(() => { icalBlocksRef.current   = icalBlocks;   }, [icalBlocks]);

  // Refs para sincronização do scroll horizontal
  const headerScrollRef  = useRef(null);
  const footerScrollRef  = useRef(null);
  const rowScrollRefs    = useRef({});
  const mainScrollRef    = useRef(null);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // ── Carregar dados via API (uma única chamada getHtMap) ─────────────────────
  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current && !isRefresh) return; // evitar chamadas concorrentes
    loadingRef.current = true;
    isRefresh ? setRefreshing(true) : setLoading(true);

    const fallbackBookings = bookingsPropRef.current;
    const fallbackIcal     = icalBlocksRef.current;

    if (!businessId || !accessToken) {
      setRooms(DEMO_ROOMS);
      const normalized = fallbackBookings.map((b) => ({
        ...b,
        checkIn:  b.checkIn  ? toYMD(new Date(b.checkIn))  : b.checkIn,
        checkOut: b.checkOut ? toYMD(new Date(b.checkOut)) : b.checkOut,
      }));
      setBookings(normalized.length ? normalized : DEMO_BOOKINGS);
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
      return;
    }

    try {
      const from = addDays(TODAY, -7);
      const to   = addDays(TODAY, 60);
      // Uma única chamada: getHtMap devolve rooms (em roomTypes) + bookings
      const mapData = await backendApi.getHtMap(businessId, from, to, accessToken).catch(() => null);
      if (!alive.current) return;

      // ── Normalizar quartos ────────────────────────────────────────────────
      // getHtMap devolve: { roomTypes: [{id, name, rooms:[{id,number,floor,status}]}], bookings:[...] }
      // Precisamos de flatten com typeName injectado
      const roomTypesList = mapData?.roomTypes || [];
      const flatRooms = [];
      const typeIdToRooms = {}; // { typeId: room[] } — para fallback de roomId nulo
      roomTypesList.forEach((rt) => {
        typeIdToRooms[rt.id] = typeIdToRooms[rt.id] || [];
        (rt.rooms || []).forEach((r) => {
          const room = {
            id:         r.id,
            roomNumber: r.number ?? r.roomNumber ?? '?',
            floor:      r.floor  ?? 0,
            typeName:   rt.name  ?? '—',
            status:     r.status ?? 'CLEAN',
            roomTypeId: rt.id,
          };
          flatRooms.push(room);
          typeIdToRooms[rt.id].push(room);
        });
      });
      setRooms(flatRooms.length ? flatRooms : DEMO_ROOMS);
      const knownRoomIds = new Set(flatRooms.map((r) => r.id));

      // ── Normalizar bookings ───────────────────────────────────────────────
      // getHtMap devolve: startDate/endDate (ISO), não checkIn/checkOut
      const rawBookings = mapData?.bookings || [];
      const apiBookings = rawBookings.map((b) => {
        const ci = b.checkIn  || b.startDate;
        const co = b.checkOut || b.endDate;
        const ciYmd = ci ? toYMD(new Date(ci)) : null;
        const coYmd = co ? toYMD(new Date(co)) : null;
        // Resolver roomId: se nulo ou desconhecido, tentar pelo roomTypeId
        let resolvedRoomId = b.roomId;
        if (!resolvedRoomId || !knownRoomIds.has(resolvedRoomId)) {
          const typeRooms = typeIdToRooms[b.roomTypeId] || [];
          resolvedRoomId = typeRooms[0]?.id ?? null;
        }
        return {
          ...b,
          roomId:     resolvedRoomId,
          guestName:  b.guestName  || 'Hóspede',
          checkIn:    ciYmd,
          checkOut:   coYmd,
          nights:     b.nights ?? (ciYmd && coYmd
            ? Math.max(1, Math.round((new Date(coYmd) - new Date(ciYmd)) / 86400000))
            : 1),
          totalPrice: b.totalPrice ?? 0,
          specialRequest: b.specialRequest || b.notes || '',
        };
      }).filter((b) => b.checkIn && b.checkOut && b.roomId);

      const icalAsBookings = (fallbackIcal || []).map((bl) => ({
        id:         `ical_${bl.roomId}_${bl.start}`,
        guestName:  bl.source || 'Externo',
        guestPhone: '',
        checkIn:    bl.start,
        checkOut:   bl.end,
        nights:     Math.max(1, Math.round((new Date(bl.end) - new Date(bl.start)) / 86400000)),
        totalPrice: 0,
        status:     'ical_block',
        roomId:     bl.roomId,
        source:     bl.source,
        specialRequest: '',
      }));

      const merged = [...apiBookings, ...icalAsBookings];
      const seen   = new Set();
      const deduped = merged.filter((b) => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

      const final = deduped.length ? deduped : (fallbackBookings.length ? fallbackBookings : DEMO_BOOKINGS);
      if (alive.current) setBookings(final);
    } catch {
      if (alive.current) {
        setRooms(DEMO_ROOMS);
        setBookings(fallbackBookings.length ? fallbackBookings : DEMO_BOOKINGS);
      }
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
      loadingRef.current = false;
    }
  }, [businessId, accessToken]); // ← apenas deps estáveis: sem arrays de props

  // Carregar apenas uma vez ao montar (businessId + accessToken estáveis)
  useEffect(() => { load(); }, [load]);

  // ── Janela de datas ──────────────────────────────────────────────────────────
  const dates = useMemo(() => buildDateWindow(startDate, windowDays), [startDate, windowDays]);

  // ── roomBookingMap por roomId ────────────────────────────────────────────────
  const roomBookingMap = useMemo(() => {
    const map = {};
    bookings.forEach((bk) => {
      if (!map[bk.roomId]) map[bk.roomId] = [];
      map[bk.roomId].push(bk);
    });
    return map;
  }, [bookings]);

  // ── Detecção de conflitos ────────────────────────────────────────────────────
  const conflictRooms = useMemo(() => {
    const conflicted = new Set();
    Object.entries(roomBookingMap).forEach(([roomId, bks]) => {
      for (let i = 0; i < bks.length; i++) {
        for (let j = i + 1; j < bks.length; j++) {
          const a = bks[i], b = bks[j];
          if (
            a.status !== 'cancelled' && a.status !== 'CANCELLED' &&
            b.status !== 'cancelled' && b.status !== 'CANCELLED' &&
            a.checkIn  < b.checkOut &&
            a.checkOut > b.checkIn
          ) {
            conflicted.add(roomId);
          }
        }
      }
    });
    return conflicted;
  }, [roomBookingMap]);

  // ── Scroll sincronizado — guard evita loops infinitos entre as ScrollViews ──
  const scrollXRef   = useRef(0);
  const syncingRef   = useRef(false);

  const syncAllScroll = useCallback((x) => {
    if (syncingRef.current) return;
    if (Math.abs(x - scrollXRef.current) < 1) return;
    scrollXRef.current = x;
    syncingRef.current = true;
    headerScrollRef.current?.scrollTo({ x, animated: false });
    footerScrollRef.current?.scrollTo({ x, animated: false });
    Object.values(rowScrollRefs.current).forEach((ref) => ref?.scrollTo?.({ x, animated: false }));
    setTimeout(() => { syncingRef.current = false; }, 50);
  }, []);

  // ── Botão Hoje ──────────────────────────────────────────────────────────────
  const scrollToToday = useCallback(() => {
    // Sempre repor a janela para hoje ser visível (funciona em qualquer mês)
    setStartDate(addDays(TODAY, -1));
    setTimeout(() => {
      // Após re-render, hoje está sempre no índice 1 (startDate = TODAY-1)
      const x = Math.max(0, 0 * DATE_COL_WIDTH); // scroll até ao início
      scrollXRef.current = -9999;
      syncAllScroll(x);
    }, 150);
  }, [syncAllScroll]);

  // ── Navegar janela ───────────────────────────────────────────────────────────
  const shiftWindow = useCallback((days) => {
    setStartDate((prev) => addDays(prev, days));
  }, []);

  // ── Tap em célula vazia → criar reserva ─────────────────────────────────────
  const handleCellPress = useCallback((room, date) => {
    if (onOpenBooking) {
      onOpenBooking({ roomId: room.id, roomNumber: room.roomNumber, checkIn: date, checkOut: addDays(date, 1) });
    } else {
      Alert.alert(
        `Quarto ${room.roomNumber}`,
        `Criar reserva para ${fmtFull(date)}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar Reserva', onPress: () => {
            if (onOpenBooking) onOpenBooking({ roomId: room.id, roomNumber: room.roomNumber, checkIn: date, checkOut: addDays(date, 1) });
          }},
        ],
      );
    }
  }, [onOpenBooking]);

  // ── Tap em barra → detalhe ───────────────────────────────────────────────────
  const handleBarPress = useCallback((booking) => {
    setSelectedBooking(booking);
  }, []);

  // ── Long press barra → housekeeping ─────────────────────────────────────────
  const handleBarLongPress = useCallback((booking) => {
    if (!booking.roomId) return;
    Alert.alert('Housekeeping', `Quarto ${booking.roomId}`, [
      {
        text: 'Marcar como Limpo',
        onPress: async () => {
          try {
            await backendApi.updateHtRoom(booking.roomId, { status: 'CLEAN' }, accessToken);
            setRooms((prev) => prev.map((r) => r.id === booking.roomId ? { ...r, status: 'CLEAN' } : r));
          } catch {
            Alert.alert('Erro', 'Operação falhou.');
          }
        },
      },
      {
        text: 'Marcar em Manutenção',
        onPress: async () => {
          try {
            await backendApi.updateHtRoom(booking.roomId, { status: 'MAINTENANCE' }, accessToken);
            setRooms((prev) => prev.map((r) => r.id === booking.roomId ? { ...r, status: 'MAINTENANCE' } : r));
          } catch {
            Alert.alert('Erro', 'Operação falhou.');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [accessToken]);

  // ── Acção na reserva ────────────────────────────────────────────────────────
  const handleBookingAction = useCallback(async (booking, action) => {
    if (!businessId || !accessToken) return;
    try {
      // Regra: check-in requer CONFIRMED
      if (action === 'checkin') {
        const st = booking.status;
        if (st === 'PENDING' || st === 'pending') {
          Alert.alert(
            '⚠️ Reserva não confirmada',
            'Não é possível fazer check-in numa reserva pendente.\nConfirme primeiro a reserva.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Confirmar Reserva', onPress: () => handleBookingAction(booking, 'confirm') },
            ]
          );
          return;
        }
      }
      // Regra: checkout requer folio encerrado (saldo zero)
      if (action === 'checkout') {
        let balance = 0;
        try {
          const folio = await backendApi.getHtFolio(booking.id, accessToken);
          balance = folio?.summary?.balance ?? 0;
        } catch { /* se API falhar, deixar continuar */ }
        if (balance > 0) {
          Alert.alert(
            '⚠️ Folio não encerrado',
            `Existe um saldo em dívida de ${balance.toLocaleString('pt-PT')} Kz.\nEncerre o folio antes do check-out.`,
            [{ text: 'OK', style: 'cancel' }]
          );
          return;
        }
      }
      if (action === 'confirm')  await backendApi.confirmBooking(booking.id, { businessId }, accessToken).catch(() => {});
      if (action === 'checkin')  await backendApi.htCheckIn(booking.id, { businessId }, accessToken).catch(() => {});
      if (action === 'checkout') await backendApi.htCheckOut(booking.id, accessToken).catch(() => {});
      if (action === 'cancel')   await backendApi.updateBooking(booking.id, { status: 'CANCELLED' }, accessToken).catch(() => {});
      setSelectedBooking(null);
      await load(true);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Operação falhou.');
    }
  }, [businessId, accessToken, load]);

  // ── Actualizar quarto localmente ─────────────────────────────────────────────
  const handleUpdateRoom = useCallback((roomId, patch) => {
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, ...patch } : r));
  }, []);

  // ── Agrupar quartos por piso ─────────────────────────────────────────────────
  const roomsByFloor = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      const key = r.floor != null ? r.floor : 0;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
  }, [rooms]);

  // ── Lista plana para FlatList ────────────────────────────────────────────────
  const flatItems = useMemo(() => {
    const items = [];
    roomsByFloor.forEach(([floor, floorRooms]) => {
      items.push({ type: 'floor', floor, key: `floor_${floor}` });
      floorRooms.forEach((r) => items.push({ type: 'room', room: r, key: r.id }));
    });
    return items;
  }, [roomsByFloor]);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'floor') {
      return (
        <View style={gS.floorHeader}>
          <View style={gS.roomLabel}>
            <Text style={gS.floorLabel}>Piso {item.floor}</Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>
      );
    }
    const { room } = item;
    const roomBookings = roomBookingMap[room.id] || [];
    const conflict = conflictRooms.has(room.id);
    return (
      <GanttRoomRow
        room={room}
        dates={dates}
        bookings={roomBookings}
        onCellPress={handleCellPress}
        onBarPress={handleBarPress}
        onRoomPress={setSelectedRoom}
        hasConflict={conflict}
        onScroll={syncAllScroll}
        scrollRef={(ref) => { rowScrollRefs.current[room.id] = ref; }}
      />
    );
  }, [roomBookingMap, conflictRooms, dates, handleCellPress, handleBarPress]);

  const totalDateWidth = dates.length * DATE_COL_WIDTH;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={gS.root}>

        {/* ── Header ── */}
        <View style={gS.topHeader}>
          <TouchableOpacity style={gS.iconBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={gS.headerTitle}>Mapa de Reservas</Text>
          </View>
          <TouchableOpacity style={gS.iconBtn} onPress={() => load(true)}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Controlos de janela ── */}
        <View style={gS.controls}>
          <TouchableOpacity style={gS.navBtn} onPress={() => shiftWindow(-windowDays)}>
            <Icon name="back" size={16} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={gS.todayBtn} onPress={scrollToToday}>
            <Text style={gS.todayBtnText}>Hoje</Text>
          </TouchableOpacity>
          <TouchableOpacity style={gS.navBtn} onPress={() => shiftWindow(windowDays)}>
            <Icon name="chevronRight" size={16} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={gS.windowPicker}>
            {[7, 14, 30].map((d) => (
              <TouchableOpacity
                key={d}
                style={[gS.windowBtn, windowDays === d && gS.windowBtnActive]}
                onPress={() => setWindowDays(d)}
              >
                <Text style={[gS.windowBtnText, windowDays === d && gS.windowBtnTextActive]}>
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Botão legenda */}
          <TouchableOpacity
            style={[gS.navBtn, showLegend && { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }]}
            onPress={() => setShowLegend((v) => !v)}
          >
            <Text style={{ fontSize: 14, color: showLegend ? '#1565C0' : '#374151' }}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        {/* Painel de legenda */}
        <LegendPanel visible={showLegend} />

        {loading ? (
          <View style={gS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={gS.loadingText}>A carregar mapa...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* ── Cabeçalho de datas (fixo) ── */}
            <GanttHeader dates={dates} scrollRef={headerScrollRef} onScroll={syncAllScroll} />

            {/* ── Linhas de quartos (scroll vertical + horizontal sincronizado) ── */}
            <FlatList
              ref={mainScrollRef}
              data={flatItems}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.blue} />
              }
              onScrollBeginDrag={() => {}}
              showsVerticalScrollIndicator
              style={{ flex: 1 }}
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
              // Scroll horizontal via contentor (não nativo)
              horizontal={false}
              // Sincronizar scrolls horizontais para as linhas de quarto
              // é feito pelos ScrollView internos com scrollEnabled=false
            />

            {/* ── Rodapé de ocupação (fixo) ── */}
            <GanttFooter
              dates={dates}
              rooms={rooms}
              bookings={bookings}
              overbookingBuffer={overbookingBuffer}
              scrollRef={footerScrollRef}
              onScroll={syncAllScroll}
            />
          </View>
        )}

        {/* ── Canvas horizontal centralizado com ScrollView maestro ── */}
      </SafeAreaView>

      {/* ── Detalhe de reserva ── */}
      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          rooms={rooms}
          onClose={() => setSelectedBooking(null)}
          onAction={handleBookingAction}
          onUpdateRooms={handleUpdateRoom}
        />
      )}

      {/* ── Detalhe do quarto ── */}
      {selectedRoom && (
        <RoomDetailSheet
          room={selectedRoom}
          accessToken={accessToken}
          onClose={() => setSelectedRoom(null)}
          onUpdateRoom={handleUpdateRoom}
        />
      )}
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const gS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F7F6F2' },

  // Top header
  topHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
                  backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },

  // Controls
  controls:     { flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8,
                  backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  navBtn:       { width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, backgroundColor: '#F3F4F6' },
  todayBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  todayBtnText: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  windowPicker: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  windowBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                  backgroundColor: '#F3F4F6' },
  windowBtnActive:     { backgroundColor: '#1565C0' },
  windowBtnText:       { fontSize: 12, fontWeight: '600', color: '#374151' },
  windowBtnTextActive: { color: '#fff' },

  // Canvas header
  headerRow:    { flexDirection: 'row', backgroundColor: '#F9FAFB',
                  borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  cornerCell:   { width: ROOM_COL_WIDTH, paddingHorizontal: 6, paddingVertical: 8,
                  justifyContent: 'center', alignItems: 'center',
                  borderRightWidth: 1, borderRightColor: '#E5E7EB', flexShrink: 0 },
  cornerText:   { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },

  dateCell:     { paddingVertical: 6, alignItems: 'center', justifyContent: 'center',
                  borderRightWidth: 1, borderRightColor: '#F0F0EE' },
  dateCellWeekend: { backgroundColor: '#FAFAF8' },
  dateCellToday:   { backgroundColor: '#EFF6FF', borderBottomWidth: 2, borderBottomColor: '#1565C0' },
  dateWeekday:  { fontSize: 9, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },
  dateDay:      { fontSize: 13, fontWeight: '700', color: '#111' },
  dateTodayText:{ color: '#1565C0' },

  // Room rows
  roomRow:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0EE',
                  backgroundColor: '#fff' },
  roomLabel:    { width: ROOM_COL_WIDTH, flexDirection: 'column', alignItems: 'flex-start',
                  justifyContent: 'center', paddingHorizontal: 6,
                  borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  roomNumber:   { fontSize: 13, fontWeight: '700', color: '#111' },
  roomHkIcon:   { fontSize: 10 },
  roomType:     { fontSize: 9, color: '#9CA3AF', marginTop: 1, fontWeight: '500' },

  floorHeader:  { flexDirection: 'row', backgroundColor: '#F9FAFB',
                  borderBottomWidth: 1, borderBottomColor: '#E5E7EB', height: 26 },
  floorLabel:   { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Cells
  cell:         { borderRightWidth: 1, borderRightColor: '#F5F5F3' },
  cellWeekend:  { backgroundColor: '#FAFAF8' },
  cellToday:    { backgroundColor: '#EFF6FF' },

  // Bars — zIndex elevado para receber toques por cima das células
  bar:          {
    position: 'absolute',
    height: BAR_HEIGHT,
    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
    elevation: 2,
  },
  barText:      { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Footer
  footerRow:    { flexDirection: 'row', backgroundColor: '#F9FAFB',
                  borderTopWidth: 1, borderTopColor: '#E5E7EB',
                  paddingBottom: Platform.OS === 'ios' ? 8 : 4 },
  footerCorner: { width: ROOM_COL_WIDTH, alignItems: 'center', justifyContent: 'center',
                  borderRightWidth: 1, borderRightColor: '#E5E7EB', paddingVertical: 8 },
  footerCornerText: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  footerCell:   { paddingVertical: 6, alignItems: 'center', justifyContent: 'center',
                  borderRightWidth: 1, borderRightColor: '#F0F0EE', height: 44 },
  footerRate:   { fontSize: 12, fontWeight: '800' },
  footerSub:    { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Legend panel
  legendPanel:  { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  legendSection:{ },
  legendTitle:  { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase',
                  letterSpacing: 0.5, marginBottom: 4 },
  legendRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendLabel:  { fontSize: 11, color: '#374151', fontWeight: '500' },

  // Loading / empty
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { marginTop: 10, color: '#888', fontSize: 13 },

  // Bottom sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  paddingBottom: 34, overflow: 'hidden' },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
                  alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', padding: 20,
                  borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle:   { flex: 1, fontSize: 17, fontWeight: '700', color: '#111' },
  sheetClose:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
                  borderRadius: 16, backgroundColor: '#F3F4F6' },
  sheetMeta:    { fontSize: 14, color: '#374151', lineHeight: 22 },
  statusPill:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 8 },
  statusPillText:{ fontSize: 12, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8,
                  paddingHorizontal: 20, paddingTop: 16 },
  actionBtn:    { flex: 1, minWidth: 100, paddingVertical: 12, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center' },
  actionBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});
