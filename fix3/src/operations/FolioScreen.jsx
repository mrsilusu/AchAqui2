// =============================================================================
// FolioScreen.jsx — Sprint 3 PMS
// Folio: consumos, checkout financeiro, recibo
// Props:
//   booking      — { id, guestName, room, startDate, endDate, status, ... }
//   businessId   — ID do negócio
//   accessToken  — JWT do owner
//   onClose      — fechar modal
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Alert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Icon, COLORS } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

// ─── Tipos de item disponíveis para adicionar ─────────────────────────────────
const FOLIO_TYPES = [
  { key: 'MINIBAR',       label: 'Minibar',         icon: 'coffee'    },
  { key: 'ROOM_SERVICE',  label: 'Room Service',    icon: 'package'   },
  { key: 'LAUNDRY',       label: 'Lavandaria',      icon: 'wind'      },
  { key: 'RESTAURANT',    label: 'Restaurante',     icon: 'utensils'  },
  { key: 'PARKING',       label: 'Estacionamento',  icon: 'map-pin'   },
  { key: 'SPA',           label: 'Spa / Wellness',  icon: 'heart'     },
  { key: 'EXTRA_BED',     label: 'Cama Extra',      icon: 'moon'      },
  { key: 'EARLY_CHECKIN', label: 'Check-in Early',  icon: 'sunrise'   },
  { key: 'LATE_CHECKOUT', label: 'Check-out Late',  icon: 'sunset'    },
];

const PAYMENT_METHODS = [
  { key: 'CASH',          label: 'Numerário',        icon: 'dollar-sign' },
  { key: 'CARD',          label: 'Cartão',           icon: 'credit-card' },
  { key: 'MULTICAIXA',    label: 'Multicaixa',       icon: 'smartphone'  },
  { key: 'BANK_TRANSFER', label: 'Transferência',    icon: 'send'        },
];

function fmtMoney(n) {
  if (n == null) return '0 Kz';
  return `${Number(n).toLocaleString('pt-PT')} Kz`;
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}
function nights(s, e) {
  if (!s || !e) return 0;
  return Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000));
}

// ─── Linha de item no folio ───────────────────────────────────────────────────
function FolioRow({ item, onRemove, canEdit }) {
  const isDiscount = item.amount < 0;
  return (
    <View style={fS.folioRow}>
      <View style={{ flex: 1 }}>
        <Text style={fS.folioDesc}>{item.description}</Text>
        <Text style={fS.folioMeta}>
          {item.quantity} × {fmtMoney(item.unitPrice)}
        </Text>
      </View>
      <Text style={[fS.folioAmount, isDiscount && { color: '#22A06B' }]}>
        {isDiscount ? '−' : ''}{fmtMoney(Math.abs(item.amount))}
      </Text>
      {canEdit && item.type !== 'ACCOMMODATION' && (
        <TouchableOpacity style={fS.removeBtn} onPress={() => onRemove(item)}>
          <Icon name="x" size={14} color="#DC2626" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Modal: adicionar item ────────────────────────────────────────────────────
function AddItemModal({ visible, onClose, onAdd, loading }) {
  const [type, setType]     = useState('MINIBAR');
  const [desc, setDesc]     = useState('');
  const [qty,  setQty]      = useState('1');
  const [price, setPrice]   = useState('');

  const reset = () => { setType('MINIBAR'); setDesc(''); setQty('1'); setPrice(''); };

  const submit = () => {
    const q = parseInt(qty, 10);
    const p = parseFloat(price.replace(',', '.'));
    if (!desc.trim())      return Alert.alert('Erro', 'Descrição obrigatória.');
    if (isNaN(q) || q < 1) return Alert.alert('Erro', 'Quantidade inválida.');
    if (isNaN(p) || p <= 0) return Alert.alert('Erro', 'Preço inválido.');
    onAdd({ type, description: desc.trim(), quantity: q, unitPrice: p });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={fS.addRoot}>
          <View style={fS.addHeader}>
            <Text style={fS.addTitle}>Adicionar ao Folio</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fS.addBody}>
            {/* Tipo */}
            <Text style={fS.fieldLabel}>Tipo de Consumo</Text>
            <View style={fS.typeGrid}>
              {FOLIO_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[fS.typeChip, type === t.key && fS.typeChipActive]}
                  onPress={() => setType(t.key)}
                >
                  <Icon name={t.icon} size={14} color={type === t.key ? '#fff' : COLORS.darkText} strokeWidth={2} />
                  <Text style={[fS.typeChipText, type === t.key && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Descrição */}
            <Text style={fS.fieldLabel}>Descrição</Text>
            <TextInput
              style={fS.input}
              value={desc}
              onChangeText={setDesc}
              placeholder="Ex: Água + Refrigerante"
              placeholderTextColor="#aaa"
              maxLength={80}
            />

            {/* Qty + Preço */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={fS.fieldLabel}>Quantidade</Text>
                <TextInput
                  style={fS.input}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={fS.fieldLabel}>Preço unitário (Kz)</Text>
                <TextInput
                  style={fS.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>

            {/* Total preview */}
            {price && qty ? (
              <View style={fS.previewRow}>
                <Text style={fS.previewLabel}>Total a lançar:</Text>
                <Text style={fS.previewValue}>
                  {fmtMoney((parseFloat(price.replace(',', '.')) || 0) * (parseInt(qty, 10) || 0))}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={fS.addBtn} onPress={submit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={fS.addBtnText}>Lançar no Folio</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal: checkout financeiro ───────────────────────────────────────────────
function CheckoutModal({ visible, summary, onClose, onConfirm, loading }) {
  const [method,   setMethod]   = useState('CASH');
  const [discount, setDiscount] = useState('');
  const [discReason, setDiscReason] = useState('');

  const disc      = parseFloat(discount.replace(',', '.')) || 0;
  const finalTotal = Math.max(0, (summary?.totalPrice ?? 0) - disc);

  const submit = () => {
    if (disc > (summary?.totalPrice ?? 0)) {
      return Alert.alert('Erro', 'Desconto não pode ser superior ao total.');
    }
    Alert.alert(
      'Confirmar Pagamento',
      `Total: ${fmtMoney(finalTotal)}\nMétodo: ${PAYMENT_METHODS.find(m => m.key === method)?.label}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => onConfirm({
            paymentMethod:  method,
            discountAmount: disc > 0 ? disc : undefined,
            discountReason: disc > 0 ? (discReason || 'Desconto') : undefined,
          }),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={fS.addRoot}>
        <View style={fS.addHeader}>
          <Text style={fS.addTitle}>Checkout Financeiro</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={fS.addBody}>
          {/* Resumo */}
          <View style={fS.checkoutSummary}>
            <View style={fS.checkoutRow}>
              <Text style={fS.checkoutLabel}>Subtotal</Text>
              <Text style={fS.checkoutVal}>{fmtMoney(summary?.totalPrice)}</Text>
            </View>
            {disc > 0 && (
              <View style={fS.checkoutRow}>
                <Text style={[fS.checkoutLabel, { color: '#22A06B' }]}>Desconto</Text>
                <Text style={[fS.checkoutVal, { color: '#22A06B' }]}>−{fmtMoney(disc)}</Text>
              </View>
            )}
            <View style={[fS.checkoutRow, fS.checkoutTotal]}>
              <Text style={fS.checkoutTotalLabel}>Total a Pagar</Text>
              <Text style={fS.checkoutTotalVal}>{fmtMoney(finalTotal)}</Text>
            </View>
          </View>

          {/* Desconto */}
          <Text style={fS.fieldLabel}>Desconto (Kz) — opcional</Text>
          <TextInput
            style={fS.input}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#aaa"
          />
          {discount ? (
            <>
              <Text style={fS.fieldLabel}>Motivo do desconto</Text>
              <TextInput
                style={fS.input}
                value={discReason}
                onChangeText={setDiscReason}
                placeholder="Ex: Fidelização, Desconto promocional"
                placeholderTextColor="#aaa"
              />
            </>
          ) : null}

          {/* Método de pagamento */}
          <Text style={fS.fieldLabel}>Método de Pagamento</Text>
          <View style={fS.methodGrid}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[fS.methodChip, method === m.key && fS.methodChipActive]}
                onPress={() => setMethod(m.key)}
              >
                <Icon name={m.icon} size={16} color={method === m.key ? '#fff' : COLORS.darkText} strokeWidth={2} />
                <Text style={[fS.methodChipText, method === m.key && { color: '#fff' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={fS.checkoutBtn} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Icon name="checkCircle" size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={fS.checkoutBtnText}>Confirmar Pagamento</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Modal: recibo ────────────────────────────────────────────────────────────
function ReceiptModal({ visible, receipt, onClose }) {
  if (!receipt) return null;
  const nts = nights(receipt.stay?.startDate, receipt.stay?.endDate);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={fS.receiptRoot}>
        <View style={fS.receiptHeader}>
          <Text style={fS.receiptTitle}>Recibo</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={fS.receiptBody}>
          {/* Cabeçalho */}
          <View style={fS.receiptBusiness}>
            <Text style={fS.receiptBusinessName}>{receipt.business?.name}</Text>
            <Text style={fS.receiptNum}>Nº {receipt.receiptNumber}</Text>
            <Text style={fS.receiptDate}>Emitido: {fmtDate(receipt.issuedAt)}</Text>
          </View>

          {/* Hóspede + estadia */}
          <View style={fS.receiptSection}>
            <Text style={fS.receiptSectionTitle}>Hóspede</Text>
            <Text style={fS.receiptLine}>{receipt.guest?.name}</Text>
            {receipt.guest?.email && <Text style={fS.receiptMeta}>{receipt.guest.email}</Text>}
          </View>

          <View style={fS.receiptSection}>
            <Text style={fS.receiptSectionTitle}>Estadia</Text>
            <Text style={fS.receiptLine}>Quarto Nº {receipt.stay?.room || '—'}</Text>
            <Text style={fS.receiptMeta}>
              {fmtDate(receipt.stay?.startDate)} → {fmtDate(receipt.stay?.endDate)} · {nts} noite{nts !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Itens */}
          <View style={fS.receiptSection}>
            <Text style={fS.receiptSectionTitle}>Consumos</Text>
            {receipt.items?.map((item, i) => (
              <View key={i} style={fS.receiptItemRow}>
                <Text style={fS.receiptItemDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={[fS.receiptItemAmt, item.amount < 0 && { color: '#22A06B' }]}>
                  {item.amount < 0 ? '−' : ''}{fmtMoney(Math.abs(item.amount))}
                </Text>
              </View>
            ))}
          </View>

          {/* Totais */}
          <View style={fS.receiptTotals}>
            <View style={fS.receiptTotalRow}>
              <Text style={fS.receiptTotalLabel}>TOTAL PAGO</Text>
              <Text style={fS.receiptTotalVal}>{fmtMoney(receipt.summary?.total)}</Text>
            </View>
            <View style={fS.receiptTotalRow}>
              <Text style={fS.receiptMeta}>
                {PAYMENT_METHODS.find(m => m.key === receipt.summary?.paymentMethod)?.label || receipt.summary?.paymentMethod}
              </Text>
              <View style={[fS.paidBadge]}>
                <Text style={fS.paidBadgeText}>PAGO</Text>
              </View>
            </View>
          </View>

          <Text style={fS.receiptFooter}>Obrigado pela sua preferência</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function FolioScreen({ booking, businessId, accessToken, onClose }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [addLoading,    setAddLoading]    = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showCheckout,  setShowCheckout]  = useState(false);
  const [receipt,       setReceipt]       = useState(null);
  const [showReceipt,   setShowReceipt]   = useState(false);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    if (!booking?.id || !accessToken) return;
    setLoading(true);
    try {
      const result = await backendApi.getHtFolio(booking.id, accessToken);
      if (alive.current) setData(result);
    } catch {
      if (alive.current) setData(null);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [booking?.id, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleAddItem = async (dto) => {
    setAddLoading(true);
    try {
      await backendApi.addHtFolioItem(booking.id, dto, accessToken);
      setShowAdd(false);
      await load();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar o item.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = (item) => {
    Alert.alert(
      'Remover Item',
      `Remover "${item.description}" do folio?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await backendApi.removeHtFolioItem(booking.id, item.id, accessToken);
            await load();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o item.');
          }
        }},
      ]
    );
  };

  const handleCheckout = async (dto) => {
    setCheckoutLoading(true);
    try {
      const result = await backendApi.htFinancialCheckout(booking.id, dto, accessToken);
      setShowCheckout(false);
      setReceipt(result.receipt);
      setShowReceipt(true);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível processar o pagamento.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const canEdit    = data?.booking?.status === 'CHECKED_IN';
  const isPaid     = data?.booking?.paymentStatus === 'PAID';
  const guestName  = data?.booking?.guestName || booking?.guestName || 'Hóspede';
  const roomNum    = data?.booking?.room || booking?.room?.number;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={fS.root}>

        {/* ── Header ── */}
        <View style={fS.header}>
          <TouchableOpacity style={fS.iconBtn} onPress={onClose}>
            <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={fS.headerTitle} numberOfLines={1}>Folio · {guestName}</Text>
            {roomNum && <Text style={fS.headerSub}>Quarto Nº {roomNum}</Text>}
          </View>
          {canEdit && (
            <TouchableOpacity style={fS.addIconBtn} onPress={() => setShowAdd(true)}>
              <Icon name="plus" size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={fS.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={fS.scroll}>

            {/* ── Info da reserva ── */}
            <View style={fS.stayCard}>
              <View style={fS.stayRow}>
                <Icon name="calendar" size={13} color={COLORS.grayText} strokeWidth={2} />
                <Text style={fS.stayText}>
                  {fmtDate(data?.booking?.startDate)} → {fmtDate(data?.booking?.endDate)}
                  {' · '}{nights(data?.booking?.startDate, data?.booking?.endDate)} noite{nights(data?.booking?.startDate, data?.booking?.endDate) !== 1 ? 's' : ''}
                </Text>
              </View>
              {isPaid && (
                <View style={fS.paidBadge}>
                  <Text style={fS.paidBadgeText}>PAGO</Text>
                </View>
              )}
            </View>

            {/* ── Lista de itens ── */}
            <View style={fS.folioCard}>
              <Text style={fS.sectionTitle}>Consumos</Text>
              {data?.items?.length === 0 ? (
                <Text style={fS.emptyText}>Sem consumos adicionais lançados.</Text>
              ) : (
                data?.items?.map(item => (
                  <FolioRow
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                    canEdit={canEdit}
                  />
                ))
              )}
            </View>

            {/* ── Totais ── */}
            <View style={fS.summaryCard}>
              <View style={fS.summaryRow}>
                <Text style={fS.summaryLabel}>Total</Text>
                <Text style={fS.summaryVal}>{fmtMoney(data?.summary?.totalPrice)}</Text>
              </View>
              {(data?.summary?.depositPaid > 0) && (
                <View style={fS.summaryRow}>
                  <Text style={fS.summaryLabel}>Já pago</Text>
                  <Text style={[fS.summaryVal, { color: '#22A06B' }]}>−{fmtMoney(data?.summary?.depositPaid)}</Text>
                </View>
              )}
              <View style={[fS.summaryRow, fS.summaryBalance]}>
                <Text style={fS.balanceLabel}>Saldo em dívida</Text>
                <Text style={fS.balanceVal}>{fmtMoney(data?.summary?.balance)}</Text>
              </View>
            </View>

            {/* ── Acções ── */}
            {!canEdit && (
              <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
                <Text style={{ fontSize: 13, color: '#92400E' }}>
                  ⚠️ O folio só pode ser editado após o check-in do hóspede.
                </Text>
              </View>
            )}
            {!isPaid && canEdit && (
              <TouchableOpacity style={fS.checkoutBtn} onPress={() => setShowCheckout(true)}>
                <Icon name="checkCircle" size={18} color="#fff" strokeWidth={2.5} />
                <Text style={fS.checkoutBtnText}>Processar Pagamento</Text>
              </TouchableOpacity>
            )}

            {receipt && (
              <TouchableOpacity style={fS.receiptBtn} onPress={() => setShowReceipt(true)}>
                <Icon name="briefcase" size={16} color={COLORS.blue} strokeWidth={2} />
                <Text style={fS.receiptBtnText}>Ver Recibo</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {/* ── Modais secundários ── */}
      <AddItemModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddItem}
        loading={addLoading}
      />
      <CheckoutModal
        visible={showCheckout}
        summary={data?.summary}
        onClose={() => setShowCheckout(false)}
        onConfirm={handleCheckout}
        loading={checkoutLoading}
      />
      <ReceiptModal
        visible={showReceipt}
        receipt={receipt}
        onClose={() => setShowReceipt(false)}
      />
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const fS = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F7F6F2' },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  iconBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addIconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub:  { fontSize: 12, color: '#888', marginTop: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:     { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  stayCard:   { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  stayRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stayText:   { fontSize: 13, color: '#444' },

  folioCard:  { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  folioRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EDE6', gap: 8 },
  folioDesc:  { fontSize: 14, color: '#111', fontWeight: '500' },
  folioMeta:  { fontSize: 12, color: '#888', marginTop: 2 },
  folioAmount:{ fontSize: 14, fontWeight: '700', color: '#111' },
  removeBtn:  { padding: 4 },
  emptyText:  { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 20 },

  summaryCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel:   { fontSize: 14, color: '#666' },
  summaryVal:     { fontSize: 14, fontWeight: '600', color: '#111' },
  summaryBalance: { borderTopWidth: 1, borderTopColor: '#F0EDE6', marginTop: 6, paddingTop: 12 },
  balanceLabel:   { fontSize: 15, fontWeight: '700', color: '#111' },
  balanceVal:     { fontSize: 18, fontWeight: '800', color: '#111', letterSpacing: -0.5 },

  checkoutBtn:     { backgroundColor: '#22A06B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  checkoutBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  receiptBtn:      { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF' },
  receiptBtnText:  { fontSize: 14, fontWeight: '600', color: COLORS.blue },

  paidBadge:     { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidBadgeText: { fontSize: 11, fontWeight: '800', color: '#22A06B', letterSpacing: 0.5 },

  // AddItemModal / CheckoutModal
  addRoot:   { flex: 1, backgroundColor: '#fff' },
  addHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  addTitle:  { fontSize: 17, fontWeight: '700', color: '#111' },
  addBody:   { padding: 20, gap: 8 },
  fieldLabel:{ fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 4 },
  input:     { backgroundColor: '#F7F6F2', borderRadius: 10, padding: 12, fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#ECEAE3' },
  typeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F7F6F2', borderWidth: 1, borderColor: '#ECEAE3' },
  typeChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  typeChipText:   { fontSize: 12, fontWeight: '600', color: '#333' },
  previewRow:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 4 },
  previewLabel:   { fontSize: 13, color: '#166534' },
  previewValue:   { fontSize: 14, fontWeight: '700', color: '#166534' },
  addBtn:         { backgroundColor: '#1565C0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  addBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Checkout
  checkoutSummary: { backgroundColor: '#F7F6F2', borderRadius: 12, padding: 16, gap: 4, marginBottom: 8 },
  checkoutRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  checkoutLabel:   { fontSize: 14, color: '#666' },
  checkoutVal:     { fontSize: 14, fontWeight: '600', color: '#111' },
  checkoutTotal:   { borderTopWidth: 1, borderTopColor: '#ECEAE3', paddingTop: 10, marginTop: 4 },
  checkoutTotalLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  checkoutTotalVal:   { fontSize: 18, fontWeight: '800', color: '#111' },
  methodGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  methodChip:         { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F7F6F2', borderWidth: 1, borderColor: '#ECEAE3' },
  methodChipActive:   { backgroundColor: '#22A06B', borderColor: '#22A06B' },
  methodChipText:     { fontSize: 13, fontWeight: '600', color: '#333' },

  // Receipt
  receiptRoot:         { flex: 1, backgroundColor: '#fff' },
  receiptHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  receiptTitle:        { fontSize: 17, fontWeight: '700', color: '#111' },
  receiptBody:         { padding: 24, gap: 0 },
  receiptBusiness:     { alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ECEAE3', marginBottom: 20 },
  receiptBusinessName: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
  receiptNum:          { fontSize: 12, color: '#888', fontWeight: '600' },
  receiptDate:         { fontSize: 12, color: '#aaa' },
  receiptSection:      { marginBottom: 16 },
  receiptSectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  receiptLine:         { fontSize: 14, fontWeight: '600', color: '#111' },
  receiptMeta:         { fontSize: 12, color: '#888', marginTop: 2 },
  receiptItemRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0EDE6' },
  receiptItemDesc:     { fontSize: 13, color: '#444', flex: 1 },
  receiptItemAmt:      { fontSize: 13, fontWeight: '600', color: '#111' },
  receiptTotals:       { borderTopWidth: 2, borderTopColor: '#111', paddingTop: 16, marginTop: 8, gap: 6 },
  receiptTotalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel:   { fontSize: 15, fontWeight: '800', color: '#111' },
  receiptTotalVal:     { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  receiptFooter:       { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 32, fontStyle: 'italic' },
});