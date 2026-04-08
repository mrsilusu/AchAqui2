// =============================================================================
// StaffManagementModal.jsx — Gestão do Staff Hoteleiro
// Props:
//   businessId  — ID do negócio (tenant)
//   accessToken — JWT do owner
//   onClose     — fecha o modal
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { value: 'RECEPTION',    label: 'Receção' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping' },
  { value: 'MAINTENANCE',  label: 'Manutenção' },
  { value: 'MANAGEMENT',   label: 'Gestão' },
  { value: 'SECURITY',     label: 'Segurança' },
  { value: 'RESTAURANT',   label: 'Restaurante' },
];

const SHIFTS = [
  { value: 'MORNING',   label: 'Manhã' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'NIGHT',     label: 'Noite' },
  { value: 'ROTATING',  label: 'Rotativo' },
  { value: 'FLEXIBLE',  label: 'Flexível' },
];

const DEPT_COLORS = {
  RECEPTION:    { color: '#1565C0', bg: '#EFF6FF' },
  HOUSEKEEPING: { color: '#22A06B', bg: '#F0FDF4' },
  MAINTENANCE:  { color: '#D97706', bg: '#FFFBEB' },
  MANAGEMENT:   { color: '#7C3AED', bg: '#F5F3FF' },
  SECURITY:     { color: '#DC2626', bg: '#FEF2F2' },
  RESTAURANT:   { color: '#D97706', bg: '#FFF7ED' },
};

function getDeptLabel(dept) {
  return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
}
function getShiftLabel(shift) {
  return SHIFTS.find(s => s.value === shift)?.label || shift;
}

// ─── Formulário de staff ──────────────────────────────────────────────────────
function StaffForm({ initial, businessId, onSave, onCancel }) {
  const [fullName,           setFullName]          = useState(initial?.fullName           || '');
  const [department,         setDepartment]        = useState(initial?.department         || 'RECEPTION');
  const [position,           setPosition]          = useState(initial?.position           || '');
  const [phone,              setPhone]             = useState(initial?.phone              || '');
  const [email,              setEmail]             = useState(initial?.email              || '');
  const [shift,              setShift]             = useState(initial?.shift              || 'ROTATING');
  const [pin,                setPin]               = useState('');
  const [canCancel,          setCanCancel]         = useState(initial?.canCancelBookings  || false);
  const [canDiscount,        setCanDiscount]       = useState(initial?.canApplyDiscounts  || false);
  const [canFinancials,      setCanFinancials]     = useState(initial?.canViewFinancials  || false);
  const [emergencyName,      setEmergencyName]     = useState(initial?.emergencyName      || '');
  const [emergencyPhone,     setEmergencyPhone]    = useState(initial?.emergencyPhone     || '');
  const [notes,              setNotes]             = useState(initial?.notes              || '');
  const [loading,            setLoading]           = useState(false);

  async function handleSave() {
    if (!fullName.trim()) { Alert.alert('Erro', 'Nome obrigatório.'); return; }
    if (pin && (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin))) {
      Alert.alert('Erro', 'PIN deve ter entre 4 e 8 dígitos numéricos.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        fullName:           fullName.trim(),
        department,
        position:           position.trim() || undefined,
        phone:              phone.trim()    || undefined,
        email:              email.trim()    || undefined,
        shift,
        pin:                pin             || undefined,
        canCancelBookings:  canCancel,
        canApplyDiscounts:  canDiscount,
        canViewFinancials:  canFinancials,
        emergencyName:      emergencyName.trim() || undefined,
        emergencyPhone:     emergencyPhone.trim()|| undefined,
        notes:              notes.trim()    || undefined,
      };
      if (!initial) payload.businessId = businessId;
      await onSave(payload);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível guardar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={sS.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={sS.formTitle}>{initial ? 'Editar Funcionário' : 'Novo Funcionário'}</Text>

      <Text style={sS.label}>Nome completo *</Text>
      <TextInput style={sS.input} value={fullName} onChangeText={setFullName}
        placeholder="Ex: Ana Silva" placeholderTextColor="#9CA3AF" />

      <Text style={sS.label}>Cargo / Função</Text>
      <TextInput style={sS.input} value={position} onChangeText={setPosition}
        placeholder="Ex: Rececionista Chefe" placeholderTextColor="#9CA3AF" />

      <Text style={sS.label}>Departamento *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {DEPARTMENTS.map(d => (
          <TouchableOpacity key={d.value} style={[sS.chip, department === d.value && sS.chipActive]}
            onPress={() => setDepartment(d.value)}>
            <Text style={[sS.chipText, department === d.value && sS.chipTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={sS.label}>Turno</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {SHIFTS.map(s => (
          <TouchableOpacity key={s.value} style={[sS.chip, shift === s.value && sS.chipActive]}
            onPress={() => setShift(s.value)}>
            <Text style={[sS.chipText, shift === s.value && sS.chipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={sS.label}>Telefone</Text>
      <TextInput style={sS.input} value={phone} onChangeText={setPhone}
        keyboardType="phone-pad" placeholder="+244 9XX XXX XXX" placeholderTextColor="#9CA3AF" />

      <Text style={sS.label}>Email</Text>
      <TextInput style={sS.input} value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
        placeholder="staff@hotel.ao" placeholderTextColor="#9CA3AF" />

      <Text style={sS.label}>PIN de acesso PMS (4–8 dígitos)</Text>
      <TextInput style={sS.input} value={pin} onChangeText={setPin}
        keyboardType="numeric" secureTextEntry maxLength={8}
        placeholder={initial ? '••••  (deixar vazio para manter)' : '1234'}
        placeholderTextColor="#9CA3AF" />

      <Text style={sS.sectionLabel}>Permissões</Text>
      <View style={sS.permRow}>
        <View style={{ flex: 1 }}>
          <Text style={sS.permLabel}>Cancelar reservas</Text>
          <Text style={sS.permSub}>Pode cancelar reservas confirmadas</Text>
        </View>
        <Switch value={canCancel} onValueChange={setCanCancel}
          trackColor={{ false: '#D1D5DB', true: COLORS.blue + '80' }}
          thumbColor={canCancel ? COLORS.blue : '#F9FAFB'} />
      </View>
      <View style={sS.permRow}>
        <View style={{ flex: 1 }}>
          <Text style={sS.permLabel}>Aplicar descontos</Text>
          <Text style={sS.permSub}>Pode lançar descontos no fólio</Text>
        </View>
        <Switch value={canDiscount} onValueChange={setCanDiscount}
          trackColor={{ false: '#D1D5DB', true: COLORS.blue + '80' }}
          thumbColor={canDiscount ? COLORS.blue : '#F9FAFB'} />
      </View>
      <View style={sS.permRow}>
        <View style={{ flex: 1 }}>
          <Text style={sS.permLabel}>Ver financeiro</Text>
          <Text style={sS.permSub}>Pode consultar receita e totais</Text>
        </View>
        <Switch value={canFinancials} onValueChange={setCanFinancials}
          trackColor={{ false: '#D1D5DB', true: COLORS.blue + '80' }}
          thumbColor={canFinancials ? COLORS.blue : '#F9FAFB'} />
      </View>

      <Text style={sS.sectionLabel}>Contacto de emergência</Text>
      <TextInput style={sS.input} value={emergencyName} onChangeText={setEmergencyName}
        placeholder="Nome do contacto" placeholderTextColor="#9CA3AF" />
      <TextInput style={[sS.input, { marginBottom: 4 }]} value={emergencyPhone} onChangeText={setEmergencyPhone}
        keyboardType="phone-pad" placeholder="Telefone de emergência" placeholderTextColor="#9CA3AF" />

      <Text style={sS.label}>Notas internas</Text>
      <TextInput style={[sS.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        value={notes} onChangeText={setNotes} multiline
        placeholder="Observações internas..." placeholderTextColor="#9CA3AF" />

      <View style={sS.formBtns}>
        <TouchableOpacity style={sS.cancelBtn} onPress={onCancel} disabled={loading}>
          <Text style={sS.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sS.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={sS.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Card de staff ────────────────────────────────────────────────────────────
function StaffCard({ member, onEdit, onToggle }) {
  const dc = DEPT_COLORS[member.department] || { color: '#6B7280', bg: '#F9FAFB' };
  return (
    <View style={[sS.card, !member.isActive && sS.cardInactive]}>
      <View style={sS.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={sS.cardName}>{member.fullName}</Text>
          {member.position
            ? <Text style={sS.cardPosition}>{member.position}</Text>
            : null}
        </View>
        <View style={[sS.deptBadge, { backgroundColor: dc.bg }]}>
          <Text style={[sS.deptBadgeText, { color: dc.color }]}>
            {getDeptLabel(member.department)}
          </Text>
        </View>
      </View>

      <View style={sS.cardMeta}>
        <View style={sS.cardMetaItem}>
          <Icon name="clock" size={12} color="#6B7280" strokeWidth={2} />
          <Text style={sS.cardMetaText}>{getShiftLabel(member.shift)}</Text>
        </View>
        {member.phone
          ? <View style={sS.cardMetaItem}>
              <Icon name="phone" size={12} color="#6B7280" strokeWidth={2} />
              <Text style={sS.cardMetaText}>{member.phone}</Text>
            </View>
          : null}
        {!member.isActive
          ? <View style={[sS.cardMetaItem, { backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
              <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Suspenso</Text>
            </View>
          : null}
      </View>

      {(member.canCancelBookings || member.canApplyDiscounts || member.canViewFinancials) && (
        <View style={sS.permChips}>
          {member.canCancelBookings  && <View style={sS.permChip}><Text style={sS.permChipText}>Cancelamentos</Text></View>}
          {member.canApplyDiscounts  && <View style={sS.permChip}><Text style={sS.permChipText}>Descontos</Text></View>}
          {member.canViewFinancials  && <View style={sS.permChip}><Text style={sS.permChipText}>Financeiro</Text></View>}
        </View>
      )}

      <View style={sS.cardActions}>
        <TouchableOpacity style={sS.editBtn} onPress={() => onEdit(member)}>
          <Icon name="edit" size={14} color={COLORS.blue} strokeWidth={2} />
          <Text style={sS.editBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[sS.toggleBtn, member.isActive ? sS.suspendBtn : sS.activateBtn]}
          onPress={() => onToggle(member)}>
          <Text style={[sS.toggleBtnText, { color: member.isActive ? '#DC2626' : '#22A06B' }]}>
            {member.isActive ? 'Suspender' : 'Reativar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function StaffManagementModal({ businessId, accessToken, onClose }) {
  const [staff,       setStaff]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [showForm,    setShowForm]   = useState(false);
  const [editTarget,  setEditTarget] = useState(null); // null = criar novo
  const [showInactive, setShowInactive] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await backendApi.getHtStaff(businessId, accessToken, showInactive);
      setStaff(Array.isArray(res) ? res : res?.data || []);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar o staff.');
    } finally {
      setLoading(false);
    }
  }, [businessId, accessToken, showInactive]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleSave(payload) {
    if (editTarget) {
      await backendApi.htUpdateStaff(editTarget.id, payload, accessToken);
    } else {
      await backendApi.htCreateStaff(payload, accessToken);
    }
    setShowForm(false);
    setEditTarget(null);
    await loadStaff();
  }

  async function handleToggle(member) {
    const action = member.isActive ? 'suspender' : 'reativar';
    Alert.alert(
      member.isActive ? 'Suspender funcionário' : 'Reativar funcionário',
      `Tem a certeza que deseja ${action} ${member.fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: member.isActive ? 'Suspender' : 'Reativar',
          style: member.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (member.isActive) {
                await backendApi.htSuspendStaff(member.id, accessToken);
              } else {
                await backendApi.htReactivateStaff(member.id, accessToken);
              }
              await loadStaff();
            } catch (e) {
              Alert.alert('Erro', e?.message || 'Operação falhou.');
            }
          },
        },
      ],
    );
  }

  function openEdit(member) {
    setEditTarget(member);
    setShowForm(true);
  }

  function openCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  // ── Contagens por departamento ──────────────────────────────────────────────
  const byDept = DEPARTMENTS.reduce((acc, d) => {
    acc[d.value] = staff.filter(m => m.department === d.value && m.isActive).length;
    return acc;
  }, {});

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={sS.container}>
        {/* Header */}
        <View style={sS.header}>
          <TouchableOpacity onPress={onClose} style={sS.backBtn}>
            <Icon name="chevronLeft" size={22} color={COLORS.blue} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={sS.headerTitle}>Gestão do Staff</Text>
            <Text style={sS.headerSub}>{staff.filter(m => m.isActive).length} activos</Text>
          </View>
          <TouchableOpacity style={sS.addBtn} onPress={openCreate}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {showForm ? (
          <StaffForm
            initial={editTarget}
            businessId={businessId}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
          />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Resumo por departamento */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sS.deptRow}>
              {DEPARTMENTS.filter(d => byDept[d.value] > 0).map(d => {
                const dc = DEPT_COLORS[d.value] || { color: '#6B7280', bg: '#F9FAFB' };
                return (
                  <View key={d.value} style={[sS.deptSummary, { backgroundColor: dc.bg }]}>
                    <Text style={[sS.deptSummaryCount, { color: dc.color }]}>{byDept[d.value]}</Text>
                    <Text style={[sS.deptSummaryLabel, { color: dc.color }]}>{d.label}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Toggle incluir suspensos */}
            <TouchableOpacity style={sS.inactiveToggle}
              onPress={() => setShowInactive(v => !v)}>
              <Icon name={showInactive ? 'eyeOff' : 'eye'} size={14} color={COLORS.blue} strokeWidth={2} />
              <Text style={sS.inactiveToggleText}>
                {showInactive ? 'Ocultar suspensos' : 'Mostrar suspensos'}
              </Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 48 }} />
            ) : staff.length === 0 ? (
              <View style={sS.empty}>
                <Icon name="users" size={40} color="#D1D5DB" strokeWidth={1.5} />
                <Text style={sS.emptyText}>Sem funcionários registados</Text>
                <TouchableOpacity style={sS.emptyBtn} onPress={openCreate}>
                  <Text style={sS.emptyBtnText}>Adicionar primeiro funcionário</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                {staff.map(m => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sS = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F8F9FA' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                      paddingVertical: 14, backgroundColor: '#fff',
                      borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  backBtn:          { padding: 4, marginRight: 8 },
  headerTitle:      { fontSize: 16, fontWeight: '800', color: '#111' },
  headerSub:        { fontSize: 12, color: '#8A8A8A', marginTop: 1 },
  addBtn:           { backgroundColor: COLORS.blue, width: 36, height: 36, borderRadius: 18,
                      alignItems: 'center', justifyContent: 'center' },

  // Departamentos summary
  deptRow:          { paddingHorizontal: 16, paddingVertical: 12 },
  deptSummary:      { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
                      borderRadius: 10, marginRight: 8, minWidth: 70 },
  deptSummaryCount: { fontSize: 20, fontWeight: '800' },
  deptSummaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  inactiveToggle:   { flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 16, paddingBottom: 8 },
  inactiveToggleText: { fontSize: 13, color: COLORS.blue, fontWeight: '600' },

  // Cards
  card:             { backgroundColor: '#fff', borderRadius: 12, padding: 14,
                      marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04,
                      shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  cardInactive:     { opacity: 0.6 },
  cardHeader:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardName:         { fontSize: 15, fontWeight: '700', color: '#111' },
  cardPosition:     { fontSize: 12, color: '#6B7280', marginTop: 2 },
  deptBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  deptBadgeText:    { fontSize: 11, fontWeight: '700' },
  cardMeta:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cardMetaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText:     { fontSize: 12, color: '#6B7280' },
  permChips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  permChip:         { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  permChipText:     { fontSize: 11, color: '#1565C0', fontWeight: '600' },
  cardActions:      { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 12, paddingVertical: 7,
                      borderWidth: 1, borderColor: COLORS.blue + '40', borderRadius: 8 },
  editBtnText:      { fontSize: 13, color: COLORS.blue, fontWeight: '600' },
  toggleBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  suspendBtn:       { borderColor: '#DC262630' },
  activateBtn:      { borderColor: '#22A06B30' },
  toggleBtnText:    { fontSize: 13, fontWeight: '600' },

  // Empty
  empty:            { alignItems: 'center', paddingTop: 60 },
  emptyText:        { fontSize: 15, color: '#9CA3AF', marginTop: 12, marginBottom: 20 },
  emptyBtn:         { backgroundColor: COLORS.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Form
  formScroll:       { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  formTitle:        { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 18 },
  label:            { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  sectionLabel:     { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 18, marginBottom: 10 },
  input:            { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
                      fontSize: 14, color: '#111', marginBottom: 12 },
  chip:             { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', marginRight: 8 },
  chipActive:       { borderColor: COLORS.blue, backgroundColor: COLORS.blue + '15' },
  chipText:         { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTextActive:   { color: COLORS.blue },
  permRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  permLabel:        { fontSize: 14, fontWeight: '600', color: '#111' },
  permSub:          { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  formBtns:         { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  cancelBtn:        { flex: 1, paddingVertical: 13, borderRadius: 10,
                      borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText:    { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveBtn:          { flex: 1, paddingVertical: 13, borderRadius: 10,
                      backgroundColor: COLORS.blue, alignItems: 'center' },
  saveBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
});
