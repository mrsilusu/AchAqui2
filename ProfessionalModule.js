/**
 * ============================================================================
 * ACHEIAQUI — PROFESSIONAL MODULE  (v3.0.0 — Fase 3)
 * ============================================================================
 * Funcionalidades:
 *   ✅ Marcação de consultas com especialidades e profissionais
 *   ✅ Calendário de disponibilidade semanal
 *   ✅ Modo Cliente — histórico de consultas isolado por userId
 *   ✅ Modo Dono — agenda completa do negócio, gestão de estados
 *
 * Segurança SaaS Multi-tenant (HIPAA-compliant style):
 *   ✅ RBAC duplo: ownerMode && tenantId === business.id
 *   ✅ Dados de saúde/consultas isolados por tenantId + userId
 *   ✅ Cliente vê APENAS as suas próprias consultas (filtro por userId)
 *   ✅ Dono vê toda a agenda do seu negócio (filtro por tenantId)
 *   ✅ Nunca um cliente vê dados de outro cliente
 *   ✅ sanitizeInput() em todos os campos livres (motivo, sintomas, observações)
 *   ✅ Gesture safety: onUnsavedChange callback para swipe-back alert no pai
 *   ✅ useEffect cleanup em [business?.id] — purga ghost data ao trocar negócio
 * ============================================================================
 */

import React, {
  useContext, useState, useCallback, useMemo, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { sanitizeInput, Icon, COLORS, AppContext } from './AcheiAqui_Core';

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

// hex literais — evita COLORS.* ao nível de módulo (import time)
const APPT_STATUS_CONFIG = {
  scheduled: { label: 'Agendada',  color: '#1565C0' },
  confirmed: { label: 'Confirmada',color: '#22C55E' },
  completed: { label: 'Concluída', color: '#8A8A8A' },
  cancelled: { label: 'Cancelada', color: '#D32323' },
  noshow:    { label: 'Falta',     color: '#F59E0B' },
};

// IDs mock — em produção vêm do JWT
const MOCK_USER_ID   = 'user_client_1';
const MOCK_TENANT_ID = 'biz_owner_1';

const fmtDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const getWeekDates = () => {
  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return WEEKDAYS.map((_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return { day: WEEKDAYS[i], date: fmtDate(d), dateObj: d };
  });
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_PROFESSIONALS = [
  { id: 'prof1', name: 'Dr. António Silva',    specialty: 'Clínica Geral',       avatar: '👨‍⚕️', availableDays: ['Seg','Ter','Qua','Qui','Sex'] },
  { id: 'prof2', name: 'Dra. Filomena Costa',  specialty: 'Pediatria',           avatar: '👩‍⚕️', availableDays: ['Seg','Qua','Sex'] },
  { id: 'prof3', name: 'Dr. Eduardo Neto',     specialty: 'Cardiologia',         avatar: '👨‍⚕️', availableDays: ['Ter','Qui'] },
];

const buildMockAppointments = () => {
  const week = getWeekDates();
  return [
    // Consulta do cliente logado (userId === MOCK_USER_ID)
    { id: 'a1', tenantId: MOCK_TENANT_ID, userId: MOCK_USER_ID,
      professionalId: 'prof1', professionalName: 'Dr. António Silva', specialty: 'Clínica Geral',
      date: week[0]?.date ?? '01/03/2026', time: '09:00',
      patientName: 'João Silva', patientPhone: '+244 912 000 001',
      reason: sanitizeInput('Consulta de rotina anual'), notes: '',
      status: 'confirmed' },
    { id: 'a2', tenantId: MOCK_TENANT_ID, userId: MOCK_USER_ID,
      professionalId: 'prof2', professionalName: 'Dra. Filomena Costa', specialty: 'Pediatria',
      date: week[2]?.date ?? '03/03/2026', time: '14:30',
      patientName: 'João Silva', patientPhone: '+244 912 000 001',
      reason: sanitizeInput('Consulta filho — vacinas'), notes: '',
      status: 'scheduled' },
    // Consulta de outro cliente (userId diferente — nunca visível para MOCK_USER_ID)
    { id: 'a3', tenantId: MOCK_TENANT_ID, userId: 'user_client_2',
      professionalId: 'prof1', professionalName: 'Dr. António Silva', specialty: 'Clínica Geral',
      date: week[0]?.date ?? '01/03/2026', time: '10:00',
      patientName: 'Maria Gonçalves', patientPhone: '+244 923 000 002',
      reason: sanitizeInput('Dores de cabeça frequentes'), notes: '',
      status: 'confirmed' },
    { id: 'a4', tenantId: MOCK_TENANT_ID, userId: 'user_client_3',
      professionalId: 'prof3', professionalName: 'Dr. Eduardo Neto', specialty: 'Cardiologia',
      date: week[1]?.date ?? '02/03/2026', time: '08:30',
      patientName: 'Carlos Mendes', patientPhone: '+244 912 000 003',
      reason: sanitizeInput('Controlo de pressão arterial'), notes: 'Hipertenso',
      status: 'confirmed' },
  ];
};

// Slots ocupados (tenantId-scoped) — nunca expõe userId ao cliente
const getOccupiedSlots = (appointments, professionalId, date) =>
  appointments
    .filter(a => a.professionalId === professionalId && a.date === date && a.status !== 'cancelled')
    .map(a => a.time);

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

function ProfessionalCard({ prof, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[profS.profCard, selected && profS.profCardSelected]}
      onPress={() => onSelect(prof)}
      activeOpacity={0.8}
    >
      <Text style={profS.profAvatar}>{prof.avatar}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[profS.profName, selected && { color: COLORS.red }]}>{prof.name}</Text>
        <Text style={profS.profSpec}>{prof.specialty}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {prof.availableDays.map(d => (
            <View key={d} style={profS.dayChip}>
              <Text style={profS.dayChipText}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
      {selected && <Icon name="checkCircle" size={18} color={COLORS.red} strokeWidth={2.5} />}
    </TouchableOpacity>
  );
}

function SlotGrid({ slots, occupied, selectedSlot, onSelect }) {
  return (
    <View style={profS.slotGrid}>
      {slots.map(slot => {
        const isOccupied = occupied.includes(slot);
        const isSelected = selectedSlot === slot;
        return (
          <TouchableOpacity
            key={slot}
            disabled={isOccupied}
            style={[
              profS.slotBtn,
              isOccupied && profS.slotOccupied,
              isSelected && profS.slotSelected,
            ]}
            onPress={() => onSelect(slot)}
            activeOpacity={0.75}
          >
            <Text style={[
              profS.slotText,
              isOccupied && profS.slotTextOccupied,
              isSelected && profS.slotTextSelected,
            ]}>
              {slot}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppointmentCard({ appt, ownerMode, onPress }) {
  const cfg = APPT_STATUS_CONFIG[appt.status] ?? APPT_STATUS_CONFIG.scheduled;
  return (
    <TouchableOpacity style={profS.apptCard} onPress={() => onPress(appt)} activeOpacity={0.8}>
      <View style={[profS.apptStatusBar, { backgroundColor: cfg.color }]} />
      <View style={{ flex: 1, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={profS.apptTime}>{appt.time} · {appt.date}</Text>
          <View style={[profS.statusBadge, { backgroundColor: cfg.color + '22' }]}>
            <Text style={[profS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={profS.apptProf}>{appt.professionalName}</Text>
        <Text style={profS.apptSpec}>{appt.specialty}</Text>
        {/* Dono vê nome do paciente — cliente vê apenas os seus dados */}
        {ownerMode && (
          <Text style={profS.apptPatient}>👤 {appt.patientName}</Text>
        )}
        {appt.reason ? (
          <Text style={profS.apptReason} numberOfLines={1}>Motivo: {appt.reason}</Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── MODAL NOVA CONSULTA ──────────────────────────────────────────────────────
function BookingModal({ visible, professional, selectedDate, selectedSlot, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');

  useEffect(() => {
    if (visible) { setReason(''); setName(''); setPhone(''); }
  }, [visible]);

  const hasData = !!(name.trim() || phone.trim() || reason.trim());

  const handleClose = useCallback(() => {
    if (hasData) {
      Alert.alert(
        'Descartar marcação?',
        'Tem dados preenchidos. Deseja descartar a marcação em curso?',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: onClose },
        ],
      );
    } else { onClose(); }
  }, [hasData, onClose]);

  const handleConfirm = useCallback(() => {
    if (!name.trim())   { Alert.alert('Erro', 'Indique o nome do paciente.'); return; }
    if (!phone.trim())  { Alert.alert('Erro', 'Indique o contacto.'); return; }
    if (!reason.trim()) { Alert.alert('Erro', 'Indique o motivo da consulta.'); return; }
    onConfirm({
      professionalId:   professional?.id,
      professionalName: professional?.name,
      specialty:        professional?.specialty,
      date:             selectedDate,
      time:             selectedSlot,
      status:           'scheduled',
      userId:           MOCK_USER_ID,
      tenantId:         MOCK_TENANT_ID,
      patientName:  sanitizeInput(name.trim(), 80),
      patientPhone: sanitizeInput(phone.trim(), 30),
      reason:       sanitizeInput(reason.trim(), 300),
      notes:        '',
    });
  }, [name, phone, reason, professional, selectedDate, selectedSlot, onConfirm]);

  if (!professional || !selectedDate || !selectedSlot) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={profS.modalOverlay}>
        <View style={profS.modalSheet}>
          <View style={profS.modalHeader}>
            <Text style={profS.modalTitle}>Confirmar Marcação</Text>
            <TouchableOpacity onPress={handleClose} style={profS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 14 }}>
            {/* Sumário */}
            <View style={profS.summaryCard}>
              <Text style={profS.summaryProf}>{professional.avatar} {professional.name}</Text>
              <Text style={profS.summarySpec}>{professional.specialty}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <View style={profS.summaryItem}>
                  <Icon name="calendar" size={14} color={COLORS.grayText} strokeWidth={2} />
                  <Text style={profS.summaryItemText}>{selectedDate}</Text>
                </View>
                <View style={profS.summaryItem}>
                  <Icon name="clock" size={14} color={COLORS.grayText} strokeWidth={2} />
                  <Text style={profS.summaryItemText}>{selectedSlot}</Text>
                </View>
              </View>
            </View>

            {/* Dados do paciente */}
            <Text style={profS.fieldLabel}>Nome do paciente</Text>
            <TextInput style={profS.input} value={name} onChangeText={setName}
              placeholder="Nome completo" placeholderTextColor={COLORS.grayText} maxLength={80} />

            <Text style={profS.fieldLabel}>Contacto</Text>
            <TextInput style={profS.input} value={phone} onChangeText={setPhone}
              placeholder="+244 9XX XXX XXX" placeholderTextColor={COLORS.grayText}
              keyboardType="phone-pad" maxLength={30} />

            <Text style={profS.fieldLabel}>Motivo da consulta <Text style={{ color: COLORS.red }}>*</Text></Text>
            <TextInput style={[profS.input, profS.inputMulti]} value={reason} onChangeText={setReason}
              placeholder="Descreva brevemente o motivo ou sintomas…"
              placeholderTextColor={COLORS.grayText} multiline maxLength={300} />
            <Text style={profS.charCount}>{reason.length}/300</Text>

            <View style={profS.privacyNote}>
              <Icon name="shield" size={13} color={COLORS.blue} strokeWidth={2} />
              <Text style={profS.privacyText}>
                Os seus dados são confidenciais e acessíveis apenas ao profissional desta consulta.
              </Text>
            </View>

            <TouchableOpacity style={profS.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={profS.confirmBtnText}>Confirmar Marcação</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL DETALHE CONSULTA ───────────────────────────────────────────────────
function AppointmentDetailModal({ visible, appt, ownerMode, onClose, onStatusChange }) {
  if (!appt) return null;
  const cfg = APPT_STATUS_CONFIG[appt.status] ?? APPT_STATUS_CONFIG.scheduled;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={profS.modalOverlay}>
        <View style={[profS.modalSheet, { maxHeight: '75%' }]}>
          <View style={profS.modalHeader}>
            <Text style={profS.modalTitle}>Consulta #{appt.id.slice(-2)}</Text>
            <TouchableOpacity onPress={onClose} style={profS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={[profS.statusBadge, { backgroundColor: cfg.color + '22', alignSelf: 'flex-start', marginVertical: 12 }]}>
              <Text style={[profS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <DetailRow icon="user"     label="Profissional" value={appt.professionalName} />
            <DetailRow icon="briefcase" label="Especialidade" value={appt.specialty} />
            <DetailRow icon="calendar" label="Data"          value={appt.date} />
            <DetailRow icon="clock"    label="Hora"          value={appt.time} />
            {/* Nome do paciente: dono vê sempre; cliente vê apenas o seu */}
            {ownerMode && <DetailRow icon="users" label="Paciente" value={`${appt.patientName} · ${appt.patientPhone}`} />}
            <DetailRow icon="fileText" label="Motivo"  value={appt.reason || '—'} />
            {appt.notes ? <DetailRow icon="edit" label="Notas" value={appt.notes} /> : null}

            {ownerMode && appt.status !== 'completed' && appt.status !== 'cancelled' && (
              <View style={profS.ownerActions}>
                {appt.status !== 'confirmed' && (
                  <TouchableOpacity style={[profS.ownerBtn, { backgroundColor: '#22C55E' }]}
                    onPress={() => onStatusChange(appt.id, 'confirmed')}>
                    <Text style={profS.ownerBtnText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[profS.ownerBtn, { backgroundColor: COLORS.blue }]}
                  onPress={() => onStatusChange(appt.id, 'completed')}>
                  <Text style={profS.ownerBtnText}>Concluída</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[profS.ownerBtn, { backgroundColor: '#F59E0B' }]}
                  onPress={() => onStatusChange(appt.id, 'noshow')}>
                  <Text style={profS.ownerBtnText}>Falta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[profS.ownerBtn, { backgroundColor: COLORS.red }]}
                  onPress={() => onStatusChange(appt.id, 'cancelled')}>
                  <Text style={profS.ownerBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={profS.detailRow}>
      <Icon name={icon} size={15} color={COLORS.grayText} strokeWidth={2} />
      <Text style={profS.detailLabel}>{label}</Text>
      <Text style={profS.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ─── PROFESSIONAL MODULE — componente principal ───────────────────────────────
export function ProfessionalModule({ business, ownerMode, tenantId, onUnsavedChange }) {
  const ctx     = useContext(AppContext);
  // RBAC duplo — nunca confia apenas na prop
  const isOwner = (ownerMode ?? (ctx?.isBusinessMode && ctx?.tenantId === business?.id))
    && (tenantId ?? ctx?.tenantId) === business?.id;
  const currentUserId = ctx?.userId ?? MOCK_USER_ID;

  const [activeTab,         setActiveTab]         = useState(isOwner ? 'agenda' : 'book');
  const [appointments,      setAppointments]      = useState(buildMockAppointments);
  const [selectedProf,      setSelectedProf]      = useState(null);
  const [selectedDayIdx,    setSelectedDayIdx]    = useState(0);
  const [selectedSlot,      setSelectedSlot]      = useState(null);
  const [showBookingModal,  setShowBookingModal]  = useState(false);
  const [selectedAppt,      setSelectedAppt]      = useState(null);
  const [showDetailModal,   setShowDetailModal]   = useState(false);
  const [agendaFilter,      setAgendaFilter]      = useState('all'); // 'all' | 'today' | 'pending'

  const weekDates = useMemo(() => getWeekDates(), []);

  // Ghost-data purge ao trocar de negócio
  useEffect(() => {
    return () => {
      setSelectedProf(null);
      setSelectedSlot(null);
      setShowBookingModal(false);
      setShowDetailModal(false);
      setSelectedAppt(null);
      onUnsavedChange?.(false);
    };
  }, [business?.id]);

  // ── Dados filtrados por isolamento multi-tenant ───────────────────────────
  // SEGURANÇA: cliente vê APENAS as suas consultas (userId match)
  //            dono vê TODAS as consultas do seu negócio (tenantId match)
  const visibleAppointments = useMemo(() => {
    const bId = business?.id ?? MOCK_TENANT_ID;
    return appointments.filter(a => {
      if (a.tenantId !== bId) return false;     // isolamento de tenant
      if (!isOwner && a.userId !== currentUserId) return false; // isolamento de cliente
      return true;
    });
  }, [appointments, isOwner, currentUserId, business?.id]);

  // Slots ocupados para o profissional+dia seleccionado (sem expor userId)
  const occupiedSlots = useMemo(() => {
    if (!selectedProf) return [];
    return getOccupiedSlots(appointments, selectedProf.id, weekDates[selectedDayIdx]?.date ?? '');
  }, [appointments, selectedProf, selectedDayIdx, weekDates]);

  // Agenda filtrada (dono)
  const filteredAgenda = useMemo(() => {
    const today = fmtDate(new Date());
    switch (agendaFilter) {
      case 'today':   return visibleAppointments.filter(a => a.date === today);
      case 'pending': return visibleAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
      default:        return visibleAppointments;
    }
  }, [visibleAppointments, agendaFilter]);

  // Stats (dono)
  const stats = useMemo(() => {
    const today = fmtDate(new Date());
    return {
      total:   visibleAppointments.length,
      today:   visibleAppointments.filter(a => a.date === today).length,
      pending: visibleAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
      done:    visibleAppointments.filter(a => a.status === 'completed').length,
    };
  }, [visibleAppointments]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleProfSelect = useCallback((prof) => {
    setSelectedProf(p => p?.id === prof.id ? null : prof);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
    onUnsavedChange?.(true);
  }, [onUnsavedChange]);

  const handleConfirmBooking = useCallback((data) => {
    const newId = `a${Date.now()}`;
    setAppointments(prev => [...prev, { id: newId, ...data }]);
    setShowBookingModal(false);
    setSelectedSlot(null);
    setSelectedProf(null);
    onUnsavedChange?.(false);
    Alert.alert('Marcação Confirmada!',
      `Consulta agendada com ${data.professionalName} para ${data.date} às ${data.time}.`);
  }, [onUnsavedChange]);

  const handleStatusChange = useCallback((apptId, newStatus) => {
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
    setShowDetailModal(false);
  }, []);

  const TABS = isOwner
    ? [
        { id: 'agenda', label: 'Agenda',     icon: 'calendar' },
        { id: 'staff',  label: 'Profissionais', icon: 'users'    },
      ]
    : [
        { id: 'book',    label: 'Marcar',    icon: 'plusCircle' },
        { id: 'history', label: 'As minhas', icon: 'clock'      },
      ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={profS.container}>
      {isOwner && (
        <View style={profS.rbacBadge}>
          <Icon name="shield" size={12} color={COLORS.green} strokeWidth={2.5} />
          <Text style={profS.rbacText}>Modo Gestão · tenantId verificado · dados isolados por paciente</Text>
        </View>
      )}

      {isOwner && (
        <View style={profS.statsRow}>
          <StatBox icon="calendar"    label="Total"    value={stats.total}   color={COLORS.blue} />
          <StatBox icon="sun"         label="Hoje"     value={stats.today}   color="#F59E0B" />
          <StatBox icon="clock"       label="Pendentes" value={stats.pending} color={COLORS.red} />
          <StatBox icon="checkCircle" label="Concluídas" value={stats.done}  color="#22C55E" />
        </View>
      )}

      {/* Tabs */}
      <View style={profS.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id}
            style={[profS.tab, activeTab === tab.id && profS.tabActive]}
            onPress={() => setActiveTab(tab.id)} activeOpacity={0.75}>
            <Icon name={tab.icon} size={15} color={activeTab === tab.id ? COLORS.red : COLORS.grayText} strokeWidth={2} />
            <Text style={[profS.tabLabel, activeTab === tab.id && profS.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: MARCAR CONSULTA (cliente) ──────────────────────────────── */}
      {activeTab === 'book' && !isOwner && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          <Text style={profS.sectionTitle}>Escolha o profissional</Text>
          {MOCK_PROFESSIONALS.map(prof => (
            <ProfessionalCard key={prof.id} prof={prof}
              selected={selectedProf?.id === prof.id} onSelect={handleProfSelect} />
          ))}

          {selectedProf && (
            <>
              <Text style={profS.sectionTitle}>Escolha o dia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}>
                {weekDates.map((wd, idx) => {
                  const isAvail = selectedProf.availableDays.includes(wd.day);
                  return (
                    <TouchableOpacity key={idx} disabled={!isAvail}
                      style={[profS.dayBtn, selectedDayIdx === idx && profS.dayBtnSelected,
                              !isAvail && profS.dayBtnDisabled]}
                      onPress={() => { setSelectedDayIdx(idx); setSelectedSlot(null); }}
                      activeOpacity={0.75}>
                      <Text style={[profS.dayBtnDay, selectedDayIdx === idx && { color: COLORS.white }]}>
                        {wd.day}
                      </Text>
                      <Text style={[profS.dayBtnDate, selectedDayIdx === idx && { color: COLORS.white + 'CC' }]}>
                        {wd.date.slice(0, 5)}
                      </Text>
                      {!isAvail && <Text style={profS.dayBtnUnavail}>Indisponível</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedProf.availableDays.includes(weekDates[selectedDayIdx]?.day) && (
                <>
                  <Text style={profS.sectionTitle}>Escolha o horário</Text>
                  <View style={profS.legendRow}>
                    <View style={profS.legendItem}><View style={[profS.legendDot, { backgroundColor: COLORS.red }]} /><Text style={profS.legendLabel}>Disponível</Text></View>
                    <View style={profS.legendItem}><View style={[profS.legendDot, { backgroundColor: COLORS.grayLine }]} /><Text style={profS.legendLabel}>Ocupado</Text></View>
                  </View>
                  <SlotGrid slots={TIME_SLOTS} occupied={occupiedSlots}
                    selectedSlot={selectedSlot} onSelect={handleSlotSelect} />
                </>
              )}

              {selectedSlot && (
                <TouchableOpacity style={profS.confirmBtn}
                  onPress={() => setShowBookingModal(true)} activeOpacity={0.85}>
                  <Icon name="calendar" size={18} color={COLORS.white} strokeWidth={2.5} />
                  <Text style={profS.confirmBtnText}>
                    Marcar para {weekDates[selectedDayIdx]?.date} às {selectedSlot}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── TAB: HISTÓRICO (cliente) ─────────────────────────────────────── */}
      {activeTab === 'history' && !isOwner && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
          {visibleAppointments.length === 0 && (
            <Text style={profS.emptyText}>Ainda não tem consultas marcadas</Text>
          )}
          {visibleAppointments.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} ownerMode={false}
              onPress={(a) => { setSelectedAppt(a); setShowDetailModal(true); }} />
          ))}
        </ScrollView>
      )}

      {/* ── TAB: AGENDA (dono) ───────────────────────────────────────────── */}
      {activeTab === 'agenda' && isOwner && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Filtros */}
          <View style={profS.filterRow}>
            {[['all','Todas'],['today','Hoje'],['pending','Pendentes']].map(([id, label]) => (
              <TouchableOpacity key={id} style={[profS.filterBtn, agendaFilter === id && profS.filterBtnActive]}
                onPress={() => setAgendaFilter(id)} activeOpacity={0.75}>
                <Text style={[profS.filterText, agendaFilter === id && profS.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            {filteredAgenda.length === 0 && <Text style={profS.emptyText}>Sem consultas para este filtro</Text>}
            {filteredAgenda.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} ownerMode={true}
                onPress={(a) => { setSelectedAppt(a); setShowDetailModal(true); }} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── TAB: PROFISSIONAIS (dono) ────────────────────────────────────── */}
      {activeTab === 'staff' && isOwner && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {MOCK_PROFESSIONALS.map(prof => {
            const profAppts = visibleAppointments.filter(a => a.professionalId === prof.id);
            const todayAppts = profAppts.filter(a => a.date === fmtDate(new Date())).length;
            return (
              <View key={prof.id} style={profS.staffCard}>
                <Text style={profS.profAvatar}>{prof.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={profS.profName}>{prof.name}</Text>
                  <Text style={profS.profSpec}>{prof.specialty}</Text>
                  <Text style={profS.staffMeta}>
                    {todayAppts} consulta{todayAppts !== 1 ? 's' : ''} hoje · {profAppts.length} total
                  </Text>
                </View>
                <View style={profS.staffBadge}>
                  <Text style={profS.staffBadgeText}>{prof.availableDays.length}d/sem</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modais */}
      <BookingModal visible={showBookingModal} professional={selectedProf}
        selectedDate={weekDates[selectedDayIdx]?.date} selectedSlot={selectedSlot}
        onClose={() => { setShowBookingModal(false); onUnsavedChange?.(false); }}
        onConfirm={handleConfirmBooking} />

      <AppointmentDetailModal visible={showDetailModal} appt={selectedAppt}
        ownerMode={isOwner} onClose={() => setShowDetailModal(false)}
        onStatusChange={handleStatusChange} />
    </View>
  );
}

export default ProfessionalModule;

// ─── AUX ──────────────────────────────────────────────────────────────────────
function StatBox({ icon, label, value, color }) {
  return (
    <View style={[profS.statBox, { borderColor: color + '44' }]}>
      <Icon name={icon} size={14} color={color} strokeWidth={2} />
      <Text style={[profS.statVal, { color }]}>{value}</Text>
      <Text style={profS.statLabel}>{label}</Text>
    </View>
  );
}

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const profS = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F7F7F8' },
  rbacBadge:          { flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, marginBottom: 0,
                        paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#22A06B' + '10', borderRadius: 8 },
  rbacText:           { fontSize: 10, color: '#22A06B', fontWeight: '600', flex: 1 },
  statsRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  statBox:            { flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10,
                        borderWidth: 1, paddingVertical: 8, gap: 2, elevation: 1,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  statVal:            { fontSize: 18, fontWeight: '800' },
  statLabel:          { fontSize: 9, fontWeight: '600', color: '#8A8A8A' },
  tabBar:             { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1,
                        borderBottomColor: '#EBEBEB', marginTop: 12 },
  tab:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 5, paddingVertical: 12 },
  tabActive:          { borderBottomWidth: 2, borderBottomColor: '#D32323' },
  tabLabel:           { fontSize: 13, fontWeight: '500', color: '#8A8A8A' },
  tabLabelActive:     { color: '#D32323', fontWeight: '700' },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: '#111111' },
  // Prof card
  profCard:           { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, flexDirection: 'row',
                        alignItems: 'flex-start', gap: 12, borderWidth: 1.5, borderColor: '#EBEBEB',
                        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  profCardSelected:   { borderColor: '#D32323' },
  profAvatar:         { fontSize: 28 },
  profName:           { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 2 },
  profSpec:           { fontSize: 12, color: '#8A8A8A', marginBottom: 4 },
  dayChip:            { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#F7F7F8',
                        borderRadius: 6, borderWidth: 1, borderColor: '#EBEBEB' },
  dayChipText:        { fontSize: 10, fontWeight: '600', color: '#8A8A8A' },
  // Day selector
  dayBtn:             { width: 64, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
                        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EBEBEB' },
  dayBtnSelected:     { backgroundColor: '#D32323', borderColor: '#D32323' },
  dayBtnDisabled:     { opacity: 0.4 },
  dayBtnDay:          { fontSize: 13, fontWeight: '700', color: '#111111' },
  dayBtnDate:         { fontSize: 10, color: '#8A8A8A', marginTop: 2 },
  dayBtnUnavail:      { fontSize: 8, color: '#D32323', marginTop: 2 },
  // Slot grid
  legendRow:          { flexDirection: 'row', gap: 16 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:          { width: 8, height: 8, borderRadius: 4 },
  legendLabel:        { fontSize: 11, color: '#8A8A8A' },
  slotGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn:            { width: '22%', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D32323' },
  slotOccupied:       { borderColor: '#EBEBEB', backgroundColor: '#F7F7F8' },
  slotSelected:       { backgroundColor: '#D32323', borderColor: '#D32323' },
  slotText:           { fontSize: 12, fontWeight: '700', color: '#D32323' },
  slotTextOccupied:   { color: '#8A8A8A' },
  slotTextSelected:   { color: '#FFFFFF' },
  // Appointment card
  apptCard:           { backgroundColor: '#FFFFFF', borderRadius: 10, flexDirection: 'row',
                        alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB',
                        overflow: 'hidden', elevation: 1,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  apptStatusBar:      { width: 4, alignSelf: 'stretch' },
  apptTime:           { fontSize: 12, color: '#8A8A8A', marginBottom: 3 },
  apptProf:           { fontSize: 14, fontWeight: '700', color: '#111111' },
  apptSpec:           { fontSize: 12, color: '#8A8A8A' },
  apptPatient:        { fontSize: 12, color: '#1565C0', marginTop: 2 },
  apptReason:         { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  statusBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:         { fontSize: 11, fontWeight: '700' },
  // Filter row (dono)
  filterRow:          { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  filterBtn:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBEBEB' },
  filterBtnActive:    { backgroundColor: '#D32323', borderColor: '#D32323' },
  filterText:         { fontSize: 13, fontWeight: '600', color: '#8A8A8A' },
  filterTextActive:   { color: '#FFFFFF' },
  // Staff card (dono)
  staffCard:          { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, flexDirection: 'row',
                        alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EBEBEB',
                        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  staffMeta:          { fontSize: 11, color: '#1565C0', marginTop: 3 },
  staffBadge:         { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F7F7F8',
                        borderRadius: 20, borderWidth: 1, borderColor: '#EBEBEB' },
  staffBadgeText:     { fontSize: 12, fontWeight: '700', color: '#8A8A8A' },
  // Confirm button
  confirmBtn:         { backgroundColor: '#D32323', borderRadius: 12, paddingVertical: 15,
                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                        elevation: 3, shadowColor: '#D32323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  confirmBtnText:     { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        paddingBottom: Platform.OS === 'ios' ? 34 : 24, maxHeight: '92%' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 18,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#111111' },
  modalClose:         { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F7F7F8',
                        alignItems: 'center', justifyContent: 'center' },
  summaryCard:        { marginHorizontal: 16, backgroundColor: '#F7F7F8', borderRadius: 12,
                        padding: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  summaryProf:        { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 2 },
  summarySpec:        { fontSize: 13, color: '#8A8A8A' },
  summaryItem:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryItemText:    { fontSize: 13, fontWeight: '600', color: '#111111' },
  fieldLabel:         { fontSize: 12, fontWeight: '700', color: '#8A8A8A', marginBottom: 4, paddingHorizontal: 16 },
  input:              { backgroundColor: '#F7F7F8', borderRadius: 10, paddingHorizontal: 14,
                        paddingVertical: 12, fontSize: 15, color: '#111111', marginHorizontal: 16,
                        borderWidth: 1, borderColor: '#EBEBEB' },
  inputMulti:         { height: 100, textAlignVertical: 'top' },
  charCount:          { fontSize: 11, color: '#8A8A8A', textAlign: 'right', marginRight: 16, marginTop: 3 },
  privacyNote:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16,
                        backgroundColor: '#1565C0' + '10', borderRadius: 8, padding: 10 },
  privacyText:        { flex: 1, fontSize: 11, color: '#1565C0', lineHeight: 16 },
  detailRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  detailLabel:        { fontSize: 12, fontWeight: '700', color: '#8A8A8A', width: 80 },
  detailValue:        { flex: 1, fontSize: 14, color: '#111111', fontWeight: '500' },
  ownerActions:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  ownerBtn:           { flex: 1, minWidth: '45%', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  ownerBtnText:       { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  emptyText:          { textAlign: 'center', fontSize: 14, color: '#8A8A8A', paddingVertical: 32 },
});