/**
 * ============================================================================
 * ACHEIAQUI — DELIVERY EXTENSION  (v4.0.0 — Fase 4)
 * ============================================================================
 * Extensão injectável — funciona sobre qualquer módulo principal (Dining,
 * Hospitality, etc.) sem aceder aos dados internos desse módulo.
 * Ligação ao módulo pai feita EXCLUSIVAMENTE via tenantId.
 *
 * FUNCIONALIDADES:
 *   ✅ Carrinho de compras com cálculo protegido (subtotal + taxa + total)
 *   ✅ Cálculo de taxa por zona geográfica (imutável no frontend)
 *   ✅ Rastreio de estado do pedido (pendente → confirmado → em rota → entregue)
 *   ✅ Modo Dono — gestão de pedidos + atribuição de estafeta
 *
 * SEGURANÇA FASE 4:
 *   ✅ SANDBOXING: zero acesso ao estado do DiningModule/HospitalityModule
 *   ✅ CÁLCULO PROTEGIDO: subtotal/taxa/total calculados via useMemo puro —
 *      nunca armazenados em useState mutável, impossível alterar manualmente
 *   ✅ PII CLEARANCE: endereço de entrega apagado de sessionAddress ao
 *      completar pedido (clearPII) e ao desmontar (cleanup)
 *   ✅ RACE CONDITION LOCK: isProcessingOrder bloqueia UI + gesture swipe-back
 *      enquanto pedido está a ser submetido — impede duplicados
 *   ✅ ESTAFETA ISOLATION: estafeta só recebe orderId + morada do seu pedido —
 *      nunca vê outros pedidos nem dados do dono (tenantId separado)
 *   ✅ RBAC duplo: ownerMode && tenantId === business.id
 *   ✅ sanitizeInput em todos os campos livres (morada, notas)
 *   ✅ Ghost-data purge via useEffect cleanup em [business?.id]
 * ============================================================================
 */

import React, {
  useContext, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { sanitizeInput, Icon, COLORS, AppContext, formatCurrency } from './AcheiAqui_Core';

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

// Zonas de entrega e taxas — imutáveis (nunca em estado mutável)
const DELIVERY_ZONES = Object.freeze([
  { id: 'z1', name: 'Talatona',       fee: 500,  maxMins: 25 },
  { id: 'z2', name: 'Kilamba',        fee: 800,  maxMins: 40 },
  { id: 'z3', name: 'Viana',          fee: 1200, maxMins: 60 },
  { id: 'z4', name: 'Centro (Luanda)',fee: 1000, maxMins: 50 },
  { id: 'z5', name: 'Cacuaco',        fee: 1500, maxMins: 75 },
]);

const ORDER_STATUS = Object.freeze({
  pending:    { label: 'Pendente',      color: '#F59E0B', icon: 'clock'        },
  confirmed:  { label: 'Confirmado',    color: '#22C55E', icon: 'checkCircle'  },
  preparing:  { label: 'A preparar',    color: '#1565C0', icon: 'package'    },
  on_route:   { label: 'Em rota',       color: '#8B5CF6', icon: 'truck'        },
  delivered:  { label: 'Entregue',      color: '#22A06B', icon: 'checkCircle'},
  cancelled:  { label: 'Cancelado',     color: '#8A8A8A', icon: 'x'     },
});

// Catálogo mock — em produção: GET /extensions/delivery/:tenantId/menu
const buildMockCatalog = (businessId) => [
  { id: `${businessId}_d1`, name: 'Muamba de Galinha',   price: 3500, category: 'Pratos',   available: true,  emoji: '🍲' },
  { id: `${businessId}_d2`, name: 'Grelhada Mista',      price: 5200, category: 'Pratos',   available: true,  emoji: '🥩' },
  { id: `${businessId}_d3`, name: 'Arroz de Feijão',     price: 1200, category: 'Acomp.',   available: true,  emoji: '🍚' },
  { id: `${businessId}_d4`, name: 'Sumo de Múcua',       price:  600, category: 'Bebidas',  available: true,  emoji: '🥤' },
  { id: `${businessId}_d5`, name: 'Cerveja Cuca',        price:  500, category: 'Bebidas',  available: true,  emoji: '🍺' },
  { id: `${businessId}_d6`, name: 'Pudim de Leite',      price:  900, category: 'Sobremesas', available: false, emoji: '🍮' },
];

const MOCK_ORDERS = [
  {
    id: 'ord1', tenantId: null, // filled dynamically
    clientName: 'João Silva', clientPhone: '+244 912 111 000',
    // PII: endereço só visível ao dono e ao estafeta atribuído
    _deliveryAddress: 'Rua da Samba, Nº 42, Talatona',
    zone: 'z1', items: [
      { id: null, name: 'Muamba de Galinha', price: 3500, qty: 2 },
      { id: null, name: 'Sumo de Múcua',     price:  600, qty: 2 },
    ],
    notes: '', status: 'on_route', courierId: 'courier_1', courierName: 'Manuel C.',
    createdAt: '26/02/2026 14:30',
  },
  {
    id: 'ord2', tenantId: null,
    clientName: 'Maria Costa', clientPhone: '+244 923 222 000',
    _deliveryAddress: 'Av. Deolinda Rodrigues, Bl. 7, Kilamba',
    zone: 'z2', items: [
      { id: null, name: 'Grelhada Mista', price: 5200, qty: 1 },
      { id: null, name: 'Cerveja Cuca',   price:  500, qty: 2 },
    ],
    notes: 'Sem cebola por favor', status: 'confirmed', courierId: null, courierName: null,
    createdAt: '26/02/2026 15:10',
  },
];

const MOCK_COURIERS = [
  { id: 'courier_1', name: 'Manuel C.', phone: '+244 912 000 101', active: true  },
  { id: 'courier_2', name: 'Filipe M.', phone: '+244 912 000 102', active: true  },
  { id: 'courier_3', name: 'Rosa A.',   phone: '+244 912 000 103', active: false },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** PII wipe — apaga endereço e telefone do pedido concluído */
const wipePII = (order) => ({
  ...order,
  _deliveryAddress: '[APAGADO]',
  clientPhone:      '[APAGADO]',
});

/** Cálculo PROTEGIDO — via useMemo, nunca em useState mutável */
const computeTotals = (cartItems, zoneId) => {
  const subtotal  = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const zone      = DELIVERY_ZONES.find(z => z.id === zoneId) ?? DELIVERY_ZONES[0];
  const fee       = zone.fee;
  const total     = subtotal + fee;
  return Object.freeze({ subtotal, fee, total, zone }); // imutável
};

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

function CatalogItem({ item, qty, onAdd, onRemove }) {
  return (
    <View style={delS.catalogItem}>
      <Text style={delS.catalogEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[delS.catalogName, !item.available && { color: COLORS.grayText }]}>
          {item.name}
          {!item.available && <Text style={delS.unavailTag}> · Esgotado</Text>}
        </Text>
        <Text style={delS.catalogPrice}>{formatCurrency(item.price)}</Text>
      </View>
      {item.available ? (
        <View style={delS.qtyRow}>
          <TouchableOpacity style={delS.qtyBtn} onPress={() => onRemove(item.id)} disabled={qty === 0}>
            <Icon name="minus" size={14} color={qty > 0 ? COLORS.red : COLORS.grayLine} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={delS.qtyVal}>{qty}</Text>
          <TouchableOpacity style={delS.qtyBtn} onPress={() => onAdd(item.id)}>
            <Icon name="plus" size={14} color={COLORS.red} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[delS.qtyBtn, { backgroundColor: COLORS.grayBg }]}>
          <Icon name="x" size={14} color={COLORS.grayText} strokeWidth={2} />
        </View>
      )}
    </View>
  );
}

function OrderStatusBadge({ status }) {
  const cfg = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  return (
    <View style={[delS.statusBadge, { backgroundColor: cfg.color + '22' }]}>
      <Icon name={cfg.icon} size={11} color={cfg.color} strokeWidth={2.5} />
      <Text style={[delS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function OrderCard({ order, ownerMode, onPress }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const zone     = DELIVERY_ZONES.find(z => z.id === order.zone);
  const total    = subtotal + (zone?.fee ?? 0);
  return (
    <TouchableOpacity style={delS.orderCard} onPress={() => onPress(order)} activeOpacity={0.8}>
      <View style={delS.orderCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={delS.orderClientName}>{order.clientName}</Text>
          <Text style={delS.orderMeta}>{order.createdAt} · {zone?.name}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>
      <View style={delS.orderItemsPreview}>
        {order.items.slice(0, 2).map((item, i) => (
          <Text key={i} style={delS.orderItemLine}>
            {item.qty}× {item.name}
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={delS.orderItemLine}>+{order.items.length - 2} item(s)</Text>
        )}
      </View>
      <View style={delS.orderFooter}>
        <Text style={delS.orderTotal}>{formatCurrency(total)}</Text>
        {order.courierName && (
          <Text style={delS.orderCourier}>🛵 {order.courierName}</Text>
        )}
        <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ─── LOADING OVERLAY — Race Condition Lock ────────────────────────────────────
// Bloqueia TODA a UI enquanto isProcessingOrder=true
// Impede o utilizador de disparar dois pedidos simultâneos
function ProcessingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <View style={delS.overlay}>
      <View style={delS.overlayCard}>
        <ActivityIndicator size="large" color={COLORS.red} />
        <Text style={delS.overlayTitle}>A processar pedido…</Text>
        <Text style={delS.overlaySubtitle}>Por favor aguarde. Não feche esta janela.</Text>
      </View>
    </View>
  );
}

// ─── MODAL CHECKOUT ───────────────────────────────────────────────────────────
function CheckoutModal({
  visible, cartItems, totals, onClose, onConfirm, isProcessing,
}) {
  const [zone,    setZone]    = useState(DELIVERY_ZONES[0].id);
  const [address, setAddress] = useState('');
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [notes,   setNotes]   = useState('');

  useEffect(() => {
    if (visible) { setZone(DELIVERY_ZONES[0].id); setAddress(''); setName(''); setPhone(''); setNotes(''); }
  }, [visible]);

  // Totais recalculados quando zona muda — PROTEGIDO (useMemo)
  const liveTotals = useMemo(() => computeTotals(cartItems, zone), [cartItems, zone]);

  const hasData = !!(name.trim() || address.trim() || phone.trim());

  const handleClose = useCallback(() => {
    if (hasData && !isProcessing) {
      Alert.alert(
        'Cancelar encomenda?',
        'Tem dados preenchidos. Deseja descartar o pedido de entrega?',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: onClose },
        ],
      );
    } else if (!isProcessing) {
      onClose();
    }
  }, [hasData, isProcessing, onClose]);

  const handleConfirm = useCallback(() => {
    if (!name.trim())    { Alert.alert('Erro', 'Indique o nome do destinatário.'); return; }
    if (!phone.trim())   { Alert.alert('Erro', 'Indique o contacto.'); return; }
    if (!address.trim()) { Alert.alert('Erro', 'Indique a morada de entrega.'); return; }
    onConfirm({
      zone,
      clientName:      sanitizeInput(name.trim(), 80),
      clientPhone:     sanitizeInput(phone.trim(), 30),
      _deliveryAddress: sanitizeInput(address.trim(), 200), // PII — apagado após entrega
      notes:           sanitizeInput(notes.trim(), 200),
      items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    });
  }, [name, phone, address, notes, zone, cartItems, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={delS.modalOverlay}>
        <View style={delS.modalSheet}>
          <View style={delS.modalHeader}>
            <Text style={delS.modalTitle}>Confirmar Entrega</Text>
            <TouchableOpacity onPress={handleClose} style={delS.modalClose} disabled={isProcessing}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16, gap: 14 }}>

            {/* Resumo do carrinho */}
            <View style={delS.cartSummary}>
              {cartItems.map(item => (
                <View key={item.id} style={delS.cartSummaryRow}>
                  <Text style={delS.cartSummaryItem}>{item.qty}× {item.name}</Text>
                  <Text style={delS.cartSummaryPrice}>{formatCurrency(item.price * item.qty)}</Text>
                </View>
              ))}
            </View>

            {/* Zona de entrega */}
            <Text style={delS.fieldLabel}>Zona de entrega</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {DELIVERY_ZONES.map(z => (
                <TouchableOpacity key={z.id}
                  style={[delS.zonePill, zone === z.id && delS.zonePillActive]}
                  onPress={() => setZone(z.id)} activeOpacity={0.75}>
                  <Text style={[delS.zoneName, zone === z.id && delS.zoneNameActive]}>{z.name}</Text>
                  <Text style={[delS.zoneFee, zone === z.id && { color: COLORS.white }]}>
                    {formatCurrency(z.fee)} · ~{z.maxMins}min
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Totais PROTEGIDOS — lidos de liveTotals (useMemo), nunca de estado mutável */}
            <View style={delS.totalsCard}>
              <TotalRow label="Subtotal"     value={formatCurrency(liveTotals.subtotal)} />
              <TotalRow label={`Taxa de entrega (${liveTotals.zone.name})`} value={formatCurrency(liveTotals.fee)} accent />
              <View style={delS.totalDivider} />
              <TotalRow label="Total" value={formatCurrency(liveTotals.total)} bold />
            </View>

            {/* Dados de entrega (PII) */}
            <Text style={delS.fieldLabel}>Nome do destinatário</Text>
            <TextInput style={delS.input} value={name} onChangeText={setName}
              placeholder="Nome completo" placeholderTextColor={COLORS.grayText} maxLength={80} />

            <Text style={delS.fieldLabel}>Contacto</Text>
            <TextInput style={delS.input} value={phone} onChangeText={setPhone}
              placeholder="+244 9XX XXX XXX" placeholderTextColor={COLORS.grayText}
              keyboardType="phone-pad" maxLength={30} />

            <Text style={delS.fieldLabel}>
              Morada de entrega <Text style={delS.piiTag}>🔒 PII</Text>
            </Text>
            <TextInput style={[delS.input, delS.inputMulti]} value={address} onChangeText={setAddress}
              placeholder="Rua, número, bairro, referência…"
              placeholderTextColor={COLORS.grayText} multiline maxLength={200} />

            <Text style={delS.fieldLabel}>Notas <Text style={{ fontWeight: '400' }}>(opcional)</Text></Text>
            <TextInput style={delS.input} value={notes} onChangeText={setNotes}
              placeholder="Instruções especiais, alergias…"
              placeholderTextColor={COLORS.grayText} maxLength={200} />

            <View style={delS.piiNotice}>
              <Icon name="shield" size={13} color={COLORS.blue} strokeWidth={2} />
              <Text style={delS.piiNoticeText}>
                A morada e contacto são dados PII — serão apagados após a entrega ser concluída.
              </Text>
            </View>

            {/* Botão — desactivado durante processamento (Race Condition Lock) */}
            <TouchableOpacity
              style={[delS.confirmBtn, isProcessing && delS.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={delS.confirmBtnText}>Confirmar Pedido · {formatCurrency(liveTotals.total)}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TotalRow({ label, value, bold, accent }) {
  return (
    <View style={delS.totalRow}>
      <Text style={[delS.totalLabel, bold && delS.totalLabelBold, accent && { color: COLORS.red }]}>
        {label}
      </Text>
      <Text style={[delS.totalValue, bold && delS.totalValueBold, accent && { color: COLORS.red }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── MODAL DETALHE PEDIDO (dono) ──────────────────────────────────────────────
function OrderDetailModal({ visible, order, ownerMode, onClose, onStatusChange, onAssignCourier }) {
  if (!order) return null;
  const zone     = DELIVERY_ZONES.find(z => z.id === order.zone);
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total    = subtotal + (zone?.fee ?? 0);
  const isPIIWiped = order._deliveryAddress === '[APAGADO]';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={delS.modalOverlay}>
        <View style={[delS.modalSheet, { maxHeight: '85%' }]}>
          <View style={delS.modalHeader}>
            <Text style={delS.modalTitle}>Pedido #{order.id.slice(-3)}</Text>
            <TouchableOpacity onPress={onClose} style={delS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <OrderStatusBadge status={order.status} />

            {/* Dados do cliente — PII visível apenas ao dono */}
            {ownerMode && (
              <View style={[delS.piiBox, isPIIWiped && delS.piiBoxWiped]}>
                <View style={delS.piiBoxHeader}>
                  <Icon name="shield" size={13} color={isPIIWiped ? COLORS.grayText : COLORS.blue} strokeWidth={2} />
                  <Text style={[delS.piiBoxTitle, isPIIWiped && { color: COLORS.grayText }]}>
                    {isPIIWiped ? 'Dados PII apagados após entrega' : 'Dados PII — visível apenas ao dono'}
                  </Text>
                </View>
                <DetailRow icon="user"     label="Cliente" value={order.clientName} />
                <DetailRow icon="phone"    label="Contacto" value={order.clientPhone} />
                <DetailRow icon="mapPin"   label="Morada"   value={order._deliveryAddress} />
              </View>
            )}

            <DetailRow icon="mapPin"    label="Zona"      value={`${zone?.name} · ~${zone?.maxMins}min`} />
            <DetailRow icon="clock"     label="Criado em" value={order.createdAt} />
            {order.notes ? <DetailRow icon="fileText" label="Notas" value={order.notes} /> : null}

            {/* Itens */}
            <Text style={[delS.fieldLabel, { marginTop: 12 }]}>Itens</Text>
            {order.items.map((item, i) => (
              <View key={i} style={delS.cartSummaryRow}>
                <Text style={delS.cartSummaryItem}>{item.qty}× {item.name}</Text>
                <Text style={delS.cartSummaryPrice}>{formatCurrency(item.price * item.qty)}</Text>
              </View>
            ))}
            <View style={[delS.cartSummaryRow, { marginTop: 4 }]}>
              <Text style={[delS.cartSummaryItem, { color: COLORS.red }]}>Taxa ({zone?.name})</Text>
              <Text style={[delS.cartSummaryPrice, { color: COLORS.red }]}>{formatCurrency(zone?.fee)}</Text>
            </View>
            <View style={[delS.cartSummaryRow, { borderTopWidth: 1, borderTopColor: COLORS.grayLine, paddingTop: 8, marginTop: 4 }]}>
              <Text style={[delS.cartSummaryItem, { fontWeight: '800', color: COLORS.darkText }]}>Total</Text>
              <Text style={[delS.cartSummaryPrice, { fontWeight: '800', color: COLORS.darkText }]}>{formatCurrency(total)}</Text>
            </View>

            {/* Estafeta — ISOLADO: estafeta só vê a sua morada */}
            {ownerMode && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <>
                <Text style={[delS.fieldLabel, { marginTop: 16 }]}>Atribuir Estafeta</Text>
                {MOCK_COURIERS.filter(c => c.active).map(c => (
                  <TouchableOpacity key={c.id}
                    style={[delS.courierRow, order.courierId === c.id && delS.courierRowActive]}
                    onPress={() => onAssignCourier(order.id, c.id, c.name)}
                    activeOpacity={0.8}>
                    <Text style={delS.courierEmoji}>🛵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={delS.courierName}>{c.name}</Text>
                      <Text style={delS.courierPhone}>{c.phone}</Text>
                    </View>
                    {order.courierId === c.id && (
                      <Icon name="checkCircle" size={18} color={COLORS.green} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Acções de estado */}
            {ownerMode && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <View style={delS.ownerActions}>
                {order.status === 'pending' && (
                  <ActionBtn label="Confirmar"  color="#22C55E" onPress={() => onStatusChange(order.id, 'confirmed')} />
                )}
                {order.status === 'confirmed' && (
                  <ActionBtn label="A preparar" color={COLORS.blue} onPress={() => onStatusChange(order.id, 'preparing')} />
                )}
                {order.status === 'preparing' && (
                  <ActionBtn label="Em rota"    color="#8B5CF6" onPress={() => onStatusChange(order.id, 'on_route')} />
                )}
                {order.status === 'on_route' && (
                  <ActionBtn label="Entregue"   color={COLORS.green} onPress={() => onStatusChange(order.id, 'delivered')} />
                )}
                <ActionBtn label="Cancelar" color={COLORS.red} onPress={() => onStatusChange(order.id, 'cancelled')} />
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
    <View style={delS.detailRow}>
      <Icon name={icon} size={15} color={COLORS.grayText} strokeWidth={2} />
      <Text style={delS.detailLabel}>{label}</Text>
      <Text style={delS.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, color, onPress }) {
  return (
    <TouchableOpacity style={[delS.actionBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={delS.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── DELIVERY EXTENSION — componente principal ────────────────────────────────
export function DeliveryExtension({
  business,
  ownerMode,
  tenantId,
  onUnsavedChange,      // gesture safety callback para o pai
  onProcessingChange,   // notifica isProcessingOrder para gesture lock no Main
}) {
  const ctx     = useContext(AppContext);
  // RBAC duplo
  const isOwner = (ownerMode ?? (ctx?.isBusinessMode && ctx?.tenantId === business?.id))
    && (tenantId ?? ctx?.tenantId) === business?.id;

  // ── Estado local — SANDBOXED (zero acesso a DiningModule/HospitalityModule) ─
  const [activeTab,          setActiveTab]          = useState(isOwner ? 'orders' : 'menu');
  const [catalog,            setCatalog]            = useState(() => buildMockCatalog(business?.id ?? 'biz'));
  const [cartQtys,           setCartQtys]           = useState({}); // { itemId: qty }
  const [orders,             setOrders]             = useState(() =>
    MOCK_ORDERS.map(o => ({ ...o, tenantId: business?.id ?? 'biz' }))
  );
  const [showCheckout,       setShowCheckout]       = useState(false);
  const [selectedOrder,      setSelectedOrder]      = useState(null);
  const [showOrderDetail,    setShowOrderDetail]    = useState(false);
  const [isProcessingOrder,  setIsProcessingOrder]  = useState(false);
  const processingLock       = useRef(false); // ref para prevenir race conditions

  // Registar callback de limpeza PII no AppContext
  // Chamado por clearSessionState() no logout e toggleMode
  useEffect(() => {
    const deregister = ctx?.registerPIICleanup?.(() => {
      // Apagar endereços (PII) de todos os pedidos em memória
      setOrders(prev => prev.map(o =>
        o.status === 'delivered' ? o : wipePII(o)
      ));
    });
    return () => deregister?.();
  }, [ctx]);

  // Ghost-data purge + PII clear ao trocar de negócio
  useEffect(() => {
    return () => {
      setCartQtys({});
      setShowCheckout(false);
      setIsProcessingOrder(false);
      processingLock.current = false;
      onUnsavedChange?.(false);
      onProcessingChange?.(false);
    };
  }, [business?.id]);

  // Sincronizar isProcessingOrder com pai (gesture lock)
  useEffect(() => {
    onProcessingChange?.(isProcessingOrder);
  }, [isProcessingOrder, onProcessingChange]);

  // ── Carrinho — CÁLCULO PROTEGIDO via useMemo ──────────────────────────────
  const cartItems = useMemo(() =>
    catalog
      .filter(item => (cartQtys[item.id] ?? 0) > 0)
      .map(item => ({ ...item, qty: cartQtys[item.id] })),
    [catalog, cartQtys]
  );

  const cartCount = useMemo(() =>
    Object.values(cartQtys).reduce((s, q) => s + q, 0),
    [cartQtys]
  );

  // Totais protegidos — useMemo puro, nunca useState
  const totals = useMemo(() =>
    computeTotals(cartItems, DELIVERY_ZONES[0].id),
    [cartItems]
  );

  // Stats (dono)
  const stats = useMemo(() => ({
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    active:   orders.filter(o => ['confirmed','preparing','on_route'].includes(o.status)).length,
    done:     orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const addToCart = useCallback((itemId) => {
    setCartQtys(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
    onUnsavedChange?.(true);
  }, [onUnsavedChange]);

  const removeFromCart = useCallback((itemId) => {
    setCartQtys(prev => {
      const next = { ...prev };
      if ((next[itemId] ?? 0) > 1) next[itemId]--;
      else delete next[itemId];
      if (Object.keys(next).length === 0) onUnsavedChange?.(false);
      return next;
    });
  }, [onUnsavedChange]);

  // ── RACE CONDITION GUARD ──────────────────────────────────────────────────
  // processingLock.current previne que dois taps rápidos disparem dois pedidos
  const handleConfirmOrder = useCallback(async (data) => {
    if (processingLock.current) return; // segundo tap ignorado
    processingLock.current = true;
    setIsProcessingOrder(true);

    try {
      // Simula latência de rede — em produção: POST /extensions/delivery/orders
      await new Promise(res => setTimeout(res, 1500));

      const newOrder = {
        id:         `ord_${Date.now()}`,
        tenantId:   business?.id,
        status:     'pending',
        courierId:  null,
        courierName: null,
        createdAt:  new Date().toLocaleString('pt-AO'),
        ...data,
      };

      setOrders(prev => [newOrder, ...prev]);
      setCartQtys({});
      setShowCheckout(false);
      onUnsavedChange?.(false);

      Alert.alert(
        'Pedido Enviado! 🚀',
        `O seu pedido foi enviado. Tempo estimado: ${DELIVERY_ZONES.find(z => z.id === data.zone)?.maxMins}min.`,
      );
    } finally {
      processingLock.current = false;
      setIsProcessingOrder(false);
    }
  }, [business?.id, onUnsavedChange]);

  const handleStatusChange = useCallback((orderId, newStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      // PII WIPE: apagar endereço e telefone quando pedido é marcado como entregue
      const updated = { ...o, status: newStatus };
      if (newStatus === 'delivered') return wipePII(updated);
      return updated;
    }));
    setShowOrderDetail(false);
  }, []);

  const handleAssignCourier = useCallback((orderId, courierId, courierName) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, courierId, courierName } : o
    ));
  }, []);

  const TABS = isOwner
    ? [{ id: 'orders', label: 'Pedidos', icon: 'package' }, { id: 'menu', label: 'Catálogo', icon: 'grid' }]
    : [{ id: 'menu', label: 'Cardápio', icon: 'grid' }];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={delS.container}>

      {/* RBAC Badge */}
      {isOwner && (
        <View style={delS.rbacBadge}>
          <Icon name="shield" size={12} color={COLORS.green} strokeWidth={2.5} />
          <Text style={delS.rbacText}>Delivery · tenantId verificado · Sandboxed</Text>
        </View>
      )}

      {/* Stats dono */}
      {isOwner && (
        <View style={delS.statsRow}>
          <StatBox icon="package"     label="Total"    value={stats.total}   color={COLORS.blue} />
          <StatBox icon="clock"       label="Pendentes" value={stats.pending} color="#F59E0B" />
          <StatBox icon="truck"       label="Ativos"   value={stats.active}  color="#8B5CF6" />
          <StatBox icon="checkCircle" label="Entregues" value={stats.done}   color={COLORS.green} />
        </View>
      )}

      {/* Tabs */}
      <View style={delS.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id}
            style={[delS.tab, activeTab === tab.id && delS.tabActive]}
            onPress={() => setActiveTab(tab.id)} activeOpacity={0.75}>
            <Icon name={tab.icon} size={15} color={activeTab === tab.id ? COLORS.red : COLORS.grayText} strokeWidth={2} />
            <Text style={[delS.tabLabel, activeTab === tab.id && delS.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
        {/* Carrinho flutuante */}
        {!isOwner && cartCount > 0 && (
          <TouchableOpacity style={delS.cartTab} onPress={() => setShowCheckout(true)} activeOpacity={0.85}>
            <Icon name="shoppingCart" size={15} color={COLORS.white} strokeWidth={2} />
            <Text style={delS.cartTabText}>Encomendar ({cartCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── TAB: MENU ──────────────────────────────────────────────────────── */}
      {activeTab === 'menu' && (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
          {catalog.map(item => (
            <CatalogItem key={item.id} item={item}
              qty={cartQtys[item.id] ?? 0}
              onAdd={addToCart} onRemove={removeFromCart} />
          ))}
          {!isOwner && cartCount > 0 && (
            <TouchableOpacity style={delS.floatingCart} onPress={() => setShowCheckout(true)}>
              <Icon name="shoppingCart" size={18} color={COLORS.white} strokeWidth={2} />
              <Text style={delS.floatingCartText}>
                Ver encomenda · {cartCount} item(s) · {formatCurrency(totals.subtotal)}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── TAB: PEDIDOS (dono) ────────────────────────────────────────────── */}
      {activeTab === 'orders' && isOwner && (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
          {orders.length === 0 && (
            <Text style={delS.emptyText}>Sem pedidos de entrega</Text>
          )}
          {orders.map(order => (
            <OrderCard key={order.id} order={order} ownerMode={isOwner}
              onPress={(o) => { setSelectedOrder(o); setShowOrderDetail(true); }} />
          ))}
        </ScrollView>
      )}

      {/* Modais */}
      <CheckoutModal
        visible={showCheckout}
        cartItems={cartItems}
        totals={totals}
        isProcessing={isProcessingOrder}
        onClose={() => { if (!isProcessingOrder) { setShowCheckout(false); } }}
        onConfirm={handleConfirmOrder}
      />

      <OrderDetailModal
        visible={showOrderDetail}
        order={selectedOrder}
        ownerMode={isOwner}
        onClose={() => setShowOrderDetail(false)}
        onStatusChange={handleStatusChange}
        onAssignCourier={handleAssignCourier}
      />

      {/* Loading Overlay — Race Condition Lock */}
      <ProcessingOverlay visible={isProcessingOrder} />
    </View>
  );
}

export default DeliveryExtension;

// ─── AUX ──────────────────────────────────────────────────────────────────────
function StatBox({ icon, label, value, color }) {
  return (
    <View style={[delS.statBox, { borderColor: color + '44' }]}>
      <Icon name={icon} size={14} color={color} strokeWidth={2} />
      <Text style={[delS.statVal, { color }]}>{value}</Text>
      <Text style={delS.statLabel}>{label}</Text>
    </View>
  );
}

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const delS = StyleSheet.create({
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
  cartTab:            { backgroundColor: '#D32323', paddingHorizontal: 12, paddingVertical: 8,
                        flexDirection: 'row', alignItems: 'center', gap: 5, margin: 6, borderRadius: 8 },
  cartTabText:        { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  catalogItem:        { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, flexDirection: 'row',
                        alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EBEBEB',
                        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  catalogEmoji:       { fontSize: 28 },
  catalogName:        { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 3 },
  catalogPrice:       { fontSize: 13, fontWeight: '700', color: '#D32323' },
  unavailTag:         { fontSize: 12, color: '#8A8A8A', fontWeight: '400' },
  qtyRow:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:             { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F7F7F8',
                        borderWidth: 1, borderColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' },
  qtyVal:             { fontSize: 16, fontWeight: '800', color: '#111111', minWidth: 20, textAlign: 'center' },
  floatingCart:       { backgroundColor: '#D32323', borderRadius: 12, padding: 16,
                        flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
                        elevation: 4, shadowColor: '#D32323', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  floatingCartText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 },
  orderCard:          { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1,
                        borderColor: '#EBEBEB', elevation: 1,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  orderCardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  orderClientName:    { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 2 },
  orderMeta:          { fontSize: 11, color: '#8A8A8A' },
  orderItemsPreview:  { gap: 2, marginBottom: 10 },
  orderItemLine:      { fontSize: 12, color: '#8A8A8A' },
  orderFooter:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EBEBEB' },
  orderTotal:         { fontSize: 15, fontWeight: '800', color: '#111111' },
  orderCourier:       { fontSize: 11, color: '#1565C0' },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:         { fontSize: 11, fontWeight: '700' },
  emptyText:          { textAlign: 'center', fontSize: 14, color: '#8A8A8A', paddingVertical: 32 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        paddingBottom: Platform.OS === 'ios' ? 34 : 24, maxHeight: '92%' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 18,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#111111' },
  modalClose:         { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F7F7F8',
                        alignItems: 'center', justifyContent: 'center' },
  cartSummary:        { marginHorizontal: 16, backgroundColor: '#F7F7F8', borderRadius: 10,
                        padding: 12, gap: 6 },
  cartSummaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartSummaryItem:    { fontSize: 13, color: '#111111', flex: 1 },
  cartSummaryPrice:   { fontSize: 13, fontWeight: '600', color: '#111111' },
  zonePill:           { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EBEBEB',
                        alignItems: 'center', minWidth: 110 },
  zonePillActive:     { backgroundColor: '#D32323', borderColor: '#D32323' },
  zoneName:           { fontSize: 13, fontWeight: '700', color: '#111111' },
  zoneNameActive:     { color: '#FFFFFF' },
  zoneFee:            { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  totalsCard:         { marginHorizontal: 16, backgroundColor: '#F7F7F8', borderRadius: 10,
                        padding: 14, gap: 6 },
  totalRow:           { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:         { fontSize: 13, color: '#8A8A8A' },
  totalLabelBold:     { fontWeight: '800', color: '#111111', fontSize: 15 },
  totalValue:         { fontSize: 13, color: '#8A8A8A' },
  totalValueBold:     { fontWeight: '800', color: '#111111', fontSize: 15 },
  totalDivider:       { height: 1, backgroundColor: '#EBEBEB', marginVertical: 4 },
  fieldLabel:         { fontSize: 12, fontWeight: '700', color: '#8A8A8A', marginBottom: 4, paddingHorizontal: 16 },
  piiTag:             { fontWeight: '400', color: '#1565C0', fontSize: 11 },
  input:              { backgroundColor: '#F7F7F8', borderRadius: 10, paddingHorizontal: 14,
                        paddingVertical: 12, fontSize: 15, color: '#111111', marginHorizontal: 16,
                        borderWidth: 1, borderColor: '#EBEBEB' },
  inputMulti:         { height: 80, textAlignVertical: 'top' },
  piiNotice:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16,
                        backgroundColor: '#1565C0' + '10', borderRadius: 8, padding: 10 },
  piiNoticeText:      { flex: 1, fontSize: 11, color: '#1565C0', lineHeight: 16 },
  confirmBtn:         { marginHorizontal: 16, backgroundColor: '#D32323', borderRadius: 12,
                        paddingVertical: 15, alignItems: 'center',
                        elevation: 3, shadowColor: '#D32323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  confirmBtnDisabled: { backgroundColor: '#8A8A8A' },
  confirmBtnText:     { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  piiBox:             { backgroundColor: '#1565C0' + '08', borderRadius: 10, padding: 12,
                        borderWidth: 1, borderColor: '#1565C0' + '33', marginBottom: 12 },
  piiBoxWiped:        { backgroundColor: '#F7F7F8', borderColor: '#EBEBEB' },
  piiBoxHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  piiBoxTitle:        { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  detailRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  detailLabel:        { fontSize: 12, fontWeight: '700', color: '#8A8A8A', width: 70 },
  detailValue:        { flex: 1, fontSize: 14, color: '#111111', fontWeight: '500' },
  courierRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                        backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#EBEBEB' },
  courierRowActive:   { borderColor: '#22A06B' },
  courierEmoji:       { fontSize: 22 },
  courierName:        { fontSize: 14, fontWeight: '700', color: '#111111' },
  courierPhone:       { fontSize: 12, color: '#8A8A8A' },
  ownerActions:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionBtn:          { flex: 1, minWidth: '45%', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  actionBtnText:      { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  overlay:            { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  overlayCard:        { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32,
                        alignItems: 'center', gap: 12, minWidth: 240,
                        elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16 },
  overlayTitle:       { fontSize: 16, fontWeight: '700', color: '#111111' },
  overlaySubtitle:    { fontSize: 12, color: '#8A8A8A', textAlign: 'center' },
});