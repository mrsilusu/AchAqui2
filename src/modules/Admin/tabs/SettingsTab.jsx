import React, { useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { s } from '../AdminStyles';

export function SettingsTab({ accessToken }) {
  const [categories, setCategories] = useState('hotel, restaurante, beleza, saude, educacao');
  const [featureFlags, setFeatureFlags] = useState('feed=true\nloyalty=true\nadvancedAnalytics=true');
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      await apiRequest('/auth/settings', {
        method: 'PATCH',
        accessToken,
        body: {
          adminPlatformSettings: {
            categories: categories.split(',').map((x) => x.trim()).filter(Boolean),
            featureFlags,
          },
        },
      });
      Alert.alert('Guardado', 'Configuracoes globais atualizadas.');
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel guardar configuracoes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Configuracoes da Plataforma</Text>
        <Text style={s.noteModalSub}>Categorias disponiveis (separadas por virgula)</Text>
        <TextInput style={[s.noteInput, { minHeight: 72 }]} multiline value={categories} onChangeText={setCategories} />

        <Text style={[s.noteModalSub, { marginTop: 12 }]}>Feature flags (chave=valor)</Text>
        <TextInput style={[s.noteInput, { minHeight: 120 }]} multiline value={featureFlags} onChangeText={setFeatureFlags} />

        <TouchableOpacity style={[s.noteModalConfirmBtn, { marginTop: 14 }]} onPress={saveSettings} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ fontWeight: '700', color: COLORS.white }}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
