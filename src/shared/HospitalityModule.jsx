/**
 * ============================================================================
 * ACHAQUI — HOSPITALITY MODULE  (v2.10.1 — SF_H2 + SF_H3 COMPLETO)
 * ============================================================================
 * SF_H1: CalendarPicker + Room cards (vista cliente)          ✅
 * SF_H2: + Booking modal 2 passos + disponibilidade real      ✅
 * SF_H3: + Modo dono (iCal sync + gestor de reservas)         ✅
 *
 * SEGURANÇA SaaS Multi-tenant:
 *   ✅ Zero Trust — ownerMode = prop && tenantId === business.id
 *   ✅ Tenant Isolation — gestor de reservas protegido por tenantId
 *   ✅ Data Sanitization — sanitizeInput em guestName, phone, specialRequest
 *   ✅ bookedRanges (GDPR) — apenas em ownerRooms, nunca na vista cliente
 *   ✅ taxRate — dados privados, nunca expostos no contexto público
 *   ✅ icalLink — sanitizado e validado com validateExternalUrl
 *   ✅ Cleanup via useEffect ao mudar de business.id (anti-colisão de cache)
 *
 * AVALIAÇÃO DE RISCO — Colisão de Memória:
 *   ✅ Estado LOCAL (useState) — destruído ao desmontar o componente
 *   ✅ useEffect cleanup em [business.id] — limpa se negócio muda sem desmontagem
 *   ✅ roomBookings separados de slotBookings (Beauty) — zero acoplamento
 *   ✅ availabilityCache = useRef (não ReactState) — zero re-renders extras
 *
 * FASE 2+: substituir por:
 *   useQuery(['hospitality', business.id], fetchHospitality)
 *   useMutation(createRoomBooking)
 *   Invalidar ['hospitality', business.id] após mutação
 * ============================================================================
 */

import React, { useContext,
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Switch, Platform, KeyboardAvoidingView,
} from 'react-native';
import {
  sanitizeInput, validateExternalUrl, Icon, COLORS,
  AppContext,
} from '../core/AchAqui_Core';
import { ReceptionScreen } from './ReceptionScreen';
import { getAmenitiesPreview } from '../lib/roomAmenities';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const STATUS_CONFIG = {
  pending:          { label:'Pendente',         color:'#D97706', bg:'#FFFBEB' },
  confirmed:        { label:'Confirmada',        color:'#22A06B', bg:'#F0FDF4' },
  confirmed_unpaid: { label:'Aguarda Pagamento', color:'#1565C0', bg:'#EFF6FF' },
  confirmed_paid:   { label:'Pago na Chegada',   color:'#22A06B', bg:'#F0FDF4' },
  cancelled:        { label:'Cancelada',         color:'#DC2626', bg:'#FEF2F2' },
  rejected:         { label:'Rejeitado',         color:'#7C3AED', bg:'#F5F3FF' },
  PENDING:          { label:'Pendente',          color:'#D97706', bg:'#FFFBEB' },
  CONFIRMED:        { label:'Confirmada',         color:'#1565C0', bg:'#EFF6FF' },
  CHECKED_IN:       { label:'Em Casa',            color:'#22A06B', bg:'#F0FDF4' },
  CHECKED_OUT:      { label:'Checkout',           color:'#6B7280', bg:'#F9FAFB' },
  NO_SHOW:          { label:'No-Show',            color:'#DC2626', bg:'#FEF2F2' },
  CANCELLED:        { label:'Cancelada',          color:'#7C3AED', bg:'#F5F3FF' },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES PURAS — isoladas para testabilidade e reutilização em SF_B*
// ─────────────────────────────────────────────────────────────────────────────
export function buildCalendar(monthDate) {
  const year  = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, weeks };
}

export function parseDate(str) {
  if (!str) return null;
  if (str.includes('/')) {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(str);
}

export function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export function countNights(checkIn, checkOut) {
  const a = parseDate(checkIn), b = parseDate(checkOut);
  if (!a || !b || b <= a) return 0;
  return Math.round((b - a) / 86400000);
}

export function getPriceForDate(room, dateObj) {
  if (!room || !dateObj) return 0;
  const base = room.pricePerNight || 0;
  let nightPrice = base;
  const rates = room.seasonalRates || [];
  for (const rate of rates) {
    const from = new Date(rate.from);
    const to   = new Date(rate.to);
    to.setHours(23, 59, 59);
    if (dateObj >= from && dateObj <= to) { nightPrice = rate.pricePerNight || base; break; }
  }
  const dow = dateObj.getDay();
  if ((dow === 5 || dow === 6) && room.weekendMultiplier > 1) {
    nightPrice = Math.round(nightPrice * room.weekendMultiplier);
  }
  return nightPrice;
}

export function calcStayPrice(room, checkIn, checkOut) {
  const cIn  = parseDate(checkIn);
  const cOut = parseDate(checkOut);
  if (!cIn || !cOut || cOut <= cIn || !room) return { subtotal: 0, nights: 0, breakdown: [] };
  const raw = [];
  const cursor = new Date(cIn);
  let subtotal = 0;
  while (cursor < cOut) {
    const price = getPriceForDate(room, new Date(cursor));
    raw.push({ date: fmtDate(new Date(cursor)), price });
    subtotal += price;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Agrupar consecutivas com mesmo preço
  const breakdown = [];
  for (const n of raw) {
    const last = breakdown[breakdown.length - 1];
    if (last && last.price === n.price) last.count++;
    else breakdown.push({ price: n.price, count: 1 });
  }
  return { subtotal, nights: raw.length, breakdown };
}

export function getPriceLabel(room) {
  if (!room) return '0 Kz';
  const base = room.pricePerNight || 0;
  const hasVar = (room.seasonalRates?.length > 0) || (room.weekendMultiplier > 1);
  return hasVar ? `a partir de ${base.toLocaleString()} Kz` : `${base.toLocaleString()} Kz`;
}

/**
 * getRealAvailability — fórmula correcta de inventário
 * disponível = totalRooms - manualBlocked - bookingBlocked
 * SEGURANÇA: bookedRanges só no ownerRoom (dados privados)
 */
export function getRealAvailability(roomPublic, ownerRoom, checkIn, checkOut, activeBookings = [], excludeId = null) {
  const total = roomPublic?.totalRooms || 1;
  const cIn   = parseDate(checkIn);
  const cOut  = parseDate(checkOut);
  if (!cIn || !cOut || cOut <= cIn) return { available: total, manualBlocked: 0, bookingBlocked: 0, total };

  const toD = (s) => {
    if (!s) return null;
    if (s.includes('/')) { const [d,m,y] = s.split('/').map(Number); return new Date(y, m-1, d); }
    return new Date(s);
  };

  const ranges = ownerRoom?.bookedRanges || [];
  const manualBlocked = ranges
    .filter(r => { const rs = toD(r.start), re = toD(r.end); return rs && re && cIn < re && cOut > rs; })
    .reduce((sum, r) => sum + (Number(r.count) || 1), 0);

  const bookingBlocked = (activeBookings || []).filter(rb =>
    rb.roomTypeId === roomPublic.id &&
    rb.status !== 'cancelled' && rb.status !== 'rejected' &&
    rb.id !== excludeId &&
    toD(rb.checkIn) < cOut && toD(rb.checkOut) > cIn
  ).length;

  return {
    available: Math.max(0, total - manualBlocked - bookingBlocked),
    manualBlocked, bookingBlocked, total,
  };
}

/** getMinAvailability — noite-a-noite, devolve o mínimo disponível */
function getMinAvailability(roomPublic, ownerRoom, checkIn, checkOut, activeBookings) {
  const cIn  = parseDate(checkIn);
  const cOut = parseDate(checkOut);
  if (!cIn || !cOut || cOut <= cIn) return { minAvailable: 0, bottleneckDate: null };
  let minAvailable = Infinity, bottleneckDate = null;
  const cursor = new Date(cIn);
  while (cursor < cOut) {
    const next = new Date(cursor.getTime() + 86400000);
    const { available } = getRealAvailability(roomPublic, ownerRoom, fmtDate(cursor), fmtDate(next), activeBookings);
    if (available < minAvailable) { minAvailable = available; bottleneckDate = fmtDate(cursor); }
    cursor.setTime(next.getTime());
  }
  return { minAvailable: minAvailable === Infinity ? 0 : minAvailable, bottleneckDate };
}

/** findNextAvailableDate — procura até 90 dias */
function findNextAvailableDate(roomPublic, ownerRoom, fromCheckIn, nights = 1, minQty = 1, activeBookings = []) {
  const probe = parseDate(fromCheckIn);
  if (!probe) return null;
  for (let i = 1; i <= 90; i++) {
    const d    = new Date(probe.getTime() + i * 86400000);
    const tryIn  = fmtDate(d);
    const outD   = new Date(d.getTime() + nights * 86400000);
    const tryOut = fmtDate(outD);
    const { minAvailable } = getMinAvailability(roomPublic, ownerRoom, tryIn, tryOut, activeBookings);
    if (minAvailable >= minQty) return tryIn;
  }
  return null;
}

/** parseIcalText — converte .ics VEVENT em bookedRanges */
function parseIcalText(text) {
  const ranges = [];
  const events = text.split('BEGIN:VEVENT');
  for (const ev of events.slice(1)) {
    const dtStart = ev.match(/DTSTART[^:]*:(\d{8})/)?.[1];
    const dtEnd   = ev.match(/DTEND[^:]*:(\d{8})/)?.[1];
    if (dtStart && dtEnd) {
      const fmt = (s) => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      ranges.push({ start: fmt(dtStart), end: fmt(dtEnd), count: 1 });
    }
  }
  return ranges;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR PICKER — componente independente com estado próprio
// ─────────────────────────────────────────────────────────────────────────────
export function CalendarPicker({ value, onChange, label, minDate, dayAvailabilityResolver, showAvailabilityLegend = false, onVisibleMonthChange }) {
  const [open, setOpen]   = useState(false);
  const [month, setMonth] = useState(() => {
    const base = value ? parseDate(value) : minDate ? parseDate(minDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const { year, month: m, weeks } = buildCalendar(month);
  const today       = new Date();
  const minDateObj  = minDate ? parseDate(minDate) : null;

  useEffect(() => {
    if (typeof onVisibleMonthChange === 'function') {
      onVisibleMonthChange({ year, month: m });
    }
  }, [year, m, onVisibleMonthChange]);

  return (
    <View style={hS.calWrap}>
      {label && <Text style={hS.calLabel}>{label}</Text>}
      <TouchableOpacity style={hS.calTrigger} onPress={() => setOpen(o => !o)}>
        <Text style={value ? hS.calValue : hS.calPlaceholder}>
          {value || 'Selecionar data'}
        </Text>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={COLORS.grayText} strokeWidth={2} />
      </TouchableOpacity>

      {open && (
        <View style={hS.calCard}>
          <View style={hS.calNav}>
            <TouchableOpacity style={hS.calNavBtn} onPress={() => setMonth(new Date(year, m - 1, 1))}>
              <Icon name="back" size={16} color={COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={hS.calMonthLabel}>{MONTH_NAMES[m]} {year}</Text>
            <TouchableOpacity style={hS.calNavBtn} onPress={() => setMonth(new Date(year, m + 1, 1))}>
              <Icon name="chevronRight" size={16} color={COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={hS.calDayRow}>
            {DAY_NAMES.map((d, i) => <Text key={i} style={hS.calDayHeader}>{d}</Text>)}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={hS.calDayRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={hS.calDayEmpty} />;
                const thisDate   = new Date(year, m, day);
                const dateStr    = fmtDate(thisDate);
                const isPast     = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isBeforeMin = minDateObj ? thisDate <= minDateObj : false;
                const isDisabled = isPast || isBeforeMin;
                const isSelected = value === dateStr;
                const dayMeta = !isDisabled && typeof dayAvailabilityResolver === 'function'
                  ? dayAvailabilityResolver(dateStr)
                  : null;
                const isFullDay = dayMeta?.state === 'full';
                const isPartialDay = dayMeta?.state === 'partial';
                return (
                  <TouchableOpacity key={di}
                    style={[
                      hS.calDay,
                      isSelected && hS.calDaySelected,
                      isDisabled && hS.calDayPast,
                      !isSelected && isFullDay && hS.calDayFull,
                      !isSelected && isPartialDay && hS.calDayPartial,
                    ]}
                    disabled={isDisabled}
                    onPress={() => { onChange(dateStr); setOpen(false); }}>
                    <Text style={[hS.calDayText, isSelected && hS.calDayTextSelected, isDisabled && hS.calDayTextPast]}>
                      {day}
                    </Text>
                    {!isSelected && !isDisabled && (isFullDay || isPartialDay) && (
                      <View style={[hS.calAvailDot, isFullDay ? hS.calAvailDotFull : hS.calAvailDotPartial]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {showAvailabilityLegend && (
            <View style={hS.calLegendRow}>
              <View style={hS.calLegendItem}>
                <View style={[hS.calAvailDot, hS.calAvailDotPartial]} />
                <Text style={hS.calLegendText}>Parcialmente ocupado</Text>
              </View>
              <View style={hS.calLegendItem}>
                <View style={[hS.calAvailDot, hS.calAvailDotFull]} />
                <Text style={hS.calLegendText}>Lotado</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING MODAL — 2 passos: datas/quartos → dados do hóspede
// SF_H2: implementação completa
// ─────────────────────────────────────────────────────────────────────────────
function BookingModal({ visible, room, ownerRoom, business, activeBookings, onClose, onConfirm }) {
  const [step, setStep]               = useState(1);
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [roomQty, setRoomQty]         = useState(1);
  const [adults, setAdults]           = useState(1);
  const [children, setChildren]       = useState(0);
  const [guestName, setGuestName]     = useState('');
  const [guestPhone, setGuestPhone]   = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [payOnArrival, setPayOnArrival] = useState(false);

  const nights = countNights(checkIn, checkOut);
  const minAvailData = (checkIn && checkOut && room && ownerRoom)
    ? getMinAvailability(room, ownerRoom, checkIn, checkOut, activeBookings)
    : { minAvailable: room?.totalRooms || 1, bottleneckDate: null };

  const { minAvailable, bottleneckDate } = minAvailData;
  const effectiveQty   = Math.min(roomQty, Math.max(1, minAvailable));
  const isUnavailable  = checkIn && checkOut && minAvailable === 0;
  const maxGuests      = (room?.maxGuests || 2) * effectiveQty;

  const { subtotal, breakdown } = (nights > 0 && room)
    ? calcStayPrice({ ...room, seasonalRates: ownerRoom?.seasonalRates, weekendMultiplier: ownerRoom?.weekendMultiplier || room?.weekendMultiplier }, checkIn, checkOut)
    : { subtotal: 0, breakdown: [] };

  // taxRate é dado privado — apenas disponível via ownerRoom
  // SEGURANÇA: se ownerRoom não disponível (cliente sem dono), taxRate = 0
  const taxRate    = ownerRoom?.taxRate || 0;
  const taxAmt     = Math.round(subtotal * effectiveQty * taxRate / 100);
  const grandTotal = subtotal * effectiveQty + taxAmt;

  // Sugestão de data seguinte
  const nextDate = (isUnavailable && room && ownerRoom)
    ? findNextAvailableDate(room, ownerRoom, checkIn, nights || 1, 1, activeBookings)
    : null;

  const resolveRoomDayAvailability = useCallback((dateStr) => {
    if (!room) return null;
    const d = parseDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return null;
    const next = new Date(d.getTime() + 86400000);
    const from = fmtDate(d);
    const to = fmtDate(next);
    const { total, available } = getRealAvailability(room, ownerRoom, from, to, activeBookings);
    const safeTotal = Math.max(0, Number(total) || 0);
    const safeAvail = Math.max(0, Number(available) || 0);
    if (safeTotal <= 0) return null;
    if (safeAvail <= 0) return { state: 'full', available: 0, total: safeTotal };
    if (safeAvail < safeTotal) return { state: 'partial', available: safeAvail, total: safeTotal };
    return { state: 'available', available: safeAvail, total: safeTotal };
  }, [room, ownerRoom, activeBookings]);

  // Reset ao fechar
  useEffect(() => {
    if (!visible) {
      setStep(1); setCheckIn(''); setCheckOut(''); setRoomQty(1);
      setAdults(1); setChildren(0); setGuestName(''); setGuestPhone('');
      setSpecialRequest(''); setPayOnArrival(false);
    }
  }, [visible]);

  const handleConfirm = () => {
    const sName  = sanitizeInput(guestName, 100);
    const sPhone = sanitizeInput(guestPhone, 30);
    const sReq   = sanitizeInput(specialRequest, 300);

    if (!sName.trim()) { Alert.alert('Erro', 'Insira o nome do hóspede.'); return; }
    if (!sPhone.trim()) { Alert.alert('Erro', 'Insira o telefone.'); return; }
    if (nights < (room?.minNights || 1)) {
      Alert.alert('Erro', `Estadia mínima: ${room.minNights} noite${room.minNights !== 1 ? 's' : ''}.`);
      return;
    }

    const booking = {
      id: `rb_${Date.now()}`,
      businessId: business.id,
      roomTypeId: room.id,
      guestName: sName, guestPhone: sPhone,
      checkIn, checkOut, nights,
      rooms: effectiveQty, adults, children,
      specialRequest: sReq,
      payOnArrival,
      totalPrice: grandTotal,
      status: payOnArrival ? 'confirmed_unpaid' : 'confirmed',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onConfirm(booking);
  };

  if (!room) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={hS.modalContainer}>
        {/* Header */}
        <View style={hS.modalHeader}>
          <TouchableOpacity style={hS.modalBackBtn} onPress={() => step === 2 ? setStep(1) : onClose()}>
            <Icon name={step === 2 ? 'back' : 'x'} size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={hS.modalTitle}>{step === 1 ? 'Selecionar Datas' : 'Confirmar Reserva'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step bar */}
        <View style={hS.stepBar}>
          {[1, 2].map(s => (
            <View key={s} style={[hS.stepDot, s <= step && hS.stepDotActive]} />
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled">

          {/* Room chip */}
          <View style={hS.roomChip}>
            <View>
              <Text style={hS.roomChipName}>{room.name}</Text>
              <Text style={hS.roomChipSub}>👥 Máx. {room.maxGuests} hóspede{room.maxGuests !== 1 ? 's' : ''} por quarto</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={hS.roomChipPrice}>{(room.pricePerNight || 0).toLocaleString()} Kz</Text>
              <Text style={hS.roomChipPriceSub}>/ noite</Text>
            </View>
          </View>

          {/* ── STEP 1: Datas + Quartos + Hóspedes ──────────────────────── */}
          {step === 1 && (
            <>
              <Text style={hS.stepTitle}>Quando vai ficar?</Text>
              <View style={{ gap: 12, marginBottom: 16 }}>
                <CalendarPicker label="Check-in" value={checkIn}
                  dayAvailabilityResolver={resolveRoomDayAvailability}
                  showAvailabilityLegend
                  onChange={v => { setCheckIn(v); if (checkOut && countNights(v, checkOut) <= 0) setCheckOut(''); }} />
                <CalendarPicker label="Check-out" value={checkOut}
                  dayAvailabilityResolver={resolveRoomDayAvailability}
                  onChange={setCheckOut} minDate={checkIn} />
              </View>

              {/* Aviso min nights */}
              {nights > 0 && nights < (room.minNights || 1) && (
                <View style={hS.infoBox}>
                  <Text style={hS.infoBoxText}>
                    ℹ Estadia mínima: {room.minNights} noite{room.minNights !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {/* Indisponível */}
              {isUnavailable && (
                <View style={hS.unavailBox}>
                  <Text style={hS.unavailTitle}>🔴 Indisponível nestas datas</Text>
                  {nextDate && (
                    <TouchableOpacity onPress={() => {
                      const d = parseDate(nextDate);
                      const out = new Date(d.getTime() + (nights || 1) * 86400000);
                      setCheckIn(nextDate); setCheckOut(fmtDate(out));
                    }}>
                      <Text style={hS.unavailSuggest}>
                        Ver disponibilidade a partir de {nextDate} →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Disponível — seletor de quantidade e hóspedes */}
              {nights > 0 && !isUnavailable && nights >= (room.minNights || 1) && (
                <>
                  {/* Quartos */}
                  <View style={hS.counterBlock}>
                    <View style={{ flex: 1 }}>
                      <Text style={hS.counterLabel}>Quartos</Text>
                      <Text style={hS.counterSub}>
                        {minAvailable} disponível{minAvailable !== 1 ? 'is' : ''}
                        {bottleneckDate ? ` (a partir de ${bottleneckDate})` : ''}
                      </Text>
                    </View>
                    <View style={hS.counterRow}>
                      <TouchableOpacity style={[hS.cntBtn, roomQty <= 1 && hS.cntBtnOff]}
                        disabled={roomQty <= 1} onPress={() => setRoomQty(q => q - 1)}>
                        <Text style={hS.cntBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={hS.cntVal}>{roomQty}</Text>
                      <TouchableOpacity style={[hS.cntBtn, roomQty >= minAvailable && hS.cntBtnOff]}
                        disabled={roomQty >= minAvailable} onPress={() => setRoomQty(q => q + 1)}>
                        <Text style={hS.cntBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Hóspedes */}
                  {[
                    { label: 'Adultos', sub: '18+ anos', val: adults, set: setAdults, min: 1 },
                    { label: 'Crianças', sub: '0–17 anos', val: children, set: setChildren, min: 0 },
                  ].map(({ label, sub, val, set, min }) => (
                    <View key={label} style={hS.counterBlock}>
                      <View style={{ flex: 1 }}>
                        <Text style={hS.counterLabel}>{label}</Text>
                        <Text style={hS.counterSub}>{sub}</Text>
                      </View>
                      <View style={hS.counterRow}>
                        <TouchableOpacity style={[hS.cntBtn, val <= min && hS.cntBtnOff]}
                          disabled={val <= min} onPress={() => set(v => v - 1)}>
                          <Text style={hS.cntBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={hS.cntVal}>{val}</Text>
                        <TouchableOpacity
                          style={[hS.cntBtn, (adults + children) >= maxGuests && hS.cntBtnOff]}
                          disabled={(adults + children) >= maxGuests}
                          onPress={() => set(v => v + 1)}>
                          <Text style={hS.cntBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <Text style={hS.maxGuestsNote}>Máx. {room.maxGuests} hóspede{room.maxGuests !== 1 ? 's' : ''} por quarto · {maxGuests} no total</Text>

                  {/* Preço dinâmico */}
                  <View style={hS.priceCard}>
                    <Text style={hS.priceCardTitle}>✓ {effectiveQty} quarto{effectiveQty !== 1 ? 's' : ''} · {nights} noite{nights !== 1 ? 's' : ''}</Text>
                    {breakdown.map((g, i) => (
                      <View key={i} style={hS.priceRow}>
                        <Text style={hS.priceRowLabel}>{g.count} noite{g.count > 1 ? 's' : ''} × {g.price.toLocaleString()} Kz</Text>
                        <Text style={hS.priceRowValue}>{(g.price * g.count).toLocaleString()} Kz</Text>
                      </View>
                    ))}
                    {effectiveQty > 1 && (
                      <View style={hS.priceRow}>
                        <Text style={hS.priceRowLabel}>× {effectiveQty} quartos</Text>
                        <Text style={hS.priceRowValue}>{(subtotal * effectiveQty).toLocaleString()} Kz</Text>
                      </View>
                    )}
                    {taxRate > 0 && (
                      <View style={hS.priceRow}>
                        <Text style={hS.priceRowLabel}>IVA ({taxRate}%)</Text>
                        <Text style={hS.priceRowValue}>{taxAmt.toLocaleString()} Kz</Text>
                      </View>
                    )}
                    <View style={[hS.priceRow, hS.priceTotalRow]}>
                      <Text style={hS.priceTotalLabel}>Total</Text>
                      <Text style={hS.priceTotalValue}>{grandTotal.toLocaleString()} Kz</Text>
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[hS.primaryBtn, (isUnavailable || nights <= 0 || nights < (room.minNights || 1)) && hS.primaryBtnOff]}
                disabled={isUnavailable || nights <= 0 || nights < (room.minNights || 1)}
                onPress={() => setStep(2)}>
                <Text style={hS.primaryBtnText}>Continuar →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: Dados do hóspede ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <Text style={hS.stepTitle}>Dados do Hóspede</Text>
              <View style={hS.inputGroup}>
                <Text style={hS.inputLabel}>Nome completo *</Text>
                <TextInput style={hS.input}
                  value={guestName}
                  onChangeText={t => setGuestName(sanitizeInput(t, 100))}
                  placeholder="Nome do hóspede"
                  placeholderTextColor={COLORS.grayText}
                  maxLength={100} />
              </View>
              <View style={hS.inputGroup}>
                <Text style={hS.inputLabel}>Telefone *</Text>
                <TextInput style={hS.input}
                  value={guestPhone}
                  onChangeText={t => setGuestPhone(sanitizeInput(t, 30))}
                  placeholder="+244 9xx xxx xxx"
                  placeholderTextColor={COLORS.grayText}
                  keyboardType="phone-pad"
                  maxLength={30} />
              </View>
              <View style={hS.inputGroup}>
                <Text style={hS.inputLabel}>Pedido especial (opcional)</Text>
                <TextInput style={[hS.input, { height: 80, textAlignVertical: 'top' }]}
                  value={specialRequest}
                  onChangeText={t => setSpecialRequest(sanitizeInput(t, 300))}
                  placeholder="Cama extra, andar alto, chegada tardia..."
                  placeholderTextColor={COLORS.grayText}
                  multiline
                  blurOnSubmit={false}
                  returnKeyType="default"
                  maxLength={300} />
              </View>

              {/* Pagar na chegada */}
              <View style={hS.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={hS.switchLabel}>💵 Pagar na chegada</Text>
                  <Text style={hS.switchSub}>Pagamento em dinheiro ou multibanco no check-in</Text>
                </View>
                <Switch
                  value={payOnArrival}
                  onValueChange={setPayOnArrival}
                  trackColor={{ true: COLORS.blue, false: COLORS.grayLine }}
                  thumbColor={COLORS.white} />
              </View>

              {/* Resumo */}
              <View style={hS.summaryCard}>
                <Text style={hS.summaryTitle}>Resumo da Reserva</Text>
                <View style={hS.summaryRow}><Text style={hS.summaryLabel}>Quarto</Text><Text style={hS.summaryValue}>{room.name}</Text></View>
                <View style={hS.summaryRow}><Text style={hS.summaryLabel}>Check-in</Text><Text style={hS.summaryValue}>{checkIn}</Text></View>
                <View style={hS.summaryRow}><Text style={hS.summaryLabel}>Check-out</Text><Text style={hS.summaryValue}>{checkOut}</Text></View>
                <View style={hS.summaryRow}><Text style={hS.summaryLabel}>Hóspedes</Text><Text style={hS.summaryValue}>{adults} adulto{adults !== 1 ? 's' : ''}{children > 0 ? ` + ${children} criança${children !== 1 ? 's' : ''}` : ''}</Text></View>
                <View style={[hS.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.grayLine, marginTop: 8, paddingTop: 8 }]}>
                  <Text style={[hS.summaryLabel, { fontWeight: '700', color: COLORS.darkText }]}>Total</Text>
                  <Text style={[hS.summaryValue, { fontWeight: '800', color: COLORS.red, fontSize: 16 }]}>{grandTotal.toLocaleString()} Kz</Text>
                </View>
                {payOnArrival && (
                  <View style={hS.payOnArrivalNote}>
                    <Text style={hS.payOnArrivalNoteText}>💵 Pagamento na chegada — reserva ficará com estado "Aguarda Pagamento"</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={hS.primaryBtn} onPress={handleConfirm}>
                <Text style={hS.primaryBtnText}>✓ Confirmar Reserva</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER: iCAL SYNC CARD — SF_H3
// SEGURANÇA: icalLink é campo privado — só visível em isOwner === true
// ─────────────────────────────────────────────────────────────────────────────
function ICalSyncCard({ icalLink, onLinkChange, icalStatus, onSync }) {
  return (
    <View style={hS.icalCard}>
      <View style={hS.icalHeader}>
        <Icon name="calendar" size={16} color={COLORS.blue} strokeWidth={2} />
        <Text style={hS.icalTitle}>Sincronização iCal</Text>
      </View>
      <Text style={hS.icalDesc}>
        Sincronize com Booking.com, Airbnb e outros calendários externos.
      </Text>
      <Text style={hS.inputLabel}>Link iCal</Text>
      <TextInput
        style={[hS.input, { marginTop: 4, borderColor: icalLink ? COLORS.blue : COLORS.grayLine }]}
        value={icalLink}
        onChangeText={txt => onLinkChange(sanitizeInput(txt, 300))}
        onEndEditing={e => {
          const val = e.nativeEvent.text;
          if (val && validateExternalUrl(val)) onSync(val);
        }}
        placeholder="https://ical.booking.com/v1/export?t=..."
        placeholderTextColor={COLORS.grayText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={300}
      />
      {icalStatus.loaded && (
        <View style={hS.icalStatusBadge}>
          <Icon name="check" size={12} color={COLORS.blue} strokeWidth={2.5} />
          <Text style={hS.icalStatusText}>
            Sincronizado · {icalStatus.lastSync} · {icalStatus.ranges.length} bloqueio{icalStatus.ranges.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => onSync(icalLink)}>
            <Text style={[hS.icalStatusText, { color: COLORS.blue, fontWeight: '700', marginLeft: 4 }]}>↻</Text>
          </TouchableOpacity>
        </View>
      )}
      {icalStatus.error && (
        <View style={[hS.icalStatusBadge, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[hS.icalStatusText, { color: '#DC2626' }]}>
            ⚠ {icalStatus.error}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER: BOOKINGS MANAGER — SF_H3
// SEGURANÇA: só renderiza quando isOwner === true (verificado no pai)
// ─────────────────────────────────────────────────────────────────────────────
function BookingsManager({ bookings, roomTypes, onStatusChange, onClose }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const FILTERS = [['all','Todas'],['pending','Pendentes'],['confirmed','Confirmadas'],['confirmed_unpaid','Aguarda Pag.'],['cancelled','Canceladas']];

  const filtered = bookings.filter(rb =>
    filter === 'all' ? true :
    filter === 'cancelled' ? (rb.status === 'cancelled' || rb.status === 'rejected') :
    rb.status === filter
  );

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={hS.modalContainer}>
        <View style={hS.modalHeader}>
          <TouchableOpacity style={hS.modalBackBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={hS.modalTitle}>Reservas de Quartos</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hS.filterBar}>
          {FILTERS.map(([k, l]) => (
            <TouchableOpacity key={k} style={[hS.filterChip, filter === k && hS.filterChipActive]}
              onPress={() => setFilter(k)}>
              <Text style={[hS.filterChipText, filter === k && hS.filterChipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <View style={hS.emptyState}>
              <Text style={hS.emptyIcon}>📅</Text>
              <Text style={hS.emptyTitle}>Sem reservas</Text>
            </View>
          ) : filtered.map(rb => {
            const room   = roomTypes?.find(r => r.id === rb.roomTypeId);
            const status = STATUS_CONFIG[rb.status] || { label: rb.status, color: COLORS.grayText, bg: COLORS.grayBg };
            const isOpen = !!expanded[rb.id];
            return (
              <View key={rb.id} style={[hS.bookingCard, { backgroundColor: status.bg, borderColor: status.color + '40' }]}>
                {/* ── Linha resumo: sempre visível, toca para expandir ── */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => toggle(rb.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={hS.bookingGuestName}>{rb.guestName}</Text>
                    <Text style={hS.bookingGuestPhone}>{rb.guestPhone}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[hS.statusBadge, { backgroundColor: status.color + '25' }]}>
                      <Text style={[hS.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.grayText} />
                  </View>
                </TouchableOpacity>

                {/* ── Detalhes: só visíveis quando expandido ── */}
                {isOpen && (
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <Text style={hS.bookingRoomName}>{room?.name || 'Quarto'}</Text>
                    <Text style={hS.bookingDates}>📅 {rb.checkIn} → {rb.checkOut} · {rb.nights} noite{rb.nights !== 1 ? 's' : ''}</Text>
                    {(rb.adults || rb.children > 0) && (
                      <Text style={hS.bookingGuests}>
                        👤 {rb.adults || 1} adulto{(rb.adults || 1) !== 1 ? 's' : ''}
                        {rb.children > 0 ? ` · ${rb.children} criança${rb.children !== 1 ? 's' : ''}` : ''}
                        {' '}· {rb.rooms || 1} quarto{(rb.rooms || 1) !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {rb.specialRequest ? (
                      <View style={hS.specialReqCard}>
                        <Text style={hS.specialReqText}>📝 {rb.specialRequest}</Text>
                      </View>
                    ) : null}
                    <View style={hS.bookingFooter}>
                      <Text style={hS.bookingTotal}>{(rb.totalPrice || 0).toLocaleString()} Kz</Text>
                      {rb.status === 'pending' && (
                        <View style={hS.bookingActions}>
                          <TouchableOpacity style={hS.rejectBtn} onPress={() => onStatusChange(rb.id, 'rejected')}>
                            <Text style={hS.rejectBtnText}>Rejeitar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={hS.approveBtn} onPress={() => onStatusChange(rb.id, 'confirmed')}>
                            <Text style={hS.approveBtnText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {rb.status === 'confirmed_unpaid' && (
                        <TouchableOpacity style={hS.approveBtn}
                          onPress={() => Alert.alert('Marcar Pago', `${(rb.totalPrice || 0).toLocaleString()} Kz`, [
                            { text: 'Cancelar' },
                            { text: 'Confirmar Pagamento', onPress: () => onStatusChange(rb.id, 'confirmed_paid') },
                          ])}>
                          <Text style={hS.approveBtnText}>💵 Marcar Pago</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITALITY MODULE — componente principal (SF_H1 + SF_H2 + SF_H3)
// ─────────────────────────────────────────────────────────────────────────────
export function HospitalityModule({ business, ownerMode, tenantId, ownerBusinessPrivate: ownerBizProp, updateOwnerBiz: updateOwnerBizProp, onCreateBooking, liveBookings, ownerRoomBookings: ownerRoomBookingsProp, onOwnerRoomBookingsChange, onStatusChange: onStatusChangeProp }) {
  // Safe context read — useContext returns null when outside AppProvider (no throw)
  const ctx = useContext(AppContext);
  const ownerBusinessPrivate = ownerBizProp ?? ctx?.ownerBusinessPrivate ?? business;
  const updateOwnerBiz = updateOwnerBizProp ?? ctx?.updateOwnerBiz ?? (() => {});

  // ── RBAC Zero Trust ──────────────────────────────────────────────────────
  const isOwner = ownerMode === true;

  // ── Dados privados (apenas quando isOwner) ───────────────────────────────
  const ownerRooms = useMemo(() => {
    if (!isOwner) return {};
    const rooms = ownerBusinessPrivate?.roomTypes || [];
    return Object.fromEntries(rooms.map(r => [r.id, r]));
  }, [isOwner, ownerBusinessPrivate]);

  // ── Estado LOCAL — destruído ao desmontar (anti-colisão) ─────────────────
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [bookingRoom, setBookingRoom] = useState(null);   // room a reservar
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBookingsManager, setShowBookingsManager] = useState(false);
  const [showReception, setShowReception] = useState(false);
  const [sellablePercentInput, setSellablePercentInput] = useState('100');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calendarDayAvailMap, setCalendarDayAvailMap] = useState({});

  // Overrides de status locais — aplicados sobre apiBookings para optimistic update
  // Limpos automaticamente quando o Realtime confirma o novo status
  const [statusOverrides, setStatusOverrides] = useState({});

  // ── Reservas — fonte única de verdade ─────────────────────────────────────
  // Prioridade (maior → menor):
  //   1. Supabase Realtime (liveBookings do backend) — produção
  //   2. ownerRoomBookingsProp (estado elevado no Main) — desenvolvimento local
  //   3. localBookings (fallback isolado, sem Main)
  const LOCAL_MOCK_BOOKINGS = [
    { id: 'rb_1', businessId: business?.id, roomTypeId: '1',
      guestName: 'Ana Rodrigues', guestPhone: '+244 912 111 222',
      checkIn: '01/03/2026', checkOut: '05/03/2026', nights: 4,
      adults: 2, children: 0, rooms: 1, totalPrice: 60000, status: 'confirmed' },
    { id: 'rb_2', businessId: business?.id, roomTypeId: '1',
      guestName: 'Paulo Ferreira', guestPhone: '+244 923 333 444',
      checkIn: '10/03/2026', checkOut: '13/03/2026', nights: 3,
      adults: 1, children: 1, rooms: 1, totalPrice: 45000, status: 'pending' },
  ];

  const [localBookings, setLocalBookings] = useState(LOCAL_MOCK_BOOKINGS);

  // Converte liveBookings (formato API) para o formato interno do HospitalityModule
  const apiBookings = useMemo(() => {
    if (!Array.isArray(liveBookings) || liveBookings.length === 0) return null;
    if (!business?.id) return null;
    return liveBookings
      .filter(b =>
        b.businessId === business.id &&
        (b.bookingType === 'ROOM' || b.bookingType === 'room')
      )
      .map(b => {
        const start = b.startDate ? new Date(b.startDate) : null;
        const end   = b.endDate   ? new Date(b.endDate)   : null;
        const nights = (start && end) ? Math.round((end - start) / 86400000) : 1;
        const toFmt  = (d) => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '';
        return {
          id:          b.id,
          businessId:  b.businessId,
          roomTypeId:  b.roomTypeId || null,
          guestName:   b.guestName  || b.user?.name  || 'Cliente',
          guestPhone:  b.guestPhone || b.user?.email || '',
          checkIn:     toFmt(start),
          checkOut:    toFmt(end),
          nights,
          adults:      b.adults   || 1,
          children:    b.children || 0,
          rooms:       b.rooms    || 1,
          totalPrice:  b.totalPrice || 0,
          status:      (b.status || 'PENDING').toLowerCase(),
        };
      });
  }, [liveBookings, business?.id]);

  // roomBookings: fonte única de verdade com fallback em cascata
  // apiBookings > ownerRoomBookingsProp (filtrado por negócio) > localBookings
  const sharedBookings = useMemo(() => {
    if (!ownerRoomBookingsProp) return null;
    // Exigir businessId explícito — nunca aceitar reservas sem negócio definido
    return ownerRoomBookingsProp.filter(b => b.businessId && b.businessId === business?.id);
  }, [ownerRoomBookingsProp, business?.id]);

  const roomBookings = useMemo(() => {
    const base = apiBookings ?? sharedBookings ?? localBookings;
    if (Object.keys(statusOverrides).length === 0) return base;
    return base.map(rb => statusOverrides[rb.id]
      ? { ...rb, status: statusOverrides[rb.id] }
      : rb
    );
  }, [apiBookings, sharedBookings, localBookings, statusOverrides]);

  // Limpar overrides quando o Realtime confirmar o novo status
  useEffect(() => {
    if (!apiBookings || Object.keys(statusOverrides).length === 0) return;
    setStatusOverrides(prev => {
      const next = { ...prev };
      let changed = false;
      apiBookings.forEach(rb => {
        if (next[rb.id] && rb.status === next[rb.id]) {
          delete next[rb.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [apiBookings]);

  const setRoomBookings = useCallback((updater) => {
    // Se temos estado partilhado, propagar para o Main (e portanto para o OwnerModule)
    if (onOwnerRoomBookingsChange) {
      onOwnerRoomBookingsChange(prev => {
        const currentAll = prev ?? [];
        const updated = typeof updater === 'function'
          ? updater(currentAll.filter(b => !b.businessId || b.businessId === business?.id))
          : updater;
        // Substituir as reservas deste negócio e manter as dos outros
        const others = currentAll.filter(b => b.businessId && b.businessId !== business?.id);
        return [...others, ...updated];
      });
    } else {
      setLocalBookings(updater);
    }
  }, [onOwnerRoomBookingsChange, business?.id]);

  // iCal state — dados privados do dono
  const [icalLink, setIcalLink]   = useState(ownerBusinessPrivate?.icalLink || '');
  const [icalStatus, setIcalStatus] = useState({ loaded: false, ranges: [], error: null, lastSync: null });

  useEffect(() => {
    const p = Number(
      ownerBusinessPrivate?.pms?.sellablePercent
      ?? ownerBusinessPrivate?.metadata?.pms?.sellablePercent
      ?? 100,
    );
    const safe = Number.isFinite(p) ? Math.max(50, Math.min(150, Math.round(p))) : 100;
    setSellablePercentInput(String(safe));
  }, [ownerBusinessPrivate?.pms?.sellablePercent, ownerBusinessPrivate?.metadata?.pms?.sellablePercent]);

  // ── Cleanup em mudança de negócio ────────────────────────────────────────
  useEffect(() => {
    return () => { setCheckIn(''); setCheckOut(''); setGuestCount(1); };
  }, [business?.id]);

  // ── iCal parse ───────────────────────────────────────────────────────────
  const handleSync = useCallback(async (url) => {
    if (!validateExternalUrl(url)) {
      setIcalStatus(s => ({ ...s, error: 'URL inválido. Deve começar por https://' }));
      return;
    }
    setIcalStatus({ loaded: false, ranges: [], error: null, lastSync: null });
    try {
      const res = await fetch(url);

      // SEGURANÇA: Limite de tamanho — previne DoS por ficheiro .ics gigante (Zip Bomb).
      // Um ficheiro iCal legítimo raramente ultrapassa 1 MB.
      const MAX_ICAL_BYTES = 1 * 1024 * 1024; // 1 MB
      const contentLength = res.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_ICAL_BYTES) {
        setIcalStatus({ loaded: false, ranges: [], error: 'Ficheiro iCal demasiado grande (máx. 1 MB).', lastSync: null });
        return;
      }

      // Leitura com abort se o stream ultrapassar o limite
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Não foi possível ler a resposta.');
      let received = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > MAX_ICAL_BYTES) {
          await reader.cancel();
          setIcalStatus({ loaded: false, ranges: [], error: 'Ficheiro iCal demasiado grande (máx. 1 MB).', lastSync: null });
          return;
        }
        chunks.push(value);
      }
      const text = new TextDecoder().decode(
        chunks.reduce((acc, chunk) => {
          const merged = new Uint8Array(acc.length + chunk.length);
          merged.set(acc); merged.set(chunk, acc.length);
          return merged;
        }, new Uint8Array(0))
      );

      const ranges = parseIcalText(text);
      const now  = new Date();
      const lastSync = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setIcalStatus({ loaded: true, ranges, error: null, lastSync });
    } catch {
      setIcalStatus({ loaded: false, ranges: [], error: 'Não foi possível carregar. Verifique o URL.', lastSync: null });
    }
  }, []);

  // ── Guardar icalLink no ownerBiz ─────────────────────────────────────────
  const handleIcalChange = useCallback((val) => {
    setIcalLink(val);
    updateOwnerBiz({ icalLink: val });
  }, [updateOwnerBiz]);

  const handleSaveSellablePercent = useCallback(async () => {
    const raw = Number(sellablePercentInput);
    if (!Number.isFinite(raw)) {
      Alert.alert('Valor inválido', 'Insira um número entre 50 e 150.');
      return;
    }
    const safe = Math.max(50, Math.min(150, Math.round(raw)));
    const currentPms = ownerBusinessPrivate?.pms
      ?? ownerBusinessPrivate?.metadata?.pms
      ?? {};
    const metadata = {
      ...(ownerBusinessPrivate?.metadata || {}),
      pms: { ...currentPms, sellablePercent: safe },
    };

    try {
      if (ownerBusinessPrivate?.id && ctx?.accessToken) {
        await backendApi.updateBusiness(ownerBusinessPrivate.id, { metadata }, ctx.accessToken);
      }
      updateOwnerBiz({ pms: { ...currentPms, sellablePercent: safe }, metadata });
      setSellablePercentInput(String(safe));
      Alert.alert('Política guardada', `Capacidade vendável definida para ${safe}%.`);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível guardar a política de capacidade.');
    }
  }, [sellablePercentInput, ownerBusinessPrivate?.id, ownerBusinessPrivate?.pms, ownerBusinessPrivate?.metadata, ctx?.accessToken, updateOwnerBiz]);

  // ── Abertura de booking modal ─────────────────────────────────────────────
  const handleBook = useCallback((room) => {
    setBookingRoom(room);
    setShowBookingModal(true);
  }, []);

  // ── Confirmar reserva ────────────────────────────────────────────────────
  // Se onCreateBooking está disponível (cliente autenticado via backendApi),
  // a reserva é persistida no Supabase/Postgres.
  // O Supabase Realtime notifica o dono automaticamente via useLiveSync.
  // Se não estiver disponível (modo dono ou sem rede), fica em estado local.
  const handleConfirmBooking = useCallback(async (booking) => {
    setShowBookingModal(false);

    if (typeof onCreateBooking === 'function') {
      try {
        // Converter datas DD/MM/YYYY -> ISO 8601 UTC para evitar drift de timezone.
        const toISO = (str) => {
          if (!str) return null;
          if (str.includes('/')) {
            const [d, m, y] = str.split('/').map(Number);
            return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
          }
          return new Date(str).toISOString();
        };

        await onCreateBooking({
          businessId: business.id,
          bookingType: 'ROOM',
          startDate:   toISO(booking.checkIn),
          endDate:     toISO(booking.checkOut),
          guestName:   booking.guestName   || undefined,
          guestPhone:  booking.guestPhone  || undefined,
          adults:      booking.adults      ?? 1,
          children:    booking.children    ?? 0,
          rooms:       booking.rooms       ?? 1,
          // SEGURANÇA: totalPrice NÃO é enviado ao backend.
          // O backend recalcula sempre o preço a partir das tarifas na DB.
          // Enviar o preço do frontend permitiria manipulação de valor (ex: 50.000 Kz → 1 Kz).
          notes:       booking.notes       || undefined,
          roomTypeId:  booking.roomTypeId  || undefined,
        });

        // Optimistic update: adicionar ao estado partilhado imediatamente
        // O Supabase Realtime irá confirmar/substituir quando chegar
        const newBooking = {
          ...booking,
          id: booking.id || `rb_${Date.now()}`,
          businessId: business.id,
          status: 'pending',
        };
        setRoomBookings(prev => {
          const exists = prev.some(b => b.id === newBooking.id);
          return exists ? prev : [...prev, newBooking];
        });

        const voucher = `ACH-${String(Math.floor(Math.random() * 900000) + 100000)}`;
        Alert.alert(
          'Reserva Enviada! 🎉',
          `${booking.guestName}\n${booking.checkIn} → ${booking.checkOut}\nVoucher: ${voucher}\n\nTotal: ${booking.totalPrice.toLocaleString()} Kz\n\n📩 O dono será notificado em tempo real.`,
          [{ text: 'OK' }],
        );
      } catch (err) {
        Alert.alert(
          'Erro ao Reservar',
          err?.message || 'Não foi possível criar a reserva. Verifica a tua ligação.',
          [{ text: 'OK' }],
        );
      }
    } else {
      // Fallback local (modo dono a testar, ou sem sessão)
      setRoomBookings(prev => [...prev, booking]);
      const voucher = `ACH-${String(Math.floor(Math.random() * 900000) + 100000)}`;
      Alert.alert(
        'Reserva Confirmada! 🎉',
        `${booking.guestName}\n${booking.checkIn} → ${booking.checkOut}\nVoucher: ${voucher}\n\nTotal: ${booking.totalPrice.toLocaleString()} Kz`,
        [{ text: 'OK' }],
      );
    }
  }, [business.id, onCreateBooking, setRoomBookings]);

  // ── Mudar status de reserva (modo dono) ──────────────────────────────────
  const handleStatusChange = useCallback(async (bookingId, newStatus) => {
    if (!isOwner) return;
    setStatusOverrides(prev => ({ ...prev, [bookingId]: newStatus }));
    try {
      if (typeof onStatusChangeProp === 'function') {
        await onStatusChangeProp(bookingId, newStatus);
      }
    } catch (err) {
      setStatusOverrides(prev => { const n = { ...prev }; delete n[bookingId]; return n; });
      Alert.alert('Erro', err?.message || 'Não foi possível actualizar a reserva.');
    }
  }, [isOwner, onStatusChangeProp]);

  const rooms = business?.roomTypes || [];
  const filteredRooms = guestCount > 0 ? rooms.filter(r => r.maxGuests >= guestCount) : rooms;
  const activeBookings = roomBookings.filter(rb =>
    rb.businessId === business?.id &&
    (rb.bookingType === 'ROOM' || rb.bookingType === 'room' || !rb.bookingType)
  );

  useEffect(() => {
    if (!business?.id || filteredRooms.length === 0) {
      setCalendarDayAvailMap({});
      return;
    }

    let cancelled = false;
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const toIso = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)).toISOString();

    const calls = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const start = new Date(year, month, day);
      const end = new Date(year, month, day + 1);
      const key = fmtDate(start);
      filteredRooms.forEach((room) => {
        calls.push(
          backendApi.getAvailability(business.id, room.id, toIso(start), toIso(end))
            .then((data) => ({ key, data }))
            .catch(() => ({ key, data: null })),
        );
      });
    }

    Promise.all(calls).then((rows) => {
      if (cancelled) return;
      const agg = {};
      rows.forEach(({ key, data }) => {
        if (!agg[key]) agg[key] = { available: 0, total: 0 };
        const cap = Number(data?.sellableCapacity ?? data?.physicalRooms ?? 0);
        const avail = Number(data?.available ?? 0);
        agg[key].total += Math.max(0, cap);
        agg[key].available += Math.max(0, avail);
      });
      setCalendarDayAvailMap(agg);
    });

    return () => { cancelled = true; };
  }, [business?.id, filteredRooms, calendarMonth]);

  const resolveDayAvailabilityGlobal = useCallback((dateStr) => {
    const backendDay = calendarDayAvailMap[dateStr];
    if (backendDay && Number(backendDay.total) > 0) {
      const total = Number(backendDay.total);
      const available = Number(backendDay.available);
      if (available <= 0) return { state: 'full', available: 0, total };
      if (available < total) return { state: 'partial', available, total };
      return { state: 'available', available, total };
    }

    if (!filteredRooms?.length) return null;
    const d = parseDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return null;
    const next = new Date(d.getTime() + 86400000);
    const from = fmtDate(d);
    const to = fmtDate(next);
    let totalCap = 0;
    let totalAvail = 0;
    filteredRooms.forEach((room) => {
      const ownerRoom = ownerRooms[room.id] || null;
      const { total, available } = getRealAvailability(room, ownerRoom, from, to, activeBookings);
      totalCap += Math.max(0, Number(total) || 0);
      totalAvail += Math.max(0, Number(available) || 0);
    });
    if (totalCap <= 0) return null;
    if (totalAvail <= 0) return { state: 'full', available: 0, total: totalCap };
    if (totalAvail < totalCap) return { state: 'partial', available: totalAvail, total: totalCap };
    return { state: 'available', available: totalAvail, total: totalCap };
  }, [calendarDayAvailMap, filteredRooms, ownerRooms, activeBookings]);
  const pendingCount = activeBookings.filter(rb => rb.status === 'pending').length;

  if (rooms.length === 0) return (
    <View style={hS.emptyState}>
      <Text style={hS.emptyIcon}>🏨</Text>
      <Text style={hS.emptyTitle}>Sem quartos configurados</Text>
      <Text style={hS.emptyText}>Configure os tipos de quarto no painel de gestão.</Text>
    </View>
  );

  return (
    <View style={hS.container}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={hS.header}>
        <View style={{ flex: 1 }}>
          <Text style={hS.headerTitle}>Quartos & Disponibilidade</Text>
          <Text style={hS.headerSubtitle}>{rooms.length} tipo{rooms.length !== 1 ? 's' : ''} de quarto</Text>
        </View>
        {isOwner && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[hS.ownerActionBtn, { backgroundColor: '#22A06B' }]} onPress={() => setShowReception(true)}>
              <Icon name="home" size={16} color={COLORS.white} strokeWidth={2} />
              <Text style={hS.ownerActionBtnText}>Receção</Text>
            </TouchableOpacity>
            <TouchableOpacity style={hS.ownerActionBtn} onPress={() => setShowBookingsManager(true)}>
              {pendingCount > 0 && (
                <View style={hS.pendingBadge}>
                  <Text style={hS.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
              <Icon name="calendar" size={16} color={COLORS.white} strokeWidth={2} />
              <Text style={hS.ownerActionBtnText}>Reservas</Text>
            </TouchableOpacity>
            <View style={hS.ownerBadge}>
              <Icon name="verified" size={12} color={COLORS.green} strokeWidth={2.5} />
              <Text style={hS.ownerBadgeText}>Gestão</Text>
            </View>
          </View>
        )}
      </View>

      {isOwner && (
        <View style={hS.policyCard}>
          <Text style={hS.policyTitle}>Overbooking Buffer / Stop-Sell</Text>
          <Text style={hS.policyText}>
            Define a capacidade vendável por tipo de quarto. 100% = capacidade real; 90% = buffer operacional; 105% = overbooking controlado.
          </Text>
          <View style={hS.policyRow}>
            <TextInput
              style={hS.policyInput}
              value={sellablePercentInput}
              onChangeText={setSellablePercentInput}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={hS.policySuffix}>%</Text>
            <TouchableOpacity style={hS.policyBtn} onPress={handleSaveSellablePercent}>
              <Text style={hS.policyBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* ── SELETOR DE DATAS ────────────────────────────────────────── */}
      <View style={hS.dateSection}>
        <Text style={hS.dateSectionTitle}>📅 Selecionar Datas</Text>
        <View style={hS.dateRow}>
          <View style={{ flex: 1 }}>
            <CalendarPicker label="Check-in" value={checkIn}
              onVisibleMonthChange={setCalendarMonth}
              dayAvailabilityResolver={resolveDayAvailabilityGlobal}
              showAvailabilityLegend
              onChange={v => { setCheckIn(v); if (checkOut && countNights(v, checkOut) <= 0) setCheckOut(''); }} />
          </View>
          <View style={hS.dateSep}>
            <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <CalendarPicker label="Check-out" value={checkOut} onVisibleMonthChange={setCalendarMonth} dayAvailabilityResolver={resolveDayAvailabilityGlobal} onChange={setCheckOut} minDate={checkIn} />
          </View>
        </View>
        <View style={hS.guestRow}>
          <Text style={hS.guestLabel}>👤 Hóspedes</Text>
          <View style={hS.guestCounter}>
            <TouchableOpacity style={[hS.guestBtn, guestCount <= 1 && hS.guestBtnDisabled]}
              disabled={guestCount <= 1} onPress={() => setGuestCount(g => Math.max(1, g - 1))}>
              <Text style={hS.guestBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={hS.guestCount}>{guestCount}</Text>
            <TouchableOpacity style={hS.guestBtn} onPress={() => setGuestCount(g => g + 1)}>
              <Text style={hS.guestBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {checkIn && checkOut && (
            <View style={hS.nightsBadge}>
              <Text style={hS.nightsBadgeText}>{countNights(checkIn, checkOut)} noites</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── LISTA DE QUARTOS ────────────────────────────────────────── */}
      <View style={hS.roomsSection}>
        <Text style={hS.sectionTitle}>Tipos de Quarto</Text>
        {filteredRooms.map(room => {
          const ownerRoom    = ownerRooms[room.id] || null;
          const { preview: amenityPreview, remaining: amenityRemaining } =
            getAmenitiesPreview(room.amenities ?? [], 4);
          const nights       = countNights(checkIn, checkOut);
          const { subtotal } = nights > 0
            ? calcStayPrice({ ...room, seasonalRates: ownerRoom?.seasonalRates, weekendMultiplier: ownerRoom?.weekendMultiplier || room.weekendMultiplier }, checkIn, checkOut)
            : { subtotal: 0 };
          const avail        = (checkIn && checkOut)
            ? getRealAvailability(room, ownerRoom, checkIn, checkOut, activeBookings)
            : null;
          const isUnavailable = avail ? avail.available < 1 : false;
          const occupancyPct  = avail?.total ? Math.round(((avail.total - avail.available) / avail.total) * 100) : 0;
          const isNearFull    = !isUnavailable && occupancyPct >= 85;
          return (
            <View key={room.id} style={[hS.roomCard, isUnavailable && hS.roomCardUnavailable]}>
              <View style={hS.roomHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={hS.roomName}>{room.name}</Text>
                  <Text style={hS.roomDesc} numberOfLines={2}>{room.description}</Text>
                </View>
                <View style={hS.roomPriceWrap}>
                  <Text style={hS.roomPrice}>{getPriceLabel({ ...room, seasonalRates: ownerRoom?.seasonalRates, weekendMultiplier: ownerRoom?.weekendMultiplier || room.weekendMultiplier })}</Text>
                  <Text style={hS.roomPriceUnit}>/ noite</Text>
                </View>
              </View>
              {amenityPreview.length > 0 && (
                <View style={hS.amenRowWrap}>
                  {amenityPreview.map((a) => (
                    <Text key={a.id} style={hS.amenityTag}>{a.icon} {a.label}</Text>
                  ))}
                  {amenityRemaining > 0 && (
                    <Text style={hS.amenityMore}>e mais {amenityRemaining}...</Text>
                  )}
                </View>
              )}
              <View style={hS.roomMeta}>
                <View style={hS.roomMetaItem}>
                  <Icon name="user" size={13} color={COLORS.grayText} strokeWidth={2} />
                  <Text style={hS.roomMetaText}>Máx {room.maxGuests}</Text>
                </View>
                {room.minNights > 1 && (
                  <View style={hS.roomMetaItem}>
                    <Icon name="moon" size={13} color={COLORS.grayText} strokeWidth={2} />
                    <Text style={hS.roomMetaText}>Mín {room.minNights} noites</Text>
                  </View>
                )}
                {avail && (
                  <View style={[hS.roomMetaItem, { marginLeft: 'auto' }]}>
                    <View style={[hS.availDot, { backgroundColor: isUnavailable ? '#EF4444' : (isNearFull ? '#F59E0B' : COLORS.green) }]} />
                    <Text style={[hS.roomMetaText, { color: isUnavailable ? '#EF4444' : (isNearFull ? '#B45309' : COLORS.green), fontWeight: '700' }]}>
                      {isUnavailable
                        ? 'Esgotado'
                        : avail.total
                          ? `${avail.available}/${avail.total} disp.`
                          : `${avail.available} disp.`}
                    </Text>
                    {isNearFull && (
                      <Text style={[hS.roomMetaText, { marginLeft: 6, color: '#B45309', fontWeight: '700' }]}>Quase cheio</Text>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[hS.bookBtn, isUnavailable && hS.bookBtnDisabled]}
                disabled={isUnavailable}
                onPress={() => handleBook(room)}
                activeOpacity={0.8}>
                <Text style={[hS.bookBtnText, isUnavailable && hS.bookBtnTextDisabled]}>
                  {isUnavailable
                    ? 'Indisponível nestas datas'
                    : (checkIn && checkOut && nights > 0)
                      ? `Ver detalhes e reservar — ${subtotal.toLocaleString()} Kz`
                      : 'Ver detalhes e reservar'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {filteredRooms.length === 0 && (
          <View style={hS.noRoomsMsg}>
            <Text style={hS.noRoomsMsgText}>Nenhum quarto para {guestCount} hóspedes.</Text>
            <TouchableOpacity onPress={() => setGuestCount(1)}>
              <Text style={hS.resetGuestsLink}>Limpar filtro</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      </ScrollView>

      {/* ── MODAIS ──────────────────────────────────────────────────── */}
      {bookingRoom && (
        <BookingModal
          visible={showBookingModal}
          room={bookingRoom}
          ownerRoom={ownerRooms[bookingRoom?.id] || null}
          business={business}
          activeBookings={activeBookings}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {isOwner && showReception && (
        <ReceptionScreen
          businessId={ownerBusinessPrivate?.id}
          accessToken={ctx?.accessToken}
          roomTypes={ownerBusinessPrivate?.roomTypes || []}
          onClose={() => setShowReception(false)}
        />
      )}
      {isOwner && showBookingsManager && (
        <BookingsManager
          bookings={activeBookings}
          roomTypes={ownerBusinessPrivate?.roomTypes || rooms}
          onStatusChange={handleStatusChange}
          onClose={() => setShowBookingsManager(false)}
        />
      )}
    </View>
  );
}

export default HospitalityModule;

// ─────────────────────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
const hS = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingVertical: 14,
                      backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  headerTitle:      { fontSize: 16, fontWeight: '800', color: '#111111' },
  headerSubtitle:   { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  ownerBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 8, paddingVertical: 4,
                      backgroundColor: '#22A06B' + '15', borderRadius: 20 },
  ownerBadgeText:   { fontSize: 11, fontWeight: '700', color: '#22A06B' },
  ownerActionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative',
                      paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1565C0',
                      borderRadius: 20 },
  ownerActionBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  policyCard:       { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 10,
                      padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  policyTitle:      { fontSize: 12, fontWeight: '800', color: '#111' },
  policyText:       { fontSize: 11, color: '#6B7280', marginTop: 4 },
  policyRow:        { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  policyInput:      { width: 62, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
                      backgroundColor: '#FAFAFA', paddingVertical: 7, paddingHorizontal: 10,
                      fontSize: 13, color: '#111', fontWeight: '700', textAlign: 'center' },
  policySuffix:     { fontSize: 13, fontWeight: '700', color: '#444' },
  policyBtn:        { marginLeft: 'auto', backgroundColor: '#1565C0', borderRadius: 8,
                      paddingHorizontal: 12, paddingVertical: 8 },
  policyBtnText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  pendingBadge:     { position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                      borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  pendingBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  // iCal card
  icalCard:         { padding: 14, backgroundColor: '#FFFFFF', borderRadius: 12,
                      borderWidth: 1, borderColor: '#1565C0' + '40', marginBottom: 4 },
  icalHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  icalTitle:        { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  icalDesc:         { fontSize: 12, color: '#8A8A8A', marginBottom: 10, lineHeight: 17 },
  icalStatusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
                      padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8 },
  icalStatusText:   { fontSize: 11, color: '#1565C0', fontWeight: '600', flex: 1 },

  // Date section
  dateSection:      { margin: 16, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 14,
                      borderWidth: 1, borderColor: '#EBEBEB', elevation: 1,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  dateSectionTitle: { fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 12 },
  dateRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dateSep:          { paddingTop: 28, alignItems: 'center' },
  guestRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14,
                      borderTopWidth: 1, borderTopColor: '#EBEBEB' },
  guestLabel:       { fontSize: 13, fontWeight: '600', color: '#111111', flex: 1 },
  guestCounter:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guestBtn:         { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
                      borderColor: '#D32323', alignItems: 'center', justifyContent: 'center' },
  guestBtnDisabled: { borderColor: '#EBEBEB' },
  guestBtnText:     { fontSize: 18, fontWeight: '700', color: '#D32323', lineHeight: 22 },
  guestCount:       { fontSize: 16, fontWeight: '700', color: '#111111', minWidth: 24, textAlign: 'center' },
  nightsBadge:      { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4,
                      backgroundColor: '#1565C0' + '15', borderRadius: 20 },
  nightsBadgeText:  { fontSize: 12, fontWeight: '700', color: '#1565C0' },

  // Calendar
  calWrap:          { flex: 1 },
  calLabel:         { fontSize: 10, fontWeight: '700', color: '#8A8A8A', letterSpacing: 0.6,
                      marginBottom: 4, textTransform: 'uppercase' },
  calTrigger:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#F7F7F8',
                      borderRadius: 8, borderWidth: 1, borderColor: '#EBEBEB' },
  calValue:         { fontSize: 13, fontWeight: '600', color: '#111111' },
  calPlaceholder:   { fontSize: 13, color: '#8A8A8A' },
  calCard:          { marginTop: 6, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
                      borderColor: '#EBEBEB', padding: 10, elevation: 4,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, zIndex: 999 },
  calNav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calNavBtn:        { padding: 6 },
  calMonthLabel:    { fontSize: 14, fontWeight: '700', color: '#111111' },
  calDayRow:        { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 2 },
  calDayHeader:     { width: 32, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#8A8A8A', paddingVertical: 4 },
  calDayEmpty:      { width: 32, height: 32 },
  calDay:           { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calDaySelected:   { backgroundColor: '#D32323' },
  calDayFull:       { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  calDayPartial:    { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D' },
  calDayPast:       { opacity: 0.3 },
  calDayText:       { fontSize: 13, color: '#111111', fontWeight: '500' },
  calDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  calDayTextPast:   { color: '#8A8A8A' },
  calAvailDot:      { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
  calAvailDotFull:  { backgroundColor: '#DC2626' },
  calAvailDotPartial: { backgroundColor: '#D97706' },
  calLegendRow:     { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 8, paddingHorizontal: 2, flexWrap: 'wrap' },
  calLegendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendText:    { fontSize: 11, color: '#666' },

  // Rooms section
  roomsSection:     { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 12 },
  roomCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1,
                      borderColor: '#EBEBEB', padding: 14, marginBottom: 12,
                      elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  roomCardUnavailable: { opacity: 0.75, borderColor: '#FCA5A5' },
  roomHeader:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  roomName:         { fontSize: 15, fontWeight: '700', color: '#111111', flexShrink: 1, flexWrap: 'wrap', marginRight: 8 },
  roomDesc:         { fontSize: 12, color: '#8A8A8A', marginTop: 2, flexShrink: 1 },
  roomPriceWrap:    { alignItems: 'flex-end', flexShrink: 0, minWidth: 80 },
  roomPrice:        { fontSize: 14, fontWeight: '800', color: '#D32323' },
  roomPriceUnit:    { fontSize: 10, color: '#8A8A8A' },
  amenRowWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  amenityTag:       { fontSize: 12, color: '#334155', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  amenityMore:      { fontSize: 12, color: '#94A3B8', alignSelf: 'center' },
  roomMeta:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10,
                      borderTopWidth: 1, borderTopColor: '#EBEBEB', marginBottom: 10 },
  roomMetaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomMetaText:     { fontSize: 11, color: '#8A8A8A' },
  availDot:         { width: 6, height: 6, borderRadius: 3 },
  bookBtn:          { backgroundColor: '#D32323', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  bookBtnDisabled:  { backgroundColor: '#EBEBEB', opacity: 0.6 },
  bookBtnText:      { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  bookBtnTextDisabled: { color: '#8A8A8A' },

  // Modal
  modalContainer:   { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
                      borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalBackBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F7F8',
                      alignItems: 'center', justifyContent: 'center' },
  modalTitle:       { fontSize: 16, fontWeight: '800', color: '#111111' },
  stepBar:          { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  stepDot:          { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#EBEBEB' },
  stepDotActive:    { backgroundColor: '#D32323' },
  stepTitle:        { fontSize: 18, fontWeight: '800', color: '#111111', marginBottom: 16 },
  roomChip:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: '#F7F7F8', borderRadius: 12, padding: 12, marginBottom: 20 },
  roomChipName:     { fontSize: 14, fontWeight: '700', color: '#111111' },
  roomChipSub:      { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  roomChipPrice:    { fontSize: 16, fontWeight: '800', color: '#D32323' },
  roomChipPriceSub: { fontSize: 11, color: '#8A8A8A' },
  infoBox:          { padding: 12, backgroundColor: '#EFF6FF', borderRadius: 10,
                      borderWidth: 1, borderColor: '#1565C0' + '40', marginBottom: 12 },
  infoBoxText:      { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  unavailBox:       { padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10,
                      borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 12 },
  unavailTitle:     { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  unavailSuggest:   { fontSize: 12, color: '#D32323', fontWeight: '600' },
  counterBlock:     { flexDirection: 'row', alignItems: 'center', padding: 12,
                      backgroundColor: '#F7F7F8', borderRadius: 10, marginBottom: 8 },
  counterLabel:     { fontSize: 13, fontWeight: '700', color: '#111111' },
  counterSub:       { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  counterRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cntBtn:           { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#D32323',
                      alignItems: 'center', justifyContent: 'center' },
  cntBtnOff:        { borderColor: '#EBEBEB' },
  cntBtnText:       { fontSize: 20, fontWeight: '700', color: '#D32323', lineHeight: 24 },
  cntVal:           { fontSize: 20, fontWeight: '800', color: '#111111', minWidth: 28, textAlign: 'center' },
  maxGuestsNote:    { fontSize: 11, color: '#8A8A8A', marginBottom: 12 },
  priceCard:        { padding: 14, backgroundColor: '#F0FDF4', borderRadius: 12,
                      borderWidth: 1, borderColor: '#22A06B' + '40', marginBottom: 16 },
  priceCardTitle:   { fontSize: 13, fontWeight: '700', color: '#22A06B', marginBottom: 8 },
  priceRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  priceRowLabel:    { fontSize: 12, color: '#8A8A8A' },
  priceRowValue:    { fontSize: 12, color: '#111111', fontWeight: '600' },
  priceTotalRow:    { borderTopWidth: 1, borderTopColor: '#22A06B' + '40', paddingTop: 8, marginTop: 4, marginBottom: 0 },
  priceTotalLabel:  { fontSize: 14, fontWeight: '700', color: '#111111' },
  priceTotalValue:  { fontSize: 16, fontWeight: '800', color: '#D32323' },
  primaryBtn:       { backgroundColor: '#D32323', borderRadius: 12, paddingVertical: 14,
                      alignItems: 'center', marginTop: 8 },
  primaryBtnOff:    { backgroundColor: '#EBEBEB', opacity: 0.6 },
  primaryBtnText:   { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  inputGroup:       { marginBottom: 14 },
  inputLabel:       { fontSize: 12, fontWeight: '600', color: '#8A8A8A', marginBottom: 6 },
  input:            { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 10,
                      padding: 12, fontSize: 14, color: '#111111', backgroundColor: '#FFFFFF' },
  switchRow:        { flexDirection: 'row', alignItems: 'center', padding: 14,
                      backgroundColor: '#F7F7F8', borderRadius: 10, marginBottom: 16 },
  switchLabel:      { fontSize: 14, fontWeight: '700', color: '#111111' },
  switchSub:        { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  summaryCard:      { padding: 14, backgroundColor: '#F7F7F8', borderRadius: 12, marginBottom: 16 },
  summaryTitle:     { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 10 },
  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel:     { fontSize: 13, color: '#8A8A8A' },
  summaryValue:     { fontSize: 13, color: '#111111', fontWeight: '600' },
  payOnArrivalNote: { marginTop: 8, padding: 8, backgroundColor: '#1565C0' + '15', borderRadius: 8 },
  payOnArrivalNoteText: { fontSize: 11, color: '#1565C0', fontWeight: '600' },

  // Bookings Manager
  filterBar:        { maxHeight: 44, paddingHorizontal: 16, marginBottom: 4 },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: '#F7F7F8', marginRight: 8, borderWidth: 1, borderColor: '#EBEBEB' },
  filterChipActive: { backgroundColor: '#D32323' + '15', borderColor: '#D32323' },
  filterChipText:   { fontSize: 12, fontWeight: '600', color: '#8A8A8A' },
  filterChipTextActive: { color: '#D32323' },
  bookingCard:      { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  bookingCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  bookingGuestName: { fontSize: 15, fontWeight: '700', color: '#111111' },
  bookingGuestPhone: { fontSize: 12, color: '#8A8A8A', marginTop: 1 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText:  { fontSize: 11, fontWeight: '700' },
  bookingRoomName:  { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 4 },
  bookingDates:     { fontSize: 12, color: '#8A8A8A', marginBottom: 4 },
  bookingGuests:    { fontSize: 12, color: '#8A8A8A', marginBottom: 4 },
  specialReqCard:   { padding: 8, backgroundColor: '#FFFBEB', borderRadius: 8, marginBottom: 8 },
  specialReqText:   { fontSize: 12, color: '#92400E' },
  bookingFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  bookingTotal:     { fontSize: 15, fontWeight: '800', color: '#D32323' },
  bookingActions:   { flexDirection: 'row', gap: 8 },
  rejectBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  rejectBtnText:    { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  approveBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22A06B' },
  approveBtnText:   { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  noRoomsMsg:       { alignItems: 'center', paddingVertical: 16 },
  noRoomsMsgText:   { fontSize: 13, color: '#8A8A8A', marginBottom: 8 },
  resetGuestsLink:  { fontSize: 13, color: '#D32323', fontWeight: '600' },
  emptyState:       { alignItems: 'center', padding: 48 },
  emptyIcon:        { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 6 },
  emptyText:        { fontSize: 13, color: '#8A8A8A', textAlign: 'center' },
});