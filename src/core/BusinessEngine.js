/**
 * ============================================================================
 * ACHEIAQUI — BUSINESS ENGINE  (v4.0.0 — Fase 4 — DeliveryExtension + CustomOrdersExtension)
 * ============================================================================
 * Fase 2: HospitalityModule e BeautyWellnessModule FUNCIONAIS (substituem placeholders)
 * Fase 3: DiningModule, HealthModule, EducationModule, ProServicesModule, EventsModule
 * Fase 4: DeliveryExtension, CustomOrdersExtension
 *
 * SEGURANÇA SaaS Multi-tenant:
 *   ✅ ownerMode calculado internamente — nunca confia só na prop
 *   ✅ tenantId passado a cada módulo de forma segura
 *   ✅ Módulos validam internamente: ownerMode && tenantId === business.id
 *   ✅ Nenhum módulo recebe dados privados directamente — acede via useAppContext
 *
 * AVALIAÇÃO DE RISCO — Colisão de Memória entre Módulos:
 *   ✅ BusinessEngine desmonta o módulo anterior ao trocar de negócio
 *   ✅ HospitalityModule usa availability_nights (DateString)
 *      BeautyWellnessModule usa availability_slots (TimeString)
 *      → tipos e chaves de estado completamente diferentes, zero colisão
 *   ✅ Cada módulo tem useEffect(() => cleanup, [business.id]) como segunda linha
 *   ✅ availabilityCache = useRef (não state) — sem re-renders cruzados
 *   ✅ roomBookings e slotBookings são estados locais de cada módulo
 *      → nunca partilhados, nunca colisão
 *
 * PROPS SEGURAS PASSADAS A CADA MÓDULO:
 *   business   — dados públicos (stripPrivateFields aplicado no Core)
 *   ownerMode  — calculado aqui via useMemo (prop + tenantId check)
 *   tenantId   — do AppContext (imutável, vem do JWT)
 *   → Cada módulo faz a sua própria verificação: ownerMode && tenantId === business.id
 * ============================================================================
 */

import React, { useMemo, useCallback, useEffect, useRef, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert,
} from 'react-native';
import { AppContext, Icon, COLORS } from './AcheiAqui_Core';

// ── Fase 2: Módulos FUNCIONAIS ───────────────────────────────────────────────
import { HospitalityModule }   from '../operations/HospitalityModule';
import { BeautyWellnessModule } from '../operations/BeautyWellnessModule';

// ── Fase 3: Módulos FUNCIONAIS ────────────────────────────────────────────────
import { DiningModule }        from '../operations/DiningModule';
import { ProfessionalModule }  from '../operations/ProfessionalModule';

// ── Fase 4: Extensões injectáveis FUNCIONAIS ────────────────────────────────
import { DeliveryExtension }      from '../extensions/DeliveryExtension';
import { CustomOrdersExtension }  from '../extensions/CustomOrdersExtension';
// ── Fase 4+: Placeholders (módulos futuros) ──────────────────────────────────
// import { EducationModule }   from './modules/EducationModule';
// import { EventsModule }      from './modules/EventsModule';

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DE TIPO DE NEGÓCIO
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeBusinessType(business) {
  if (!business) return 'generic';
  const bt   = (business.businessType || '').toLowerCase();
  const mods = business.modules || {};

  // businessType tem PRIORIDADE ABSOLUTA sobre módulos
  // Evita falsos positivos (ex: restaurante com mods.accommodation -> hospitality errado)
  if (bt === 'accommodation')                              return 'hospitality';
  if (bt === 'health' || bt === 'clinic' || bt === 'medical') return 'health';
  if (bt === 'professional' || bt === 'freelancer' || bt === 'consulting') return 'pro_services';
  if (bt === 'food' || bt === 'restaurant' || bt === 'cafe' || bt === 'bar') return 'dining';
  if (bt === 'beauty')                                     return 'beauty_wellness';
  if (bt === 'education' || bt === 'school')               return 'education';
  if (bt === 'entertainment' || bt === 'nightlife')        return 'events';

  // Fallback por módulos — apenas quando businessType não é conclusivo
  if (mods.accommodation)  return 'hospitality';
  if (mods.gastronomy)     return 'dining';
  if (mods.health)         return 'health';
  if (mods.professional)   return 'pro_services';
  if (mods.education)      return 'education';
  if (mods.events)         return 'events';
  return 'generic';
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE PLACEHOLDER — para módulos da Fase 3+
// ─────────────────────────────────────────────────────────────────────────────
function ModulePlaceholder({ label, icon, phase, apiEndpoint, ownerMode }) {
  const [expanded, setExpanded] = React.useState(false);
  const phaseColor = phase === 3 ? '#7C3AED' : '#D97706';
  return (
    <View style={engS.moduleCard}>
      <View style={engS.moduleHeader}>
        <View style={[engS.moduleIconWrap, { backgroundColor: phaseColor + '18' }]}>
          <Text style={engS.moduleIconText}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={engS.moduleLabel}>{label}</Text>
          <View style={[engS.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
            <Text style={[engS.phaseText, { color: phaseColor }]}>Fase {phase} — Em desenvolvimento</Text>
          </View>
        </View>
      </View>
      {ownerMode && (
        <View style={engS.rbacBadge}>
          <Icon name="verified" size={12} color={COLORS.green} strokeWidth={2.5} />
          <Text style={engS.rbacText}>Modo Gestão — tenantId verificado</Text>
        </View>
      )}
      <TouchableOpacity onPress={() => setExpanded(p => !p)} style={engS.contractToggle}>
        <Text style={engS.contractToggleText}>{expanded ? '▲ Ocultar' : '▶ Ver endpoint'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={engS.contractDetail}>
          <Text style={engS.contractDetailText}>{apiEndpoint}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS ENGINE — router principal com RBAC enforcement
// ─────────────────────────────────────────────────────────────────────────────
export function BusinessEngine({ business, mode = 'client', onBookingDone, onClose, onBack, onProcessingChange }) {
  // Safe context read — falls back gracefully when outside AppProvider
  const ctx = useContext(AppContext);
  const isBusinessMode = ctx?.isBusinessMode ?? false;
  const tenantId       = ctx?.tenantId       ?? null;

  // ── RBAC: verificação dupla — prop + tenantId ─────────────────────────────
  // Previne escalada horizontal: Dono A nunca acede ao painel do Dono B
  const ownerMode = useMemo(() => {
    const propSaysOwner = mode === 'owner' || isBusinessMode;
    const tenantMatch   = tenantId === business?.id;
    return propSaysOwner && tenantMatch;
  }, [mode, isBusinessMode, tenantId, business?.id]);

  // ── Gesture Safety — swipe-back intercept ────────────────────────────────
  // Módulos de Fase 3 (Dining, Professional) notificam quando há dados não
  // guardados. Se o utilizador deslizar para trás, mostramos confirmação.
  const hasUnsavedData = useRef(false);
  const handleUnsavedChange = useCallback((hasData) => {
    hasUnsavedData.current = hasData;
  }, []);

  // isProcessingOrder — true enquanto DeliveryExtension processa pedido
  // Notifica o pai (BusinessDetailModal) para bloquear o gesto de swipe-back
  const isProcessingOrder = useRef(false);
  const handleProcessingChange = useCallback((processing) => {
    isProcessingOrder.current = processing;
    onProcessingChange?.(processing);
  }, [onProcessingChange]);

  // Purga de ghost data ao desmontar (gesture swipe-back ou close normal)
  useEffect(() => {
    return () => {
      hasUnsavedData.current = false;
      isProcessingOrder.current = false;
      onProcessingChange?.(false);
    };
  }, [business?.id]);

  // Handler seguro para retroceder — interceta se há dados não guardados
  const handleSafeBack = useCallback(() => {
    if (hasUnsavedData.current) {
      Alert.alert(
        'Sair sem guardar?',
        'Tem uma reserva ou marcação em curso. Deseja descartar e sair?',
        [
          { text: 'Continuar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: () => {
              hasUnsavedData.current = false;
              onBack?.();
            },
          },
        ],
      );
    } else {
      onBack?.();
    }
  }, [onBack]);

  if (!business) {
    return (
      <View style={engS.errorState}>
        <Text style={engS.errorText}>Negócio não encontrado</Text>
      </View>
    );
  }

  const type = normalizeBusinessType(business);
  const mods = business.modules || {};

  return (
    <ScrollView style={engS.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Indicador de tipo e modo */}
      <View style={engS.typeHeader}>
        <Text style={engS.typeLabel}>
          {type.replace('_', ' ').toUpperCase()}
        </Text>
        <View style={[engS.modeBadge, { backgroundColor: ownerMode ? COLORS.green + '22' : COLORS.blue + '18' }]}>
          <Text style={[engS.modeText, { color: ownerMode ? COLORS.green : COLORS.blue }]}>
            {ownerMode ? '🔐 Modo Gestão' : '👁️ Modo Cliente'}
          </Text>
        </View>
      </View>

      {/* ── MÓDULOS FASE 2 — FUNCIONAIS ──────────────────────────────── */}
      {type === 'hospitality' && (
        <HospitalityModule
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
        />
      )}

      {type === 'beauty_wellness' && (
        <BeautyWellnessModule
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
        />
      )}

      {/* Multi-módulo: negócio com accommodation + beauty activos */}
      {type !== 'hospitality' && mods.accommodation && (
        <HospitalityModule business={business} ownerMode={ownerMode} tenantId={tenantId} />
      )}

      {/* ── MÓDULOS FASE 3 — PLACEHOLDERS ───────────────────────────── */}
      {type === 'dining' && (
        <DiningModule
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
          onUnsavedChange={handleUnsavedChange}
        />
      )}
      {type === 'health' && (
        <ProfessionalModule
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
          onUnsavedChange={handleUnsavedChange}
        />
      )}
      {type === 'education' && (
        <ModulePlaceholder label="Educação & Formação" icon="🎓" phase={3}
          apiEndpoint={`GET /modules/education/${business.id}`} ownerMode={ownerMode} />
      )}
      {type === 'pro_services' && (
        <ProfessionalModule
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
          onUnsavedChange={handleUnsavedChange}
        />
      )}
      {type === 'events' && (
        <ModulePlaceholder label="Eventos & Espaços" icon="🎭" phase={3}
          apiEndpoint={`GET /modules/events/${business.id}`} ownerMode={ownerMode} />
      )}
      {type === 'generic' && (
        <ModulePlaceholder label="Módulo Genérico" icon="🏢" phase={3}
          apiEndpoint={`GET /modules/generic/${business.id}`} ownerMode={ownerMode} />
      )}

      {/* ── EXTENSÕES FASE 4 — Injectáveis sobre qualquer módulo ─────── */}
      {/* SANDBOXING: extensões só partilham tenantId com o módulo pai —     */}
      {/* nunca acedem ao estado interno de DiningModule/HospitalityModule   */}
      {mods.delivery && (
        <DeliveryExtension
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
          onUnsavedChange={handleUnsavedChange}
          onProcessingChange={handleProcessingChange}
        />
      )}
      {mods.customorder && (
        <CustomOrdersExtension
          business={business}
          ownerMode={ownerMode}
          tenantId={tenantId}
          onUnsavedChange={handleUnsavedChange}
        />
      )}

    </ScrollView>
  );
}

export default BusinessEngine;

// ─────────────────────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
const engS = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F7F7F8' },
  typeHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF',
                      borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  typeLabel:        { fontSize: 11, fontWeight: '700', color: '#8A8A8A', letterSpacing: 0.8 },
  modeBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modeText:         { fontSize: 12, fontWeight: '700' },
  rbacBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
                      paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#22A06B' + '10', borderRadius: 6 },
  rbacText:         { fontSize: 11, color: '#22A06B', fontWeight: '600' },
  moduleCard:       { margin: 12, marginBottom: 0, backgroundColor: '#FFFFFF', borderRadius: 12,
                      borderWidth: 1, borderColor: '#EBEBEB', padding: 14, elevation: 1,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  moduleHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  moduleIconWrap:   { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleIconText:   { fontSize: 22 },
  moduleLabel:      { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 4 },
  phaseBadge:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  phaseText:        { fontSize: 10, fontWeight: '700' },
  contractToggle:   { paddingVertical: 8, alignItems: 'center' },
  contractToggleText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  contractDetail:   { backgroundColor: '#1E1E1E', borderRadius: 8, padding: 12, marginTop: 4 },
  contractDetailText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                        color: '#9CDCFE', lineHeight: 18 },
  errorState:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText:        { fontSize: 16, color: '#8A8A8A' },
});