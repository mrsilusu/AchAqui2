/**
 * StaffPinLoginScreen
 * Ecrã de login por PIN para staff do hotel.
 * Armazena `staffToken` no AsyncStorage separado do token do owner.
 *
 * Props:
 *   visible     boolean
 *   businessId  string
 *   onSuccess   (result: { accessToken, staff }) => void
 *   onClose     () => void
 */
import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import backendApi from '../lib/backendApi';

const COLORS = {
  primary: '#1565C0', bg: '#F8FAFC', card: '#FFFFFF',
  border: '#E2E8F0', text: '#1E293B', muted: '#64748B', white: '#FFFFFF',
  danger: '#DC2626', dot: '#334155', dotFilled: '#1565C0',
};

const MAX_DIGITS = 6;
const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function StaffPinLoginScreen({ visible, businessId, onSuccess, onClose }) {
  const [digits, setDigits]   = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]     = useState(false);

  const handleKey = useCallback((key) => {
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (key === '') return;
    if (digits.length >= MAX_DIGITS) return;
    const next = digits + key;
    setDigits(next);
  }, [digits]);

  const handleSubmit = useCallback(async () => {
    if (digits.length < 4) {
      Alert.alert('PIN inválido', 'O PIN deve ter pelo menos 4 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const result = await backendApi.htStaffPinLogin(businessId, digits);
      setDigits('');
      onSuccess?.(result);
    } catch (e) {
      setDigits('');
      // Animação de erro
      setShake(true);
      setTimeout(() => setShake(false), 600);
      Alert.alert('PIN Inválido', 'Não foi possível autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [digits, businessId, onSuccess]);

  const handleClose = () => {
    setDigits('');
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* HEADER */}
          <Text style={s.logo}>🏨</Text>
          <Text style={s.title}>Acesso Staff</Text>
          <Text style={s.subtitle}>Introduz o teu PIN</Text>

          {/* INDICADOR DE DÍGITOS */}
          <View style={[s.dotsRow, shake && s.shakeRow]}>
            {Array.from({ length: MAX_DIGITS }).map((_, i) => (
              <View
                key={i}
                style={[s.dot, i < digits.length && s.dotFilled]}
              />
            ))}
          </View>

          {/* TECLADO NUMÉRICO */}
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 32 }} />
          ) : (
            <>
              <View style={s.pad}>
                {PAD_KEYS.map((row, ri) => (
                  <View key={ri} style={s.padRow}>
                    {row.map((key, ki) => (
                      key === '' ? (
                        <View key={ki} style={s.padKeyEmpty} />
                      ) : (
                        <TouchableOpacity
                          key={ki}
                          style={[s.padKey, key === '⌫' && s.padKeyBack]}
                          onPress={() => handleKey(key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.padKeyText, key === '⌫' && s.padKeyBackText]}>
                            {key}
                          </Text>
                        </TouchableOpacity>
                      )
                    ))}
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[s.submitBtn, digits.length < 4 && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={digits.length < 4}
              >
                <Text style={s.submitBtnText}>Entrar</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleClose} style={s.cancelLink}>
            <Text style={s.cancelLinkText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 28,
    alignItems: 'center', width: 320,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },

  logo:     { fontSize: 40, marginBottom: 8 },
  title:    { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4, marginBottom: 24 },

  dotsRow:   { flexDirection: 'row', gap: 14, marginBottom: 28 },
  shakeRow:  { opacity: 0.5 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: COLORS.dot, backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: COLORS.dotFilled, borderColor: COLORS.dotFilled },

  pad:        { width: '100%', gap: 12, marginBottom: 20 },
  padRow:     { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  padKey: {
    flex: 1, aspectRatio: 1.4, backgroundColor: COLORS.bg, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  padKeyBack:     { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  padKeyEmpty:    { flex: 1, aspectRatio: 1.4 },
  padKeyText:     { fontSize: 22, fontWeight: '600', color: COLORS.text },
  padKeyBackText: { fontSize: 22, color: COLORS.danger },

  submitBtn: {
    width: '100%', padding: 14, backgroundColor: COLORS.primary,
    borderRadius: 12, alignItems: 'center', marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1' },
  submitBtnText:     { color: COLORS.white, fontWeight: '700', fontSize: 16 },

  cancelLink:     { paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, color: COLORS.muted },
});
