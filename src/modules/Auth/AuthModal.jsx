/**
 * AuthModal — bottom-sheet de login / registo
 * Abre quando o utilizador tenta aceder a funcionalidades que requerem conta.
 * Props:
 *   visible        boolean
 *   onClose        () => void
 *   onSuccess      (session) => void
 *   initialTab     'login' | 'register'   (default: 'login')
 *   initialRole    'CLIENT' | 'OWNER'     (default: 'CLIENT')
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Alert,
} from 'react-native';
import { Icon, COLORS } from '../../core/AchAqui_Core';
import { backendApi } from '../../lib/backendApi';

export function AuthModal({ visible, onClose, onSuccess, initialTab = 'login', initialRole = 'CLIENT' }) {
  const [tab, setTab]           = useState(initialTab);
  const [role, setRole]         = useState(initialRole);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showForgot, setShowForgot]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone]       = useState(false);

  const slideY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setRole(initialRole);
      setError('');
      Animated.spring(slideY, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: 600, duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword('');
    setError(''); setShowPass(false);
    setShowForgot(false); setForgotEmail(''); setForgotDone(false);
  };

  const switchTab = (t) => { setTab(t); resetForm(); };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) { setError('Introduza o seu email.'); return; }
    setError('');
    setForgotLoading(true);
    try {
      await backendApi.forgotPassword(forgotEmail.trim());
      setForgotDone(true);
    } catch {
      setError('Não foi possível enviar o email. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('Introduza o seu email.'); return; }
    if (!password)     { setError('Introduza a senha.'); return; }
    if (tab === 'register' && !name.trim()) { setError('Introduza o seu nome.'); return; }

    setLoading(true);
    try {
      let session;
      if (tab === 'login') {
        session = await backendApi.signIn({ email: email.trim(), password });
      } else {
        session = await backendApi.signUp({
          name: name.trim(), email: email.trim(), password, role,
        });
      }
      resetForm();
      onSuccess(session);
    } catch (err) {
      setError(err?.message || (tab === 'login' ? 'Email ou senha incorrectos.' : 'Não foi possível criar conta.'));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kavWrap} pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>
              {tab === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={22} color={COLORS.darkText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'login' && s.tabActive]}
              onPress={() => switchTab('login')}
            >
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'register' && s.tabActive]}
              onPress={() => switchTab('register')}
            >
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Vista de recuperação de senha ── */}
            {showForgot ? (
              <View>
                <TouchableOpacity onPress={() => { setShowForgot(false); setForgotDone(false); setError(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                  <Icon name="back" size={16} color={COLORS.grayText} strokeWidth={2} />
                  <Text style={{ fontSize: 13, color: COLORS.grayText }}>Voltar ao login</Text>
                </TouchableOpacity>

                {forgotDone ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Text style={{ fontSize: 32, marginBottom: 12 }}>📧</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.darkText, marginBottom: 8 }}>Email enviado!</Text>
                    <Text style={{ fontSize: 13, color: COLORS.grayText, textAlign: 'center', lineHeight: 20 }}>
                      Se existir uma conta com este email, receberás um link para redefinir a senha. Verifica a caixa de entrada.
                    </Text>
                    <TouchableOpacity style={[s.submitBtn, { marginTop: 24 }]} onPress={() => { setShowForgot(false); setForgotDone(false); }}>
                      <Text style={s.submitTxt}>Voltar ao login</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 6 }}>Recuperar senha</Text>
                    <Text style={{ fontSize: 13, color: COLORS.grayText, marginBottom: 20, lineHeight: 18 }}>
                      Introduz o teu email e enviaremos um link para redefinires a senha.
                    </Text>
                    <View style={s.field}>
                      <Text style={s.label}>Email</Text>
                      <TextInput
                        style={s.input}
                        placeholder="email@exemplo.com"
                        placeholderTextColor={COLORS.grayText}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {!!error && (
                      <View style={s.errorBox}>
                        <Icon name="info" size={14} color="#B00020" strokeWidth={2} />
                        <Text style={s.errorText}>{error}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[s.submitBtn, forgotLoading && s.submitBtnDisabled]}
                      onPress={handleForgot}
                      disabled={forgotLoading}
                      activeOpacity={0.85}
                    >
                      <Text style={s.submitTxt}>{forgotLoading ? 'A enviar...' : 'Enviar link'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ height: 32 }} />
              </View>
            ) : (
              <View>
            {/* Selector de papel — só no registo */}
            {tab === 'register' && (
              <View style={s.roleRow}>
                <TouchableOpacity
                  style={[s.roleBtn, role === 'CLIENT' && s.roleBtnActive]}
                  onPress={() => setRole('CLIENT')}
                >
                  <Icon name="user" size={18} color={role === 'CLIENT' ? COLORS.red : COLORS.grayText} strokeWidth={2} />
                  <Text style={[s.roleTxt, role === 'CLIENT' && s.roleTxtActive]}>Cliente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.roleBtn, role === 'OWNER' && s.roleBtnActive]}
                  onPress={() => setRole('OWNER')}
                >
                  <Icon name="briefcase" size={18} color={role === 'OWNER' ? COLORS.red : COLORS.grayText} strokeWidth={2} />
                  <Text style={[s.roleTxt, role === 'OWNER' && s.roleTxtActive]}>Dono de negócio</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nome — só no registo */}
            {tab === 'register' && (
              <View style={s.field}>
                <Text style={s.label}>Nome completo</Text>
                <TextInput
                  style={s.input}
                  placeholder="O seu nome"
                  placeholderTextColor={COLORS.grayText}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email */}
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="email@exemplo.com"
                placeholderTextColor={COLORS.grayText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Senha */}
            <View style={s.field}>
              <Text style={s.label}>Senha</Text>
              <View style={s.passRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={COLORS.grayText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
                  <Icon name="eye" size={20} color={showPass ? COLORS.red : COLORS.grayText} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Erro */}
            {!!error && (
              <View style={s.errorBox}>
                <Icon name="info" size={14} color="#B00020" strokeWidth={2} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Botão principal */}
            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={s.submitTxt}>
                {loading
                  ? 'A processar...'
                  : tab === 'login' ? 'Entrar' : 'Criar conta'}
              </Text>
            </TouchableOpacity>

            {/* Esqueceu senha */}
            {tab === 'login' && (
              <TouchableOpacity
                style={s.forgotBtn}
                onPress={() => { setForgotEmail(email); setError(''); setShowForgot(true); }}
              >
                <Text style={s.forgotTxt}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            )}

            {/* Switch de tab */}
            <TouchableOpacity
              style={s.switchRow}
              onPress={() => switchTab(tab === 'login' ? 'register' : 'login')}
            >
              <Text style={s.switchTxt}>
                {tab === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
                <Text style={s.switchLink}>
                  {tab === 'login' ? 'Criar conta' : 'Entrar'}
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
            </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kavWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkText },

  tabs: {
    flexDirection: 'row', backgroundColor: '#F5F5F5',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tab: {
    flex: 1, paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.grayText },
  tabTextActive: { color: COLORS.darkText, fontWeight: '700' },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E8E8', backgroundColor: '#FAFAFA',
  },
  roleBtnActive: { borderColor: COLORS.red, backgroundColor: '#FFF5F5' },
  roleTxt: { fontSize: 13, fontWeight: '600', color: COLORS.grayText },
  roleTxtActive: { color: COLORS.red },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.darkText, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.darkText, backgroundColor: '#FAFAFA',
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF0F0', borderRadius: 10,
    padding: 12, marginBottom: 14,
  },
  errorText: { fontSize: 13, color: '#B00020', flex: 1 },

  submitBtn: {
    backgroundColor: COLORS.red, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  forgotBtn: { alignItems: 'center', paddingVertical: 10 },
  forgotTxt: { fontSize: 13, color: COLORS.grayText },

  switchRow: { alignItems: 'center', paddingVertical: 12 },
  switchTxt: { fontSize: 14, color: COLORS.grayText },
  switchLink: { color: COLORS.red, fontWeight: '700' },
});