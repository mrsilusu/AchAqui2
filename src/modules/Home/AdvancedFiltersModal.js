/**
 * ============================================================================
 * AdvancedFiltersModal  (v1.0.0 — Fase 3.5)
 * ============================================================================
 * Modal de filtros avançados: Fechados, Preço, Distância, Comodidades.
 * Extraído de AcheiAqui_Main.jsx.
 *
 * Props:
 *   visible           — bool
 *   onClose           — () => void
 *   includeClosed     — bool
 *   onSetIncludeClosed— (bool) => void
 *   priceFilter       — string
 *   onSetPriceFilter  — (id: string) => void
 *   distanceFilter    — string
 *   onSetDistanceFilter — (id: string) => void
 *   selectedAmenities — string[]
 *   onToggleAmenity   — (id: string) => void
 *   onClearAll        — () => void
 * ============================================================================
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';

import {
  Icon, COLORS,
  PRICE_FILTERS, DISTANCE_FILTERS,
  AMENITY_FILTER_CATEGORIES,
} from '../../core/AcheiAqui_Core';

import { afS } from '../../styles/Main.styles';

export function AdvancedFiltersModal({
  visible,
  onClose,
  includeClosed,
  onSetIncludeClosed,
  priceFilter,
  onSetPriceFilter,
  distanceFilter,
  onSetDistanceFilter,
  selectedAmenities,
  onToggleAmenity,
  onClearAll,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={afS.panel}>
          <View style={afS.header}>
            <Text style={afS.title}>Filtros</Text>
            <TouchableOpacity onPress={onClose}><Text style={afS.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={afS.scroll} showsVerticalScrollIndicator={false}>
            {/* Fechados */}
            <TouchableOpacity style={afS.closedToggleRow} onPress={() => onSetIncludeClosed(!includeClosed)}>
              <View style={{ flex: 1 }}>
                <Text style={afS.closedToggleLabel}>Incluir negócios fechados</Text>
                <Text style={afS.closedToggleDesc}>Mostrar também os fechados agora</Text>
              </View>
              <View style={[{ width: 44, height: 26, borderRadius: 13, backgroundColor: includeClosed ? COLORS.green : COLORS.grayLine, justifyContent: 'center', paddingHorizontal: 3 }]}>
                <View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white }, includeClosed && { alignSelf: 'flex-end' }]} />
              </View>
            </TouchableOpacity>

            {/* Preço */}
            <Text style={afS.groupTitle}>Preço</Text>
            <View style={afS.group}>
              {PRICE_FILTERS.map(p => (
                <TouchableOpacity key={p.id} style={[afS.option, priceFilter === p.id && afS.optionActive]} onPress={() => onSetPriceFilter(p.id)}>
                  <Text style={[afS.optionText, priceFilter === p.id && afS.optionTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distância */}
            <Text style={afS.groupTitle}>Distância</Text>
            <View style={afS.group}>
              {DISTANCE_FILTERS.map(d => (
                <TouchableOpacity key={d.id} style={[afS.option, distanceFilter === d.id && afS.optionActive]} onPress={() => onSetDistanceFilter(d.id)}>
                  <Text style={[afS.optionText, distanceFilter === d.id && afS.optionTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comodidades */}
            {AMENITY_FILTER_CATEGORIES.map(cat => (
              <View key={cat.title}>
                <Text style={afS.groupTitle}>{cat.title}</Text>
                <View style={afS.group}>
                  {cat.items.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[afS.option, selectedAmenities.includes(a.id) && afS.optionActive]}
                      onPress={() => onToggleAmenity(a.id)}
                    >
                      <Icon name={a.icon} size={14} color={selectedAmenities.includes(a.id) ? COLORS.red : COLORS.darkText} strokeWidth={1.5} />
                      <Text style={[afS.optionText, selectedAmenities.includes(a.id) && afS.optionTextActive]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={afS.footer}>
            <TouchableOpacity style={afS.clearBtn} onPress={onClearAll}>
              <Text style={afS.clearText}>Limpar tudo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={afS.applyBtn} onPress={onClose}>
              <Text style={afS.applyText}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}