/**
 * ============================================================================
 * CancelReservationSheet  (v2.11.0 — Fase 3.5)
 * ============================================================================
 * Bottom sheet para cancelar reservas de mesa (Dining) ou quarto (Hospitality).
 * Extrai de AcheiAqui_Main os estados locais e o JSX do bloco:
 *   «CANCEL RESERVATION MODAL — v2.9.5e»
 *
 * Props:
 *   visible           {boolean}  — controla Modal.visible
 *   reservation       {object}   — { user, date, time } — resumo da reserva
 *   onClose           {Function} — callback de fecho (sem confirmar)
 *   onConfirm         {Function(reason: string)} — callback de confirmação com motivo final
 *   insets            {object}   — useSafeAreaInsets() do componente pai
 *
 * Não exporta estilos — usa bizS de Main.styles.js (importado aqui directamente).
 * ============================================================================
 */

import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  TextInput, Keyboard, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { COLORS } from '../../core/AcheiAqui_Core';

// ─── Estilos locais do sheet ──────────────────────────────────────────────────
// Mantidos aqui para que o componente seja completamente independente.
const s = StyleSheet.create({
  overlay:         { flex: 1 },
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:           { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: '#EBEBEB', alignSelf: 'center', marginBottom: 20 },
  title:           { fontSize: 18, fontWeight: '800', color: '#111111', marginBottom: 4 },
  subtitle:        { fontSize: 13, color: '#8A8A8A', marginBottom: 20 },
  label:           { fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#EBEBEB', backgroundColor: '#FFFFFF' },
  optionActive:    { borderColor: '#E53935', backgroundColor: '#FFF5F5' },
  radio:           { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' },
  radioActive:     { borderColor: '#E53935' },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935' },
  reasonText:      { fontSize: 14, fontWeight: '500', color: '#111111', flex: 1 },
  reasonTextActive:{ color: '#E53935', fontWeight: '600' },
  input:           { backgroundColor: '#F7F7F8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111111', borderWidth: 1.5, borderColor: '#EBEBEB', minHeight: 80, textAlignVertical: 'top', marginTop: 4, marginBottom: 8 },
  actions:         { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnGhost:        { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBEB', alignItems: 'center' },
  btnGhostText:    { fontSize: 14, fontWeight: '600', color: '#111111' },
  btnPrimary:      { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E53935', alignItems: 'center' },
  btnPrimaryText:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

const CANCEL_REASONS = [
  'Mesa já não disponível',
  'Capacidade máxima atingida',
  'Fecho inesperado do restaurante',
  'Pedido do cliente',
  'Outro motivo',
];

export function CancelReservationSheet({ visible, reservation, onClose, onConfirm, insets }) {
  const scrollRef = useRef(null);

  const [selectedReason, setSelectedReason] = useState('');
  const [otherText, setOtherText]           = useState('');

  const handleClose = () => {
    Keyboard.dismiss();
    setSelectedReason('');
    setOtherText('');
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedReason) return;
    const finalReason =
      selectedReason === 'Outro motivo' && otherText.trim()
        ? otherText.trim()
        : selectedReason;
    setSelectedReason('');
    setOtherText('');
    onConfirm(finalReason);
  };

  const selectReason = (reason) => {
    setSelectedReason(reason);
    if (reason === 'Outro motivo') {
      const delay = Platform.OS === 'ios' ? 350 : 120;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), delay);
    }
  };

  const paddingBottom = insets ? Math.max(insets.bottom, 20) : 20;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet — ancorado em baixo, nunca passa 85% do ecrã */}
        <View style={[s.sheet, { paddingBottom, maxHeight: '85%' }]}>
          <View style={s.handle} />

          <Text style={s.title}>Cancelar Reserva</Text>
          {reservation && (
            <Text style={s.subtitle}>
              {reservation.user} · {reservation.date} às {reservation.time}
            </Text>
          )}

          {/* Opções de motivo — scrollable */}
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            style={{ flexShrink: 1 }}
          >
            <Text style={s.label}>Motivo do cancelamento</Text>

            {CANCEL_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[s.option, selectedReason === reason && s.optionActive]}
                activeOpacity={0.7}
                onPress={() => selectReason(reason)}
              >
                <View style={[s.radio, selectedReason === reason && s.radioActive]}>
                  {selectedReason === reason && <View style={s.radioDot} />}
                </View>
                <Text style={[s.reasonText, selectedReason === reason && s.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 'Outro motivo' && (
              <TextInput
                style={s.input}
                placeholder="Descreva o motivo..."
                placeholderTextColor={COLORS.grayText}
                value={otherText}
                onChangeText={setOtherText}
                multiline
                numberOfLines={3}
                autoFocus
                onFocus={() => {
                  setTimeout(
                    () => scrollRef.current?.scrollToEnd({ animated: true }),
                    Platform.OS === 'ios' ? 320 : 80,
                  );
                }}
              />
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Botões — fora do ScrollView para ficarem sempre visíveis */}
          <View style={s.actions}>
            <TouchableOpacity style={s.btnGhost} activeOpacity={0.7} onPress={handleClose}>
              <Text style={s.btnGhostText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnPrimary, !selectedReason && { opacity: 0.4 }]}
              activeOpacity={0.85}
              disabled={!selectedReason}
              onPress={handleConfirm}
            >
              <Text style={s.btnPrimaryText}>Confirmar Cancelamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}