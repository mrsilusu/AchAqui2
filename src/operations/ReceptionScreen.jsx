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
  const available = (rooms || []).filter(r =>
    r.status === 'CLEAN' && r.roomType?.id === booking.roomTypeId && r.id !== booking.roomId
  );

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
          {available.length === 0 ? (
            <View style={rpS.empty}>
              <Text style={rpS.emptyText}>Sem quartos limpos disponíveis do mesmo tipo.</Text>
            </View>
          ) : (
            <>
              <Text style={rpS.sub}>Selecciona o novo quarto:</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {available.map(r => (
                  <TouchableOpacity key={r.id} style={rpS.roomRow} onPress={() => onConfirm(r.id)}>
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
              </ScrollView>
            </>
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
function GuestProfileModal({ visible, businessId, accessToken, prefilledName, prefilledPhone, onLink, onClose }) {
  const [tab, setTab]         = useState('search'); // 'search' | 'create'
  const [search, setSearch]   = useState('');
  const [guests, setGuests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({
    fullName: prefilledName || '', phone: prefilledPhone || '',
    email: '', documentType: 'BI', documentNumber: '',
    nationality: 'Angolana', dateOfBirth: '', preferences: '', notes: '', isVip: false,
  });


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
            {[['search','Pesquisar'],['create','Novo']].map(([k,l]) => (
              <TouchableOpacity key={k}
                style={[rpS.skipBtn, { flex: 1, marginTop: 0, backgroundColor: tab === k ? '#1565C0' : '#F7F7F8' }]}
                onPress={() => setTab(k)}>
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
                    <TouchableOpacity key={g.id} style={rpS.roomRow} onPress={() => onLink(g)}>
                      <View style={{ flex: 1 }}>
                        <Text style={rpS.roomNum}>{g.fullName}</Text>
                        <Text style={rpS.roomFloor}>
                          {g.phone || g.email || ''}
                          {g.isVip ? ' · ⭐ VIP' : ''}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={14} color={COLORS.grayText} strokeWidth={2} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <ScrollView style={{ maxHeight: 340 }}>
              {[
                ['fullName','Nome completo *','default'],
                ['phone','Telefone','phone-pad'],
                ['email','Email','email-address'],
                ['documentType','Tipo (BI / Passaporte / DIRE)','default'],
                ['documentNumber','Nº de Documento','default'],
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
          )}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Modal de selecção de quarto para check-in ────────────────────────────────
function RoomPickerModal({ visible, rooms, roomTypeId, onSelect, onSkip, onClose }) {
  const [assignType, setAssignType] = useState('definitivo'); // 'definitivo' | 'temporario'
  const [note, setNote]             = useState('');

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

  const handleSelect = (roomId) => {
    onSelect(roomId, assignType, note.trim() || null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rpS.overlay}>
        <View style={rpS.sheet}>
          <View style={rpS.header}>
            <Text style={rpS.title}>Atribuir Quarto</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

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

          <Text style={rpS.sub}>
            {noClean ? 'Todos os quartos deste tipo:' : 'Quartos disponíveis:'}
          </Text>

          <ScrollView style={{ maxHeight: 260 }}>
            {(noClean ? allRooms : cleanRooms).map(r => {
              const st = STATUS_BADGE[r.status] || STATUS_BADGE.CLEAN;
              return (
                <TouchableOpacity key={r.id} style={rpS.roomRow}
                  onPress={() => handleSelect(r.id)}>
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

          <TouchableOpacity style={rpS.skipBtn} onPress={onSkip}>
            <Text style={rpS.skipBtnText}>
              {noClean ? 'Continuar sem atribuir quarto' : 'Atribuir automaticamente'}
            </Text>
          </TouchableOpacity>
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
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// [GHOST] alive ref limpa estado ao desmontar — padrão do OperationalLayerRenderer
// ─────────────────────────────────────────────────────────────────────────────
export function ReceptionScreen({ businessId, accessToken, roomTypes, onClose }) {
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

    // Check-in: mostrar picker de quarto
    if (action === 'checkin') {
      const bk = bookingObj || [...(data.arrivals || [])].find(b => b.id === bookingId);
      setRoomPicker({ bookingId, roomTypeId: bk?.roomTypeId || null });
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
  const doCheckIn = useCallback(async (bookingId, roomId = null, assignType = 'definitivo', note = null) => {
    setRoomPicker(null);
    setActionLoading(bookingId);
    try {
      const payload = roomId ? { roomId, assignType, note } : {};
      await backendApi.htCheckIn(bookingId, payload, accessToken);
      if (assignType === 'temporario' && roomId) {
        Alert.alert('Check-In Temporário', `Quarto atribuído temporariamente.${note ? `
${note}` : ''}`);
      }
      await load(true);
    } catch (e) {
      Alert.alert('Erro no Check-In', e?.message || 'Operação falhou. Tenta novamente.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, load]);

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

  const doChangeRoom = useCallback(async (bookingId, newRoomId) => {
    setChangeModal(null);
    setActionLoading(bookingId);
    try {
      await backendApi.htChangeRoom(bookingId, newRoomId, accessToken);
      await load(true);
      Alert.alert('Quarto Alterado', 'O hóspede foi movido para o novo quarto.');
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível alterar o quarto.');
    } finally {
      if (alive.current) setActionLoading(null);
    }
  }, [accessToken, load]);

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
          onSelect={(roomId, assignType, note) => doCheckIn(roomPicker.bookingId, roomId, assignType, note)}
          onSkip={() => doCheckIn(roomPicker.bookingId, null)}
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
        onConfirm={(newRoomId) => doChangeRoom(changeModal.id, newRoomId)}
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