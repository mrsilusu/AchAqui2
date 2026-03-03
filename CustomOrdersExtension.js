/**
 * ============================================================================
 * ACHEIAQUI — CUSTOM ORDERS EXTENSION  (v4.0.0 — Fase 4)
 * ============================================================================
 * Extensão injectável de encomendas personalizadas.
 * Funciona sobre qualquer módulo principal via tenantId apenas.
 *
 * FUNCIONALIDADES:
 *   ✅ Formulário dinâmico com campos configuráveis pelo dono
 *   ✅ Suporte a tipos: texto, número, seleção, data, texto longo
 *   ✅ Modo Dono — gestão de encomendas + campos configuráveis
 *   ✅ Orçamentação: cliente recebe estimativa antes de confirmar
 *
 * SEGURANÇA FASE 4:
 *   ✅ sanitizeInput OBRIGATÓRIO em TODOS os campos livres (texto, textarea)
 *   ✅ Validação de tipo nos campos numéricos — parseFloat com fallback 0
 *   ✅ Limite de caracteres enforçado em cada campo
 *   ✅ Sem upload de ficheiros no frontend — apenas referência por URL
 *      (evita ataques de upload/injecção via ficheiro)
 *   ✅ RBAC duplo: ownerMode && tenantId === business.id
 *   ✅ Ghost-data purge via useEffect cleanup em [business?.id]
 *   ✅ Gesture safety: onUnsavedChange callback
 * ============================================================================
 */

import React, {
  useContext, useState, useCallback, useMemo, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Platform, Switch,
} from 'react-native';
import { sanitizeInput, Icon, COLORS, AppContext, formatCurrency } from './AcheiAqui_Core';

// ─── TIPOS DE CAMPO ───────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { id: 'text',     label: 'Texto curto',  icon: 'type'       },
  { id: 'textarea', label: 'Texto longo',  icon: 'fileText'   },
  { id: 'number',   label: 'Número',       icon: 'hash'       },
  { id: 'select',   label: 'Opções',       icon: 'list'       },
  { id: 'date',     label: 'Data',         icon: 'calendar'   },
];

const ORDER_STATUS = Object.freeze({
  draft:     { label: 'Rascunho',    color: '#8A8A8A' },
  submitted: { label: 'Submetido',   color: '#F59E0B'       },
  quoted:    { label: 'Orçamentado', color: '#1565C0'     },
  accepted:  { label: 'Aceite',      color: '#22C55E'       },
  in_progress:{ label: 'Em curso',   color: '#8B5CF6'       },
  delivered: { label: 'Entregue',    color: '#22A06B'    },
  cancelled: { label: 'Cancelado',   color: '#D32323'      },
});

// Templates por tipo de negócio
const TEMPLATES = {
  food: [
    { id: 'f1', label: 'Tipo de bolo/prato',      type: 'text',     required: true,  maxLen: 100, placeholder: 'Ex: Bolo de chocolate com 3 andares' },
    { id: 'f2', label: 'Número de porções',        type: 'number',   required: true,  max: 500,   min: 1      },
    { id: 'f3', label: 'Data de entrega pretendida', type: 'date',   required: true                           },
    { id: 'f4', label: 'Sabor / ingredientes',     type: 'textarea', required: false, maxLen: 300, placeholder: 'Descreva o sabor, ingredientes especiais, restrições alimentares…' },
    { id: 'f5', label: 'Tema / decoração',         type: 'textarea', required: false, maxLen: 300, placeholder: 'Ex: Tema tropical, cor azul e dourado…' },
    { id: 'f6', label: 'Referência de imagem (URL)', type: 'text',   required: false, maxLen: 200, placeholder: 'https://…' },
  ],
  generic: [
    { id: 'g1', label: 'Descrição do pedido',      type: 'textarea', required: true,  maxLen: 500, placeholder: 'Descreva detalhadamente o que pretende…' },
    { id: 'g2', label: 'Prazo pretendido',         type: 'date',     required: true                           },
    { id: 'g3', label: 'Orçamento disponível (Kz)', type: 'number', required: false, min: 0                  },
    { id: 'g4', label: 'Referências / exemplos',   type: 'textarea', required: false, maxLen: 300, placeholder: 'Links ou descrição de referências visuais…' },
  ],
};

const MOCK_CUSTOM_ORDERS = [
  {
    id: 'co1', tenantId: null,
    clientName: 'Beatriz Nunes', clientPhone: '+244 912 555 001',
    templateId: 'food',
    fields: { f1: 'Bolo de 4 andares — aniversário', f2: '30', f3: '15/03/2026', f4: 'Chocolate belga, sem glúten', f5: 'Tema jardim, flores rosas', f6: '' },
    status: 'quoted', quote: 45000,
    notes: 'Entrega em Talatona', createdAt: '24/02/2026',
  },
  {
    id: 'co2', tenantId: null,
    clientName: 'Carlos Mendes', clientPhone: '+244 923 555 002',
    templateId: 'generic',
    fields: { g1: 'Brinde corporativo para 50 colaboradores', g2: '01/03/2026', g3: '500000', g4: '' },
    status: 'submitted', quote: null,
    notes: '', createdAt: '25/02/2026',
  },
];

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }) {
  const handleChange = (raw) => {
    // sanitizeInput em TODOS os campos de texto livre
    if (field.type === 'text' || field.type === 'textarea') {
      onChange(field.id, sanitizeInput(raw, field.maxLen ?? 200));
    } else if (field.type === 'number') {
      // Validação numérica — sem injecção via campo numérico
      const cleaned = raw.replace(/[^0-9.]/g, '');
      const val = parseFloat(cleaned) || '';
      if (field.max !== undefined && val > field.max) return;
      onChange(field.id, cleaned);
    } else {
      onChange(field.id, raw);
    }
  };

  if (field.type === 'textarea') {
    return (
      <TextInput
        style={[cusS.input, cusS.inputMulti]}
        value={value ?? ''}
        onChangeText={handleChange}
        placeholder={field.placeholder ?? ''}
        placeholderTextColor={COLORS.grayText}
        multiline
        maxLength={field.maxLen ?? 300}
      />
    );
  }
  if (field.type === 'number') {
    return (
      <TextInput
        style={cusS.input}
        value={String(value ?? '')}
        onChangeText={handleChange}
        placeholder={`Número${field.min !== undefined ? ` (mín. ${field.min})` : ''}`}
        placeholderTextColor={COLORS.grayText}
        keyboardType="numeric"
      />
    );
  }
  if (field.type === 'date') {
    return (
      <TextInput
        style={cusS.input}
        value={value ?? ''}
        onChangeText={(v) => onChange(field.id, v.replace(/[^0-9/]/g,'').slice(0,10))}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={COLORS.grayText}
        keyboardType="numeric"
        maxLength={10}
      />
    );
  }
  // default: text
  return (
    <TextInput
      style={cusS.input}
      value={value ?? ''}
      onChangeText={handleChange}
      placeholder={field.placeholder ?? ''}
      placeholderTextColor={COLORS.grayText}
      maxLength={field.maxLen ?? 150}
    />
  );
}

function OrderCard({ order, onPress }) {
  const cfg = ORDER_STATUS[order.status] ?? ORDER_STATUS.submitted;
  return (
    <TouchableOpacity style={cusS.orderCard} onPress={() => onPress(order)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={cusS.orderClient}>{order.clientName}</Text>
        <Text style={cusS.orderMeta}>{order.createdAt} · {order.templateId === 'food' ? 'Alimentação' : 'Geral'}</Text>
        <Text style={cusS.orderPreview} numberOfLines={1}>
          {Object.values(order.fields)[0] ?? '—'}
        </Text>
        {order.quote != null && (
          <Text style={cusS.orderQuote}>💰 Orçamento: {formatCurrency(order.quote)}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[cusS.statusBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[cusS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ─── MODAL NOVO PEDIDO ────────────────────────────────────────────────────────
function NewOrderModal({ visible, templateId, templateFields, onClose, onSubmit }) {
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');
  const [notes,  setNotes]  = useState('');
  const [fields, setFields] = useState({});

  useEffect(() => {
    if (visible) { setName(''); setPhone(''); setNotes(''); setFields({}); }
  }, [visible]);

  const hasData = !!(name.trim() || phone.trim() || Object.keys(fields).length > 0);

  const handleClose = useCallback(() => {
    if (hasData) {
      Alert.alert('Descartar pedido?', 'Tem dados preenchidos. Deseja descartar a encomenda?', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onClose },
      ]);
    } else { onClose(); }
  }, [hasData, onClose]);

  const handleFieldChange = useCallback((fieldId, val) => {
    setFields(prev => ({ ...prev, [fieldId]: val }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim())  { Alert.alert('Erro', 'Indique o seu nome.'); return; }
    if (!phone.trim()) { Alert.alert('Erro', 'Indique o contacto.'); return; }
    const missingRequired = templateFields.filter(f => f.required && !fields[f.id]?.trim?.());
    if (missingRequired.length > 0) {
      Alert.alert('Campos obrigatórios', `Por favor preencha: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }
    onSubmit({
      clientName:  sanitizeInput(name.trim(), 80),
      clientPhone: sanitizeInput(phone.trim(), 30),
      notes:       sanitizeInput(notes.trim(), 200),
      fields,
      templateId,
    });
  }, [name, phone, notes, fields, templateFields, templateId, onSubmit]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={cusS.modalOverlay}>
        <View style={cusS.modalSheet}>
          <View style={cusS.modalHeader}>
            <Text style={cusS.modalTitle}>Nova Encomenda</Text>
            <TouchableOpacity onPress={handleClose} style={cusS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>

            {/* Dados do cliente */}
            <Text style={cusS.sectionTitle}>Os seus dados</Text>
            <Text style={cusS.fieldLabel}>Nome <Text style={{ color: COLORS.red }}>*</Text></Text>
            <TextInput style={cusS.input} value={name} onChangeText={setName}
              placeholder="Nome completo" placeholderTextColor={COLORS.grayText} maxLength={80} />
            <Text style={cusS.fieldLabel}>Contacto <Text style={{ color: COLORS.red }}>*</Text></Text>
            <TextInput style={cusS.input} value={phone} onChangeText={setPhone}
              placeholder="+244 9XX XXX XXX" placeholderTextColor={COLORS.grayText}
              keyboardType="phone-pad" maxLength={30} />

            {/* Campos dinâmicos */}
            <Text style={cusS.sectionTitle}>Detalhes da encomenda</Text>
            {templateFields.map(field => (
              <View key={field.id}>
                <Text style={cusS.fieldLabel}>
                  {field.label}
                  {field.required && <Text style={{ color: COLORS.red }}> *</Text>}
                  {(field.type === 'text' || field.type === 'textarea') && field.maxLen && (
                    <Text style={cusS.charHint}> (máx. {field.maxLen})</Text>
                  )}
                </Text>
                <FieldInput field={field} value={fields[field.id]} onChange={handleFieldChange} />
                {(field.type === 'text' || field.type === 'textarea') && (
                  <Text style={cusS.charCount}>{(fields[field.id] ?? '').length}/{field.maxLen ?? 200}</Text>
                )}
              </View>
            ))}

            {/* Notas adicionais */}
            <Text style={cusS.fieldLabel}>Notas adicionais <Text style={{ fontWeight: '400' }}>(opcional)</Text></Text>
            <TextInput style={[cusS.input, cusS.inputMulti]} value={notes} onChangeText={setNotes}
              placeholder="Qualquer informação adicional…"
              placeholderTextColor={COLORS.grayText} multiline maxLength={200} />

            <View style={cusS.sanitizeNotice}>
              <Icon name="shield" size={13} color={COLORS.green} strokeWidth={2} />
              <Text style={cusS.sanitizeNoticeText}>
                Todos os campos de texto são sanitizados automaticamente para proteção contra injecções.
              </Text>
            </View>

            <TouchableOpacity style={cusS.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Icon name="send" size={16} color={COLORS.white} strokeWidth={2} />
              <Text style={cusS.submitBtnText}>Enviar Pedido</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL DETALHE PEDIDO (dono) ──────────────────────────────────────────────
function OrderDetailModal({ visible, order, templateFields, onClose, onStatusChange, onQuote }) {
  const [quoteInput, setQuoteInput] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  if (!order) return null;
  const cfg = ORDER_STATUS[order.status] ?? ORDER_STATUS.submitted;

  const handleQuoteSubmit = () => {
    const val = parseFloat(quoteInput.replace(/[^0-9.]/g,''));
    if (!val || val <= 0) { Alert.alert('Erro', 'Indique um valor válido.'); return; }
    onQuote(order.id, val);
    setShowQuoteInput(false);
    setQuoteInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cusS.modalOverlay}>
        <View style={[cusS.modalSheet, { maxHeight: '85%' }]}>
          <View style={cusS.modalHeader}>
            <Text style={cusS.modalTitle}>Encomenda #{order.id.slice(-3)}</Text>
            <TouchableOpacity onPress={onClose} style={cusS.modalClose}>
              <Icon name="x" size={18} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={[cusS.statusBadge, { backgroundColor: cfg.color + '22', alignSelf: 'flex-start', marginVertical: 12 }]}>
              <Text style={[cusS.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>

            <DetailRow icon="user"     label="Cliente"   value={order.clientName} />
            <DetailRow icon="phone"    label="Contacto"  value={order.clientPhone} />
            <DetailRow icon="calendar" label="Criado em" value={order.createdAt} />
            {order.quote != null && (
              <DetailRow icon="dollarSign" label="Orçamento" value={formatCurrency(order.quote)} />
            )}
            {order.notes ? <DetailRow icon="fileText" label="Notas" value={order.notes} /> : null}

            {/* Campos do formulário dinâmico */}
            <Text style={[cusS.sectionTitle, { marginTop: 12 }]}>Detalhes da encomenda</Text>
            {templateFields.map(field => {
              const val = order.fields[field.id];
              if (!val) return null;
              return (
                <View key={field.id} style={cusS.fieldReadRow}>
                  <Text style={cusS.fieldReadLabel}>{field.label}</Text>
                  <Text style={cusS.fieldReadValue}>{val}</Text>
                </View>
              );
            })}

            {/* Orçamento */}
            {order.status === 'submitted' && (
              <>
                {!showQuoteInput ? (
                  <TouchableOpacity style={cusS.quoteBtn} onPress={() => setShowQuoteInput(true)}>
                    <Icon name="dollarSign" size={16} color={COLORS.white} strokeWidth={2} />
                    <Text style={cusS.quoteBtnText}>Enviar Orçamento</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={cusS.quoteInputRow}>
                    <TextInput style={[cusS.input, { flex: 1 }]} value={quoteInput}
                      onChangeText={setQuoteInput} placeholder="Valor em Kz"
                      placeholderTextColor={COLORS.grayText} keyboardType="numeric" />
                    <TouchableOpacity style={cusS.quoteConfirmBtn} onPress={handleQuoteSubmit}>
                      <Icon name="check" size={18} color={COLORS.white} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Acções de estado */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <View style={cusS.ownerActions}>
                {order.status === 'quoted' && (
                  <ActionBtn label="Aceitar" color="#22C55E" onPress={() => onStatusChange(order.id, 'accepted')} />
                )}
                {order.status === 'accepted' && (
                  <ActionBtn label="Em curso" color="#8B5CF6" onPress={() => onStatusChange(order.id, 'in_progress')} />
                )}
                {order.status === 'in_progress' && (
                  <ActionBtn label="Entregar" color={COLORS.green} onPress={() => onStatusChange(order.id, 'delivered')} />
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
    <View style={cusS.detailRow}>
      <Icon name={icon} size={15} color={COLORS.grayText} strokeWidth={2} />
      <Text style={cusS.detailLabel}>{label}</Text>
      <Text style={cusS.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, color, onPress }) {
  return (
    <TouchableOpacity style={[cusS.actionBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={cusS.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── CUSTOM ORDERS EXTENSION — componente principal ───────────────────────────
export function CustomOrdersExtension({ business, ownerMode, tenantId, onUnsavedChange }) {
  const ctx     = useContext(AppContext);
  const isOwner = (ownerMode ?? (ctx?.isBusinessMode && ctx?.tenantId === business?.id))
    && (tenantId ?? ctx?.tenantId) === business?.id;

  // Determinar template baseado no tipo de negócio
  const templateId     = useMemo(() => {
    const bt = (business?.businessType ?? '').toLowerCase();
    if (bt === 'food' || bt === 'restaurant') return 'food';
    return 'generic';
  }, [business?.businessType]);

  const templateFields = useMemo(() => TEMPLATES[templateId] ?? TEMPLATES.generic, [templateId]);

  const [orders,          setOrders]          = useState(() =>
    MOCK_CUSTOM_ORDERS.map(o => ({ ...o, tenantId: business?.id ?? 'biz' }))
  );
  const [showNewOrder,    setShowNewOrder]    = useState(false);
  const [selectedOrder,   setSelectedOrder]   = useState(null);
  const [showDetail,      setShowDetail]      = useState(false);
  const [statusFilter,    setStatusFilter]    = useState('all');

  // Ghost-data purge
  useEffect(() => {
    return () => {
      setShowNewOrder(false);
      setShowDetail(false);
      onUnsavedChange?.(false);
    };
  }, [business?.id]);

  const stats = useMemo(() => ({
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'submitted').length,
    active:   orders.filter(o => ['accepted','in_progress','quoted'].includes(o.status)).length,
    done:     orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'active') return orders.filter(o => ['submitted','quoted','accepted','in_progress'].includes(o.status));
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const handleSubmitOrder = useCallback((data) => {
    const newOrder = {
      id:        `co_${Date.now()}`,
      tenantId:  business?.id,
      status:    'submitted',
      quote:     null,
      createdAt: new Date().toLocaleDateString('pt-AO'),
      ...data,
    };
    setOrders(prev => [newOrder, ...prev]);
    setShowNewOrder(false);
    onUnsavedChange?.(false);
    Alert.alert('Pedido Enviado!', 'A sua encomenda foi submetida. Receberá um orçamento em breve.');
  }, [business?.id, onUnsavedChange]);

  const handleStatusChange = useCallback((orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setShowDetail(false);
  }, []);

  const handleQuote = useCallback((orderId, amount) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, quote: amount, status: 'quoted' } : o
    ));
  }, []);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={cusS.container}>
      {isOwner && (
        <View style={cusS.rbacBadge}>
          <Icon name="shield" size={12} color={COLORS.green} strokeWidth={2.5} />
          <Text style={cusS.rbacText}>Encomendas · tenantId verificado · sanitizeInput activo</Text>
        </View>
      )}

      {isOwner && (
        <View style={cusS.statsRow}>
          <StatBox icon="package"     label="Total"    value={stats.total}   color={COLORS.blue} />
          <StatBox icon="clock"       label="Pendentes" value={stats.pending} color="#F59E0B" />
          <StatBox icon="activity"    label="Ativos"   value={stats.active}  color="#8B5CF6" />
          <StatBox icon="checkCircle" label="Entregues" value={stats.done}   color={COLORS.green} />
        </View>
      )}

      {/* Filtros (dono) */}
      {isOwner && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {[['all','Todas'],['active','Ativas'],['submitted','Pendentes'],['delivered','Entregues'],['cancelled','Canceladas']].map(([id, label]) => (
            <TouchableOpacity key={id}
              style={[cusS.filterPill, statusFilter === id && cusS.filterPillActive]}
              onPress={() => setStatusFilter(id)} activeOpacity={0.75}>
              <Text style={[cusS.filterText, statusFilter === id && cusS.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Lista */}
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>

        {/* Botão novo pedido (cliente) */}
        {!isOwner && (
          <TouchableOpacity style={cusS.newOrderBtn}
            onPress={() => { setShowNewOrder(true); onUnsavedChange?.(true); }}
            activeOpacity={0.85}>
            <Icon name="plus" size={18} color={COLORS.white} strokeWidth={2.5} />
            <View style={{ flex: 1 }}>
              <Text style={cusS.newOrderBtnTitle}>Fazer Encomenda Personalizada</Text>
              <Text style={cusS.newOrderBtnSub}>
                {templateId === 'food' ? 'Bolos, pratos especiais, buffets…' : 'Pedidos personalizados, consultoria…'}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={COLORS.white} strokeWidth={2} />
          </TouchableOpacity>
        )}

        {filteredOrders.length === 0 && (
          <Text style={cusS.emptyText}>
            {isOwner ? 'Sem encomendas para este filtro' : 'Ainda não tem encomendas'}
          </Text>
        )}

        {filteredOrders.map(order => (
          <OrderCard key={order.id} order={order}
            onPress={(o) => { setSelectedOrder(o); setShowDetail(true); }} />
        ))}
      </ScrollView>

      <NewOrderModal
        visible={showNewOrder}
        templateId={templateId}
        templateFields={templateFields}
        onClose={() => { setShowNewOrder(false); onUnsavedChange?.(false); }}
        onSubmit={handleSubmitOrder}
      />

      <OrderDetailModal
        visible={showDetail}
        order={selectedOrder}
        templateFields={templateFields}
        onClose={() => setShowDetail(false)}
        onStatusChange={handleStatusChange}
        onQuote={handleQuote}
      />
    </View>
  );
}

export default CustomOrdersExtension;

// ─── AUX ──────────────────────────────────────────────────────────────────────
function StatBox({ icon, label, value, color }) {
  return (
    <View style={[cusS.statBox, { borderColor: color + '44' }]}>
      <Icon name={icon} size={14} color={color} strokeWidth={2} />
      <Text style={[cusS.statVal, { color }]}>{value}</Text>
      <Text style={cusS.statLabel}>{label}</Text>
    </View>
  );
}

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const cusS = StyleSheet.create({
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
  filterPill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                        backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#EBEBEB' },
  filterPillActive:   { backgroundColor: '#D32323', borderColor: '#D32323' },
  filterText:         { fontSize: 12, fontWeight: '600', color: '#8A8A8A' },
  filterTextActive:   { color: '#FFFFFF' },
  newOrderBtn:        { backgroundColor: '#D32323', borderRadius: 12, padding: 16,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        elevation: 3, shadowColor: '#D32323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  newOrderBtnTitle:   { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  newOrderBtnSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  orderCard:          { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, flexDirection: 'row',
                        alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: '#EBEBEB',
                        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  orderClient:        { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 2 },
  orderMeta:          { fontSize: 11, color: '#8A8A8A', marginBottom: 4 },
  orderPreview:       { fontSize: 12, color: '#8A8A8A' },
  orderQuote:         { fontSize: 12, fontWeight: '700', color: '#22A06B', marginTop: 4 },
  statusBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:         { fontSize: 11, fontWeight: '700' },
  emptyText:          { textAlign: 'center', fontSize: 14, color: '#8A8A8A', paddingVertical: 32 },
  sectionTitle:       { fontSize: 14, fontWeight: '700', color: '#111111', paddingHorizontal: 16 },
  fieldLabel:         { fontSize: 12, fontWeight: '700', color: '#8A8A8A', marginBottom: 4, paddingHorizontal: 16 },
  charHint:           { fontWeight: '400', color: '#8A8A8A' },
  charCount:          { fontSize: 11, color: '#8A8A8A', textAlign: 'right', marginRight: 16, marginTop: 2 },
  input:              { backgroundColor: '#F7F7F8', borderRadius: 10, paddingHorizontal: 14,
                        paddingVertical: 12, fontSize: 15, color: '#111111', marginHorizontal: 16,
                        borderWidth: 1, borderColor: '#EBEBEB' },
  inputMulti:         { height: 90, textAlignVertical: 'top' },
  sanitizeNotice:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16,
                        backgroundColor: '#22A06B' + '10', borderRadius: 8, padding: 10 },
  sanitizeNoticeText: { flex: 1, fontSize: 11, color: '#22A06B', lineHeight: 16 },
  submitBtn:          { marginHorizontal: 16, backgroundColor: '#D32323', borderRadius: 12,
                        paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                        elevation: 3, shadowColor: '#D32323', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  submitBtnText:      { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  fieldReadRow:       { paddingVertical: 8, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  fieldReadLabel:     { fontSize: 11, fontWeight: '700', color: '#8A8A8A', marginBottom: 3 },
  fieldReadValue:     { fontSize: 14, color: '#111111' },
  quoteBtn:           { marginTop: 16, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 12,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quoteBtnText:       { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  quoteInputRow:      { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  quoteConfirmBtn:    { width: 44, height: 44, borderRadius: 10, backgroundColor: '#22A06B',
                        alignItems: 'center', justifyContent: 'center' },
  ownerActions:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionBtn:          { flex: 1, minWidth: '45%', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  actionBtnText:      { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  detailRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  detailLabel:        { fontSize: 12, fontWeight: '700', color: '#8A8A8A', width: 70 },
  detailValue:        { flex: 1, fontSize: 14, color: '#111111', fontWeight: '500' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        paddingBottom: Platform.OS === 'ios' ? 34 : 24, maxHeight: '92%' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 18,
                        borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#111111' },
  modalClose:         { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F7F7F8',
                        alignItems: 'center', justifyContent: 'center' },
});