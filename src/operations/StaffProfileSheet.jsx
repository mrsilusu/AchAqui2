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
import { backendApi } from '../lib/backendApi';
import {
  getRoleLabel, getRoleColor,
  PERMISSIONS_CATALOG, SECTION_LABELS, getSectionAccessForDept,
  SECTION_PERMISSIONS, STAFF_ROLES, getStaffRole, getDefaultPermsForDept,
} from '../lib/staffPermissions';

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
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Permissões locais (controladas por Switch)
  const [permissions, setPermissions] = useState(
    () => Object.fromEntries(PERMISSIONS_CATALOG.map((p) => [p.key, false])),
  );

  // Overrides de secção por staff (manager/GM pode editar)
  const [sectionOverrides, setSectionOverrides] = useState({});
  const [editingSection, setEditingSection]     = useState(null); // sectionKey | null

  // Role do viewer (quem está a gerir)
  const viewerRole   = getStaffRole(accessToken);
  const canEditSections = (
    viewerRole === STAFF_ROLES.HT_MANAGER ||
    viewerRole === STAFF_ROLES.GENERAL_MANAGER
  );

  useEffect(() => {
    if (staff) {
      setPermissions(
        Object.fromEntries(PERMISSIONS_CATALOG.map((p) => [p.key, !!staff[p.key]])),
      );
      setSectionOverrides(staff.sectionOverrides ?? {});
      setNewPin('');
      setShowSuspendBox(false);
      setSuspendReason('');
      setEditingSection(null);
    }
  }, [staff]);

  if (!staff) return null;

  const isActive = staff.isActive;

  // ── Alterar cargo ─────────────────────────────────────────────────────────
  const handleChangeRole = async (newDept) => {
    setSaving(true);
    try {
      const defaultPerms = getDefaultPermsForDept(newDept);
      await backendApi.htUpdateStaff(staff.id, businessId, {
        department: newDept,
        ...defaultPerms,
        sectionOverrides: null,
      }, accessToken);
      Alert.alert('Sucesso', 'Cargo atualizado. Permissões padrão do cargo aplicadas.');
      setShowRoleModal(false);
      onRefresh?.();
      onClose();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível alterar o cargo.');
    } finally {
      setSaving(false);
    }
  };

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

  // ── Guardar override de secção ────────────────────────────────────────────
  const handleSaveSectionOverride = async (sectionKey, enabledPerms) => {
    const newOverrides = { ...sectionOverrides, [sectionKey]: enabledPerms };
    setSaving(true);
    try {
      await backendApi.htUpdateStaff(staff.id, businessId, { sectionOverrides: newOverrides }, accessToken);
      setSectionOverrides(newOverrides);
      setEditingSection(null);
      Alert.alert('Sucesso', 'Acessos da secção actualizados.');
      onRefresh?.();
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Devolve as permissões iniciais a mostrar no modal de edição de secção
  const getInitialPermsForSection = (sectionKey) => {
    if (sectionKey in sectionOverrides) return sectionOverrides[sectionKey];
    const access = getSectionAccessForDept(staff.department);
    const defaultEnabled = !!(access && access[sectionKey]);
    if (defaultEnabled) return (SECTION_PERMISSIONS[sectionKey] ?? []).map((p) => p.key);
    return [];
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

            {/* CARGO E ACESSOS DE SECÇÃO */}
            <CargoSection
              department={staff.department}
              sectionOverrides={sectionOverrides}
              canEdit={canEditSections && isActive}
              onTilePress={(key) => setEditingSection(key)}
              onRoleBadgePress={() => setShowRoleModal(true)}
            />

            {/* PERMISSÕES OPERACIONAIS */}
            {isActive && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Permissões operacionais</Text>
                <Text style={s.permHint}>
                  Permissões individuais — substituem os padrões do cargo.
                </Text>
                {PERMISSIONS_CATALOG.map((p) => (
                  <PermSwitch
                    key={p.key}
                    label={p.label}
                    description={p.description}
                    value={permissions[p.key]}
                    onChange={(v) => setPermissions((prev) => ({ ...prev, [p.key]: v }))}
                  />
                ))}

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

      {/* MODAL DE PERMISSÕES POR SECÇÃO */}
      <SectionPermModal
        visible={editingSection !== null}
        sectionKey={editingSection ?? ''}
        sectionLabel={SECTION_LABELS[editingSection] ?? editingSection ?? ''}
        initialPerms={editingSection ? getInitialPermsForSection(editingSection) : []}
        onClose={() => setEditingSection(null)}
        onSave={(perms) => handleSaveSectionOverride(editingSection, perms)}
        saving={saving}
      />
      {/* MODAL DE ALTERAÇÃO DE CARGO */}
      <RoleChangeModal
        visible={showRoleModal}
        currentDept={staff.department}
        onClose={() => setShowRoleModal(false)}
        onSave={handleChangeRole}
        saving={saving}
      />
    </Modal>
  );
}

function CargoSection({ department, sectionOverrides = {}, canEdit = false, onTilePress, onRoleBadgePress }) {
  const roleLabel = getRoleLabel(department);
  const roleColor = getRoleColor(department);
  const sectionAccess = getSectionAccessForDept(department);

  const isSectionEnabled = (key) => {
    if (key in sectionOverrides) {
      const perms = sectionOverrides[key];
      return Array.isArray(perms) && perms.length > 0;
    }
    return !!(sectionAccess && sectionAccess[key]);
  };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Cargo e acessos</Text>
      {canEdit ? (
        <TouchableOpacity
          style={[s.roleBadge, { backgroundColor: roleColor.bg, flexDirection: 'row', alignItems: 'center' }]}
          onPress={onRoleBadgePress}
          activeOpacity={0.75}
        >
          <Text style={[s.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
          <Text style={{ color: roleColor.text, fontSize: 10, marginLeft: 5, opacity: 0.75 }}>✎</Text>
        </TouchableOpacity>
      ) : (
        <View style={[s.roleBadge, { backgroundColor: roleColor.bg }]}>
          <Text style={[s.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
        </View>
      )}
      <Text style={s.accessSubtitle}>
        {canEdit ? 'Toque numa secção para personalizar acessos:' : 'Secções disponíveis para este cargo:'}
      </Text>
      <View style={s.tilesRow}>
        {sectionAccess && Object.entries(sectionAccess).map(([key]) => {
          const enabled = isSectionEnabled(key);
          const isOverridden = key in sectionOverrides;
          const label = SECTION_LABELS[key] ?? key;
          if (canEdit) {
            return (
              <TouchableOpacity
                key={key}
                style={[s.tile, enabled ? s.tileOn : s.tileOff, isOverridden && s.tileOverridden]}
                onPress={() => onTilePress?.(key)}
                activeOpacity={0.75}
              >
                <Text style={[s.tileText, enabled ? s.tileTextOn : s.tileTextOff]}>
                  {label}{isOverridden ? ' ✏' : ''}
                </Text>
              </TouchableOpacity>
            );
          }
          return (
            <View key={key} style={[s.tile, enabled ? s.tileOn : s.tileOff]}>
              <Text style={[s.tileText, enabled ? s.tileTextOn : s.tileTextOff]}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.accessNote}>
        {canEdit
          ? 'Personalizações activas mostram ✏. Toque para editar permissões da secção.'
          : 'Os acessos de secção são definidos pelo cargo e não podem ser alterados individualmente.'}
      </Text>
    </View>
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

function PermSwitch({ label, description, value, onChange }) {
  return (
    <View style={s.permRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.permLabel}>{label}</Text>
        {description ? <Text style={s.permDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

// ─── SectionPermModal ─────────────────────────────────────────────────────────
function SectionPermModal({ visible, sectionKey, sectionLabel, initialPerms, onClose, onSave, saving }) {
  const allPerms = SECTION_PERMISSIONS[sectionKey] ?? [];
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) {
      setSelected(Array.isArray(initialPerms) ? [...initialPerms] : allPerms.map((p) => p.key));
    }
  }, [visible, sectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = allPerms.length > 0 && allPerms.every((p) => selected.includes(p.key));

  const toggleAll = () => setSelected(allSelected ? [] : allPerms.map((p) => p.key));

  const toggle = (key) =>
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sm.overlay}>
        <View style={sm.card}>
          <View style={sm.header}>
            <Text style={sm.title}>{sectionLabel}</Text>
            <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
              <Text style={sm.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={sm.subtitle}>Escolha as acções disponíveis para este funcionário.</Text>

          {/* TODOS */}
          <TouchableOpacity style={sm.todosRow} onPress={toggleAll}>
            <View style={[sm.check, allSelected && sm.checkActive]}>
              {allSelected ? <Text style={sm.checkTick}>✓</Text> : null}
            </View>
            <Text style={sm.todosLabel}>Todos</Text>
          </TouchableOpacity>
          <View style={sm.divider} />

          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            {allPerms.map((p) => {
              const isOn = selected.includes(p.key);
              return (
                <TouchableOpacity key={p.key} style={sm.permRow} onPress={() => toggle(p.key)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={sm.permLabel}>{p.label}</Text>
                    {p.description ? <Text style={sm.permDesc}>{p.description}</Text> : null}
                  </View>
                  <Switch
                    value={isOn}
                    onValueChange={() => toggle(p.key)}
                    trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </TouchableOpacity>
              );
            })}
            {allPerms.length === 0 && (
              <Text style={sm.emptyText}>Nenhuma permissão configurável para esta secção.</Text>
            )}
          </ScrollView>

          <View style={sm.actions}>
            <TouchableOpacity style={[sm.btn, sm.cancelBtn]} onPress={onClose}>
              <Text style={sm.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sm.btn, sm.saveBtn, saving && { opacity: 0.7 }]}
              onPress={() => onSave(selected)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={sm.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

  permHint:  { fontSize: 12, color: COLORS_REF.muted, marginBottom: 10, fontStyle: 'italic' },
  permRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  permLabel: { fontSize: 14, color: COLORS_REF.text, fontWeight: '600' },
  permDesc:  { fontSize: 12, color: COLORS_REF.muted, marginTop: 1 },

  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginBottom: 12,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '700' },

  accessSubtitle: { fontSize: 12, color: COLORS_REF.muted, marginBottom: 8 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tile: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
  },
  tileOn:      { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  tileOff:     { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  tileOverridden: { borderColor: '#93C5FD', borderWidth: 1.5 },
  tileText:    { fontSize: 11, fontWeight: '600' },
  tileTextOn:  { color: '#15803D' },
  tileTextOff: { color: '#94A3B8' },
  accessNote:  { fontSize: 11, color: COLORS_REF.muted, fontStyle: 'italic' },

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

// ─── RoleChangeModal ──────────────────────────────────────────────────────────
function RoleChangeModal({ visible, currentDept, onClose, onSave, saving }) {
  const [selectedDept, setSelectedDept] = useState(currentDept);

  useEffect(() => {
    if (visible) setSelectedDept(currentDept);
  }, [visible, currentDept]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sm.overlay}>
        <View style={sm.card}>
          <View style={sm.header}>
            <Text style={sm.title}>Alterar Cargo</Text>
            <TouchableOpacity onPress={onClose} style={sm.closeBtn}>
              <Text style={sm.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={sm.subtitle}>
            Selecione o novo cargo. As permissões padrão do cargo serão aplicadas automaticamente.
          </Text>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {Object.entries(DEPARTMENTS).map(([key, deptLabel]) => {
              const isSelected = selectedDept === key;
              const isCurrent = currentDept === key;
              const color = getRoleColor(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[rm.deptRow, isSelected && rm.deptRowSelected]}
                  onPress={() => setSelectedDept(key)}
                  activeOpacity={0.75}
                >
                  <View style={[rm.deptBadge, { backgroundColor: color.bg }]}>
                    <Text style={[rm.deptBadgeText, { color: color.text }]}>
                      {getRoleLabel(key)}
                    </Text>
                  </View>
                  <Text style={rm.deptLabel}>{deptLabel}{isCurrent ? ' (actual)' : ''}</Text>
                  {isSelected && <Text style={rm.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={sm.actions}>
            <TouchableOpacity style={[sm.btn, sm.cancelBtn]} onPress={onClose}>
              <Text style={sm.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sm.btn, sm.saveBtn, (saving || selectedDept === currentDept) && { opacity: 0.55 }]}
              onPress={() => onSave(selectedDept)}
              disabled={saving || selectedDept === currentDept}
            >
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={sm.saveBtnText}>Aplicar Cargo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  deptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  deptRowSelected: { backgroundColor: '#EFF6FF' },
  deptBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  deptBadgeText: { fontSize: 12, fontWeight: '700' },
  deptLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  checkmark: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
});

// ─── Styles do SectionPermModal ───────────────────────────────────────────────
const sm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', backgroundColor: COLORS.bg, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:        { fontSize: 16, fontWeight: '700', color: COLORS.text },
  closeBtn:     { padding: 4 },
  closeBtnText: { fontSize: 18, color: COLORS.muted },
  subtitle:     { fontSize: 12, color: COLORS.muted, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  todosRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  check: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkTick:    { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  todosLabel:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  divider:      { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginBottom: 4 },
  permRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  permLabel:    { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  permDesc:     { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  emptyText:    { fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 16, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row', gap: 8, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  btn:          { flex: 1, padding: 13, borderRadius: 10, alignItems: 'center' },
  cancelBtn:    { backgroundColor: COLORS.border },
  saveBtn:      { backgroundColor: COLORS.primary },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
  saveBtnText:   { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
