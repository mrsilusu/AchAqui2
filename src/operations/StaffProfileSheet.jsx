/**
 * StaffProfileSheet
 * Vista individual de um funcionário — edição de permissões, reset de PIN,
 * suspensão/reativação e link para o log de atividade.
 *
 * Props:
 *   visible       boolean
 *   staff         object | null    — registo HtStaff
 *   businessId    string
 *   accessToken   string
 *   onClose       () => void
 *   onRefresh     () => void       — recarrega lista após alteração
 *   onOpenActivity (staff) => void — abre StaffActivityLog
 */
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import backendApi from '../lib/backendApi';

const DEPARTMENTS = {
  RECEPTION:    'Receção',
  HOUSEKEEPING: 'Limpeza',
  MAINTENANCE:  'Manutenção',
  MANAGEMENT:   'Gestão',
  SECURITY:     'Segurança',
  RESTAURANT:   'Restaurante',
};

const COLORS = {
  primary: '#1565C0', danger: '#DC2626', success: '#22A06B',
  warning: '#D97706', bg: '#F8FAFC', card: '#FFFFFF',
  border: '#E2E8F0', text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
};

export default function StaffProfileSheet({
  visible, staff, businessId, accessToken, onClose, onRefresh, onOpenActivity,
}) {
  const [saving, setSaving]       = useState(false);
  const [newPin, setNewPin]       = useState('');
  const [showPin, setShowPin]     = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendBox, setShowSuspendBox] = useState(false);

  // Permissões locais (controladas por Switch)
  const [permissions, setPermissions] = useState({
    canCancelBookings:  false,
    canApplyDiscounts:  false,
    canViewFinancials:  false,
  });

  useEffect(() => {
    if (staff) {
      setPermissions({
        canCancelBookings:  !!staff.canCancelBookings,
        canApplyDiscounts:  !!staff.canApplyDiscounts,
        canViewFinancials:  !!staff.canViewFinancials,
      });
      setNewPin('');
      setShowSuspendBox(false);
      setSuspendReason('');
    }
  }, [staff]);

  if (!staff) return null;

  const isActive = staff.isActive;

  // ── Guardar alterações de permissão ──────────────────────────────────────
  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await backendApi.htUpdateStaff(staff.id, businessId, permissions, accessToken);
      Alert.alert('Sucesso', 'Permissões atualizadas.');
      onRefresh?.();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset PIN ─────────────────────────────────────────────────────────────
  const handleResetPin = async () => {
    const pin = newPin.trim();
    if (!/^\d{4,8}$/.test(pin)) {
      Alert.alert('Erro', 'PIN deve ter 4–8 dígitos numéricos.');
      return;
    }
    setSaving(true);
    try {
      await backendApi.htUpdateStaff(staff.id, businessId, { pin }, accessToken);
      setNewPin('');
      setShowPin(false);
      Alert.alert('Sucesso', 'PIN atualizado com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível atualizar o PIN.');
    } finally {
      setSaving(false);
    }
  };

  // ── Suspender ─────────────────────────────────────────────────────────────
  const handleSuspend = async () => {
    const reason = suspendReason.trim();
    if (!reason) { Alert.alert('Erro', 'Indique o motivo da suspensão.'); return; }
    setSaving(true);
    try {
      await backendApi.htSuspendStaff(staff.id, businessId, reason, accessToken);
      Alert.alert('Suspenso', `${staff.fullName} foi suspenso.`);
      setShowSuspendBox(false);
      setSuspendReason('');
      onRefresh?.();
      onClose();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível suspender.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reativar ──────────────────────────────────────────────────────────────
  const handleReactivate = async () => {
    setSaving(true);
    try {
      await backendApi.htReactivateStaff(staff.id, businessId, accessToken);
      Alert.alert('Reativado', `${staff.fullName} foi reativado.`);
      onRefresh?.();
      onClose();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível reativar.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v) => v ? String(v) : '—';
  const fmtDate = (v) => {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString('pt-PT'); } catch { return String(v); }
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
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.title} numberOfLines={1}>{staff.fullName}</Text>
                {!isActive && (
                  <View style={s.suspendedBadge}>
                    <Text style={s.suspendedBadgeText}>SUSPENSO</Text>
                  </View>
                )}
              </View>
              <Text style={s.subtitle}>{DEPARTMENTS[staff.department] ?? staff.department}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* INFO BÁSICA */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Informação</Text>
              <Row label="Email"        value={fmt(staff.email)} />
              <Row label="Telemóvel"    value={fmt(staff.phone)} />
              <Row label="Doc. Tipo"    value={fmt(staff.documentType)} />
              <Row label="Doc. Nº"      value={fmt(staff.documentNumber)} />
              <Row label="Início"       value={fmtDate(staff.employmentStart)} />
              {staff.notes && <Row label="Notas" value={staff.notes} />}
              {!isActive && staff.suspensionReason && (
                <Row label="Motivo suspensão" value={staff.suspensionReason} danger />
              )}
            </View>

            {/* PERMISSÕES */}
            {isActive && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Permissões operacionais</Text>
                <PermSwitch
                  label="Pode cancelar reservas"
                  value={permissions.canCancelBookings}
                  onChange={(v) => setPermissions((p) => ({ ...p, canCancelBookings: v }))}
                />
                <PermSwitch
                  label="Pode aplicar descontos"
                  value={permissions.canApplyDiscounts}
                  onChange={(v) => setPermissions((p) => ({ ...p, canApplyDiscounts: v }))}
                />
                <PermSwitch
                  label="Pode ver dados financeiros"
                  value={permissions.canViewFinancials}
                  onChange={(v) => setPermissions((p) => ({ ...p, canViewFinancials: v }))}
                />

                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                  onPress={handleSavePermissions}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={s.actionBtnText}>Guardar permissões</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* RESET PIN */}
            {isActive && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>PIN de acesso</Text>
                {staff.lastPinChangedAt && (
                  <Text style={s.pinDate}>Último reset: {fmtDate(staff.lastPinChangedAt)}</Text>
                )}
                {showPin ? (
                  <>
                    <TextInput
                      style={s.input}
                      placeholder="Novo PIN (4–8 dígitos)"
                      value={newPin}
                      onChangeText={(v) => setNewPin(v.replace(/\D/g, '').slice(0, 8))}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={8}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.actionBtn, s.cancelBtnSm]}
                        onPress={() => { setShowPin(false); setNewPin(''); }}
                      >
                        <Text style={s.cancelBtnSmText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { flex: 1, backgroundColor: COLORS.success }]}
                        onPress={handleResetPin}
                        disabled={saving}
                      >
                        {saving
                          ? <ActivityIndicator color={COLORS.white} size="small" />
                          : <Text style={s.actionBtnText}>Confirmar PIN</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#475569' }]}
                    onPress={() => setShowPin(true)}
                  >
                    <Text style={s.actionBtnText}>Redefinir PIN</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* LOG DE ATIVIDADE */}
            <TouchableOpacity
              style={[s.section, s.logLink]}
              onPress={() => onOpenActivity && onOpenActivity(staff)}
            >
              <Text style={s.logLinkText}>Ver Log de Atividade →</Text>
            </TouchableOpacity>

            {/* SUSPENDER / REATIVAR */}
            <View style={s.section}>
              {isActive ? (
                <>
                  {!showSuspendBox ? (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: COLORS.danger }]}
                      onPress={() => setShowSuspendBox(true)}
                    >
                      <Text style={s.actionBtnText}>Suspender funcionário</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={s.suspendLabel}>Motivo da suspensão (obrigatório)</Text>
                      <TextInput
                        style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                        placeholder="Descreve o motivo…"
                        multiline
                        value={suspendReason}
                        onChangeText={setSuspendReason}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[s.actionBtn, s.cancelBtnSm]}
                          onPress={() => { setShowSuspendBox(false); setSuspendReason(''); }}
                        >
                          <Text style={s.cancelBtnSmText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, { flex: 1, backgroundColor: COLORS.danger }]}
                          onPress={handleSuspend}
                          disabled={saving}
                        >
                          {saving
                            ? <ActivityIndicator color={COLORS.white} size="small" />
                            : <Text style={s.actionBtnText}>Confirmar suspensão</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: COLORS.success }]}
                  onPress={handleReactivate}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={s.actionBtnText}>Reativar funcionário</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Row({ label, value, danger }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, danger && { color: COLORS.danger }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function PermSwitch({ label, value, onChange }) {
  return (
    <View style={s.permRow}>
      <Text style={s.permLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const COLORS_REF = COLORS;
const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS_REF.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '94%', flex: 1,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS_REF.border,
  },
  title:              { fontSize: 18, fontWeight: '700', color: COLORS_REF.text, flex: 1 },
  subtitle:           { fontSize: 13, color: COLORS_REF.muted, marginTop: 2 },
  closeBtn:           { padding: 6 },
  closeBtnText:       { fontSize: 18, color: COLORS_REF.muted },
  suspendedBadge: {
    backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  suspendedBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS_REF.danger },

  section: {
    backgroundColor: COLORS_REF.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS_REF.border,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS_REF.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel:  { fontSize: 13, color: COLORS_REF.muted, flex: 1 },
  rowValue:  { fontSize: 13, color: COLORS_REF.text, flex: 2, textAlign: 'right' },

  permRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  permLabel: { fontSize: 14, color: COLORS_REF.text, flex: 1, paddingRight: 8 },

  actionBtn: {
    padding: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText:  { color: COLORS_REF.white, fontWeight: '700', fontSize: 14 },
  cancelBtnSm:    { backgroundColor: COLORS_REF.border, flex: 0.6 },
  cancelBtnSmText: { color: COLORS_REF.muted, fontWeight: '600', fontSize: 14 },

  pinDate:       { fontSize: 12, color: COLORS_REF.muted, marginBottom: 8 },
  suspendLabel:  { fontSize: 13, color: COLORS_REF.danger, marginBottom: 6, fontWeight: '600' },

  input: {
    backgroundColor: COLORS_REF.bg, borderWidth: 1, borderColor: COLORS_REF.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS_REF.text, marginBottom: 8,
  },

  logLink:     { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', alignItems: 'center' },
  logLinkText: { fontSize: 14, color: COLORS_REF.primary, fontWeight: '600' },
});
