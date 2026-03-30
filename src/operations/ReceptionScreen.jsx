import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Alert, ActivityIndicator, RefreshControl, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';
import { FolioScreen } from './FolioScreen';

// ─── Modal: Prolongar estadia ─────────────────────────────────────────────────
function ExtendStayModal({ visible, booking, onConfirm, onClose }) {
  const [newDate, setNewDate] = useState('');
  const [isOpen, setIsOpen]  = useState(false);
  if (!booking) return null;
  const curOut = booking.endDate ? new Date(booking.endDate) : new Date();
  const minOut = new Date(curOut); minOut.setDate(minOut.getDate() + 1);
  const minStr = `${String(minOut.getDate()).padStart(2,'0')}/${String(minOut.getMonth()+1).padStart(2,'0')}/${minOut.getFullYear()}`;

  const toISO = (str) => {
    if (!str) return null;
    const [d, m, y] = str.split('/').map(Number);
    return new Date(Date.UTC(y, m-1, d, 12, 0, 0)).toISOString();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rpS.overlay}>
        <View style={rpS.sheet}>
          <View style={rpS.header}>
            <Text style={rpS.title}>Prolongar Estadia</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text style={rpS.sub}>
            Saída actual: {fmt(booking.endDate)}
            Selecciona a nova data de saída:
          </Text>
          <CalendarPickerSimple
            value={newDate}
            minDate={minStr}
            isOpen={isOpen}
            onToggle={() => setIsOpen(o => !o)}
            onChange={v => { setNewDate(v); setIsOpen(false); }}
          />
          <TouchableOpacity
            style={[rpS.skipBtn, { backgroundColor: newDate ? '#22A06B' : '#E5E7EB', marginTop: 16 }]}
            onPress={() => newDate && onConfirm(toISO(newDate))}
            disabled={!newDate}
          >
            <Text style={[rpS.skipBtnText, { color: newDate ? '#fff' : '#888', fontWeight: '700' }]}>
              Confirmar Nova Saída
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal: Alterar quarto ─────────────────────────────────────────────────────
function ChangeRoomModal({ visible, booking, rooms, onConfirm, onClose }) {
  if (!booking) return null;
  // Normalizar campo guest (backend devolve bookings[0].guestName)
  const normaliseRoom = r => ({
    ...r,
    guest: r.guest
      || r.bookings?.[0]?.guestName
      || (r.bookings?.[0]?.status === 'CHECKED_IN' ? 'Hóspede' : null),
  });
  const sameType = (rooms || [])
    .filter(r => r.roomType?.id === booking.roomTypeId && r.id !== booking.roomId)
    .map(normaliseRoom);
  const cleanRooms    = sameType.filter(r => r.status === 'CLEAN' && !r.guest);
  const occupiedRooms = sameType.filter(r => r.guest);
  const otherRooms    = sameType.filter(r => r.status === 'DIRTY' || r.status === 'MAINTENANCE');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rpS.overlay}>
        <View style={rpS.sheet}>
          <View style={rpS.header}>
            <Text style={rpS.title}>Alterar Quarto</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {sameType.length === 0 ? (
            <View style={rpS.empty}>
              <Text style={rpS.emptyText}>Sem outros quartos do mesmo tipo.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {/* Quartos livres */}
              {cleanRooms.map(r => (
                <TouchableOpacity key={r.id} style={rpS.roomRow} onPress={() => onConfirm(r.id, rooms)}>
                  <View style={rpS.roomInfo}>
                    <Text style={rpS.roomNum}>Nº {r.number}</Text>
                    {r.floor != null && <Text style={rpS.roomFloor}>Piso {r.floor}</Text>}
                  </View>
                  <View style={rpS.roomBadge}>
                    <View style={rpS.cleanDot} />
                    <Text style={rpS.cleanLabel}>Livre</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Quartos ocupados -- com aviso */}
              {occupiedRooms.map(r => (
                <TouchableOpacity key={r.id}
                  style={[rpS.roomRow, { backgroundColor: '#FFF7ED', borderLeftWidth: 3, borderLeftColor: '#F59E0B' }]}
                  onPress={() => onConfirm(r.id, rooms)}>
                  <View style={rpS.roomInfo}>
                    <Text style={rpS.roomNum}>Nº {r.number}</Text>
                    <Text style={[rpS.roomFloor, { color: '#D97706' }]}>
                      {r.guest ? `Ocupado · ${r.guest}` : 'Ocupado'}
                    </Text>
                  </View>
                  <View style={[rpS.roomBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[rpS.cleanLabel, { color: '#D97706' }]}>⚠️ Em uso</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Quartos indisponíveis -- apenas informativos */}
              {otherRooms.map(r => (
                <View key={r.id} style={[rpS.roomRow, { opacity: 0.45 }]}>
                  <View style={rpS.roomInfo}>
                    <Text style={rpS.roomNum}>Nº {r.number}</Text>
                    {r.floor != null && <Text style={rpS.roomFloor}>Piso {r.floor}</Text>}
                  </View>
                  <View style={[rpS.roomBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[rpS.cleanLabel, { color: '#9CA3AF' }]}>
                      {r.status === 'DIRTY' ? 'A limpar' : 'Manutenção'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── CalendarPicker simples para os modais ────────────────────────────────────
function CalendarPickerSimple({ value, minDate, maxDate, isOpen, onToggle, onChange }) {
  const parseD = (str) => {
    if (!str) return new Date();
    if (str.includes('/')) { const [d,m,y] = str.split('/').map(Number); return new Date(y, m-1, d); }
    return new Date(str);
  };
  const fmtD = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const base   = value ? parseD(value) : minDate ? parseD(minDate) : new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const minObj = minDate ? parseD(minDate) : null;
  const today  = new Date();

  const year = month.getFullYear(), m = month.getMonth();
  const first = new Date(year, m, 1).getDay();
  const days  = new Date(year, m+1, 0).getDate();
  const cells = Array(first).fill(null).concat(Array.from({length: days}, (_, i) => i+1));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({length: cells.length/7}, (_, i) => cells.slice(i*7, i*7+7));

  return (
    <View>
      <TouchableOpacity style={rpS.dateInput} onPress={onToggle}>
        <Text style={value ? rpS.dateInputVal : rpS.dateInputPH}>{value || 'Seleccionar data'}</Text>
        <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} color={COLORS.grayText} strokeWidth={2} />
      </TouchableOpacity>
      {isOpen && (
        <View style={rpS.calCard}>
          <View style={rpS.calNav}>
            <TouchableOpacity onPress={() => setMonth(new Date(year, m-1, 1))}>
              <Icon name="back" size={16} color={COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={rpS.calMonth}>{MONTHS[m]} {year}</Text>
            <TouchableOpacity onPress={() => setMonth(new Date(year, m+1, 1))}>
              <Icon name="chevronRight" size={16} color={COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-around',marginBottom:4}}>
            {DAYS.map(d => <Text key={d} style={rpS.calDayH}>{d}</Text>)}
          </View>
          {weeks.map((wk, wi) => (
            <View key={wi} style={{flexDirection:'row',justifyContent:'space-around',marginBottom:2}}>
              {wk.map((day, di) => {
                if (!day) return <View key={di} style={rpS.calEmpty} />;
                const d = new Date(year, m, day);
                const maxObj  = maxDate ? parseD(maxDate) : null;
                const disabled = (minObj && d < minObj) || (!maxDate && d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) || (maxObj && d > maxObj);
                const sel = value === fmtD(d);
                return (
                  <TouchableOpacity key={di}
                    style={[rpS.calDay, sel && rpS.calDaySel, disabled && rpS.calDayDis]}
                    disabled={disabled}
                    onPress={() => onChange(fmtD(d))}>
                    <Text style={[rpS.calDayT, sel && {color:'#fff'}, disabled && {color:'#ccc'}]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── DateScrollPicker — picker estilo slot (dia/mês/ano) ─────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ITEM_H = 48;
const VISIBLE = 3; // 3 itens visíveis (centro = seleccionado)

function ScrollColumn({ items, selectedIndex, onSelect }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && selectedIndex >= 0) {
      ref.current.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }
  }, []);

  return (
    <ScrollView
      ref={ref}
      style={{ height: ITEM_H * VISIBLE, flex: 1 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      nestedScrollEnabled={true}
      onScrollBeginDrag={e => e.stopPropagation?.()}
      onMomentumScrollEnd={e => {
        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        onSelect(clamped);
      }}
      contentContainerStyle={{ paddingVertical: ITEM_H }}
    >
      {items.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => {
            onSelect(i);
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
          }}>
          <Text style={{
            fontSize: i === selectedIndex ? 17 : 14,
            fontWeight: i === selectedIndex ? '700' : '400',
            color: i === selectedIndex ? '#111' : '#aaa',
          }}>{item}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function DateScrollPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);

  const parse = (v) => {
    if (!v) return { d: 17, m: 0, y: 1990 };
    const [dd, mm, yy] = v.split('/').map(Number);
    return { d: dd || 17, m: (mm || 1) - 1, y: yy || 1990 };
  };
  const { d, m, y } = parse(value);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 }, (_, i) => String(1901 + i)).reverse();
  const days  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const [dayIdx,   setDayIdx]   = React.useState(d - 1);
  const [monthIdx, setMonthIdx] = React.useState(m);
  const [yearIdx,  setYearIdx]  = React.useState(years.indexOf(String(y)) >= 0 ? years.indexOf(String(y)) : 0);

  // Guardar selecção temporária enquanto o picker está aberto
  const [tmpDay,   setTmpDay]   = React.useState(d - 1);
  const [tmpMonth, setTmpMonth] = React.useState(m);
  const [tmpYear,  setTmpYear]  = React.useState(years.indexOf(String(y)) >= 0 ? years.indexOf(String(y)) : 0);

  const displayVal = value
    ? `${days[dayIdx]} ${MONTHS_PT[monthIdx]} ${years[yearIdx]}`
    : 'Seleccionar data';

  const handleConfirm = () => {
    const dd = String(tmpDay + 1).padStart(2, '0');
    const mm = String(tmpMonth + 1).padStart(2, '0');
    const yy = years[tmpYear] || years[0];
    setDayIdx(tmpDay); setMonthIdx(tmpMonth); setYearIdx(tmpYear);
    onChange(`${dd}/${mm}/${yy}`);
    setOpen(false);
  };

  return (
    <View>
      {/* Botão de abertura */}
      <TouchableOpacity
        onPress={() => { setTmpDay(dayIdx); setTmpMonth(monthIdx); setTmpYear(yearIdx); setOpen(o => !o); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
                 padding: 12, backgroundColor: open ? '#EFF6FF' : '#F7F7F8',
                 borderRadius: 8, borderWidth: 1,
                 borderColor: open ? '#93C5FD' : value ? '#86EFAC' : '#E5E7EB' }}>
        <Text style={{ fontSize: 13 }}>📅</Text>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: value ? '600' : '400',
                       color: value ? '#111' : '#aaa' }}>{displayVal}</Text>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={COLORS.grayText} strokeWidth={2} />
      </TouchableOpacity>

      {/* Picker — só visível quando open */}
      {open && (
        <View style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden',
                       borderWidth: 1, borderColor: '#E5E7EB' }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#F7F7F8',
                         height: ITEM_H * VISIBLE }}>
            {/* Linha de destaque */}
            <View pointerEvents="none" style={{
              position: 'absolute', top: ITEM_H * 2, left: 0, right: 0,
              height: ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5,
              borderColor: '#93C5FD', zIndex: 1 }} />
            <ScrollColumn items={days}      selectedIndex={tmpDay}
              onSelect={i => setTmpDay(i)} />
            <ScrollColumn items={MONTHS_PT} selectedIndex={tmpMonth}
              onSelect={i => setTmpMonth(i)} />
            <ScrollColumn items={years}     selectedIndex={tmpYear}
              onSelect={i => setTmpYear(i)} />
          </View>
          {/* Botão confirmar */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={{ backgroundColor: '#1565C0', padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Confirmar Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Modal: Perfil de Hóspede ─────────────────────────────────────────────────
function GuestProfileModal({ visible, businessId, accessToken, prefilledName, prefilledPhone, initialGuestId, onLink, onClose }) {
  const [tab, setTab]         = useState('search'); // 'search' | 'create' | 'history'
  const [search, setSearch]   = useState('');
  const [guests, setGuests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm]       = useState({
    fullName: prefilledName || '', phone: prefilledPhone || '',
    email: '', documentType: 'BI', documentNumber: '',
    companyName: '', nif: '',
    nationality: 'Angolana', dateOfBirth: '', preferences: '', notes: '', isVip: false,
  });

  const loadGuestHistory = async (guestId) => {
    if (!guestId || !businessId || !accessToken) return;
    setHistoryLoading(true);
    try {
      const guest = await backendApi.getHtGuest(guestId, businessId, accessToken);
      setSelectedGuest(guest || null);
      setTab('history');
    } catch (e) {
      setSelectedGuest(null);
      Alert.alert('Erro', e?.message || 'Não foi possível carregar o histórico do hóspede.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setTab('search');
    setSelectedGuest(null);
    if (initialGuestId) {
      loadGuestHistory(initialGuestId);
    }
  }, [visible, initialGuestId]);


  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await backendApi.getHtGuests(businessId, accessToken, search);
      setGuests(Array.isArray(res) ? res : []);
    } catch { setGuests([]); }
    finally { setLoading(false); }
  };

  const doCreate = async () => {
    if (!form.fullName.trim()) { Alert.alert('Erro', 'Nome obrigatório.'); return; }
    if (!form.documentNumber.trim()) { Alert.alert('Erro', 'Documento obrigatório para criar perfil.'); return; }
    setLoading(true);
    try {
      const guest = await backendApi.createHtGuest({ ...form, businessId }, accessToken);
      onLink(guest);
    } catch (e) { Alert.alert('Erro', e?.message || 'Não foi possível criar o perfil.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rpS.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}>
        <View style={[rpS.sheet, { maxHeight: '85%' }]}>
          <View style={rpS.header}>
            <Text style={rpS.title}>Perfil de Hóspede</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[['search','Pesquisar'],['create','Novo'],['history','Histórico']].map(([k,l]) => (
              <TouchableOpacity key={k}
                style={[rpS.skipBtn, { flex: 1, marginTop: 0, backgroundColor: tab === k ? '#1565C0' : '#F7F7F8' }]}
                onPress={() => {
                  if (k === 'history' && !selectedGuest) {
                    Alert.alert('Histórico', 'Selecione um hóspede na pesquisa para ver o histórico.');
                    return;
                  }
                  setTab(k);
                }}>
                <Text style={[rpS.skipBtnText, { color: tab === k ? '#fff' : '#555' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'search' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  style={[rpS.dateInput, { flex: 1, marginTop: 0 }]}
                  placeholder="Nome, telefone ou documento..."
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={doSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[rpS.skipBtn, { marginTop: 0, paddingHorizontal: 16, backgroundColor: '#1565C0' }]}
                  onPress={doSearch}>
                  <Text style={[rpS.skipBtnText, { color: '#fff' }]}>Buscar</Text>
                </TouchableOpacity>
              </View>
              {loading ? <ActivityIndicator color={COLORS.blue} style={{ marginTop: 16 }} /> : (
                <ScrollView style={{ maxHeight: 280 }}>
                  {guests.length === 0 && search.trim() ? (
                    <Text style={[rpS.emptyText, { textAlign: 'left', marginTop: 8 }]}>
                      Sem resultados. Cria um novo perfil.
                    </Text>
                  ) : guests.map(g => (
                    <View key={g.id} style={[rpS.roomRow, { alignItems: 'flex-start', gap: 8 }]}> 
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => loadGuestHistory(g.id)}>
                        <Text style={rpS.roomNum}>{g.fullName}</Text>
                        <Text style={rpS.roomFloor}>
                          {g.phone || g.email || ''}
                          {g.isVip ? ' · ⭐ VIP' : ''}
                          {g.isBlacklisted ? ' · ⛔ Blacklist' : ''}
                        </Text>
                        {!!g.bookings?.length && (
                          <Text style={[rpS.roomFloor, { marginTop: 2 }]}>Últimas estadias: {g.bookings.length}</Text>
                        )}
                      </TouchableOpacity>
                      <View style={{ gap: 6 }}>
                        <TouchableOpacity
                          style={[rpS.skipBtn, { marginTop: 0, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#EEF2FF' }]}
                          onPress={() => loadGuestHistory(g.id)}>
                          <Text style={[rpS.skipBtnText, { color: '#3730A3' }]}>Histórico</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[rpS.skipBtn, { marginTop: 0, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#16A34A' }]}
                          onPress={() => onLink(g)}>
                          <Text style={[rpS.skipBtnText, { color: '#fff' }]}>Ligar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </>
          ) : tab === 'create' ? (
            <ScrollView style={{ maxHeight: 340 }}>
              {[
                ['fullName','Nome completo *','default'],
                ['phone','Telefone','phone-pad'],
                ['email','Email','email-address'],
                ['documentType','Tipo (BI / Passaporte / DIRE)','default'],
                ['documentNumber','Nº de Documento *','default'],
                ['companyName','Empresa','default'],
                ['nif','NIF','default'],
                ['nationality','Nacionalidade','default'],
                // dateOfBirth handled separately below
                ['preferences','Preferências / Pedidos','default'],
                ['notes','Notas internas','default'],
              ].map(([key, label, kbt]) => (
                <View key={key} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: '600' }}>{label}</Text>
                  <TextInput
                    style={rpS.dateInput}
                    value={form[key] || ''}
                    onChangeText={v => setForm(f => ({...f, [key]: v}))}
                    keyboardType={kbt}
                    autoCorrect={false}
                  />
                </View>
              ))}
              {/* Data de Nascimento */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: '600' }}>
                  Data de Nascimento
                </Text>
                <DateScrollPicker
                  value={form.dateOfBirth}
                  onChange={v => setForm(f => ({...f, dateOfBirth: v}))}
                />
              </View>

              {/* Toggle VIP */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
                         padding: 12, backgroundColor: form.isVip ? '#FFFBEB' : '#F7F7F8',
                         borderRadius: 8, borderWidth: 1,
                         borderColor: form.isVip ? '#FCD34D' : '#E5E7EB' }}
                onPress={() => setForm(f => ({...f, isVip: !f.isVip}))}>
                <Text style={{ fontSize: 16 }}>{form.isVip ? '⭐' : '☆'}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: form.isVip ? '#D97706' : '#555' }}>
                  {form.isVip ? 'Hóspede VIP' : 'Marcar como VIP'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rpS.skipBtn, { backgroundColor: '#22A06B', marginTop: 4 }]}
                onPress={doCreate}
                disabled={loading}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[rpS.skipBtnText, { color: '#fff', fontWeight: '700' }]}>Criar Perfil</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {historyLoading ? (
                <ActivityIndicator color={COLORS.blue} style={{ marginTop: 20 }} />
              ) : !selectedGuest ? (
                <Text style={[rpS.emptyText, { textAlign: 'left' }]}>Selecione um hóspede na aba de pesquisa.</Text>
              ) : (
                <>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{selectedGuest.fullName}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>
                      {selectedGuest.phone || 'Sem telefone'}
                      {selectedGuest.nationality ? ` · ${selectedGuest.nationality}` : ''}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>
                      Documento: {selectedGuest.documentType || '—'} {selectedGuest.documentNumber || '—'}
                    </Text>
                    {(selectedGuest.companyName || selectedGuest.nif) && (
                      <Text style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>
                        {selectedGuest.companyName ? `Empresa: ${selectedGuest.companyName}` : 'Empresa: —'}
                        {selectedGuest.nif ? ` · NIF: ${selectedGuest.nif}` : ''}
                      </Text>
                    )}
                    {!!selectedGuest.preferences && (
                      <Text style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>Preferências: {selectedGuest.preferences}</Text>
                    )}
                  </View>

                  {(() => {
                    const bookings = Array.isArray(selectedGuest.bookings) ? selectedGuest.bookings : [];
                    const finished = bookings.filter(b => b.status === 'CHECKED_OUT' || b.status === 'CHECKED_IN');
                    const totalStays = finished.length;
                    const totalSpent = finished.reduce((acc, b) => acc + (Number(b.totalPrice) || 0), 0);
                    const totalNights = finished.reduce((acc, b) => {
                      const n = Math.max(0, Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000));
                      return acc + n;
                    }, 0);
                    const loyaltyPoints = Math.max(0, Math.floor(totalSpent / 1000));
                    return (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <View style={{ flexGrow: 1, minWidth: 120, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 11, color: '#1E3A8A', fontWeight: '700' }}>Estadias</Text>
                          <Text style={{ fontSize: 18, color: '#1D4ED8', fontWeight: '800' }}>{totalStays}</Text>
                        </View>
                        <View style={{ flexGrow: 1, minWidth: 120, backgroundColor: '#ECFDF5', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '700' }}>Total Gasto</Text>
                          <Text style={{ fontSize: 18, color: '#059669', fontWeight: '800' }}>{Math.round(totalSpent).toLocaleString()} Kz</Text>
                        </View>
                        <View style={{ flexGrow: 1, minWidth: 120, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>Noites</Text>
                          <Text style={{ fontSize: 18, color: '#D97706', fontWeight: '800' }}>{totalNights}</Text>
                        </View>
                        <View style={{ flexGrow: 1, minWidth: 120, backgroundColor: '#F5F3FF', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 11, color: '#5B21B6', fontWeight: '700' }}>Pontos (L1)</Text>
                          <Text style={{ fontSize: 18, color: '#7C3AED', fontWeight: '800' }}>{loyaltyPoints}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[rpS.skipBtn, { flex: 1, marginTop: 0, backgroundColor: selectedGuest.isBlacklisted ? '#16A34A' : '#DC2626' }]}
                      onPress={async () => {
                        try {
                          const updated = await backendApi.updateHtGuest(
                            selectedGuest.id,
                            businessId,
                            { isBlacklisted: !selectedGuest.isBlacklisted },
                            accessToken,
                          );
                          setSelectedGuest(prev => ({ ...(prev || {}), ...(updated || {}) }));
                        } catch (e) {
                          Alert.alert('Erro', e?.message || 'Não foi possível atualizar blacklist.');
                        }
                      }}>
                      <Text style={[rpS.skipBtnText, { color: '#fff' }]}>
                        {selectedGuest.isBlacklisted ? 'Remover da Blacklist' : 'Adicionar à Blacklist'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[rpS.sub, { marginBottom: 8 }]}>Histórico de estadias</Text>
                  {(selectedGuest.bookings || []).length === 0 ? (
                    <Text style={rpS.emptyText}>Sem estadias registadas.</Text>
                  ) : (
                    (selectedGuest.bookings || []).map((b) => (
                      <View key={b.id} style={[rpS.roomRow, { paddingVertical: 10 }]}> 
                        <View style={{ flex: 1 }}>
                          <Text style={rpS.roomNum}>{fmt(b.startDate)} → {fmt(b.endDate)}</Text>
                          <Text style={rpS.roomFloor}>
                            {b.roomType?.name || 'Quarto'}{b.room?.number ? ` · Nº ${b.room.number}` : ''} · {b.status}
                            {b.totalPrice ? ` · ${Math.round(b.totalPrice).toLocaleString()} Kz` : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Modal de selecção de quarto para check-in ────────────────────────────────
function RoomPickerModal({ visible, rooms, roomTypeId, booking, existingBookings = [], businessId, accessToken, onSelect, onSkip, onClose }) {
  const [assignType, setAssignType] = useState('definitivo'); // 'definitivo' | 'temporario'
  const [note, setNote]             = useState('');
  const [guestName, setGuestName]   = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [documentType, setDocumentType] = useState('BI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nif, setNif] = useState('');
  const [nationality, setNationality] = useState('Angolana');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [foundGuest, setFoundGuest] = useState(null);
  const [searchingDoc, setSearchingDoc] = useState(false);
  const [docChecked, setDocChecked] = useState(false);
  const [blockedDoc, setBlockedDoc] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);

  const normalizeDoc = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '');

  const normalizeName = (v) =>
    String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const firstLast = (v) => {
    const parts = normalizeName(v).split(' ').filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    return { first: parts[0], last: parts[parts.length - 1] };
  };

  const fillFromGuest = (g) => {
    if (!g) return;
    setGuestName(g.fullName || g.name || guestName || '');
    setGuestPhone(g.phone || guestPhone || '');
    setDocumentType(g.documentType || documentType || 'BI');
    setDocumentNumber(g.documentNumber || documentNumber || '');
    setCompanyName(g.companyName || '');
    setNif(g.nif || '');
    setNationality(g.nationality || 'Angolana');
    if (g.dateOfBirth) {
      const d = new Date(g.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        setDateOfBirth(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
      }
    }
  };

  useEffect(() => {
    if (!visible) return;
    setAssignType('definitivo');
    setNote('');
    setGuestName(booking?.guestName || booking?.user?.name || '');
    setGuestPhone(booking?.guestPhone || '');
    setDocumentType(booking?.guestProfile?.documentType || 'BI');
    setDocumentNumber(booking?.guestProfile?.documentNumber || '');
    setCompanyName(booking?.guestProfile?.companyName || '');
    setNif(booking?.guestProfile?.nif || '');
    setNationality(booking?.guestProfile?.nationality || 'Angolana');
    if (booking?.guestProfile?.dateOfBirth) {
      const d = new Date(booking.guestProfile.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        setDateOfBirth(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
      } else {
        setDateOfBirth('');
      }
    } else {
      setDateOfBirth('');
    }
    setFoundGuest(null);
    setSearchingDoc(false);
    setDocChecked(false);
    setBlockedDoc('');
    setSelectedRoomId(null);
    setRoomDropdownOpen(false);
  }, [visible, booking]);

  const searchByDoc = async () => {
    const doc = normalizeDoc(documentNumber);
    if (!doc) {
      Alert.alert('Documento obrigatório', 'Introduza o número do documento e depois pesquise na base de dados.');
      return;
    }
    if (!businessId || !accessToken) {
      Alert.alert('Sessão inválida', 'Não foi possível validar o documento sem sessão activa.');
      return;
    }

    setSearchingDoc(true);
    try {
      const res = await backendApi.getHtGuests(businessId, accessToken, doc);
      const exact = (Array.isArray(res) ? res : []).find(g => normalizeDoc(g?.documentNumber) === doc);

      if (!exact) {
        setFoundGuest(null);
        setDocChecked(true);
        setBlockedDoc('');
        Alert.alert('Novo perfil', 'Documento não encontrado na BD. O check-in seguirá com criação de novo perfil.');
        return;
      }

      const reservationName = booking?.guestName || booking?.user?.name || guestName;
      const r = firstLast(reservationName);
      const db = firstLast(exact.fullName || exact.name);
      const sameIdentity = !!r.first && !!r.last && r.first === db.first && r.last === db.last;

      if (sameIdentity) {
        setFoundGuest(exact);
        fillFromGuest(exact);
        setDocChecked(true);
        setBlockedDoc('');
        Alert.alert('Perfil associado', 'Documento confirmado. Perfil existente associado automaticamente.');
        return;
      }

      Alert.alert(
        'Documento já existe',
        `Este documento pertence a ${exact.fullName || exact.name || 'outro hóspede'}. Deseja associar esta reserva ao perfil existente?`,
        [
          {
            text: 'Não',
            style: 'cancel',
            onPress: () => {
              setFoundGuest(null);
              setDocChecked(false);
              setBlockedDoc(doc);
              Alert.alert('Associação recusada', 'Para continuar, introduza um documento diferente.');
            },
          },
          {
            text: 'Sim, associar',
            onPress: () => {
              setFoundGuest(exact);
              fillFromGuest(exact);
              setDocChecked(true);
              setBlockedDoc('');
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível validar o documento na base de dados.');
      setDocChecked(false);
    } finally {
      setSearchingDoc(false);
    }
  };

  // Quartos CLEAN do tipo correcto
  const cleanRooms = (rooms || []).filter(r =>
    r.status === 'CLEAN' && r.roomType?.id === roomTypeId
  );
  // Quando não há CLEAN do mesmo tipo: mostrar todos os quartos de qualquer tipo
  const allRooms = cleanRooms.length === 0
    ? (rooms || [])  // todos os quartos disponíveis
    : cleanRooms;
  const noClean = cleanRooms.length === 0;

  const STATUS_BADGE = {
    CLEAN:       { label: 'Livre',      color: '#22A06B', bg: '#F0FDF4' },
    DIRTY:       { label: 'Sujo',       color: '#D97706', bg: '#FFFBEB' },
    CLEANING:    { label: 'A limpar',   color: '#1565C0', bg: '#EFF6FF' },
    MAINTENANCE: { label: 'Manutenção', color: '#DC2626', bg: '#FEF2F2' },
  };

  const toIsoDate = (v) => {
    const s = String(v || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/').map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0)).toISOString();
    }
    return null;
  };

  const buildGuestPayload = () => {
    const doc = normalizeDoc(documentNumber);
    if (!doc) {
      Alert.alert('Documento obrigatório', 'Preenche o número do documento (BI/Passaporte/DIRE) para concluir o check-in.');
      return null;
    }

    if (blockedDoc && blockedDoc === doc) {
      Alert.alert('Documento bloqueado', 'Este documento já existe na BD e a associação foi recusada. Use um documento diferente.');
      return null;
    }

    if (!docChecked) {
      Alert.alert('Validação obrigatória', 'Pesquise e valide o documento na BD antes de concluir o check-in.');
      return null;
    }

    const currentBookingId = booking?.id || null;
    const associatedGuestId = foundGuest?.id || booking?.guestProfile?.id || booking?.guestId || null;
    const duplicate = (existingBookings || []).find((b) => {
      if (!b || b.id === currentBookingId) return false;
      const bDoc = normalizeDoc(b?.guestProfile?.documentNumber || b?.docNumber || '');
      if (!bDoc || bDoc !== doc) return false;
      const bGuestId = b?.guestProfile?.id || b?.guestId || null;
      if (associatedGuestId && bGuestId && associatedGuestId === bGuestId) return false;
      return true;
    });
    if (duplicate) {
      Alert.alert(
        'Documento já utilizado',
        `O documento ${doc} já está associado a outro hóspede (reserva ${duplicate?.id || '—'}).`,
      );
      return null;
    }

    const payload = {
      guestName: guestName.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
      documentType: documentType.trim() || 'BI',
      documentNumber: doc,
      companyName: companyName.trim() || undefined,
      nif: nif.trim() || undefined,
      nationality: nationality.trim() || undefined,
      dateOfBirth: toIsoDate(dateOfBirth),
      _linkGuestProfileId: foundGuest?.id || undefined,
    };
    if (dateOfBirth.trim() && !payload.dateOfBirth) {
      Alert.alert('Data inválida', 'A data de nascimento deve estar no formato DD/MM/AAAA ou AAAA-MM-DD.');
      return null;
    }
    return payload;
  };

  const handleSelect = () => {
    const guestPayload = buildGuestPayload();
    if (!guestPayload) return;
    onSelect(selectedRoomId, assignType, note.trim() || null, guestPayload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rpS.overlay}>
        <View style={[rpS.sheet, { maxHeight: '90%' }]}>
          <View style={rpS.header}>
            <Text style={rpS.title}>Atribuir Quarto</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled>

          {noClean && (
            <View style={{ backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginBottom: 12,
                           borderWidth: 1, borderColor: '#FCD34D' }}>
              <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600' }}>
                ⚠️ Sem quartos limpos disponíveis para este tipo.
              </Text>
              <Text style={{ fontSize: 11, color: '#D97706', marginTop: 3 }}>
                Podes atribuir outro quarto manualmente.
              </Text>
            </View>
          )}

          {/* Badge Temporário / Definitivo */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {['definitivo', 'temporario'].map(t => (
              <TouchableOpacity
                key={t}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
                         backgroundColor: assignType === t ? '#1565C0' : '#F7F7F8',
                         borderWidth: 1, borderColor: assignType === t ? '#1565C0' : '#E5E7EB' }}
                onPress={() => setAssignType(t)}>
                <Text style={{ fontSize: 12, fontWeight: '700',
                               color: assignType === t ? '#fff' : '#555' }}>
                  {t === 'definitivo' ? '✅ Definitivo' : '⏳ Temporário'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nota de atribuição */}
          {assignType === 'temporario' && (
            <TextInput
              style={[rpS.dateInput, { marginBottom: 10, marginTop: 0 }]}
              placeholder="Motivo / nota da atribuição temporária..."
              value={note}
              onChangeText={setNote}
              autoCorrect={false}
            />
          )}

          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>Identificação do hóspede (obrigatório)</Text>
            <Text style={{ fontSize: 11, color: '#1E40AF', marginTop: 3 }}>
              Sem documento o check-in não pode ser concluído.
            </Text>
          </View>

          <Text style={rpS.fieldLabel}>Nome do hóspede</Text>
          <TextInput
            style={[rpS.dateInput, { marginTop: 0, marginBottom: 8 }]}
            placeholder="Nome completo"
            value={guestName}
            onChangeText={setGuestName}
            autoCorrect={false}
          />

          <Text style={rpS.fieldLabel}>Telefone</Text>
          <TextInput
            style={[rpS.dateInput, { marginTop: 0, marginBottom: 8 }]}
            placeholder="Telefone"
            value={guestPhone}
            onChangeText={setGuestPhone}
            keyboardType="phone-pad"
            autoCorrect={false}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>Tipo de documento</Text>
              <TextInput
                style={[rpS.dateInput, { marginTop: 0 }]}
                placeholder="BI / Passaporte / DIRE"
                value={documentType}
                onChangeText={setDocumentType}
                autoCorrect={false}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>Nº documento *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[rpS.dateInput, { flex: 1, marginTop: 0 }]}
                  placeholder="Obrigatório"
                  value={documentNumber}
                  onChangeText={(v) => {
                    setDocumentNumber(v);
                    setDocChecked(false);
                    setFoundGuest(null);
                  }}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[rpS.skipBtn, { marginTop: 0, paddingHorizontal: 12, backgroundColor: '#1565C0' }]}
                  onPress={searchByDoc}
                  disabled={searchingDoc}>
                  {searchingDoc
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={[rpS.skipBtnText, { color: '#fff' }]}>Buscar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {foundGuest ? (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>✅ Perfil associado</Text>
              <Text style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{foundGuest.fullName || foundGuest.name || 'Hóspede'}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>Nacionalidade</Text>
              <TextInput
                style={[rpS.dateInput, { marginTop: 0 }]}
                placeholder="Nacionalidade"
                value={nationality}
                onChangeText={setNationality}
                autoCorrect={false}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>Nascimento</Text>
              <TextInput
                style={[rpS.dateInput, { marginTop: 0 }]}
                placeholder="DD/MM/AAAA"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>Empresa</Text>
              <TextInput
                style={[rpS.dateInput, { marginTop: 0 }]}
                placeholder="Empresa (opcional)"
                value={companyName}
                onChangeText={setCompanyName}
                autoCorrect={false}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rpS.fieldLabel}>NIF</Text>
              <TextInput
                style={[rpS.dateInput, { marginTop: 0 }]}
                placeholder="NIF (opcional)"
                value={nif}
                onChangeText={setNif}
                autoCorrect={false}
              />
            </View>
          </View>

          <Text style={rpS.sub}>
            {noClean ? 'Todos os quartos deste tipo:' : 'Quartos disponíveis:'}
          </Text>

          {/* Room dropdown picker */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F7F7F8',
                     borderRadius: 8, borderWidth: 1,
                     borderColor: selectedRoomId ? '#1565C0' : '#E5E7EB', marginBottom: 4 }}
            onPress={() => setRoomDropdownOpen(v => !v)}
            activeOpacity={0.8}>
            {selectedRoomId ? (() => {
              const sr = (noClean ? allRooms : cleanRooms).find(r => r.id === selectedRoomId);
              const st = STATUS_BADGE[sr?.status] || STATUS_BADGE.CLEAN;
              return (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>Nº {sr?.number}</Text>
                    <Text style={{ fontSize: 12, color: '#888' }}>
                      {sr?.roomType?.name || 'Quarto'}{sr?.floor != null ? ` · Piso ${sr?.floor}` : ''}
                    </Text>
                  </View>
                  <View style={[rpS.roomBadge, { backgroundColor: st.bg, marginRight: 8 }]}>
                    <View style={[rpS.cleanDot, { backgroundColor: st.color }]} />
                    <Text style={[rpS.cleanLabel, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Icon name={roomDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
                </>
              );
            })() : (
              <>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Toque para selecionar quarto...</Text>
                <Icon name={roomDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
              </>
            )}
          </TouchableOpacity>

          {roomDropdownOpen && (
            <ScrollView
              style={{ maxHeight: 200, borderWidth: 1, borderColor: '#E5E7EB',
                       borderRadius: 8, marginBottom: 8 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled">
              {(noClean ? allRooms : cleanRooms).map(r => {
                const st = STATUS_BADGE[r.status] || STATUS_BADGE.CLEAN;
                const isSel = r.id === selectedRoomId;
                return (
                  <TouchableOpacity key={r.id}
                    style={[rpS.roomRow, { paddingHorizontal: 12,
                                          backgroundColor: isSel ? '#EFF6FF' : '#fff' }]}
                    onPress={() => { setSelectedRoomId(r.id); setRoomDropdownOpen(false); }}>
                    <View style={rpS.roomInfo}>
                      <Text style={rpS.roomNum}>Nº {r.number}</Text>
                      <Text style={rpS.roomFloor}>
                        {r.roomType?.name || 'Quarto'}
                        {r.floor != null ? ` · Piso ${r.floor}` : ''}
                        {r.roomType?.id !== roomTypeId ? ' ⚠️' : ''}
                      </Text>
                    </View>
                    <View style={[rpS.roomBadge, { backgroundColor: st.bg }]}>
                      <View style={[rpS.cleanDot, { backgroundColor: st.color }]} />
                      <Text style={[rpS.cleanLabel, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedRoomId ? (
            <TouchableOpacity
              style={[rpS.skipBtn, { marginTop: 8, backgroundColor: '#1565C0' }]}
              onPress={handleSelect}>
              <Text style={[rpS.skipBtnText, { color: '#fff' }]}>✅ Confirmar Check-In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={rpS.skipBtn} onPress={() => {
              const guestPayload = buildGuestPayload();
              if (!guestPayload) return;
              onSkip(guestPayload);
            }}>
              <Text style={rpS.skipBtnText}>
                {noClean ? 'Continuar sem atribuir quarto' : 'Atribuir automaticamente'}
              </Text>
            </TouchableOpacity>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const rpS = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
                padding: 20, paddingBottom: 32 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title:      { fontSize: 16, fontWeight: '700', color: '#111' },
  sub:        { fontSize: 13, color: '#666', marginBottom: 12 },
  empty:      { alignItems: 'center', paddingVertical: 20 },
  emptyText:  { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 },
  roomRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  roomInfo:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomNum:    { fontSize: 15, fontWeight: '700', color: '#111' },
  roomFloor:  { fontSize: 12, color: '#888' },
  roomBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cleanDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22A06B' },
  cleanLabel: { fontSize: 12, fontWeight: '600', color: '#22A06B' },
  skipBtn:    { marginTop: 16, alignItems: 'center', paddingVertical: 12,
                backgroundColor: '#F7F7F8', borderRadius: 8 },
  skipBtnText:{ fontSize: 13, fontWeight: '600', color: '#555' },
  fieldLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700', marginBottom: 4 },
  // CalendarPickerSimple
  dateInput:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F7F7F8',
                borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  dateInputVal:{ fontSize: 13, fontWeight: '600', color: '#111' },
  dateInputPH: { fontSize: 13, color: '#888' },
  calCard:    { marginTop: 8, backgroundColor: '#fff', borderRadius: 10,
                borderWidth: 1, borderColor: '#E5E7EB', padding: 10 },
  calNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calMonth:   { fontSize: 14, fontWeight: '700', color: '#111' },
  calDayH:    { width: 32, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#888' },
  calEmpty:   { width: 32, height: 32 },
  calDay:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calDaySel:  { backgroundColor: '#D32323' },
  calDayDis:  { opacity: 0.3 },
  calDayT:    { fontSize: 13, color: '#111', fontWeight: '500' },
});

const STATUS = {
  PENDING:     { label: 'Pendente',   color: '#D97706', bg: '#FFFBEB' },
  CONFIRMED:   { label: 'Confirmada', color: '#1565C0', bg: '#EFF6FF' },
  CHECKED_IN:  { label: 'Em Casa',    color: '#22A06B', bg: '#F0FDF4' },
  CHECKED_OUT: { label: 'Checkout',   color: '#6B7280', bg: '#F9FAFB' },
  NO_SHOW:     { label: 'No-Show',    color: '#DC2626', bg: '#FEF2F2' },
  CANCELLED:   { label: 'Cancelada',  color: '#7C3AED', bg: '#F5F3FF' },
};

const TABS = [
  { key: 'arrivals',   label: 'Chegadas (7d)', icon: 'reservation' },
  { key: 'departures', label: 'Saídas (7d)',   icon: 'arrow'       },
  { key: 'guests',     label: 'Em Casa',        icon: 'hotel'       },
];

function fmt(dateStr, mode = 'date') {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (mode === 'time') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function nights(s, e) {
  if (!s || !e) return 0;
  return Math.round((new Date(e) - new Date(s)) / 86400000);
}

// ─── Card de reserva individual ───────────────────────────────────────────────
function BookingCard({ booking, tab, roomTypes, onAction, actionLoading }) {
  const [open, setOpen] = useState(false);
  const st   = STATUS[booking.status] || STATUS.PENDING;
  const room = roomTypes?.find(r => r.id === booking.roomTypeId);
  const nts  = nights(booking.startDate, booking.endDate);
  const busy = actionLoading === booking.id;

  return (
    <View style={[rS.card, { borderLeftColor: st.color }]}>

      {/* ── Resumo — sempre visível ── */}
      <TouchableOpacity style={rS.cardHead} onPress={() => setOpen(p => !p)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={rS.guestName} numberOfLines={1}>
            {booking.guestName || booking.user?.name || 'Hóspede'}
          </Text>
          <Text style={rS.guestSub}>
            {room?.name || 'Quarto'}
            {booking.room?.number ? ` · Nº ${booking.room.number}` : ''}
            {' · '}{nts} noite{nts !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={rS.cardHeadRight}>
          <View style={[rS.badge, { backgroundColor: st.bg }]}>
            <Text style={[rS.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} color={COLORS.grayText} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      {/* ── Detalhes expandidos ── */}
      {open && (
        <View style={rS.cardBody}>
          <View style={rS.row}>
            <Icon name="calendar" size={13} color={COLORS.grayText} strokeWidth={2} />
            <Text style={rS.rowText}>{fmt(booking.startDate)} → {fmt(booking.endDate)}</Text>
          </View>
          <View style={rS.row}>
            <Icon name="users" size={13} color={COLORS.grayText} strokeWidth={2} />
            <Text style={rS.rowText}>
              {booking.adults || 1} adulto{(booking.adults || 1) !== 1 ? 's' : ''}
              {booking.children > 0 ? ` · ${booking.children} criança${booking.children !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          {booking.guestPhone ? (
            <View style={rS.row}>
              <Icon name="phone" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={rS.rowText}>{booking.guestPhone}</Text>
            </View>
          ) : null}
          <View style={rS.row}>
            <Icon name="check" size={13} color={booking?.guestProfile?.documentNumber ? COLORS.green : '#D97706'} strokeWidth={2} />
            <Text style={rS.rowText}>
              {booking?.guestProfile?.documentNumber
                ? `Documento: ${booking.guestProfile.documentType || 'Doc'} ${booking.guestProfile.documentNumber}`
                : 'Documento: por recolher no check-in'}
            </Text>
          </View>
          {booking.checkedInAt ? (
            <View style={rS.row}>
              <Icon name="clock" size={13} color={COLORS.green} strokeWidth={2} />
              <Text style={[rS.rowText, { color: COLORS.green }]}>Check-in às {fmt(booking.checkedInAt, 'time')}</Text>
            </View>
          ) : null}
          {booking.totalPrice ? (
            <View style={rS.row}>
              <Icon name="payment" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={rS.rowText}>
                {booking.totalPrice.toLocaleString()} Kz
                {booking.paymentStatus === 'PAID' ? ' · ✅ Pago' : ' · ⏳ Pendente'}
              </Text>
            </View>
          ) : null}
          {booking.notes ? (
            <View style={rS.row}>
              <Icon name="briefcase" size={13} color={COLORS.grayText} strokeWidth={2} />
              <Text style={[rS.rowText, { flex: 1 }]}>{booking.notes}</Text>
            </View>
          ) : null}

          {/* ── Botões por tab ── */}
          <View style={rS.actions}>
            {tab === 'arrivals' && (
              <>
                {booking.status === 'PENDING' && (
                  <TouchableOpacity style={[rS.btn, rS.btnBlue]} onPress={() => onAction(booking.id, 'confirm')} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={rS.btnWhite}>Confirmar</Text>}
                  </TouchableOpacity>
                )}
                {(booking.status === 'CONFIRMED') && (
                  <>
                    <TouchableOpacity style={[rS.btn, rS.btnGreen]} onPress={() => onAction(booking.id, 'checkin')} disabled={busy}>
                      {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                        <><Icon name="reservation" size={14} color="#fff" strokeWidth={2.5} /><Text style={rS.btnWhite}>Check-In</Text></>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[rS.btn, { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#C4B5FD' }]} onPress={() => onAction(booking.id, 'edit', booking)} disabled={busy}>
                      <Text style={[rS.btnText, { color: '#7C3AED', fontWeight: '600' }]}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[rS.btn, rS.btnRed]} onPress={() => onAction(booking.id, 'noshow')} disabled={busy}>
                      <Text style={[rS.btnText, { color: '#DC2626' }]}>No-Show</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            {booking.status === 'CHECKED_IN' && (
              <>
                <TouchableOpacity style={[rS.btn, { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE' }]} onPress={() => onAction(booking.id, 'folio', booking)} disabled={busy}>
                  <Icon name="briefcase" size={14} color="#1565C0" strokeWidth={2} />
                  <Text style={[rS.btnText, { color: '#1565C0', fontWeight: '600' }]}>Folio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[rS.btn, { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' }]} onPress={() => onAction(booking.id, 'guestprofile', booking)} disabled={busy}>
                  <Icon name="user" size={14} color="#16A34A" strokeWidth={2} />
                  <Text style={[rS.btnText, { color: '#16A34A', fontWeight: '600' }]}>Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[rS.btn, { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#C4B5FD' }]} onPress={() => onAction(booking.id, 'extend', booking)} disabled={busy}>
                  <Icon name="calendar" size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={[rS.btnText, { color: '#7C3AED', fontWeight: '600' }]}>+Dias</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[rS.btn, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }]} onPress={() => onAction(booking.id, 'changeroom', booking)} disabled={busy}>
                  <Icon name="map" size={14} color="#D97706" strokeWidth={2} />
                  <Text style={[rS.btnText, { color: '#D97706', fontWeight: '600' }]}>Quarto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[rS.btn, rS.btnOrange]} onPress={() => onAction(booking.id, 'checkout')} disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                    <><Icon name="arrow" size={14} color="#fff" strokeWidth={2.5} /><Text style={rS.btnWhite}>Check-Out</Text></>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Modal: Nova Reserva ─────────────────────────────────────────────────────
function NewBookingModal({ visible, businessId, accessToken, onClose, onCreated }) {
  const [step,       setStep]       = useState(1);
  const [roomTypes,  setRoomTypes]  = useState([]);
  const [rtLoading,  setRtLoading]  = useState(false);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [guestName,  setGuestName]  = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [adults,     setAdults]     = useState('1');
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [calField,   setCalField]   = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [suggestedDate, setSuggestedDate] = useState(null);

  // Carregar tipos de quarto com pricePerNight ao abrir
  React.useEffect(() => {
    if (!visible || !businessId) return;
    setRtLoading(true);
    backendApi.getRoomsByBusiness(businessId, accessToken)
      .then(data => {
        const types = Array.isArray(data) ? data : [];
        setRoomTypes(types);
        if (types.length > 0 && !roomTypeId) setRoomTypeId(types[0].id);
      })
      .catch(() => {})
      .finally(() => setRtLoading(false));
  }, [visible, businessId]);

  // Validar disponibilidade quando as datas são seleccionadas
  React.useEffect(() => {
    if (!startDate || !endDate || !roomTypeId || !businessId) return;
    const toISO = (str) => {
      if (!str) return null;
      try {
        if (str.includes('/')) {
          const [d, m, y] = str.split('/').map(Number);
          const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          return isNaN(dt.getTime()) ? null : dt.toISOString();
        }
        const dt = new Date(str);
        return isNaN(dt.getTime()) ? null : dt.toISOString();
      } catch { return null; }
    };
    const parseDDMMYYYY = (str) => {
      const s = String(str || '').trim();
      if (!s.includes('/')) return null;
      const [d, m, y] = s.split('/').map(Number);
      if (!d || !m || !y) return null;
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    };
    const fmtDDMMYYYY = (dt) =>
      `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    const normalizeSuggested = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return null;
      return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
    };

    const startISO = toISO(startDate);
    const endISO   = toISO(endDate);
    if (!startISO || !endISO) return;

    let cancelled = false;
    setCheckingAvail(true);
    setAvailabilityData(null);
    setSuggestedDate(null);
    (async () => {
      try {
        const data = await backendApi.getAvailability(businessId, roomTypeId, startISO, endISO);
        if (cancelled) return;
        setAvailabilityData(data);

        if (!data?.available) {
          // Preferir sugestão do backend (já pode vir em DD/MM/AAAA)
          let next = normalizeSuggested(data?.nextAvailableDate);

          // Fallback: procurar a próxima janela disponível até 60 dias
          if (!next) {
            const startBase = parseDDMMYYYY(startDate);
            const stayNights = Math.max(1, nightsCount || 1);
            if (startBase) {
              for (let i = 1; i <= 60; i++) {
                const probeStart = new Date(startBase);
                probeStart.setDate(probeStart.getDate() + i);
                const probeEnd = new Date(probeStart);
                probeEnd.setDate(probeEnd.getDate() + stayNights);
                const probeStartISO = toISO(fmtDDMMYYYY(probeStart));
                const probeEndISO = toISO(fmtDDMMYYYY(probeEnd));
                if (!probeStartISO || !probeEndISO) continue;
                // eslint-disable-next-line no-await-in-loop
                const probe = await backendApi.getAvailability(businessId, roomTypeId, probeStartISO, probeEndISO);
                if (cancelled) return;
                if (probe?.available) {
                  next = fmtDDMMYYYY(probeStart);
                  break;
                }
              }
            }
          }

          setSuggestedDate(next || null);
        }
      } catch {
        if (!cancelled) setAvailabilityData(null);
      } finally {
        if (!cancelled) setCheckingAvail(false);
      }
    })();

    return () => { cancelled = true; };
  }, [startDate, endDate, roomTypeId, businessId, nightsCount]);

  const selType = roomTypes.find(rt => rt.id === roomTypeId);
  const ppn     = selType?.pricePerNight ?? 0;

  const nightsCount = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    const p = s => { const [d,m,y] = s.split('/').map(Number); return new Date(y,m-1,d); };
    return Math.max(0, Math.round((p(endDate) - p(startDate)) / 86400000));
  }, [startDate, endDate]);

  const toIso = s => {
    if (!s) return '';
    const [d,m,y] = s.split('/').map(Number);
    return new Date(y,m-1,d,12,0,0).toISOString();
  };
  const today    = new Date();
  const todayFmt = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  const reset = () => {
    setStep(1); setRoomTypeId(''); setStartDate(''); setEndDate('');
    setGuestName(''); setGuestPhone(''); setAdults('1'); setNotes('');
  };

  const canNext = step === 1 ? !!roomTypeId
                : step === 2 ? (nightsCount > 0 && !checkingAvail && (availabilityData === null || availabilityData?.available))
                : !!guestName.trim();

  const handleNext = () => { if (step < 3) setStep(s => s+1); else handleCreate(); };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await backendApi.createBooking({
        businessId, bookingType: 'ROOM', roomTypeId,
        startDate: toIso(startDate), endDate: toIso(endDate),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        adults: parseInt(adults,10)||1, rooms: 1,
        notes: notes.trim() || undefined,
        status: 'CONFIRMED',
      }, accessToken);
      onCreated?.(); onClose(); reset();
    } catch (e) {
      Alert.alert('Erro ao criar reserva', e?.message || 'Operação falhou.');
    } finally { setLoading(false); }
  };

  const Dot = ({ n }) => (
    <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
      backgroundColor: step >= n ? '#1565C0' : '#E5E7EB' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: step >= n ? '#fff' : '#999' }}>{n}</Text>
    </View>
  );
  const Bar = ({ active }) => (
    <View style={{ width: 24, height: 2, backgroundColor: active ? '#1565C0' : '#E5E7EB' }} />
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={() => { onClose(); reset(); }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          {/* Header */}
          <View style={[rS.header, { justifyContent: 'space-between' }]}>
            <TouchableOpacity style={rS.iconBtn} onPress={() => {
              if (step > 1) setStep(s => s-1); else { onClose(); reset(); }
            }}>
              <Icon name={step > 1 ? 'back' : 'x'} size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={rS.headerTitle}>Nova Reserva</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Dot n={1} /><Bar active={step >= 2} /><Dot n={2} /><Bar active={step >= 3} /><Dot n={3} />
              </View>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: canNext ? '#1565C0' : '#E5E7EB', borderRadius: 8,
                paddingHorizontal: 14, paddingVertical: 8, minWidth: 72, alignItems: 'center' }}
              onPress={handleNext} disabled={!canNext || loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: canNext ? '#fff' : '#aaa', fontWeight: '700', fontSize: 13 }}>
                    {step < 3 ? 'Seguinte' : 'Criar'}
                  </Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

            {/* Passo 1: Tipo de Quarto */}
            {step === 1 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>
                  Seleccione o tipo de quarto
                </Text>
                {rtLoading ? (
                  <ActivityIndicator size="large" color={COLORS.blue} style={{ marginTop: 40 }} />
                ) : roomTypes.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ color: '#888', fontSize: 14 }}>Sem tipos de quarto configurados.</Text>
                  </View>
                ) : roomTypes.map(rt => (
                  <TouchableOpacity key={rt.id}
                    style={{ borderWidth: 2, borderRadius: 12, padding: 16, marginBottom: 10,
                      borderColor: roomTypeId === rt.id ? '#1565C0' : '#E5E7EB',
                      backgroundColor: roomTypeId === rt.id ? '#EFF6FF' : '#fff' }}
                    onPress={() => setRoomTypeId(rt.id)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{rt.name}</Text>
                      {roomTypeId === rt.id && (
                        <View style={{ backgroundColor: '#1565C0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Seleccionado</Text>
                        </View>
                      )}
                    </View>
                    {rt.pricePerNight > 0 && (
                      <Text style={{ fontSize: 14, color: '#1565C0', fontWeight: '600', marginTop: 6 }}>
                        {Math.round(rt.pricePerNight).toLocaleString()} Kz / noite
                      </Text>
                    )}
                    {rt.description ? (
                      <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }} numberOfLines={2}>
                        {rt.description}
                      </Text>
                    ) : null}
                    {rt.physicalRoomsCount != null && (
                      <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                        {rt.physicalRoomsCount} quarto{rt.physicalRoomsCount !== 1 ? 's' : ''} disponíveis
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Passo 2: Datas */}
            {step === 2 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 }}>
                  Seleccione as datas
                </Text>
                {selType && (
                  <Text style={{ fontSize: 13, color: '#1565C0', fontWeight: '600', marginBottom: 16 }}>
                    {selType.name}{ppn > 0 ? ` · ${Math.round(ppn).toLocaleString()} Kz/noite` : ''}
                  </Text>
                )}

                {/* Check-in */}
                <Text style={nbS.label}>📅 Data de Entrada *</Text>
                <CalendarPickerSimple value={startDate} minDate={todayFmt}
                  isOpen={calField === 'start'}
                  onToggle={() => setCalField(calField === 'start' ? null : 'start')}
                  onChange={v => {
                    setStartDate(v);
                    setCalField('end');
                    // Se saída anterior ficou antes da nova entrada, limpar
                    if (endDate) {
                      const p = s => { const [d,m,y] = s.split('/').map(Number); return new Date(y,m-1,d); };
                      if (p(endDate) <= p(v)) setEndDate('');
                    }
                  }} />

                {/* Check-out */}
                <Text style={[nbS.label, { marginTop: 14 }]}>📅 Data de Saída *</Text>
                <CalendarPickerSimple value={endDate} minDate={startDate || todayFmt}
                  isOpen={calField === 'end'}
                  onToggle={() => setCalField(calField === 'end' ? null : 'end')}
                  onChange={v => { setEndDate(v); setCalField(null); }} />

                {/* Resumo noites + preço */}
                {nightsCount > 0 && (
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginTop: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1565C0', textAlign: 'center' }}>
                      {nightsCount} noite{nightsCount !== 1 ? 's' : ''}
                    </Text>
                    {ppn > 0 && (
                      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1565C0', textAlign: 'center', marginTop: 4 }}>
                        {Math.round(ppn * nightsCount).toLocaleString()} Kz
                      </Text>
                    )}
                    <Text style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4 }}>
                      Estimativa (sem consumos adicionais)
                    </Text>
                  </View>
                )}

                {/* Validação de disponibilidade */}
                {nightsCount > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    {checkingAvail ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center',
                                     backgroundColor: '#F7F7F8', borderRadius: 10, padding: 14 }}>
                        <ActivityIndicator size="small" color="#1565C0" style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 13, color: '#555' }}>A verificar disponibilidade...</Text>
                      </View>
                    ) : availabilityData ? (
                      availabilityData.available ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center',
                                       backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14,
                                       borderWidth: 1, borderColor: '#BBF7D0' }}>
                          <Text style={{ fontSize: 18, marginRight: 10 }}>✅</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534', flex: 1 }}>
                            Quarto disponível para as datas seleccionadas
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14,
                                       borderWidth: 1, borderColor: '#FECACA' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontSize: 18, marginRight: 8 }}>❌</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>
                              Sem disponibilidade para estas datas
                            </Text>
                          </View>
                          {suggestedDate ? (
                            <View>
                              <Text style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>
                                {'Próxima data disponível: '}
                                <Text style={{ fontWeight: '700' }}>{suggestedDate}</Text>
                              </Text>
                              <TouchableOpacity
                                style={{ backgroundColor: '#DC2626', borderRadius: 8, padding: 10, alignItems: 'center' }}
                                onPress={() => {
                                  const [d, m, y] = suggestedDate.split('/').map(Number);
                                  const nextStart = new Date(y, m - 1, d);
                                  const nextEnd   = new Date(y, m - 1, d + (nightsCount || 1));
                                  const fmtD = dt => `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
                                  setStartDate(suggestedDate);
                                  setEndDate(fmtD(nextEnd));
                                  setSuggestedDate(null);
                                }}>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                                  {'Usar ' + suggestedDate + ' como entrada'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      )
                    ) : null}
                  </View>
                ) : null}
              </>
            )}

            {/* Passo 3: Hóspede */}
            {step === 3 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>
                  Dados do hóspede
                </Text>
                <Text style={nbS.label}>Nome Completo *</Text>
                <TextInput style={nbS.input} value={guestName} onChangeText={setGuestName}
                  placeholder="Nome do hóspede" placeholderTextColor="#bbb" autoCorrect={false} autoFocus />
                <Text style={nbS.label}>Telefone</Text>
                <TextInput style={nbS.input} value={guestPhone} onChangeText={setGuestPhone}
                  placeholder="9XXXXXXXX" placeholderTextColor="#bbb" keyboardType="phone-pad" />
                <Text style={nbS.label}>Adultos</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['1','2','3','4'].map(n => (
                    <TouchableOpacity key={n}
                      style={{ width: 52, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: adults===n ? '#1565C0' : '#F7F7F8',
                        borderWidth: 1, borderColor: adults===n ? '#1565C0' : '#E5E7EB' }}
                      onPress={() => setAdults(n)}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: adults===n ? '#fff' : '#333' }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[nbS.label, { marginTop: 16 }]}>Notas</Text>
                <TextInput style={[nbS.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={notes} onChangeText={setNotes}
                  placeholder="Pedidos especiais..." placeholderTextColor="#bbb" multiline />
                {selType && nightsCount > 0 && (
                  <View style={{ backgroundColor: '#F7F7F8', borderRadius: 10, padding: 14, marginTop: 16 }}>
                    <Text style={{ fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 6 }}>RESUMO</Text>
                    <Text style={{ fontSize: 13, color: '#111' }}>{selType.name}</Text>
                    <Text style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                      {startDate} → {endDate} · {nightsCount} noite{nightsCount!==1?'s':''}
                    </Text>
                    {ppn > 0 && (
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1565C0', marginTop: 6 }}>
                        {Math.round(ppn*nightsCount).toLocaleString()} Kz
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const nbS = StyleSheet.create({
  label:   { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },
  input:   { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 11,
             fontSize: 14, color: '#111', backgroundColor: '#FAFAFA' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
             borderColor: '#E5E7EB', borderRadius: 8, padding: 11, backgroundColor: '#FAFAFA' },
  dateTxt: { fontSize: 13, color: '#111', flex: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// [GHOST] alive ref limpa estado ao desmontar — padrão do OperationalLayerRenderer
// ─────────────────────────────────────────────────────────────────────────────
export function ReceptionScreen({ businessId, accessToken, roomTypes, onClose, pendingAction, onPendingActionConsumed }) {
  const [tab, setTab]                   = useState('arrivals');
  const [data, setData]                 = useState({ arrivals: [], departures: [], guests: [] });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [folioBooking, setFolioBooking] = useState(null);
  // Atribuição manual de quarto
  const [physicalRooms, setPhysicalRooms] = useState([]);
  const [roomPicker, setRoomPicker]       = useState(null);
  const [extendModal, setExtendModal]     = useState(null);
  const [changeModal, setChangeModal]     = useState(null);
  const [guestModal, setGuestModal]       = useState(null); // booking
  const [showNewBooking, setShowNewBooking] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (!businessId || !accessToken) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [a, d, g, rooms] = await Promise.all([
        backendApi.getHtArrivals(businessId, accessToken),
        backendApi.getHtDepartures(businessId, accessToken),
        backendApi.getHtCurrentGuests(businessId, accessToken),
        backendApi.getHtRooms(businessId, accessToken).catch(() => []),
      ]);
      if (!alive.current) return;
      setData({
        arrivals:   Array.isArray(a) ? a : [],
        departures: Array.isArray(d) ? d : [],
        guests:     Array.isArray(g) ? g : [],
      });
      setPhysicalRooms(Array.isArray(rooms) ? rooms : []);
    } catch (e) {
      if (alive.current) Alert.alert('Erro ao carregar', e?.message || 'Não foi possível carregar os dados da receção.');
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, [businessId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const _paRef = React.useRef(null);
  React.useEffect(() => {
    if (pendingAction) { _paRef.current = pendingAction; onPendingActionConsumed?.(); }
  }, [pendingAction]);
  React.useEffect(() => {
    if (!loading && _paRef.current) {
      const pa = _paRef.current; _paRef.current = null;
      setTimeout(() => handleAction(pa.bookingId, pa.action, pa.bk), 300);
    }
  }, [loading]);

  const handleAction = useCallback(async (bookingId, action, bookingObj = null) => {
    const labels = { checkin: 'Check-In', checkout: 'Check-Out', noshow: 'No-Show', confirm: 'Confirmar' };
    const msgs   = {
      checkin:  'Confirmar check-in do hóspede?',
      checkout: 'Confirmar checkout? O quarto ficará marcado como sujo.',
      noshow:   'Marcar como No-Show? O quarto será libertado.',
      confirm:  'Confirmar esta reserva?',
    };
    // Folio não precisa de confirmação — abre directamente
    if (action === 'folio') {
      // Usar o booking passado directamente; fallback: procurar em data
      const bk = bookingObj || [...(data.guests || []), ...(data.arrivals || []), ...(data.departures || [])].find(b => b.id === bookingId);
      if (bk) setFolioBooking(bk);
      return;
    }

    // Check-in: passar pelo doCheckIn para verificar early check-in primeiro
    if (action === 'checkin') {
      // Regra de negócio: não pode fazer check-in numa reserva pendente
      const bkForCheckIn = bookingObj
        || [...(data.arrivals || []), ...(data.guests || [])].find(b => b.id === bookingId);
      if (bkForCheckIn?.status === 'PENDING') {
        Alert.alert(
          '⚠️ Reserva não confirmada',
          'Não é possível fazer check-in numa reserva pendente.\nConfirme primeiro a reserva.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar Reserva', onPress: () => handleAction(bookingId, 'confirm') },
          ]
        );
        return;
      }
      doCheckIn(bookingId);
      return;
    }
    // Perfil de hóspede
    if (action === 'guestprofile') {
      const bk = bookingObj || [...(data.arrivals||[]), ...(data.guests||[]), ...(data.departures||[])].find(b => b.id === bookingId);
      if (bk) setGuestModal(bk);
      return;
    }
    // Editar reserva (datas/tipo) -- disponível em arrivals
    if (action === 'edit') {
      const bk = bookingObj || [...(data.arrivals || [])].find(b => b.id === bookingId);
      if (bk) setExtendModal({ ...bk, _editMode: true });
      return;
    }
    // Prolongar estadia: abrir modal de data
    if (action === 'extend') {
      const bk = bookingObj || [...(data.guests || []), ...(data.departures || [])].find(b => b.id === bookingId);
      if (bk) setExtendModal(bk);
      return;
    }
    // Alterar quarto: abrir modal de selecção
    if (action === 'changeroom') {
      const bk = bookingObj || [...(data.guests || [])].find(b => b.id === bookingId);
      if (bk) setChangeModal(bk);
      return;
    }

    // Checkout: verificar se o folio está encerrado antes de prosseguir
    if (action === 'checkout') {
      setActionLoading(bookingId);
      let folioBalance = 0;
      try {
        const folio = await backendApi.getHtFolio(bookingId, accessToken);
        folioBalance = folio?.summary?.balance ?? 0;
        // paymentStatus = 'PAID' significa que o checkout financeiro foi concluído
        if (folio?.booking?.paymentStatus === 'PAID') folioBalance = 0;
      } catch { /* se API falhar, deixar continuar */ }
      setActionLoading(null);
      if (folioBalance > 0) {
        const bkForFolio = bookingObj
          || [...(data.guests || []), ...(data.departures || [])].find(b => b.id === bookingId);
        Alert.alert(
          '⚠️ Folio não encerrado',
          `Existe um saldo em dívida de ${folioBalance.toLocaleString('pt-PT')} Kz.\nEncerrre o folio antes do check-out.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Folio', onPress: () => { if (bkForFolio) setFolioBooking(bkForFolio); } },
          ]
        );
        return;
      }
    }

    Alert.alert(labels[action], msgs[action], [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: labels[action],
        style: action === 'noshow' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(bookingId);
          try {
            if (action === 'checkout') await backendApi.htCheckOut(bookingId, accessToken);
            if (action === 'noshow')   await backendApi.htNoShow(bookingId, accessToken);
            if (action === 'confirm')  await backendApi.confirmBooking(bookingId, { businessId }, accessToken);
            await load(true);
          } catch (e) {
            Alert.alert('Erro', e?.message || 'Operação falhou. Tenta novamente.');
          } finally {
            if (alive.current) setActionLoading(null);
          }
        },
      },
    ]);
  }, [accessToken, businessId, load, data]);

  // Executar check-in com roomId opcional (vazio = auto-assign no backend)
  // Executa o check-in efectivo apos confirmacao
  const executeCheckIn = useCallback(async (bookingId, roomId, assignType, note, guestPayload = null) => {
    setActionLoading(bookingId);
    try {
      const guestProfileIdToLink = guestPayload?._linkGuestProfileId || null;
      const sanitizedGuestPayload = guestPayload
        ? Object.fromEntries(Object.entries(guestPayload).filter(([k]) => !k.startsWith('_')))
        : null;
      const payload = {
        ...(roomId ? { roomId, assignType, note } : {}),
        ...(sanitizedGuestPayload || {}),
      };
      // Ligar perfil existente ANTES do check-in para que o backend reconheça guestProfileId na reserva
      if (guestProfileIdToLink && businessId && accessToken) {
        await backendApi.linkHtGuestToBooking(guestProfileIdToLink, bookingId, businessId, accessToken);
      }
      const result  = await backendApi.htCheckIn(bookingId, payload, accessToken);

      setRoomPicker(null);
      await load(true);
      if (result?.earlyCheckIn?.daysEarly > 0) {
        const { daysEarly, fee } = result.earlyCheckIn;
        const feeMsg = fee > 0
          ? `\n\nTaxa de ${Math.round(fee).toLocaleString()} Kz lançada no folio.`
          : '\n\nSem taxa adicional.';
        Alert.alert(
          '\u23f0 Check-In Antecipado Efectuado',
          `Check-in realizado ${daysEarly} dia${daysEarly !== 1 ? 's' : ''} antes da data prevista.${feeMsg}`,
          [{ text: 'OK' }]
        );
      } else if (assignType === 'temporario' && roomId) {
        Alert.alert('Check-In Temporário', 'Quarto atribuído temporariamente.');
      }
    } catch (e) {
      Alert.alert('Erro no Check-In', e?.message || 'Operação falhou. Tenta novamente.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, businessId, load]);

  // Ponto de entrada do check-in:
  // - Se early (chegada antes da data prevista): pede confirmacao com custo estimado
  //   e abre o RoomPickerModal para seleccao manual de quarto disponivel
  // - Se normal: abre o RoomPickerModal directamente
  const doCheckIn = useCallback((bookingId, roomId = null, assignType = 'definitivo', note = null, guestPayload = null) => {
    // Se ja temos roomId (chamado pelo RoomPickerModal) -- executar directamente
    if (roomId !== null) {
      executeCheckIn(bookingId, roomId, assignType, note, guestPayload);
      return;
    }
    // Calcular se e early check-in usando dados locais
    const bk = [...(data.arrivals || []), ...(data.guests || [])].find(b => b.id === bookingId);
    const todayMid  = new Date(); todayMid.setHours(0, 0, 0, 0);
    const bkStart   = bk?.startDate ? new Date(bk.startDate) : null;
    if (bkStart) bkStart.setHours(0, 0, 0, 0);
    const daysEarly = bkStart ? Math.round((bkStart.getTime() - todayMid.getTime()) / 86400000) : 0;

    if (daysEarly > 0) {
      // Early check-in: calcular taxa estimada e pedir confirmacao
      const bkNights = bk?.startDate && bk?.endDate
        ? Math.max(1, Math.round((new Date(bk.endDate) - new Date(bk.startDate)) / 86400000))
        : 1;
      const ppn    = bk?.totalPrice ? bk.totalPrice / bkNights : null;
      const estFee = ppn ? Math.round(ppn * daysEarly) : null;
      const feeStr = estFee
        ? `Taxa estimada: ${estFee.toLocaleString()} Kz (${daysEarly} diária${daysEarly !== 1 ? 's' : ''} adiantada${daysEarly !== 1 ? 's' : ''})`
        : 'O custo das diárias adiantadas será lançado automaticamente no folio.';
      Alert.alert(
        '\u23f0 Check-In Antecipado',
        `O hóspede chega ${daysEarly} dia${daysEarly !== 1 ? 's' : ''} antes da data prevista (${new Date(bk.startDate).toLocaleDateString('pt-PT')}).\n\n${feeStr}\n\nDeseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Escolher Quarto',
            onPress: () => {
              // Abre o RoomPicker para seleccao manual do quarto disponivel
              setRoomPicker({ bookingId, roomTypeId: bk?.roomTypeId || null, booking: bk || null });
            }
          },
        ]
      );
      return;
    }
    // Check-in normal: abrir RoomPicker
    setRoomPicker({ bookingId, roomTypeId: bk?.roomTypeId || null, booking: bk || null });
  }, [data, executeCheckIn]);

  const doExtend = useCallback(async (bookingId, newEndDate) => {
    setExtendModal(null);
    setActionLoading(bookingId);
    try {
      await backendApi.htExtendStay(bookingId, newEndDate, accessToken);
      await load(true);
      Alert.alert('Estadia Prolongada', 'A nova data de saída foi registada.');
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível prolongar a estadia.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, load]);

  const executeChangeRoom = useCallback(async (bookingId, newRoomId) => {
    setActionLoading(bookingId);
    try {
      await backendApi.htChangeRoom(bookingId, newRoomId, accessToken);
      await load(true);
      Alert.alert('Quarto Alterado', 'O hóspede foi movido para o novo quarto.');
    } catch (e) {
      const msg = e?.message || '';
      // Mostrar mensagem de ocupado como aviso, não como erro técnico
      if (msg.includes('ocupado') || msg.includes('CHECKED_IN') || msg.includes('mesmo quarto')) {
        Alert.alert('Quarto Indisponível', msg);
      } else {
        Alert.alert('Não foi possível alterar o quarto', msg || 'Tenta novamente.');
      }
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, load]);

  const doChangeRoom = useCallback((bookingId, newRoomId, roomsData) => {
    setChangeModal(null);
    // Verificar se o quarto destino já tem hóspede (colisão)
    // Os roomsData vêm do dashboard e incluem o guest activo
    const targetRoom = (roomsData || data._rooms || []).find(r => r.id === newRoomId);
    if (targetRoom?.guest) {
      Alert.alert(
        '⚠️ Quarto Ocupado',
        `O quarto Nº ${targetRoom.number} tem um hóspede: ${targetRoom.guest}.

Para mover o hóspede para este quarto, o hóspede actual deve fazer checkout primeiro.

Deseja continuar mesmo assim (quarto em uso)?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive',
            onPress: () => executeChangeRoom(bookingId, newRoomId) },
        ]
      );
      return;
    }
    executeChangeRoom(bookingId, newRoomId);
  }, [data, executeChangeRoom]);

  const list = data[tab] || [];
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={rS.root}>

        {/* Header */}
        <View style={rS.header}>
          <TouchableOpacity style={rS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={rS.headerTitle}>Receção</Text>
            <Text style={rS.headerSub}>{todayStr}</Text>
          </View>
          <TouchableOpacity
            style={[rS.iconBtn, { backgroundColor: '#EFF6FF', borderRadius: 8 }]}
            onPress={() => setShowNewBooking(true)}>
            <Icon name="plus" size={20} color={COLORS.blue} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={rS.iconBtn} onPress={() => load(true)}>
            <Icon name="calendar" size={18} color={COLORS.blue} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Contadores */}
        <View style={rS.counters}>
          {[
            { key: 'arrivals',   n: data.arrivals.length,   color: '#1565C0', label: 'Chegadas 7d' },
            { key: 'departures', n: data.departures.length, color: '#D97706', label: 'Saídas 7d'   },
            { key: 'guests',     n: data.guests.length,     color: '#22A06B', label: 'Em Casa'     },
          ].map((c, i) => (
            <React.Fragment key={c.key}>
              {i > 0 && <View style={rS.divider} />}
              <View style={rS.counter}>
                <Text style={[rS.counterN, { color: c.color }]}>{c.n}</Text>
                <Text style={rS.counterL}>{c.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Tabs */}
        <View style={rS.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[rS.tab, tab === t.key && rS.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={15} color={tab === t.key ? COLORS.blue : COLORS.grayText} strokeWidth={2} />
              <Text style={[rS.tabLabel, tab === t.key && rS.tabLabelActive]}>{t.label}</Text>
              {data[t.key]?.length > 0 && (
                <View style={[rS.tabBadge, tab === t.key && { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[rS.tabBadgeText, tab === t.key && { color: COLORS.blue }]}>
                    {data[t.key].length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        {loading ? (
          <View style={rS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={{ marginTop: 10, color: COLORS.grayText, fontSize: 13 }}>A carregar...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={rS.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.blue} />}
          >
            {list.length === 0 ? (
              <View style={rS.empty}>
                <Text style={{ fontSize: 40, marginBottom: 14 }}>
                  {tab === 'arrivals' ? '🛬' : tab === 'departures' ? '🛫' : '🛏️'}
                </Text>
                <Text style={rS.emptyTitle}>
                  {tab === 'arrivals' ? 'Sem chegadas hoje' : tab === 'departures' ? 'Sem saídas hoje' : 'Sem hóspedes em casa'}
                </Text>
                <Text style={rS.emptySub}>
                  {tab === 'arrivals'
                    ? 'Não há reservas confirmadas para hoje.'
                    : tab === 'departures'
                    ? 'Não há checkouts previstos para hoje.'
                    : 'Nenhum hóspede está actualmente hospedado.'}
                </Text>
              </View>
            ) : (
              list.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  tab={tab}
                  roomTypes={roomTypes}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
      <NewBookingModal
        visible={showNewBooking}
        businessId={businessId}
        accessToken={accessToken}
        onClose={() => setShowNewBooking(false)}
        onCreated={() => load(true)}
      />
      {folioBooking && (
        <FolioScreen
          booking={folioBooking}
          businessId={businessId}
          accessToken={accessToken}
          onClose={() => { setFolioBooking(null); load(true); }}
        />
      )}

      {/* Modal de selecção de quarto para check-in */}
      {roomPicker && (
        <RoomPickerModal
          visible={!!roomPicker}
          rooms={physicalRooms}
          roomTypeId={roomPicker.roomTypeId}
          booking={roomPicker.booking}
          existingBookings={[...(data.arrivals || []), ...(data.departures || []), ...(data.guests || [])]}
          businessId={businessId}
          accessToken={accessToken}
          onSelect={(roomId, assignType, note, guestPayload) => doCheckIn(roomPicker.bookingId, roomId, assignType, note, guestPayload)}
          onSkip={(guestPayload) => executeCheckIn(roomPicker.bookingId, null, 'definitivo', null, guestPayload)}
          onClose={() => setRoomPicker(null)}
        />
      )}
      {/* Modal perfil de hóspede */}
      <GuestProfileModal
        visible={!!guestModal}
        businessId={businessId}
        accessToken={accessToken}
        prefilledName={guestModal?.guestName}
        prefilledPhone={guestModal?.guestPhone}
        initialGuestId={guestModal?.guestProfile?.id || null}
        onLink={async (guest) => {
          if (guestModal) {
            try {
              await backendApi.linkHtGuestToBooking(guest.id, guestModal.id, businessId, accessToken);
              Alert.alert('Perfil Ligado', `${guest.fullName} ligado a esta reserva.`);
            } catch {}
          }
          setGuestModal(null);
        }}
        onClose={() => setGuestModal(null)}
      />
      {/* Modal prolongar estadia */}
      <ExtendStayModal
        visible={!!extendModal}
        booking={extendModal}
        onConfirm={(newEndDate) => doExtend(extendModal.id, newEndDate)}
        onClose={() => setExtendModal(null)}
      />
      {/* Modal alterar quarto */}
      <ChangeRoomModal
        visible={!!changeModal}
        booking={changeModal}
        rooms={physicalRooms}
        onConfirm={(newRoomId, roomsData) => doChangeRoom(changeModal.id, newRoomId, roomsData)}
        onClose={() => setChangeModal(null)}
      />
    </Modal>
  );
}

const rS = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F7F6F2' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:     { fontSize: 12, color: '#888', marginTop: 1 },
  counters:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3', paddingVertical: 14 },
  counter:       { flex: 1, alignItems: 'center' },
  counterN:      { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  counterL:      { fontSize: 11, color: '#888', marginTop: 2 },
  divider:       { width: 1, backgroundColor: '#ECEAE3', marginVertical: 4 },
  tabs:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: '#1565C0' },
  tabLabel:      { fontSize: 12, fontWeight: '600', color: '#888' },
  tabLabelActive: { color: '#1565C0' },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText:  { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  listPad:       { padding: 14, gap: 10, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
  cardHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestName:     { fontSize: 14, fontWeight: '700', color: '#111' },
  guestSub:      { fontSize: 12, color: '#888', marginTop: 2 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  cardBody:      { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#F0EDE6', gap: 6 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowText:       { fontSize: 13, color: '#444', flex: 1 },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, minWidth: 80, justifyContent: 'center' },
  btnGreen:      { backgroundColor: '#22A06B' },
  btnOrange:     { backgroundColor: '#D97706' },
  btnBlue:       { backgroundColor: '#1565C0' },
  btnRed:        { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnWhite:      { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnText:       { fontSize: 13, fontWeight: '700' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:         { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySub:      { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
});