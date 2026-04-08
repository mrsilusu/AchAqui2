/**
 * StaffManagementModal
 * Lista completa do staff com filtros, criação e acesso ao perfil individual.
 *
 * Props:
 *   visible       boolean
 *   businessId    string
 *   accessToken   string
 *   onClose       () => void
 *   onOpenProfile (staff) => void   — abre StaffProfileSheet
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import backendApi from '../lib/backendApi';

// ─── Constantes ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'RECEPTION',    label: 'Receção' },
  { key: 'HOUSEKEEPING', label: 'Limpeza' },
  { key: 'MAINTENANCE',  label: 'Manutenção' },
  { key: 'MANAGEMENT',   label: 'Gestão' },
  { key: 'SECURITY',     label: 'Segurança' },
  { key: 'RESTAURANT',   label: 'Restaurante' },
];

const FILTERS = [
  { key: 'all',       label: 'Todos' },
  { key: 'active',    label: 'Ativos' },
  { key: 'suspended', label: 'Suspensos' },
];

const COLORS = {
  primary:  '#1565C0',
  danger:   '#DC2626',
  success:  '#22A06B',
  warning:  '#D97706',
  bg:       '#F8FAFC',
  card:     '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#1E293B',
  muted:    '#64748B',
  white:    '#FFFFFF',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StaffManagementModal({ visible, businessId, accessToken, onClose, onOpenProfile }) {
  const [staffList, setStaffList]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [filter, setFilter]               = useState('all');
  const [deptFilter, setDeptFilter]       = useState('');
  const [showCreate, setShowCreate]       = useState(false);
  const [creatingAccountId, setCreatingAccountId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', department: 'RECEPTION',
    pin: '', documentType: '', documentNumber: '', employmentStart: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!businessId || !accessToken) return;
    setLoading(true);
    try {
      const res = await backendApi.getHtStaff(businessId, accessToken);
      setStaffList(Array.isArray(res) ? res : []);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível carregar o staff.');
    } finally {
      setLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    if (visible) loadStaff();
  }, [visible, loadStaff]);

  // Filtered list
  const filtered = staffList.filter((s) => {
    if (filter === 'active'    && !s.isActive) return false;
    if (filter === 'suspended' &&  s.isActive) return false;
    if (deptFilter && s.department !== deptFilter) return false;
    return true;
  });

  const deptLabel = (key) => DEPARTMENTS.find((d) => d.key === key)?.label ?? key;

  const handleCreateAccount = useCallback(async (staff) => {
    if (creatingAccountId) return;
    setCreatingAccountId(staff.id);
    try {
      const res = await backendApi.htCreateStaffAccount(staff.id, businessId, accessToken);
      Alert.alert(
        res.isNew ? 'Conta criada' : 'Conta actualizada',
        `${res.fullName} pode agora entrar na app com o email:\n${res.email}`,
      );
      await loadStaff();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível criar a conta.');
    } finally {
      setCreatingAccountId(null);
    }
  }, [creatingAccountId, businessId, accessToken, loadStaff]);

  const handleCreate = async () => {
    const fullName = form.fullName.trim();
    const email    = form.email.trim().toLowerCase();
    if (fullName.length < 2) { Alert.alert('Erro', 'Nome inválido.'); return; }
    if (!email.includes('@'))  { Alert.alert('Erro', 'Email inválido.'); return; }
    if (form.pin && !/^\d{4,8}$/.test(form.pin)) {
      Alert.alert('Erro', 'PIN deve ter 4–8 dígitos.');
      return;
    }

    setSaving(true);
    try {
      await backendApi.htCreateStaff({
        businessId,
        fullName,
        email,
        phone:          form.phone.trim() || undefined,
        department:     form.department,
        pin:            form.pin || undefined,
        documentType:   form.documentType.trim() || undefined,
        documentNumber: form.documentNumber.trim() || undefined,
        employmentStart: form.employmentStart.trim() || undefined,
        notes:          form.notes.trim() || undefined,
      }, accessToken);

      setForm({ fullName: '', email: '', phone: '', department: 'RECEPTION',
                pin: '', documentType: '', documentNumber: '', employmentStart: '', notes: '' });
      setShowCreate(false);
      await loadStaff();
    } catch (e) {
      Alert.alert('Erro ao criar', e?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          {/* HEADER */}
          <View style={s.headerRow}>
            <Text style={s.title}>Gestão do Staff</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* FILTROS DE STATUS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, filter === f.key && s.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 12 }} />
            {DEPARTMENTS.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[s.filterChip, deptFilter === d.key && s.filterChipDept]}
                onPress={() => setDeptFilter(deptFilter === d.key ? '' : d.key)}
              >
                <Text style={[s.filterChipText, deptFilter === d.key && s.filterChipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* LISTA */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {filtered.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Nenhum funcionário encontrado.</Text>
                </View>
              )}

              {filtered.map((staff) => (
                <TouchableOpacity
                  key={staff.id}
                  style={s.staffCard}
                  onPress={() => onOpenProfile && onOpenProfile(staff)}
                  activeOpacity={0.85}
                >
                  <View style={s.staffCardLeft}>
                    <View style={[s.avatar, !staff.isActive && s.avatarSuspended]}>
                      <Text style={s.avatarText}>
                        {(staff.fullName || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.staffName} numberOfLines={1}>{staff.fullName}</Text>
                        {!staff.isActive && (
                          <View style={s.suspendedBadge}>
                            <Text style={s.suspendedBadgeText}>SUSPENSO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.staffEmail} numberOfLines={1}>{staff.email}</Text>
                      <Text style={s.staffDept}>{deptLabel(staff.department)}</Text>
                      {!staff.userId && staff.isActive && (
                        <TouchableOpacity
                          style={s.createAccountBtn}
                          onPress={(e) => { e.stopPropagation?.(); handleCreateAccount(staff); }}
                          disabled={creatingAccountId === staff.id}
                        >
                          {creatingAccountId === staff.id
                            ? <ActivityIndicator size="small" color={COLORS.primary} />
                            : <Text style={s.createAccountBtnText}>📲 Criar conta App</Text>
                          }
                        </TouchableOpacity>
                      )}
                      {staff.userId && (
                        <Text style={s.hasAccountText}>✓ Tem conta na app</Text>
                      )}
                    </View>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* BOTÃO CRIAR */}
          {!showCreate ? (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.addBtnText}>+ Novo Funcionário</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.createForm}>
              <Text style={s.createTitle}>Novo Funcionário</Text>
              <TextInput style={s.input} placeholder="Nome completo *" value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} />
              <TextInput style={s.input} placeholder="Email *" value={form.email}
                keyboardType="email-address" autoCapitalize="none"
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
              <TextInput style={s.input} placeholder="Telemóvel" value={form.phone}
                keyboardType="phone-pad"
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />

              <Text style={s.fieldLabel}>Departamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {DEPARTMENTS.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[s.deptChip, form.department === d.key && s.deptChipActive]}
                    onPress={() => setForm((f) => ({ ...f, department: d.key }))}
                  >
                    <Text style={[s.deptChipText, form.department === d.key && s.deptChipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={s.input} placeholder="PIN (4–8 dígitos, opcional)" value={form.pin}
                keyboardType="numeric" secureTextEntry maxLength={8}
                onChangeText={(v) => setForm((f) => ({ ...f, pin: v.replace(/\D/g, '') }))} />
              <TextInput style={s.input} placeholder="Tipo doc. (BI / Passaporte / DIRE)" value={form.documentType}
                onChangeText={(v) => setForm((f) => ({ ...f, documentType: v }))} />
              <TextInput style={s.input} placeholder="Nº documento" value={form.documentNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, documentNumber: v }))} />
              <TextInput style={s.input} placeholder="Início de emprego (AAAA-MM-DD)" value={form.employmentStart}
                onChangeText={(v) => setForm((f) => ({ ...f, employmentStart: v }))} />
              <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                placeholder="Notas" multiline value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity style={[s.formBtn, s.cancelBtn]} onPress={() => setShowCreate(false)}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.formBtn, s.saveBtn]} onPress={handleCreate} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={s.saveBtnText}>Criar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%', flex: 1,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:        { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 18, color: COLORS.muted },

  filterBar:    { paddingHorizontal: 16, paddingVertical: 10, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipDept:   { backgroundColor: '#F0FDF4', borderColor: COLORS.success },
  filterChipText:       { fontSize: 13, color: COLORS.muted },
  filterChipTextActive: { color: COLORS.white, fontWeight: '600' },

  emptyBox:  { alignItems: 'center', marginTop: 32 },
  emptyText: { fontSize: 15, color: COLORS.muted },

  staffCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  staffCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSuspended: { backgroundColor: '#9CA3AF' },
  avatarText:      { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  staffName:       { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  staffEmail:      { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  staffDept:       { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '500' },
  suspendedBadge: {
    backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  suspendedBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.danger },
  createAccountBtn: {
    marginTop: 6, backgroundColor: '#EFF6FF', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  createAccountBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  hasAccountText: { fontSize: 11, color: '#16A34A', marginTop: 4, fontWeight: '500' },
  chevron: { fontSize: 22, color: COLORS.muted },

  addBtn: {
    margin: 16, padding: 16, backgroundColor: COLORS.primary, borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },

  createForm:  { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  createTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  fieldLabel:  { fontSize: 13, color: COLORS.muted, marginBottom: 4, marginTop: 2 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, marginBottom: 8,
  },
  deptChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 6,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  deptChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  deptChipText:      { fontSize: 13, color: COLORS.muted },
  deptChipTextActive: { color: COLORS.white, fontWeight: '600' },

  formBtn:    { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtn:  { backgroundColor: COLORS.border },
  saveBtn:    { backgroundColor: COLORS.primary },
  cancelBtnText: { color: COLORS.muted,  fontWeight: '600', fontSize: 15 },
  saveBtnText:   { color: COLORS.white,  fontWeight: '700', fontSize: 15 },
});
