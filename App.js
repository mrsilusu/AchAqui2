import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import AchAquiMain from './src/AchAqui_Main';
import { useAuthSession } from './src/hooks/useAuthSession';
import { backendApi } from './src/lib/backendApi';
import { BACKEND_URL } from './src/lib/runtimeConfig';

export default function App() {
  return <AuthGate />;
}

function AuthGate() {
  const authSession = useAuthSession();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canShowApp = useMemo(
    () => Boolean(authSession.user && authSession.accessToken && !authSession.loading),
    [authSession.accessToken, authSession.loading, authSession.user],
  );

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email e password são obrigatórios.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setSubmitting(true);
    try {
      let session;
      if (mode === 'signup') {
        session = await backendApi.signUp({
          email: email.trim(),
          password,
          name: name.trim(),
          role,
        });
      } else {
        session = await backendApi.signIn({ email: email.trim(), password });
      }
      await authSession.saveSession(session);
    } catch (apiError) {
      setError(apiError?.message || (mode === 'signup' ? 'Não foi possível criar conta.' : 'Credenciais inválidas.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Loading inicial (a ler sessão do AsyncStorage)
  if (authSession.loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#D32323" />
        <Text style={s.loadingText}>A carregar...</Text>
      </View>
    );
  }

  // Sessão válida → app principal
  if (canShowApp) {
    return (
      <View style={{ flex: 1 }}>
        <AchAquiMain />
      </View>
    );
  }

  // Sem sessão → ecrã de login/registo
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>AchAqui</Text>
        <Text style={s.subtitle}>Backend: {BACKEND_URL}</Text>

        {/* Tabs login / criar conta */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, mode === 'login' && s.tabActive]}
            onPress={() => { setMode('login'); setError(''); }}
          >
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, mode === 'signup' && s.tabActive]}
            onPress={() => { setMode('signup'); setError(''); }}
          >
            <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input}
              placeholder="O teu nome"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          placeholder="email@exemplo.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {mode === 'signup' && (
          <>
            <Text style={s.label}>Tipo de conta</Text>
            <View style={s.roleRow}>
              {[
                { key: 'CLIENT', label: '👤 Cliente' },
                { key: 'OWNER', label: '🏢 Dono de Negócio' },
              ].map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[s.roleChip, role === r.key && s.roleChipActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={[s.roleChipText, role === r.key && s.roleChipTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.btn, submitting && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={s.btnText}>
            {submitting ? 'A processar...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#444',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#D32323',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 32,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#111',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  roleChipActive: {
    backgroundColor: '#D32323',
    borderColor: '#D32323',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  roleChipTextActive: {
    color: '#fff',
  },
  error: {
    color: '#D32323',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: '#D32323',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
