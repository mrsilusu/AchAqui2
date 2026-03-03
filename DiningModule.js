/**
 * ============================================================================
 * ACHEIAQUI — DINING MODULE  (v3.0.0 — Fase 3)
 * ============================================================================
 * Funcionalidades:
 *   ✅ Reserva de mesas por turnos (almoço / jantar / brunch)
 *   ✅ Menu Digital navegável por categorias
 *   ✅ Modo Dono — gestão de turnos, capacidade e reservas
 *   ✅ Mapa de mesas: cliente vê disponibilidade; dono vê quem reservou
 *
 * Segurança SaaS Multi-tenant:
 *   ✅ RBAC duplo: ownerMode && tenantId === business.id
 *   ✅ sanitizeInput() em todos os campos livres (observações, pedidos especiais)
 *   ✅ Nomes de clientes APENAS visíveis para o dono
 *   ✅ Gesture safety: onUnsavedChange callback para swipe-back alert no pai
 *   ✅ useEffect cleanup em [business?.id] — purga ghost data ao trocar negócio
 * ============================================================================
 */

import React, {
  useContext, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Switch, Platform,
} from 'react-native';
import { sanitizeInput, Icon, COLORS, AppContext } from './AcheiAqui_Core';

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const SHIFTS = [
  { id: 'brunch', label: 'Brunch',  time: '09:00–12:00', icon: '☀️' },
  { id: 'lunch',  label: 'Almoço',  time: '12:00–15:00', icon: '🌤️' },
  { id: 'dinner', label: 'Jantar',  time: '19:00–23:00', icon: '🌙' },
];
const MENU_CATS = ['Entradas', 'Pratos Principais', 'Sobremesas', 'Bebidas'];
const fmtDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const todayStr = () => fmtDate(new Date());

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const buildMockTables = () =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `T${i + 1}`, number: i + 1,
    capacity: i < 3 ? 2 : i < 7 ? 4 : 6,
    status: i === 2 || i === 5 ? 'reserved' : 'available',
    reservedBy: i === 2 ? 'Maria Costa' : i === 5 ? 'João Mendes' : null,
    shift: i === 2 ? 'lunch' : i === 5 ? 'dinner' : null,
  }));

const MOCK_MENU = [
  { id: 'm1', category: 'Entradas',          name: 'Camarão Grelhado',    price: 2500, description: 'Camarão tigre grelhado com limão e alho', available: true },
  { id: 'm2', category: 'Entradas',          name: 'Salada de Marisco',   price: 1800, description: 'Mix de mariscos frescos com molho especial', available: true },
  { id: 'm3', category: 'Pratos Principais', name: 'Muamba de Galinha',   price: 3500, description: 'Prato tradicional angolano com óleo de palma', available: true },
  { id: 'm4', category: 'Pratos Principais', name: 'Grelhada Mista',      price: 5200, description: 'Carne bovina, frango e linguiça na brasa', available: true },
  { id: 'm5', category: 'Pratos Principais', name: 'Peixe do Dia',        price: 4100, description: 'Peixe fresco grelhado com pirão', available: false },
  { id: 'm6', category: 'Sobremesas',         name: 'Pudim de Leite',     price:  900, description: 'Pudim caseiro com calda de caramelo', available: true },
  { id: 'm7', category: 'Sobremesas',         name: 'Papaia com Mel',     price:  700, description: 'Papaia fresca com mel e sementes de chia', available: true },
  { id: 'm8', category: 'Bebidas',            name: 'Sumo de Múcua',      price:  600, description: 'Sumo natural de baobab', available: true },
  { id: 'm9', category: 'Bebidas',            name: 'Cerveja Cuca',       price:  500, description: 'Cerveja angolana gelada', available: true },
];

const MOCK_BOOKINGS = [
  { id: 'db1', guestName: 'Maria Costa',  guestPhone: '+244 912 111 222', tableId: 'T3', shift: 'lunch',  date: todayStr(), guests: 2, notes: '', status: 'confirmed' },
  { id: 'db2', guestName: 'João Mendes', guestPhone: '+244 923 333 444', tableId: 'T6', shift: 'dinner', date: todayStr(), guests: 4, notes: 'Aniversário', status: 'confirmed' },
];

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

function TableCard({ table, ownerMode, onPress, selected }) {
  const isReserved = table.status === 'reserved';
  const borderColor = selected ? COLORS.red : isReserved ? '#F59E0B' : '#22C55E';
  const bgColor = selected ? COLORS.red + '14' : isReserved ? '#FEF9C3' : '#F0FDF4';
  return (
    <TouchableOpacity style={[dinS.tableCard, { borderColor, backgroundColor: bgColor }]}
      onPress={() => onPress(table)} activeOpacity={0.75}>
      <Text style={dinS.tableNumber}>Mesa {table.number}</Text>
      <Text style={dinS.tableCap}>{table.capacity} lugares</Text>
      <Text style={[dinS.tableStatus, { color: isReserved ? '#D97706' : '#16A34A' }]}>
        {isReserved ? '● Reservada' : '○ Livre'}
      </Text>
      {ownerMode && isReserved && table.reservedBy
        ? <Text style={dinS.tableGuest} numberOfLines={1}>{table.reservedBy}</Text>
        : null}
    </TouchableOpacity>
  );
}

function MenuItem({ item, ownerMode, onToggle }) {
  return (
    <View style={[dinS.menuItem, !item.available && dinS.menuItemUnavail]}>
      <View style={{ flex: 1 }}>
        <Text style={[dinS.menuName, !item.available && { color: COLORS.grayText }]}>
          {item.name}{!item.available && <Text style={dinS.unavailTag}> · Indisponível</Text>}
        </Text>
        <Text style={dinS.menuDesc} numberOfLines={2}>{item.description}</Text>
        <Text style={dinS.menuPrice}>{item.price.toLocaleString('pt-AO')} Kz</Text>
      </View>
      {ownerMode && (
        <Switch value={item.available} onValueChange={() => onToggle(item.id)}
          trackColor={{ false: COLORS.grayLine, true: COLORS.red + '88' }}
          thumbColor={item.available ? COLORS.red : COLORS.grayText} />
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={dinS.infoRow}>
      <Icon name={icon} size={16} color={COLORS.grayText} strokeWidth={2} />
      <Text style={dinS.infoLabel}>{label}</Text>
      <Text style={dinS.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <View style={[dinS.statChip, { borderColor: color + '44' }]}>
      <Icon name={icon} size={14} color={color} strokeWidth={2} />
      <Text style={[dinS.statVal, { color }]}>{value}</Text>
      <Text style={dinS.statLabel}>{label}</Text>
    </View>
  );
}

// ─── MODAL RESERVA (cliente) ──────────────────────────────────────────────────
function BookingModal({ visible, table, onClose, onConfirm }) {
  const [shift, setShift] = useState('lunch');
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (visible) { setShift('lunch'); setGuests(2); setNotes(''); setName(''); setPhone(''); }
  }, [visible]);

  const hasData = !!(name.trim() || phone.trim() || notes.trim());

  const handleClose = useCallback(() => {
    if (hasData) {
      Alert.alert('Descartar reserva?', 'Tem dados preenchidos. Deseja descartar a sua reserva?', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onClose },
      ]);
    } else { onClose(); }
  }, [hasData, onClose]);

  const handleConfirm = useCallback(() => {
    if (!name.trim()) { Alert.alert('Erro', 'Indique o seu nome.'); return; }
    if (!phone.trim()) { Alert.alert('Erro', 'Indique o contacto.'); return; }
    if (guests < 1 || guests > (table?.capacity ?? 10)) {
      Alert.alert('Erro', `Número de pessoas inválido (máx. ${table?.capacity ?? 10}).`); return;
    }
    onConfirm({
      tableId: table?.id, shift, guests, date: todayStr(), status: 'confirmed',
      guestName:  sanitizeInput(name.trim(), 80),
      guestPhone: sanitizeInput(phone.trim(), 30),
      notes:      sanitizeInput(notes.trim(), 200),
    });
  }, [name, phone, guests, notes, shift, table, onConfirm]);

  if (!table) return null;
  const selectedShift = SHIFTS.find(s => s.id === shift);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={dinS.modalOverlay}>
        <View style={dinS.modalSheet}>
          <View style={dinS.modalHeader}>
            <Text style={dinS.modalTitle}>Reservar Mesa {table.number}</Text>
            <TouchableOpacity onPress={handleClose} style={dinS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 16 }}>
            {/* Turno */}
            <Text style={dinS.fieldLabel}>Turno</Text>
            <View style={dinS.shiftRow}>
              {SHIFTS.map(s => (
                <TouchableOpacity key={s.id} style={[dinS.shiftBtn, shift === s.id && dinS.shiftBtnActive]}
                  onPress={() => setShift(s.id)} activeOpacity={0.75}>
                  <Text style={dinS.shiftIcon}>{s.icon}</Text>
                  <Text style={[dinS.shiftLabel, shift === s.id && dinS.shiftLabelActive]}>{s.label}</Text>
                  <Text style={[dinS.shiftTime, shift === s.id && { color: COLORS.red }]}>{s.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Pessoas */}
            <Text style={dinS.fieldLabel}>Número de pessoas</Text>
            <View style={dinS.counterRow}>
              <TouchableOpacity style={dinS.counterBtn} onPress={() => setGuests(g => Math.max(1, g - 1))}>
                <Icon name="minus" size={18} color={COLORS.red} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={dinS.counterVal}>{guests}</Text>
              <TouchableOpacity style={dinS.counterBtn} onPress={() => setGuests(g => Math.min(table.capacity, g + 1))}>
                <Icon name="plus" size={18} color={COLORS.red} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={dinS.counterCap}>de {table.capacity} lugares</Text>
            </View>
            {/* Campos */}
            <Text style={dinS.fieldLabel}>Nome</Text>
            <TextInput style={dinS.input} value={name} onChangeText={setName}
              placeholder="O seu nome" placeholderTextColor={COLORS.grayText} maxLength={80} />
            <Text style={dinS.fieldLabel}>Contacto</Text>
            <TextInput style={dinS.input} value={phone} onChangeText={setPhone}
              placeholder="+244 9XX XXX XXX" placeholderTextColor={COLORS.grayText}
              keyboardType="phone-pad" maxLength={30} />
            <Text style={dinS.fieldLabel}>
              Pedidos especiais <Text style={{ fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <TextInput style={[dinS.input, dinS.inputMulti]} value={notes} onChangeText={setNotes}
              placeholder="Alergias, aniversários, preferências…"
              placeholderTextColor={COLORS.grayText} multiline maxLength={200} />
            <Text style={dinS.charCount}>{notes.length}/200</Text>
            {/* Sumário */}
            <View style={dinS.summaryCard}>
              <Text style={dinS.summaryLine}>🍽️ Mesa {table.number} · {guests} pessoa{guests !== 1 ? 's' : ''}</Text>
              <Text style={dinS.summaryLine}>{selectedShift?.icon} {selectedShift?.label} · {selectedShift?.time}</Text>
            </View>
            <TouchableOpacity style={dinS.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={dinS.confirmBtnText}>Confirmar Reserva</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL GESTÃO (dono) ──────────────────────────────────────────────────────
function OwnerBookingModal({ visible, booking, tables, onClose, onStatusChange }) {
  if (!booking) return null;
  const shift = SHIFTS.find(s => s.id === booking.shift);
  const table = tables?.find(t => t.id === booking.tableId);
  const statusColor = booking.status === 'confirmed' ? '#22C55E'
    : booking.status === 'seated' ? COLORS.blue
    : booking.status === 'cancelled' ? COLORS.grayText : '#F59E0B';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dinS.modalOverlay}>
        <View style={[dinS.modalSheet, { maxHeight: '65%' }]}>
          <View style={dinS.modalHeader}>
            <Text style={dinS.modalTitle}>Reserva #{booking.id.slice(-3)}</Text>
            <TouchableOpacity onPress={onClose} style={dinS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={[dinS.statusBadge, { backgroundColor: statusColor + '22', alignSelf: 'flex-start', marginHorizontal: 16, marginVertical: 8 }]}>
            <Text style={[dinS.statusText, { color: statusColor }]}>
              {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'seated' ? 'Sentado'
                : booking.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16, gap: 0 }}>
            <InfoRow icon="user"     label="Cliente"  value={booking.guestName} />
            <InfoRow icon="phone"    label="Contacto" value={booking.guestPhone} />
            <InfoRow icon="users"    label="Pessoas"  value={String(booking.guests)} />
            <InfoRow icon="grid"     label="Mesa"     value={`Mesa ${table?.number ?? '—'} (${table?.capacity ?? '—'} lugares)`} />
            <InfoRow icon="clock"    label="Turno"    value={`${shift?.label} · ${shift?.time}`} />
            <InfoRow icon="calendar" label="Data"     value={booking.date} />
            {booking.notes ? <InfoRow icon="fileText" label="Obs." value={booking.notes} /> : null}
          </View>
          <View style={dinS.ownerActions}>
            {booking.status !== 'confirmed' && (
              <TouchableOpacity style={[dinS.ownerBtn, { backgroundColor: '#22C55E' }]}
                onPress={() => onStatusChange(booking.id, 'confirmed')}>
                <Text style={dinS.ownerBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
            {booking.status !== 'seated' && (
              <TouchableOpacity style={[dinS.ownerBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => onStatusChange(booking.id, 'seated')}>
                <Text style={dinS.ownerBtnText}>Sentar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[dinS.ownerBtn, { backgroundColor: COLORS.red }]}
              onPress={() => onStatusChange(booking.id, 'cancelled')}>
              <Text style={dinS.ownerBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── DINING MODULE — componente principal ─────────────────────────────────────
export function DiningModule({ business, ownerMode, tenantId, onUnsavedChange }) {
  const ctx     = useContext(AppContext);
  const isOwner = (ownerMode ?? (ctx?.isBusinessMode && ctx?.tenantId === business?.id))
    && (tenantId ?? ctx?.tenantId) === business?.id;

  const [activeTab,       setActiveTab]       = useState('tables');
  const [tables,          setTables]          = useState(buildMockTables);
  const [bookings,        setBookings]        = useState(MOCK_BOOKINGS);
  const [menuItems,       setMenuItems]       = useState(MOCK_MENU);
  const [activeMenuCat,   setActiveMenuCat]   = useState(MENU_CATS[0]);
  const [selectedShift,   setSelectedShift]   = useState('lunch');
  const [selectedTable,   setSelectedTable]   = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [ownerBooking,    setOwnerBooking]    = useState(null);
  const [showOwnerModal,  setShowOwnerModal]  = useState(false);

  // Ghost-data purge ao trocar de negócio
  useEffect(() => {
    return () => {
      setSelectedTable(null);
      setShowBookingForm(false);
      setShowOwnerModal(false);
      setOwnerBooking(null);
      onUnsavedChange?.(false);
    };
  }, [business?.id]);

  const stats = useMemo(() => ({
    total:     tables.length,
    available: tables.filter(t => t.status === 'available').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
    today:     bookings.filter(b => b.date === todayStr() && b.status !== 'cancelled').length,
  }), [tables, bookings]);

  const filteredTables = useMemo(
    () => tables.filter(t => t.shift === null || t.shift === selectedShift || t.status === 'available'),
    [tables, selectedShift],
  );

  const filteredMenu = useMemo(
    () => menuItems.filter(m => m.category === activeMenuCat),
    [menuItems, activeMenuCat],
  );

  const handleTablePress = useCallback((table) => {
    if (table.status === 'reserved') {
      if (isOwner) {
        const b = bookings.find(bk => bk.tableId === table.id && bk.shift === selectedShift);
        if (b) { setOwnerBooking(b); setShowOwnerModal(true); }
        else { Alert.alert('Reserva', 'Reserva não encontrada para este turno.'); }
      } else {
        const shift = SHIFTS.find(s => s.id === selectedShift);
        Alert.alert('Mesa Ocupada', `Esta mesa está reservada para o turno de ${shift?.label}.`);
      }
    } else {
      setSelectedTable(table);
      setShowBookingForm(true);
    }
  }, [bookings, isOwner, selectedShift]);

  const handleConfirmBooking = useCallback((data) => {
    const newId = `db${Date.now()}`;
    setBookings(prev => [...prev, { id: newId, ...data }]);
    setTables(prev => prev.map(t =>
      t.id === data.tableId ? { ...t, status: 'reserved', reservedBy: data.guestName, shift: data.shift } : t,
    ));
    setShowBookingForm(false);
    setSelectedTable(null);
    onUnsavedChange?.(false);
    const tNum = tables.find(t => t.id === data.tableId)?.number;
    const sLabel = SHIFTS.find(s => s.id === data.shift)?.label;
    Alert.alert('Reserva Confirmada!', `Mesa ${tNum} reservada para ${sLabel}.`);
  }, [tables, onUnsavedChange]);

  const handleStatusChange = useCallback((bookingId, newStatus) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    if (newStatus === 'cancelled') {
      const b = bookings.find(bk => bk.id === bookingId);
      if (b) setTables(prev => prev.map(t =>
        t.id === b.tableId ? { ...t, status: 'available', reservedBy: null, shift: null } : t,
      ));
    }
    setShowOwnerModal(false);
  }, [bookings]);

  const handleMenuToggle = useCallback((itemId) => {
    if (!isOwner) return; // RBAC guard
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, available: !m.available } : m));
  }, [isOwner]);

  const TABS = [
    { id: 'tables',   label: 'Mesas',    icon: 'grid'     },
    { id: 'menu',     label: 'Menu',      icon: 'fileText' },
    ...(isOwner ? [{ id: 'bookings', label: 'Reservas', icon: 'calendar' }] : []),
  ];

  return (
    <View style={dinS.container}>
      {isOwner && (
        <View style={dinS.rbacBadge}>
          <Icon name="shield" size={12} color={COLORS.green} strokeWidth={2.5} />
          <Text style={dinS.rbacText}>Modo Gestão · tenantId verificado</Text>
        </View>
      )}

      {isOwner && (
        <View style={dinS.statsRow}>
          <StatChip icon="grid"        label="Total"      value={stats.total}     color={COLORS.blue} />
          <StatChip icon="checkCircle" label="Livres"     value={stats.available} color="#22C55E" />
          <StatChip icon="clock"       label="Reservadas" value={stats.reserved}  color="#F59E0B" />
          <StatChip icon="calendar"    label="Hoje"       value={stats.today}     color={COLORS.red} />
        </View>
      )}

      <View style={dinS.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id} style={[dinS.tab, activeTab === tab.id && dinS.tabActive]}
            onPress={() => setActiveTab(tab.id)} activeOpacity={0.75}>
            <Icon name={tab.icon} size={15} color={activeTab === tab.id ? COLORS.red : COLORS.grayText} strokeWidth={2} />
            <Text style={[dinS.tabLabel, activeTab === tab.id && dinS.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'tables' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={dinS.shiftSelector}>
            {SHIFTS.map(s => (
              <TouchableOpacity key={s.id} style={[dinS.shiftPill, selectedShift === s.id && dinS.shiftPillActive]}
                onPress={() => setSelectedShift(s.id)} activeOpacity={0.75}>
                <Text style={[dinS.shiftPillText, selectedShift === s.id && dinS.shiftPillTextActive]}>
                  {s.icon} {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={dinS.legend}>
            <View style={dinS.legendItem}><View style={[dinS.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={dinS.legendLabel}>Livre</Text></View>
            <View style={dinS.legendItem}><View style={[dinS.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={dinS.legendLabel}>Reservada</Text></View>
            {isOwner && <Text style={dinS.legendNote}>Toque numa reservada para gerir</Text>}
          </View>
          <View style={dinS.tableGrid}>
            {filteredTables.map(table => (
              <TableCard key={table.id} table={table} ownerMode={isOwner}
                onPress={handleTablePress} selected={selectedTable?.id === table.id} />
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {activeTab === 'menu' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
            {MENU_CATS.map(cat => (
              <TouchableOpacity key={cat} style={[dinS.catPill, activeMenuCat === cat && dinS.catPillActive]}
                onPress={() => setActiveMenuCat(cat)} activeOpacity={0.75}>
                <Text style={[dinS.catPillText, activeMenuCat === cat && dinS.catPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {isOwner && (
            <View style={dinS.ownerMenuHint}>
              <Icon name="info" size={13} color={COLORS.blue} strokeWidth={2} />
              <Text style={dinS.ownerMenuHintText}>Toggle para marcar itens indisponíveis</Text>
            </View>
          )}
          <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 12, paddingBottom: 32 }}>
            {filteredMenu.map(item => (
              <MenuItem key={item.id} item={item} ownerMode={isOwner} onToggle={handleMenuToggle} />
            ))}
            {filteredMenu.length === 0 && <Text style={dinS.emptyText}>Sem itens nesta categoria</Text>}
          </View>
        </ScrollView>
      )}

      {activeTab === 'bookings' && isOwner && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
          {bookings.length === 0 && <Text style={dinS.emptyText}>Sem reservas registadas</Text>}
          {bookings.map(b => {
            const shift = SHIFTS.find(s => s.id === b.shift);
            const statusColor = b.status === 'confirmed' ? '#22C55E'
              : b.status === 'seated' ? COLORS.blue
              : b.status === 'cancelled' ? COLORS.grayText : '#F59E0B';
            return (
              <TouchableOpacity key={b.id} style={dinS.bookingCard}
                onPress={() => { setOwnerBooking(b); setShowOwnerModal(true); }} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={dinS.bookingGuest}>{b.guestName}</Text>
                  <Text style={dinS.bookingMeta}>
                    Mesa {tables.find(t => t.id === b.tableId)?.number} · {shift?.label} · {b.guests} pax
                  </Text>
                  {b.notes ? <Text style={dinS.bookingNotes} numberOfLines={1}>Obs: {b.notes}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[dinS.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[dinS.statusText, { color: statusColor }]}>
                      {b.status === 'confirmed' ? 'Confirmada' : b.status === 'seated' ? 'Sentado'
                        : b.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <BookingModal visible={showBookingForm} table={selectedTable}
        onClose={() => { setShowBookingForm(false); setSelectedTable(null); onUnsavedChange?.(false); }}
        onConfirm={handleConfirmBooking} />

      <OwnerBookingModal visible={showOwnerModal} booking={ownerBooking} tables={tables}
        onClose={() => setShowOwnerModal(false)} onStatusChange={handleStatusChange} />
    </View>
  );
}

export default DiningModule;

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const dinS = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F7F7F8' },
  rbacBadge:         { flexDirection: 'row', alignItems: 'center', gap: 6, margin: 12, marginBottom: 0,
                       paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#22A06B' + '10', borderRadius: 8 },
  rbacText:          { fontSize: 11, color: '#22A06B', fontWeight: '600' },
  statsRow:          { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  statChip:          { flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10,
                       borderWidth: 1, paddingVertical: 8, gap: 2, elevation: 1,
                       shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  statVal:           { fontSize: 18, fontWeight: '800' },
  statLabel:         { fontSize: 9, fontWeight: '600', color: '#8A8A8A' },
  tabBar:            { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1,
                       borderBottomColor: '#EBEBEB', marginTop: 12 },
  tab:               { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                       gap: 5, paddingVertical: 12 },
  tabActive:         { borderBottomWidth: 2, borderBottomColor: '#D32323' },
  tabLabel:          { fontSize: 13, fontWeight: '500', color: '#8A8A8A' },
  tabLabelActive:    { color: '#D32323', fontWeight: '700' },
  shiftSelector:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  shiftPill:         { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20,
                       backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBEBEB' },
  shiftPillActive:   { backgroundColor: '#D32323', borderColor: '#D32323' },
  shiftPillText:     { fontSize: 12, fontWeight: '600', color: '#8A8A8A' },
  shiftPillTextActive: { color: '#FFFFFF' },
  legend:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  legendItem:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:         { width: 8, height: 8, borderRadius: 4 },
  legendLabel:       { fontSize: 11, color: '#8A8A8A' },
  legendNote:        { flex: 1, fontSize: 10, color: '#8A8A8A', textAlign: 'right' },
  tableGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  tableCard:         { width: '30%', borderRadius: 10, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 3 },
  tableNumber:       { fontSize: 13, fontWeight: '700', color: '#111111' },
  tableCap:          { fontSize: 11, color: '#8A8A8A' },
  tableStatus:       { fontSize: 10, fontWeight: '700', marginTop: 2 },
  tableGuest:        { fontSize: 9, color: '#D97706', fontWeight: '600', marginTop: 2, maxWidth: '100%' },
  catPill:           { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                       backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#EBEBEB' },
  catPillActive:     { backgroundColor: '#D32323', borderColor: '#D32323' },
  catPillText:       { fontSize: 13, fontWeight: '600', color: '#8A8A8A' },
  catPillTextActive: { color: '#FFFFFF' },
  menuItem:          { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, flexDirection: 'row',
                       alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EBEBEB',
                       elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  menuItemUnavail:   { opacity: 0.55 },
  menuName:          { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 3 },
  menuDesc:          { fontSize: 12, color: '#8A8A8A', lineHeight: 17, marginBottom: 4 },
  menuPrice:         { fontSize: 14, fontWeight: '700', color: '#D32323' },
  unavailTag:        { fontSize: 12, color: '#8A8A8A', fontWeight: '400' },
  ownerMenuHint:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16,
                       marginTop: 8, backgroundColor: '#1565C0' + '10', borderRadius: 8,
                       paddingHorizontal: 10, paddingVertical: 6 },
  ownerMenuHintText: { fontSize: 11, color: '#1565C0' },
  bookingCard:       { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, flexDirection: 'row',
                       alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EBEBEB',
                       elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  bookingGuest:      { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 3 },
  bookingMeta:       { fontSize: 12, color: '#8A8A8A' },
  bookingNotes:      { fontSize: 11, color: '#1565C0', marginTop: 2 },
  statusBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:        { fontSize: 11, fontWeight: '700' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                       paddingBottom: Platform.OS === 'ios' ? 34 : 24, maxHeight: '92%' },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 20, paddingVertical: 18,
                       borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalTitle:        { fontSize: 18, fontWeight: '700', color: '#111111' },
  modalClose:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F7F7F8',
                       alignItems: 'center', justifyContent: 'center' },
  fieldLabel:        { fontSize: 12, fontWeight: '700', color: '#8A8A8A', marginBottom: 4, paddingHorizontal: 16 },
  input:             { backgroundColor: '#F7F7F8', borderRadius: 10, paddingHorizontal: 14,
                       paddingVertical: 12, fontSize: 15, color: '#111111', marginHorizontal: 16,
                       borderWidth: 1, borderColor: '#EBEBEB' },
  inputMulti:        { height: 90, textAlignVertical: 'top' },
  charCount:         { fontSize: 11, color: '#8A8A8A', textAlign: 'right', marginRight: 16, marginTop: 3 },
  shiftRow:          { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  shiftBtn:          { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
                       backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#EBEBEB' },
  shiftBtnActive:    { borderColor: '#D32323', backgroundColor: '#D32323' + '10' },
  shiftIcon:         { fontSize: 18, marginBottom: 2 },
  shiftLabel:        { fontSize: 12, fontWeight: '700', color: '#8A8A8A' },
  shiftLabelActive:  { color: '#D32323' },
  shiftTime:         { fontSize: 10, color: '#8A8A8A' },
  counterRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  counterBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F7F8',
                       borderWidth: 1, borderColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' },
  counterVal:        { fontSize: 22, fontWeight: '800', color: '#111111', minWidth: 32, textAlign: 'center' },
  counterCap:        { fontSize: 12, color: '#8A8A8A' },
  summaryCard:       { marginHorizontal: 16, backgroundColor: '#F7F7F8', borderRadius: 10,
                       padding: 14, gap: 4, borderWidth: 1, borderColor: '#EBEBEB' },
  summaryLine:       { fontSize: 14, fontWeight: '600', color: '#111111' },
  confirmBtn:        { marginHorizontal: 16, backgroundColor: '#D32323', borderRadius: 12,
                       paddingVertical: 15, alignItems: 'center',
                       elevation: 3, shadowColor: '#D32323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  confirmBtnText:    { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  infoRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9,
                       borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  infoLabel:         { fontSize: 12, fontWeight: '700', color: '#8A8A8A', width: 70 },
  infoValue:         { flex: 1, fontSize: 14, color: '#111111', fontWeight: '500' },
  ownerActions:      { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  ownerBtn:          { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ownerBtnText:      { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  emptyText:         { textAlign: 'center', fontSize: 14, color: '#8A8A8A', paddingVertical: 32 },
});