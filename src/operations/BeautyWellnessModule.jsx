/**
 * ============================================================================
 * ACHAQUI — BEAUTY & WELLNESS MODULE  (v2.10.1 — SF_B1 + SF_B2 + SF_B3)
 * ============================================================================
 * SF_B1: Grid de serviços + selector de profissional               ✅
 * SF_B2: Grid de slots + booking modal (disponibilidade por tempo) ✅
 * SF_B3: Modo dono — Agenda do dia + gestão de marcações           ✅
 *
 * SEGURANÇA SaaS Multi-tenant:
 *   ✅ Zero Trust — isOwner = ownerMode && tenantId === business.id
 *   ✅ Tenant Isolation — agenda do dia protegida por tenantId
 *   ✅ Data Sanitization — sanitizeInput em clientName, clientPhone, notes
 *   ✅ Estado LOCAL isolado — sem partilha com HospitalityModule
 *   ✅ Cleanup em [business.id] — anti-colisão de cache ao trocar negócio
 *
 * AVALIAÇÃO DE RISCO — Colisão de Memória vs HospitalityModule:
 *   ✅ ZERO conflito — HospitalityModule usa availability_nights (datas inteiras)
 *                      BeautyModule usa availability_slots (timestamps de hora)
 *   ✅ Tipos de bookings separados: roomBookings vs slotBookings
 *   ✅ Ao sair de um hotel e entrar num salão, o BusinessEngine desmonta
 *      HospitalityModule e monta BeautyWellnessModule — estados destruídos
 *   ✅ useEffect cleanup em [business.id] para casos de re-mount sem desmount
 *
 * MOCK DATA DE SERVIÇOS:
 *   servicesList é uma propriedade pública do business object.
 *   staffList e slotConfig são tratados como dados do módulo (simulados aqui).
 *   FASE 2+: virão de GET /modules/beauty/:bizId
 *
 * FASE 2+: substituir por:
 *   useQuery(['beauty', business.id], fetchBeautyModule)
 *   useMutation(createSlotBooking)
 * ============================================================================
 */

import React, { useContext,
  useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Switch, Platform,
} from 'react-native';
import {
  sanitizeInput, Icon, COLORS, AppContext,
} from '../core/AchAqui_Core';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DO MÓDULO
// ─────────────────────────────────────────────────────────────────────────────
const DAY_NAMES_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DAY_NAMES_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_NAMES     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Horário padrão: 09:00–18:00 com intervalos de 30 min
const DEFAULT_SLOT_START  = 9;   // 09:00
const DEFAULT_SLOT_END    = 18;  // 18:00
const DEFAULT_SLOT_MINS   = 30;  // intervalo em minutos

// Status de marcação
// NOTA: hex literais em vez de COLORS.* — esta constante corre ao nível de módulo
// (import time). COLORS pode ainda não estar disponível nesse momento.
const SLOT_STATUS = {
  available:  { label: 'Disponível',  color: '#22A06B', bg: '#F0FDF4' },
  booked:     { label: 'Ocupado',     color: '#DC2626', bg: '#FEF2F2' },
  blocked:    { label: 'Bloqueado',   color: '#8A8A8A', bg: '#F7F7F8' },
  confirmed:  { label: 'Confirmado',  color: '#22A06B', bg: '#F0FDF4' },
  pending:    { label: 'Pendente',    color: '#D97706', bg: '#FFFBEB' },
  cancelled:  { label: 'Cancelado',   color: '#DC2626', bg: '#FEF2F2' },
};

// Mock staff para negócios beauty — FASE 2+: virá de /modules/beauty/:id
const DEFAULT_STAFF = [
  { id: 'staff_any', name: 'Qualquer Profissional', avatar: '👤', specialty: 'Todos os serviços' },
  { id: 'staff_1',   name: 'Ana Silva',             avatar: '💆', specialty: 'Corte & Coloração' },
  { id: 'staff_2',   name: 'Carlos Mendes',         avatar: '✂️', specialty: 'Barbeiro' },
  { id: 'staff_3',   name: 'Joana Costa',           avatar: '💅', specialty: 'Manicure & Pedicure' },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES PURAS
// ─────────────────────────────────────────────────────────────────────────────

/** Gera todos os slots de um dia com base na config */
function generateDaySlots(config = {}) {
  const startH = config.startHour ?? DEFAULT_SLOT_START;
  const endH   = config.endH     ?? DEFAULT_SLOT_END;
  const mins   = config.slotMins ?? DEFAULT_SLOT_MINS;
  const slots  = [];
  let cursor   = startH * 60;
  const end    = endH * 60;
  while (cursor + mins <= end) {
    const hh  = String(Math.floor(cursor / 60)).padStart(2, '0');
    const mm  = String(cursor % 60).padStart(2, '0');
    const endCursor = cursor + mins;
    const eh  = String(Math.floor(endCursor / 60)).padStart(2, '0');
    const em  = String(endCursor % 60).padStart(2, '0');
    slots.push({ time: `${hh}:${mm}`, timeEnd: `${eh}:${em}`, id: `slot_${hh}${mm}` });
    cursor += mins;
  }
  return slots;
}

/** Date → YYYY-MM-DD */
function fmtYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Próximos N dias a partir de hoje */
function getNextDays(n = 7) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    days.push({
      date:     fmtYMD(d),
      dayShort: DAY_NAMES_SHORT[d.getDay()],
      dayFull:  DAY_NAMES_FULL[d.getDay()],
      dayNum:   d.getDate(),
      month:    MONTH_NAMES[d.getMonth()],
      isToday:  i === 0,
      isSunday: d.getDay() === 0,
    });
  }
  return days;
}

/** Calcula duração de um serviço em minutos → string legível */
function fmtDuration(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Verifica se um slot está ocupado por alguma marcação */
function isSlotBooked(slotId, date, staffId, bookings) {
  return bookings.some(b =>
    b.slotId === slotId &&
    b.date === date &&
    (staffId === 'staff_any' || b.staffId === staffId || staffId === 'staff_any') &&
    b.status !== 'cancelled'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B1: SERVICE CARD — card de um serviço individual
// ─────────────────────────────────────────────────────────────────────────────
function ServiceCard({ service, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[bS.serviceCard, selected && bS.serviceCardSelected]}
      onPress={() => onSelect(service)}
      activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={[bS.serviceName, selected && bS.serviceNameSelected]} numberOfLines={1}>
          {service.name}
        </Text>
        {service.description ? (
          <Text style={bS.serviceDesc} numberOfLines={2}>{service.description}</Text>
        ) : null}
        {service.duration ? (
          <Text style={bS.serviceDuration}>⏱ {fmtDuration(service.duration)}</Text>
        ) : null}
      </View>
      <View style={bS.servicePriceWrap}>
        <Text style={[bS.servicePrice, selected && bS.servicePriceSelected]}>
          {(service.basePrice || 0).toLocaleString()} Kz
        </Text>
        {selected && (
          <View style={bS.serviceCheckBadge}>
            <Icon name="check" size={12} color={COLORS.white} strokeWidth={3} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B1: STAFF SELECTOR — grelha de profissionais
// ─────────────────────────────────────────────────────────────────────────────
function StaffSelector({ staff, selected, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bS.staffRow}>
      {staff.map(s => {
        const isSelected = selected?.id === s.id;
        return (
          <TouchableOpacity key={s.id}
            style={[bS.staffChip, isSelected && bS.staffChipSelected]}
            onPress={() => onSelect(s)} activeOpacity={0.8}>
            <Text style={bS.staffAvatar}>{s.avatar}</Text>
            <Text style={[bS.staffName, isSelected && bS.staffNameSelected]} numberOfLines={1}>
              {s.name}
            </Text>
            {s.specialty ? (
              <Text style={bS.staffSpecialty} numberOfLines={1}>{s.specialty}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B1: DAY SELECTOR — horizontal strip de datas
// ─────────────────────────────────────────────────────────────────────────────
function DaySelector({ days, selected, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bS.dayRow}>
      {days.map(d => {
        const isSelected = selected === d.date;
        return (
          <TouchableOpacity key={d.date}
            style={[bS.dayChip, isSelected && bS.dayChipSelected, d.isSunday && bS.dayChipSunday]}
            onPress={() => !d.isSunday && onSelect(d.date)}
            disabled={d.isSunday}
            activeOpacity={0.8}>
            <Text style={[bS.dayChipName, isSelected && bS.dayChipNameSelected, d.isSunday && bS.dayChipNameSunday]}>
              {d.dayShort}
            </Text>
            <Text style={[bS.dayChipNum, isSelected && bS.dayChipNumSelected]}>
              {d.dayNum}
            </Text>
            <Text style={[bS.dayChipMonth, isSelected && bS.dayChipMonthSelected]}>
              {d.month}
            </Text>
            {d.isToday && <View style={[bS.todayDot, isSelected && bS.todayDotSelected]} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B2: SLOT GRID — grelha de slots disponíveis
// ─────────────────────────────────────────────────────────────────────────────
function SlotGrid({ slots, selectedDate, selectedStaff, bookings, selectedSlot, onSelectSlot }) {
  const now = new Date();
  const todayStr = fmtYMD(now);
  const nowMins  = now.getHours() * 60 + now.getMinutes();

  return (
    <View style={bS.slotGrid}>
      {slots.map(slot => {
        const booked    = isSlotBooked(slot.id, selectedDate, selectedStaff?.id, bookings);
        const isPast    = selectedDate === todayStr && parseInt(slot.time) * 60 + parseInt(slot.time.slice(3)) <= nowMins;
        const isSelected = selectedSlot?.id === slot.id;
        const isDisabled = booked || isPast;

        return (
          <TouchableOpacity key={slot.id}
            style={[
              bS.slotChip,
              booked && bS.slotChipBooked,
              isPast && bS.slotChipPast,
              isSelected && bS.slotChipSelected,
            ]}
            disabled={isDisabled}
            onPress={() => onSelectSlot(isSelected ? null : slot)}
            activeOpacity={0.8}>
            <Text style={[
              bS.slotTime,
              booked && bS.slotTimeBooked,
              isPast && bS.slotTimePast,
              isSelected && bS.slotTimeSelected,
            ]}>
              {slot.time}
            </Text>
            {booked && <Text style={bS.slotStatusText}>Ocupado</Text>}
            {isPast && !booked && <Text style={bS.slotStatusText}>Passado</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B2: BOOKING MODAL — confirmação de marcação
// ─────────────────────────────────────────────────────────────────────────────
function SlotBookingModal({ visible, service, staff, slot, selectedDate, business, onClose, onConfirm }) {
  const [clientName, setClientName]   = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes]             = useState('');

  useEffect(() => {
    if (!visible) { setClientName(''); setClientPhone(''); setNotes(''); }
  }, [visible]);

  const handleConfirm = () => {
    const sName  = sanitizeInput(clientName, 100);
    const sPhone = sanitizeInput(clientPhone, 30);
    const sNotes = sanitizeInput(notes, 200);

    if (!sName.trim()) { Alert.alert('Erro', 'Insira o seu nome.'); return; }
    if (!sPhone.trim()) { Alert.alert('Erro', 'Insira o telefone.'); return; }

    onConfirm({
      id:         `sb_${Date.now()}`,
      businessId: business?.id,
      serviceId:  service?.id,
      staffId:    staff?.id,
      slotId:     slot?.id,
      date:       selectedDate,
      time:       slot?.time,
      timeEnd:    slot?.timeEnd,
      clientName: sName, clientPhone: sPhone, notes: sNotes,
      price:      service?.basePrice || 0,
      status:     'confirmed',
      createdAt:  new Date().toISOString().slice(0, 10),
    });
  };

  if (!slot || !service) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={bS.modalContainer}>
        <View style={bS.modalHeader}>
          <TouchableOpacity style={bS.modalBackBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={bS.modalTitle}>Confirmar Marcação</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {/* Resumo */}
          <View style={bS.bookingSummaryCard}>
            <Text style={bS.bookingSummaryTitle}>{service.name}</Text>
            <View style={bS.bookingSummaryRow}>
              <Text style={bS.bookingSummaryLabel}>Profissional</Text>
              <Text style={bS.bookingSummaryValue}>{staff?.id === 'staff_any' ? 'A designar' : staff?.name}</Text>
            </View>
            <View style={bS.bookingSummaryRow}>
              <Text style={bS.bookingSummaryLabel}>Data</Text>
              <Text style={bS.bookingSummaryValue}>{selectedDate}</Text>
            </View>
            <View style={bS.bookingSummaryRow}>
              <Text style={bS.bookingSummaryLabel}>Hora</Text>
              <Text style={bS.bookingSummaryValue}>{slot.time} – {slot.timeEnd}</Text>
            </View>
            {service.duration && (
              <View style={bS.bookingSummaryRow}>
                <Text style={bS.bookingSummaryLabel}>Duração</Text>
                <Text style={bS.bookingSummaryValue}>{fmtDuration(service.duration)}</Text>
              </View>
            )}
            <View style={[bS.bookingSummaryRow, { borderTopWidth: 1, borderTopColor: COLORS.grayLine, marginTop: 8, paddingTop: 8 }]}>
              <Text style={[bS.bookingSummaryLabel, { fontWeight: '700', color: COLORS.darkText }]}>Preço</Text>
              <Text style={[bS.bookingSummaryValue, { fontWeight: '800', color: COLORS.red, fontSize: 16 }]}>
                {(service.basePrice || 0).toLocaleString()} Kz
              </Text>
            </View>
          </View>

          {/* Dados do cliente */}
          <Text style={bS.stepTitle}>Os seus dados</Text>
          <View style={bS.inputGroup}>
            <Text style={bS.inputLabel}>Nome *</Text>
            <TextInput style={bS.input}
              value={clientName}
              onChangeText={t => setClientName(sanitizeInput(t, 100))}
              placeholder="O seu nome" placeholderTextColor={COLORS.grayText} maxLength={100} />
          </View>
          <View style={bS.inputGroup}>
            <Text style={bS.inputLabel}>Telefone *</Text>
            <TextInput style={bS.input}
              value={clientPhone}
              onChangeText={t => setClientPhone(sanitizeInput(t, 30))}
              placeholder="+244 9xx xxx xxx" placeholderTextColor={COLORS.grayText}
              keyboardType="phone-pad" maxLength={30} />
          </View>
          <View style={bS.inputGroup}>
            <Text style={bS.inputLabel}>Observações (opcional)</Text>
            <TextInput style={[bS.input, { height: 72, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={t => setNotes(sanitizeInput(t, 200))}
              placeholder="Preferências, pedidos especiais..." placeholderTextColor={COLORS.grayText}
              multiline maxLength={200} />
          </View>

          <TouchableOpacity style={bS.primaryBtn} onPress={handleConfirm}>
            <Text style={bS.primaryBtnText}>✓ Confirmar Marcação</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SF_B3: OWNER AGENDA DO DIA — dashboard de marcações do dia
// SEGURANÇA: só renderiza quando isOwner === true (verificado no pai)
// ─────────────────────────────────────────────────────────────────────────────
function OwnerAgendaModal({ visible, bookings, selectedDate, staff, services, onStatusChange, onClose, onDayChange }) {
  const days      = useMemo(() => getNextDays(14), []);
  const todayStr  = fmtYMD(new Date());
  const dayName   = DAY_NAMES_FULL[new Date(selectedDate + 'T00:00:00').getDay()];

  const dayBookings = bookings
    .filter(b => b.date === selectedDate && b.status !== 'cancelled')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={bS.modalContainer}>
        <View style={bS.modalHeader}>
          <TouchableOpacity style={bS.modalBackBtn} onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={bS.modalTitle}>Agenda — {dayName}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Seletor de dia */}
        <View style={{ paddingVertical: 12 }}>
          <DaySelector days={days} selected={selectedDate} onSelect={onDayChange} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Estatísticas do dia */}
          <View style={bS.agendaStats}>
            <View style={bS.agendaStat}>
              <Text style={bS.agendaStatValue}>{dayBookings.length}</Text>
              <Text style={bS.agendaStatLabel}>Marcações</Text>
            </View>
            <View style={bS.agendaStatDivider} />
            <View style={bS.agendaStat}>
              <Text style={bS.agendaStatValue}>
                {dayBookings.reduce((s, b) => s + (b.price || 0), 0).toLocaleString()}
              </Text>
              <Text style={bS.agendaStatLabel}>Kz faturado</Text>
            </View>
            <View style={bS.agendaStatDivider} />
            <View style={bS.agendaStat}>
              <Text style={bS.agendaStatValue}>
                {dayBookings.filter(b => b.status === 'pending').length}
              </Text>
              <Text style={bS.agendaStatLabel}>Pendentes</Text>
            </View>
          </View>

          {/* Lista de marcações */}
          {dayBookings.length === 0 ? (
            <View style={bS.emptyState}>
              <Text style={bS.emptyIcon}>📅</Text>
              <Text style={bS.emptyTitle}>Sem marcações</Text>
              <Text style={bS.emptyText}>Nenhuma marcação para este dia.</Text>
            </View>
          ) : (
            <View style={bS.agendaTimeline}>
              {dayBookings.map(booking => {
                const srv  = services?.find(s => s.id === booking.serviceId);
                const stf  = staff?.find(s => s.id === booking.staffId);
                const stat = SLOT_STATUS[booking.status] || SLOT_STATUS.confirmed;
                return (
                  <View key={booking.id} style={[bS.agendaItem, { backgroundColor: stat.bg, borderLeftColor: stat.color }]}>
                    {/* Timeline hora */}
                    <View style={bS.agendaTimeWrap}>
                      <Text style={bS.agendaTime}>{booking.time}</Text>
                      <Text style={bS.agendaTimeEnd}>{booking.timeEnd}</Text>
                    </View>
                    {/* Conteúdo */}
                    <View style={{ flex: 1 }}>
                      <View style={bS.agendaItemHeader}>
                        <Text style={bS.agendaClientName}>{booking.clientName}</Text>
                        <View style={[bS.agendaStatusBadge, { backgroundColor: stat.color + '25' }]}>
                          <Text style={[bS.agendaStatusText, { color: stat.color }]}>{stat.label}</Text>
                        </View>
                      </View>
                      <Text style={bS.agendaServiceName}>{srv?.name || 'Serviço'}</Text>
                      {stf && stf.id !== 'staff_any' && (
                        <Text style={bS.agendaStaffName}>{stf.avatar} {stf.name}</Text>
                      )}
                      <Text style={bS.agendaPhone}>{booking.clientPhone}</Text>
                      {booking.notes ? (
                        <View style={bS.agendaNoteCard}>
                          <Text style={bS.agendaNoteText}>📝 {booking.notes}</Text>
                        </View>
                      ) : null}
                      <View style={bS.agendaFooter}>
                        <Text style={bS.agendaPrice}>{(booking.price || 0).toLocaleString()} Kz</Text>
                        {booking.status === 'pending' && (
                          <View style={bS.agendaActions}>
                            <TouchableOpacity style={bS.rejectBtn} onPress={() => onStatusChange(booking.id, 'cancelled')}>
                              <Text style={bS.rejectBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={bS.approveBtn} onPress={() => onStatusChange(booking.id, 'confirmed')}>
                              <Text style={bS.approveBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {booking.status === 'confirmed' && (
                          <TouchableOpacity style={bS.approveBtn} onPress={() => onStatusChange(booking.id, 'completed')}>
                            <Text style={bS.approveBtnText}>✓ Concluído</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BEAUTY WELLNESS MODULE — componente principal (SF_B1 + B2 + B3)
// ─────────────────────────────────────────────────────────────────────────────
export function BeautyWellnessModule({ business, ownerMode, tenantId, ownerBusinessPrivate: ownerBizProp }) {
  // Safe context read — falls back to props when rendered outside AppProvider
  const ctx = useContext(AppContext);
  const ownerBusinessPrivate = ownerBizProp ?? ctx?.ownerBusinessPrivate ?? business;

  // ── RBAC Zero Trust ──────────────────────────────────────────────────────
  const isOwner = ownerMode && tenantId === business?.id;

  // ── Estado LOCAL — destruído ao desmontar (anti-colisão com Hospitality) ─
  const [selectedService,  setSelectedService]  = useState(null);
  const [selectedStaff,    setSelectedStaff]    = useState(null);
  const [selectedDate,     setSelectedDate]     = useState(fmtYMD(new Date()));
  const [selectedSlot,     setSelectedSlot]     = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAgenda,       setShowAgenda]       = useState(false);
  const [agendaDate,       setAgendaDate]       = useState(fmtYMD(new Date()));

  // Marcações (mock; FASE 2+: query do backend)
  const [slotBookings, setSlotBookings] = useState([
    { id: 'sb_1', businessId: business?.id, serviceId: '1', staffId: 'staff_1',
      slotId: 'slot_1000', date: fmtYMD(new Date()), time: '10:00', timeEnd: '10:30',
      clientName: 'Maria Fernanda', clientPhone: '+244 912 111 222',
      price: 5000, status: 'confirmed', notes: '' },
    { id: 'sb_2', businessId: business?.id, serviceId: '2', staffId: 'staff_2',
      slotId: 'slot_1400', date: fmtYMD(new Date()), time: '14:00', timeEnd: '14:30',
      clientName: 'João Baptista', clientPhone: '+244 923 333 444',
      price: 3000, status: 'pending', notes: 'Barba curta' },
  ]);

  // ── Cleanup ao mudar de negócio ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      setSelectedService(null); setSelectedStaff(null);
      setSelectedSlot(null); setShowBookingModal(false);
    };
  }, [business?.id]);

  // ── Dados ─────────────────────────────────────────────────────────────────
  const services = useMemo(() => {
    // servicesList é dado público do business
    return business?.servicesList || [];
  }, [business]);

  const staff = useMemo(() => {
    // FASE 2+: virá de /modules/beauty/:id com staffList real
    return DEFAULT_STAFF;
  }, []);

  const slots = useMemo(() => generateDaySlots(), []);
  const days  = useMemo(() => getNextDays(10), []);

  // ── Confirmar marcação ────────────────────────────────────────────────────
  const handleConfirmBooking = useCallback((booking) => {
    setSlotBookings(prev => [...prev, booking]);
    setShowBookingModal(false);
    setSelectedSlot(null);
    Alert.alert('Marcação Confirmada! ✅',
      `${booking.clientName}\n${booking.date} às ${booking.time}\n${booking.clientName}`,
      [{ text: 'OK' }]);
  }, []);

  // ── Mudar status (modo dono) ──────────────────────────────────────────────
  const handleStatusChange = useCallback((bookingId, newStatus) => {
    if (!isOwner) return; // RBAC guard
    setSlotBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
  }, [isOwner]);

  const activeBookings = slotBookings.filter(b => b.businessId === business?.id);
  const todayBookings  = activeBookings.filter(b => b.date === fmtYMD(new Date()));
  const pendingCount   = todayBookings.filter(b => b.status === 'pending').length;

  if (services.length === 0) return (
    <View style={bS.emptyState}>
      <Text style={bS.emptyIcon}>💅</Text>
      <Text style={bS.emptyTitle}>Sem serviços configurados</Text>
      <Text style={bS.emptyText}>Configure os serviços no painel de gestão.</Text>
    </View>
  );

  return (
    <View style={bS.container}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <View style={bS.header}>
        <View style={{ flex: 1 }}>
          <Text style={bS.headerTitle}>Beleza & Bem-estar</Text>
          <Text style={bS.headerSubtitle}>{services.length} serviço{services.length !== 1 ? 's' : ''}</Text>
        </View>
        {isOwner && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={bS.ownerActionBtn} onPress={() => setShowAgenda(true)}>
              {pendingCount > 0 && (
                <View style={bS.pendingBadge}>
                  <Text style={bS.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
              <Icon name="calendar" size={16} color={COLORS.white} strokeWidth={2} />
              <Text style={bS.ownerActionBtnText}>Agenda</Text>
            </TouchableOpacity>
            <View style={bS.ownerBadge}>
              <Icon name="verified" size={12} color={COLORS.green} strokeWidth={2.5} />
              <Text style={bS.ownerBadgeText}>Gestão</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── SF_B1: SERVIÇOS ──────────────────────────────────────── */}
        <View style={bS.section}>
          <Text style={bS.sectionTitle}>Selecionar Serviço</Text>
          {services.map(service => (
            <ServiceCard key={service.id} service={service}
              selected={selectedService?.id === service.id}
              onSelect={s => { setSelectedService(s); setSelectedSlot(null); }} />
          ))}
        </View>

        {/* ── SF_B1: PROFISSIONAL ──────────────────────────────────── */}
        {selectedService && (
          <View style={bS.section}>
            <Text style={bS.sectionTitle}>Escolher Profissional</Text>
            <StaffSelector staff={staff} selected={selectedStaff}
              onSelect={s => { setSelectedStaff(s); setSelectedSlot(null); }} />
          </View>
        )}

        {/* ── SF_B1: DIA ───────────────────────────────────────────── */}
        {selectedService && selectedStaff && (
          <View style={bS.section}>
            <Text style={bS.sectionTitle}>Escolher Dia</Text>
            <DaySelector days={days} selected={selectedDate}
              onSelect={d => { setSelectedDate(d); setSelectedSlot(null); }} />
          </View>
        )}

        {/* ── SF_B2: GRELHA DE SLOTS ───────────────────────────────── */}
        {selectedService && selectedStaff && selectedDate && (
          <View style={bS.section}>
            <View style={bS.slotHeader}>
              <Text style={bS.sectionTitle}>Horários Disponíveis</Text>
              <Text style={bS.slotSubtitle}>09:00 – 18:00 · {DEFAULT_SLOT_MINS} min</Text>
            </View>
            <SlotGrid
              slots={slots}
              selectedDate={selectedDate}
              selectedStaff={selectedStaff}
              bookings={activeBookings}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
            {selectedSlot && (
              <View style={bS.selectedSlotBar}>
                <View>
                  <Text style={bS.selectedSlotTime}>{selectedSlot.time} – {selectedSlot.timeEnd}</Text>
                  <Text style={bS.selectedSlotService}>{selectedService.name}</Text>
                </View>
                <TouchableOpacity style={bS.bookNowBtn}
                  onPress={() => setShowBookingModal(true)} activeOpacity={0.8}>
                  <Text style={bS.bookNowBtnText}>
                    Reservar — {(selectedService.basePrice || 0).toLocaleString()} Kz
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAIS ──────────────────────────────────────────────────── */}
      <SlotBookingModal
        visible={showBookingModal}
        service={selectedService}
        staff={selectedStaff}
        slot={selectedSlot}
        selectedDate={selectedDate}
        business={business}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleConfirmBooking}
      />

      {isOwner && showAgenda && (
        <OwnerAgendaModal
          visible={showAgenda}
          bookings={activeBookings}
          selectedDate={agendaDate}
          staff={staff}
          services={services}
          onStatusChange={handleStatusChange}
          onClose={() => setShowAgenda(false)}
          onDayChange={setAgendaDate}
        />
      )}
    </View>
  );
}

export default BeautyWellnessModule;

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────
export { generateDaySlots, getNextDays, fmtYMD, fmtDuration, isSlotBooked };

// ─────────────────────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
const bS = StyleSheet.create({
  container:         { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
                       borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  headerTitle:       { fontSize: 16, fontWeight: '800', color: '#111111' },
  headerSubtitle:    { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  ownerBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8,
                       paddingVertical: 4, backgroundColor: '#22A06B' + '15', borderRadius: 20 },
  ownerBadgeText:    { fontSize: 11, fontWeight: '700', color: '#22A06B' },
  ownerActionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative',
                       paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EC4899', borderRadius: 20 },
  ownerActionBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  pendingBadge:      { position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                       borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  pendingBadgeText:  { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  // Section
  section:           { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionTitle:      { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 10 },

  // Service cards
  serviceCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
                       borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBEB',
                       padding: 12, marginBottom: 8, elevation: 1,
                       shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  serviceCardSelected: { borderColor: '#EC4899', backgroundColor: '#FDF2F8' },
  serviceName:       { fontSize: 14, fontWeight: '700', color: '#111111' },
  serviceNameSelected: { color: '#BE185D' },
  serviceDesc:       { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  serviceDuration:   { fontSize: 11, color: '#8A8A8A', marginTop: 4 },
  servicePriceWrap:  { alignItems: 'flex-end', gap: 4 },
  servicePrice:      { fontSize: 14, fontWeight: '800', color: '#D32323' },
  servicePriceSelected: { color: '#BE185D' },
  serviceCheckBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#EC4899',
                       alignItems: 'center', justifyContent: 'center' },

  // Staff selector
  staffRow:          { marginBottom: 4 },
  staffChip:         { alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1.5,
                       borderColor: '#EBEBEB', backgroundColor: '#FFFFFF',
                       marginRight: 10, minWidth: 80, maxWidth: 100 },
  staffChipSelected: { borderColor: '#EC4899', backgroundColor: '#FDF2F8' },
  staffAvatar:       { fontSize: 24, marginBottom: 4 },
  staffName:         { fontSize: 11, fontWeight: '700', color: '#111111', textAlign: 'center' },
  staffNameSelected: { color: '#BE185D' },
  staffSpecialty:    { fontSize: 10, color: '#8A8A8A', textAlign: 'center', marginTop: 2 },

  // Day selector
  dayRow:            { marginBottom: 4 },
  dayChip:           { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
                       borderWidth: 1.5, borderColor: '#EBEBEB', backgroundColor: '#FFFFFF',
                       marginRight: 8, minWidth: 62, position: 'relative' },
  dayChipSelected:   { borderColor: '#D32323', backgroundColor: '#D32323' },
  dayChipSunday:     { opacity: 0.4 },
  dayChipName:       { fontSize: 10, fontWeight: '700', color: '#8A8A8A', textTransform: 'uppercase' },
  dayChipNameSelected: { color: '#FFFFFF' },
  dayChipNameSunday: { color: '#8A8A8A' },
  dayChipNum:        { fontSize: 20, fontWeight: '800', color: '#111111', lineHeight: 26 },
  dayChipNumSelected: { color: '#FFFFFF' },
  dayChipMonth:      { fontSize: 10, color: '#8A8A8A' },
  dayChipMonthSelected: { color: '#FFFFFF' + 'CC' },
  todayDot:          { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: '#D32323' },
  todayDotSelected:  { backgroundColor: '#FFFFFF' },

  // Slot grid
  slotHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  slotSubtitle:      { fontSize: 11, color: '#8A8A8A' },
  slotGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slotChip:          { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5,
                       borderColor: '#EBEBEB', backgroundColor: '#FFFFFF', alignItems: 'center' },
  slotChipBooked:    { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  slotChipPast:      { opacity: 0.4, backgroundColor: '#F7F7F8' },
  slotChipSelected:  { borderColor: '#D32323', backgroundColor: '#D32323' },
  slotTime:          { fontSize: 14, fontWeight: '700', color: '#111111' },
  slotTimeBooked:    { color: '#EF4444' },
  slotTimePast:      { color: '#8A8A8A' },
  slotTimeSelected:  { color: '#FFFFFF' },
  slotStatusText:    { fontSize: 9, color: '#8A8A8A', marginTop: 2 },

  // Selected slot bar
  selectedSlotBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       padding: 14, backgroundColor: '#FDF2F8', borderRadius: 12,
                       borderWidth: 1, borderColor: '#FBCFE8', marginTop: 4 },
  selectedSlotTime:  { fontSize: 16, fontWeight: '800', color: '#BE185D' },
  selectedSlotService: { fontSize: 12, color: '#9D174D', marginTop: 2 },
  bookNowBtn:        { backgroundColor: '#EC4899', borderRadius: 10, paddingVertical: 10,
                       paddingHorizontal: 16 },
  bookNowBtnText:    { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Booking modal
  modalContainer:    { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
                       borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalBackBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F7F8',
                       alignItems: 'center', justifyContent: 'center' },
  modalTitle:        { fontSize: 16, fontWeight: '800', color: '#111111' },
  stepTitle:         { fontSize: 18, fontWeight: '800', color: '#111111', marginBottom: 16 },
  bookingSummaryCard: { backgroundColor: '#FDF2F8', borderRadius: 12, padding: 14, marginBottom: 20,
                        borderWidth: 1, borderColor: '#FBCFE8' },
  bookingSummaryTitle: { fontSize: 16, fontWeight: '800', color: '#BE185D', marginBottom: 10 },
  bookingSummaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bookingSummaryLabel: { fontSize: 13, color: '#8A8A8A' },
  bookingSummaryValue: { fontSize: 13, color: '#111111', fontWeight: '600' },
  inputGroup:        { marginBottom: 14 },
  inputLabel:        { fontSize: 12, fontWeight: '600', color: '#8A8A8A', marginBottom: 6 },
  input:             { borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 10,
                       padding: 12, fontSize: 14, color: '#111111', backgroundColor: '#FFFFFF' },
  primaryBtn:        { backgroundColor: '#EC4899', borderRadius: 12, paddingVertical: 14,
                       alignItems: 'center', marginTop: 8 },
  primaryBtnText:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Agenda
  agendaStats:       { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12,
                       borderWidth: 1, borderColor: '#EBEBEB', padding: 16, marginBottom: 16 },
  agendaStat:        { flex: 1, alignItems: 'center' },
  agendaStatValue:   { fontSize: 22, fontWeight: '800', color: '#111111' },
  agendaStatLabel:   { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  agendaStatDivider: { width: 1, backgroundColor: '#EBEBEB', marginHorizontal: 8 },
  agendaTimeline:    { gap: 12 },
  agendaItem:        { flexDirection: 'row', borderRadius: 12, borderLeftWidth: 4, padding: 12, gap: 12 },
  agendaTimeWrap:    { alignItems: 'center', justifyContent: 'center', minWidth: 42 },
  agendaTime:        { fontSize: 13, fontWeight: '800', color: '#111111' },
  agendaTimeEnd:     { fontSize: 10, color: '#8A8A8A' },
  agendaItemHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  agendaClientName:  { fontSize: 14, fontWeight: '700', color: '#111111', flex: 1 },
  agendaStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  agendaStatusText:  { fontSize: 10, fontWeight: '700' },
  agendaServiceName: { fontSize: 13, color: '#111111', marginBottom: 2 },
  agendaStaffName:   { fontSize: 12, color: '#8A8A8A' },
  agendaPhone:       { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  agendaNoteCard:    { marginTop: 6, padding: 6, backgroundColor: '#FFFBEB', borderRadius: 6 },
  agendaNoteText:    { fontSize: 11, color: '#92400E' },
  agendaFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  agendaPrice:       { fontSize: 14, fontWeight: '800', color: '#D32323' },
  agendaActions:     { flexDirection: 'row', gap: 8 },
  rejectBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                       backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  rejectBtnText:     { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  approveBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22A06B' },
  approveBtnText:    { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  emptyState:        { alignItems: 'center', padding: 48 },
  emptyIcon:         { fontSize: 40, marginBottom: 12 },
  emptyTitle:        { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 6 },
  emptyText:         { fontSize: 13, color: '#8A8A8A', textAlign: 'center' },
});