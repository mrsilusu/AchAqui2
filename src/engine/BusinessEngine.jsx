/**
 * ============================================================================
 * BUSINESS ENGINE  (v2.10.0)
 * ============================================================================
 * O "Cérebro de Distribuição" — lê o businessType de um negócio e devolve
 * o módulo operacional correcto.
 *
 * FLUXO:
 *   BusinessDetailModal → BusinessEngine → [HospitalityModule | BeautyModule | ...]
 *
 * PROPS RECEBIDAS:
 *   business        : Business         — objeto completo do negócio (do AppContext)
 *   mode            : 'client'|'owner' — quem está a ver
 *   onBookingDone?  : () => void       — callback após reserva confirmada
 *   onClose?        : () => void       — fechar o detalhe
 *
 * CONTRATOS DE DADOS (NestJS ready):
 *
 *   BusinessType (enum no backend):
 *     'hospitality'    → GET /modules/hospitality/:bizId
 *     'beauty_wellness'→ GET /modules/beauty/:bizId
 *     'dining'         → GET /modules/dining/:bizId
 *     'health'         → GET /modules/health/:bizId
 *     'education'      → GET /modules/education/:bizId
 *     'pro_services'   → GET /modules/pro-services/:bizId
 *     'events'         → GET /modules/events/:bizId
 *     [auxiliares]
 *     'delivery'       → GET /modules/delivery/:bizId  (injectável)
 *     'custom_orders'  → GET /modules/custom-orders/:bizId (injectável)
 *
 *   Todos os módulos recebem o mesmo contrato base (ModuleProps):
 *   {
 *     business: Business,
 *     mode: 'client' | 'owner',
 *     onBookingDone?: () => void,
 *     onClose?: () => void,
 *   }
 *
 * ROADMAP:
 *   Fase 2 → substituir HospitalityPlaceholder por HospitalityModule real
 *             (lógica de noites/iCal extraída de app_v2_9_32.jsx)
 *   Fase 2 → substituir BeautyPlaceholder por BeautyModule real (slots/horas)
 *   Fase 3 → DiningModule, HealthModule, ProServicesModule
 *   Fase 4 → DeliveryExtension, CustomOrdersExtension (injectáveis)
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform,
} from 'react-native';

// ── Importações do Core ───────────────────────────────────────────────────────
// Cada módulo importa o que precisa do Core para ser independente.
// Em Fase 2+, os módulos também podem ter os seus próprios COLORS locais
// se precisarem de identidade visual distinta.
import {
  Icon, COLORS, formatCurrency, renderStars,
  BUSINESS_TYPE_BADGES,
} from './AcheiAqui_Core';

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO: businessType → módulo operacional
// Esta tabela é a fonte única de verdade para o roteamento.
// Em Fase 2+: importar o componente real em vez do placeholder.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza o businessType vindo do backend/mock para o enum interno.
 * Necessário porque o mock usa 'accommodation', 'food', etc.
 * O NestJS usará os valores canónicos deste enum.
 */
const normalizeBusinessType = (business) => {
  const raw = (business?.businessType || '').toLowerCase();
  const moduleMap = business?.modules || {};

  // Ordem de prioridade: módulo mais específico primeiro
  if (raw === 'accommodation' || raw === 'hospitality' || moduleMap.accommodation) return 'hospitality';
  if (raw === 'beauty' || raw === 'beauty_wellness' || moduleMap.health)            return 'beauty_wellness';
  if (raw === 'food' || moduleMap.gastronomy)                                        return 'dining';
  if (raw === 'health')                                                               return 'health';
  if (raw === 'education')                                                            return 'education';
  if (raw === 'professional' || raw === 'pro_services')                              return 'pro_services';
  if (raw === 'entertainment' || raw === 'events')                                   return 'events';
  if (raw === 'retail')                                                               return 'dining'; // fallback até DiningModule ter secção retail
  return 'generic';
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MODULE WRAPPER
// Envolve cada placeholder/módulo com header consistente e scroll.
// Fase 2+: os módulos reais podem usar este wrapper ou ter o seu próprio.
// ─────────────────────────────────────────────────────────────────────────────
function ModuleWrapper({ business, type, color, icon, title, subtitle, children, mode }) {
  const badge = BUSINESS_TYPE_BADGES[type] || BUSINESS_TYPE_BADGES.other;
  return (
    <ScrollView style={mwS.scroll} contentContainerStyle={mwS.content} showsVerticalScrollIndicator={false}>
      {/* Module identity header */}
      <View style={[mwS.moduleHeader, { borderLeftColor: color || badge.color }]}>
        <View style={[mwS.moduleIconWrap, { backgroundColor: (color || badge.color) + '18' }]}>
          <Text style={mwS.moduleEmoji}>{icon || badge.icon}</Text>
        </View>
        <View style={mwS.moduleHeaderText}>
          <Text style={[mwS.moduleTitle, { color: color || badge.color }]}>{title}</Text>
          <Text style={mwS.moduleSubtitle}>{subtitle}</Text>
        </View>
        <View style={[mwS.moduleStatusPill, { backgroundColor: (color || badge.color) + '18' }]}>
          <Text style={[mwS.moduleStatusText, { color: color || badge.color }]}>
            {mode === 'owner' ? '⚙ Dono' : '👁 Cliente'}
          </Text>
        </View>
      </View>
      {children}
    </ScrollView>
  );
}

const mwS = StyleSheet.create({
  scroll:          { flex: 1 },
  content:         { padding: 16, paddingBottom: 40 },
  moduleHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 4, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  moduleIconWrap:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moduleEmoji:     { fontSize: 22 },
  moduleHeaderText:{ flex: 1 },
  moduleTitle:     { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  moduleSubtitle:  { fontSize: 12, color: COLORS.grayText, marginTop: 1 },
  moduleStatusPill:{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  moduleStatusText:{ fontSize: 10, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER COMPONENT
// Usado em todos os módulos da Fase 1.
// Mostra o estado do módulo, o contrato de dados esperado e o roadmap.
// ─────────────────────────────────────────────────────────────────────────────
function ModulePlaceholder({ moduleKey, phase, apiEndpoint, dataContract, features, color, auxiliaries }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[phS.card, { borderColor: color + '40' }]}>
      {/* Status banner */}
      <View style={[phS.banner, { backgroundColor: color + '12' }]}>
        <View style={phS.bannerLeft}>
          <View style={[phS.phaseBadge, { backgroundColor: color }]}>
            <Text style={phS.phaseText}>FASE {phase}</Text>
          </View>
          <Text style={[phS.moduleKey, { color }]}>{moduleKey}</Text>
        </View>
        <View style={[phS.statusDot, { backgroundColor: color }]} />
      </View>

      {/* API endpoint */}
      <View style={phS.endpointRow}>
        <Icon name="globe" size={12} color={COLORS.grayText} strokeWidth={2} />
        <Text style={phS.endpoint}>{apiEndpoint}</Text>
      </View>

      {/* Features list */}
      <View style={phS.featuresList}>
        {features.map((f, i) => (
          <View key={i} style={phS.featureRow}>
            <View style={[phS.featureDot, { backgroundColor: color }]} />
            <Text style={phS.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Data contract (expandível) */}
      <TouchableOpacity style={phS.contractToggle} onPress={() => setExpanded(e => !e)}>
        <Icon name="portfolio" size={12} color={COLORS.grayText} strokeWidth={2} />
        <Text style={phS.contractToggleText}>Contrato de dados NestJS</Text>
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} color={COLORS.grayText} strokeWidth={2} />
      </TouchableOpacity>
      {expanded && (
        <View style={phS.contractBox}>
          <Text style={phS.contractCode}>{dataContract}</Text>
        </View>
      )}

      {/* Auxiliaries */}
      {auxiliaries && auxiliaries.length > 0 && (
        <View style={phS.auxRow}>
          <Icon name="plus" size={11} color={COLORS.grayText} strokeWidth={2} />
          <Text style={phS.auxText}>Extensões injectáveis: {auxiliaries.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

const phS = StyleSheet.create({
  card:          { borderWidth: 1.5, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.white, marginBottom: 12 },
  banner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  bannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  phaseText:     { fontSize: 9, fontWeight: '800', color: COLORS.white, letterSpacing: 0.8 },
  moduleKey:     { fontSize: 14, fontWeight: '800' },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  endpointRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.grayBg },
  endpoint:      { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.grayText },
  featuresList:  { padding: 12, gap: 6 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureDot:    { width: 6, height: 6, borderRadius: 3 },
  featureText:   { fontSize: 12, color: COLORS.darkText },
  contractToggle:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.grayLine },
  contractToggleText: { flex: 1, fontSize: 11, color: COLORS.grayText },
  contractBox:   { margin: 12, marginTop: 0, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 12 },
  contractCode:  { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#9CDCFE', lineHeight: 16 },
  auxRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  auxText:       { fontSize: 11, color: COLORS.grayText, fontStyle: 'italic' },
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 1 — HOSPITALITY (Fase 2)
// Gestão de noites, iCal, quartos, disponibilidade, reservas
// Lógica actual: app_v2_9_32.jsx linhas ~1895-2115 + modais ~4900-5500
// ─────────────────────────────────────────────────────────────────────────────
function HospitalityModule({ business, mode, onBookingDone, onClose }) {
  return (
    <ModuleWrapper
      business={business} type="accommodation" mode={mode}
      color="#0EA5E9" icon="🏨"
      title="Módulo Hospitality"
      subtitle="Gestão de noites · iCal · Quartos · Reservas"
    >
      <ModulePlaceholder
        moduleKey="hospitality"
        phase={2}
        apiEndpoint="GET /modules/hospitality/:bizId"
        color="#0EA5E9"
        features={[
          'Tipos de quarto com totalRooms e preço por noite',
          'Motor de preços dinâmicos (seasonalRates + weekendMultiplier)',
          'Sincronização iCal → NestJS → Redis (TTL 15min)',
          'Disponibilidade availability_nights em tempo real',
          'Booking flow 2 passos: datas → confirmação',
          'Seletor de hóspedes (adultos + crianças)',
          'Pedido especial + pagamento na chegada toggle',
          'Auto-confirmação por quarto (autoConfirmBookings)',
          'Voucher ACH-XXXXXXXX pós reserva',
          'Histórico de estadias + prompt de avaliação',
          'Comparação de quartos (side-by-side)',
          'Mapa OpenStreetMap com todos os alojamentos',
        ]}
        dataContract={`// availability_nights (PostgreSQL)
{
  id: string,
  business_id: string,
  room_type_id: string,
  date_start: Date,       // "YYYY-MM-DD"
  date_end: Date,         // "YYYY-MM-DD"
  count: number,          // quartos ocupados neste range
  source: 'manual'|'ical'|'booking',
}

// room_bookings
{
  id: string,
  business_id: string,
  room_type_id: string,
  guest_name: string,
  guest_phone: string,
  check_in: Date,
  check_out: Date,
  room_qty: number,
  adults: number,
  children: number,
  special_request?: string,
  pay_on_arrival: boolean,
  status: 'pending'|'confirmed'|'confirmed_unpaid'
         |'confirmed_paid'|'cancelled',
  total_amount: number,   // subtotal + IVA
  commission_rate: number,// ex: 0.10 — calculado no backend
  reference: string,      // ACH-XXXXXXXX
}`}
        auxiliaries={['delivery', 'custom_orders']}
      />

      {/* CTA placeholder — Fase 2 substituirá por HotelBookingSheet real */}
      <TouchableOpacity
        style={[engS.ctaBtn, { backgroundColor: '#0EA5E9' }]}
        activeOpacity={0.85}
        onPress={() => onBookingDone?.()}
      >
        <Icon name="reservation" size={18} color={COLORS.white} strokeWidth={2} />
        <Text style={engS.ctaBtnText}>Reservar Quarto</Text>
        <Text style={engS.ctaBtnSub}>Disponível na Fase 2</Text>
      </TouchableOpacity>
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — BEAUTY & WELLNESS (Fase 2)
// Gestão de slots/horas, agenda de profissionais
// ─────────────────────────────────────────────────────────────────────────────
function BeautyWellnessModule({ business, mode, onBookingDone }) {
  return (
    <ModuleWrapper
      business={business} type="beauty" mode={mode}
      color="#EC4899" icon="💅"
      title="Módulo Beauty & Wellness"
      subtitle="Slots por hora · Agenda · Profissionais"
    >
      <ModulePlaceholder
        moduleKey="beauty_wellness"
        phase={2}
        apiEndpoint="GET /modules/beauty/:bizId"
        color="#EC4899"
        features={[
          'Agenda por profissional (barbeiros, cabeleireiros, etc.)',
          'Slots de 30/45/60 min configuráveis pelo dono',
          'Reserva de hora com confirmação automática ou manual',
          'Bloqueio de dias de folga e feriados',
          'Lista de serviços com preço e duração',
          'Lembretes por notificação push (NestJS + FCM)',
        ]}
        dataContract={`// availability_slots (PostgreSQL)
{
  id: string,
  business_id: string,
  practitioner_id?: string, // se multi-profissional
  date: Date,               // "YYYY-MM-DD"
  time_start: string,       // "HH:MM"
  time_end: string,         // "HH:MM"
  duration_minutes: number, // 30|45|60|90
  is_booked: boolean,
  booking_id?: string,
}

// slot_bookings
{
  id: string,
  business_id: string,
  slot_id: string,
  client_name: string,
  client_phone: string,
  service_id: string,
  service_price: number,
  status: 'pending'|'confirmed'|'cancelled',
  notes?: string,
}`}
        auxiliaries={['delivery']}
      />
      <TouchableOpacity style={[engS.ctaBtn, { backgroundColor: '#EC4899' }]} activeOpacity={0.85}>
        <Icon name="appointment" size={18} color={COLORS.white} strokeWidth={2} />
        <Text style={engS.ctaBtnText}>Marcar Hora</Text>
        <Text style={engS.ctaBtnSub}>Disponível na Fase 2</Text>
      </TouchableOpacity>
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 3 — DINING (Fase 3)
// Gestão de mesas, reservas de restaurante, menu
// ─────────────────────────────────────────────────────────────────────────────
function DiningModule({ business, mode, onBookingDone }) {
  return (
    <ModuleWrapper
      business={business} type="food" mode={mode}
      color="#EA580C" icon="🍴"
      title="Módulo Dining"
      subtitle="Mesas · Reservas · Menu · Gastronomia"
    >
      <ModulePlaceholder
        moduleKey="dining"
        phase={3}
        apiEndpoint="GET /modules/dining/:bizId"
        color="#EA580C"
        features={[
          'Planta do restaurante com mesas numeradas',
          'Reserva de mesa: data, hora, número de pessoas',
          'Menu digital com categorias e preços',
          'Lista de espera quando lotado (waitlist)',
          'Pratos populares e destaques do dia',
          'Integração com Delivery e Custom Orders',
        ]}
        dataContract={`// table_bookings
{
  id: string,
  business_id: string,
  table_id: string,
  party_size: number,
  booking_date: Date,
  booking_time: string, // "HH:MM"
  client_name: string,
  client_phone: string,
  status: 'pending'|'confirmed'|'seated'|'cancelled',
  special_request?: string,
}`}
        auxiliaries={['delivery', 'custom_orders']}
      />
      <TouchableOpacity style={[engS.ctaBtn, { backgroundColor: '#EA580C' }]} activeOpacity={0.85}>
        <Icon name="reservation" size={18} color={COLORS.white} strokeWidth={2} />
        <Text style={engS.ctaBtnText}>Reservar Mesa</Text>
        <Text style={engS.ctaBtnSub}>Disponível na Fase 3</Text>
      </TouchableOpacity>
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 4 — HEALTH (Fase 3)
// Consultas médicas, exames, clínicas
// ─────────────────────────────────────────────────────────────────────────────
function HealthModule({ business, mode }) {
  return (
    <ModuleWrapper
      business={business} type="health" mode={mode}
      color="#10B981" icon="🏥"
      title="Módulo Health"
      subtitle="Consultas · Exames · Clínicas · Médicos"
    >
      <ModulePlaceholder
        moduleKey="health"
        phase={3}
        apiEndpoint="GET /modules/health/:bizId"
        color="#10B981"
        features={[
          'Agendamento de consultas por especialidade',
          'Lista de médicos/profissionais por clínica',
          'Exames com data de resultado estimada',
          'Histórico de consultas do paciente (privado)',
          'Telemedicina via link (futuro)',
        ]}
        dataContract={`// health_appointments
{
  id: string,
  business_id: string,
  practitioner_id: string,
  patient_name: string,
  patient_phone: string,
  specialty: string,
  appointment_date: Date,
  appointment_time: string,
  appointment_type: 'consultation'|'exam'|'followup',
  status: 'pending'|'confirmed'|'completed'|'cancelled',
  notes?: string,
}`}
      />
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 5 — EDUCATION (Fase 3)
// Aulas, explicações, cursos
// ─────────────────────────────────────────────────────────────────────────────
function EducationModule({ business, mode }) {
  return (
    <ModuleWrapper
      business={business} type="education" mode={mode}
      color="#DC2626" icon="🎓"
      title="Módulo Education"
      subtitle="Aulas · Explicações · Cursos · Formações"
    >
      <ModulePlaceholder
        moduleKey="education"
        phase={3}
        apiEndpoint="GET /modules/education/:bizId"
        color="#DC2626"
        features={[
          'Catálogo de cursos e aulas com preço/hora',
          'Agendamento de sessões individuais ou em grupo',
          'Modo online (link) e presencial',
          'Progresso do aluno e certificados',
          'Gestão de turmas com limite de vagas',
        ]}
        dataContract={`// education_sessions
{
  id: string,
  business_id: string,
  course_id: string,
  instructor_id?: string,
  session_date: Date,
  start_time: string,
  duration_minutes: number,
  mode: 'online'|'in_person',
  max_students: number,
  enrolled_count: number,
  price: number,
  status: 'open'|'full'|'completed'|'cancelled',
}`}
      />
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 6 — PRO SERVICES (Fase 3)
// Consultoria, advogados, contabilistas, freelancers
// ─────────────────────────────────────────────────────────────────────────────
function ProServicesModule({ business, mode }) {
  return (
    <ModuleWrapper
      business={business} type="professional" mode={mode}
      color="#059669" icon="👔"
      title="Módulo Pro Services"
      subtitle="Consultoria · Jurídico · Financeiro · Freelance"
    >
      <ModulePlaceholder
        moduleKey="pro_services"
        phase={3}
        apiEndpoint="GET /modules/pro-services/:bizId"
        color="#059669"
        features={[
          'Pedido de orçamento com descrição do projeto',
          'Agendamento de reunião/consulta inicial',
          'Portfólio de trabalhos anteriores',
          'Avaliação pós-serviço com testemunhos',
          'Disponibilidade por agenda (availability_slots)',
          'Integração com Custom Orders para projetos longos',
        ]}
        dataContract={`// service_requests
{
  id: string,
  business_id: string,
  client_name: string,
  client_phone: string,
  service_type: string,
  description: string,
  budget_range?: string,
  preferred_date?: Date,
  status: 'new'|'quoted'|'accepted'|'in_progress'|'completed'|'cancelled',
  quote_amount?: number,
  commission_rate: number, // calculado no backend
}`}
        auxiliaries={['custom_orders']}
      />
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 7 — EVENTS (Fase 3)
// Aluguer de espaços e salas para eventos
// ─────────────────────────────────────────────────────────────────────────────
function EventsModule({ business, mode }) {
  return (
    <ModuleWrapper
      business={business} type="entertainment" mode={mode}
      color="#7C3AED" icon="🎭"
      title="Módulo Events"
      subtitle="Espaços · Salas · Eventos · Aluguer"
    >
      <ModulePlaceholder
        moduleKey="events"
        phase={3}
        apiEndpoint="GET /modules/events/:bizId"
        color="#7C3AED"
        features={[
          'Catálogo de espaços com capacidade e preço',
          'Reserva por dia inteiro ou meio-dia',
          'Lista de equipamentos incluídos/alugáveis',
          'Gestão de catering opcional',
          'Contrato digital de reserva (PDF gerado)',
          'Integração com iCal para conflitos',
        ]}
        dataContract={`// event_bookings
{
  id: string,
  business_id: string,
  space_id: string,
  organizer_name: string,
  organizer_phone: string,
  event_date: Date,
  start_time: string,
  end_time: string,
  guest_count: number,
  event_type: string,
  catering_included: boolean,
  total_amount: number,
  status: 'pending'|'confirmed'|'cancelled',
}`}
        auxiliaries={['delivery', 'custom_orders']}
      />
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTENSÃO AUXILIAR 1 — DELIVERY (Fase 4, injectável)
// Pode ser ligado a Dining, Hospitality, Beauty
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryExtension({ business, mode }) {
  return (
    <View style={extS.card}>
      <View style={[extS.header, { backgroundColor: '#78716C18' }]}>
        <Text style={extS.emoji}>🚚</Text>
        <View style={{ flex: 1 }}>
          <Text style={[extS.title, { color: '#78716C' }]}>Extensão Delivery</Text>
          <Text style={extS.subtitle}>Injectável em Dining / Hospitality / Beauty</Text>
        </View>
        <View style={[extS.phaseBadge, { backgroundColor: '#78716C' }]}>
          <Text style={extS.phaseText}>FASE 4</Text>
        </View>
      </View>
      <View style={extS.body}>
        <Text style={extS.bodyText}>Zonas de entrega · Taxas · Estado em tempo real · Bull/Redis</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTENSÃO AUXILIAR 2 — CUSTOM ORDERS (Fase 4, injectável)
// Pode ser ligado a Dining, Hospitality, Pro Services
// ─────────────────────────────────────────────────────────────────────────────
function CustomOrdersExtension({ business, mode }) {
  return (
    <View style={extS.card}>
      <View style={[extS.header, { backgroundColor: '#8B5CF618' }]}>
        <Text style={extS.emoji}>📦</Text>
        <View style={{ flex: 1 }}>
          <Text style={[extS.title, { color: '#8B5CF6' }]}>Extensão Custom Orders</Text>
          <Text style={extS.subtitle}>Injectável em Dining / Hospitality / Pro Services</Text>
        </View>
        <View style={[extS.phaseBadge, { backgroundColor: '#8B5CF6' }]}>
          <Text style={extS.phaseText}>FASE 4</Text>
        </View>
      </View>
      <View style={extS.body}>
        <Text style={extS.bodyText}>Encomendas personalizadas · Orçamento · Prazo · Pagamento parcial</Text>
      </View>
    </View>
  );
}

const extS = StyleSheet.create({
  card:       { borderWidth: 1, borderColor: COLORS.grayLine, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  emoji:      { fontSize: 20 },
  title:      { fontSize: 13, fontWeight: '700' },
  subtitle:   { fontSize: 11, color: COLORS.grayText, marginTop: 1 },
  phaseBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  phaseText:  { fontSize: 9, fontWeight: '800', color: COLORS.white, letterSpacing: 0.8 },
  body:       { paddingHorizontal: 12, paddingBottom: 10 },
  bodyText:   { fontSize: 11, color: COLORS.grayText },
});

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO GENÉRICO — fallback para tipos não mapeados
// ─────────────────────────────────────────────────────────────────────────────
function GenericModule({ business, mode }) {
  return (
    <ModuleWrapper
      business={business} type="other" mode={mode}
      color={COLORS.grayText} icon="🏢"
      title="Negócio"
      subtitle="Perfil de negócio geral"
    >
      <View style={engS.infoCard}>
        <Icon name="info" size={16} color={COLORS.grayText} strokeWidth={2} />
        <Text style={engS.infoText}>
          Este tipo de negócio ({business?.businessType || 'desconhecido'}) ainda não tem
          um módulo operacional dedicado. O perfil completo está disponível no separador
          Informações.
        </Text>
      </View>
    </ModuleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS ENGINE — componente principal exportado
//
// Props:
//   business        : Business   (obrigatório)
//   mode            : 'client' | 'owner'  (default: 'client')
//   onBookingDone?  : () => void
//   onClose?        : () => void
//   showAuxiliaries?: boolean    (default: true — mostra extensões disponíveis)
// ─────────────────────────────────────────────────────────────────────────────
export function BusinessEngine({ business, mode = 'client', onBookingDone, onClose, showAuxiliaries = true }) {
  if (!business) {
    return (
      <View style={engS.errorWrap}>
        <Icon name="alertCircle" size={32} color={COLORS.grayText} strokeWidth={1.5} />
        <Text style={engS.errorTitle}>Negócio não encontrado</Text>
        <Text style={engS.errorSub}>Não foi possível carregar os dados deste negócio.</Text>
      </View>
    );
  }

  const type = normalizeBusinessType(business);
  const hasDelivery     = business?.modules?.delivery;
  const hasCustomOrders = business?.modules?.customorder;

  // Seleccionar módulo com base no tipo normalizado
  const renderModule = () => {
    switch (type) {
      case 'hospitality':    return <HospitalityModule    business={business} mode={mode} onBookingDone={onBookingDone} onClose={onClose} />;
      case 'beauty_wellness':return <BeautyWellnessModule business={business} mode={mode} onBookingDone={onBookingDone} />;
      case 'dining':         return <DiningModule         business={business} mode={mode} onBookingDone={onBookingDone} />;
      case 'health':         return <HealthModule         business={business} mode={mode} />;
      case 'education':      return <EducationModule      business={business} mode={mode} />;
      case 'pro_services':   return <ProServicesModule    business={business} mode={mode} />;
      case 'events':         return <EventsModule         business={business} mode={mode} />;
      default:               return <GenericModule        business={business} mode={mode} />;
    }
  };

  return (
    <View style={engS.container}>
      {/* Módulo principal */}
      {renderModule()}

      {/* Extensões auxiliares disponíveis para este negócio */}
      {showAuxiliaries && (hasDelivery || hasCustomOrders) && (
        <View style={engS.auxSection}>
          <Text style={engS.auxSectionLabel}>EXTENSÕES ACTIVAS</Text>
          {hasDelivery     && <DeliveryExtension     business={business} mode={mode} />}
          {hasCustomOrders && <CustomOrdersExtension business={business} mode={mode} />}
        </View>
      )}
    </View>
  );
}

const engS = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.grayBg },
  errorWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.darkText },
  errorSub:        { fontSize: 13, color: COLORS.grayText, textAlign: 'center' },
  ctaBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, marginTop: 8 },
  ctaBtnText:      { fontSize: 15, fontWeight: '800', color: COLORS.white },
  ctaBtnSub:       { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  infoCard:        { flexDirection: 'row', gap: 10, backgroundColor: COLORS.grayBg, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  infoText:        { flex: 1, fontSize: 13, color: COLORS.grayText, lineHeight: 20 },
  auxSection:      { paddingHorizontal: 16, paddingBottom: 16 },
  auxSectionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.grayText, letterSpacing: 1, marginBottom: 8 },
});

export default BusinessEngine;
