/**
 * ============================================================================
 * OWNER MODULE  (v1.0.0 — Fase 3.5: Dashboard do Dono)
 * ============================================================================
 * Contém TODA a inteligência de gestão do negócio:
 *   • Dashboard (tabs: Dashboard / Notificações / Meu Negócio)
 *   • App Layers de dono (ownerReservasDining, ownerReservas, ownerStats, ownerPromos)
 *   • Todos os modais de gestão (Menu, Inventário, Serviços, Quartos, Entrega,
 *     Encomendas, Promoções, Configurações, Fotos, iCal, Amenidades, Reservas)
 *   • CalendarPicker (usado exclusivamente pelo dono)
 *
 * Props:
 *   businesses        — lista completa (para lookup do negócio dono)
 *   activeBusinessTab / setActiveBusinessTab
 *   insets            — SafeAreaInsets passados do Main2
 *   onUpdateBusiness  — (fields) => void   [updateOwnerBiz no Main2]
 *   onSyncPromoDeals  — (promos) => void   [syncPromoDeals no Main2]
 *   onExitOwnerMode   — () => void         [setIsBusinessMode(false) + nav home]
 *   onViewBusiness    — (business) => void [handleBusinessPress no Main2]
 * ============================================================================
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  SafeAreaView, Image, TextInput, Alert, Switch,
  Dimensions, Platform, Animated, PanResponder,
  KeyboardAvoidingView, Linking, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import {
  Icon, COLORS, OWNER_BUSINESS,
  OPERATIONAL_MODULES, NAV_BAR_STYLES,
  renderStars, getBusinessStatus, AMENITY_ICON_MAP,
} from '../../core/AchAqui_Core';
import { HospitalityModule }  from '../../operations/HospitalityModule';
import { ReceptionScreen }    from '../../operations/ReceptionScreen';
import { DashboardPMS }       from '../../operations/DashboardPMS';
import StaffManagementModal   from '../../operations/StaffManagementModal';
import { DiningModule }       from '../../operations/DiningModule';
import { ProfessionalModule } from '../../operations/ProfessionalModule';
import { backendApi } from '../../lib/backendApi';
import { ClaimFlow } from './ClaimFlow';

import { editorS, configS, polS, photoS, bizS, profS, hS } from '../../styles/Main.styles';

// ── Constantes locais (derivadas de ALL_CATEGORIES do Core) ─────────────────
import { ALL_CATEGORIES } from '../../core/AchAqui_Core';
const ALL_CAT_LABEL = Object.fromEntries(ALL_CATEGORIES.flatMap(s => s.items.map(i => [i.id, i.label])));
const ALL_CAT_ICON  = Object.fromEntries(ALL_CATEGORIES.flatMap(s => s.items.map(i => [i.id, i.icon])));
const BUSINESS_TYPE_BADGES = {
  food:          { icon: '🍴', label: 'Alimentação',    color: '#EA580C' },
  retail:        { icon: '🛍️', label: 'Comércio',       color: '#D97706' },
  health:        { icon: '🏥', label: 'Saúde',          color: '#10B981' },
  beauty:        { icon: '💅', label: 'Beleza',          color: '#EC4899' },
  professional:  { icon: '👔', label: 'Profissional',   color: '#059669' },
  service:       { icon: '⚙️', label: 'Serviço',        color: '#3B82F6' },
  education:     { icon: '🎓', label: 'Educação',       color: '#DC2626' },
  freelancer:    { icon: '💼', label: 'Freelancer',     color: '#8B5CF6' },
  accommodation: { icon: '🏨', label: 'Alojamento',     color: '#0EA5E9' },
  entertainment: { icon: '🎭', label: 'Entretenimento', color: '#7C3AED' },
  sports:        { icon: '⚽', label: 'Desporto',       color: '#16A34A' },
  automotive:    { icon: '🚗', label: 'Automóvel',      color: '#6B7280' },
  tech:          { icon: '💻', label: 'Tecnologia',     color: '#2563EB' },
  finance:       { icon: '💰', label: 'Finanças',       color: '#B45309' },
  logistics:     { icon: '🚚', label: 'Logística',      color: '#78716C' },
  other:         { icon: '🏢', label: 'Outro',          color: '#6B7280' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// OWNER CONSTANTS (mock data — Fase 2+: virão de API)
// ─────────────────────────────────────────────────────────────────────────────
const BUSINESS_NOTIFICATIONS = [
  { id: 'notif_1', type: 'review',    icon: '⭐', title: 'Nova Avaliação',   message: 'Maria Silva deixou uma avaliação de 5 estrelas',    time: '5 min atrás',  read: false },
  { id: 'notif_2', type: 'checkin',   icon: '✓',  title: 'Novo Check-in',    message: 'João Costa fez check-in no seu negócio',            time: '1h atrás',     read: false },
  { id: 'notif_3', type: 'booking',   icon: '📅', title: 'Nova Reserva',     message: 'Ana Santos reservou uma mesa para 4 pessoas',       time: '3h atrás',     read: true  },
  { id: 'notif_4', type: 'promotion', icon: '🔥', title: 'Promoção Ativa',   message: 'Seu código PIZZA20 foi usado 12 vezes hoje',        time: 'Ontem',        read: true  },
  { id: 'notif_5', type: 'milestone', icon: '🏆', title: 'Meta Alcançada',   message: 'Parabéns! Você atingiu 100 check-ins',              time: '2 dias atrás', read: true  },
];

const AMENITIES_CATEGORIES = [
  { title: 'Comodidades', items: [
    { id: 'wifi', icon: 'wifi', label: 'Wi-Fi Grátis' },
    { id: 'outdoor', icon: 'outdoor', label: 'Esplanada' },
    { id: 'parking', icon: 'parking', label: 'Estacionamento' },
    { id: 'delivery', icon: 'delivery', label: 'Delivery' },
    { id: 'takeaway', icon: 'fastdelivery', label: 'Take-away' },
    { id: 'vegan', icon: 'heart', label: 'Vegano' },
    { id: 'wheelchair', icon: 'wheelchair', label: 'Acessibilidade' },
    { id: 'kids', icon: 'users', label: 'Espaço Kids' },
    { id: 'livemusic', icon: 'star', label: 'Música ao Vivo' },
  ]},
  { title: 'Compras', items: [
    { id: 'tpa', icon: 'payment', label: 'TPA/Express' },
    { id: 'homedelivery', icon: 'delivery', label: 'Entrega Domicílio' },
    { id: '24h', icon: 'clock', label: 'Aberto 24h' },
    { id: 'ac', icon: 'certified', label: 'Ar Condicionado' },
    { id: 'carts', icon: 'delivery', label: 'Carrinhos' },
  ]},
  { title: 'Serviços & Bem-Estar', items: [
    { id: 'appointment', icon: 'calendar', label: 'Agendamento Online' },
    { id: 'courtesy', icon: 'heart', label: 'Café de Cortesia' },
    { id: 'shower', icon: 'outdoor', label: 'Duche' },
    { id: 'certified', icon: 'certified', label: 'Certificado Oficial' },
  ]},
  { title: 'Profissionais & Geral', items: [
    { id: 'online', icon: 'web', label: 'Atendimento Online' },
    { id: 'freeconsult', icon: 'heart', label: 'Consulta Grátis' },
    { id: 'portfolio', icon: 'portfolio', label: 'Portfólio' },
    { id: 'languages', icon: 'globe', label: 'Línguas (EN/PT)' },
    { id: 'generator', icon: 'certified', label: 'Gerador Próprio' },
  ]},
];

const INITIAL_RESERVATIONS = [
  { id: 'res_1', user: 'Maria Silva', userAvatar: '👩', date: '2026-02-22', time: '19:30', people: 4, status: 'active', phone: '+244 923 111 222', notes: 'Mesa perto da janela, se possível', createdAt: '2026-02-20 10:30' },
  { id: 'res_2', user: 'João Costa', userAvatar: '👨', date: '2026-02-21', time: '20:00', people: 2, status: 'active', phone: '+244 923 333 444', notes: '', createdAt: '2026-02-19 15:45' },
  { id: 'res_3', user: 'Ana Santos', userAvatar: '👩‍🦱', date: '2026-02-23', time: '18:00', people: 6, status: 'active', phone: '+244 923 555 666', notes: 'Aniversário - decoração especial', createdAt: '2026-02-18 09:20' },
  { id: 'res_4', user: 'Pedro Alves', userAvatar: '👨‍💼', date: '2026-02-19', time: '19:00', people: 3, status: 'cancelled', phone: '+244 923 777 888', notes: 'Cliente cancelou', createdAt: '2026-02-15 14:10' },
  { id: 'res_5', user: 'Carla Mendes', userAvatar: '👩‍🎓', date: '2026-02-18', time: '21:00', people: 2, status: 'cancelled', phone: '+244 923 999 000', notes: 'Cancelado pelo restaurante', createdAt: '2026-02-17 11:00' },
];

const INITIAL_PROMOTIONS = [
  { id: 'promo_1', title: '20% OFF em pizzas grandes', type: 'percent', discount: '20', description: 'Válido para pizzas tamanho grande nos fins de semana.', startDate: '2026-02-01', endDate: '2026-03-31', active: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// CalendarPicker — pure RN, sem dependências nativas
// ─────────────────────────────────────────────────────────────────────────────
function CalendarPicker({ visible, value, onConfirm, onCancel, label = 'Selecionar Data', minDate }) {
  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const initDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : today;
  const [viewYear,  setViewYear]  = React.useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initDate.getMonth());
  const [selected,  setSelected]  = React.useState(value || '');
  React.useEffect(() => {
    if (visible) {
      const d = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : today;
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelected(value || '');
    }
  }, [visible]);
  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const toISO = (d) => `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const isDisabled = (d) => { if (!d) return true; if (!minDate) return false; return toISO(d) < minDate; };
  const handleConfirm = () => {
    if (!selected) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selected)) return;
    const [y, m, d] = selected.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return;
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return;
    onConfirm(selected);
  };
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calS.backdrop}>
        <View style={calS.card}>
          <View style={calS.header}><Text style={calS.headerLabel}>{label}</Text></View>
          <View style={calS.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={calS.navBtn} activeOpacity={0.7}><Icon name="back" size={18} color="#111" strokeWidth={2.5}/></TouchableOpacity>
            <Text style={calS.monthTitle}>{MONTHS_PT[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={calS.navBtn} activeOpacity={0.7}><Icon name="arrowRight" size={18} color="#111" strokeWidth={2.5}/></TouchableOpacity>
          </View>
          <View style={calS.weekRow}>{DAYS_PT.map(d => <Text key={d} style={calS.weekDay}>{d}</Text>)}</View>
          <View style={calS.grid}>
            {cells.map((day, idx) => {
              const iso = day ? toISO(day) : ''; const isSel = iso === selected; const isToday = iso === todayStr; const disabled = isDisabled(day);
              return (
                <TouchableOpacity key={idx} style={[calS.cell, isSel && calS.cellSelected, isToday && !isSel && calS.cellToday]}
                  onPress={() => { if (day && !disabled) setSelected(iso); }} activeOpacity={day && !disabled ? 0.7 : 1} disabled={!day || disabled}>
                  {day ? <Text style={[calS.cellText, isSel && calS.cellTextSelected, isToday && !isSel && calS.cellTextToday, disabled && calS.cellTextDisabled]}>{day}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={calS.selectedRow}>
            <Text style={calS.selectedLabel}>
              {selected && /^\d{4}-\d{2}-\d{2}$/.test(selected) ? (() => { const [y,m,d] = selected.split('-'); return `${d}/${m}/${y}`; })() : 'Nenhuma data seleccionada'}
            </Text>
          </View>
          <View style={calS.actions}>
            <TouchableOpacity style={calS.btnCancel} onPress={onCancel} activeOpacity={0.8}><Text style={calS.btnCancelText}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[calS.btnConfirm, !selected && { opacity: 0.4 }]} onPress={handleConfirm} disabled={!selected} activeOpacity={0.8}><Text style={calS.btnConfirmText}>Confirmar</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const calS = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', paddingHorizontal:16 },
  card: { width:'100%', maxWidth:360, backgroundColor:'#FFFFFF', borderRadius:20, overflow:'hidden' },
  header: { paddingHorizontal:20, paddingTop:18, paddingBottom:6 },
  headerLabel: { fontSize:15, fontWeight:'700', color:'#111111', textAlign:'center' },
  monthNav: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:10 },
  navBtn: { width:36, height:36, borderRadius:18, backgroundColor:'#F7F7F8', alignItems:'center', justifyContent:'center' },
  monthTitle: { fontSize:15, fontWeight:'700', color:'#111111' },
  weekRow: { flexDirection:'row', paddingHorizontal:8, paddingBottom:6 },
  weekDay: { flex:1, textAlign:'center', fontSize:11, fontWeight:'700', color:'#8A8A8A' },
  grid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:8, paddingBottom:8 },
  cell: { width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:100 },
  cellSelected: { backgroundColor:'#D32323' },
  cellToday: { borderWidth:1.5, borderColor:'#D32323' },
  cellText: { fontSize:13, fontWeight:'500', color:'#111111' },
  cellTextSelected: { color:'#FFFFFF', fontWeight:'700' },
  cellTextToday: { color:'#D32323', fontWeight:'700' },
  cellTextDisabled: { color:'#CCCCCC' },
  selectedRow: { paddingHorizontal:20, paddingVertical:10, borderTopWidth:1, borderTopColor:'#F2F2F2', alignItems:'center' },
  selectedLabel: { fontSize:14, fontWeight:'600', color:'#555555' },
  actions: { flexDirection:'row', gap:10, padding:16, borderTopWidth:1, borderTopColor:'#F2F2F2' },
  btnCancel: { flex:1, paddingVertical:12, borderRadius:12, borderWidth:1.5, borderColor:'#EBEBEB', alignItems:'center' },
  btnCancelText: { fontSize:14, fontWeight:'600', color:'#555555' },
  btnConfirm: { flex:1, paddingVertical:12, borderRadius:12, backgroundColor:'#D32323', alignItems:'center' },
  btnConfirmText: { fontSize:14, fontWeight:'700', color:'#FFFFFF' },
});


// ─────────────────────────────────────────────────────────────────────────────
// OwnerModule — componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function OwnerModule({
  businesses = [],
  isLoading = false,
  activeBusinessTab,
  setActiveBusinessTab,
  insets,
  onUpdateBusiness = () => {},
  onSyncPromoDeals = () => {},
  onExitOwnerMode = () => {},
  onViewBusiness = () => {},
  liveBookings = [],
  liveNotifications = [],
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {},
  authRole = 'CLIENT',
  authEmail = '',
  ownerMetrics: ownerMetricsProp = null,
  accessToken = null,
  authUserId = null,
  onRefreshOwnerData = () => {},
  ownerRoomBookings: ownerRoomBookingsProp = null,
  onOwnerRoomBookingsChange = null,
}) {
  const ownerMetrics = ownerMetricsProp || {
    views: 0,
    viewsChange: 0,
    clicks: 0,
    clicksChange: 0,
    checkIns: 0,
    checkInsChange: 0,
    favorites: 0,
    favoritesChange: 0,
  };

  // ── App layer (dono) — ownerReservasDining / ownerReservas / ownerStats / ownerPromos
  const appLayerX        = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const appLayerProgress = useRef(new Animated.Value(0)).current;
  const [activeAppLayer, setActiveAppLayer] = useState(null);
  const [ownerStatsPeriod, setOwnerStatsPeriod] = useState('30 dias');

  const openAppLayer = useCallback((layerName) => {
    appLayerX.setValue(SCREEN_WIDTH); appLayerProgress.setValue(0);
    setActiveAppLayer(layerName);
    Animated.parallel([
      Animated.timing(appLayerX,        { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(appLayerProgress, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [appLayerX, appLayerProgress]);

  const closeAppLayer = useCallback(() => {
    Animated.parallel([
      Animated.timing(appLayerX,        { toValue: SCREEN_WIDTH, duration: 280, useNativeDriver: true }),
      Animated.timing(appLayerProgress, { toValue: 0,            duration: 280, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      appLayerProgress.setValue(0);
      requestAnimationFrame(() => setActiveAppLayer(null));
    });
  }, [appLayerX, appLayerProgress]);

  const appLayerPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        const touchX = evt.nativeEvent.pageX - dx;
        if (touchX > SCREEN_WIDTH / 2) return false;
        if (Math.abs(dx) < (Platform.OS === 'android' ? 6 : 3)) return false;
        if (Math.abs(dx) < Math.abs(dy) * 1.5) return false;
        return dx > 0;
      },
      onPanResponderGrant: () => { appLayerX.stopAnimation(); },
      onPanResponderMove: (_, { dx }) => {
        if (dx <= 0) return;
        appLayerX.setValue(dx);
        appLayerProgress.setValue(Math.max(0, 1 - dx / SCREEN_WIDTH));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_WIDTH * 0.40 || vx > 1.0) {
          Animated.parallel([
            Animated.timing(appLayerX,        { toValue: SCREEN_WIDTH, duration: 280, useNativeDriver: true }),
            Animated.timing(appLayerProgress, { toValue: 0,            duration: 280, useNativeDriver: true }),
          ]).start(({ finished }) => { if (finished) { appLayerProgress.setValue(0); requestAnimationFrame(() => setActiveAppLayer(null)); } });
        } else {
          Animated.parallel([
            Animated.spring(appLayerX,        { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.spring(appLayerProgress, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(appLayerX,        { toValue: 0, useNativeDriver: true }),
          Animated.spring(appLayerProgress, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  // ── CalendarPicker global state ────────────────────────────────────────────
  const [calVisible,  setCalVisible]  = useState(false);
  const [calLabel,    setCalLabel]    = useState('');
  const [calValue,    setCalValue]    = useState('');
  const [calMinDate,  setCalMinDate]  = useState(undefined);
  const [calCallback, setCalCallback] = useState(null);

  // ── Refs usados no Profile Overlay (nav bar interno) ──────────────────────
  const scrollViewRef   = useRef(null);   // no-op ref — scroll to top não aplicável aqui
  const lastTapTime     = useRef(0);
  const cancelScrollRef = useRef(null);   // scroll no modal de cancelamento
  const tabFocusAnimRef = useRef({
    dashboard:    new Animated.Value(0),
    notifications: new Animated.Value(0),
    mybusiness:   new Animated.Value(0),
    exitbusiness: new Animated.Value(0),
  }).current;
  const triggerTabFocusAnim = useCallback((tabId) => {
    if (!tabFocusAnimRef[tabId]) return;
    tabFocusAnimRef[tabId].setValue(0);
    Animated.sequence([
      Animated.timing(tabFocusAnimRef[tabId], { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(tabFocusAnimRef[tabId], { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start();
  }, [tabFocusAnimRef]);
  const openCal = useCallback((label, currentVal, onConfirm, minDate) => {
    const safe = (currentVal && /^\d{4}-\d{2}-\d{2}$/.test(currentVal)) ? currentVal : '';
    setCalLabel(label); setCalValue(safe); setCalMinDate(minDate || undefined);
    setCalCallback({ fn: onConfirm }); setCalVisible(true);
  }, []);

  // ── Owner feature states ───────────────────────────────────────────────────
  const [businessStatusOverride, setBusinessStatusOverride] = useState(null);
  const [ownerAmenities, setOwnerAmenities] = useState(OWNER_BUSINESS.amenities || []);
  const [activeModules, setActiveModules] = useState(OWNER_BUSINESS.modules || {});
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [menuItems, setMenuItems] = useState(OWNER_BUSINESS.menuItems || []);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuItemForm, setMenuItemForm] = useState({ name: '', description: '', price: '', category: '', available: true });
  const [isMenuItemLoading, setIsMenuItemLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState(OWNER_BUSINESS.inventoryItems || []);
  const [showInventoryEditor, setShowInventoryEditor] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({ name: '', price: '', stock: '', category: '', available: true });
  const [isInventoryItemLoading, setIsInventoryItemLoading] = useState(false);
  const [servicesList, setServicesList] = useState(OWNER_BUSINESS.servicesList || []);
  const [showServicesEditor, setShowServicesEditor] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', basePrice: '', duration: '', available: true });
  const [isServiceLoading, setIsServiceLoading] = useState(false);
  const [roomTypes, setRoomTypes]       = useState(ownerBiz?.roomTypes || []);
  const [htRooms, setHtRooms]           = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [roomPhysForm, setRoomPhysForm] = useState(null); // null | { roomTypeId, number, floor, notes, editId }
  const [showRoomsEditor, setShowRoomsEditor] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [checkInTime, setCheckInTime] = useState(OWNER_BUSINESS.checkInTime || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(OWNER_BUSINESS.checkOutTime || '12:00');
  const [minNights, setMinNights] = useState(OWNER_BUSINESS.minNights || '1');
  const [cancelPolicy, setCancelPolicy] = useState(OWNER_BUSINESS.cancelPolicy || 'flexible');
  const [includesBreakfast, setIncludesBreakfast] = useState(OWNER_BUSINESS.includesBreakfast || false);
  const [petsAllowed, setPetsAllowed] = useState(OWNER_BUSINESS.petsAllowed || false);
  const [instantConfirm, setInstantConfirm] = useState(OWNER_BUSINESS.instantConfirm || false);
  const [roomBlockings, setRoomBlockings] = useState(OWNER_BUSINESS.roomBlockings || {});
  const [addingBlockForRoom, setAddingBlockForRoom] = useState(null);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({ name: '', description: '', pricePerNight: '', maxGuests: '', totalRooms: '1', amenities: [], photos: [], available: true, _photoUrlInput: '' });
  const [isRoomPhotoUploading, setIsRoomPhotoUploading] = useState(false);
  const [showRoomTypesEditor, setShowRoomTypesEditor] = useState(false);
  // Reservas de Quartos — estado partilhado com o Main (e via OLR com o HospitalityModule)
  // Se o Main passou ownerRoomBookingsProp, usá-lo; senão fallback local para isolamento
  const LOCAL_ROOM_BOOKINGS_FALLBACK = [
    { id: 'rb_1', businessId: OWNER_BUSINESS.id, roomTypeId: '1', guestName: 'Ana Rodrigues', guestPhone: '+244 912 111 222',
      checkIn: '01/03/2026', checkOut: '05/03/2026', nights: 4, totalPrice: 60000, status: 'confirmed', createdAt: '2026-02-20' },
    { id: 'rb_2', businessId: OWNER_BUSINESS.id, roomTypeId: '1', guestName: 'Paulo Ferreira', guestPhone: '+244 923 333 444',
      checkIn: '03/03/2026', checkOut: '06/03/2026', nights: 3, totalPrice: 45000, status: 'pending', createdAt: '2026-02-21' },
    { id: 'rb_3', businessId: OWNER_BUSINESS.id, roomTypeId: '2', guestName: 'Margarida Sousa', guestPhone: '+244 934 555 666',
      checkIn: '28/02/2026', checkOut: '02/03/2026', nights: 2, totalPrice: 70000, status: 'confirmed', createdAt: '2026-02-19' },
  ];
  const [localRoomBookings, setLocalRoomBookings] = useState(LOCAL_ROOM_BOOKINGS_FALLBACK);
  // statusOverrides — optimistic update sobre ownerRoomBookingsProp (só leitura)
  const [roomStatusOverrides, setRoomStatusOverrides] = useState({});
  const setRoomBookings = onOwnerRoomBookingsChange ?? setLocalRoomBookings;
  // roomBookings: aplica overrides por cima da fonte de verdade
  const roomBookings = useMemo(() => {
    const base = ownerRoomBookingsProp ?? localRoomBookings;
    if (Object.keys(roomStatusOverrides).length === 0) return base;
    return base.map(rb => roomStatusOverrides[rb.id]
      ? { ...rb, status: roomStatusOverrides[rb.id] }
      : rb
    );
  }, [ownerRoomBookingsProp, localRoomBookings, roomStatusOverrides]);

  // Limpar overrides quando o Realtime confirmar o novo status
  useEffect(() => {
    if (!ownerRoomBookingsProp || Object.keys(roomStatusOverrides).length === 0) return;
    setRoomStatusOverrides(prev => {
      const next = { ...prev };
      let changed = false;
      ownerRoomBookingsProp.forEach(rb => {
        if (next[rb.id] && rb.status === next[rb.id]) {
          delete next[rb.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [ownerRoomBookingsProp]);
  const [showRoomBookingsManager, setShowRoomBookingsManager] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showReception, setShowReception] = useState(false);
  const [showStaffMgmtFromDashboard, setShowStaffMgmtFromDashboard] = useState(false);
  const [openStaffOnHospitalityEntry, setOpenStaffOnHospitalityEntry] = useState(false);
  const [roomBookingsExpanded, setRoomBookingsExpanded] = useState({});
  const [selectedRoomBooking, setSelectedRoomBooking] = useState(null);
  const [roomBookingsFilter, setRoomBookingsFilter] = useState('all');
  const [deliveryAreas, setDeliveryAreas] = useState(OWNER_BUSINESS.deliveryAreas || []);
  const [showDeliveryConfig, setShowDeliveryConfig] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({ name: '', fee: '', estimatedTime: '' });
  const [customOrders, setCustomOrders] = useState(OWNER_BUSINESS.customOrders || []);
  const [showCustomOrders, setShowCustomOrders] = useState(false);
  const [showCustomOrderDetail, setShowCustomOrderDetail] = useState(false);
  const [selectedCustomOrder, setSelectedCustomOrder] = useState(null);
  const [deliveryOrders, setDeliveryOrders] = useState(OWNER_BUSINESS.deliveryOrders || []);
  const [showDeliveryOrders, setShowDeliveryOrders] = useState(false);
  const [showDeliveryOrderDetail, setShowDeliveryOrderDetail] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState(null);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({ price: '', deadline: '', notes: '' });
  const [showEditDelivery, setShowEditDelivery] = useState(false);
  const [editDeliveryForm, setEditDeliveryForm] = useState({ estimatedTime: '', notes: '' });
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionType, setActionType] = useState(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [reservationFilter, setReservationFilter] = useState('active');
  const [businessReservations, setBusinessReservations] = useState(INITIAL_RESERVATIONS);
  const [isUpdatingBusinessStatus, setIsUpdatingBusinessStatus] = useState(false);
  const [bookingActionLoadingById, setBookingActionLoadingById] = useState({});
  const [recentBookingActionById, setRecentBookingActionById] = useState({});
  const [isUpdatingBusinessInfo, setIsUpdatingBusinessInfo] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [showResCancelModal, setShowResCancelModal] = useState(false);
  const [resCancelReason, setResCancelReason] = useState('');
  const [showPromoCodeModal, setShowPromoCodeModal] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [resCancelReasonOther, setResCancelReasonOther] = useState('');
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showOwnerCategoryPicker, setShowOwnerCategoryPicker] = useState(false);
  const [showOwnerSubCategoryPicker, setShowOwnerSubCategoryPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showICalModal, setShowICalModal] = useState(false);
  const [ownerDarkMode, setOwnerDarkMode] = useState(false);
  const [ownerNotifEnabled, setOwnerNotifEnabled] = useState(true);
  const [ownerAutoReply, setOwnerAutoReply] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [promosList, setPromosList] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState(null);
  const [settingsInfo, setSettingsInfo] = useState({
    name: ownerBiz?.name || '',
    category: ownerBiz?.category || '',
    subcategory: ownerBiz?.subcategory || '',
    primaryCategoryId: ownerBiz?.primaryCategoryId || '',
    subCategoryIds: ownerBiz?.subCategoryIds || [],
    businessType: ownerBiz?.businessType || '',
    businessTypeCustom: '',
    phone: ownerBiz?.metadata?.phone || '',
    website: ownerBiz?.metadata?.website || '',
    description: ownerBiz?.description || '',
    price: ownerBiz?.price || '',
    address: ownerBiz?.address || '',
    neighborhood: ownerBiz?.neighborhood || '',
    latitude: ownerBiz?.latitude || null,
    longitude: ownerBiz?.longitude || null,
  });
  const [ownerHighlights, setOwnerHighlights] = useState(OWNER_BUSINESS.highlights || ['"Pizza autêntica"', '"Ambiente familiar"']);
  const [ownerPortfolio, setOwnerPortfolio] = useState(OWNER_BUSINESS.portfolio || []);
  const [ownerServicesOffered, setOwnerServicesOffered] = useState(OWNER_BUSINESS.servicesOffered || []);
  const [ownerPopularDishes, setOwnerPopularDishes] = useState(OWNER_BUSINESS.popularDishes || []);
  const [ownerAvailability, setOwnerAvailability] = useState(OWNER_BUSINESS.availability || {
    mon: [{ start:'09:00', end:'18:00' }], tue: [{ start:'09:00', end:'18:00' }],
    wed: [{ start:'09:00', end:'18:00' }], thu: [{ start:'09:00', end:'18:00' }],
    fri: [{ start:'09:00', end:'18:00' }], sat: [], sun: []
  });
  const [showHighlightsEditor, setShowHighlightsEditor] = useState(false);
  const [showPortfolioEditor, setShowPortfolioEditor] = useState(false);
  const [showServicesOfferedEditor, setShowServicesOfferedEditor] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [showPopularDishesEditor, setShowPopularDishesEditor] = useState(false);
  const [settingsHours, setSettingsHours] = useState({
    seg: { open: '11:00', close: '23:00', active: true }, ter: { open: '11:00', close: '23:00', active: true },
    qua: { open: '11:00', close: '23:00', active: true }, qui: { open: '11:00', close: '23:00', active: true },
    sex: { open: '11:00', close: '23:00', active: true }, sab: { open: '12:00', close: '00:00', active: true },
    dom: { open: '12:00', close: '22:00', active: true },
  });
  const [settingsNotifs, setSettingsNotifs] = useState({
    reservations: true, reviews: true, checkins: true, promotions: true, messages: false, milestones: true,
  });
  const [settingsOperations, setSettingsOperations] = useState({
    isOpen: true, temporarilyClosed: false,
    closedMessage: 'Estamos temporariamente fechados. Voltamos em breve!',
    payment: ['Multicaixa Express', 'TPA', 'Dinheiro'],
  });
  const [settingsVisibility, setSettingsVisibility] = useState({ isPublic: true, showAddress: true, showPhone: true });
  const [settingsAccount, setSettingsAccount] = useState({ email: authEmail || '', language: 'pt' });
  const [ownerPhotos, setOwnerPhotos] = useState(OWNER_BUSINESS.photos || []);
  const [businessNotifications, setBusinessNotifications] = useState(BUSINESS_NOTIFICATIONS);
  const [showNotifDetail, setShowNotifDetail] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showPhotosManager, setShowPhotosManager] = useState(false);
  const [accommodationPolicy, setAccommodationPolicy] = useState({
    minNights: 1, checkInTime: '14:00', checkOutTime: '12:00',
    cancelPolicy: 'flexible', breakfastIncluded: false, petsAllowed: false, instantConfirm: false,
  });
  const [showOccupancyEditor, setShowOccupancyEditor] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showClaimFlow, setShowClaimFlow]       = useState(false);
  const [showPromoManager, setShowPromoManager] = useState(false);
  const [promotions, setPromotions] = useState(INITIAL_PROMOTIONS);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoCalTarget, setPromoCalTarget] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ title:'', type:'percent', discount:'', description:'', startDate:'', endDate:'', active:true });
  const [ownerReviews, setOwnerReviews] = useState(OWNER_BUSINESS.recentReviews || []);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [reviewToReply, setReviewToReply] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [promoCode, setPromoCode] = useState(OWNER_BUSINESS.referralCode || '');
  const [promoDiscount, setPromoDiscount] = useState('20');
  const [promoExpiry, setPromoExpiry] = useState('31/03/2026');
  const [promoUsageLimit, setPromoUsageLimit] = useState('100');
  const [ownerNotifications, setOwnerNotifications] = useState([
    {id:'on1',icon:'🏨',title:'Nova Reserva',message:'João Silva reservou "Quarto Standard" para 05 Mar.',time:'2 min atrás',read:false},
    {id:'on2',icon:'⭐',title:'Nova Avaliação',message:'Ana M. deu 5 estrelas ao seu negócio.',time:'1h atrás',read:false},
    {id:'on3',icon:'💬',title:'Nova Pergunta',message:'Cliente perguntou sobre disponibilidade de estacionamento.',time:'3h atrás',read:true},
  ]);
  const [ownerEditFields, setOwnerEditFields] = useState({
    name: OWNER_BUSINESS.name, category: OWNER_BUSINESS.category,
    address: OWNER_BUSINESS.address||'', phone: OWNER_BUSINESS.phone||'',
    hours: OWNER_BUSINESS.hours||'', description: OWNER_BUSINESS.description||'', isPublic: true,
  });
  const [isBusinessPhotoUploading, setIsBusinessPhotoUploading] = useState(false);

  // ── findOwnerBiz — resolve o negócio dono da lista de businesses ──────────
  // Prioridade: 1º negócio da BD com este owner, 2º negócio com o ID fixo do mock, 3º mock local
  const ownerBiz = React.useMemo(() => {
    if (!authUserId) return null;
    return businesses?.find((b) => b?.owner?.id === authUserId) || null;
  }, [businesses, authUserId]);

  // ownerBusinessId: null se não tiver negócio real na BD
  const ownerBusinessId = React.useMemo(() => {
    return ownerBiz?.id || null;
  }, [ownerBiz]);
  const ownerPhotosStorageKey = useMemo(
    () => `owner_business_photos_${ownerBusinessId || OWNER_BUSINESS.id}`,
    [ownerBusinessId]
  );

  useEffect(() => {
    const photosFromBiz = Array.isArray(ownerBiz?.photos) ? ownerBiz.photos : [];
    if (photosFromBiz.length > 0) {
      setOwnerPhotos(photosFromBiz);
      OWNER_BUSINESS.photos = photosFromBiz;
      return;
    }
    const fallback = Array.isArray(OWNER_BUSINESS.photos) ? OWNER_BUSINESS.photos : [];
    setOwnerPhotos(fallback);
  }, [ownerBiz?.id, ownerBiz?.photos]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ownerPhotosStorageKey)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        setOwnerPhotos(parsed);
        OWNER_BUSINESS.photos = parsed;
        if (ownerBusinessId) {
          onUpdateBusiness({ photos: parsed }, ownerBusinessId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ownerPhotosStorageKey, ownerBusinessId, onUpdateBusiness]);

  // ── Quartos físicos ──────────────────────────────────────────────────────────
  const loadHtRooms = useCallback(async () => {
    if (!ownerBusinessId || !accessToken) return;
    setLoadingRooms(true);
    try {
      const rooms = await backendApi.getHtRooms(ownerBusinessId, accessToken);
      if (Array.isArray(rooms)) setHtRooms(rooms);
    } catch { /* sem quartos ainda */ }
    finally { setLoadingRooms(false); }
  }, [ownerBusinessId, accessToken]);

  const saveHtRoom = useCallback(async () => {
    if (!roomPhysForm) return;
    if (isSavingRoom) return; // prevenir double-submit
    if (!roomPhysForm.number?.trim()) { Alert.alert('Erro', 'O número do quarto é obrigatório.'); return; }
    if (!ownerBusinessId) { Alert.alert('Erro', 'Negócio não identificado. Guarda primeiro as informações básicas.'); return; }
    setIsSavingRoom(true);
    try {
      if (roomPhysForm.editId) {
        await backendApi.updateHtRoom(roomPhysForm.editId, {
          number: roomPhysForm.number.trim(),
          floor:  parseInt(roomPhysForm.floor) || 1,
          notes:  roomPhysForm.notes || null,
        }, accessToken);
      } else {
        await backendApi.createHtRoom({
          businessId: ownerBusinessId,
          roomTypeId: roomPhysForm.roomTypeId,
          number:     roomPhysForm.number.trim(),
          floor:      parseInt(roomPhysForm.floor) || 1,
          notes:      roomPhysForm.notes || null,
        }, accessToken);
      }
      setRoomPhysForm(null);
      loadHtRooms();
    } catch (e) { Alert.alert('Erro', e?.message || 'Não foi possível guardar.'); }
    finally { setIsSavingRoom(false); }
  }, [roomPhysForm, ownerBusinessId, accessToken, loadHtRooms, isSavingRoom]);

  const deleteHtRoom = useCallback(async (roomId, roomNumber) => {
    Alert.alert('Remover quarto', `Remover quarto nº ${roomNumber}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await backendApi.deleteHtRoom(roomId, accessToken);
          loadHtRooms();
        } catch (e) { Alert.alert('Erro', e?.message || 'Não foi possível remover.'); }
      }},
    ]);
  }, [accessToken, loadHtRooms]);

  const persistBusinessDraft = useCallback(async (fields) => {
    if (!ownerBusinessId || !accessToken || !fields || Object.keys(fields).length === 0) {
      return;
    }

    const {
      name,
      description,
      latitude,
      longitude,
      ...metadataPatch
    } = fields;

    const payload = {};
    if (typeof name === 'string' && name.trim()) payload.name = name;
    if (typeof description === 'string' && description.trim()) payload.description = description;
    if (typeof latitude === 'number') payload.latitude = latitude;
    if (typeof longitude === 'number') payload.longitude = longitude;

    if (Object.keys(metadataPatch).length > 0) {
      const currentMetadata =
        ownerBiz?.metadata && typeof ownerBiz?.metadata === 'object'
          ? ownerBiz?.metadata
          : {};
      payload.metadata = { ...currentMetadata, ...metadataPatch };
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    await backendApi.updateBusiness(ownerBusinessId, payload, accessToken);
  }, [ownerBiz?.metadata, ownerBusinessId, accessToken]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateOwnerBiz = useCallback((fields, { persist = true } = {}) => {
    onUpdateBusiness(fields, ownerBusinessId);
    OWNER_BUSINESS.promo = fields.promo ?? OWNER_BUSINESS.promo;

    if (!persist) return;

    persistBusinessDraft(fields).catch((error) => {
      console.error('[OwnerModule][PERSIST_FAIL]', {
        status: error?.status || null,
        message: error?.message || 'Falha ao persistir alterações do dono.',
      });
    });
  }, [onUpdateBusiness, ownerBusinessId, persistBusinessDraft]);

  const setBusinessOpen = useCallback(async (isOpen) => {
    if (!ownerBusinessId || !accessToken) {
      Alert.alert('Sessão inválida', 'Não foi possível validar a sessão do dono.');
      return;
    }

    const previousStatus =
      businessStatusOverride ||
      (ownerBiz?.isOpen ? 'open' : 'closed');
    const nextStatus = isOpen ? 'open' : 'closed';
    setIsUpdatingBusinessStatus(true);
    setBusinessStatusOverride(nextStatus);

    try {
      await backendApi.updateBusinessStatus(ownerBusinessId, { isOpen }, accessToken);
      updateOwnerBiz({ isOpen, statusText: isOpen ? 'Aberto agora' : 'Fechado' }, { persist: false });
    } catch (error) {
      setBusinessStatusOverride(previousStatus);
      Alert.alert(
        'Falha ao atualizar',
        error?.message || 'Não foi possível atualizar o estado do negócio.',
      );
    } finally {
      setIsUpdatingBusinessStatus(false);
    }
  }, [ownerBusinessId, accessToken, businessStatusOverride, ownerBiz?.isOpen, updateOwnerBiz]);

  const captarLocalizacao = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Ative a localização nas configurações do dispositivo.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setSettingsInfo(s => ({
        ...s,
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      }));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível captar a localização.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const appendOwnerPhoto = useCallback(async (localUri) => {
    if (!localUri || typeof localUri !== 'string') return;
    if (!ownerBusinessId) {
      Alert.alert('Negócio não encontrado', 'Guarda o negócio antes de adicionar fotos.');
      return;
    }

    const current = ownerPhotos || [];
    if (current.includes(localUri)) return;

    setIsBusinessPhotoUploading(true);
    try {
      const fileName = `biz-${Date.now()}.jpg`;

      // Comprimir e converter para base64
      const compressed = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      // Upload base64 — usa disco local como fallback quando Supabase não está configurado
      const result = await backendApi.uploadBusinessPhoto(
        ownerBusinessId,
        { fileName, mimeType: 'image/jpeg', base64: compressed.base64 },
        accessToken,
      );

      const publicUrl = result?.publicUrl;
      if (!publicUrl) throw new Error('URL pública não retornada pelo servidor.');

      const updated = [...current, publicUrl];
      OWNER_BUSINESS.photos = updated;
      setOwnerPhotos(updated);
      updateOwnerBiz({ photos: updated });
      AsyncStorage.setItem(ownerPhotosStorageKey, JSON.stringify(updated)).catch(() => {});

      // Persistir na BD — visível em todos os dispositivos
      await backendApi.updateBusiness(ownerBusinessId, { photos: updated }, accessToken);
    } catch (err) {
      Alert.alert('Erro no upload', err?.message || 'Não foi possível fazer upload da foto.');
    } finally {
      setIsBusinessPhotoUploading(false);
    }
  }, [ownerPhotos, ownerBusinessId, accessToken, updateOwnerBiz, ownerPhotosStorageKey]);

  const pickPhotoFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita acesso à galeria para escolher uma foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (uri) appendOwnerPhoto(uri);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  }, [appendOwnerPhoto]);

  const takePhotoWithCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita acesso à câmera para tirar uma foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (uri) appendOwnerPhoto(uri);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera.');
    }
  }, [appendOwnerPhoto]);

  const handleAddPhotoAction = useCallback(() => {
    Alert.alert('Adicionar foto', 'Escolha de onde importar a foto.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar Foto', onPress: takePhotoWithCamera },
      { text: 'Escolher da Galeria', onPress: pickPhotoFromGallery },
    ]);
  }, [pickPhotoFromGallery, takePhotoWithCamera]);

  const syncPromoDeals = useCallback((updatedPromotions) => {
    const deals = updatedPromotions.filter(p => p.active).map(p => ({
      id: p.id, title: p.title, description: p.description || '', expires: p.endDate || '',
      code: p.type === 'percent' ? `${p.discount}%OFF` : `${p.discount}KZ`,
    }));
    const activePromo = updatedPromotions.find(p => p.active);
    OWNER_BUSINESS.promo = activePromo ? activePromo.title : null;
    updateOwnerBiz({ deals, promo: activePromo ? activePromo.title : null });
    onSyncPromoDeals?.(updatedPromotions);
  }, [updateOwnerBiz, onSyncPromoDeals]);

  const closeOwnerTabOverlays = useCallback(() => {
    setShowModulesModal(false);
    setShowMenuEditor(false);
    setShowMenuItemForm(false);
    setShowInventoryEditor(false);
    setShowInventoryForm(false);
    setShowServicesEditor(false);
    setShowServiceForm(false);
    setShowRoomsEditor(false);
    setShowRoomForm(false);
    setShowRoomTypesEditor(false);
    setShowRoomBookingsManager(false);
    setShowDashboard(false);
    setShowReception(false);
    setShowStaffMgmtFromDashboard(false);
    setShowDeliveryConfig(false);
    setShowDeliveryForm(false);
    setShowCustomOrders(false);
    setShowCustomOrderDetail(false);
    setShowDeliveryOrders(false);
    setShowDeliveryOrderDetail(false);
    setShowEditOrder(false);
    setShowEditDelivery(false);
    setShowCancelReason(false);
    setShowReservationsModal(false);
    setShowResCancelModal(false);
    setShowPromoCodeModal(false);
    setShowAmenitiesModal(false);
    setShowPhotoUpload(false);
    setShowConfigModal(false);
    setShowOwnerCategoryPicker(false);
    setShowOwnerSubCategoryPicker(false);
    setShowICalModal(false);
    setShowSettings(false);
    setShowHighlightsEditor(false);
    setShowPortfolioEditor(false);
    setShowServicesOfferedEditor(false);
    setShowAvailabilityEditor(false);
    setShowPopularDishesEditor(false);
    setShowNotifDetail(false);
    setShowPhotosManager(false);
    setShowOccupancyEditor(false);
    setShowFeaturedModal(false);
    setShowProfileModal(false);
    setShowClaimFlow(false);
    setShowPromoManager(false);
    setShowPromoForm(false);
    setShowReplyModal(false);
  }, []);

  useEffect(() => {
    if (authRole !== 'OWNER' || !Array.isArray(liveNotifications) || liveNotifications.length === 0) {
      return;
    }

    const normalized = liveNotifications.map((notification) => ({
      id: notification.id,
      icon: notification.title?.toLowerCase().includes('reserva') ? '🏨' : '🔔',
      title: notification.title || 'Notificação',
      message: notification.message || '',
      time:
        notification.time ||
        (notification.createdAt
          ? new Date(notification.createdAt).toLocaleString('pt-PT')
          : ''),
      read: notification.read ?? notification.isRead ?? false,
    }));

    setOwnerNotifications(normalized);
  }, [authRole, liveNotifications]);

  // ── Sincronizar dados do ownerBiz quando carregados da API ─────────────────
  useEffect(() => {
    if (!ownerBiz?.id) return;

    // Sincronizar roomTypes
    if (ownerBiz.roomTypes?.length) {
      setRoomTypes(ownerBiz.roomTypes);
    }

    // Sincronizar settingsInfo com dados reais do negócio
    setSettingsInfo({
      name:              ownerBiz.name              || '',
      category:          ownerBiz.category          || '',
      subcategory:       ownerBiz.subcategory        || '',
      primaryCategoryId: ownerBiz.primaryCategoryId  || '',
      subCategoryIds:    ownerBiz.subCategoryIds     || [],
      businessType:      ownerBiz.businessType       || '',
      businessTypeCustom:'',
      phone:             ownerBiz.metadata?.phone    || '',
      website:           ownerBiz.metadata?.website  || '',
      description:       ownerBiz.description        || '',
      price:             ownerBiz.price              || '',
      address:           ownerBiz.address            || ownerBiz.metadata?.address || '',
      neighborhood:      ownerBiz.neighborhood       || ownerBiz.metadata?.neighborhood || '',
      latitude:          ownerBiz.latitude           || null,
      longitude:         ownerBiz.longitude          || null,
    });

    // Sincronizar email da conta
    setSettingsAccount(prev => ({ ...prev, email: authEmail || prev.email }));

    // Sincronizar módulos activos
    if (ownerBiz.modules && Object.keys(ownerBiz.modules).length > 0) {
      setActiveModules(ownerBiz.modules);
    }

    // Carregar quartos físicos
    loadHtRooms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerBiz?.id]); // só re-executa quando muda o ID do negócio

    useEffect(() => {
    if (authRole !== 'OWNER' || !Array.isArray(liveBookings) || liveBookings.length === 0) {
      return;
    }

    const mappedReservations = liveBookings
      .filter(booking => booking.bookingType === 'TABLE' || booking.bookingType === 'table')
      .map((booking) => {
      const startDate = booking.startDate ? new Date(booking.startDate) : null;
      let normalizedStatus = 'pending';
      if (booking.status === 'CONFIRMED') normalizedStatus = 'active';
      if (booking.status === 'CANCELLED') normalizedStatus = 'cancelled';

      return {
        id: booking.id,
        businessId: booking.businessId || booking.business?.id || null,
        user: booking.user?.name || 'Cliente',
        userAvatar: '👤',
        date: startDate ? startDate.toISOString().slice(0, 10) : '',
        time: startDate ? startDate.toISOString().slice(11, 16) : '',
        people: 1,
        status: normalizedStatus,
        phone: booking.user?.email || '',
        notes: '',
        createdAt: booking.createdAt || '',
      };
    });

    setBusinessReservations(mappedReservations);
  }, [authRole, liveBookings]);

  const setBookingActionLoading = useCallback((bookingId, isLoading) => {
    setBookingActionLoadingById((prev) => ({ ...prev, [bookingId]: isLoading }));
  }, []);

  const markBookingActionSuccess = useCallback((bookingId, actionType) => {
    setRecentBookingActionById((prev) => ({ ...prev, [bookingId]: actionType }));
    setTimeout(() => {
      setRecentBookingActionById((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    }, 1800);
  }, []);

  const handleConfirmReservation = useCallback(async (reservation) => {
    if (!accessToken || !ownerBusinessId || !reservation?.id) {
      Alert.alert('Sessão inválida', 'Não foi possível confirmar a reserva.');
      return;
    }

    setBookingActionLoading(reservation.id, true);
    try {
      await backendApi.confirmBooking(
        reservation.id,
        { businessId: reservation.businessId || ownerBusinessId },
        accessToken,
      );

      setBusinessReservations((prev) =>
        prev.map((item) => (item.id === reservation.id ? { ...item, status: 'active' } : item)),
      );
      markBookingActionSuccess(reservation.id, 'confirmed');
      onRefreshOwnerData?.();
    } catch (error) {
      Alert.alert('Falha', error?.message || 'Não foi possível confirmar a reserva.');
    } finally {
      setBookingActionLoading(reservation.id, false);
    }
  }, [accessToken, markBookingActionSuccess, onRefreshOwnerData, ownerBusinessId, setBookingActionLoading]);

  const handleRejectReservation = useCallback(async (reservation, reason) => {
    if (!accessToken || !ownerBusinessId || !reservation?.id) {
      Alert.alert('Sessão inválida', 'Não foi possível recusar a reserva.');
      return;
    }

    setBookingActionLoading(reservation.id, true);
    try {
      await backendApi.rejectBooking(
        reservation.id,
        {
          businessId: reservation.businessId || ownerBusinessId,
          reason: reason || undefined,
        },
        accessToken,
      );

      setBusinessReservations((prev) =>
        prev.map((item) =>
          item.id === reservation.id
            ? { ...item, status: 'cancelled', cancelReason: reason || item.cancelReason }
            : item,
        ),
      );
      markBookingActionSuccess(reservation.id, 'rejected');
      onRefreshOwnerData?.();
    } catch (error) {
      Alert.alert('Falha', error?.message || 'Não foi possível recusar a reserva.');
    } finally {
      setBookingActionLoading(reservation.id, false);
    }
  }, [accessToken, markBookingActionSuccess, onRefreshOwnerData, ownerBusinessId, setBookingActionLoading]);

  // ─────────────────────────────────────────────────────────────────────────
  // MENU ITEMS HANDLERS (Secção 2 — Menu Editor)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveMenuItem = useCallback(async () => {
    if (!menuItemForm.name.trim()) {
      Alert.alert('Erro', 'Nome do prato é obrigatório.');
      return;
    }

    if (!menuItemForm.price) {
      Alert.alert('Erro', 'Preço é obrigatório.');
      return;
    }

    setIsMenuItemLoading(true);

    try {
      const payload = {
        name: menuItemForm.name,
        description: menuItemForm.description || '',
        price: parseFloat(menuItemForm.price),
        category: menuItemForm.category || '',
        businessId: ownerBusinessId,
      };

      if (editingMenuItem) {
        // Update existing menu item
        await backendApi.updateMenuItem(editingMenuItem.id, payload, accessToken);
        
        setMenuItems((prev) => {
          const updated = prev.map((item) =>
            item.id === editingMenuItem.id
              ? { ...item, ...payload }
              : item,
          );
          OWNER_BUSINESS.menuItems = updated;
          updateOwnerBiz({ menuItems: updated });
          return updated;
        });
      } else {
        // Create new menu item
        const response = await backendApi.createMenuItem(payload, accessToken);
        setMenuItems((prev) => {
          const updated = [...prev, response];
          OWNER_BUSINESS.menuItems = updated;
          updateOwnerBiz({ menuItems: updated });
          return updated;
        });
      }

      setShowMenuItemForm(false);
      setEditingMenuItem(null);
      setMenuItemForm({ name: '', description: '', price: '', category: '', available: true });
      Alert.alert('Sucesso', editingMenuItem ? 'Item atualizado.' : 'Item criado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível guardar o item.');
    } finally {
      setIsMenuItemLoading(false);
    }
  }, [menuItemForm, editingMenuItem, ownerBusinessId, accessToken]);

  const handleDeleteMenuItem = useCallback(async (itemId) => {
    Alert.alert(
      'Remover Item',
      'Tem certeza que deseja remover este item do menu?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Remover',
          onPress: async () => {
            setIsMenuItemLoading(true);
            try {
              await backendApi.deleteMenuItem(itemId, accessToken);
              setMenuItems((prev) => {
                const updated = prev.filter((item) => item.id !== itemId);
                OWNER_BUSINESS.menuItems = updated;
                updateOwnerBiz({ menuItems: updated });
                return updated;
              });
              Alert.alert('Sucesso', 'Item removido do menu.');
            } catch (error) {
              Alert.alert('Erro', error?.message || 'Não foi possível remover o item.');
            } finally {
              setIsMenuItemLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // INVENTORY ITEMS HANDLERS (Secção 5 — Inventory Editor)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveInventoryItem = useCallback(async () => {
    if (!inventoryForm.name.trim()) {
      Alert.alert('Erro', 'Nome do produto é obrigatório.');
      return;
    }

    setIsInventoryItemLoading(true);

    try {
      const payload = {
        name: inventoryForm.name,
        price: parseFloat(inventoryForm.price) || 0,
        stock: parseInt(inventoryForm.stock) || 0,
        category: inventoryForm.category || '',
        businessId: ownerBusinessId,
      };

      if (editingInventoryItem) {
        await backendApi.updateInventoryItem(editingInventoryItem.id, payload, accessToken);
        setInventoryItems((prev) =>
          prev.map((item) =>
            item.id === editingInventoryItem.id
              ? { ...item, ...payload }
              : item,
          ),
        );
      } else {
        const response = await backendApi.createInventoryItem(payload, accessToken);
        setInventoryItems((prev) => [...prev, response]);
      }

      setShowInventoryForm(false);
      setEditingInventoryItem(null);
      setInventoryForm({ name: '', price: '', stock: '', category: '', available: true });
      Alert.alert('Sucesso', editingInventoryItem ? 'Produto atualizado.' : 'Produto criado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível guardar o produto.');
    } finally {
      setIsInventoryItemLoading(false);
    }
  }, [inventoryForm, editingInventoryItem, ownerBusinessId, accessToken]);

  const handleDeleteInventoryItem = useCallback(async (itemId) => {
    Alert.alert(
      'Remover Produto',
      'Tem certeza que deseja remover este produto do inventário?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Remover',
          onPress: async () => {
            setIsInventoryItemLoading(true);
            try {
              await backendApi.deleteInventoryItem(itemId, accessToken);
              setInventoryItems((prev) => prev.filter((item) => item.id !== itemId));
              Alert.alert('Sucesso', 'Produto removido do inventário.');
            } catch (error) {
              Alert.alert('Erro', error?.message || 'Não foi possível remover o produto.');
            } finally {
              setIsInventoryItemLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // SERVICES HANDLERS (Secção 6 — Services Editor)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveService = useCallback(async () => {
    if (!serviceForm.name.trim()) {
      Alert.alert('Erro', 'Nome do serviço é obrigatório.');
      return;
    }

    setIsServiceLoading(true);

    try {
      const payload = {
        name: serviceForm.name,
        description: serviceForm.description || '',
        basePrice: parseFloat(serviceForm.basePrice) || 0,
        duration: serviceForm.duration || '',
        businessId: ownerBusinessId,
      };

      if (editingService) {
        await backendApi.updateService(editingService.id, payload, accessToken);
        setServicesList((prev) =>
          prev.map((item) =>
            item.id === editingService.id ? { ...item, ...payload } : item,
          ),
        );
      } else {
        const response = await backendApi.createService(payload, accessToken);
        setServicesList((prev) => [...prev, response]);
      }

      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', basePrice: '', duration: '', available: true });
      Alert.alert('Sucesso', editingService ? 'Serviço atualizado.' : 'Serviço criado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível guardar o serviço.');
    } finally {
      setIsServiceLoading(false);
    }
  }, [serviceForm, editingService, ownerBusinessId, accessToken]);

  const handleDeleteService = useCallback(async (itemId) => {
    Alert.alert(
      'Remover Serviço',
      'Tem certeza que deseja remover este serviço?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Remover',
          onPress: async () => {
            setIsServiceLoading(true);
            try {
              await backendApi.deleteService(itemId, accessToken);
              setServicesList((prev) => prev.filter((item) => item.id !== itemId));
              Alert.alert('Sucesso', 'Serviço removido.');
            } catch (error) {
              Alert.alert('Erro', error?.message || 'Não foi possível remover o serviço.');
            } finally {
              setIsServiceLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // ROOMS HANDLERS (Secção 7 — Rooms Editor)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveRoom = useCallback(async () => {
    if (!roomForm.name.trim()) {
      Alert.alert('Erro', 'Nome do quarto é obrigatório.');
      return;
    }

    setIsRoomLoading(true);

    try {
      // businessId só vai no create -- o PATCH não aceita (DTO rejeita propriedades desconhecidas)
      const basePayload = {
        name: roomForm.name,
        description: roomForm.description || '',
        pricePerNight: parseFloat(roomForm.pricePerNight),
        maxGuests: parseInt(roomForm.maxGuests) || 1,
        totalRooms: parseInt(roomForm.totalRooms) || 1,
        available: roomForm.available !== false,
        amenities: Array.isArray(roomForm.amenities) ? roomForm.amenities : [],
        photos: Array.isArray(roomForm.photos) ? roomForm.photos : [],
      };
      const payload = editingRoom
        ? basePayload
        : { ...basePayload, businessId: ownerBusinessId };

      if (editingRoom) {
        await backendApi.updateRoom(editingRoom.id, basePayload, accessToken);
        setRoomTypes((prev) => {
          const updated = prev.map((item) =>
            item.id === editingRoom.id ? { ...item, ...payload } : item,
          );
          OWNER_BUSINESS.roomTypes = updated;
          updateOwnerBiz({ roomTypes: updated });
          return updated;
        });
      } else {
        const response = await backendApi.createRoom(payload, accessToken);
        setRoomTypes((prev) => {
          const updated = [...prev, response];
          OWNER_BUSINESS.roomTypes = updated;
          updateOwnerBiz({ roomTypes: updated });
          return updated;
        });
      }

      setShowRoomForm(false);
      setEditingRoom(null);
      setRoomForm({ name: '', description: '', pricePerNight: '', maxGuests: '', totalRooms: '1', amenities: [], photos: [], available: true, _photoUrlInput: '' });
      Alert.alert('Sucesso', editingRoom ? 'Quarto atualizado.' : 'Quarto criado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível guardar o quarto.');
    } finally {
      setIsRoomLoading(false);
    }
  }, [roomForm, editingRoom, ownerBusinessId, accessToken]);

  const handleAddRoomPhoto = useCallback(async (uri, roomTypeId, fileName, mimeType, base64) => {
    if (!uri) return;
    if (!base64 || !roomTypeId) {
      setRoomForm(prev => ({ ...prev, photos: [...(prev.photos || []), uri] }));
      return;
    }
    setIsRoomPhotoUploading(true);
    try {
      const result = await backendApi.uploadRoomTypePhoto(
        roomTypeId,
        { fileName: fileName || 'photo.jpg', mimeType: mimeType || 'image/jpeg', base64 },
        accessToken,
      );
      const publicUrl = result?.publicUrl || uri;
      setRoomForm(prev => ({ ...prev, photos: [...(prev.photos || []), publicUrl] }));
    } catch (uploadErr) {
      Alert.alert('Erro no upload', uploadErr?.message || 'Não foi possível fazer upload da foto.');
    } finally {
      setIsRoomPhotoUploading(false);
    }
  }, [accessToken]);

  const handleDeleteRoom = useCallback(async (itemId) => {
    Alert.alert(
      'Remover Quarto',
      'Tem certeza que deseja remover este quarto?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Remover',
          onPress: async () => {
            setIsRoomLoading(true);
            try {
              await backendApi.deleteRoom(itemId, accessToken);
              setRoomTypes((prev) => {
                const updated = prev.filter((item) => item.id !== itemId);
                OWNER_BUSINESS.roomTypes = updated;
                updateOwnerBiz({ roomTypes: updated });
                return updated;
              });
              Alert.alert('Sucesso', 'Quarto removido.');
            } catch (error) {
              Alert.alert('Erro', error?.message || 'Não foi possível remover o quarto.');
            } finally {
              setIsRoomLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // BUSINESS INFO HANDLER (Secção 3 — MyBusiness)
  // ─────────────────────────────────────────────────────────────────────────

  const handleUpdateBusinessInfo = useCallback(async (updatedFields) => {
    if (!updatedFields || Object.keys(updatedFields).length === 0) return;

    setIsUpdatingBusinessInfo(true);

    try {
      const payload = {
        name: updatedFields.name || ownerBiz?.name,
        description: updatedFields.description || ownerBiz?.description,
        phone: updatedFields.phone || (ownerBiz?.metadata?.phone),
        email: updatedFields.email || (ownerBiz?.metadata?.email),
        website: updatedFields.website || (ownerBiz?.metadata?.website),
        address: updatedFields.address || (ownerBiz?.metadata?.address),
      };

      await backendApi.updateBusinessInfo(ownerBusinessId, payload, accessToken);
      
      // Update local state
      updateOwnerBiz(payload, { persist: false });
      Alert.alert('Sucesso', 'Informações do negócio actualizadas.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível actualizar as informações.');
    } finally {
      setIsUpdatingBusinessInfo(false);
    }
  }, [ownerBusinessId, accessToken, ownerBiz, updateOwnerBiz]);

  // ─────────────────────────────────────────────────────────────────────────
  // OWNER SETTINGS HANDLER (Secção 9 — Settings)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveOwnerSettings = useCallback(async () => {
    setIsUpdatingSettings(true);

    try {
      const payload = {
        darkMode: ownerDarkMode,
        notificationsEnabled: ownerNotifEnabled,
        autoReplyEnabled: ownerAutoReply,
      };

      await backendApi.updateOwnerSettings(payload, accessToken);
      Alert.alert('Sucesso', 'Configurações guardadas.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível guardar as configurações.');
    } finally {
      setIsUpdatingSettings(false);
    }
  }, [ownerDarkMode, ownerNotifEnabled, ownerAutoReply, accessToken]);

  // ─────────────────────────────────────────────────────────────────────────
  // PROMOTIONS HANDLER (Secção 11 — Promo Manager)
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeletePromo = useCallback(async (promoId) => {
    Alert.alert(
      'Remover Promoção',
      'Tem certeza que deseja remover esta promoção?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Remover',
          onPress: async () => {
            setIsPromoLoading(true);
            try {
              await backendApi.deletePromo(promoId, accessToken);
              setPromosList((prev) => prev.filter((item) => item.id !== promoId));
              Alert.alert('Sucesso', 'Promoção removida.');
            } catch (error) {
              Alert.alert('Erro', error?.message || 'Não foi possível remover a promoção.');
            } finally {
              setIsPromoLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [accessToken]);

  // ── RENDER ────────────────────────────────────────────────────────────────



  return (
    <View style={{ flex: 1 }}>

      {/* ── ONBOARDING: sem negócio associado ─────────────────────────────── */}
      {!ownerBiz && !showSettings && !isLoading && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={onExitOwnerMode}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ width: 32 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 24 }}>🏢</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, textAlign: 'center', marginBottom: 12 }}>
              Ainda não tens um negócio
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.grayText, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              Regista o teu negócio na plataforma AchAqui para começares a receber clientes e reservas.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.red, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32, alignItems: 'center', width: '100%' }}
              activeOpacity={0.85}
              onPress={() => { setShowSettings(true); setSettingsSection('info'); }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Registar o meu negócio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, padding: 12 }} onPress={onExitOwnerMode}>
              <Text style={{ fontSize: 14, color: COLORS.grayText }}>Voltar a explorar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DASHBOARD NORMAL: com negócio associado ───────────────────────── */}
      {ownerBiz && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => {
              onExitOwnerMode();
            }}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>
              {activeBusinessTab === 'dashboard' && 'Dashboard'}
              {activeBusinessTab === 'notifications' && 'Notificações'}
              {activeBusinessTab === 'mybusiness' && 'Meu Negócio'}
            </Text>
            <View style={{width:32}} />
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={bizS.dashboardContent}>
          {/* DASHBOARD TAB */}
          {activeBusinessTab === 'dashboard' && (
          <>
          {/* Business Header */}
          <View style={bizS.businessHeader}>
            <View style={bizS.businessHeaderTop}>
              <View style={{flex:1}}>
                <Text style={bizS.businessName}>{ownerBiz?.name || ''}</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:6, marginTop:4}}>
                  <Icon name="mapPin" size={12} color={COLORS.grayText} strokeWidth={2} />
                  <Text style={bizS.businessAddress}>{ownerBiz?.category || ''}</Text>
                  {ownerBiz?.verified && <Icon name="certified" size={14} color={COLORS.green} strokeWidth={2} />}
                </View>
              </View>
            </View>
            {/* Manual Status Override */}
            <View style={bizS.statusOverrideCard}>
              <View style={{flex:1}}>
                <Text style={bizS.statusLabel}>Status do Negócio</Text>
                <Text style={bizS.statusValue}>
                  {isUpdatingBusinessStatus
                    ? 'A atualizar...'
                    : businessStatusOverride === 'open' || (businessStatusOverride === null && ownerBiz?.isOpen)
                      ? 'Aberto'
                      : 'Fechado'}
                </Text>
              </View>
              <TouchableOpacity
                style={[bizS.statusSwitch, (businessStatusOverride === 'open' || (businessStatusOverride === null && ownerBiz?.isOpen)) && bizS.statusSwitchActive]}
                onPress={() => {
                  const currentlyOpen = businessStatusOverride === 'open' || (businessStatusOverride === null && ownerBiz?.isOpen);
                  setBusinessOpen(!currentlyOpen);
                }}
                activeOpacity={0.7}
                disabled={isUpdatingBusinessStatus}
              >
                <View style={[bizS.statusSwitchKnob, (businessStatusOverride === 'open' || (businessStatusOverride === null && ownerBiz?.isOpen)) && bizS.statusSwitchKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={bizS.metricsGrid}>
            <View style={bizS.metricCard}>
              <Icon name="eye" size={24} color={COLORS.red} strokeWidth={2} />
              <Text style={bizS.metricValue}>{ownerMetrics.views}</Text>
              <Text style={bizS.metricLabel}>Alcance</Text>
              <Text style={[bizS.metricChange, ownerMetrics.viewsChange > 0 && bizS.metricChangePositive]}>
                {ownerMetrics.viewsChange > 0 ? '↑' : '↓'} {Math.abs(ownerMetrics.viewsChange)}%
              </Text>
            </View>

            <View style={bizS.metricCard}>
              <Icon name="phone" size={24} color={COLORS.red} strokeWidth={2} />
              <Text style={bizS.metricValue}>{ownerMetrics.clicks}</Text>
              <Text style={bizS.metricLabel}>Cliques</Text>
              <Text style={[bizS.metricChange, ownerMetrics.clicksChange > 0 && bizS.metricChangePositive]}>
                {ownerMetrics.clicksChange > 0 ? '↑' : '↓'} {Math.abs(ownerMetrics.clicksChange)}%
              </Text>
            </View>

            <View style={bizS.metricCard}>
              <Icon name="check" size={24} color={COLORS.red} strokeWidth={2} />
              <Text style={bizS.metricValue}>{ownerMetrics.checkIns}</Text>
              <Text style={bizS.metricLabel}>Check-ins</Text>
              <Text style={[bizS.metricChange, ownerMetrics.checkInsChange > 0 && bizS.metricChangePositive]}>
                {ownerMetrics.checkInsChange > 0 ? '↑' : '↓'} {Math.abs(ownerMetrics.checkInsChange)}%
              </Text>
            </View>

            <View style={bizS.metricCard}>
              <Icon name="heart" size={24} color={COLORS.red} strokeWidth={2} />
              <Text style={bizS.metricValue}>{ownerMetrics.favorites}</Text>
              <Text style={bizS.metricLabel}>Favoritos</Text>
              <Text style={[bizS.metricChange, ownerMetrics.favoritesChange > 0 && bizS.metricChangePositive]}>
                {ownerMetrics.favoritesChange > 0 ? '↑' : '↓'} {Math.abs(ownerMetrics.favoritesChange)}%
              </Text>
            </View>
          </View>

          {/* Management Actions */}
          <View style={bizS.actionsSection}>
              <Text style={bizS.sectionTitle}>Gestão</Text>

              {/* Gestão por Módulos (apenas perfil OWNER) */}
              {authRole !== 'OWNER' ? (
                <View style={bizS.actionCard}>
                  <View style={bizS.actionIcon}><Icon name="verified" size={22} color={COLORS.red} strokeWidth={2} /></View>
                  <View style={{flex:1}}>
                    <Text style={bizS.actionTitle}>Acesso restrito</Text>
                    <Text style={bizS.actionDesc}>Esta secção é visível apenas para o perfil de teste Owner.</Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* ── Gastronomia & Vida Noturna ── */}
                  {activeModules?.gastronomy && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 8, marginBottom: 10 }]}>Gastronomia e Vida Noturna</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => openAppLayer('ownerReservasDining')}>
                        <View style={bizS.actionIcon}><Icon name="analytics" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Mesas</Text><Text style={bizS.actionDesc}>Mapa de mesas e turnos</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowReservationsModal(true)}>
                        <View style={bizS.actionIcon}><Icon name="calendar" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Reservas de Mesas</Text><Text style={bizS.actionDesc}>{businessReservations.filter(r=>r.status==='pending').length} pendentes · {businessReservations.filter(r=>r.status==='active').length} ativas</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowMenuEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="web" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Editar Menu</Text><Text style={bizS.actionDesc}>{menuItems.length} itens</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowInventoryEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="delivery" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Editar Inventário</Text><Text style={bizS.actionDesc}>{inventoryItems.length} produtos</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Alojamento & Turismo ── */}
                  {activeModules?.accommodation && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Alojamento e Turismo</Text>
                      <TouchableOpacity style={[bizS.actionCard, { borderColor: '#1565C0'+'30', backgroundColor: '#EFF6FF' }]} activeOpacity={0.8} onPress={() => setShowDashboard(true)}>
                        <View style={[bizS.actionIcon, { backgroundColor: '#1565C0'+'20' }]}><Icon name="analytics" size={22} color="#1565C0" strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={[bizS.actionTitle, { color: '#1565C0' }]}>Dashboard PMS</Text><Text style={bizS.actionDesc}>Ocupação · Receção · Folio · Receita</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowRoomTypesEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="globe" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Editar Tipos de Quarto</Text><Text style={bizS.actionDesc}>{(roomTypes||[]).length} tipos</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowRoomBookingsManager(true)}>
                        <View style={bizS.actionIcon}><Icon name="calendar" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Reservas de Quartos</Text><Text style={bizS.actionDesc}>{roomBookings.filter(rb=>rb.status==='pending').length} pendentes · {roomBookings.filter(rb=>rb.status==='confirmed').length} confirmadas</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowAvailabilityEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="settings" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Disponibilidade & Quartos</Text><Text style={bizS.actionDesc}>{(roomTypes||[]).reduce((s,r)=>s+(r.totalRooms||0),0)} quartos no total</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[bizS.actionCard, {borderColor: COLORS.grayLine, borderWidth: 1}]} activeOpacity={0.8} onPress={() => setShowICalModal(true)}>
                        <View style={[bizS.actionIcon, {backgroundColor: COLORS.grayBg}]}><Icon name="calendar" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Sincronização iCal</Text><Text style={bizS.actionDesc}>Booking.com · Airbnb · Google Calendar</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Tours e Atividades', 'Gestão de tours será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="mapPin" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Tours e Atividades</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Comércio & Retalho ── */}
                  {activeModules?.retail && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Comércio e Retalho</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowInventoryEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="delivery" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Editar Inventário</Text><Text style={bizS.actionDesc}>{inventoryItems.length} produtos</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowPromoCodeModal(true)}>
                        <View style={bizS.actionIcon}><Icon name="tag" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Código Promocional</Text><Text style={bizS.actionDesc}>Ver códigos</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Gestão de Preços', 'Configuração avançada de preços será adicionada em breve.')}>
                        <View style={bizS.actionIcon}><Icon name="payment" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Preços</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Código de Barras/SKU', 'Gestão de código de barras será adicionada em breve.')}>
                        <View style={bizS.actionIcon}><Icon name="certified" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Código de Barras/SKU</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Saúde & Bem-Estar ── */}
                  {activeModules?.health && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Saúde e Bem-estar</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowAvailabilityEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="calendar" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Disponibilidade</Text><Text style={bizS.actionDesc}>Horários de marcação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowServicesEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="portfolio" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Editar Serviços</Text><Text style={bizS.actionDesc}>{servicesList.length} serviços</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Fichas de Clientes', 'Gestão de fichas de clientes será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="user" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Fichas de Clientes</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Gestão de Especialistas', 'Gestão de especialistas será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="users" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Especialistas</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Educação & Formação ── */}
                  {activeModules?.education && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Educação e Formação</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Gestão de Cursos/Turmas', 'Funcionalidade prevista para próxima fase.')}>
                        <View style={bizS.actionIcon}><Icon name="briefcase" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Cursos/Turmas</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Inscrições de Alunos', 'Funcionalidade prevista para próxima fase.')}>
                        <View style={bizS.actionIcon}><Icon name="check" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Inscrições de Alunos</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Horários de Aulas', 'Funcionalidade prevista para próxima fase.')}>
                        <View style={bizS.actionIcon}><Icon name="clock" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Horários de Aulas</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Material Didático', 'Funcionalidade prevista para próxima fase.')}>
                        <View style={bizS.actionIcon}><Icon name="folder" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Material Didático</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Serviços Profissionais ── */}
                  {activeModules?.professional && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Serviços Profissionais</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowServicesOfferedEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="check" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Serviços Oferecidos</Text><Text style={bizS.actionDesc}>{ownerServicesOffered.length} serviços no perfil</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowPortfolioEditor(true)}>
                        <View style={bizS.actionIcon}><Icon name="camera" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Portfólio</Text><Text style={bizS.actionDesc}>{ownerPortfolio.length} imagens</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Emissão de Orçamentos', 'Emissão de orçamentos será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="payment" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Emissão de Orçamentos</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Contratos', 'Gestão de contratos será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="folder" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Contratos</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Logística & Operações ── */}
                  {activeModules?.logistics && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Logística e Operações</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Gestão de Frota', 'Gestão de frota será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="delivery" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Frota</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Controlo de Armazém', 'Controlo de armazém será integrado neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="briefcase" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Controlo de Armazém</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Rastreamento de Cargas', 'Rastreamento de cargas será integrado neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="clock" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Rastreamento de Cargas</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Manutenção de Veículos', 'Manutenção de veículos será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="settings" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Manutenção de Veículos</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Encomendas Personalizadas ── */}
                  {activeModules?.customorder && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Encomendas Personalizadas</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowCustomOrders(true)}>
                        <View style={bizS.actionIcon}><Icon name="star" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Encomendas Personalizadas</Text><Text style={bizS.actionDesc}>{customOrders.length} pendentes</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Status de Produção', 'Acompanhar status de produção será integrado neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="clock" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Status de Produção</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Orçamentos por Medida', 'Orçamentos por medida serão integrados neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="payment" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Orçamentos por Medida</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Aprovação de Design', 'Aprovação de design será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="check" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Aprovação de Design</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Entrega & Delivery ── */}
                  {activeModules?.delivery && (
                    <>
                      <Text style={[bizS.sectionTitle, { fontSize: 14, marginTop: 16, marginBottom: 10 }]}>Entregas e Delivery</Text>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowDeliveryConfig(true)}>
                        <View style={bizS.actionIcon}><Icon name="delivery" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Config de Entrega</Text><Text style={bizS.actionDesc}>{deliveryAreas.length} áreas</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowDeliveryOrders(true)}>
                        <View style={bizS.actionIcon}><Icon name="clock" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Rastreamento de Entregas</Text><Text style={bizS.actionDesc}>{deliveryOrders.filter(o=>o.status==='active').length} em curso</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Gestão de Estafetas', 'Gestão de estafetas será integrada neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="users" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Gestão de Estafetas</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => Alert.alert('Taxas de Entrega', 'Taxas de entrega serão integradas neste módulo.')}>
                        <View style={bizS.actionIcon}><Icon name="payment" size={22} color={COLORS.red} strokeWidth={2} /></View>
                        <View style={{flex:1}}><Text style={bizS.actionTitle}>Taxas de Entrega</Text><Text style={bizS.actionDesc}>Em preparação</Text></View>
                        <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Sem módulos activos ── */}
                  {!Object.values(activeModules||{}).some(Boolean) && (
                    <View style={[bizS.actionCard, {backgroundColor:'#F9FAFB'}]}>
                      <View style={bizS.actionIcon}><Icon name="globe" size={22} color={COLORS.grayText} strokeWidth={2} /></View>
                      <View style={{flex:1}}>
                        <Text style={[bizS.actionTitle, {color:COLORS.grayText}]}>Nenhum módulo activo</Text>
                        <Text style={bizS.actionDesc}>Activa módulos em "Gerir Módulos Operacionais"</Text>
                      </View>
                    </View>
                  )}

                  {/* ── Ver como Cliente (sempre visível) ── */}
                  <TouchableOpacity
                    style={bizS.actionCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (ownerBiz) {
                        onViewBusiness?.({ ...ownerBiz, roomTypes: roomTypes?.length ? roomTypes : (ownerBiz?.roomTypes || []) });
                      }
                    }}
                  >
                    <View style={bizS.actionIcon}><Icon name="eye" size={22} color={COLORS.red} strokeWidth={2} /></View>
                    <View style={{flex:1}}>
                      <Text style={bizS.actionTitle}>Ver como Cliente</Text>
                      <Text style={bizS.actionDesc}>Pré-visualizar seu perfil público</Text>
                    </View>
                    <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                  </TouchableOpacity>
                </>
              )}

              {/* Recent Reviews */}
              <View style={bizS.reviewsSection}>
                <Text style={bizS.sectionTitle}>Avaliações Recentes</Text>
                {(OWNER_BUSINESS.reviews_list||[]).slice(0,3).map(review=> (
                  <View key={review.id} style={bizS.reviewCard}>
                    <View style={bizS.reviewHeader}>
                      <Text style={bizS.reviewUser}>{review.user}</Text>
                      <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                        <Icon name="star" size={12} color={COLORS.red} strokeWidth={2} fill={COLORS.red} />
                        <Text style={bizS.reviewRating}>{review.rating}</Text>
                      </View>
                    </View>
                    <Text style={bizS.reviewText} numberOfLines={2}>{review.text}</Text>

                    {/* Resposta já enviada */}
                    {review.replied && review.replyText && (
                      <View style={bizS.replyBubble}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:6, marginBottom:5}}>
                          <Icon name="user" size={13} color={COLORS.red} strokeWidth={2} />
                          <Text style={bizS.replyBubbleOwner}>A sua resposta</Text>
                        </View>
                        <Text style={bizS.replyBubbleText}>{review.replyText}</Text>
                      </View>
                    )}

                    <View style={bizS.reviewFooter}>
                      <Text style={bizS.reviewDate}>{review.date}</Text>
                      {!review.replied && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setReviewToReply(review); setShowReplyModal(true);
                          }}
                        >
                          <Text style={bizS.replyButton}>Responder</Text>
                        </TouchableOpacity>
                      )}
                      {review.replied && (
                        <Text style={bizS.repliedLabel}>Respondido ✓</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={{height:40}} />
            </View>
          </>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeBusinessTab === 'notifications' && (
            <View style={{padding:16}}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <Text style={bizS.sectionTitle}>
                  Notificações
                  {ownerNotifications.filter(n=>!n.read).length > 0 && (
                    <Text style={{color:COLORS.red}}> ({ownerNotifications.filter(n=>!n.read).length})</Text>
                  )}
                </Text>
                {ownerNotifications.some(n=>!n.read) && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      onMarkAllNotificationsRead();
                      setOwnerNotifications(p=>p.map(n=>({...n,read:true})));
                    }}
                  >
                    <Text style={{fontSize:13, fontWeight:'600', color:COLORS.red}}>Marcar todas lidas</Text>
                  </TouchableOpacity>
                )}
              </View>
              {ownerNotifications.map(notif=> (
                <TouchableOpacity
                  key={notif.id}
                  style={[bizS.notifCard, !notif.read && bizS.notifCardUnread]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onMarkNotificationRead(notif.id);
                    setOwnerNotifications(p=>p.map(n=>n.id===notif.id?{...n,read:true}:n))
                  }}
                >
                  <View style={bizS.notifIcon}>
                    <Text style={{fontSize:24}}>{notif.icon}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                      <Text style={bizS.notifTitle}>{notif.title}</Text>
                      {!notif.read && <View style={bizS.notifBadge} />}
                    </View>
                    <Text style={bizS.notifMessage}>{notif.message}</Text>
                    <Text style={bizS.notifTime}>{notif.time}</Text>
                  </View>
                  <Icon name="arrowRight" size={16} color={COLORS.grayText} strokeWidth={2} style={{marginLeft:8, alignSelf:'center'}} />
                </TouchableOpacity>
              ))}
              {ownerNotifications.length===0 && (
                <View style={{alignItems:'center', paddingVertical:60}}>
                  <Text style={{fontSize:40, marginBottom:12}}>🔔</Text>
                  <Text style={{fontSize:16, fontWeight:'700', color:COLORS.darkText}}>Sem notificações</Text>
                </View>
              )}
              <View style={{height:40}} />
            </View>
          )}

          {/* MEU NEGÓCIO TAB */}
          {activeBusinessTab === 'mybusiness' && (
            <View style={{padding:16}}>
              <Text style={bizS.sectionTitle}>Meu Negócio</Text>
              {/* Informações Básicas */}
              <View style={bizS.businessInfoCard}>
                <Text style={bizS.infoCardTitle}>Informações Básicas</Text>
                <View style={bizS.infoRow}>
                  <Icon name="briefcase" size={18} color={COLORS.grayText} strokeWidth={2} />
                  <View style={{flex:1, marginLeft:12}}>
                    <Text style={bizS.infoLabel}>Nome do Negócio</Text>
                    <Text style={bizS.infoValue}>{ownerBiz?.name || settingsInfo.name || '—'}</Text>
                  </View>
                  <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                </View>
                <View style={bizS.infoRow}>
                  <Icon name="mapPin" size={18} color={COLORS.grayText} strokeWidth={2} />
                  <View style={{flex:1, marginLeft:12}}>
                    <Text style={bizS.infoLabel}>Endereço</Text>
                    <Text style={bizS.infoValue}>{ownerBiz?.address || ownerBiz?.metadata?.address || settingsInfo.address || '—'}</Text>
                  </View>
                  <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                </View>
                <View style={bizS.infoRow}>
                  <Icon name="phone" size={18} color={COLORS.grayText} strokeWidth={2} />
                  <View style={{flex:1, marginLeft:12}}>
                    <Text style={bizS.infoLabel}>Telefone</Text>
                    <Text style={bizS.infoValue}>{ownerBiz?.metadata?.phone || settingsInfo.phone || '—'}</Text>
                  </View>
                  <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                </View>
                <View style={bizS.infoRow}>
                  <Icon name="clock" size={18} color={COLORS.grayText} strokeWidth={2} />
                  <View style={{flex:1, marginLeft:12}}>
                    <Text style={bizS.infoLabel}>Horário de Funcionamento</Text>
                    <Text style={bizS.infoValue}>{ownerBiz?.hours || Object.entries(settingsHours).filter(([,v])=>v.active).map(([d,v])=>`${d} ${v.open}-${v.close}`).slice(0,2).join(', ') || '—'}</Text>
                  </View>
                  <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                </View>
              </View>

              {/* Ações Rápidas */}
              <Text style={[bizS.sectionTitle, {marginTop:20}]}>Ações Rápidas</Text>
              <TouchableOpacity 
                style={bizS.actionCard} 
                activeOpacity={0.8}
                onPress={() => setShowAmenitiesModal(true)}
              >
                <View style={bizS.actionIcon}>
                  <Icon name="star" size={22} color={COLORS.red} strokeWidth={2} />
                </View>
                <View style={{flex:1}}>
                  <Text style={bizS.actionTitle}>Gerir Comodidades</Text>
                  <Text style={bizS.actionDesc}>{(OWNER_BUSINESS.amenities||[]).length} ativas</Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={bizS.actionCard} 
                activeOpacity={0.8}
                onPress={() => setShowModulesModal(true)}
              >
                <View style={bizS.actionIcon}>
                  <Icon name="globe" size={22} color={COLORS.red} strokeWidth={2} />
                </View>
                <View style={{flex:1}}>
                  <Text style={bizS.actionTitle}>Gerir Módulos Operacionais</Text>
                  <Text style={bizS.actionDesc}>{Object.values(activeModules||{}).filter(Boolean).length} ativos</Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowPhotoUpload(true)}>
                <View style={bizS.actionIcon}>
                  <Icon name="camera" size={22} color={COLORS.red} strokeWidth={2} />
                </View>
                <View style={{flex:1}}>
                  <Text style={bizS.actionTitle}>Adicionar Fotos</Text>
                  <Text style={bizS.actionDesc}>{(OWNER_BUSINESS.photos||[]).length} foto{(OWNER_BUSINESS.photos||[]).length !== 1 ? 's' : ''}</Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowPromoManager(true)}>
                <View style={bizS.actionIcon}>
                  <Icon name="tag" size={22} color={COLORS.red} strokeWidth={2} />
                </View>
                <View style={{flex:1}}>
                  <Text style={bizS.actionTitle}>Criar Promoção</Text>
                  <Text style={bizS.actionDesc}>
                    {'Ver promo  ões'}
                  </Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={bizS.actionCard} activeOpacity={0.8} onPress={() => setShowSettings(true)}>
                <View style={bizS.actionIcon}>
                  <Icon name="settings" size={22} color={COLORS.red} strokeWidth={2} />
                </View>
                <View style={{flex:1}}>
                  <Text style={bizS.actionTitle}>Configurações</Text>
                  <Text style={bizS.actionDesc}>Gerencie suas preferências</Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <View style={{height:40}} />
            </View>
          )}

          </View>
        </ScrollView>
      </View>
      )}

      {/* ── APP LAYER: OWNERRESERVASDINING — substitui Modal pageSheet ─────── */}
      {activeAppLayer === 'ownerReservasDining' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform:[{translateX: appLayerX}] }]}
            {...appLayerPan.panHandlers}
          >
            <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
            <Text style={{fontSize:17,fontWeight:'800',color:COLORS.darkText}}>Reservas de Mesas</Text>
            <TouchableOpacity onPress={()=>closeAppLayer()} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2}/>
            </TouchableOpacity>
          </View>
          <DiningModule
            business={ownerBiz}
            ownerMode={true}
            tenantId={ownerBusinessId}
          />
        </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ── APP LAYER: OWNERRESERVAS — substitui Modal pageSheet ─────── */}
      {activeAppLayer === 'ownerReservas' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform:[{translateX: appLayerX}] }]}
            {...appLayerPan.panHandlers}
          >
            <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
            <Text style={{fontSize:17,fontWeight:'800',color:COLORS.darkText}}>Gestão de Reservas</Text>
            <TouchableOpacity onPress={()=>closeAppLayer()} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
              <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2}/>
            </TouchableOpacity>
          </View>
          <View style={{flex:1}}>
            <HospitalityModule
              business={ownerBiz}
              ownerMode={true}
              tenantId={ownerBusinessId}
              accessToken={accessToken}
              openStaffOnMount={openStaffOnHospitalityEntry}
              onOpenStaffConsumed={() => setOpenStaffOnHospitalityEntry(false)}
              ownerBusinessPrivate={ownerBiz}
              updateOwnerBiz={updateOwnerBiz}
              liveBookings={liveBookings}
              ownerRoomBookings={roomBookings}
              onOwnerRoomBookingsChange={setRoomBookings}
              onBookingDone={()=>closeAppLayer()}
            />
          </View>
        </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ── APP LAYER: OWNERSTATS — substitui Modal pageSheet ─────── */}
      {activeAppLayer === 'ownerStats' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform:[{translateX: appLayerX}] }]}
            {...appLayerPan.panHandlers}
          >
            <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
            <Text style={{fontSize:17,fontWeight:'800',color:COLORS.darkText}}>Estatísticas</Text>
            <TouchableOpacity onPress={()=>closeAppLayer()} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
              <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:16}}>
            {/* Period selector */}
            <View style={{flexDirection:'row',gap:8}}>
              {['7 dias','30 dias','3 meses'].map((p)=>(
                <TouchableOpacity
                  key={p}
                  onPress={() => setOwnerStatsPeriod(p)}
                  style={{
                    flex:1,
                    paddingVertical:8,
                    borderRadius:10,
                    borderWidth:1.5,
                    borderColor:ownerStatsPeriod===p?COLORS.red:COLORS.grayLine,
                    backgroundColor:ownerStatsPeriod===p?COLORS.redLight:COLORS.white,
                    alignItems:'center'
                  }}
                >
                  <Text style={{fontSize:12,fontWeight:'700',color:ownerStatsPeriod===p?COLORS.red:COLORS.grayText}}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Main metrics */}
            {[
              {icon:'eye',label:'Visualizações',value:'1.243',change:'+12.5%',positive:true},
              {icon:'phone',label:'Contactos',value:'156',change:'+8.3%',positive:true},
              {icon:'checkCircle',label:'Check-ins',value:'89',change:'-3.2%',positive:false},
              {icon:'heart',label:'Favoritos',value:'45',change:'+15.7%',positive:true},
            ].map(m=>(
              <View key={m.label} style={{backgroundColor:COLORS.white,borderRadius:14,padding:16,borderWidth:1,borderColor:COLORS.grayLine,flexDirection:'row',alignItems:'center',gap:14}}>
                <View style={{width:44,height:44,borderRadius:22,backgroundColor:COLORS.redLight,alignItems:'center',justifyContent:'center'}}>
                  <Icon name={m.icon} size={20} color={COLORS.red} strokeWidth={2}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,color:COLORS.grayText,fontWeight:'600'}}>{m.label}</Text>
                  <Text style={{fontSize:24,fontWeight:'800',color:COLORS.darkText}}>{m.value}</Text>
                </View>
                <Text style={{fontSize:14,fontWeight:'700',color:m.positive?COLORS.green:COLORS.red}}>{m.change}</Text>
              </View>
            ))}
            {/* Simple chart placeholder */}
            <View style={{backgroundColor:COLORS.white,borderRadius:14,padding:16,borderWidth:1,borderColor:COLORS.grayLine}}>
              <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,marginBottom:14}}>Visualizações por dia</Text>
              <View style={{flexDirection:'row',alignItems:'flex-end',gap:6,height:80}}>
                {[40,65,50,80,70,90,75].map((h,i)=>(
                  <View key={i} style={{flex:1,backgroundColor:COLORS.redLight,borderRadius:4,height:`${h}%`,justifyContent:'flex-end'}}>
                    <View style={{height:'30%',backgroundColor:COLORS.red,borderRadius:4}}/>
                  </View>
                ))}
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:6}}>
                {['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d=><Text key={d} style={{fontSize:10,color:COLORS.grayText,fontWeight:'600'}}>{d}</Text>)}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ── APP LAYER: OWNERPROMOS — substitui Modal pageSheet ─────── */}
      {activeAppLayer === 'ownerPromos' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform:[{translateX: appLayerX}] }]}
            {...appLayerPan.panHandlers}
          >
            <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.grayLine}}>
            <Text style={{fontSize:17,fontWeight:'800',color:COLORS.darkText}}>Promoções</Text>
            <TouchableOpacity onPress={()=>closeAppLayer()} style={{width:36,height:36,borderRadius:18,backgroundColor:COLORS.grayBg,alignItems:'center',justifyContent:'center'}}>
              <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:12}}>
            {/* Create promo button */}
            <TouchableOpacity style={{backgroundColor:COLORS.red,borderRadius:14,paddingVertical:14,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8}} onPress={()=>Alert.alert('Nova Promoção','Criador de promoções disponível em breve.')}>
              <Icon name="tag" size={18} color={COLORS.white} strokeWidth={2}/>
              <Text style={{fontSize:15,fontWeight:'800',color:COLORS.white}}>Criar Nova Promoção</Text>
            </TouchableOpacity>
            {/* Active promos */}
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkText,marginTop:4}}>Promoções Activas</Text>
            {(ownerBiz?.deals||[]).length>0 ? (
              (ownerBiz?.deals||[]).map(deal=>(
                <View key={deal.id} style={{backgroundColor:'#FFFBF0',borderRadius:14,padding:16,borderWidth:1.5,borderColor:'#FFE082'}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <Text style={{fontSize:15,fontWeight:'700',color:COLORS.darkText,flex:1,marginRight:8}}>{deal.title}</Text>
                    <View style={{backgroundColor:COLORS.red,paddingHorizontal:10,paddingVertical:4,borderRadius:12}}><Text style={{fontSize:11,fontWeight:'700',color:COLORS.white}}>{deal.code}</Text></View>
                  </View>
                  <Text style={{fontSize:12,color:COLORS.grayText}}>{deal.description}</Text>
                  <Text style={{fontSize:11,color:COLORS.red,fontWeight:'600',marginTop:6}}>Válido até: {deal.expires}</Text>
                </View>
              ))
            ) : (
              <View style={{alignItems:'center',paddingVertical:40,gap:10}}>
                <Text style={{fontSize:36}}>🏷️</Text>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.darkText}}>Sem promoções activas</Text>
                <Text style={{fontSize:13,color:COLORS.grayText,textAlign:'center'}}>Crie a sua primeira promoção para atrair mais clientes.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* ─── OWNER FEATURE MODALS ─────────────────────────────────── */}
      {showMenuEditor && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowMenuEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Editor de Menu</Text>
            <TouchableOpacity onPress={() => {
              setEditingMenuItem(null);
              setMenuItemForm({ name: '', description: '', price: '', category: '', available: true });
              setShowMenuItemForm(true);
            }}>
              <Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {menuItems.length > 0 ? (
                menuItems.map((item) => (
                  <View key={item.id} style={editorS.itemCard}>
                    <View style={editorS.itemHeader}>
                      <View style={{flex:1}}>
                        <Text style={editorS.itemName}>{item.name}</Text>
                        <Text style={editorS.itemCategory}>{item.category}</Text>
                      </View>
                      <Text style={editorS.itemPrice}>{item.price} Kz</Text>
                    </View>
                    <Text style={editorS.itemDescription} numberOfLines={2}>{item.description}</Text>
                    <View style={editorS.itemActions}>
                      <TouchableOpacity 
                        style={editorS.itemActionBtn}
                        onPress={() => {
                          setEditingMenuItem(item);
                          setMenuItemForm(item);
                          setShowMenuItemForm(true);
                        }}
                      >
                        <Icon name="edit" size={16} color={COLORS.red} strokeWidth={2} />
                        <Text style={editorS.itemActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={editorS.itemActionBtn}
                        onPress={() => handleDeleteMenuItem(item.id)}
                        disabled={isMenuItemLoading}
                      >
                        <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={[editorS.itemActionText, {color:COLORS.grayText}]}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={editorS.emptyState}>
                  <Icon name="web" size={64} color={COLORS.grayText} strokeWidth={1} />
                  <Text style={editorS.emptyStateTitle}>Menu Vazio</Text>
                  <Text style={editorS.emptyStateText}>Adicione o primeiro item ao seu menu</Text>
                </View>
              )}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* MENU ITEM FORM MODAL — v2.9.4-FASE1: Add/Edit form with keyboard handling */}
      {showMenuItemForm && (
        <Modal
          visible={showMenuItemForm}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowMenuItemForm(false);
            setEditingMenuItem(null);
            setMenuItemForm({ name: '', description: '', price: '', category: '', available: true });
          }}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={editorS.formOverlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity activeOpacity={1} style={{flex:1, width:'100%', justifyContent:'flex-end', alignItems:'center'}} onPress={() => setShowMenuItemForm(false)}>
              <TouchableOpacity activeOpacity={1} style={{width:'100%'}} onPress={(e) => e.stopPropagation()}>
                <View style={{backgroundColor:COLORS.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingTop:16, maxHeight:'90%'}}>
                  <ScrollView 
                    contentContainerStyle={{paddingBottom:10}}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                  >
                  <Text style={editorS.formTitle}>{editingMenuItem ? 'Editar Item' : 'Novo Item'}</Text>
                  
                  <Text style={editorS.formLabel}>Nome do Prato *</Text>
                  <TextInput
                    style={editorS.formInput}
                    value={menuItemForm.name}
                    onChangeText={(text) => setMenuItemForm({...menuItemForm, name: text})}
                    placeholder="Ex: Pizza Margherita"
                    placeholderTextColor={COLORS.grayText}
                  />

                  <Text style={editorS.formLabel}>Categoria</Text>
                  <TextInput
                    style={editorS.formInput}
                    value={menuItemForm.category}
                    onChangeText={(text) => setMenuItemForm({...menuItemForm, category: text})}
                    placeholder="Ex: Pizzas, Massas"
                    placeholderTextColor={COLORS.grayText}
                  />

                  <Text style={editorS.formLabel}>Descrição</Text>
                  <TextInput
                    style={[editorS.formInput, {minHeight:60}]}
                    value={menuItemForm.description}
                    onChangeText={(text) => setMenuItemForm({...menuItemForm, description: text})}
                    placeholder="Ingredientes e preparo"
                    placeholderTextColor={COLORS.grayText}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={editorS.formLabel}>Preço (Kz) *</Text>
                  <TextInput
                    style={editorS.formInput}
                    value={menuItemForm.price}
                    onChangeText={(text) => setMenuItemForm({...menuItemForm, price: text})}
                    placeholder="Ex: 3500"
                    placeholderTextColor={COLORS.grayText}
                    keyboardType="numeric"
                  />

                  <View style={editorS.formActions}>
                    <TouchableOpacity 
                      style={editorS.formBtnCancel}
                      onPress={() => {
                        setShowMenuItemForm(false);
                        setEditingMenuItem(null);
                        setMenuItemForm({ name: '', description: '', price: '', category: '', available: true });
                      }}
                    >
                      <Text style={editorS.formBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[editorS.formBtnSave, ((!menuItemForm.name || !menuItemForm.price) || isMenuItemLoading) && {opacity:0.5}]}
                      disabled={(!menuItemForm.name || !menuItemForm.price) || isMenuItemLoading}
                      onPress={handleSaveMenuItem}
                    >
                      <Text style={editorS.formBtnSaveText}>{isMenuItemLoading ? 'A guardar...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}



      {/* INVENTORY EDITOR MODAL — v2.9.4-FASE2: Retail products management */}
      {showInventoryEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowInventoryEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Editor de Inventário</Text>
            <TouchableOpacity onPress={() => {
              setEditingInventoryItem(null);
              setInventoryForm({ name: '', price: '', stock: '', category: '', available: true });
              setShowInventoryForm(true);
            }}>
              <Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {inventoryItems.length > 0 ? (
                inventoryItems.map((item) => (
                  <View key={item.id} style={editorS.itemCard}>
                    <View style={editorS.itemHeader}>
                      <View style={{flex:1}}>
                        <Text style={editorS.itemName}>{item.name}</Text>
                        <Text style={editorS.itemCategory}>{item.category}</Text>
                      </View>
                      <View style={{alignItems:'flex-end'}}>
                        <Text style={editorS.itemPrice}>{item.price} Kz</Text>
                        <Text style={[editorS.itemCategory, {marginTop:4}]}>Stock: {item.stock}</Text>
                      </View>
                    </View>
                    <View style={editorS.itemActions}>
                      <TouchableOpacity 
                        style={editorS.itemActionBtn}
                        onPress={() => {
                          setEditingInventoryItem(item);
                          setInventoryForm(item);
                          setShowInventoryForm(true);
                        }}
                      >
                        <Icon name="edit" size={16} color={COLORS.red} strokeWidth={2} />
                        <Text style={editorS.itemActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={editorS.itemActionBtn}
                        onPress={() => handleDeleteInventoryItem(item.id)}
                        disabled={isInventoryItemLoading}
                      >
                        <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={[editorS.itemActionText, {color:COLORS.grayText}]}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={editorS.emptyState}>
                  <Icon name="delivery" size={64} color={COLORS.grayText} strokeWidth={1} />
                  <Text style={editorS.emptyStateTitle}>Inventário Vazio</Text>
                  <Text style={editorS.emptyStateText}>Adicione o primeiro produto</Text>
                </View>
              )}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* INVENTORY FORM MODAL */}
      {showInventoryForm && (
        <Modal visible={showInventoryForm} animationType="fade" transparent={true} onRequestClose={() => setShowInventoryForm(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={editorS.formOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <TouchableOpacity activeOpacity={1} style={{flex:1, width:'100%', justifyContent:'flex-end', alignItems:'center'}} onPress={() => setShowInventoryForm(false)}>
              <TouchableOpacity activeOpacity={1} style={{width:'100%'}} onPress={(e) => e.stopPropagation()}>
                <View style={{backgroundColor:COLORS.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingTop:16, maxHeight:'90%'}}>
                  <ScrollView contentContainerStyle={{paddingBottom:10}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                  <Text style={editorS.formTitle}>{editingInventoryItem ? 'Editar Produto' : 'Novo Produto'}</Text>
                  <Text style={editorS.formLabel}>Nome do Produto *</Text>
                  <TextInput style={editorS.formInput} value={inventoryForm.name} onChangeText={(text) => setInventoryForm({...inventoryForm, name: text})} placeholder="Ex: Camiseta Básica" placeholderTextColor={COLORS.grayText} />
                  <Text style={editorS.formLabel}>Categoria</Text>
                  <TextInput style={editorS.formInput} value={inventoryForm.category} onChangeText={(text) => setInventoryForm({...inventoryForm, category: text})} placeholder="Ex: Vestuário, Eletrônicos" placeholderTextColor={COLORS.grayText} />
                  <Text style={editorS.formLabel}>Preço (Kz)</Text>
                  <TextInput style={editorS.formInput} value={inventoryForm.price} onChangeText={(text) => setInventoryForm({...inventoryForm, price: text})} placeholder="Ex: 2500 (opcional)" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <Text style={editorS.formLabel}>Stock</Text>
                  <TextInput style={editorS.formInput} value={inventoryForm.stock} onChangeText={(text) => setInventoryForm({...inventoryForm, stock: text})} placeholder="Ex: 50" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <View style={editorS.formActions}>
                    <TouchableOpacity style={editorS.formBtnCancel} onPress={() => { setShowInventoryForm(false); setEditingInventoryItem(null); setInventoryForm({ name: '', price: '', stock: '', category: '', available: true }); }}>
                      <Text style={editorS.formBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[editorS.formBtnSave, ((!inventoryForm.name) || isInventoryItemLoading) && {opacity:0.5}]} 
                      disabled={!inventoryForm.name || isInventoryItemLoading} 
                      onPress={handleSaveInventoryItem}
                    >
                      <Text style={editorS.formBtnSaveText}>{isInventoryItemLoading ? 'A guardar...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* SERVICES EDITOR MODAL — v2.9.4-FASE2: Professional services management */}
      {showServicesEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowServicesEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Editor de Serviços</Text>
            <TouchableOpacity onPress={() => {
              setEditingService(null);
              setServiceForm({ name: '', description: '', basePrice: '', duration: '', available: true });
              setShowServiceForm(true);
            }}>
              <Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {servicesList.length > 0 ? (
                servicesList.map((service) => (
                  <View key={service.id} style={editorS.itemCard}>
                    <View style={editorS.itemHeader}>
                      <View style={{flex:1}}>
                        <Text style={editorS.itemName}>{service.name}</Text>
                        <Text style={editorS.itemCategory}>⏱️ {service.duration}</Text>
                      </View>
                      <Text style={editorS.itemPrice}>{service.basePrice} Kz</Text>
                    </View>
                    <Text style={editorS.itemDescription} numberOfLines={2}>{service.description}</Text>
                    <View style={editorS.itemActions}>
                      <TouchableOpacity style={editorS.itemActionBtn} onPress={() => { setEditingService(service); setServiceForm(service); setShowServiceForm(true); }}>
                        <Icon name="edit" size={16} color={COLORS.red} strokeWidth={2} />
                        <Text style={editorS.itemActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={editorS.itemActionBtn} onPress={() => handleDeleteService(service.id)} disabled={isServiceLoading}>
                        <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={[editorS.itemActionText, {color:COLORS.grayText}]}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={editorS.emptyState}>
                  <Icon name="portfolio" size={64} color={COLORS.grayText} strokeWidth={1} />
                  <Text style={editorS.emptyStateTitle}>Nenhum Serviço</Text>
                  <Text style={editorS.emptyStateText}>Adicione o primeiro serviço</Text>
                </View>
              )}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* SERVICES FORM MODAL */}
      {showServiceForm && (
        <Modal visible={showServiceForm} animationType="fade" transparent={true} onRequestClose={() => setShowServiceForm(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={editorS.formOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <TouchableOpacity activeOpacity={1} style={{flex:1, width:'100%', justifyContent:'flex-end', alignItems:'center'}} onPress={() => setShowServiceForm(false)}>
              <TouchableOpacity activeOpacity={1} style={{width:'100%'}} onPress={(e) => e.stopPropagation()}>
                <View style={{backgroundColor:COLORS.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingTop:16, maxHeight:'90%'}}>
                  <ScrollView contentContainerStyle={{paddingBottom:10}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                  <Text style={editorS.formTitle}>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</Text>
                  <Text style={editorS.formLabel}>Nome do Serviço *</Text>
                  <TextInput style={editorS.formInput} value={serviceForm.name} onChangeText={(text) => setServiceForm({...serviceForm, name: text})} placeholder="Ex: Consultoria Jurídica" placeholderTextColor={COLORS.grayText} />
                  <Text style={editorS.formLabel}>Descrição</Text>
                  <TextInput style={[editorS.formInput, {minHeight:60}]} value={serviceForm.description} onChangeText={(text) => setServiceForm({...serviceForm, description: text})} placeholder="Descreva o serviço" placeholderTextColor={COLORS.grayText} multiline textAlignVertical="top" />
                  <Text style={editorS.formLabel}>Preço Base (Kz)</Text>
                  <TextInput style={editorS.formInput} value={serviceForm.basePrice} onChangeText={(text) => setServiceForm({...serviceForm, basePrice: text})} placeholder="Ex: 15000 (opcional)" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <Text style={editorS.formLabel}>Duração</Text>
                  <TextInput style={editorS.formInput} value={serviceForm.duration} onChangeText={(text) => setServiceForm({...serviceForm, duration: text})} placeholder="Ex: 2 horas (opcional)" placeholderTextColor={COLORS.grayText} />
                  <View style={editorS.formActions}>
                    <TouchableOpacity style={editorS.formBtnCancel} onPress={() => { setShowServiceForm(false); setEditingService(null); setServiceForm({ name: '', description: '', basePrice: '', duration: '', available: true }); }}>
                      <Text style={editorS.formBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[editorS.formBtnSave, ((!serviceForm.name) || isServiceLoading) && {opacity:0.5}]} 
                      disabled={!serviceForm.name || isServiceLoading} 
                      onPress={handleSaveService}
                    >
                      <Text style={editorS.formBtnSaveText}>{isServiceLoading ? 'A guardar...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}


      {/* ROOMS EDITOR - FASE 3 */}
{/* ── GESTÃO DE OCUPAÇÃO MODAL — Image 2 design ────────────────── */}
      {showDashboard && (
        <DashboardPMS
          businessId={ownerBusinessId}
          accessToken={accessToken}
          onOpenReception={() => { setShowDashboard(false); setShowReception(true); }}
          onClose={() => setShowDashboard(false)}
        />
      )}
      {showReception && (
        <ReceptionScreen
          businessId={ownerBusinessId}
          accessToken={accessToken}
          roomTypes={roomTypes}
          onClose={() => setShowReception(false)}
        />
      )}

      {showRoomsEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowRoomsEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Gestão de Ocupação</Text>
            <TouchableOpacity onPress={() => {
              OWNER_BUSINESS.checkInTime = checkInTime;
              OWNER_BUSINESS.checkOutTime = checkOutTime;
              OWNER_BUSINESS.minNights = minNights;
              OWNER_BUSINESS.cancelPolicy = cancelPolicy;
              OWNER_BUSINESS.includesBreakfast = includesBreakfast;
              OWNER_BUSINESS.petsAllowed = petsAllowed;
              OWNER_BUSINESS.instantConfirm = instantConfirm;
              OWNER_BUSINESS.roomBlockings = roomBlockings;
              updateOwnerBiz({ checkInTime, checkOutTime, minNights, cancelPolicy, includesBreakfast, petsAllowed, instantConfirm, roomBlockings });
              Alert.alert('Guardado', 'Políticas actualizadas.');
              setShowRoomsEditor(false);
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.red }}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16 }}>

              {/* ─ Políticas do Alojamento ─ */}
              <Text style={polS.sectionTitle}>Políticas do Alojamento</Text>

              {/* Check-in / Check-out / Mín.noites */}
              <View style={polS.timeRow}>
                <View style={polS.timeField}>
                  <Text style={polS.fieldLabel}>Check-in</Text>
                  <TouchableOpacity
                    style={polS.timeInput}
                    onPress={() => Alert.alert('Check-in', 'Selecione o horário de check-in', [
                      { text: '12:00', onPress: () => setCheckInTime('12:00') },
                      { text: '13:00', onPress: () => setCheckInTime('13:00') },
                      { text: '14:00', onPress: () => setCheckInTime('14:00') },
                      { text: '15:00', onPress: () => setCheckInTime('15:00') },
                      { text: '16:00', onPress: () => setCheckInTime('16:00') },
                      { text: 'Cancelar', style: 'cancel' },
                    ])}
                  >
                    <Text style={polS.timeValue}>{checkInTime}</Text>
                  </TouchableOpacity>
                </View>
                <View style={polS.timeField}>
                  <Text style={polS.fieldLabel}>Check-out</Text>
                  <TouchableOpacity
                    style={polS.timeInput}
                    onPress={() => Alert.alert('Check-out', 'Selecione o horário de check-out', [
                      { text: '10:00', onPress: () => setCheckOutTime('10:00') },
                      { text: '11:00', onPress: () => setCheckOutTime('11:00') },
                      { text: '12:00', onPress: () => setCheckOutTime('12:00') },
                      { text: '13:00', onPress: () => setCheckOutTime('13:00') },
                      { text: 'Cancelar', style: 'cancel' },
                    ])}
                  >
                    <Text style={polS.timeValue}>{checkOutTime}</Text>
                  </TouchableOpacity>
                </View>
                <View style={polS.timeFieldSmall}>
                  <Text style={polS.fieldLabel}>Mín. noites</Text>
                  <TouchableOpacity
                    style={polS.timeInput}
                    onPress={() => Alert.alert('Mínimo de Noites', 'Selecione', [
                      { text: '1', onPress: () => setMinNights('1') },
                      { text: '2', onPress: () => setMinNights('2') },
                      { text: '3', onPress: () => setMinNights('3') },
                      { text: '5', onPress: () => setMinNights('5') },
                      { text: '7', onPress: () => setMinNights('7') },
                      { text: 'Cancelar', style: 'cancel' },
                    ])}
                  >
                    <Text style={polS.timeValue}>{minNights}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cancelamento */}
              <Text style={[polS.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>Cancelamento</Text>
              <View style={polS.chipRow}>
                {[
                  { id: 'flexible', label: 'Flexível' },
                  { id: 'moderate', label: 'Moderada' },
                  { id: 'strict', label: 'Rígida' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[polS.chip, cancelPolicy === opt.id && polS.chipActive]}
                    onPress={() => setCancelPolicy(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[polS.chipText, cancelPolicy === opt.id && polS.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Toggles */}
              {[
                { label: 'Pequeno-almoço incluído', value: includesBreakfast, set: setIncludesBreakfast },
                { label: 'Animais de estima  ão permitidos', value: petsAllowed, set: setPetsAllowed },
                { label: 'Confirmação instantânea', desc: 'Reservas confirmadas automaticamente sem aprovação manual', value: instantConfirm, set: setInstantConfirm },
              ].map((item) => (
                <View key={item.label} style={polS.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={polS.toggleLabel}>{item.label}</Text>
                    {item.desc ? <Text style={polS.toggleDesc}>{item.desc}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[polS.toggle, item.value && polS.toggleOn]}
                    onPress={() => item.set(!item.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[polS.toggleThumb, item.value && polS.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* ─ Bloqueios de Disponibilidade ─ */}
              <Text style={[polS.sectionTitle, { marginTop: 28 }]}>Bloqueios de Disponibilidade</Text>
              <Text style={polS.sectionDesc}>
                Adiciona períodos em que parte (ou todos) os quartos estão ocupados. O sistema soma todos os bloqueios para calcular a disponibilidade real.
              </Text>

              {roomTypes.length > 0 ? roomTypes.map(room => {
                const blocks = (roomBlockings[room.id] || []);
                return (
                  <View key={room.id} style={polS.roomBlockCard}>
                    <View style={polS.roomBlockHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={polS.roomBlockName}>{room.name}</Text>
                        <Text style={polS.roomBlockSub}>{room.totalRooms || 0} unidades no total</Text>
                      </View>
                      <Text style={blocks.length === 0 ? polS.noBlocks : polS.hasBlocks}>
                        {blocks.length === 0 ? 'Sem bloqueios' : `${blocks.length} bloqueio${blocks.length !== 1 ? 's' : ''}`}
                      </Text>
                    </View>

                    {/* Existing blocks */}
                    {blocks.map((block, idx) => (
                      <View key={idx} style={polS.blockItem}>
                        <Icon name="calendar" size={14} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={polS.blockItemText}>{block.start} → {block.end} · {block.rooms || 1} quarto{(block.rooms || 1) !== 1 ? 's' : ''}</Text>
                        <TouchableOpacity onPress={() => {
                          const updated = { ...roomBlockings, [room.id]: blocks.filter((_, i) => i !== idx) };
                          setRoomBlockings(updated);
                        }} style={{ marginLeft: 'auto' }}>
                          <Icon name="x" size={14} color={COLORS.red} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add block button */}
                    {addingBlockForRoom === room.id ? (
                      <View style={polS.addBlockForm}>
                        <TouchableOpacity
                          style={[polS.blockInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between', minHeight:44}]}
                          onPress={() => openCal('Data de Início', blockStartDate, setBlockStartDate)}
                          activeOpacity={0.7}
                        >
                          <Text style={{fontSize:13, color: blockStartDate ? '#111' : COLORS.grayText}}>
                            {blockStartDate ? (()=>{const[y,m,d]=blockStartDate.split('-');return`${d}/${m}/${y}`})() : 'Selecionar data'}
                          </Text>
                          <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2}/>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[polS.blockInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between', minHeight:44}]}
                          onPress={() => openCal('Data de Fim', blockEndDate, setBlockEndDate, blockStartDate || undefined)}
                          activeOpacity={0.7}
                        >
                          <Text style={{fontSize:13, color: blockEndDate ? '#111' : COLORS.grayText}}>
                            {blockEndDate ? (()=>{const[y,m,d]=blockEndDate.split('-');return`${d}/${m}/${y}`})() : 'Selecionar data'}
                          </Text>
                          <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2}/>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={[editorS.formBtnCancel, { flex: 1 }]}
                            onPress={() => { setAddingBlockForRoom(null); setBlockStartDate(''); setBlockEndDate(''); }}
                          >
                            <Text style={editorS.formBtnCancelText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[editorS.formBtnSave, { flex: 1, opacity: (!blockStartDate || !blockEndDate) ? 0.5 : 1 }]}
                            disabled={!blockStartDate || !blockEndDate}
                            onPress={() => {
                              if (!blockStartDate || !blockEndDate) return;
                              const newBlock = { start: blockStartDate, end: blockEndDate, rooms: 1 };
                              const updated = { ...roomBlockings, [room.id]: [...blocks, newBlock] };
                              setRoomBlockings(updated);
                              setAddingBlockForRoom(null);
                              setBlockStartDate('');
                              setBlockEndDate('');
                            }}
                          >
                            <Text style={editorS.formBtnSaveText}>Adicionar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={polS.addBlockBtn}
                        onPress={() => { setAddingBlockForRoom(room.id); setBlockStartDate(''); setBlockEndDate(''); }}
                        activeOpacity={0.7}
                      >
                        <Icon name="plusCircle" size={16} color={COLORS.red} strokeWidth={2} />
                        <Text style={polS.addBlockText}>Adicionar período de bloqueio</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }) : (
                <View style={[editorS.emptyState, { paddingVertical: 32 }]}>
                  <Text style={editorS.emptyStateText}>Adicione tipos de quarto primeiro</Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* MODAL — quarto físico individual */}
      {roomPhysForm && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setRoomPhysForm(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setRoomPhysForm(null)} />
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 }}>
                {roomPhysForm.editId ? 'Editar Quarto Físico' : 'Novo Quarto Físico'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 }}>Número / Identificador *</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, color: '#111' }}
                value={roomPhysForm.number}
                onChangeText={v => setRoomPhysForm(f => ({ ...f, number: v }))}
                placeholder="Ex: 101, 202, Bangalô 3, Chalé A"
                placeholderTextColor="#aaa"
                autoFocus
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 }}>Piso</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, color: '#111' }}
                value={roomPhysForm.floor}
                onChangeText={v => setRoomPhysForm(f => ({ ...f, floor: v }))}
                placeholder="Ex: 1"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 }}>Notas (opcional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 20, color: '#111' }}
                value={roomPhysForm.notes}
                onChangeText={v => setRoomPhysForm(f => ({ ...f, notes: v }))}
                placeholder="Ex: Vista para o mar, canto esquerdo"
                placeholderTextColor="#aaa"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                  onPress={() => setRoomPhysForm(null)}
                >
                  <Text style={{ fontWeight: '600', color: '#555' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: isSavingRoom ? '#90A4AE' : '#1565C0', alignItems: 'center' }}
                  onPress={saveHtRoom}
                  disabled={isSavingRoom}
                >
                  <Text style={{ fontWeight: '700', color: '#fff' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ROOM FORM */}
      {showRoomForm && (
        <Modal visible={showRoomForm} animationType="fade" transparent={true} onRequestClose={() => setShowRoomForm(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={editorS.formOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <TouchableOpacity activeOpacity={1} style={{flex:1, width:'100%', justifyContent:'flex-end', alignItems:'center'}} onPress={() => setShowRoomForm(false)}>
              <TouchableOpacity activeOpacity={1} style={{width:'100%'}} onPress={(e) => e.stopPropagation()}>
                <View style={{backgroundColor:COLORS.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingTop:16, maxHeight:'90%'}}>
                  <ScrollView contentContainerStyle={{paddingBottom:10}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                  <Text style={editorS.formTitle}>{editingRoom ? 'Editar Quarto' : 'Novo Tipo'}</Text>
                  <Text style={editorS.formLabel}>Nome *</Text>
                  <TextInput style={editorS.formInput} value={roomForm.name} onChangeText={(text) => setRoomForm({...roomForm, name: text})} placeholder="Ex: Suite Deluxe" placeholderTextColor={COLORS.grayText} />
                  <Text style={editorS.formLabel}>Descrição</Text>
                  <TextInput style={[editorS.formInput, {minHeight:60}]} value={roomForm.description} onChangeText={(text) => setRoomForm({...roomForm, description: text})} placeholder="Descreva o quarto" placeholderTextColor={COLORS.grayText} multiline textAlignVertical="top" />
                  <Text style={editorS.formLabel}>Preço/Noite (Kz)</Text>
                  <TextInput style={editorS.formInput} value={roomForm.pricePerNight} onChangeText={(text) => setRoomForm({...roomForm, pricePerNight: text})} placeholder="Ex: 25000 (opcional)" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <Text style={editorS.formLabel}>Hóspedes Máx</Text>
                  <TextInput style={editorS.formInput} value={roomForm.maxGuests} onChangeText={(text) => setRoomForm({...roomForm, maxGuests: text})} placeholder="Ex: 4 (opcional)" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <Text style={editorS.formLabel}>Nº de Quartos Disponíveis</Text>
                  <TextInput style={editorS.formInput} value={roomForm.totalRooms} onChangeText={(text) => setRoomForm({...roomForm, totalRooms: text})} placeholder="Ex: 3" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                    <Text style={editorS.formLabel}>Disponível</Text>
                    <Switch value={roomForm.available} onValueChange={(val) => setRoomForm({...roomForm, available: val})} trackColor={{false:'#D1D5DB', true:COLORS.green}} thumbColor={COLORS.white} />
                  </View>

                  {/* ── FOTOS DO TIPO DE QUARTO ─────────────────────────────── */}
                  <Text style={editorS.formLabel}>Fotos do Quarto</Text>
                  {(roomForm.photos || []).length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
                      {(roomForm.photos || []).map((uri, idx) => (
                        <View key={idx} style={{marginRight:8, position:'relative'}}>
                          <Image
                            source={{ uri }}
                            style={{width:72, height:72, borderRadius:8, backgroundColor:'#F1F5F9'}}
                            resizeMode="cover"
                          />
                          {idx === 0 && (
                            <View style={{position:'absolute', bottom:0, left:0, right:0,
                              backgroundColor:'rgba(0,0,0,0.5)', borderBottomLeftRadius:8,
                              borderBottomRightRadius:8, paddingVertical:2, alignItems:'center'}}>
                              <Text style={{color:'#fff', fontSize:9, fontWeight:'700'}}>Capa</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={{position:'absolute', top:2, right:2, backgroundColor:'rgba(0,0,0,0.55)',
                              borderRadius:10, width:18, height:18, alignItems:'center', justifyContent:'center'}}
                            onPress={() => setRoomForm(prev => ({
                              ...prev, photos: (prev.photos || []).filter((_, i) => i !== idx)
                            }))}
                          >
                            <Icon name="x" size={10} color="#fff" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  {/* Input inline de URL — cross-platform (iOS e Android) */}
                  <View style={{flexDirection:'row', alignItems:'center', gap:6, marginBottom:8}}>
                    <TextInput
                      style={[editorS.formInput, {flex:1, marginBottom:0}]}
                      value={roomForm._photoUrlInput || ''}
                      onChangeText={(t) => setRoomForm(prev => ({...prev, _photoUrlInput: t}))}
                      placeholder="URL da foto (https://...)"
                      placeholderTextColor={COLORS.grayText}
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={{paddingHorizontal:12, paddingVertical:10, borderRadius:8,
                        backgroundColor: COLORS.red,
                        opacity: isRoomPhotoUploading || !(roomForm._photoUrlInput || '').trim() ? 0.6 : 1}}
                      disabled={isRoomPhotoUploading || !(roomForm._photoUrlInput || '').trim()}
                      onPress={() => {
                        const trimmed = (roomForm._photoUrlInput || '').trim();
                        if (!trimmed) return;
                        handleAddRoomPhoto(trimmed, null, null, null, null);
                        setRoomForm(prev => ({...prev, _photoUrlInput: ''}));
                      }}
                    >
                      <Text style={{color:'#fff', fontSize:13, fontWeight:'700'}}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{fontSize:11, color:COLORS.grayText, marginBottom:8}}>
                    {(roomForm.photos || []).length === 0
                      ? 'A primeira foto será usada como capa nas listagens'
                      : `${(roomForm.photos || []).length} foto${(roomForm.photos||[]).length!==1?'s':''} · toque no × para remover`}
                  </Text>
                  <View style={editorS.formActions}>
                    <TouchableOpacity style={editorS.formBtnCancel} onPress={() => { setShowRoomForm(false); setEditingRoom(null); setRoomForm({ name: '', description: '', pricePerNight: '', maxGuests: '', totalRooms: '1', amenities: [], photos: [], available: true, _photoUrlInput: '' }); }}><Text style={editorS.formBtnCancelText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity 
                      style={[editorS.formBtnSave, ((!roomForm.name) || isRoomLoading) && {opacity:0.5}]} 
                      disabled={!roomForm.name || isRoomLoading} 
                      onPress={handleSaveRoom}
                    >
                      <Text style={editorS.formBtnSaveText}>{isRoomLoading ? 'A guardar...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── RESERVAS DE QUARTOS ─────────────────────────────────────────────── */}
      <Modal visible={showRoomBookingsManager} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRoomBookingsManager(false)}>
        <View style={{flex:1, backgroundColor:COLORS.white}}>
          <View style={[profS.overlayHeader, {paddingTop:16}]}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowRoomBookingsManager(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.overlayTitle}>Reservas de Quartos</Text>
            <View style={{width:32}} />
          </View>

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:44, paddingHorizontal:16}}>
            {[['all','Todas'],['pending','Pendentes'],['confirmed','Confirmadas'],['cancelled','Canceladas']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[bizS.reservationFilterBtn, roomBookingsFilter===k && bizS.reservationFilterBtnActive, {marginRight:8}]} onPress={() => setRoomBookingsFilter(k)}>
                <Text style={[bizS.reservationFilterText, roomBookingsFilter===k && bizS.reservationFilterTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{flex:1}} contentContainerStyle={{padding:16}}>
            {(() => {
              const filtered = roomBookings.filter(rb =>
                roomBookingsFilter === 'all' ? true :
                roomBookingsFilter === 'cancelled' ? (rb.status === 'cancelled' || rb.status === 'rejected') :
                rb.status === roomBookingsFilter
              );
              if (filtered.length === 0) return (
                <View style={{alignItems:'center', paddingVertical:48}}>
                  <Text style={{fontSize:32, marginBottom:12}}>📅</Text>
                  <Text style={{fontSize:15, fontWeight:'700', color:COLORS.darkText}}>Sem reservas</Text>
                  <Text style={{fontSize:13, color:COLORS.grayText, marginTop:4}}>As reservas dos clientes aparecem aqui</Text>
                </View>
              );
              return filtered.map(rb => {
                const room = roomTypes.find(r => r.id === rb.roomTypeId);
                const rbPrice = rb.totalPrice || (room?.pricePerNight && rb.nights ? room.pricePerNight * rb.nights * (rb.rooms || 1) : 0);
                const statusConfig = {
                  pending:          { label:'Pendente',          color:'#D97706', bg:'#FFFBEB' },
                  confirmed:        { label:'Confirmada',        color:COLORS.green, bg:'#F0FDF4' },
                  confirmed_unpaid: { label:'Aguarda Pagamento', color:COLORS.blue, bg:'#EFF6FF' },
                  confirmed_paid:   { label:'Pago na Chegada',   color:COLORS.green, bg:'#F0FDF4' },
                  cancelled:        { label:'Cancelada',         color:'#DC2626', bg:'#FEF2F2' },
                  rejected:         { label:'Rejeitado',         color:'#7C3AED', bg:'#F5F3FF' },
                }[rb.status] || { label:rb.status, color:COLORS.grayText, bg:COLORS.grayBg };
                const isOpen = !!roomBookingsExpanded[rb.id];
                const toggleRb = () => setRoomBookingsExpanded(prev => ({ ...prev, [rb.id]: !prev[rb.id] }));
                return (
                  <View key={rb.id} style={{borderRadius:12, borderWidth:1, padding:14, marginBottom:8, backgroundColor:statusConfig.bg, borderColor:statusConfig.color+'30'}}>
                    {/* Linha resumo — sempre visível */}
                    <TouchableOpacity
                      style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}
                      onPress={toggleRb}
                      activeOpacity={0.7}
                    >
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14, fontWeight:'700', color:COLORS.darkText}}>{rb.guestName}</Text>
                        <Text style={{fontSize:12, color:COLORS.grayText, marginTop:1}}>{rb.guestPhone}</Text>
                      </View>
                      <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                        <View style={{backgroundColor:statusConfig.color+'25', paddingHorizontal:8, paddingVertical:3, borderRadius:8}}>
                          <Text style={{fontSize:11, fontWeight:'700', color:statusConfig.color}}>{statusConfig.label}</Text>
                        </View>
                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.grayText} />
                      </View>
                    </TouchableOpacity>

                    {/* Detalhes — só visíveis quando expandido */}
                    {isOpen && (
                      <View style={{marginTop:10, gap:4}}>
                        <Text style={{fontSize:13, fontWeight:'600', color:COLORS.darkText}}>{room?.name || 'Quarto'}</Text>
                        <View style={{flexDirection:'row', gap:16}}>
                          <Text style={{fontSize:12, color:COLORS.grayText}}>📅 {rb.checkIn} → {rb.checkOut}</Text>
                          <Text style={{fontSize:12, color:COLORS.grayText}}>{rb.nights} noite{rb.nights!==1?'s':''}</Text>
                        </View>
                        {(rb.adults || rb.children > 0) && (
                          <Text style={{fontSize:12, color:COLORS.grayText}}>
                            👤 {rb.adults||1} adulto{(rb.adults||1)!==1?'s':''}{rb.children>0?` · ${rb.children} criança${rb.children!==1?'s':''}`:''} · {rb.rooms||1} quarto{(rb.rooms||1)!==1?'s':''}
                          </Text>
                        )}
                        {rb.specialRequest ? (
                          <View style={{padding:8, backgroundColor:'#FEF9C3', borderRadius:8, borderLeftWidth:3, borderLeftColor:'#D97706'}}>
                            <Text style={{fontSize:11, fontWeight:'700', color:'#92400E', marginBottom:1}}>Pedido especial</Text>
                            <Text style={{fontSize:12, color:COLORS.darkText}}>{rb.specialRequest}</Text>
                          </View>
                        ) : null}
                        {rb.cancelReason && (
                          <View style={{paddingHorizontal:10, paddingVertical:8, backgroundColor:statusConfig.color+'12', borderRadius:8, borderLeftWidth:3, borderLeftColor:statusConfig.color}}>
                            <Text style={{fontSize:11, fontWeight:'700', color:statusConfig.color, marginBottom:2}}>
                              {rb.status === 'rejected' ? 'Motivo da rejeição' : 'Motivo do cancelamento'}
                            </Text>
                            <Text style={{fontSize:12, color:COLORS.darkText}}>{rb.cancelReason}</Text>
                          </View>
                        )}
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8, paddingTop:8, borderTopWidth:1, borderTopColor:statusConfig.color+'20'}}>
                          <View>
                            <Text style={{fontSize:14, fontWeight:'700', color:COLORS.darkText}}>{rbPrice.toLocaleString()} Kz</Text>
                            {rb.payOnArrival && rb.status !== 'confirmed_paid' && (
                              <Text style={{fontSize:10, color:COLORS.blue, fontWeight:'600', marginTop:2}}>💵 Pagar na chegada</Text>
                            )}
                            {rb.status === 'confirmed_paid' && (
                              <Text style={{fontSize:10, color:COLORS.green, fontWeight:'600', marginTop:2}}>✅ Pago na chegada</Text>
                            )}
                          </View>
                          <View style={{flexDirection:'row', gap:8}}>
                            {rb.status === 'pending' && (
                              <>
                                <TouchableOpacity
                                  style={{paddingVertical:6, paddingHorizontal:14, borderRadius:8, backgroundColor:COLORS.green}}
                                  onPress={async () => {
                                    setRoomStatusOverrides(prev => ({ ...prev, [rb.id]: 'confirmed' }));
                                    try {
                                      await backendApi.confirmBooking(rb.id, { businessId: rb.businessId }, accessToken);
                                      Alert.alert('Confirmado!', `Reserva de ${rb.guestName} confirmada.`);
                                    } catch (err) {
                                      setRoomStatusOverrides(prev => { const n={...prev}; delete n[rb.id]; return n; });
                                      Alert.alert('Erro', err?.message || 'Não foi possível confirmar.');
                                    }
                                  }}
                                >
                                  <Text style={{color:COLORS.white, fontWeight:'700', fontSize:12}}>Confirmar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{paddingVertical:6, paddingHorizontal:14, borderRadius:8, backgroundColor:'#DC2626'}}
                                  onPress={async () => {
                                    setRoomStatusOverrides(prev => ({ ...prev, [rb.id]: 'rejected' }));
                                    try {
                                      await backendApi.rejectBooking(rb.id, { businessId: rb.businessId }, accessToken);
                                      Alert.alert('Recusado', `Reserva de ${rb.guestName} recusada.`);
                                    } catch (err) {
                                      setRoomStatusOverrides(prev => { const n={...prev}; delete n[rb.id]; return n; });
                                      Alert.alert('Erro', err?.message || 'Não foi possível recusar.');
                                    }
                                  }}
                                >
                                  <Text style={{color:COLORS.white, fontWeight:'700', fontSize:12}}>Recusar</Text>
                                </TouchableOpacity>
                              </>
                            )}
                            {rb.status === 'confirmed_unpaid' && (
                              <TouchableOpacity
                                style={{paddingVertical:6, paddingHorizontal:14, borderRadius:8, backgroundColor:COLORS.green}}
                                onPress={async () => {
                                  setRoomStatusOverrides(prev => ({ ...prev, [rb.id]: 'confirmed_paid' }));
                                  try {
                                    await backendApi.confirmBooking(rb.id, { businessId: rb.businessId }, accessToken);
                                    Alert.alert('Pagamento Registado! ✅', `Pagamento de ${rbPrice.toLocaleString()} Kz recebido de ${rb.guestName}.`);
                                  } catch (err) {
                                    setRoomStatusOverrides(prev => { const n={...prev}; delete n[rb.id]; return n; });
                                    Alert.alert('Erro', err?.message || 'Não foi possível registar pagamento.');
                                  }
                                }}
                              >
                                <Text style={{color:COLORS.white, fontWeight:'700', fontSize:12}}>💵 Marcar Pago</Text>
                              </TouchableOpacity>
                            )}
                            {(rb.status === 'confirmed' || rb.status === 'confirmed_paid') && (
                              <TouchableOpacity
                                style={{paddingVertical:6, paddingHorizontal:14, borderRadius:8, borderWidth:1.5, borderColor:'#DC2626'}}
                                onPress={async () => {
                                  setRoomStatusOverrides(prev => ({ ...prev, [rb.id]: 'cancelled' }));
                                  try {
                                    await backendApi.rejectBooking(rb.id, { businessId: rb.businessId }, accessToken);
                                    Alert.alert('Cancelado', `Reserva de ${rb.guestName} cancelada.`);
                                  } catch (err) {
                                    setRoomStatusOverrides(prev => { const n={...prev}; delete n[rb.id]; return n; });
                                    Alert.alert('Erro', err?.message || 'Não foi possível cancelar.');
                                  }
                                }}
                              >
                                <Text style={{color:'#DC2626', fontWeight:'700', fontSize:12}}>Cancelar</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </ScrollView>
        </View>
      </Modal>

      {/* ── EDITAR TIPOS DE QUARTO ───────────────────────────────────────────── */}
      {showRoomTypesEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowRoomTypesEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Tipos de Quarto</Text>
            <TouchableOpacity onPress={() => { setEditingRoom(null); setRoomForm({ name: '', description: '', pricePerNight: '', maxGuests: '', totalRooms: '1', amenities: [], photos: [], available: true, _photoUrlInput: '' }); setShowRoomForm(true); }}>
              <Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {roomTypes.length > 0 ? roomTypes.map(room => (
                <View key={room.id} style={editorS.itemCard}>
                  {(room.photos || []).length > 0 && (
                    <Image
                      source={{ uri: room.photos[0] }}
                      style={{width:'100%', height:120, borderRadius:8, marginBottom:8, backgroundColor:'#F1F5F9'}}
                      resizeMode="cover"
                    />
                  )}
                  <View style={editorS.itemHeader}>
                    <View style={{flex:1}}>
                      <Text style={editorS.itemName}>{room.name}</Text>
                      <Text style={editorS.itemCategory}>
                        {room.maxGuests ? `👥 ${room.maxGuests} hósp.` : ''}{room.pricePerNight ? `  ·  ${Number(room.pricePerNight).toLocaleString()} Kz/noite` : ''}{(room.photos||[]).length > 0 ? `  ·  📷 ${room.photos.length}` : ''}
                      </Text>
                      {room.description ? <Text style={editorS.itemDesc} numberOfLines={2}>{room.description}</Text> : null}
                    </View>
                    <View style={[editorS.availBadge, !room.available && editorS.availBadgeOff]}>
                      <Text style={[editorS.availBadgeText, !room.available && editorS.availBadgeTextOff]}>
                        {room.available ? 'Disponível' : 'Indisponível'}
                      </Text>
                    </View>
                  </View>
                  <View style={editorS.itemActions}>
                    <TouchableOpacity style={editorS.itemActionBtn} onPress={() => { setEditingRoom(room); setRoomForm({ name: room.name, description: room.description || '', pricePerNight: String(room.pricePerNight || ''), maxGuests: String(room.maxGuests || ''), totalRooms: String(room.totalRooms || '1'), amenities: room.amenities || [], photos: room.photos || [], available: room.available ?? true, _photoUrlInput: '' }); setShowRoomForm(true); }}>
                      <Icon name="edit" size={16} color={COLORS.red} strokeWidth={2} /><Text style={editorS.itemActionText}>Editar Tipo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={editorS.itemActionBtn} onPress={() => Alert.alert('Remover Tipo', `Remover "${room.name}" e todos os seus quartos físicos?`, [{text:'Cancelar',style:'cancel'},{text:'Remover',style:'destructive',onPress: async ()=>{ try { await backendApi.deleteRoom(room.id, accessToken); setHtRooms(prev => prev.filter(r => r.roomTypeId !== room.id)); const updated=roomTypes.filter(r=>r.id!==room.id); setRoomTypes(updated); OWNER_BUSINESS.roomTypes=updated; updateOwnerBiz({roomTypes:updated}); } catch(e){ Alert.alert('Erro', e?.message||'Não foi possível remover.'); }}}])}>
                      <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} /><Text style={[editorS.itemActionText,{color:COLORS.grayText}]}>Remover</Text>
                    </TouchableOpacity>
                  </View>
                  {/* ── Quartos físicos deste tipo ── */}
                  {(() => {
                    const physRooms = htRooms.filter(r => r.roomTypeId === room.id);
                    return (
                      <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#F0EDE6', paddingTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {loadingRooms ? 'A carregar...' : `Quartos físicos (${physRooms.length})`}
                          </Text>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#EFF6FF', borderRadius: 8 }}
                            onPress={() => setRoomPhysForm({ roomTypeId: room.id, number: '', floor: '1', notes: '', editId: null })}
                          >
                            <Icon name="plusCircle" size={12} color="#1565C0" strokeWidth={2.5} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1565C0' }}>Adicionar quarto</Text>
                          </TouchableOpacity>
                        </View>
                        {!loadingRooms && physRooms.length === 0 && (
                          <Text style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', paddingBottom: 4 }}>
                            Nenhum quarto físico. Clique em Adicionar para criar.
                          </Text>
                        )}
                        {physRooms.map(pr => {
                          const dotColor = pr.status === 'CLEAN' ? '#22A06B' : pr.status === 'DIRTY' ? '#D97706' : pr.status === 'MAINTENANCE' ? '#DC2626' : '#6B7280';
                          return (
                            <View key={pr.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F7F6F2' }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 8 }} />
                              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#111' }}>Nº {pr.number}</Text>
                              <Text style={{ fontSize: 12, color: '#888', marginRight: 10 }}>Piso {pr.floor ?? 1}</Text>
                              <Text style={{ fontSize: 11, color: dotColor, fontWeight: '600', marginRight: 8 }}>{pr.status}</Text>
                              <TouchableOpacity style={{ padding: 4, marginRight: 2 }} onPress={() => setRoomPhysForm({ roomTypeId: room.id, number: pr.number, floor: String(pr.floor ?? 1), notes: pr.notes || '', editId: pr.id })}>
                                <Icon name="edit" size={13} color={COLORS.blue} strokeWidth={2} />
                              </TouchableOpacity>
                              <TouchableOpacity style={{ padding: 4 }} onPress={() => deleteHtRoom(pr.id, pr.number)}>
                                <Icon name="x" size={13} color={COLORS.grayText} strokeWidth={2} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()}
                </View>
              )) : (
                <View style={editorS.emptyState}>
                  <Icon name="map" size={64} color={COLORS.grayText} strokeWidth={1} />
                  <Text style={editorS.emptyStateTitle}>Nenhum Tipo de Quarto</Text>
                  <Text style={editorS.emptyStateText}>Toque em + para adicionar o primeiro</Text>
                </View>
              )}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* DELIVERY CONFIG - FASE 3 */}
      {showDeliveryConfig && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowDeliveryConfig(false)}><Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} /></TouchableOpacity>
            <Text style={profS.headerTitle}>Áreas de Entrega</Text>
            <TouchableOpacity onPress={() => { setEditingArea(null); setDeliveryForm({ name: '', fee: '', estimatedTime: '' }); setShowDeliveryForm(true); }}><Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} /></TouchableOpacity>
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {deliveryAreas.length > 0 ? deliveryAreas.map((area) => (
                <View key={area.id} style={editorS.itemCard}>
                  <View style={editorS.itemHeader}>
                    <View style={{flex:1}}><Text style={editorS.itemName}>{area.name}</Text><Text style={editorS.itemCategory}>⏱️ {area.estimatedTime}</Text></View>
                    <Text style={editorS.itemPrice}>{area.fee} Kz</Text>
                  </View>
                  <View style={editorS.itemActions}>
                    <TouchableOpacity style={editorS.itemActionBtn} onPress={() => { setEditingArea(area); setDeliveryForm(area); setShowDeliveryForm(true); }}><Icon name="edit" size={16} color={COLORS.red} strokeWidth={2} /><Text style={editorS.itemActionText}>Editar</Text></TouchableOpacity>
                    <TouchableOpacity style={editorS.itemActionBtn} onPress={() => { const updated = deliveryAreas.filter(a => a.id !== area.id); setDeliveryAreas(updated); OWNER_BUSINESS.deliveryAreas = updated; updateOwnerBiz({ deliveryAreas: updated }); }}><Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} /><Text style={[editorS.itemActionText, {color:COLORS.grayText}]}>Remover</Text></TouchableOpacity>
                  </View>
                </View>
              )) : (<View style={editorS.emptyState}><Icon name="delivery" size={64} color={COLORS.grayText} strokeWidth={1} /><Text style={editorS.emptyStateTitle}>Nenhuma Área</Text><Text style={editorS.emptyStateText}>Adicione a primeira área</Text></View>)}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* DELIVERY FORM */}
      {showDeliveryForm && (
        <Modal visible={showDeliveryForm} animationType="fade" transparent={true} onRequestClose={() => setShowDeliveryForm(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={editorS.formOverlay} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <TouchableOpacity activeOpacity={1} style={{flex:1, width:'100%', justifyContent:'flex-end', alignItems:'center'}} onPress={() => setShowDeliveryForm(false)}>
              <TouchableOpacity activeOpacity={1} style={{width:'100%'}} onPress={(e) => e.stopPropagation()}>
                <View style={{backgroundColor:COLORS.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingTop:16, maxHeight:'90%'}}>
                  <ScrollView contentContainerStyle={{paddingBottom:10}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                  <Text style={editorS.formTitle}>{editingArea ? 'Editar Área' : 'Nova Área'}</Text>
                  <Text style={editorS.formLabel}>Nome da Área *</Text>
                  <TextInput style={editorS.formInput} value={deliveryForm.name} onChangeText={(text) => setDeliveryForm({...deliveryForm, name: text})} placeholder="Ex: Talatona" placeholderTextColor={COLORS.grayText} />
                  <Text style={editorS.formLabel}>Taxa de Entrega (Kz)</Text>
                  <TextInput style={editorS.formInput} value={deliveryForm.fee} onChangeText={(text) => setDeliveryForm({...deliveryForm, fee: text})} placeholder="Ex: 1500 (opcional)" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                  <Text style={editorS.formLabel}>Tempo Estimado</Text>
                  <TextInput style={editorS.formInput} value={deliveryForm.estimatedTime} onChangeText={(text) => setDeliveryForm({...deliveryForm, estimatedTime: text})} placeholder="Ex: 30-45 min (opcional)" placeholderTextColor={COLORS.grayText} />
                  <View style={editorS.formActions}>
                    <TouchableOpacity style={editorS.formBtnCancel} onPress={() => { setShowDeliveryForm(false); setEditingArea(null); setDeliveryForm({ name: '', fee: '', estimatedTime: '' }); }}><Text style={editorS.formBtnCancelText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={[editorS.formBtnSave, (!deliveryForm.name) && {opacity:0.5}]} disabled={!deliveryForm.name} onPress={() => {
                      if (!deliveryForm.name) return;
                      if (editingArea) {
                        const updated = deliveryAreas.map(a => a.id === editingArea.id ? {...deliveryForm, id: editingArea.id, fee: deliveryForm.fee ? parseFloat(deliveryForm.fee) : 0} : a);
                        setDeliveryAreas(updated); OWNER_BUSINESS.deliveryAreas = updated; updateOwnerBiz({ deliveryAreas: updated });
                      } else {
                        const newArea = { ...deliveryForm, id: Date.now().toString(), fee: deliveryForm.fee ? parseFloat(deliveryForm.fee) : 0 };
                        const updated = [...deliveryAreas, newArea]; setDeliveryAreas(updated); OWNER_BUSINESS.deliveryAreas = updated; updateOwnerBiz({ deliveryAreas: updated });
                      }
                      setShowDeliveryForm(false); setEditingArea(null); setDeliveryForm({ name: '', fee: '', estimatedTime: '' });
                    }}><Text style={editorS.formBtnSaveText}>Guardar</Text></TouchableOpacity>
                  </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}


      {/* CUSTOM ORDERS - FASE 4 */}
      {showCustomOrders && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowCustomOrders(false)}><Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} /></TouchableOpacity>
            <Text style={profS.headerTitle}>Encomendas Personalizadas</Text>
            <View style={{width:24}} />
          </View>
          {/* Filter Tabs - FASE 4.3 */}
          <View style={{flexDirection:'row', padding:16, paddingBottom:12, gap:8, borderBottomWidth:1, borderBottomColor:COLORS.grayLine}}>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: orderFilter === 'all' ? COLORS.red : '#EBEBEB'}} onPress={() => setOrderFilter('all')}>
              <Text style={{fontSize:12, fontWeight:'700', color: orderFilter === 'all' ? COLORS.white : COLORS.grayText}}>Todas ({customOrders.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: orderFilter === 'pending' ? COLORS.red : '#EBEBEB'}} onPress={() => setOrderFilter('pending')}>
              <Text style={{fontSize:12, fontWeight:'700', color: orderFilter === 'pending' ? COLORS.white : COLORS.grayText}}>Pendentes ({customOrders.filter(o => o.status === 'pending').length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: orderFilter === 'confirmed' ? COLORS.red : '#EBEBEB'}} onPress={() => setOrderFilter('confirmed')}>
              <Text style={{fontSize:12, fontWeight:'700', color: orderFilter === 'confirmed' ? COLORS.white : COLORS.grayText}}>Confirmadas ({customOrders.filter(o => o.status === 'confirmed').length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {(() => {
                const filtered = customOrders.filter(o => orderFilter === 'all' || o.status === orderFilter);
                return filtered.length > 0 ? filtered.map((order) => (
                <TouchableOpacity key={order.id} style={editorS.itemCard} onPress={() => { setSelectedCustomOrder(order); setShowCustomOrderDetail(true); }}>
                  {order.status === 'pending' && !order.price && (
                    <View style={{position:'absolute', top:8, right:8, paddingHorizontal:8, paddingVertical:4, borderRadius:12, backgroundColor:'#FF5252'}}>
                      <Text style={{fontSize:10, fontWeight:'800', color:COLORS.white}}>🔴 URGENTE</Text>
                    </View>
                  )}
                  <View style={editorS.itemHeader}>
                    <View style={{flex:1}}><Text style={editorS.itemName}>{order.customerName}</Text><Text style={editorS.itemCategory}>{order.date} • {order.phone}</Text></View>
                    <View style={{paddingHorizontal:8, paddingVertical:4, borderRadius:8, backgroundColor: order.status === 'pending' ? '#FFF0F0' : order.status === 'confirmed' ? '#E8F5E9' : order.status === 'rejected' ? '#FFEBEE' : order.status === 'cancelled' ? '#FFF3E0' : '#E3F2FD'}}>
                      <Text style={{fontSize:11, fontWeight:'700', color: order.status === 'pending' ? COLORS.red : order.status === 'confirmed' ? '#4CAF50' : order.status === 'rejected' ? '#D32F2F' : order.status === 'cancelled' ? '#FF9800' : '#2196F3'}}>
                        {order.status === 'pending' ? 'Pendente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'rejected' ? 'Recusado' : order.status === 'cancelled' ? 'Cancelado' : 'Outro'}
                      </Text>
                    </View>
                  </View>
                  <Text style={editorS.itemDescription} numberOfLines={2}>{order.description}</Text>
                </TouchableOpacity>
              )) : (<View style={editorS.emptyState}><Icon name="star" size={64} color={COLORS.grayText} strokeWidth={1} /><Text style={editorS.emptyStateTitle}>Nenhuma Encomenda</Text><Text style={editorS.emptyStateText}>As encomendas aparecerão aqui</Text></View>);
              })()}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* CUSTOM ORDER DETAIL - FASE 4.3: Simplified */}
      {showCustomOrderDetail && selectedCustomOrder && (
        <Modal visible={showCustomOrderDetail} animationType="fade" transparent={true} onRequestClose={() => setShowCustomOrderDetail(false)}>
          <View style={[editorS.formOverlay, {justifyContent:'center'}]}>
            <SafeAreaView style={{width:'92%', maxWidth:400, alignSelf:'center'}}>
              <View style={{backgroundColor:COLORS.white, borderRadius:20, maxHeight:'85%'}}>
                <ScrollView contentContainerStyle={{padding:20}} showsVerticalScrollIndicator={false}>
                  <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
                    <Text style={[editorS.formTitle, {flex:1, marginBottom:0}]}>Detalhes da Encomenda</Text>
                    <TouchableOpacity onPress={() => setShowCustomOrderDetail(false)} style={{padding:8}}>
                      <Icon name="x" size={24} color={COLORS.darkText} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Status Badge */}
                  <View style={{marginTop:12, alignSelf:'flex-start', paddingHorizontal:12, paddingVertical:6, borderRadius:12, backgroundColor: selectedCustomOrder.status === 'pending' ? '#FFF0F0' : selectedCustomOrder.status === 'confirmed' ? '#E8F5E9' : selectedCustomOrder.status === 'rejected' ? '#FFEBEE' : selectedCustomOrder.status === 'cancelled' ? '#FFF3E0' : '#E3F2FD'}}>
                    <Text style={{fontSize:12, fontWeight:'800', color: selectedCustomOrder.status === 'pending' ? COLORS.red : selectedCustomOrder.status === 'confirmed' ? '#4CAF50' : selectedCustomOrder.status === 'rejected' ? '#D32F2F' : selectedCustomOrder.status === 'cancelled' ? '#FF9800' : '#2196F3'}}>
                      {selectedCustomOrder.status === 'pending' ? '⏳ PENDENTE' : selectedCustomOrder.status === 'confirmed' ? '✓ CONFIRMADO' : selectedCustomOrder.status === 'rejected' ? '✗ RECUSADO' : selectedCustomOrder.status === 'cancelled' ? '🗑️ CANCELADO' : '✓ COMPLETO'}
                    </Text>
                  </View>

                  <View style={{marginTop:16}}><Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:4}}>Cliente</Text><Text style={{fontSize:15, fontWeight:'700', color:COLORS.darkText}}>{selectedCustomOrder.customerName}</Text><Text style={{fontSize:13, color:COLORS.grayText}}>{selectedCustomOrder.phone}</Text></View>
                  <View style={{marginTop:12}}><Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:4}}>Descrição</Text><Text style={{fontSize:14, color:COLORS.darkText, lineHeight:20}}>{selectedCustomOrder.description}</Text></View>
                  <View style={{marginTop:12}}><Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:4}}>Data</Text><Text style={{fontSize:14, color:COLORS.darkText}}>{selectedCustomOrder.date}</Text></View>

                  {/* Actions Grid - FASE 4.1 */}
                  <View style={{marginTop:20, borderTopWidth:1, borderTopColor:COLORS.grayLine, paddingTop:16}}>
                    <Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:12}}>AÇÕES RÁPIDAS</Text>
                    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
                      <TouchableOpacity style={{flex:1, minWidth:'45%', paddingVertical:12, borderRadius:10, backgroundColor:'#25D366', alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6}} onPress={() => Linking.openURL(`whatsapp://send?phone=244${selectedCustomOrder.phone.replace(/^0/, '')}&text=Olá ${selectedCustomOrder.customerName}, sobre a sua encomenda...`)}>
                        <Icon name="whatsapp" size={16} color={COLORS.white} strokeWidth={2} />
                        <Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{flex:1, minWidth:'45%', paddingVertical:12, borderRadius:10, backgroundColor:'#2196F3', alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6}} onPress={() => Linking.openURL(`tel:${selectedCustomOrder.phone}`)}>
                        <Icon name="phone" size={16} color={COLORS.white} strokeWidth={2} />
                        <Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>Ligar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Status Actions - Single Row */}
                  <View style={{flexDirection:'row', gap:10, marginTop:16}}>
                    {selectedCustomOrder.status === 'pending' && (
                      <>
                        <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#4CAF50', alignItems:'center'}} onPress={() => {
                          const updated = customOrders.map(o => o.id === selectedCustomOrder.id ? {...o, status: 'confirmed'} : o);
                          setCustomOrders(updated); OWNER_BUSINESS.customOrders = updated; setSelectedCustomOrder({...selectedCustomOrder, status: 'confirmed'});
                        }}><Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>✓ Confirmar</Text></TouchableOpacity>
                        <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#D32F2F', alignItems:'center'}} onPress={() => {
                          setCancelTarget('order');
                          setActionType('reject');
                          setCancelReason('');
                          setShowCustomOrderDetail(false);
                          setTimeout(() => setShowCancelReason(true), 50);
                        }}><Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>✗ Recusar</Text></TouchableOpacity>
                      </>
                    )}
                    {selectedCustomOrder.status === 'confirmed' && (
                      <>
                        <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#FF9800', alignItems:'center'}} onPress={() => { 
                          setEditOrderForm({ price: selectedCustomOrder.price?.toString() || '', deadline: selectedCustomOrder.deadline || '', notes: selectedCustomOrder.notes || '' }); 
                          setShowCustomOrderDetail(false);
                          setTimeout(() => setShowEditOrder(true), 50);
                        }}>
                          <Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>✏️ Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#D32F2F', alignItems:'center'}} onPress={() => {
                          setCancelTarget('order');
                          setActionType('cancel');
                          setCancelReason('');
                          setShowCustomOrderDetail(false);
                          setTimeout(() => setShowCancelReason(true), 50);
                        }}><Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>✗ Cancelar</Text></TouchableOpacity>
                      </>
                    )}
                    {(selectedCustomOrder.status === 'rejected' || selectedCustomOrder.status === 'cancelled') && (
                      <View style={{flex:1, paddingVertical:12, alignItems:'center'}}>
                        <Text style={{fontSize:13, color:COLORS.grayText}}>Encomenda {selectedCustomOrder.status === 'rejected' ? 'recusada' : 'cancelada'}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity style={{marginTop:12, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:COLORS.grayLine, alignItems:'center'}} onPress={() => setShowCustomOrderDetail(false)}>
                    <Text style={{fontSize:13, fontWeight:'700', color:COLORS.grayText}}>Fechar</Text>
                  </TouchableOpacity>
                  
                <View style={{height:20}} />
                </ScrollView>
              </View>
            </SafeAreaView>
            <TouchableOpacity 
              style={{position:'absolute', top:40, left:0, right:0, bottom:0, zIndex:-1}} 
              activeOpacity={1}
              onPress={() => setShowCustomOrderDetail(false)}
            />
          </View>
        </Modal>
      )}

      {/* DELIVERY ORDERS - FASE 4 */}
      {showDeliveryOrders && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowDeliveryOrders(false)}><Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} /></TouchableOpacity>
            <Text style={profS.headerTitle}>Entregas em Curso</Text>
            <View style={{width:24}} />
          </View>
          {/* Filter Tabs - FASE 4.3 */}
          <View style={{flexDirection:'row', padding:16, paddingBottom:12, gap:8, borderBottomWidth:1, borderBottomColor:COLORS.grayLine}}>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: deliveryFilter === 'all' ? COLORS.red : '#EBEBEB'}} onPress={() => setDeliveryFilter('all')}>
              <Text style={{fontSize:12, fontWeight:'700', color: deliveryFilter === 'all' ? COLORS.white : COLORS.grayText}}>Todas ({deliveryOrders.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: deliveryFilter === 'preparing' ? COLORS.red : '#EBEBEB'}} onPress={() => setDeliveryFilter('preparing')}>
              <Text style={{fontSize:12, fontWeight:'700', color: deliveryFilter === 'preparing' ? COLORS.white : COLORS.grayText}}>Preparando ({deliveryOrders.filter(o => o.status === 'preparing').length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: deliveryFilter === 'dispatched' ? COLORS.red : '#EBEBEB'}} onPress={() => setDeliveryFilter('dispatched')}>
              <Text style={{fontSize:12, fontWeight:'700', color: deliveryFilter === 'dispatched' ? COLORS.white : COLORS.grayText}}>Em Rota ({deliveryOrders.filter(o => o.status === 'dispatched').length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {deliveryOrders.filter(o => deliveryFilter === 'all' || o.status === deliveryFilter).length > 0 ? deliveryOrders.filter(o => deliveryFilter === 'all' || o.status === deliveryFilter).map((order) => (
                <TouchableOpacity key={order.id} style={editorS.itemCard} onPress={() => { setSelectedDeliveryOrder(order); setShowDeliveryOrderDetail(true); }}>
                  <View style={editorS.itemHeader}>
                    <View style={{flex:1}}><Text style={editorS.itemName}>{order.orderId} • {order.customerName}</Text><Text style={editorS.itemCategory}>⏱️ {order.estimatedTime}</Text></View>
                    <View style={{paddingHorizontal:8, paddingVertical:4, borderRadius:8, backgroundColor: order.status === 'pending' ? '#FFEBEE' : order.status === 'preparing' ? '#FFF3E0' : order.status === 'dispatched' ? '#E3F2FD' : order.status === 'delivered' ? '#E8F5E9' : '#F5F5F5'}}>
                      <Text style={{fontSize:11, fontWeight:'700', color: order.status === 'pending' ? '#D32F2F' : order.status === 'preparing' ? '#F57C00' : order.status === 'dispatched' ? '#1976D2' : order.status === 'delivered' ? '#388E3C' : '#616161'}}>
                        {order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Preparando' : order.status === 'dispatched' ? 'Saiu' : order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                      </Text>
                    </View>
                  </View>
                  <Text style={editorS.itemDescription} numberOfLines={1}>{order.address}</Text>
                </TouchableOpacity>
              )) : (<View style={editorS.emptyState}><Icon name="delivery" size={64} color={COLORS.grayText} strokeWidth={1} /><Text style={editorS.emptyStateTitle}>Nenhuma Entrega</Text><Text style={editorS.emptyStateText}>As entregas aparecerão aqui</Text></View>)}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* DELIVERY ORDER DETAIL - FASE 4.3: Simplified */}
      {showDeliveryOrderDetail && selectedDeliveryOrder && (
        <Modal visible={showDeliveryOrderDetail} animationType="fade" transparent={true} onRequestClose={() => setShowDeliveryOrderDetail(false)}>
          <View style={[editorS.formOverlay, {justifyContent:'center'}]}>
            <SafeAreaView style={{width:'92%', maxWidth:400, alignSelf:'center'}}>
              <View style={{backgroundColor:COLORS.white, borderRadius:20, maxHeight:'85%'}}>
                <ScrollView contentContainerStyle={{padding:20}} showsVerticalScrollIndicator={false}>
                  <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
                    <Text style={[editorS.formTitle, {flex:1, marginBottom:0}]}>Rastreamento {selectedDeliveryOrder.orderId}</Text>
                    <TouchableOpacity onPress={() => setShowDeliveryOrderDetail(false)} style={{padding:8}}>
                      <Icon name="x" size={24} color={COLORS.darkText} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Status Badge */}
                  <View style={{marginTop:12, alignSelf:'flex-start', paddingHorizontal:12, paddingVertical:6, borderRadius:12, backgroundColor: selectedDeliveryOrder.status === 'pending' ? '#FFEBEE' : selectedDeliveryOrder.status === 'preparing' ? '#FFF3E0' : selectedDeliveryOrder.status === 'dispatched' ? '#E3F2FD' : selectedDeliveryOrder.status === 'delivered' ? '#E8F5E9' : selectedDeliveryOrder.status === 'cancelled' ? '#F5F5F5' : '#E3F2FD'}}>
                    <Text style={{fontSize:12, fontWeight:'800', color: selectedDeliveryOrder.status === 'pending' ? '#D32F2F' : selectedDeliveryOrder.status === 'preparing' ? '#F57C00' : selectedDeliveryOrder.status === 'dispatched' ? '#1976D2' : selectedDeliveryOrder.status === 'delivered' ? '#388E3C' : selectedDeliveryOrder.status === 'cancelled' ? '#616161' : '#2196F3'}}>
                      {selectedDeliveryOrder.status === 'pending' ? '⏳ PENDENTE' : selectedDeliveryOrder.status === 'preparing' ? '👨‍🍳 PREPARANDO' : selectedDeliveryOrder.status === 'dispatched' ? '🚗 EM ROTA' : selectedDeliveryOrder.status === 'delivered' ? '✓ ENTREGUE' : selectedDeliveryOrder.status === 'cancelled' ? '✗ CANCELADO' : 'OUTRO'}
                    </Text>
                  </View>

                  <View style={{marginTop:16}}><Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:4}}>Cliente</Text><Text style={{fontSize:15, fontWeight:'700', color:COLORS.darkText}}>{selectedDeliveryOrder.customerName}</Text><Text style={{fontSize:13, color:COLORS.grayText}}>{selectedDeliveryOrder.address}</Text></View>
                  <View style={{marginTop:8}}><Text style={{fontSize:13, color:COLORS.grayText}}>📞 {selectedDeliveryOrder.phone}</Text><Text style={{fontSize:13, color:COLORS.grayText, marginTop:4}}>⏱️ Tempo estimado: {selectedDeliveryOrder.estimatedTime}</Text></View>

                  {/* Actions Grid - FASE 4.1 */}
                  <View style={{marginTop:20, borderTopWidth:1, borderTopColor:COLORS.grayLine, paddingTop:16}}>
                    <Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:12}}>AÇÕES RÁPIDAS</Text>
                    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
                      <TouchableOpacity style={{flex:1, minWidth:'45%', paddingVertical:12, borderRadius:10, backgroundColor:'#25D366', alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6}} onPress={() => Linking.openURL(`whatsapp://send?phone=244${selectedDeliveryOrder.phone.replace(/^0/, '')}&text=Olá ${selectedDeliveryOrder.customerName}, sobre o seu pedido ${selectedDeliveryOrder.orderId}...`)}>                        <Icon name="whatsapp" size={16} color={COLORS.white} strokeWidth={2} />
                        <Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{flex:1, minWidth:'45%', paddingVertical:12, borderRadius:10, backgroundColor:'#2196F3', alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6}} onPress={() => Linking.openURL(`tel:${selectedDeliveryOrder.phone}`)}>                        <Icon name="phone" size={16} color={COLORS.white} strokeWidth={2} />
                        <Text style={{fontSize:13, fontWeight:'700', color:COLORS.white}}>Ligar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Timeline */}
                  <View style={{marginTop:16, marginBottom:12}}><Text style={{fontSize:12, fontWeight:'700', color:COLORS.grayText, marginBottom:8}}>Status da Entrega</Text></View>
                  <View style={{marginLeft:8}}>
                    {['pending', 'preparing', 'dispatched', 'delivered'].map((status, idx) => {
                      const statusColors = {
                        pending: '#D32F2F',
                        preparing: '#F57C00', 
                        dispatched: '#1976D2',
                        delivered: '#388E3C'
                      };
                      const currentIdx = ['pending', 'preparing', 'dispatched', 'delivered'].indexOf(selectedDeliveryOrder.status);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = selectedDeliveryOrder.status === status;
                      const circleColor = isCurrent || isCompleted ? statusColors[status] : COLORS.grayLine;
                      
                      return (
                        <View key={status} style={{flexDirection:'row', alignItems:'flex-start', marginBottom:12}}>
                          <View style={{marginRight:12, alignItems:'center'}}>
                            <View style={{width:24, height:24, borderRadius:12, backgroundColor: circleColor, alignItems:'center', justifyContent:'center'}}>
                              {isCompleted && <Icon name="check" size={14} color={COLORS.white} strokeWidth={3} />}
                            </View>
                            {idx < 3 && <View style={{width:2, height:20, backgroundColor: isCompleted ? statusColors[status] : COLORS.grayLine, marginTop:2}} />}
                          </View>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:14, fontWeight:'700', color: isCurrent ? COLORS.darkText : COLORS.grayText}}>
                              {status === 'pending' ? 'Pedido Recebido' : status === 'preparing' ? 'Em Preparação' : status === 'dispatched' ? 'Saiu para Entrega' : 'Entregue'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* All Actions in One Row - FASE 4.3 */}
                  {selectedDeliveryOrder.status !== 'delivered' && selectedDeliveryOrder.status !== 'cancelled' && (
                    <View style={{marginTop:16}}>
                      <View style={{flexDirection:'row', gap:6, marginBottom:8}}>
                        <TouchableOpacity 
                          activeOpacity={0.7}
                          style={{flex:1, paddingVertical:10, borderRadius:8, backgroundColor:'#FF9800', alignItems:'center'}} 
                          onPress={() => { 
                            setEditDeliveryForm({ estimatedTime: selectedDeliveryOrder.estimatedTime || '', notes: selectedDeliveryOrder.notes || '' }); 
                            setShowDeliveryOrderDetail(false);
                            setTimeout(() => setShowEditDelivery(true), 50);
                          }}
                        >
                          <Icon name="clock" size={16} color={COLORS.white} strokeWidth={2} />
                          <Text style={{fontSize:10, fontWeight:'700', color:COLORS.white, marginTop:2}}>Tempo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{flex:1, paddingVertical:10, borderRadius:8, backgroundColor:'#4CAF50', alignItems:'center'}} onPress={() => Linking.openURL(`whatsapp://send?phone=244${selectedDeliveryOrder.phone.replace(/^0/, '')}&text=🚗 Seu pedido ${selectedDeliveryOrder.orderId} está chegando! Tempo estimado: ${selectedDeliveryOrder.estimatedTime}`)}>
                          <Icon name="whatsapp" size={16} color={COLORS.white} strokeWidth={2} />
                          <Text style={{fontSize:10, fontWeight:'700', color:COLORS.white, marginTop:2}}>Chegando</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{flex:1, paddingVertical:10, borderRadius:8, backgroundColor:COLORS.red, alignItems:'center'}} onPress={() => {
                          const statusFlow = ['pending', 'preparing', 'dispatched', 'delivered'];
                          const currentIdx = statusFlow.indexOf(selectedDeliveryOrder.status);
                          if (currentIdx < 3) {
                            const updated = deliveryOrders.map(o => o.id === selectedDeliveryOrder.id ? {...o, status: statusFlow[currentIdx + 1]} : o);
                            setDeliveryOrders(updated); OWNER_BUSINESS.deliveryOrders = updated; setSelectedDeliveryOrder({...selectedDeliveryOrder, status: statusFlow[currentIdx + 1]});
                          }
                        }}>
                          <Icon name="arrowRight" size={16} color={COLORS.white} strokeWidth={2.5} />
                          <Text style={{fontSize:10, fontWeight:'700', color:COLORS.white, marginTop:2}}>Avançar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{flex:1, paddingVertical:10, borderRadius:8, backgroundColor:'#D32F2F', alignItems:'center'}} onPress={() => {
                          setCancelTarget('delivery');
                          setActionType('cancel');
                          setCancelReason('');
                          setShowDeliveryOrderDetail(false);
                          setTimeout(() => setShowCancelReason(true), 50);
                        }}>
                          <Icon name="x" size={16} color={COLORS.white} strokeWidth={2.5} />
                          <Text style={{fontSize:10, fontWeight:'700', color:COLORS.white, marginTop:2}}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={{marginTop:12, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:COLORS.grayLine, alignItems:'center'}} onPress={() => setShowDeliveryOrderDetail(false)}>
                    <Text style={{fontSize:13, fontWeight:'700', color:COLORS.grayText}}>Fechar</Text>
                  </TouchableOpacity>
                  
                <View style={{height:20}} />
                </ScrollView>
              </View>
            </SafeAreaView>
            <TouchableOpacity 
              style={{position:'absolute', top:40, left:0, right:0, bottom:0, zIndex:-1}} 
              activeOpacity={1}
              onPress={() => setShowCustomOrderDetail(false)}
            />
          </View>
        </Modal>
      )}







      {/* MODULES MANAGEMENT MODAL — v2.9.0: Operational modules selector */}
      {showModulesModal && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowModulesModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Módulos Operacionais</Text>
            <TouchableOpacity onPress={() => {
              OWNER_BUSINESS.modules = activeModules;
              updateOwnerBiz({ modules: activeModules });
              setShowModulesModal(false);
            }}>
              <Text style={{fontSize:16, fontWeight:'700', color:COLORS.red}}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              <Text style={bizS.amenitiesHint}>
                Selecione os módulos operacionais do seu negócio. Eles definem as ações disponíveis para os clientes.
              </Text>

              <View style={bizS.modulesGrid}>
                {OPERATIONAL_MODULES.map((module) => {
                  const isActive = activeModules[module.id] || false;
                  return (
                    <TouchableOpacity
                      key={module.id}
                      style={[bizS.moduleCard, isActive && bizS.moduleCardActive]}
                      onPress={() => {
                        setActiveModules({
                          ...activeModules,
                          [module.id]: !isActive
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[bizS.moduleIconCircle, isActive && bizS.moduleIconCircleActive]}>
                        <Icon name={module.icon} size={24} color={isActive ? COLORS.white : COLORS.grayText} strokeWidth={2} />
                      </View>
                      <Text style={[bizS.moduleLabel, isActive && bizS.moduleLabelActive]} numberOfLines={2}>
                        {module.label}
                      </Text>
                      {isActive && (
                        <View style={bizS.moduleCheck}>
                          <Icon name="check" size={20} color={COLORS.green} strokeWidth={2} fill={COLORS.green} />
                        </View>
                      )}
                      {/* Actions preview */}
                      {isActive && (
                        <View style={bizS.moduleActions}>
                          {module.actions.map((action, idx) => (
                            <Text key={idx} style={bizS.moduleActionText} numberOfLines={1}>
                              • {action.label}
                            </Text>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}


      {/* AMENITIES MANAGER MODAL — v2.7.6: Global amenities manager for business owners */}
      {showAmenitiesModal && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowAmenitiesModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Gerir Comodidades</Text>
            <TouchableOpacity onPress={() => {
              OWNER_BUSINESS.amenities = ownerAmenities;
              updateOwnerBiz({ amenities: ownerAmenities });
              setShowAmenitiesModal(false);
            }}>
              <Text style={{fontSize:16, fontWeight:'700', color:COLORS.red}}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              <Text style={bizS.amenitiesHint}>
                Selecione as comodidades disponíveis no seu negócio. Elas aparecerão no seu perfil público.
              </Text>

              {AMENITIES_CATEGORIES.map((category, catIdx) => (
                <View key={catIdx} style={bizS.amenityCategory}>
                  <Text style={bizS.amenityCategoryTitle}>{category.title}</Text>
                  <View style={bizS.amenityGrid}>
                    {category.items.map((amenity) => {
                      const isSelected = ownerAmenities.includes(amenity.id);
                      return (
                        <TouchableOpacity
                          key={amenity.id}
                          style={[bizS.amenityItem, isSelected && bizS.amenityItemActive]}
                          onPress={() => {
                            if (isSelected) {
                              setOwnerAmenities(ownerAmenities.filter(a => a !== amenity.id));
                            } else {
                              setOwnerAmenities([...ownerAmenities, amenity.id]);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[bizS.amenityIconCircle, isSelected && bizS.amenityIconCircleActive]}>
                            <Icon name={amenity.icon} size={20} color={isSelected ? COLORS.white : COLORS.grayText} strokeWidth={2} />
                          </View>
                          <Text style={[bizS.amenityLabel, isSelected && bizS.amenityLabelActive]} numberOfLines={1}>
                            {amenity.label}
                          </Text>
                          {isSelected && (
                            <View style={bizS.amenityCheck}>
                              <Icon name="check" size={16} color={COLORS.green} strokeWidth={2} fill={COLORS.green} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}


      {/* RESERVATIONS MODAL — v2.9.5: Business reservations management with actions */}
      {showReservationsModal && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowReservationsModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Reservas</Text>
            <View style={{width:32}} />
          </View>

          {/* Filter Tabs */}
          <View style={bizS.reservationFilterRow}>
            <TouchableOpacity 
              style={[bizS.reservationFilterBtn, reservationFilter === 'active' && bizS.reservationFilterBtnActive]}
              onPress={() => setReservationFilter('active')}
              activeOpacity={0.7}
            >
              <Text style={[bizS.reservationFilterText, reservationFilter === 'active' && bizS.reservationFilterTextActive]}>
                Ativas ({businessReservations.filter(r => r.status === 'active' || r.status === 'pending').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[bizS.reservationFilterBtn, reservationFilter === 'cancelled' && bizS.reservationFilterBtnActive]}
              onPress={() => setReservationFilter('cancelled')}
              activeOpacity={0.7}
            >
              <Text style={[bizS.reservationFilterText, reservationFilter === 'cancelled' && bizS.reservationFilterTextActive]}>
                Canceladas ({businessReservations.filter(r => r.status === 'cancelled').length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              {businessReservations
                .filter((res) => {
                  if (reservationFilter === 'active') {
                    return res.status === 'active' || res.status === 'pending';
                  }
                  return res.status === 'cancelled';
                })
                .map(reservation => (
                  <View key={reservation.id} style={bizS.reservationCard}>
                    {/* Header com usuário */}
                    <View style={bizS.reservationHeader}>
                      <View style={bizS.reservationUserAvatar}>
                        <Text style={{fontSize:28}}>{reservation.userAvatar}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={bizS.reservationUserName}>{reservation.user}</Text>
                        <Text style={bizS.reservationPhone}>{reservation.phone}</Text>
                      </View>
                      <View style={[bizS.reservationStatusBadge, reservation.status === 'cancelled' && bizS.reservationStatusBadgeCancelled]}>
                        <Text style={[bizS.reservationStatusText, reservation.status === 'cancelled' && bizS.reservationStatusTextCancelled]}>
                          {reservation.status === 'pending' ? 'Pendente' : reservation.status === 'active' ? 'Ativa' : 'Cancelada'}
                        </Text>
                      </View>
                    </View>

                    {/* Informações da reserva */}
                    <View style={bizS.reservationDetails}>
                      <View style={bizS.reservationDetailRow}>
                        <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={bizS.reservationDetailText}>
                          {new Date(reservation.date).toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Text>
                      </View>
                      <View style={bizS.reservationDetailRow}>
                        <Icon name="clock" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={bizS.reservationDetailText}>{reservation.time}</Text>
                      </View>
                      <View style={bizS.reservationDetailRow}>
                        <Icon name="users" size={16} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={bizS.reservationDetailText}>{reservation.people} {reservation.people === 1 ? 'pessoa' : 'pessoas'}</Text>
                      </View>
                    </View>

                    {/* Notas */}
                    {reservation.notes && (
                      <View style={bizS.reservationNotes}>
                        <Text style={bizS.reservationNotesLabel}>Observações:</Text>
                        <Text style={bizS.reservationNotesText}>{reservation.notes}</Text>
                      </View>
                    )}

                    {/* Motivo de cancelamento */}
                    {reservation.status === 'cancelled' && reservation.cancelReason && (
                      <View style={bizS.cancelReasonBadge}>
                        <Icon name="info" size={13} color={COLORS.grayText} strokeWidth={2} />
                        <Text style={bizS.cancelReasonBadgeText}>Motivo: {reservation.cancelReason}</Text>
                      </View>
                    )}

                    {/* Footer com data de criação */}
                    <View style={bizS.reservationFooter}>
                      <Text style={bizS.reservationCreatedAt}>
                        Criada em {new Date(reservation.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(reservation.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {(reservation.status === 'active' || reservation.status === 'pending') && (
                        <View style={{flexDirection:'row', gap:8}}>
                          {reservation.status === 'pending' && (
                            <>
                              <TouchableOpacity
                                style={[
                                  bizS.reservationActionBtn,
                                  { backgroundColor: '#2E7D32', minWidth: 86, alignItems: 'center', justifyContent: 'center' },
                                  bookingActionLoadingById[reservation.id] && { opacity: 0.6 },
                                ]}
                                activeOpacity={0.7}
                                disabled={Boolean(bookingActionLoadingById[reservation.id])}
                                onPress={() => handleConfirmReservation(reservation)}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>
                                  {bookingActionLoadingById[reservation.id]
                                    ? 'A confirmar...'
                                    : recentBookingActionById[reservation.id] === 'confirmed'
                                      ? 'Confirmada'
                                      : 'Aceitar'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  bizS.reservationActionBtn,
                                  { backgroundColor: '#E53935', minWidth: 86, alignItems: 'center', justifyContent: 'center' },
                                  bookingActionLoadingById[reservation.id] && { opacity: 0.6 },
                                ]}
                                activeOpacity={0.7}
                                disabled={Boolean(bookingActionLoadingById[reservation.id])}
                                onPress={() => {
                                  setReservationToCancel(reservation);
                                  setResCancelReason('');
                                  setResCancelReasonOther('');
                                  setShowResCancelModal(true);
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>
                                  {bookingActionLoadingById[reservation.id]
                                    ? 'A recusar...'
                                    : recentBookingActionById[reservation.id] === 'rejected'
                                      ? 'Recusada'
                                      : 'Recusar'}
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {reservation.status === 'active' && (
                            <>
                              <TouchableOpacity 
                                style={[bizS.reservationActionBtn, {backgroundColor:'#2E7D32'}]}
                                activeOpacity={0.7}
                                onPress={() => Linking.openURL(`tel:${reservation.phone.replace(/\s+/g,'')}`).catch(() => {})}
                              >
                                <Icon name="phone" size={16} color={COLORS.white} strokeWidth={2} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[
                                  bizS.reservationActionBtn,
                                  {backgroundColor:'#E53935'},
                                  bookingActionLoadingById[reservation.id] && { opacity: 0.6 },
                                ]}
                                activeOpacity={0.7}
                                disabled={Boolean(bookingActionLoadingById[reservation.id])}
                                onPress={() => {
                                  setReservationToCancel(reservation);
                                  setResCancelReason('');
                                  setResCancelReasonOther('');
                                  setShowResCancelModal(true);
                                }}
                              >
                                <Icon name="x" size={16} color={COLORS.white} strokeWidth={2.5} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}

              {businessReservations.filter((r) => {
                if (reservationFilter === 'active') {
                  return r.status === 'active' || r.status === 'pending';
                }
                return r.status === 'cancelled';
              }).length === 0 && (
                <View style={{alignItems:'center', paddingVertical:60}}>
                  <Text style={{fontSize:48, marginBottom:16}}>📅</Text>
                  <Text style={{fontSize:18, fontWeight:'700', color:COLORS.darkText, marginBottom:8}}>
                    Nenhuma reserva {reservationFilter === 'active' ? 'ativa' : 'cancelada'}
                  </Text>
                  <Text style={{fontSize:14, color:COLORS.grayText, textAlign:'center'}}>
                    {reservationFilter === 'active' 
                      ? 'As reservas aparecerão aqui quando clientes fizerem reservas'
                      : 'Reservas canceladas aparecerão aqui'}
                  </Text>
                </View>
              )}

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}


      {/* PROMO MANAGER OVERLAY — v2.9.7 */}
      {showPromoManager && (
        <View style={[profS.overlay, {
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowPromoManager(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Promoções</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingPromo(null);
                setPromoForm({ title:'', type:'percent', discount:'', description:'', startDate:'', endDate:'' });
                setShowPromoForm(true);
              }}
            >
              <Icon name="plusCircle" size={26} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>

              {/* Active promo banner preview */}
              {promotions.filter(p => p.active).length > 0 && (
                <View style={bizS.promoManagerBanner}>
                  <Text style={bizS.promoManagerBannerLabel}>🏷️ Visível para clientes agora</Text>
                  <Text style={bizS.promoManagerBannerText}>
                    {promotions.filter(p => p.active).map(p => p.title).join(' · ')}
                  </Text>
                </View>
              )}

              {promotions.length === 0 && (
                <View style={{alignItems:'center', paddingVertical:60}}>
                  <Text style={{fontSize:48, marginBottom:16}}>🏷️</Text>
                  <Text style={{fontSize:18, fontWeight:'700', color:COLORS.darkText, marginBottom:8}}>Sem promoções</Text>
                  <Text style={{fontSize:14, color:COLORS.grayText, textAlign:'center'}}>Toque no + para criar a sua primeira promoção</Text>
                </View>
              )}

              {promotions.map(promo => (
                <View key={promo.id} style={[bizS.promoItemCard, !promo.active && {opacity:0.6}]}>
                  <View style={{flexDirection:'row', alignItems:'flex-start', gap:12}}>
                    <View style={[bizS.promoItemBadge, !promo.active && {backgroundColor:COLORS.grayBg}]}>
                      <Text style={[bizS.promoItemBadgeText, !promo.active && {color:COLORS.grayText}]}>
                        {promo.type === 'percent' ? `${promo.discount}%` : `${promo.discount} Kz`}
                      </Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={bizS.promoItemTitle}>{promo.title}</Text>
                      {promo.description ? <Text style={bizS.promoItemDesc} numberOfLines={2}>{promo.description}</Text> : null}
                      <Text style={bizS.promoItemDates}>{promo.startDate} → {promo.endDate}</Text>
                    </View>
                    {/* Toggle active */}
                    <TouchableOpacity
                      style={[bizS.promoToggle, promo.active && bizS.promoToggleActive]}
                      activeOpacity={0.7}
                      onPress={() => {
                        const updated = promotions.map(p =>
                          p.id === promo.id ? {...p, active: !p.active} : p
                        );
                        setPromotions(updated);
                        syncPromoDeals(updated);
                      }}
                    >
                      <View style={[bizS.promoToggleKnob, promo.active && bizS.promoToggleKnobActive]} />
                    </TouchableOpacity>
                  </View>
                  <View style={bizS.promoItemActions}>
                    <TouchableOpacity
                      style={bizS.promoItemBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setEditingPromo(promo);
                        setPromoForm({
                          title: promo.title,
                          type: promo.type,
                          discount: promo.discount,
                          description: promo.description,
                          startDate: promo.startDate,
                          endDate: promo.endDate,
                        });
                        setShowPromoForm(true);
                      }}
                    >
                      <Icon name="edit" size={14} color={COLORS.red} strokeWidth={2} />
                      <Text style={bizS.promoItemBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[bizS.promoItemBtn, {borderColor:'#FFCDD2'}]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Alert.alert(
                          'Eliminar Promoção',
                          `Tem a certeza que quer eliminar "${promo.title}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => {
                              const updated = promotions.filter(p => p.id !== promo.id);
                              setPromotions(updated);
                              syncPromoDeals(updated);
                            }},
                          ]
                        );
                      }}
                    >
                      <Icon name="trash" size={14} color="#E53935" strokeWidth={2} />
                      <Text style={[bizS.promoItemBtnText, {color:'#E53935'}]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* PROMO FORM MODAL — v2.9.7: Create / Edit promotion */}
      <Modal
        visible={showPromoForm}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowPromoForm(false); }}
      >
        <KeyboardAvoidingView
          style={{flex:1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{flex:1, backgroundColor:'rgba(0,0,0,0.45)'}}
            activeOpacity={1}
            onPress={() => { if (promoCalTarget) { setPromoCalTarget(null); return; } Keyboard.dismiss(); setShowPromoForm(false); }}
          />
          <View style={[bizS.cancelSheet, { paddingBottom: Math.max(insets.bottom, 20), maxHeight:'90%' }]}>
            <View style={bizS.cancelSheetHandle} />
            <Text style={bizS.cancelSheetTitle}>{editingPromo ? 'Editar Promoção' : 'Nova Promoção'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false} style={{flexShrink:1}}>
              {/* Tipo */}
              <Text style={[bizS.cancelSheetLabel, {marginTop:12}]}>Tipo de desconto</Text>
              <View style={{flexDirection:'row', gap:10, marginBottom:16}}>
                {[{id:'percent', label:'Percentagem (%)'},{id:'fixed', label:'Valor fixo (Kz)'}].map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[bizS.cancelReasonOption, {flex:1}, promoForm.type===t.id && bizS.cancelReasonOptionActive]}
                    activeOpacity={0.7}
                    onPress={() => setPromoForm(f => ({...f, type:t.id}))}
                  >
                    <View style={[bizS.cancelReasonRadio, promoForm.type===t.id && bizS.cancelReasonRadioActive]}>
                      {promoForm.type===t.id && <View style={bizS.cancelReasonRadioDot}/>}
                    </View>
                    <Text style={[bizS.cancelReasonText, {fontSize:13}, promoForm.type===t.id && bizS.cancelReasonTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Desconto */}
              <Text style={bizS.promoFormLabel}>
                {promoForm.type === 'percent' ? 'Desconto (%)' : 'Valor (Kz)'}
              </Text>
              <TextInput
                style={[bizS.promoFormInput, {marginBottom:16}]}
                placeholder={promoForm.type === 'percent' ? 'Ex: 20' : 'Ex: 500'}
                placeholderTextColor={COLORS.grayText}
                value={promoForm.discount}
                onChangeText={v => setPromoForm(f=>({...f, discount:v}))}
                keyboardType="numeric"
              />

              {/* Título */}
              <Text style={bizS.promoFormLabel}>Título da promoção</Text>
              <TextInput
                style={[bizS.promoFormInput, {marginBottom:16}]}
                placeholder="Ex: 20% OFF em pizzas grandes"
                placeholderTextColor={COLORS.grayText}
                value={promoForm.title}
                onChangeText={v => setPromoForm(f=>({...f, title:v}))}
              />

              {/* Descrição */}
              <Text style={bizS.promoFormLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[bizS.promoFormInput, {minHeight:70, textAlignVertical:'top', marginBottom:16}]}
                placeholder="Detalhes adicionais da promoção..."
                placeholderTextColor={COLORS.grayText}
                value={promoForm.description}
                onChangeText={v => setPromoForm(f=>({...f, description:v}))}
                multiline
              />

              {/* Datas — InlineCalendar evita Modal aninhado */}
              {promoCalTarget === null && (
                <View style={{flexDirection:'row', gap:10, marginBottom:8}}>
                  <View style={{flex:1}}>
                    <Text style={bizS.promoFormLabel}>Data início</Text>
                    <TouchableOpacity
                      style={[bizS.promoFormInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:44}]}
                      onPress={() => setPromoCalTarget('startDate')}
                      activeOpacity={0.7}
                    >
                      <Text style={{fontSize:13, color: promoForm.startDate ? '#111' : COLORS.grayText}}>
                        {promoForm.startDate ? (()=>{const[y,m,d]=promoForm.startDate.split('-');return`${d}/${m}/${y}`})() : 'Selecionar'}
                      </Text>
                      <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2}/>
                    </TouchableOpacity>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={bizS.promoFormLabel}>Data fim</Text>
                    <TouchableOpacity
                      style={[bizS.promoFormInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:44}]}
                      onPress={() => setPromoCalTarget('endDate')}
                      activeOpacity={0.7}
                    >
                      <Text style={{fontSize:13, color: promoForm.endDate ? '#111' : COLORS.grayText}}>
                        {promoForm.endDate ? (()=>{const[y,m,d]=promoForm.endDate.split('-');return`${d}/${m}/${y}`})() : 'Selecionar'}
                      </Text>
                      <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2}/>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {promoCalTarget === 'startDate' && (
                <InlineCalendar
                  value={promoForm.startDate}
                  onConfirm={(v) => { setPromoForm(f=>({...f, startDate:v})); setPromoCalTarget(null); }}
                  onCancel={() => setPromoCalTarget(null)}
                />
              )}
              {promoCalTarget === 'endDate' && (
                <InlineCalendar
                  value={promoForm.endDate}
                  minDate={promoForm.startDate || undefined}
                  onConfirm={(v) => { setPromoForm(f=>({...f, endDate:v})); setPromoCalTarget(null); }}
                  onCancel={() => setPromoCalTarget(null)}
                />
              )}
              <View style={{height:8}}/>
            </ScrollView>

            <View style={bizS.cancelSheetActions}>
              <TouchableOpacity
                style={bizS.cancelSheetBtnGhost}
                activeOpacity={0.7}
                onPress={() => { Keyboard.dismiss(); setShowPromoForm(false); }}
              >
                <Text style={bizS.cancelSheetBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bizS.cancelSheetBtnPrimary, (!promoForm.title.trim() || !promoForm.discount.trim()) && {opacity:0.4}]}
                activeOpacity={0.85}
                disabled={!promoForm.title.trim() || !promoForm.discount.trim()}
                onPress={() => {
                  if (editingPromo) {
                    const updated = promotions.map(p =>
                      p.id === editingPromo.id ? {...p, ...promoForm} : p
                    );
                    setPromotions(updated);
                    syncPromoDeals(updated);
                  } else {
                    const newPromo = { id: `promo_${Date.now()}`, ...promoForm, active: true };
                    const updated = [...promotions, newPromo];
                    setPromotions(updated);
                    syncPromoDeals(updated);
                  }
                  setShowPromoForm(false);
                  setEditingPromo(null);
                  setPromoCalTarget(null);
                  setPromoForm({ title:'', type:'percent', discount:'', description:'', startDate:'', endDate:'' });
                }}
              >
                <Text style={bizS.cancelSheetBtnPrimaryText}>{editingPromo ? 'Guardar Alterações' : 'Criar Promoção'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* REPLY TO REVIEW MODAL — v2.9.6 */}
      <Modal
        visible={showReplyModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowReplyModal(false); }}
      >
        <KeyboardAvoidingView
          style={{flex:1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{flex:1, backgroundColor:'rgba(0,0,0,0.45)'}}
            activeOpacity={1}
            onPress={() => { Keyboard.dismiss(); setShowReplyModal(false); }}
          />
          <View style={[bizS.cancelSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={bizS.cancelSheetHandle} />

            <Text style={bizS.cancelSheetTitle}>Responder à Avaliação</Text>

            {/* Review being replied to */}
            {reviewToReply && (
              <View style={bizS.replyReviewPreview}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                  <Text style={bizS.replyPreviewUser}>{reviewToReply.user}</Text>
                  <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                    {[1,2,3,4,5].map(s => (
                      <Icon key={s} name="star" size={11}
                        color={s <= reviewToReply.rating ? COLORS.red : COLORS.grayLine}
                        strokeWidth={2}
                      />
                    ))}
                  </View>
                </View>
                <Text style={bizS.replyPreviewText} numberOfLines={2}>{reviewToReply.text}</Text>
              </View>
            )}

            <Text style={[bizS.cancelSheetLabel, {marginTop:16}]}>A sua resposta</Text>
            <TextInput
              style={bizS.replyTextInput}
              placeholder="Escreva uma resposta pública a este cliente..."
              placeholderTextColor={COLORS.grayText}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              autoFocus
              maxLength={500}
            />
            <Text style={bizS.replyCharCount}>{replyText.length}/500</Text>

            <View style={bizS.cancelSheetActions}>
              <TouchableOpacity
                style={bizS.cancelSheetBtnGhost}
                activeOpacity={0.7}
                onPress={() => { Keyboard.dismiss(); setShowReplyModal(false); }}
              >
                <Text style={bizS.cancelSheetBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bizS.cancelSheetBtnPrimary, !replyText.trim() && {opacity:0.4}]}
                activeOpacity={0.85}
                disabled={!replyText.trim()}
                onPress={() => {
                  setOwnerReviews(prev =>
                    prev.map(r =>
                      r.id === reviewToReply.id
                        ? { ...r, replied: true, replyText: replyText.trim() }
                        : r
                    )
                  );
                  setShowReplyModal(false);
                  setReviewToReply(null);
                  setReplyText('');
                }}
              >
                <Text style={bizS.cancelSheetBtnPrimaryText}>Enviar Resposta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CANCEL RESERVATION MODAL — v2.9.5e: Root-level so KAV works correctly */}
      <Modal
        visible={showResCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowResCancelModal(false); }}
      >
        <KeyboardAvoidingView
          style={{flex:1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Backdrop */}
          <TouchableOpacity
            style={{flex:1, backgroundColor:'rgba(0,0,0,0.45)'}}
            activeOpacity={1}
            onPress={() => { Keyboard.dismiss(); setShowResCancelModal(false); }}
          />
          {/* Sheet — anchored at bottom, never grows past 85% screen */}
          <View style={[bizS.cancelSheet, {
            paddingBottom: Math.max(insets.bottom, 20),
            maxHeight: '85%',
          }]}>
            <View style={bizS.cancelSheetHandle} />

            <Text style={bizS.cancelSheetTitle}>Cancelar Reserva</Text>
            {reservationToCancel && (
              <Text style={bizS.cancelSheetSubtitle}>
                {reservationToCancel.user} · {reservationToCancel.date} às {reservationToCancel.time}
              </Text>
            )}

            {/* Scrollable options area */}
            <ScrollView
              ref={cancelScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              style={{flexShrink:1}}
            >
              <Text style={bizS.cancelSheetLabel}>Motivo do cancelamento</Text>
              {[
                'Mesa já não disponível',
                'Capacidade máxima atingida',
                'Fecho inesperado do restaurante',
                'Pedido do cliente',
                'Outro motivo',
              ].map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[bizS.cancelReasonOption, resCancelReason === reason && bizS.cancelReasonOptionActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setResCancelReason(reason);
                    if (reason === 'Outro motivo') {
                      const delay = Platform.OS === 'ios' ? 350 : 120;
                      setTimeout(() => cancelScrollRef.current?.scrollToEnd({ animated: true }), delay);
                    }
                  }}
                >
                  <View style={[bizS.cancelReasonRadio, resCancelReason === reason && bizS.cancelReasonRadioActive]}>
                    {resCancelReason === reason && <View style={bizS.cancelReasonRadioDot} />}
                  </View>
                  <Text style={[bizS.cancelReasonText, resCancelReason === reason && bizS.cancelReasonTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
              {resCancelReason === 'Outro motivo' && (
                <TextInput
                  style={bizS.cancelReasonInput}
                  placeholder="Descreva o motivo..."
                  placeholderTextColor={COLORS.grayText}
                  value={resCancelReasonOther}
                  onChangeText={setResCancelReasonOther}
                  multiline
                  numberOfLines={3}
                  autoFocus
                  onFocus={() => {
                    // iOS: keyboard animation finishes ~300ms after focus
                    setTimeout(() => cancelScrollRef.current?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 320 : 80);
                  }}
                />
              )}
              <View style={{height:8}} />
            </ScrollView>

            {/* Buttons — always outside ScrollView so they stay visible */}
            <View style={bizS.cancelSheetActions}>
              <TouchableOpacity
                style={bizS.cancelSheetBtnGhost}
                activeOpacity={0.7}
                onPress={() => { Keyboard.dismiss(); setShowResCancelModal(false); }}
              >
                <Text style={bizS.cancelSheetBtnGhostText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bizS.cancelSheetBtnPrimary, !resCancelReason && {opacity:0.4}]}
                activeOpacity={0.85}
                disabled={!resCancelReason || !reservationToCancel || Boolean(bookingActionLoadingById[reservationToCancel?.id])}
                onPress={async () => {
                  if (!reservationToCancel) return;
                  const finalReason = resCancelReason === 'Outro motivo' && resCancelReasonOther.trim()
                    ? resCancelReasonOther.trim()
                    : resCancelReason;

                  await handleRejectReservation(reservationToCancel, finalReason);
                  setShowResCancelModal(false);
                  setReservationToCancel(null);
                  setResCancelReason('');
                  setResCancelReasonOther('');
                  setReservationFilter('cancelled');
                }}
              >
                <Text style={bizS.cancelSheetBtnPrimaryText}>
                  {reservationToCancel && bookingActionLoadingById[reservationToCancel.id]
                    ? 'A recusar...'
                    : 'Confirmar Cancelamento'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PROMO CODE MODAL — v2.9.5: Manage promotional code */}
      {showPromoCodeModal && (
        <View style={[profS.overlay, {
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowPromoCodeModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Código Promocional</Text>
            <View style={{width:32}} />
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{padding:16}}>

              {/* Current Code Preview */}
              <View style={bizS.promoPreviewCard}>
                <View style={bizS.promoPreviewTop}>
                  <Icon name="tag" size={20} color={COLORS.red} strokeWidth={2} />
                  <Text style={bizS.promoPreviewLabel}>Código Atual</Text>
                </View>
                <View style={bizS.promoCodeDisplay}>
                  <Text style={bizS.promoCodeText}>{promoCode}</Text>
                  <TouchableOpacity
                    style={bizS.promoCopyBtn}
                    activeOpacity={0.7}
                    onPress={() => Alert.alert('Copiado!', `Código "${promoCode}" copiado.`)}
                  >
                    <Icon name="tag" size={16} color={COLORS.red} strokeWidth={2} />
                    <Text style={bizS.promoCopyText}>Copiar</Text>
                  </TouchableOpacity>
                </View>
                <Text style={bizS.promoPreviewSub}>
                  Partilhe este código com os seus clientes para que beneficiem do desconto.
                </Text>
              </View>

              {/* Stats Row */}
              <View style={bizS.promoStatsRow}>
                <View style={bizS.promoStatCard}>
                  <Text style={bizS.promoStatValue}>128</Text>
                  <Text style={bizS.promoStatLabel}>Utilizações</Text>
                </View>
                <View style={bizS.promoStatCard}>
                  <Text style={bizS.promoStatValue}>{promoDiscount}%</Text>
                  <Text style={bizS.promoStatLabel}>Desconto</Text>
                </View>
                <View style={bizS.promoStatCard}>
                  <Text style={bizS.promoStatValue}>{promoUsageLimit}</Text>
                  <Text style={bizS.promoStatLabel}>Limite</Text>
                </View>
              </View>

              {/* Edit Form */}
              <Text style={bizS.sectionTitle}>Editar Promoção</Text>

              <View style={bizS.promoFormGroup}>
                <Text style={bizS.promoFormLabel}>Código</Text>
                <TextInput
                  style={bizS.promoFormInput}
                  value={promoCode}
                  onChangeText={t => setPromoCode(t.toUpperCase())}
                  placeholder="Ex: PIZZA20"
                  placeholderTextColor={COLORS.grayText}
                  autoCapitalize="characters"
                />
              </View>

              <View style={bizS.promoFormGroup}>
                <Text style={bizS.promoFormLabel}>Desconto (%)</Text>
                <TextInput
                  style={bizS.promoFormInput}
                  value={promoDiscount}
                  onChangeText={setPromoDiscount}
                  placeholder="Ex: 20"
                  placeholderTextColor={COLORS.grayText}
                  keyboardType="numeric"
                />
              </View>

              <View style={bizS.promoFormGroup}>
                <Text style={bizS.promoFormLabel}>Validade</Text>
                <TouchableOpacity
                  style={[bizS.promoFormInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:44}]}
                  onPress={() => {
                    // Converte DD/MM/YYYY → YYYY-MM-DD para o picker
                    let iso = '';
                    if (promoExpiry && promoExpiry.includes('/')) {
                      const parts = promoExpiry.split('/');
                      if (parts.length === 3) iso = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                    }
                    openCal('Validade da Promoção', iso, (v) => {
                      // Converte de volta YYYY-MM-DD → DD/MM/YYYY para guardar
                      const [y,m,d] = v.split('-');
                      setPromoExpiry(`${d}/${m}/${y}`);
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{fontSize:13, color: promoExpiry ? '#111' : COLORS.grayText}}>
                    {promoExpiry || 'Selecionar data'}
                  </Text>
                  <Icon name="calendar" size={16} color={COLORS.grayText} strokeWidth={2}/>
                </TouchableOpacity>
              </View>

              <View style={bizS.promoFormGroup}>
                <Text style={bizS.promoFormLabel}>Limite de Utilizações</Text>
                <TextInput
                  style={bizS.promoFormInput}
                  value={promoUsageLimit}
                  onChangeText={setPromoUsageLimit}
                  placeholder="Ex: 100"
                  placeholderTextColor={COLORS.grayText}
                  keyboardType="numeric"
                />
              </View>

              {/* Action Buttons */}
              <View style={bizS.promoActionRow}>
                <TouchableOpacity
                  style={bizS.promoActionBtnGhost}
                  activeOpacity={0.7}
                  onPress={() => {
                    setPromoCode(OWNER_BUSINESS.referralCode);
                    setPromoDiscount('20');
                    setPromoExpiry('31/03/2026');
                    setPromoUsageLimit('100');
                  }}
                >
                  <Text style={bizS.promoActionBtnGhostText}>Repor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={bizS.promoActionBtnPrimary}
                  activeOpacity={0.85}
                  onPress={() => {
                    OWNER_BUSINESS.referralCode = promoCode;
                    updateOwnerBiz({ referralCode: promoCode });
                    Alert.alert('Guardado!', `Código "${promoCode}" com ${promoDiscount}% de desconto guardado com sucesso.`);
                    setShowPromoCodeModal(false);
                  }}
                >
                  <Text style={bizS.promoActionBtnPrimaryText}>Guardar Alterações</Text>
                </TouchableOpacity>
              </View>

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* FEATURED MODAL — v2.6.0: All Featured Businesses */}
      {showFeaturedModal && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowFeaturedModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>✦ Em Destaque</Text>
            <View style={{width:32}} />
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{paddingTop:16}}>
              {businesses.filter(b => b.isPremium).map((business) => {
                const bookmarked = bookmarkedIds.includes(business.id);
                return (
                  <TouchableOpacity 
                    key={business.id} 
                    style={hS.listCell}
                    onPress={() => { setShowFeaturedModal(false); onViewBusiness?.(business); }} 
                    activeOpacity={0.8}
                  >
                    <View style={hS.listCellImage}>
                      {business.deals?.length > 0 && (
                        <View style={hS.dealBadgeOverlay}>
                          <Text style={hS.dealBadgeText} numberOfLines={1}>🔥 {business.deals.length} {business.deals.length>1?'Ofertas':'Oferta'}</Text>
                        </View>
                      )}
                      {business.modules?.delivery && (
                        <View style={hS.deliveryBadge}>
                          <Icon name="delivery" size={12} color={COLORS.white} strokeWidth={2} />
                          <Text style={hS.deliveryBadgeText}>Entrega</Text>
                        </View>
                      )}
                      {business.photos?.[0] ? (
                        <Image source={{ uri: business.photos[0] }} style={hS.listCellPhoto} resizeMode="cover" />
                      ) : (
                        <Text style={hS.listCellIcon}>{business.icon}</Text>
                      )}
                      <TouchableOpacity 
                        style={hS.bookmarkIcon} 
                        onPress={(e) => { e.stopPropagation(); toggleBookmark(business.id); }}
                        activeOpacity={0.7}
                      >
                        <Icon name={bookmarked ? 'bookmarkFilled' : 'bookmark'} size={18} color={COLORS.white} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <View style={hS.listCellInfo}>
                      <View style={hS.listCellTitleRow}>
                        <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
                          <Text style={hS.listCellTitle} numberOfLines={1}>{business.name}</Text>
                          {business.isPremium && <Icon name="certified" size={14} color={COLORS.green} strokeWidth={2} />}
                          {business.verifiedBadge && <Icon name="certified" size={14} color={COLORS.green} strokeWidth={2} />}
                        </View>
                      </View>
                      <View style={hS.listCellMeta}>
                        {renderStars(business.rating)}
                        <Text style={hS.listCellRating}>{business.rating}</Text>
                        <Text style={hS.listCellReviews}>({business.reviews})</Text>
                      </View>
                      <Text style={hS.listCellCategory} numberOfLines={1}>{business.subcategory}</Text>
                      {business.address && (
                        <Text style={hS.listCellAddress} numberOfLines={1}>{business.address}</Text>
                      )}
                      {business.amenities?.length > 0 && (
                        <View style={hS.amenitiesRow}>
                          {business.amenities.slice(0,3).map(a => {                            const iconName = AMENITY_ICON_MAP[a] || 'check';
                            return (
                              <View key={a} style={hS.amenityChip}>
                                <Icon name={iconName} size={11} color={COLORS.grayText} strokeWidth={1.5} />
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <View style={hS.listCellFooter}>
                        <Text style={hS.listCellDistance}>{business.distanceText}</Text>
                        {(() => {
                          const status = getBusinessStatus(business.statusText, business.isOpen);
                          if (status.minsLeft !== null) {
                            return <Text style={hS.closingSoonText}>Fecha em {status.minsLeft} min</Text>;
                          }
                          if (status.isClosed) {
                            return <Text style={hS.closedText}>Fechado</Text>;
                          }
                          return <Text style={hS.openText}>Aberto agora</Text>;
                        })()}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}


      {/* PROFILE OVERLAY — v2.5.1: Complete Complete Redesign */}
      {showProfileModal && (
        <View style={[profS.overlay, { 
          top: insets.top,
          bottom: (insets.bottom || 0) + 58.5
        }]}>
          {/* Header with close button */}
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowProfileModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{width:32}} />
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            {/* Top Section: Avatar + Name + Stats */}
            <View style={profS.topSection}>
              <View style={profS.avatarContainer}>
                <View style={profS.avatarLarge}>
                  <Icon name="user" size={64} color={COLORS.grayText} strokeWidth={1.5} />
                </View>
              </View>
              <Text style={profS.userName}>{USER_PROFILE.name}</Text>
              {/* Stats Badges */}
              <View style={profS.statsBadges}>
                <View style={profS.statBadge}>
                  <Icon name="bell" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{USER_PROFILE.stats.reviewsWritten}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="camera" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>{USER_PROFILE.stats.photosUploaded}</Text>
                </View>
                <View style={profS.statBadge}>
                  <Icon name="users" size={14} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={profS.statBadgeText}>0</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons Grid */}
            <View style={profS.actionGrid}>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Avaliações', 'Abra um negócio para avaliar.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Avaliação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Fotos e vídeos', 'Abra um negócio para adicionar conteúdo.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="camera" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Fotos e vídeos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Check-in', 'Abra um negócio para fazer check-in.')}
              >
                <View style={profS.actionIcon}>
                  <Icon name="check" size={22} color={COLORS.darkText} strokeWidth={2} fill={COLORS.darkText} />
                </View>
                <Text style={profS.actionLabel}>Check-in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.actionButton}
                activeOpacity={0.7}
                onPress={() => setShowClaimFlow(true)}
              >
                <View style={profS.actionIcon}>
                  <Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} />
                </View>
                <Text style={profS.actionLabel}>Adicionar negócio</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Visualizados Recentemente - com fotos reais */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Visualizados recentemente</Text>
              {businesses.filter(b => bookmarkedIds.includes(b.id)).slice(0, 5).map((business) => (
                <TouchableOpacity 
                  key={business.id} 
                  style={profS.recentlyViewedCard}
                  activeOpacity={0.7}
                  onPress={() => { setShowProfileModal(false); onViewBusiness?.(business); }}
                >
                  <View style={profS.recentlyViewedPhoto}>
                    {business.photos?.[0] ? (
                      <Image source={{ uri: business.photos[0] }} style={profS.recentlyViewedPhotoImage} resizeMode="cover" />
                    ) : business.icon ? (
                      <Text style={profS.recentlyViewedIcon}>{business.icon}</Text>
                    ) : (
                      <View style={{width:'100%',height:'100%',backgroundColor:COLORS.grayBg}} />
                    )}
                  </View>
                  <View style={profS.recentlyViewedInfo}>
                    <Text style={profS.recentlyViewedName}>{business.name}</Text>
                    <Text style={profS.recentlyViewedAddress}>{business.address || business.subcategory}</Text>
                    <Text style={profS.recentlyViewedMeta}>{business.subcategory} • {business.distanceText}</Text>
                  </View>
                  <Icon name="bookmark" size={22} color={COLORS.darkText} strokeWidth={2} fill={bookmarkedIds.includes(business.id) ? COLORS.darkText : 'none'} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={profS.divider} />

            {/* Contribuições */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Contribuições</Text>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Avaliações', 'Aqui ficará o histórico das suas avaliações.')}
              >
                <Icon name="star" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Avaliações</Text>
                <Text style={profS.menuCount}>{USER_PROFILE.stats.reviewsWritten}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Negócios adicionados', 'Funcionalidade disponível em breve.')}
              >
                <Icon name="plusSquare" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Negócios adicionados</Text>
                <Text style={profS.menuCount}>0</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Sua Atividade */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Sua atividade</Text>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Reservas', 'Histórico de reservas será exibido nesta secção.')}
              >
                <Icon name="calendar" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Reservas</Text>
                <Text style={profS.menuCount}>0</Text>
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Conta */}
            <View style={profS.section}>
              <Text style={profS.sectionTitle}>Conta</Text>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Preferências', 'Configuração de preferências disponível em breve.')}
              >
                <Icon name="heart" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Preferências</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Perfil', 'Edição de perfil será disponibilizada nesta secção.')}
              >
                <Icon name="user" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Perfil</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Ajuda e suporte', 'Centro de ajuda será integrado em breve.')}
              >
                <Icon name="helpCircle" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Ajuda e suporte</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Configurações', 'Configurações avançadas serão adicionadas em breve.')}
              >
                <Icon name="settings" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Configurações</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={profS.menuRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Sobre AchAqui', 'AchAqui v2. Informações detalhadas em breve.')}
              >
                <Icon name="info" size={22} color={COLORS.darkText} strokeWidth={2} />
                <Text style={profS.menuLabel}>Sobre AchAqui</Text>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={profS.divider} />

            {/* Business Mode Trigger — v2.7.0 FASE 3 */}
            {false && (
              <View style={profS.section}>
                <TouchableOpacity 
                  style={bizS.premiumCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveBusinessTab('dashboard');
                    setShowProfileModal(false);
                  }}
                >
                  <View style={bizS.premiumCardContent}>
                    <View style={bizS.premiumIcon}>
                      <Text style={{fontSize:32}}>👑</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={bizS.premiumTitle}>Gerir o meu Negócio</Text>
                      <Text style={bizS.premiumDesc}>Aceda ao Dashboard e gerencie seu negócio</Text>
                    </View>
                    <Icon name="arrowRight" size={24} color={COLORS.white} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}


      {/* BOTTOM NAVIGATION BAR — v2.0.4: absolute bottom with safe area */}
      <View style={[NAV_BAR_STYLES.bar, { paddingBottom: insets.bottom + 8 }]}>
        {(true ? [
          { id:'dashboard', icon:'analytics', label:'Dashboard' },
          { id:'notifications', icon:'bell', label:'Notificações' },
          { id:'mybusiness', icon:'briefcase', label:'Meu Negócio' },
          { id:'exitbusiness', icon:'x', label:'Sair' },
        ] : [
          { id:'home',     icon:'outdoor',  label:'Início'    },
          { id:'search',   icon:'search',   label:'Pesquisar' },
          { id:'featured', icon:'diamond4',  label:'Destaque'  },
          { id:'profile',  icon:'user',     label:'Perfil'    },
        ]).map(tab => {
          const active = activeBusinessTab === tab.id || (tab.id === "dashboard" && !["notifications","mybusiness","exitbusiness"].includes(activeBusinessTab) && ["home","search","featured","profile"].includes(tab.id) && false);
          return (
            <Animated.View
              key={`${tab.id}-focus`}
              style={[
                NAV_BAR_STYLES.tab,
                {
                  transform: [
                    {
                      scale: tabFocusAnimRef[tab.id]?.interpolate?.({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }) || 1,
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                // Double-tap detection for scroll to top
                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;
                if (activeBusinessTab === tab.id && now - lastTapTime.current < DOUBLE_TAP_DELAY) {
                  // Double tap detected - scroll to top
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  lastTapTime.current = 0; // Reset
                  return;
                }
                lastTapTime.current = now;
                triggerTabFocusAnim(tab.id);
                closeOwnerTabOverlays();
                if (tab.id === 'exitbusiness') {
                  setActiveBusinessTab('dashboard');
                  onExitOwnerMode();
                  return;
                }
                setActiveBusinessTab(tab.id);
              }}
              activeOpacity={0.75}
            >
                <View style={[NAV_BAR_STYLES.iconWrap, active && NAV_BAR_STYLES.iconWrapActive]}>
                  <Icon name={tab.icon} size={20} color={active ? COLORS.red : COLORS.grayText} strokeWidth={active ? 2.5 : 1.5} />
                </View>
                <Text style={[NAV_BAR_STYLES.label, active && NAV_BAR_STYLES.labelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>


      {/* BRUTAL CANCEL MODAL - INSERTED CORRECTLY */}
      {showCancelReason && (
        <View style={{position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'center', alignItems:'center', zIndex:99999999}}>
          <View style={{width:'90%', maxWidth:400, backgroundColor:'white', borderRadius:20, padding:20}}>
            <View style={{flexDirection:'row', marginBottom:16}}>
              <Text style={{flex:1, fontSize:18, fontWeight:'bold', color:'#1a1a1a'}}>Motivo</Text>
              <TouchableOpacity onPress={() => { 
                setShowCancelReason(false); 
                setCancelReason(''); 
                setTimeout(() => {
                  if (cancelTarget === 'order') {
                    setShowCustomOrderDetail(true);
                  } else if (cancelTarget === 'delivery') {
                    setShowDeliveryOrderDetail(true);
                  } else if (cancelTarget === 'roomBooking') {
                    setShowRoomBookingsManager(true);
                  }
                }, 50);
              }}>
                <Text style={{fontSize:24, color:'#666'}}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:13, color:'#666', marginBottom:12}}>Por favor, informe o motivo {actionType === 'reject' ? 'da rejeição' : 'do cancelamento'} *</Text>
            <TextInput style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, minHeight:80, fontSize:14, textAlignVertical:'top'}} value={cancelReason} onChangeText={setCancelReason} placeholder="Ex: Cliente desistiu..." multiline autoFocus />
            <View style={{flexDirection:'row', gap:10, marginTop:20}}>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:'#ddd', alignItems:'center'}} onPress={() => { 
                setShowCancelReason(false); 
                setCancelReason(''); 
                setTimeout(() => {
                  if (cancelTarget === 'order') {
                    setShowCustomOrderDetail(true);
                  } else if (cancelTarget === 'delivery') {
                    setShowDeliveryOrderDetail(true);
                  } else if (cancelTarget === 'roomBooking') {
                    setShowRoomBookingsManager(true);
                  }
                }, 50);
              }}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'#666'}}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor: cancelReason.trim() ? '#D32F2F' : '#ddd', alignItems:'center'}} disabled={!cancelReason.trim()} onPress={() => { if (!cancelReason.trim()) return; if (cancelTarget === 'order') { const newStatus = actionType === 'reject' ? 'rejected' : 'cancelled'; const reasonKey = actionType === 'reject' ? 'rejectReason' : 'cancelReason'; const updated = customOrders.map(o => o.id === selectedCustomOrder.id ? {...o, status: newStatus, [reasonKey]: cancelReason.trim()} : o); setCustomOrders(updated); OWNER_BUSINESS.customOrders = updated; setShowCustomOrderDetail(false); } else if (cancelTarget === 'delivery') { const updated = deliveryOrders.map(o => o.id === selectedDeliveryOrder.id ? {...o, status: 'cancelled', cancelReason: cancelReason.trim()} : o); setDeliveryOrders(updated); OWNER_BUSINESS.deliveryOrders = updated; setShowDeliveryOrderDetail(false); } else if (cancelTarget === 'roomBooking' && selectedRoomBooking) { const newStatus = actionType === 'reject' ? 'rejected' : 'cancelled'; const updated = roomBookings.map(b => b.id === selectedRoomBooking.id ? {...b, status: newStatus, cancelReason: cancelReason.trim()} : b); setRoomBookings(updated); } setShowCancelReason(false); setCancelReason(''); setCancelTarget(null); setActionType(null);
                setTimeout(() => {
                  if (cancelTarget === 'order') {
                    setShowCustomOrderDetail(true);
                  } else if (cancelTarget === 'delivery') {
                    setShowDeliveryOrderDetail(true);
                  } else if (cancelTarget === 'roomBooking') {
                    setShowRoomBookingsManager(true);
                  }
                }, 50);
              }}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'white'}}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* BRUTAL EDIT ORDER MODAL */}
      {showEditOrder && (
        <View style={{position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'center', alignItems:'center', zIndex:99999999}}>
          <View style={{width:'90%', maxWidth:400, backgroundColor:'white', borderRadius:20, padding:20}}>
            <View style={{flexDirection:'row', marginBottom:16}}>
              <Text style={{flex:1, fontSize:18, fontWeight:'bold', color:'#1a1a1a'}}>Editar Encomenda</Text>
              <TouchableOpacity onPress={() => { setShowEditOrder(false); setTimeout(() => setShowCustomOrderDetail(true), 50); }}>
                <Text style={{fontSize:24, color:'#666'}}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:14, color:'#666', marginBottom:12}}>{selectedCustomOrder?.customerName}</Text>
            <Text style={{fontSize:12, fontWeight:'bold', color:'#1a1a1a', marginBottom:4}}>Preço (Kz)</Text>
            <TextInput style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, fontSize:14, marginBottom:12}} value={editOrderForm.price} onChangeText={(text) => setEditOrderForm({...editOrderForm, price: text})} placeholder="Ex: 8000" keyboardType="numeric" />
            <Text style={{fontSize:12, fontWeight:'bold', color:'#1a1a1a', marginBottom:4}}>Prazo de Entrega</Text>
            <TouchableOpacity
              style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, marginBottom:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}
              onPress={() => openCal('Prazo de Entrega', editOrderForm.deadline, (v) => setEditOrderForm({...editOrderForm, deadline: v}))}
              activeOpacity={0.7}
            >
              <Text style={{fontSize:14, color: editOrderForm.deadline ? '#1a1a1a' : '#999'}}>
                {editOrderForm.deadline ? (()=>{const[y,m,d]=editOrderForm.deadline.split('-');return`${d}/${m}/${y}`})() : 'Selecionar data'}
              </Text>
              <Icon name="calendar" size={16} color="#999" strokeWidth={2}/>
            </TouchableOpacity>
            <Text style={{fontSize:12, fontWeight:'bold', color:'#1a1a1a', marginBottom:4}}>Notas</Text>
            <TextInput style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, minHeight:60, fontSize:14, textAlignVertical:'top'}} value={editOrderForm.notes} onChangeText={(text) => setEditOrderForm({...editOrderForm, notes: text})} placeholder="Observações..." multiline />
            <View style={{flexDirection:'row', gap:10, marginTop:20}}>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:'#ddd', alignItems:'center'}} onPress={() => setShowEditOrder(false)}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'#666'}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#4CAF50', alignItems:'center'}} onPress={() => { 
                const updated = customOrders.map(o => o.id === selectedCustomOrder.id ? {...o, price: editOrderForm.price ? parseFloat(editOrderForm.price) : 0, deadline: editOrderForm.deadline, notes: editOrderForm.notes} : o); 
                setCustomOrders(updated); 
                OWNER_BUSINESS.customOrders = updated; 
                const updatedOrder = {...selectedCustomOrder, price: editOrderForm.price ? parseFloat(editOrderForm.price) : 0, deadline: editOrderForm.deadline, notes: editOrderForm.notes};
                setSelectedCustomOrder(updatedOrder); 
                setShowEditOrder(false); 
                setTimeout(() => setShowCustomOrderDetail(true), 50);
              }}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'white'}}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showEditDelivery && (
        <View style={{position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'center', alignItems:'center', zIndex:99999999}}>
          <View style={{width:'90%', maxWidth:400, backgroundColor:'white', borderRadius:20, padding:20}}>
            <View style={{flexDirection:'row', marginBottom:16}}>
              <Text style={{flex:1, fontSize:18, fontWeight:'bold', color:'#1a1a1a'}}>Editar Entrega</Text>
              <TouchableOpacity onPress={() => { setShowEditDelivery(false); setTimeout(() => setShowDeliveryOrderDetail(true), 50); }}>
                <Text style={{fontSize:24, color:'#666'}}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:14, color:'#666', marginBottom:12}}>{selectedDeliveryOrder?.orderId} • {selectedDeliveryOrder?.customerName}</Text>
            <Text style={{fontSize:12, fontWeight:'bold', color:'#1a1a1a', marginBottom:4}}>Tempo Estimado</Text>
            <TextInput style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, fontSize:14, marginBottom:12}} value={editDeliveryForm.estimatedTime} onChangeText={(text) => setEditDeliveryForm({...editDeliveryForm, estimatedTime: text})} placeholder="Ex: 20 min" />
            <Text style={{fontSize:12, fontWeight:'bold', color:'#1a1a1a', marginBottom:4}}>Notas</Text>
            <TextInput style={{borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:12, minHeight:60, fontSize:14, textAlignVertical:'top'}} value={editDeliveryForm.notes} onChangeText={(text) => setEditDeliveryForm({...editDeliveryForm, notes: text})} placeholder="Observações..." multiline />
            <View style={{flexDirection:'row', gap:10, marginTop:20}}>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, borderWidth:1.5, borderColor:'#ddd', alignItems:'center'}} onPress={() => setShowEditDelivery(false)}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'#666'}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#4CAF50', alignItems:'center'}} onPress={() => { 
                const updated = deliveryOrders.map(o => o.id === selectedDeliveryOrder.id ? {...o, estimatedTime: editDeliveryForm.estimatedTime, notes: editDeliveryForm.notes} : o); 
                setDeliveryOrders(updated); 
                OWNER_BUSINESS.deliveryOrders = updated; 
                const updatedDelivery = {...selectedDeliveryOrder, estimatedTime: editDeliveryForm.estimatedTime, notes: editDeliveryForm.notes};
                setSelectedDeliveryOrder(updatedDelivery); 
                setShowEditDelivery(false); 
                setTimeout(() => setShowDeliveryOrderDetail(true), 50);
              }}>
                <Text style={{fontSize:13, fontWeight:'bold', color:'white'}}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── ADICIONAR FOTOS MODAL ─────────────────────────────────────── */}
{/* ── FOTOS DO NEGÓCIO MODAL — Image 3 design ──────────────────── */}
      {showPhotoUpload && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowPhotoUpload(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Fotos do Negócio</Text>
            <TouchableOpacity
              onPress={handleAddPhotoAction}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
              disabled={isBusinessPhotoUploading}
            >
              {isBusinessPhotoUploading
                ? <ActivityIndicator size="small" color={COLORS.red} />
                : <Icon name="plusCircle" size={24} color={COLORS.red} strokeWidth={2.5} />}
            </TouchableOpacity>
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16 }}>
              {/* Count info */}
              <Text style={photoS.countInfo}>
                {(ownerPhotos || []).length} foto{(ownerPhotos || []).length !== 1 ? 's' : ''} · A primeira é a foto de capa
              </Text>

              {/* Photo Grid */}
              {(ownerPhotos || []).length > 0 ? (
                <View style={photoS.grid}>
                  {(ownerPhotos || []).map((photo, idx) => (
                    <View key={idx} style={photoS.gridItem}>
                      <Image source={{ uri: photo }} style={photoS.gridPhoto} resizeMode="cover" />
                      {/* Capa badge on first photo */}
                      {idx === 0 && (
                        <View style={photoS.capaBadge}>
                          <Text style={photoS.capaBadgeText}>Capa</Text>
                        </View>
                      )}
                      {/* Remove button */}
                      <TouchableOpacity
                        style={photoS.removeBtn}
                        onPress={() => {
                          const updated = (ownerPhotos || []).filter((_, i) => i !== idx);
                          OWNER_BUSINESS.photos = updated;
                          setOwnerPhotos(updated);
                          updateOwnerBiz({ photos: updated });
                          AsyncStorage.setItem(ownerPhotosStorageKey, JSON.stringify(updated)).catch(() => {});
                        }}
                        activeOpacity={0.8}
                      >
                        <Icon name="x" size={14} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                      {/* "Definir capa" on non-cover photos */}
                      {idx > 0 && (
                        <TouchableOpacity
                          style={photoS.setCapaOverlay}
                          onPress={() => {
                            const updated = [(ownerPhotos || [])[idx], ...(ownerPhotos || []).filter((_, i) => i !== idx)];
                            OWNER_BUSINESS.photos = updated;
                            setOwnerPhotos(updated);
                            updateOwnerBiz({ photos: updated });
                            AsyncStorage.setItem(ownerPhotosStorageKey, JSON.stringify(updated)).catch(() => {});
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={photoS.setCapaText}>Definir capa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[editorS.emptyState, { paddingVertical: 60 }]}>
                  <Icon name="camera" size={64} color={COLORS.grayText} strokeWidth={1} />
                  <Text style={editorS.emptyStateTitle}>Sem Fotos</Text>
                  <Text style={editorS.emptyStateText}>Toque em + para adicionar fotos do seu negócio</Text>
                </View>
              )}

              {/* Add photo buttons */}
              <TouchableOpacity
                style={photoS.addBtn}
                activeOpacity={0.8}
                onPress={takePhotoWithCamera}
              >
                <Icon name="camera" size={18} color={COLORS.red} strokeWidth={2} />
                <Text style={photoS.addBtnText}>Tirar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[photoS.addBtn, { marginTop: 8 }]}
                activeOpacity={0.8}
                onPress={pickPhotoFromGallery}
              >
                <Icon name="camera" size={18} color={COLORS.red} strokeWidth={2} />
                <Text style={photoS.addBtnText}>Escolher da Galeria</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── SINCRONIZAÇÃO iCAL MODAL ───────────────────────────────────── */}
      {showICalModal && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowICalModal(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Sincronização iCal</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <Text style={[bizS.amenitiesHint, { marginBottom: 20 }]}>
              Sincronize as reservas do seu negócio com plataformas externas. Evita duplicação e mantém a disponibilidade actualizada.
            </Text>

            {/* Plataformas */}
            {[
              { name: 'Booking.com', icon: '🏨', color: '#003580', desc: 'Sincronize reservas do Booking.com' },
              { name: 'Airbnb', icon: '🏠', color: '#FF5A5F', desc: 'Sincronize reservas do Airbnb' },
              { name: 'Google Calendar', icon: '📅', color: '#4285F4', desc: 'Exporte para Google Calendar' },
              { name: 'Expedia', icon: '✈️',  color: '#00355F', desc: 'Sincronize reservas do Expedia' },
            ].map((platform) => (
              <TouchableOpacity
                key={platform.name}
                style={{ backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.grayLine }}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    `Conectar ${platform.name}`,
                    `Cole o link iCal do ${platform.name} para sincronizar automaticamente as reservas.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Configurar', onPress: () => Alert.alert('iCal', 'Configuração disponível na versão publicada com integração nativa.') },
                    ]
                  );
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: platform.color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 24 }}>{platform.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.darkText, marginBottom: 2 }}>{platform.name}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.grayText }}>{platform.desc}</Text>
                </View>
                <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
              </TouchableOpacity>
            ))}

            {/* iCal URL input */}
            <Text style={[bizS.sectionTitle, { marginTop: 8, marginBottom: 12 }]}>URL iCal Manual</Text>
            <TextInput
              style={{ borderWidth: 1.5, borderColor: COLORS.grayLine, borderRadius: 12, padding: 14, fontSize: 13, color: COLORS.darkText, backgroundColor: COLORS.grayBg, marginBottom: 12 }}
              placeholder="https://calendar.google.com/calendar/ical/..."
              placeholderTextColor={COLORS.grayText}
              multiline
            />
            <TouchableOpacity
              style={{ backgroundColor: COLORS.red, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.8}
              onPress={() => Alert.alert('iCal Guardado', 'URL iCal guardado. A sincronização será activada na versão publicada.')}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Guardar URL</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* ── CONFIGURAÇÕES DO NEGÓCIO MODAL ────────────────────────────── */}
{/* ── CONFIGURAÇÕES MODAL — Image 1 design ─────────────────────── */}

      {/* ── SERVIÇOS OFERECIDOS EDITOR ────────────────────────────────────── */}
      {showServicesOfferedEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowServicesOfferedEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Serviços Oferecidos</Text>
            <TouchableOpacity onPress={() => {
              updateOwnerBiz({ servicesOffered: ownerServicesOffered });
              setShowServicesOfferedEditor(false);
            }}>
              <Text style={{fontSize:16, fontWeight:'700', color:COLORS.red}}>Guardar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              <Text style={bizS.amenitiesHint}>
                Selecione os serviços que o seu negócio oferece. Eles aparecerão no seu perfil público.
              </Text>
              
              {['Corte de Cabelo', 'Manicure', 'Pedicure', 'Massagem', 'Depilação', 'Maquilhagem', 'Tratamento Facial', 'Coloração'].map(service => (
                <TouchableOpacity
                  key={service}
                  style={[bizS.amenityRow, ownerServicesOffered.includes(service) && bizS.amenityRowActive]}
                  onPress={() => {
                    setOwnerServicesOffered(prev => 
                      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[bizS.amenityLabel, ownerServicesOffered.includes(service) && bizS.amenityLabelActive]}>
                    {service}
                  </Text>
                  {ownerServicesOffered.includes(service) && (
                    <Icon name="check" size={20} color={COLORS.red} strokeWidth={2} fill={COLORS.red} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── PORTFÓLIO EDITOR ────────────────────────────────────────────── */}
      {showPortfolioEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowPortfolioEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Portfólio</Text>
            <TouchableOpacity onPress={() => Alert.alert('Upload', 'Funcionalidade de upload disponível em breve.')}>
              <Icon name="plusCircle" size={26} color={COLORS.red} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              <Text style={bizS.amenitiesHint}>
                Adicione fotos dos seus trabalhos para mostrar aos clientes.
              </Text>
              {ownerPortfolio.length === 0 ? (
                <View style={{alignItems:'center', paddingVertical:60}}>
                  <Icon name="camera" size={48} color={COLORS.grayText} strokeWidth={1.5} />
                  <Text style={{fontSize:15, color:COLORS.grayText, marginTop:16}}>Nenhuma foto no portfólio</Text>
                  <TouchableOpacity
                    style={{marginTop:20, paddingHorizontal:24, paddingVertical:12, backgroundColor:COLORS.red, borderRadius:10}}
                    onPress={() => Alert.alert('Upload', 'Funcionalidade disponível em breve.')}
                  >
                    <Text style={{color:COLORS.white, fontWeight:'700'}}>+ Adicionar Foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
                  {ownerPortfolio.map((img, idx) => (
                    <View key={idx} style={{width:'31%', aspectRatio:1, borderRadius:8, backgroundColor:COLORS.grayBg}}>
                      <Image source={{uri:img}} style={{width:'100%', height:'100%', borderRadius:8}} />
                    </View>
                  ))}
                </View>
              )}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── DISPONIBILIDADE EDITOR ─────────────────────────────────────── */}
      {showAvailabilityEditor && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowAvailabilityEditor(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>Disponibilidade</Text>
            <TouchableOpacity onPress={() => {
              updateOwnerBiz({ availability: ownerAvailability });
              setShowAvailabilityEditor(false);
            }}>
              <Text style={{fontSize:16, fontWeight:'700', color:COLORS.red}}>Guardar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false}>
            <View style={{padding:16}}>
              <Text style={bizS.amenitiesHint}>
                Defina os horários em que aceita marcações. Os clientes só poderão agendar dentro destes períodos.
              </Text>
              
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                const dayNames = {mon:'Segunda', tue:'Terça', wed:'Quarta', thu:'Quinta', fri:'Sexta', sat:'Sábado', sun:'Domingo'};
                const slots = ownerAvailability[day] || [];
                return (
                  <View key={day} style={{backgroundColor:COLORS.white, borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:COLORS.grayLine}}>
                    <Text style={{fontSize:15, fontWeight:'700', color:COLORS.darkText, marginBottom:8}}>{dayNames[day]}</Text>
                    {slots.length === 0 ? (
                      <Text style={{fontSize:13, color:COLORS.grayText}}>Fechado</Text>
                    ) : (
                      slots.map((slot, idx) => (
                        <Text key={idx} style={{fontSize:14, color:COLORS.darkText}}>{slot.start} - {slot.end}</Text>
                      ))
                    )}
                    <TouchableOpacity
                      style={{marginTop:8, paddingVertical:6, borderRadius:8, backgroundColor:COLORS.redLight, alignItems:'center'}}
                      onPress={() => Alert.alert('Editar Horário', 'Funcionalidade disponível em breve.')}
                    >
                      <Text style={{fontSize:12, fontWeight:'700', color:COLORS.red}}>
                        {slots.length === 0 ? 'Adicionar Horário' : 'Editar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── PRATOS EM DESTAQUE EDITOR ─────────────────────────────────── */}
      {showPopularDishesEditor && (
        <Modal visible={showPopularDishesEditor} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPopularDishesEditor(false)}>
          <View style={{flex:1, backgroundColor:COLORS.white}}>
            <View style={[profS.overlayHeader, {paddingTop:16}]}>
              <TouchableOpacity style={profS.backBtn} onPress={() => setShowPopularDishesEditor(false)}>
                <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={profS.overlayTitle}>Pratos em Destaque</Text>
              <View style={{width:32}} />
            </View>
            <ScrollView style={{flex:1}} contentContainerStyle={{padding:16}}>
              <Text style={{fontSize:13, color:COLORS.grayText, marginBottom:16}}>Escolhe até 5 pratos para destacar no perfil público</Text>
              {ownerPopularDishes.map((d, i) => (
                <View key={i} style={[bizS.couponCard, {marginBottom:10}]}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <Text style={{fontWeight:'700', color:COLORS.darkText, fontSize:13}}>#{i+1}</Text>
                    <TouchableOpacity onPress={() => setOwnerPopularDishes(ownerPopularDishes.filter((_,idx)=>idx!==i))}>
                      <Icon name="x" size={16} color={COLORS.red} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={[bizS.promoFormInput, {marginBottom:8}]} value={d.name||''} onChangeText={t => { const u=[...ownerPopularDishes]; u[i]={...u[i],name:t}; setOwnerPopularDishes(u); }} placeholder="Nome do prato" placeholderTextColor={COLORS.grayText} />
                  <TextInput style={[bizS.promoFormInput, {marginBottom:8}]} value={d.price||''} onChangeText={t => { const u=[...ownerPopularDishes]; u[i]={...u[i],price:t}; setOwnerPopularDishes(u); }} placeholder="Preço (ex: 3.500 Kz)" placeholderTextColor={COLORS.grayText} />
                  <TextInput style={[bizS.promoFormInput, {minHeight:0}]} value={String(d.orders||'')} onChangeText={t => { const u=[...ownerPopularDishes]; u[i]={...u[i],orders:parseInt(t)||0}; setOwnerPopularDishes(u); }} placeholder="Nº de pedidos" placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                </View>
              ))}
              {ownerPopularDishes.length < 5 && (
                <TouchableOpacity
                  style={[bizS.highlightAddBtn, {marginTop:4}]}
                  onPress={() => setOwnerPopularDishes([...ownerPopularDishes, {name:'',price:'',orders:0}])}
                >
                  <Icon name="plus" size={16} color={COLORS.red} strokeWidth={2.5} />
                  <Text style={bizS.highlightAddText}>Adicionar prato</Text>
                </TouchableOpacity>
              )}
              <View style={{height:24}} />
            </ScrollView>
            <View style={{padding:16}}>
              <TouchableOpacity
                style={{backgroundColor:COLORS.red, borderRadius:12, paddingVertical:14, alignItems:'center'}}
                onPress={() => {
                  const clean = ownerPopularDishes.filter(d => d.name?.trim());
                  setOwnerPopularDishes(clean);
                  updateOwnerBiz({ popularDishes: clean });
                  setShowPopularDishesEditor(false);
                  Alert.alert('Guardado!', 'Pratos em destaque actualizados.');
                }}
              >
                <Text style={{color:COLORS.white, fontWeight:'700', fontSize:15}}>Guardar Destaques</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── CALENDAR PICKER GLOBAL ────────────────────────────────────────── */}
      <CalendarPicker
        visible={calVisible}
        value={calValue}
        label={calLabel}
        minDate={calMinDate}
        onConfirm={(date) => { if (calCallback?.fn) calCallback.fn(date); setCalVisible(false); }}
        onCancel={() => setCalVisible(false)}
      />

      {/* ── SETTINGS MODAL COMPLETO ─────────────────────────────────────────── */}
      {showSettings && (
        <View style={[profS.overlay, { top: insets.top, bottom: (insets.bottom || 0) + 58.5 }]}>
          <View style={profS.header}>
            <TouchableOpacity style={profS.backBtn} onPress={() => {
              if (settingsSection) setSettingsSection(null);
              else setShowSettings(false);
            }}>
              <Icon name={settingsSection ? 'back' : 'x'} size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.headerTitle}>
              {!settingsSection && 'Configurações'}
              {settingsSection === 'info' && 'Informações Básicas'}
              {settingsSection === 'profile' && 'Destaques & Perfil'}
              {settingsSection === 'hours' && 'Horário de Funcionamento'}
              {settingsSection === 'notifs' && 'Notificações'}
              {settingsSection === 'operations' && 'Operações'}
              {settingsSection === 'visibility' && 'Visibilidade'}
              {settingsSection === 'account' && 'Conta'}
            </Text>
            {settingsSection && (
              <TouchableOpacity activeOpacity={0.7} onPress={async () => {
                if (settingsSection === 'info') {
                  if (!settingsInfo.name?.trim()) {
                    Alert.alert('Campo obrigatório', 'O nome do negócio é obrigatório.');
                    setIsUpdatingSettings(false);
                    return;
                  }
                  // Payload para CRIAR (CreateBusinessDto: name, category, description, metadata, latitude, longitude)
                  const createPayload = {
                    name: settingsInfo.name.trim(),
                    category: settingsInfo.category?.trim() || settingsInfo.primaryCategoryId || 'general',
                    businessType: settingsInfo.businessType || undefined,
                    metadata: {
                      businessType:      settingsInfo.businessType      || undefined,
                      primaryCategoryId: settingsInfo.primaryCategoryId || undefined,
                      subCategoryIds:    settingsInfo.subCategoryIds?.length ? settingsInfo.subCategoryIds : undefined,
                      subcategory:       settingsInfo.subcategory       || undefined,
                    },
                    description: settingsInfo.description || undefined,
                    metadata: {
                      phone: settingsInfo.phone || undefined,
                      website: settingsInfo.website || undefined,
                      address: settingsInfo.address || undefined,
                      neighborhood: settingsInfo.neighborhood || undefined,
                    },
                    latitude: settingsInfo.latitude || undefined,
                    longitude: settingsInfo.longitude || undefined,
                  };
                  // Payload para ACTUALIZAR (UpdateBusinessInfoDto: name, description, phone, website, email, address, latitude, longitude)
                  const updatePayload = {
                    name: settingsInfo.name.trim(),
                    description: settingsInfo.description || undefined,
                    phone: settingsInfo.phone || undefined,
                    website: settingsInfo.website || undefined,
                    address: settingsInfo.address || undefined,
                    latitude: settingsInfo.latitude || undefined,
                    longitude: settingsInfo.longitude || undefined,
                  };
                  try {
                    if (!ownerBiz) {
                      // Criar novo negócio na BD
                      const newBusiness = await backendApi.createBusiness(createPayload, accessToken);
                      // Adicionar à lista global para aparecer no Home
                      if (onRefreshOwnerData) await onRefreshOwnerData();
                      Alert.alert('✅ Negócio criado!', 'O teu negócio foi registado e já aparece na plataforma.');
                      setShowSettings(false);
                    } else {
                      // Actualizar negócio existente
                      await backendApi.updateBusinessInfo(ownerBusinessId, updatePayload, accessToken);
                      // Guardar category, businessType, primaryCategoryId, subCategoryIds
                      await backendApi.updateBusiness(ownerBusinessId, {
                        category: settingsInfo.category || undefined,
                        metadata: {
                          businessType:      settingsInfo.businessType      || undefined,
                          primaryCategoryId: settingsInfo.primaryCategoryId || undefined,
                          subCategoryIds:    settingsInfo.subCategoryIds?.length ? settingsInfo.subCategoryIds : undefined,
                          subcategory:       settingsInfo.subcategory       || undefined,
                        },
                      }, accessToken).catch(() => {});
                      updateOwnerBiz({
                        ...updatePayload,
                        businessType:      settingsInfo.businessType,
                        category:          settingsInfo.category,
                        primaryCategoryId: settingsInfo.primaryCategoryId,
                        subCategoryIds:    settingsInfo.subCategoryIds,
                        subcategory:       settingsInfo.subcategory,
                      });
                      Alert.alert('✅ Guardado', 'Informações actualizadas com sucesso.');
                    }
                  } catch (err) {
                    Alert.alert('Erro', err?.message || 'Não foi possível guardar. Tenta novamente.');
                    setIsUpdatingSettings(false);
                    return;
                  }
                }
                if (settingsSection === 'profile') {
                  const cleanHighlights = ownerHighlights.filter(h => h.replace(/"/g,'').trim());
                  setOwnerHighlights(cleanHighlights);
                  updateOwnerBiz({ highlights: cleanHighlights });
                }
                if (settingsSection === 'hours') {
                  const days = Object.entries(settingsHours);
                  const hoursStr = days.filter(([,v]) => v.active).map(([d,v]) => `${d.charAt(0).toUpperCase()+d.slice(1)}: ${v.open}-${v.close}`).join(', ');
                  const hoursList = days.filter(([,v]) => v.active).map(([d,v]) => `${d.charAt(0).toUpperCase()+d.slice(1)} ${v.open} - ${v.close}`);
                  OWNER_BUSINESS.hours = hoursStr;
                  updateOwnerBiz({ hours: hoursStr, hoursList });
                }
                if (settingsSection === 'operations') {
                  OWNER_BUSINESS.isOpen = settingsOperations.isOpen && !settingsOperations.temporarilyClosed;
                  updateOwnerBiz({
                    isOpen: settingsOperations.isOpen && !settingsOperations.temporarilyClosed,
                    payment: settingsOperations.payment,
                  });
                }
                Alert.alert('Guardado!', 'Alterações guardadas com sucesso.');
                setSettingsSection(null);
              }}>
                <Text style={{fontSize:15, fontWeight:'700', color:COLORS.red}}>Guardar</Text>
              </TouchableOpacity>
            )}
            {!settingsSection && <View style={{width:32}} />}
          </View>

          <ScrollView style={profS.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{padding:16}}>

              {/* ── MEDIDOR DE PROGRESSO DO PERFIL ── */}
              {!settingsSection && (() => {
                const criteria = [
                  { label: 'Nome do negócio',        done: Boolean(settingsInfo.name?.trim()),        section: 'info' },
                  { label: 'Categoria principal',     done: Boolean(settingsInfo.primaryCategoryId),   section: 'info' },
                  { label: 'Morada',                  done: Boolean(settingsInfo.address?.trim()),     section: 'info' },
                  { label: 'Telefone de contacto',    done: Boolean(settingsInfo.phone?.trim()),       section: 'info' },
                  { label: 'Descrição do negócio',    done: Boolean(settingsInfo.description?.trim()), section: 'info' },
                  { label: 'Horários de funcionamento', done: Object.values(settingsHours).some(h => h.active), section: 'hours' },
                  { label: 'Fotos do negócio',        done: ownerPhotos.length > 0,                   section: 'profile' },
                  { label: 'Website ou rede social',  done: Boolean(settingsInfo.website?.trim()),     section: 'info' },
                ];
                const filled = criteria.filter(c => c.done).length;
                const pct    = Math.round((filled / criteria.length) * 100);
                const color  = pct < 40 ? '#E53935' : pct < 80 ? '#FB8C00' : '#43A047';
                const missing = criteria.filter(c => !c.done);
                return (
                  <View style={{ marginBottom: 20, backgroundColor: '#F7F7F8', borderRadius: 14, padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>Perfil do negócio</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color }}>{pct}% completo</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                      <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
                    </View>
                    {pct === 100 ? (
                      <Text style={{ fontSize: 12, color: '#43A047', fontWeight: '600' }}>
                        ✓ Perfil completo — máxima visibilidade garantida!
                      </Text>
                    ) : (
                      <>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#111', marginBottom: 6 }}>
                          O que falta preencher:
                        </Text>
                        {missing.map(c => (
                          <TouchableOpacity
                            key={c.label}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
                            onPress={() => setSettingsSection(c.section)}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                            <Text style={{ fontSize: 12, color: '#555', flex: 1 }}>{c.label}</Text>
                            <Icon name="arrowRight" size={12} color={COLORS.grayText} strokeWidth={2} />
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                );
              })()}

              {/* ── MENU PRINCIPAL ── */}
              {!settingsSection && (
                <>
                  {[
                    { id:'info',       icon:'briefcase', label:'Informações Básicas',      desc:`${settingsInfo.name} · ${settingsInfo.phone}` },
                    { id:'profile',    icon:'star',      label:'Destaques & Perfil',        desc:`${ownerHighlights.length} destaque${ownerHighlights.length!==1?'s':''} · ${settingsInfo.price||'··'}` },
                    { id:'hours',      icon:'clock',     label:'Horário de Funcionamento',  desc:Object.values(settingsHours).filter(h=>h.active).length + ' dias ativos' },
                    { id:'notifs',     icon:'bell',      label:'Notificações',              desc:Object.values(settingsNotifs).filter(Boolean).length + ' tipos ativos' },
                    { id:'operations', icon:'settings',  label:'Operações',                 desc:settingsOperations.temporarilyClosed ? 'Fechado temporariamente' : 'Aberto' },
                    { id:'visibility', icon:'globe',     label:'Visibilidade',              desc:settingsVisibility.isPublic ? 'Perfil público' : 'Perfil oculto' },
                    { id:'account',    icon:'user',      label:'Conta',                     desc:settingsAccount.email },
                  ].map(item => (
                    <TouchableOpacity key={item.id} style={bizS.actionCard} activeOpacity={0.8} onPress={() => setSettingsSection(item.id)}>
                      <View style={bizS.actionIcon}>
                        <Icon name={item.icon} size={22} color={COLORS.red} strokeWidth={2} />
                      </View>
                      <View style={{flex:1}}>
                        <Text style={bizS.actionTitle}>{item.label}</Text>
                        <Text style={bizS.actionDesc} numberOfLines={1}>{item.desc}</Text>
                      </View>
                      <Icon name="arrowRight" size={18} color={COLORS.grayText} strokeWidth={2} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* ── INFORMAÇÕES BÁSICAS ── */}
              {settingsSection === 'info' && (
                <>
                  {[
                    { label:'Nome do Negócio *', key:'name', placeholder:'Ex: Pizzaria Bela Vista' },
                    { label:'Telefone', key:'phone', placeholder:'Ex: +244 923 456 789', keyboard:'phone-pad' },
                    { label:'Website', key:'website', placeholder:'https://', keyboard:'url' },
                  ].map(f => (
                    <View key={f.key} style={bizS.promoFormGroup}>
                      <Text style={bizS.promoFormLabel}>{f.label}</Text>
                      <TextInput
                        style={bizS.promoFormInput}
                        value={settingsInfo[f.key]}
                        onChangeText={t => setSettingsInfo(s => ({...s, [f.key]: t}))}
                        placeholder={f.placeholder}
                        placeholderTextColor={COLORS.grayText}
                        keyboardType={f.keyboard || 'default'}
                      />
                    </View>
                  ))}

                  {/* Categoria Principal */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Categoria Principal *</Text>
                    <TouchableOpacity
                      style={[bizS.promoFormInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between'}]}
                      onPress={() => setShowOwnerCategoryPicker(true)}
                    >
                      {settingsInfo.primaryCategoryId ? (() => {
                        return <Text style={{fontSize:14, color:COLORS.darkText, fontWeight:'600'}}>{ALL_CAT_LABEL[settingsInfo.primaryCategoryId] || settingsInfo.primaryCategoryId}</Text>;
                      })() : (
                        <Text style={{fontSize:14, color:COLORS.grayText}}>Selecionar categoria...</Text>
                      )}
                      <Icon name="arrowRight" size={16} color={COLORS.grayText} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>

                  {/* Subcategorias */}
                  <View style={bizS.promoFormGroup}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <Text style={bizS.promoFormLabel}>
                        Subcategorias <Text style={{color:COLORS.grayText, fontWeight:'400'}}>(até 5)</Text>
                      </Text>
                      <Text style={{fontSize:11, color: (settingsInfo.subCategoryIds||[]).length >= 5 ? COLORS.red : COLORS.grayText, fontWeight:'600'}}>
                        {(settingsInfo.subCategoryIds||[]).length}/5
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[bizS.promoFormInput, {flexDirection:'row', alignItems:'center', justifyContent:'space-between'}]}
                      onPress={() => setShowOwnerSubCategoryPicker(true)}
                    >
                      <Text style={{fontSize:14, color: (settingsInfo.subCategoryIds||[]).length > 0 ? COLORS.darkText : COLORS.grayText}}>
                        {(settingsInfo.subCategoryIds||[]).length > 0
                          ? `${(settingsInfo.subCategoryIds||[]).length} subcategoria${(settingsInfo.subCategoryIds||[]).length !== 1 ? 's' : ''} seleccionada${(settingsInfo.subCategoryIds||[]).length !== 1 ? 's' : ''}`
                          : 'Adicionar subcategorias...'}
                      </Text>
                      <Icon name="arrowRight" size={16} color={COLORS.grayText} strokeWidth={2} />
                    </TouchableOpacity>
                    {(settingsInfo.subCategoryIds||[]).length > 0 && (
                      <View style={{flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:10}}>
                        {(settingsInfo.subCategoryIds||[]).map(id => {
                          return (
                            <View key={id} style={{flexDirection:'row', alignItems:'center', gap:4, paddingVertical:5, paddingHorizontal:10, borderRadius:20, backgroundColor:COLORS.red+'15', borderWidth:1.5, borderColor:COLORS.red+'40'}}>
                              <Icon name={ALL_CAT_ICON[id] || 'tag'} size={11} color={COLORS.red} strokeWidth={2} />
                              <Text style={{fontSize:12, color:COLORS.red, fontWeight:'700'}}>{ALL_CAT_LABEL[id] || id}</Text>
                              <TouchableOpacity
                                hitSlop={{top:6,bottom:6,left:6,right:6}}
                                onPress={() => setSettingsInfo(s => ({...s, subCategoryIds:(s.subCategoryIds||[]).filter(x=>x!==id)}))}>
                                <Text style={{fontSize:15, color:COLORS.red, lineHeight:17, marginLeft:2}}>×</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        <TouchableOpacity
                          style={{paddingVertical:5, paddingHorizontal:10, borderRadius:20, borderWidth:1.5, borderColor:COLORS.grayLine}}
                          onPress={() => setSettingsInfo(s => ({...s, subCategoryIds:[]}))}>
                          <Text style={{fontSize:11, color:COLORS.grayText}}>Limpar tudo</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Nível de Preço */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Nível de Preço</Text>
                    <View style={{flexDirection:'row', gap:10, marginTop:4}}>
                      {[
                        {val:'·',    label:'Económico'},
                        {val:'··',   label:'Moderado'},
                        {val:'···',  label:'Caro'},
                        {val:'····', label:'Luxo'},
                      ].map(({val:p, label:pl}) => (
                        <TouchableOpacity
                          key={p}
                          style={[bizS.priceChip, settingsInfo.price === p && bizS.priceChipActive]}
                          onPress={() => setSettingsInfo(s => ({...s, price: p}))}
                        >
                          <Text style={[bizS.priceChipText, settingsInfo.price === p && bizS.priceChipTextActive]}>{p}</Text>
                          <Text style={[{fontSize:10, color: settingsInfo.price === p ? COLORS.red : COLORS.grayText, marginTop:2}]}>{pl}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Descrição */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Descrição</Text>
                    <TextInput
                      style={[bizS.promoFormInput, {minHeight:80}]}
                      value={settingsInfo.description}
                      onChangeText={t => setSettingsInfo(s => ({...s, description: t}))}
                      placeholder="Descreva o seu negócio para os clientes"
                      placeholderTextColor={COLORS.grayText}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Morada */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Morada</Text>
                    <TextInput
                      style={bizS.promoFormInput}
                      value={settingsInfo.address}
                      onChangeText={t => setSettingsInfo(s => ({...s, address: t}))}
                      placeholder="Ex: Rua Comandante Valodia, 123, Talatona"
                      placeholderTextColor={COLORS.grayText}
                    />
                    <TouchableOpacity
                      style={bizS.settingsLocationBtn}
                      activeOpacity={0.8}
                      onPress={captarLocalizacao}
                      disabled={locationLoading}
                    >
                      <Icon name="location" size={16} color={COLORS.white} strokeWidth={2} />
                      <Text style={bizS.settingsLocationBtnText}>
                        {locationLoading ? 'A captar...' : 'Usar localização atual'}
                      </Text>
                    </TouchableOpacity>
                    {settingsInfo.latitude && (
                      <Text style={{fontSize:11, color:COLORS.grayText, marginTop:4}}>
                        📍 {settingsInfo.latitude.toFixed(5)}, {settingsInfo.longitude.toFixed(5)}
                      </Text>
                    )}
                  </View>

                  {/* Bairro */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Bairro / Cidade</Text>
                    <TextInput
                      style={bizS.promoFormInput}
                      value={settingsInfo.neighborhood}
                      onChangeText={t => setSettingsInfo(s => ({...s, neighborhood: t}))}
                      placeholder="Ex: Talatona, Luanda"
                      placeholderTextColor={COLORS.grayText}
                    />
                  </View>

                  {/* Tipo de Negócio */}
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Tipo de Negócio</Text>
                    <View style={bizS.typeGrid}>
                      {Object.entries(BUSINESS_TYPE_BADGES).map(([key, val]) => (
                        <TouchableOpacity
                          key={key}
                          style={[bizS.typeChip, settingsInfo.businessType === key && bizS.typeChipActive]}
                          onPress={() => setSettingsInfo(s => ({...s, businessType: key}))}
                        >
                          <Text style={[bizS.typeChipLabel, settingsInfo.businessType === key && bizS.typeChipLabelActive]}>{val.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {settingsInfo.businessType === 'other' && (
                      <TextInput
                        style={[bizS.promoFormInput, {marginTop:8}]}
                        value={settingsInfo.businessTypeCustom}
                        onChangeText={t => setSettingsInfo(s => ({...s, businessTypeCustom: t}))}
                        placeholder="Descreva o tipo de negócio"
                        placeholderTextColor={COLORS.grayText}
                      />
                    )}
                  </View>
                </>
              )}

              {/* ── DESTAQUES & PERFIL ── */}
              {settingsSection === 'profile' && (
                <>
                  <Text style={bizS.promoFormLabel}>Frases de Destaque</Text>
                  <Text style={{fontSize:12, color:COLORS.grayText, marginBottom:12}}>Frases curtas e impactantes que aparecem no teu perfil público (máx. 5)</Text>
                  {ownerHighlights.map((h, i) => (
                    <View key={i} style={bizS.highlightRow}>
                      <TextInput
                        style={[bizS.promoFormInput, {flex:1}]}
                        value={h.replace(/"/g,'')}
                        onChangeText={t => {
                          const updated = [...ownerHighlights];
                          updated[i] = `"${t}"`;
                          setOwnerHighlights(updated);
                        }}
                        placeholder={`Destaque ${i+1} — ex: "Vista para o mar"`}
                        placeholderTextColor={COLORS.grayText}
                        maxLength={40}
                      />
                      <TouchableOpacity
                        style={bizS.highlightRemoveBtn}
                        onPress={() => setOwnerHighlights(ownerHighlights.filter((_,idx)=>idx!==i))}
                      >
                        <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {ownerHighlights.length < 5 && (
                    <TouchableOpacity
                      style={bizS.highlightAddBtn}
                      onPress={() => setOwnerHighlights([...ownerHighlights, '""'])}
                    >
                      <Icon name="plus" size={16} color={COLORS.red} strokeWidth={2.5} />
                      <Text style={bizS.highlightAddText}>Adicionar destaque</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* ── HORÁRIO ── */}
              {settingsSection === 'hours' && (
                <>
                  {Object.entries(settingsHours).map(([day, val]) => (
                    <View key={day} style={bizS.hoursRow}>
                      <TouchableOpacity
                        style={[bizS.hoursToggle, val.active && bizS.hoursToggleActive]}
                        onPress={() => setSettingsHours(h => ({...h, [day]: {...h[day], active: !h[day].active}}))}
                      >
                        <View style={[bizS.hoursToggleKnob, val.active && bizS.hoursToggleKnobActive]} />
                      </TouchableOpacity>
                      <Text style={[bizS.hoursDay, !val.active && {color:COLORS.grayText}]}>
                        {day.charAt(0).toUpperCase()+day.slice(1)}
                      </Text>
                      {val.active ? (
                        <View style={bizS.hoursInputsRow}>
                          <TextInput
                            style={bizS.hoursInput}
                            value={val.open}
                            onChangeText={t => setSettingsHours(h => ({...h, [day]: {...h[day], open: t}}))}
                            placeholder="00:00"
                            placeholderTextColor={COLORS.grayText}
                          />
                          <Text style={{color:COLORS.grayText, fontSize:13}}>–</Text>
                          <TextInput
                            style={bizS.hoursInput}
                            value={val.close}
                            onChangeText={t => setSettingsHours(h => ({...h, [day]: {...h[day], close: t}}))}
                            placeholder="00:00"
                            placeholderTextColor={COLORS.grayText}
                          />
                        </View>
                      ) : (
                        <Text style={bizS.hoursClosed}>Fechado</Text>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* ── NOTIFICAÇÕES ── */}
              {settingsSection === 'notifs' && (
                <>
                  {[
                    { key:'reservations', label:'Reservas',   desc:'Novas reservas e cancelamentos' },
                    { key:'reviews',      label:'Avaliações', desc:'Novas avaliações de clientes' },
                    { key:'checkins',     label:'Check-ins',  desc:'Quando clientes fazem check-in' },
                    { key:'promotions',   label:'Promoções',  desc:'Uso de códigos e promoções' },
                    { key:'messages',     label:'Mensagens',  desc:'Mensagens diretas de clientes' },
                    { key:'milestones',   label:'Conquistas', desc:'Metas e marcos do negócio' },
                  ].map(n => (
                    <View key={n.key} style={bizS.settingsToggleRow}>
                      <View style={{flex:1}}>
                        <Text style={bizS.settingsToggleLabel}>{n.label}</Text>
                        <Text style={bizS.settingsToggleDesc}>{n.desc}</Text>
                      </View>
                      <TouchableOpacity
                        style={[bizS.promoToggle, settingsNotifs[n.key] && bizS.promoToggleActive]}
                        onPress={() => setSettingsNotifs(s => ({...s, [n.key]: !s[n.key]}))}
                      >
                        <View style={[bizS.promoToggleKnob, settingsNotifs[n.key] && bizS.promoToggleKnobActive]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* ── OPERAÇÕES ── */}
              {settingsSection === 'operations' && (
                <>
                  <View style={bizS.settingsToggleRow}>
                    <View style={{flex:1}}>
                      <Text style={bizS.settingsToggleLabel}>Negócio Aberto</Text>
                      <Text style={bizS.settingsToggleDesc}>Visível como aberto para clientes</Text>
                    </View>
                    <TouchableOpacity
                      style={[bizS.promoToggle, settingsOperations.isOpen && bizS.promoToggleActive]}
                      onPress={() => setBusinessOpen(!settingsOperations.isOpen)}
                    >
                      <View style={[bizS.promoToggleKnob, settingsOperations.isOpen && bizS.promoToggleKnobActive]} />
                    </TouchableOpacity>
                  </View>

                  <View style={bizS.settingsToggleRow}>
                    <View style={{flex:1}}>
                      <Text style={bizS.settingsToggleLabel}>Fechado Temporariamente</Text>
                      <Text style={bizS.settingsToggleDesc}>Suspende temporariamente o perfil</Text>
                    </View>
                    <TouchableOpacity
                      style={[bizS.promoToggle, settingsOperations.temporarilyClosed && bizS.promoToggleActive]}
                      onPress={() => {
                        const newVal = !settingsOperations.temporarilyClosed;
                        setSettingsOperations(s => ({...s, temporarilyClosed: newVal}));
                        setBusinessOpen(!newVal);
                      }}
                    >
                      <View style={[bizS.promoToggleKnob, settingsOperations.temporarilyClosed && bizS.promoToggleKnobActive]} />
                    </TouchableOpacity>
                  </View>

                  {settingsOperations.temporarilyClosed && (
                    <View style={bizS.promoFormGroup}>
                      <Text style={bizS.promoFormLabel}>Mensagem aos Clientes</Text>
                      <TextInput
                        style={[bizS.promoFormInput, {minHeight:60}]}
                        value={settingsOperations.closedMessage}
                        onChangeText={t => setSettingsOperations(s => ({...s, closedMessage: t}))}
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor={COLORS.grayText}
                      />
                    </View>
                  )}

                  <Text style={[bizS.sectionTitle, {marginTop:20, marginBottom:12}]}>Métodos de Pagamento</Text>
                  {['Multicaixa Express','TPA','Dinheiro','Cartão de Crédito','Transferência Bancária'].map(method => {
                    const active = settingsOperations.payment.includes(method);
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[bizS.settingsToggleRow, {paddingVertical:10}]}
                        onPress={() => setSettingsOperations(s => ({
                          ...s,
                          payment: active
                            ? s.payment.filter(p => p !== method)
                            : [...s.payment, method]
                        }))}
                      >
                        <Text style={bizS.settingsToggleLabel}>{method}</Text>
                        <View style={[bizS.settingsCheckbox, active && bizS.settingsCheckboxActive]}>
                          {active && <Text style={{color:COLORS.white, fontSize:12, fontWeight:'800'}}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* ── VISIBILIDADE ── */}
              {settingsSection === 'visibility' && (
                <>
                  {[
                    { key:'isPublic',    label:'Perfil Público',   desc:'O seu negócio aparece nas pesquisas' },
                    { key:'showAddress', label:'Mostrar Morada',   desc:'Morada visível no perfil público' },
                    { key:'showPhone',   label:'Mostrar Telefone', desc:'Telefone visível no perfil público' },
                  ].map(v => (
                    <View key={v.key} style={bizS.settingsToggleRow}>
                      <View style={{flex:1}}>
                        <Text style={bizS.settingsToggleLabel}>{v.label}</Text>
                        <Text style={bizS.settingsToggleDesc}>{v.desc}</Text>
                      </View>
                      <TouchableOpacity
                        style={[bizS.promoToggle, settingsVisibility[v.key] && bizS.promoToggleActive]}
                        onPress={() => {
                          const newVal = !settingsVisibility[v.key];
                          setSettingsVisibility(s => ({...s, [v.key]: newVal}));
                          updateOwnerBiz({[v.key]: newVal});
                        }}
                      >
                        <View style={[bizS.promoToggleKnob, settingsVisibility[v.key] && bizS.promoToggleKnobActive]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* ── CONTA ── */}
              {settingsSection === 'account' && (
                <>
                  <View style={bizS.promoFormGroup}>
                    <Text style={bizS.promoFormLabel}>Email</Text>
                    <TextInput
                      style={bizS.promoFormInput}
                      value={settingsAccount.email}
                      onChangeText={t => setSettingsAccount(s => ({...s, email: t}))}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={COLORS.grayText}
                    />
                  </View>

                  <Text style={[bizS.sectionTitle, {marginTop:20, marginBottom:12}]}>Idioma</Text>
                  {[{id:'pt',label:'Português'},{id:'en',label:'English'}].map(lang => (
                    <TouchableOpacity
                      key={lang.id}
                      style={[bizS.settingsToggleRow, {paddingVertical:12}]}
                      onPress={() => setSettingsAccount(s => ({...s, language: lang.id}))}
                    >
                      <Text style={bizS.settingsToggleLabel}>{lang.label}</Text>
                      <View style={[bizS.settingsCheckbox, settingsAccount.language === lang.id && bizS.settingsCheckboxActive]}>
                        {settingsAccount.language === lang.id && <Text style={{color:COLORS.white, fontSize:12, fontWeight:'800'}}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[bizS.promoActionBtnGhost, {marginTop:32, alignSelf:'stretch'}]}
                    activeOpacity={0.7}
                    onPress={() => Alert.alert('Alterar Password', 'Um email de redefinição será enviado para ' + settingsAccount.email, [{text:'Cancelar',style:'cancel'},{text:'Enviar',style:'default'}])}
                  >
                    <Text style={bizS.promoActionBtnGhostText}>Alterar Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[bizS.promoActionBtnPrimary, {marginTop:12, alignSelf:'stretch', backgroundColor:'#E53935'}]}
                    activeOpacity={0.7}
                    onPress={() => Alert.alert('Sair do Modo Dono', 'Tem a certeza?', [{text:'Cancelar',style:'cancel'},{text:'Sair',style:'destructive', onPress:()=>{ setShowSettings(false); onExitOwnerMode(); }}])}
                  >
                    <Text style={bizS.promoActionBtnPrimaryText}>Sair da Conta</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={{height:40}} />
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── CATEGORY PICKER MODAL ───────────────────────────────────────────── */}
      <Modal visible={showOwnerCategoryPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowOwnerCategoryPicker(false)}>
        <SafeAreaView style={{flex:1, backgroundColor:COLORS.white}}>
          <View style={[profS.overlayHeader, {paddingTop: Platform.OS === 'android' ? insets.top + 12 : 16}]}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowOwnerCategoryPicker(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.overlayTitle}>Categoria Principal</Text>
            <View style={{width:32}} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_CATEGORIES.map((section, si) => (
              <View key={si} style={{marginBottom:8}}>
                <Text style={{fontSize:11, fontWeight:'700', color:COLORS.grayText, letterSpacing:0.8, paddingHorizontal:16, paddingVertical:8, backgroundColor:COLORS.grayBg}}>
                  {section.section.toUpperCase()}
                </Text>
                {section.items.map(item => {
                  const isSelected = settingsInfo.primaryCategoryId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={{flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:COLORS.grayLine, backgroundColor: isSelected ? COLORS.red+'08' : COLORS.white}}
                      onPress={() => {
                        setSettingsInfo(s => ({...s, primaryCategoryId: item.id}));
                        setShowOwnerCategoryPicker(false);
                      }}
                    >
                      <View style={{width:36, height:36, borderRadius:10, backgroundColor: isSelected ? COLORS.red+'20' : COLORS.grayBg, alignItems:'center', justifyContent:'center', marginRight:12}}>
                        <Icon name={item.icon} size={18} color={isSelected ? COLORS.red : COLORS.darkText} strokeWidth={1.5} />
                      </View>
                      <Text style={{flex:1, fontSize:14, color: isSelected ? COLORS.red : COLORS.darkText, fontWeight: isSelected ? '700' : '400'}}>{item.label}</Text>
                      {isSelected && <Icon name="check" size={18} color={COLORS.red} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{height:30}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── SUBCATEGORY PICKER MODAL (multi-select até 5) ───────────────────── */}
      <Modal visible={showOwnerSubCategoryPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowOwnerSubCategoryPicker(false)}>
        <SafeAreaView style={{flex:1, backgroundColor:COLORS.white}}>
          <View style={[profS.overlayHeader, {paddingTop: Platform.OS === 'android' ? insets.top + 12 : 16}]}>
            <TouchableOpacity style={profS.backBtn} onPress={() => setShowOwnerSubCategoryPicker(false)}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={profS.overlayTitle}>Subcategorias</Text>
            <TouchableOpacity onPress={() => setShowOwnerSubCategoryPicker(false)} style={{paddingHorizontal:4}}>
              <View style={{backgroundColor: (settingsInfo.subCategoryIds||[]).length > 0 ? COLORS.red : COLORS.grayBg, borderRadius:16, paddingHorizontal:12, paddingVertical:5}}>
                <Text style={{fontSize:12, fontWeight:'700', color: (settingsInfo.subCategoryIds||[]).length > 0 ? COLORS.white : COLORS.grayText}}>
                  {(settingsInfo.subCategoryIds||[]).length}/5 OK
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {(settingsInfo.subCategoryIds||[]).length >= 5 && (
            <View style={{marginHorizontal:16, marginBottom:4, padding:10, backgroundColor:'#FEF9C3', borderRadius:10, flexDirection:'row', alignItems:'center', gap:8}}>
              <Text style={{fontSize:13}}>⚠️</Text>
              <Text style={{fontSize:12, color:'#92400E', fontWeight:'600'}}>Máximo atingido. Remove uma para adicionar outra.</Text>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_CATEGORIES.map((section, si) => (
              <View key={si} style={{marginBottom:4}}>
                <Text style={{fontSize:11, fontWeight:'700', color:COLORS.grayText, letterSpacing:0.8, paddingHorizontal:16, paddingVertical:8, backgroundColor:COLORS.grayBg}}>
                  {section.section.toUpperCase()}
                </Text>
                {section.items.map(item => {
                  const isSelected = (settingsInfo.subCategoryIds||[]).includes(item.id);
                  const isPrimary  = settingsInfo.primaryCategoryId === item.id;
                  const isDisabled = !isSelected && (settingsInfo.subCategoryIds||[]).length >= 5;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      disabled={isDisabled}
                      style={{flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:COLORS.grayLine,
                        backgroundColor: isSelected ? COLORS.red+'08' : COLORS.white,
                        opacity: isDisabled ? 0.4 : 1}}
                      onPress={() => {
                        const cur = settingsInfo.subCategoryIds || [];
                        if (isSelected) {
                          setSettingsInfo(s => ({...s, subCategoryIds: cur.filter(x => x !== item.id)}));
                        } else {
                          setSettingsInfo(s => ({...s, subCategoryIds: [...cur, item.id]}));
                        }
                      }}
                    >
                      <View style={{width:36, height:36, borderRadius:10, backgroundColor: isSelected ? COLORS.red+'20' : COLORS.grayBg, alignItems:'center', justifyContent:'center', marginRight:12}}>
                        <Icon name={item.icon} size={18} color={isSelected ? COLORS.red : COLORS.darkText} strokeWidth={1.5} />
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14, color: isSelected ? COLORS.red : COLORS.darkText, fontWeight: isSelected ? '700' : '400'}}>{item.label}</Text>
                        {isPrimary && (
                          <Text style={{fontSize:10, color:COLORS.blue, fontWeight:'600', marginTop:1}}>Categoria principal</Text>
                        )}
                      </View>
                      <View style={{width:22, height:22, borderRadius:6, borderWidth:2,
                        borderColor: isSelected ? COLORS.red : COLORS.grayLine,
                        backgroundColor: isSelected ? COLORS.red : 'transparent',
                        alignItems:'center', justifyContent:'center'}}>
                        {isSelected && <Text style={{color:COLORS.white, fontSize:13, lineHeight:15, fontWeight:'800'}}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{height:30}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── CLAIM FLOW — Onboarding do Dono ────────────────────────────── */}
      <ClaimFlow
        visible={showClaimFlow}
        onClose={() => setShowClaimFlow(false)}
        onCreateNew={() => Alert.alert(
          'Criar negócio',
          'A funcionalidade de criação manual de negócio está disponível no painel principal. Sai do perfil e usa o botão "+" no dashboard.',
        )}
        accessToken={accessToken}
      />


    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────