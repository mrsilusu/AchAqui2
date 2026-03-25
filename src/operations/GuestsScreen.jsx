import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  Modal, TextInput, FlatList, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Icon } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────
function parseMaybeDate(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d) ? null : d;
  if (typeof d === 'string') {
    const s = d.trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return isNaN(dt) ? null : dt;
    }
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = parseMaybeDate(d);
  if (!dt || isNaN(dt)) return '—';
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}
function fmtShort(d) {
  if (!d) return '—';
  const dt = parseMaybeDate(d);
  if (!dt || isNaN(dt)) return '—';
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function fmtMoney(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('pt-PT') + ' Kz';
}

// ─── Constantes de estado ──────────────────────────────────────────────────────────
const GUEST_STATUS = {
  in_house: { label: 'Em Casa',  color: '#166534', bg: '#DCFCE7' },
  upcoming: { label: 'Próximo',  color: '#1D4ED8', bg: '#DBEAFE' },
  past:     { label: 'Anterior', color: '#6B7280', bg: '#F3F4F6' },
};

// ─── Demo guests (shape API, usado quando a API devolve zero) ──────────────────────
const DEMO_GUESTS = [
  {
    id: 'demo_1', fullName: 'Ana Rodrigues', phone: '+244 912 111 222',
    email: null, nationality: 'Angolana', isVip: true, isBlacklisted: false,
    documentType: 'BI', documentNumber: '003456789AB000',
    preferences: 'Quarto alto, vista para o exterior', notes: 'Cliente frequente',
    bookings: [
      { id: 'db1', startDate: '2026-03-01', endDate: '2026-03-05',
        status: 'CHECKED_IN', totalPrice: 60000, roomType: { name: 'Suite' } },
      { id: 'db4', startDate: '2026-05-15', endDate: '2026-05-18',
        status: 'CONFIRMED',  totalPrice: 48000, roomType: { name: 'Suite' } },
    ],
  },
  {
    id: 'demo_2', fullName: 'Paulo Ferreira', phone: '+244 923 333 444',
    email: 'paulo@empresa.co.ao', nationality: 'Portuguesa',
    isVip: false, isBlacklisted: false,
    documentType: 'Passaporte', documentNumber: 'A1234567',
    preferences: '', notes: 'Viajante de negócios',
    bookings: [
      { id: 'db2', startDate: '2026-04-10', endDate: '2026-04-13',
        status: 'CONFIRMED', totalPrice: 45000, roomType: { name: 'Standard' } },
    ],
  },
  {
    id: 'demo_3', fullName: 'Luísa Mendes', phone: '+244 934 555 666',
    email: null, nationality: 'Angolana', isVip: false, isBlacklisted: false,
    documentType: 'BI', documentNumber: '007891234CD000',
    preferences: '', notes: '',
    bookings: [
      { id: 'db3', startDate: '2026-02-20', endDate: '2026-02-22',
        status: 'CHECKED_OUT', totalPrice: 30000, roomType: { name: 'Duplo' } },
    ],
  },
];

// ─── Status das reservas (API usa UPPERCASE) ─────────────────────────────────────────
function resolveBookingStatus(b) {
  const s = (b.status || '').toUpperCase();
  if (s === 'CHECKED_IN') return 'in_house';
  if (s === 'CONFIRMED' || s === 'PENDING') {
    const co = parseMaybeDate(b.endDate || b.checkOut);
    if (co && co > new Date()) return 'upcoming';
  }
  return 'past';
}

// ─── Métricas agregadas de um hóspede ──────────────────────────────────────────────────────
function computeGuestMeta(guest) {
  const bks = Array.isArray(guest.bookings) ? guest.bookings : [];
  const totalStays  = bks.length;
  const totalNights = bks.reduce((acc, b) => {
    const ci = parseMaybeDate(b.startDate || b.checkIn);
    const co = parseMaybeDate(b.endDate   || b.checkOut);
    if (ci && co) { const d = Math.round((co - ci) / 86400000); return acc + Math.max(0, d); }
    return acc;
  }, 0);
  const totalSpent = bks.reduce((acc, b) => acc + (Number(b.totalPrice) || 0), 0);
  const avgSpend   = totalStays > 0 ? Math.round(totalSpent / totalStays) : 0;
  const rtCount = {};
  for (const b of bks) {
    const rt = b.roomType?.name || '—';
    rtCount[rt] = (rtCount[rt] || 0) + 1;
  }
  const preferredRoom = Object.entries(rtCount).sort((a, x) => x[1] - a[1])[0]?.[0] || '—';
  let status = 'past';
  if (bks.some(b => resolveBookingStatus(b) === 'in_house'))   status = 'in_house';
  else if (bks.some(b => resolveBookingStatus(b) === 'upcoming')) status = 'upcoming';
  const sortedBks = [...bks].sort((a, x) =>
    (parseMaybeDate(a.startDate || a.checkIn)?.getTime() || 0) -
    (parseMaybeDate(x.startDate || x.checkIn)?.getTime() || 0),
  );
  const nextBooking   = bks.find(b => resolveBookingStatus(b) === 'upcoming') || null;
  const activeBooking = bks.find(b => resolveBookingStatus(b) === 'in_house') || null;
  const firstStay     = sortedBks[0] || null;
  const lastStay      = [...sortedBks].reverse().find(b => resolveBookingStatus(b) === 'past') || null;
  return { totalStays, totalNights, totalSpent, avgSpend, preferredRoom, status,
           nextBooking, activeBooking, firstStay, lastStay };
}

// ─── Avatar ──────────────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 44, status }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
  const bg = status === 'in_house' ? '#DCFCE7' : status === 'upcoming' ? '#DBEAFE' : '#F3F4F6';
  const tc = status === 'in_house' ? '#166534' : status === 'upcoming' ? '#1D4ED8' : '#6B7280';
  return (
    <View style={[gS.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[gS.avatarText, { color: tc, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

// ─── GuestCard ────────────────────────────────────────────────────────────────────────────
function GuestCard({ guest, meta, onPress }) {
  const st = GUEST_STATUS[meta.status] || GUEST_STATUS.past;
  return (
    <TouchableOpacity style={gS.card} onPress={onPress} activeOpacity={0.75}>
      <Avatar name={guest.fullName} status={meta.status} />
      <View style={gS.cardBody}>
        <View style={gS.cardRow}>
          <Text style={gS.cardName} numberOfLines={1}>
            {guest.fullName}{guest.isVip ? ' ⭐' : ''}
          </Text>
          <View style={[gS.badge, { backgroundColor: st.bg }]}>
            <Text style={[gS.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={gS.cardSub}>
          {meta.totalStays} estadia{meta.totalStays !== 1 ? 's' : ''} · {meta.totalNights} noite{meta.totalNights !== 1 ? 's' : ''}
          {guest.phone ? ` · ${guest.phone}` : ''}
        </Text>
        <View style={gS.cardFooter}>
          <Text style={gS.cardMoney}>{fmtMoney(meta.totalSpent)}</Text>
          {meta.activeBooking && (
            <Text style={[gS.cardNext, { color: '#166534' }]}>
              saída: {fmtShort(meta.activeBooking.endDate || meta.activeBooking.checkOut)}
            </Text>
          )}
          {!meta.activeBooking && meta.nextBooking && (
            <Text style={[gS.cardNext, { color: '#1D4ED8' }]}>
              próximo: {fmtShort(meta.nextBooking.startDate || meta.nextBooking.checkIn)}
            </Text>
          )}
          {!meta.activeBooking && !meta.nextBooking && meta.lastStay && (
            <Text style={gS.cardNext}>
              último: {fmtShort(meta.lastStay.startDate || meta.lastStay.checkIn)}
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevronRight" size={16} color="#CCC" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

// ─── Campo de formulário reutilizável ────────────────────────────────────────────────
function Field({ label, value, onChangeText, multiline, placeholder, keyboardType, autoCapitalize }) {
  return (
    <View style={eS.fieldWrap}>
      <Text style={eS.label}>{label}</Text>
      <TextInput
        style={[eS.input, multiline && eS.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder || ''}
        placeholderTextColor="#AAA"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
    </View>
  );
}

// ─── Modal de edição do hóspede ───────────────────────────────────────────────────────
const DOC_TYPES = ['BI', 'Passaporte', 'DIRE'];

function EditGuestModal({ guest, businessId, accessToken, onSave, onClose }) {
  const [form, setForm] = useState({
    fullName:       guest.fullName       || '',
    phone:          guest.phone          || '',
    email:          guest.email          || '',
    documentType:   guest.documentType   || '',
    documentNumber: guest.documentNumber || '',
    companyName:    guest.companyName    || '',
    nif:            guest.nif            || '',
    nationality:    guest.nationality    || '',
    dateOfBirth:    guest.dateOfBirth    ? fmtDate(guest.dateOfBirth) : '',
    address:        guest.address        || '',
    preferences:    guest.preferences   || '',
    notes:          guest.notes          || '',
    isVip:          !!guest.isVip,
    isBlacklisted:  !!guest.isBlacklisted,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.fullName.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true); setError('');
    try {
      let dob = null;
      if (form.dateOfBirth.trim()) {
        const dt = parseMaybeDate(form.dateOfBirth.trim());
        if (dt) dob = dt.toISOString();
      }
      const payload = {
        fullName:       form.fullName.trim(),
        phone:          form.phone.trim()          || null,
        email:          form.email.trim()          || null,
        documentType:   form.documentType.trim()   || null,
        documentNumber: form.documentNumber.trim() || null,
        companyName:    form.companyName.trim()    || null,
        nif:            form.nif.trim()            || null,
        nationality:    form.nationality.trim()    || null,
        dateOfBirth:    dob,
        address:        form.address.trim()        || null,
        preferences:    form.preferences.trim()    || null,
        notes:          form.notes.trim()          || null,
        isVip:          form.isVip,
        isBlacklisted:  form.isBlacklisted,
      };
      const updated = await backendApi.updateHtGuest(guest.id, businessId, payload, accessToken);
      onSave(updated || { ...guest, ...payload });
    } catch {
      setError('Erro ao guardar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={eS.root}>
          <View style={eS.header}>
            <TouchableOpacity onPress={onClose} style={gS.iconBtn}>
              <Icon name="x" size={22} color="#111" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={eS.headerTitle}>Editar Hóspede</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[eS.saveBtn, saving && { opacity: 0.6 }]}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={eS.saveBtnText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={eS.scroll} keyboardShouldPersistTaps="handled">
            {!!error && (
              <View style={eS.errorBanner}>
                <Icon name="alertCircle" size={14} color="#DC2626" strokeWidth={2} />
                <Text style={eS.errorText}>{error}</Text>
              </View>
            )}

            <Text style={eS.section}>Dados Pessoais</Text>
            <Field label="Nome Completo *" value={form.fullName} onChangeText={v => set('fullName', v)} />
            <Field label="Telefone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
            <Field label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Nacionalidade" value={form.nationality} onChangeText={v => set('nationality', v)} />
            <Field label="Data de Nascimento" value={form.dateOfBirth} onChangeText={v => set('dateOfBirth', v)} placeholder="DD/MM/AAAA" />
            <Field label="Morada" value={form.address} onChangeText={v => set('address', v)} multiline />

            <Text style={eS.section}>Identificação</Text>
            <View style={eS.fieldWrap}>
              <Text style={eS.label}>Tipo de Documento</Text>
              <View style={eS.segmented}>
                {DOC_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[eS.segBtn, form.documentType === t && eS.segBtnActive]}
                    onPress={() => set('documentType', form.documentType === t ? '' : t)}
                  >
                    <Text style={[eS.segText, form.documentType === t && eS.segTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Field label="Nº Documento" value={form.documentNumber} onChangeText={v => set('documentNumber', v)} />

            <Text style={eS.section}>Empresa</Text>
            <Field label="Empresa" value={form.companyName} onChangeText={v => set('companyName', v)} />
            <Field label="NIF" value={form.nif} onChangeText={v => set('nif', v)} keyboardType="numeric" />

            <Text style={eS.section}>Preferências e Notas</Text>
            <Field label="Preferências" value={form.preferences} onChangeText={v => set('preferences', v)} multiline placeholder="Ex: piso alto, cama king..." />
            <Field label="Notas" value={form.notes} onChangeText={v => set('notes', v)} multiline placeholder="Observações internas..." />

            <Text style={eS.section}>Estado</Text>
            <View style={eS.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={eS.switchLabel}>Hóspede VIP ⭐</Text>
                <Text style={eS.switchHint}>Destaque na lista de hóspedes</Text>
              </View>
              <Switch
                value={form.isVip}
                onValueChange={v => set('isVip', v)}
                trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                thumbColor={form.isVip ? '#D97706' : '#9CA3AF'}
              />
            </View>
            <View style={eS.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={eS.switchLabel}>Lista Negra</Text>
                <Text style={eS.switchHint}>Bloqueia futuras reservas</Text>
              </View>
              <Switch
                value={form.isBlacklisted}
                onValueChange={v => set('isBlacklisted', v)}
                trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
                thumbColor={form.isBlacklisted ? '#DC2626' : '#9CA3AF'}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── GuestProfile (detalhe — absoluteFill evita Modal aninhado) ────────────────────────
function GuestProfile({ guest, businessId, accessToken, onClose, onGuestUpdated }) {
  const [localGuest, setLocalGuest] = useState(guest);
  const [showEdit, setShowEdit]     = useState(false);

  const handleSaved = useCallback((updated) => {
    setLocalGuest(updated);
    setShowEdit(false);
    if (onGuestUpdated) onGuestUpdated(updated);
  }, [onGuestUpdated]);

  const meta = useMemo(() => computeGuestMeta(localGuest), [localGuest]);
  const st   = GUEST_STATUS[meta.status] || GUEST_STATUS.past;
  const sortedBks = useMemo(() =>
    [...(localGuest.bookings || [])].sort((a, b) =>
      (parseMaybeDate(b.startDate || b.checkIn)?.getTime() || 0) -
      (parseMaybeDate(a.startDate || a.checkIn)?.getTime() || 0),
    ),
    [localGuest.bookings],
  );

  return (
    <View style={[gS.root, StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      <View style={gS.root}>
        <View style={gS.headerSafe}>
          <View style={gS.header}>
            <TouchableOpacity onPress={onClose} style={gS.iconBtn}>
              <Icon name="x" size={22} color="#111" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={gS.headerTitle}>Perfil do Hóspede</Text>
            </View>
            <View style={gS.iconBtn} />
          </View>
        </View>

        <ScrollView contentContainerStyle={gS.scroll}>
          <View style={gS.profileCard}>
            <View style={gS.profileTop}>
              <Avatar name={localGuest.fullName} size={56} status={meta.status} />
              <View style={{ flex: 1 }}>
                <Text style={gS.profileName}>{localGuest.fullName}{localGuest.isVip ? ' ⭐' : ''}</Text>
                <View style={[gS.badge, { backgroundColor: st.bg, alignSelf: 'flex-start' }]}>
                  <Text style={[gS.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              {!String(localGuest.id).startsWith('demo_') && (
                <TouchableOpacity
                  onPress={() => setShowEdit(true)}
                  style={gS.editBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="edit2" size={16} color="#1D4ED8" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
            {!!localGuest.phone && (
              <View style={gS.profileRow}>
                <Icon name="phone" size={14} color="#888" strokeWidth={2} />
                <Text style={gS.profileInfo}>{localGuest.phone}</Text>
              </View>
            )}
            {!!localGuest.email && (
              <View style={gS.profileRow}>
                <Icon name="mail" size={14} color="#888" strokeWidth={2} />
                <Text style={gS.profileInfo}>{localGuest.email}</Text>
              </View>
            )}
            {!!localGuest.documentNumber && (
              <View style={gS.profileRow}>
                <Icon name="fileText" size={14} color="#888" strokeWidth={2} />
                <Text style={gS.profileInfo}>{localGuest.documentType || 'Doc'} · {localGuest.documentNumber}</Text>
              </View>
            )}
            {!!localGuest.nationality && (
              <View style={gS.profileRow}>
                <Icon name="globe" size={14} color="#888" strokeWidth={2} />
                <Text style={gS.profileInfo}>{localGuest.nationality}</Text>
              </View>
            )}
            {!!localGuest.companyName && (
              <View style={gS.profileRow}>
                <Icon name="briefcase" size={14} color="#888" strokeWidth={2} />
                <Text style={gS.profileInfo}>{localGuest.companyName}{localGuest.nif ? ` · NIF ${localGuest.nif}` : ''}</Text>
              </View>
            )}
          </View>

          <Text style={gS.sectionTitle}>Resumo</Text>
          <View style={gS.metricsRow}>
            <View style={gS.metricCard}>
              <Text style={gS.metricValue}>{meta.totalStays}</Text>
              <Text style={gS.metricLabel}>Estadias</Text>
            </View>
            <View style={gS.metricCard}>
              <Text style={gS.metricValue}>{meta.totalNights}</Text>
              <Text style={gS.metricLabel}>Noites</Text>
            </View>
            <View style={gS.metricCard}>
              <Text style={[gS.metricValue, { fontSize: 13 }]}>{fmtMoney(meta.avgSpend)}</Text>
              <Text style={gS.metricLabel}>Média/Estadia</Text>
            </View>
          </View>
          <View style={gS.metricsRow}>
            <View style={[gS.metricCard, { borderTopColor: '#22A06B' }]}>
              <Text style={[gS.metricValue, { color: '#166534', fontSize: 14 }]}>{fmtMoney(meta.totalSpent)}</Text>
              <Text style={gS.metricLabel}>Total Gasto</Text>
            </View>
            <View style={[gS.metricCard, { borderTopColor: '#7C3AED' }]}>
              <Text style={[gS.metricValue, { color: '#5B21B6', fontSize: 13 }]}>{meta.preferredRoom}</Text>
              <Text style={gS.metricLabel}>Tipo preferido</Text>
            </View>
          </View>

          {(meta.firstStay || meta.lastStay || meta.nextBooking) && (
            <View style={gS.datesCard}>
              {meta.firstStay && (
                <View style={gS.dateRow}>
                  <Text style={gS.dateLabel}>1ª Estadia</Text>
                  <Text style={gS.dateValue}>{fmtDate(meta.firstStay.startDate || meta.firstStay.checkIn)}</Text>
                </View>
              )}
              {meta.lastStay && (
                <View style={gS.dateRow}>
                  <Text style={gS.dateLabel}>Última Estadia</Text>
                  <Text style={gS.dateValue}>{fmtDate(meta.lastStay.startDate || meta.lastStay.checkIn)}</Text>
                </View>
              )}
              {meta.nextBooking && (
                <View style={gS.dateRow}>
                  <Text style={gS.dateLabel}>Próxima Chegada</Text>
                  <Text style={[gS.dateValue, { color: '#1D4ED8' }]}>{fmtDate(meta.nextBooking.startDate || meta.nextBooking.checkIn)}</Text>
                </View>
              )}
            </View>
          )}

          {!!localGuest.preferences && (
            <>
              <Text style={gS.sectionTitle}>Preferências</Text>
              <View style={gS.requestCard}>
                <Icon name="star" size={14} color="#D97706" strokeWidth={2} />
                <Text style={gS.requestText}>{localGuest.preferences}</Text>
              </View>
            </>
          )}
          {!!localGuest.notes && (
            <>
              <Text style={gS.sectionTitle}>Notas</Text>
              <View style={[gS.requestCard, { backgroundColor: '#F0F9FF', borderLeftColor: '#1D4ED8' }]}>
                <Icon name="fileText" size={14} color="#1D4ED8" strokeWidth={2} />
                <Text style={[gS.requestText, { color: '#1E3A5F' }]}>{localGuest.notes}</Text>
              </View>
            </>
          )}

          <Text style={gS.sectionTitle}>Histórico de Estadias</Text>
          {sortedBks.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#AAA', marginBottom: 8 }}>Sem estadias registadas.</Text>
          ) : (
            sortedBks.map((b, i) => {
              const bs  = resolveBookingStatus(b);
              const bst = GUEST_STATUS[bs] || GUEST_STATUS.past;
              return (
                <View key={b.id || i} style={gS.timelineItem}>
                  {i < sortedBks.length - 1 && <View style={gS.timelineLine} />}
                  <View style={[gS.stayDot, { backgroundColor: bst.color }]} />
                  <View style={gS.stayBody}>
                    <Text style={gS.stayRoom}>{b.roomType?.name || 'Quarto'}</Text>
                    <Text style={gS.stayDate}>{fmtDate(b.startDate || b.checkIn)} → {fmtDate(b.endDate || b.checkOut)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[gS.badge, { backgroundColor: bst.bg }]}>
                      <Text style={[gS.badgeText, { color: bst.color }]}>{bst.label}</Text>
                    </View>
                    {b.totalPrice != null && (
                      <Text style={gS.stayPrice}>{fmtMoney(b.totalPrice)}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {showEdit && (
        <EditGuestModal
          guest={localGuest}
          businessId={businessId}
          accessToken={accessToken}
          onSave={handleSaved}
          onClose={() => setShowEdit(false)}
        />
      )}
    </View>
  );
}

// ─── Ecrã principal ──────────────────────────────────────────────────────────────────────────────
export function GuestsScreen({ businessId, accessToken, onClose }) {
  const [guests, setGuests]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilter]         = useState('all');
  const [selectedGuest, setSelected]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (q = '') => {
    if (!businessId || !accessToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await backendApi.getHtGuests(businessId, accessToken, q);
      setGuests(Array.isArray(res) ? res : []);
    } catch {
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleSearch      = () => load(search.trim());
  const handleClearSearch = () => { setSearch(''); load(''); };

  const isDemo = !loading && guests.length === 0 && !search.trim();
  const source = isDemo ? DEMO_GUESTS : guests;

  const enriched = useMemo(() =>
    source.map(g => ({ ...g, _meta: computeGuestMeta(g) })),
    [source],
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterStatus !== 'all') list = list.filter(g => g._meta.status === filterStatus);
    return [...list].sort((a, b) => {
      const order = { in_house: 0, upcoming: 1, past: 2 };
      return (order[a._meta.status] ?? 9) - (order[b._meta.status] ?? 9);
    });
  }, [enriched, filterStatus]);

  const counts = useMemo(() => ({
    all:      enriched.length,
    in_house: enriched.filter(g => g._meta.status === 'in_house').length,
    upcoming: enriched.filter(g => g._meta.status === 'upcoming').length,
    past:     enriched.filter(g => g._meta.status === 'past').length,
  }), [enriched]);

  const openDetail = useCallback(async (guest) => {
    if (String(guest.id).startsWith('demo_')) { setSelected(guest); return; }
    setDetailLoading(true);
    try {
      const full = await backendApi.getHtGuest(guest.id, businessId, accessToken);
      setSelected(full || guest);
    } catch {
      setSelected(guest);
    } finally {
      setDetailLoading(false);
    }
  }, [businessId, accessToken]);

  const FILTERS = [
    ['all',      'Todos'],
    ['in_house', 'Em Casa'],
    ['upcoming', 'Próximos'],
    ['past',     'Anteriores'],
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={gS.root}>

        <View style={gS.headerSafe}>
          <View style={gS.header}>
            <TouchableOpacity onPress={onClose} style={gS.iconBtn}>
              <Icon name="x" size={22} color="#111" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={gS.headerTitle}>Hóspedes</Text>
              <Text style={gS.headerSub}>
                {loading ? 'A carregar…' : `${enriched.length} perfil${enriched.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={gS.iconBtn} />
          </View>
        </View>

        <View style={gS.searchWrap}>
          <Icon name="search" size={16} color="#999" strokeWidth={2} />
          <TextInput
            style={gS.searchInput}
            placeholder="Nome, telefone ou documento…"
            placeholderTextColor="#AAA"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Icon name="x" size={16} color="#999" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSearch}
              style={{ paddingHorizontal: 8, paddingVertical: 3,
                       backgroundColor: '#1D4ED8', borderRadius: 6 }}
            >
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>Buscar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isDemo && (
          <View style={gS.demoBanner}>
            <Icon name="info" size={13} color="#D97706" strokeWidth={2} />
            <Text style={gS.demoBannerText}>
              Dados de demonstração — perfis reais surgem após check-ins na Receção
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={gS.filterBar}
        >
          {FILTERS.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[gS.filterChip, filterStatus === key && gS.chipActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[gS.chipText, filterStatus === key && gS.chipTextActive]}>
                {label}{counts[key] > 0 ? ` (${counts[key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={gS.empty}>
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text style={gS.emptyHint}>A carregar hóspedes…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={gS.empty}>
            <Icon name="users" size={40} color="#CCC" strokeWidth={1.5} />
            <Text style={gS.emptyTitle}>
              {search.trim() || filterStatus !== 'all' ? 'Sem resultados' : 'Sem hóspedes'}
            </Text>
            <Text style={gS.emptyHint}>
              {search.trim()
                ? `Nenhum resultado para "${search}".`
                : filterStatus !== 'all'
                  ? 'Nenhum hóspede nesta categoria.'
                  : 'Os perfis surgem após check-ins registados na Receção.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={g => String(g.id)}
            contentContainerStyle={gS.list}
            renderItem={({ item }) => (
              <GuestCard guest={item} meta={item._meta} onPress={() => openDetail(item)} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {detailLoading && (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center', justifyContent: 'center', zIndex: 9998,
          }]}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {selectedGuest && (
          <GuestProfile
            guest={selectedGuest}
            businessId={businessId}
            accessToken={accessToken}
            onClose={() => setSelected(null)}
            onGuestUpdated={(updated) => {
              setSelected(updated);
              setGuests(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────────────────
const gS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F7F6F2' },
  headerSafe:   { backgroundColor: '#fff', paddingTop: 16,
                  borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, backgroundColor: '#fff' },
  iconBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:    { fontSize: 12, color: '#888', marginTop: 1 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12,
                  marginTop: 8, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 6,
                  backgroundColor: '#fff', borderRadius: 10,
                  borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  searchInput:  { flex: 1, fontSize: 13, color: '#111', padding: 0 },
  filterBar:    { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:   { height: 32, paddingHorizontal: 16, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive:   { backgroundColor: '#111827', borderColor: '#111827' },
  chipText:     { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },
  demoBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6,
                    marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6,
                    backgroundColor: '#FFFBEB', borderRadius: 8,
                    borderWidth: 1, borderColor: '#FDE68A' },
  demoBannerText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 15 },
  list:         { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 2 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  emptyHint:    { fontSize: 12, color: '#AAA', textAlign: 'center', lineHeight: 17 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                  borderRadius: 12, padding: 12, gap: 12,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  avatar:       { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontWeight: '700' },
  cardBody:     { flex: 1 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardName:     { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  cardSub:      { fontSize: 12, color: '#888', marginBottom: 4 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMoney:    { fontSize: 12, fontWeight: '700', color: '#166534' },
  cardNext:     { fontSize: 11, color: '#888' },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  scroll:       { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  marginTop: 8, marginBottom: 4 },
  profileCard:  { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  profileTop:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileName:  { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileInfo:  { fontSize: 13, color: '#555' },
  metricsRow:   { flexDirection: 'row', gap: 8 },
  metricCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12,
                  alignItems: 'center', gap: 4, borderTopWidth: 3, borderTopColor: '#E5E7EB',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  metricValue:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, color: '#111' },
  metricLabel:  { fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center' },
  datesCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10,
                  borderWidth: 1, borderColor: '#E5E7EB' },
  dateRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel:    { fontSize: 12, color: '#888', fontWeight: '600' },
  dateValue:    { fontSize: 13, fontWeight: '700', color: '#111' },
  requestCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                  backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
                  borderLeftWidth: 3, borderLeftColor: '#D97706' },
  requestText:  { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                  paddingVertical: 10, position: 'relative',
                  borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  timelineLine: { position: 'absolute', left: 4, top: 16, bottom: -10,
                  width: 2, backgroundColor: '#E5E7EB' },
  stayDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  stayBody:     { flex: 1 },
  stayRoom:     { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  stayDate:     { fontSize: 12, color: '#888' },
  stayPrice:    { fontSize: 12, fontWeight: '700', color: '#166534', marginTop: 3 },
  editBtn:      { width: 32, height: 32, borderRadius: 8, alignItems: 'center',
                  justifyContent: 'center', backgroundColor: '#EFF6FF',
                  borderWidth: 1, borderColor: '#BFDBFE' },
});

// ─── Estilos do modal de edição ───────────────────────────────────────────────────────
const eS = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#fff' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111' },
  saveBtn:      { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#1D4ED8',
                  borderRadius: 8, minWidth: 70, alignItems: 'center' },
  saveBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  scroll:       { padding: 16, gap: 4 },
  section:      { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase',
                  letterSpacing: 0.6, marginTop: 16, marginBottom: 6 },
  fieldWrap:    { marginBottom: 10 },
  label:        { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
  input:        { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
                  borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
                  fontSize: 14, color: '#111' },
  inputMulti:   { minHeight: 72, textAlignVertical: 'top' },
  segmented:    { flexDirection: 'row', gap: 8 },
  segBtn:       { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  segBtnActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  segText:      { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  segTextActive:{ color: '#fff' },
  switchRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  switchLabel:  { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 2 },
  switchHint:   { fontSize: 12, color: '#888' },
  errorBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10,
                  borderWidth: 1, borderColor: '#FECACA', marginBottom: 4 },
  errorText:    { flex: 1, fontSize: 12, color: '#DC2626' },
});
