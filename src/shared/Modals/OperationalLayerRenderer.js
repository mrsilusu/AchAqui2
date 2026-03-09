/**
 * ============================================================================
 * OperationalLayerRenderer  (v1.0.0)
 * ============================================================================
 * Recebe o output de useOperationalLayer e renderiza o módulo sectorial
 * correcto numa <Animated.View> absoluta (cobre o BusinessDetailModal).
 *
 * Cada módulo é montado em isolamento: apenas existe no DOM quando a sua
 * camada está activa. Ao fechar, o componente desmonta e destrói todo o
 * estado local (anti-ghost-data multi-tenant).
 *
 * Props:
 *   layer        — output de useOperationalLayer()
 *   isOwner      — bool  (passado directamente aos módulos)
 *   tenantId     — string (= business.id, para RBAC nos módulos)
 *
 * Módulos suportados:
 *   'hospitality'  → HospitalityModule
 *   'dining'       → DiningModule
 *   'beauty'       → BeautyWellnessModule
 *   'professional' → ProfessionalModule
 * ============================================================================
 */

import React, { useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform, Dimensions, PanResponder,
} from 'react-native';

import { Icon, COLORS } from '../../core/AchAqui_Core';
import { backendApi } from '../../lib/backendApi';

import { HospitalityModule }    from '../../operations/HospitalityModule';
import { DiningModule }         from '../../operations/DiningModule';
import { BeautyWellnessModule } from '../../operations/BeautyWellnessModule';
import { ProfessionalModule }   from '../../operations/ProfessionalModule';

// ─────────────────────────────────────────────────────────────────────────────
// MAPA: layer id → { Component, title, emoji }
// ─────────────────────────────────────────────────────────────────────────────
const LAYER_MAP = {
  hospitality: {
    Component: HospitalityModule,
    title:     'Quartos & Disponibilidade',
    emoji:     '🛏️',
    color:     '#0EA5E9',
  },
  dining: {
    Component: DiningModule,
    title:     'Menu & Reservas de Mesa',
    emoji:     '🍽️',
    color:     '#EA580C',
  },
  beauty: {
    Component: BeautyWellnessModule,
    title:     'Marcações',
    emoji:     '✂️',
    color:     '#EC4899',
  },
  professional: {
    Component: ProfessionalModule,
    title:     'Agenda & Consultas',
    emoji:     '📅',
    color:     '#7C3AED',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL LAYER RENDERER
// ─────────────────────────────────────────────────────────────────────────────
export function OperationalLayerRenderer({ layer, isOwner, tenantId, accessToken, createBooking, liveBookings, updateOwnerBiz, ownerRoomBookings, onOwnerRoomBookingsChange, liveBusiness }) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top + (Platform.OS === 'android' ? 4 : 0);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  // ── Confirmar / Rejeitar reserva (owner) ─────────────────────────────────
  const handleStatusChange = useCallback(async (bookingId, newStatus) => {
    if (!accessToken) return;
    try {
      if (newStatus === 'rejected' || newStatus === 'cancelled') {
        await backendApi.rejectBooking(bookingId, {}, accessToken);
      } else {
        await backendApi.confirmBooking(bookingId, {}, accessToken);
      }
      // Supabase Realtime irá actualizar liveBookings automaticamente
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível actualizar a reserva.');
    }
  }, [accessToken]);

  // PanResponder próprio: swipe-right fecha a layer (não propaga para o modal pai)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (Math.abs(dx) < (Platform.OS === 'android' ? 8 : 4)) return false;
        if (Math.abs(dx) < Math.abs(dy) * 1.5) return false;
        return dx > 0;
      },
      onPanResponderGrant: () => layer.slideX.stopAnimation(),
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) layer.slideX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_WIDTH * 0.35 || vx > 0.85) {
          Animated.timing(layer.slideX, {
            toValue: SCREEN_WIDTH,
            duration: 240,
            useNativeDriver: true,
          }).start(() => layer.closeImmediate());
        } else {
          Animated.spring(layer.slideX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(layer.slideX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Não renderiza nada se não há camada activa
  if (!layer.activeLayer || !layer.activeBusiness) return null;

  const config  = LAYER_MAP[layer.activeLayer];
  if (!config) return null;

  const { Component, title, emoji, color } = config;
  const business = liveBusiness || layer.activeBusiness;

  // Filtrar bookings por tipo para cada módulo
  const roomLiveBookings = Array.isArray(liveBookings)
    ? liveBookings.filter(b => b.bookingType === 'ROOM' || b.bookingType === 'room')
    : [];
  const tableLiveBookings = Array.isArray(liveBookings)
    ? liveBookings.filter(b => b.bookingType === 'TABLE' || b.bookingType === 'table' || !b.bookingType)
    : [];
  const moduleBookings = layer.activeLayer === 'hospitality' ? roomLiveBookings : tableLiveBookings;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        s.container,
        { transform: [{ translateX: layer.slideX }] },
      ]}
      {...panResponder.panHandlers}
    >
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: safeTop + (Platform.OS === 'android' ? 8 : 4) }]}>
        <TouchableOpacity style={s.backBtn} onPress={layer.close} activeOpacity={0.75}>
          <Icon name="back" size={20} color={COLORS.darkText} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>{emoji}</Text>
          <View>
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={s.headerSub} numberOfLines={1}>{business.name}</Text>
          </View>
        </View>

        {/* Indicador de módulo activo */}
        <View style={[s.moduleBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <View style={[s.moduleDot, { backgroundColor: color }]} />
          <Text style={[s.moduleBadgeText, { color }]}>Activo</Text>
        </View>
      </View>

      {/* ── DIVISOR ───────────────────────────────────────────────────── */}
      <View style={[s.divider, { backgroundColor: color + '30' }]} />

      {/* ── MÓDULO ────────────────────────────────────────────────────── */}
      {/*
        O componente é montado aqui e desmontado ao fechar a camada.
        Isso garante que o estado interno (checkin, mesas seleccionadas,
        agendamentos em curso) é destruído — anti-ghost-data multi-tenant.
      */}
      <View style={s.moduleContainer}>
        <Component
          business={business}
          ownerMode={isOwner}
          ownerBusinessPrivate={business}
          tenantId={tenantId}
          accessToken={accessToken}
          onCreateBooking={createBooking}
          liveBookings={moduleBookings}
          onStatusChange={handleStatusChange}
          updateOwnerBiz={updateOwnerBiz}
          ownerRoomBookings={ownerRoomBookings}
          onOwnerRoomBookingsChange={onOwnerRoomBookingsChange}
          onUnsavedChange={() => {}}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    backgroundColor: '#F7F7F8',
    // Sombra à esquerda — dá profundidade à sobreposição
    shadowColor:     '#000',
    shadowOffset:    { width: -4, height: 0 },
    shadowOpacity:   0.12,
    shadowRadius:    12,
    elevation:       16,
  },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 12,
    paddingVertical:  12,
    backgroundColor:  '#FFFFFF',
    gap:              10,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#F3F4F6',
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerCenter: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize:    15,
    fontWeight:  '700',
    color:       '#111111',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize:   12,
    color:      '#6B7280',
    fontWeight: '500',
    marginTop:  1,
  },
  moduleBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    borderRadius:    20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth:     1,
    gap:             4,
  },
  moduleDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  moduleBadgeText: {
    fontSize:   11,
    fontWeight: '700',
  },
  divider: {
    height: 2,
  },
  moduleContainer: {
    flex: 1,
  },
});