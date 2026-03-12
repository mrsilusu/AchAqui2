/**
 * ============================================================================
 * AUTH MODAL  (v1.0.0)
 * ============================================================================
 * Modal flutuante de autenticação com dois modos:
 *   • "Entrar"      — login com email + password
 *   • "Criar conta" — registo com nome + email + password + tipo de conta
 *
 * Tipos de conta:
 *   CLIENT — utilizador comum (visualiza e interage com negócios)
 *   OWNER  — dono de negócio (acede ao modo dono após autenticação)
 *
 * Props:
 *   visible      — boolean
 *   onClose      — () => void
 *   onSuccess    — (session) => void   [chamado após login/registo bem sucedido]
 *   initialMode  — 'signin' | 'signup'  [tab inicial, default 'signin']
 * ============================================================================
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, ScrollView, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, COLORS } from '../../core/AchAqui_Core';
import { backendApi } from '../../lib/backendApi';

// ─── Tipos de conta ───────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  {
    role:  'CLIENT',
    icon:  '👤',
    title: 'Utilizador',
    desc:  'Descobre e interage com negócios',
  },
  {
    role:  'OWNER',
    icon:  '🏢',
    title: 'Dono de negócio',
    desc:  'Gere o teu negócio na plataforma',
  },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AuthModal({ visible, onClose, onSuccess, initialMode = 'signin' }) {
  const insets = useSafeAreaInsets();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [mode, setMode]             = useState(initialMode); // 'signin' | 'signup'
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [role, setRole]             = useState('CLIENT');
  const [showPass, setShowPass]     = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const emailRef  = useRef(null);
  const passRef   = useRef(null);
  const nameRef   = useRef(null);

  // ── Animação entrada/saída ───────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      resetForm();
      setMode(initialMode);
      Animated.spring(slideAnim, {
        toValue: 1, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function resetForm() {
    setName(''); setEmail(''); setPassword('');
    setRole('CLIENT'); setShowPass(false); setError('');
  }

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  // ── Validação básica ─────────────────────────────────────────────────────────
  function validate() {
    if (mode === 'signup' && name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.'); return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Introduz um email válido.'); return false;
    }
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.'); return false;
    }
    return true;
  }

  // ── Submeter ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    setError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      let session;

      if (mode === 'signin') {
        session = await backendApi.signIn({ email: email.trim(), password });
      } else {
        session = await backendApi.signUp({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
      }

      // session = { accessToken, refreshToken, user: { id, email, name, role } }
      onSuccess?.(session);
      onClose?.();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('credenciais') || msg.includes('password')) {
        setError('Email ou password incorrectos.');
      } else if (msg.includes('409') || msg.includes('already') || msg.includes('existe')) {
        setError('Já existe uma conta com este email.');
      } else {
        setError('Erro de ligação. Verifica a tua rede e tenta novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, name, email, password, role]);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1], outputRange: [800, 0],
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }], paddingBottom: insets.bottom + 16 }]}
    >
      {/* Handle */}
      <View style={s.handle} />

      {/* Fechar */}
      <TouchableOpacity
        style={s.closeBtn}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="x" size={20} color={COLORS.grayText} strokeWidth={2} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
        >

          {/* Logo / Título */}
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>A</Text>
            </View>
            <View>
              <Text style={s.appName}>AcheiAqui</Text>
              <Text style={s.appTagline}>Descobre Luanda</Text>
            </View>
          </View>

          {/* Tabs Entrar / Criar conta */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, mode === 'signin' && s.tabActive]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, mode === 'signin' && s.tabTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, mode === 'signup' && s.tabActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          {/* ── CAMPOS ── */}

          {/* Nome — só no registo */}
          {mode === 'signup' && (
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Nome completo</Text>
              <View style={s.inputRow}>
                <Icon name="user" size={18} color={COLORS.grayText} strokeWidth={2} />
                <TextInput
                  ref={nameRef}
                  style={s.input}
                  placeholder="O teu nome"
                  placeholderTextColor={COLORS.grayText}
                  value={name}
                  onChangeText={t => { setName(t); setError(''); }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email</Text>
            <View style={s.inputRow}>
              <Icon name="mail" size={18} color={COLORS.grayText} strokeWidth={2} />
              <TextInput
                ref={emailRef}
                style={s.input}
                placeholder="exemplo@email.ao"
                placeholderTextColor={COLORS.grayText}
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.inputRow}>
              <Icon name="lock" size={18} color={COLORS.grayText} strokeWidth={2} />
              <TextInput
                ref={passRef}
                style={s.input}
                placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                placeholderTextColor={COLORS.grayText}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowPass(p => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showPass ? 'eyeOff' : 'eye'}
                  size={18}
                  color={COLORS.grayText}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tipo de conta — só no registo */}
          {mode === 'signup' && (
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Tipo de conta</Text>
              <View style={s.roleRow}>
                {ACCOUNT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.role}
                    style={[s.roleCard, role === type.role && s.roleCardActive]}
                    onPress={() => setRole(type.role)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.roleIcon}>{type.icon}</Text>
                    <Text style={[s.roleTitle, role === type.role && s.roleTitleActive]}>
                      {type.title}
                    </Text>
                    <Text style={s.roleDesc}>{type.desc}</Text>
                    {role === type.role && (
                      <View style={s.roleCheck}>
                        <Icon name="check" size={12} color={COLORS.white} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Erro */}
          {error !== '' && (
            <View style={s.errorBox}>
              <Icon name="alertCircle" size={16} color="#D32323" strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Botão principal */}
          <TouchableOpacity
            style={[s.submitBtn, isLoading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={s.submitBtnText}>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Link alternativo */}
          <View style={s.altRow}>
            <Text style={s.altText}>
              {mode === 'signin' ? 'Ainda não tens conta?' : 'Já tens conta?'}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.altLink}>
                {mode === 'signin' ? 'Criar conta' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    zIndex: 30000,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.grayLine,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.grayBg,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },

  // Logo
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 24, marginTop: 8,
  },
  logoCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.red,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText:    { fontSize: 24, fontWeight: '800', color: COLORS.white },
  appName:     { fontSize: 20, fontWeight: '800', color: COLORS.darkText, letterSpacing: -0.5 },
  appTagline:  { fontSize: 13, fontWeight: '500', color: COLORS.grayText },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayBg,
    borderRadius: 12, padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  tabText:       { fontSize: 15, fontWeight: '600', color: COLORS.grayText },
  tabTextActive: { color: COLORS.darkText },

  // Campos
  fieldGroup:  { marginBottom: 16 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: COLORS.darkText, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.grayBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.darkText },

  // Tipo de conta
  roleRow: { flexDirection: 'row', gap: 10 },
  roleCard: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.grayBg,
    borderWidth: 2, borderColor: 'transparent',
    position: 'relative',
  },
  roleCardActive: {
    borderColor: COLORS.red,
    backgroundColor: '#FFF5F5',
  },
  roleIcon:  { fontSize: 28, marginBottom: 6 },
  roleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.darkText, marginBottom: 3 },
  roleTitleActive: { color: COLORS.red },
  roleDesc:  { fontSize: 12, color: COLORS.grayText, lineHeight: 16 },
  roleCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.red,
    alignItems: 'center', justifyContent: 'center',
  },

  // Erro
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFCDD2',
  },
  errorText: { flex: 1, fontSize: 13, color: '#D32323', lineHeight: 18 },

  // Botão
  submitBtn: {
    backgroundColor: COLORS.red, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  // Alternativa
  altRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  altText: { fontSize: 14, color: COLORS.grayText },
  altLink: { fontSize: 14, fontWeight: '700', color: COLORS.red },
});