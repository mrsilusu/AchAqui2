import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { COLORS, Icon } from '../../core/AchAqui_Core';
import { apiRequest } from '../../lib/backendApi';

const STEPS = { CHOOSE: 'CHOOSE', PASTE: 'PASTE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULT: 'RESULT' };

export function ImportModal({ visible, onClose, accessToken }) {
  const [step, setStep] = useState(STEPS.CHOOSE);
  const [format, setFormat] = useState(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function reset() { setStep(STEPS.CHOOSE); setFormat(null); setContent(''); setPreview([]); setResult(null); setError(''); }
  function handleClose() { reset(); onClose(); }

  function handlePreview() {
    setError('');
    try {
      if (format === 'json') {
        const parsed = JSON.parse(content);
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        if (rows.length === 0) { setError('JSON vazio.'); return; }
        setPreview(rows.slice(0, 5));
      } else {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) { setError('CSV deve ter cabeçalho e pelo menos 1 linha.'); return; }
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const rows = lines.slice(1, 6).map(line => {
          const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
        setPreview(rows);
      }
      setStep(STEPS.PREVIEW);
    } catch { setError('Formato inválido.'); }
  }

  async function handleImport() {
    setStep(STEPS.LOADING);
    try {
      let data;
      if (format === 'json') {
        const parsed = JSON.parse(content);
        data = await apiRequest('/import/outscraper/json', { method: 'POST', body: { data: Array.isArray(parsed) ? parsed : [parsed] }, accessToken });
      } else {
        data = await apiRequest('/import/outscraper/csv', { method: 'POST', body: { csv: content }, accessToken });
      }
      setResult(data);
      setStep(STEPS.RESULT);
    } catch (err) { setStep(STEPS.PREVIEW); setError(err?.message || 'Erro durante a importação.'); }
  }

  if (!visible) return null;

  return (
    <View style={s.overlay}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => { if (step === STEPS.CHOOSE || step === STEPS.RESULT) handleClose(); else if (step === STEPS.PASTE) setStep(STEPS.CHOOSE); else if (step === STEPS.PREVIEW) setStep(STEPS.PASTE); }}>
          <Icon name={step === STEPS.CHOOSE || step === STEPS.RESULT ? 'x' : 'arrowLeft'} size={20} color={COLORS.darkText} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {step === STEPS.CHOOSE && 'Importar negócios'}{step === STEPS.PASTE && `Colar ${format?.toUpperCase()}`}{step === STEPS.PREVIEW && 'Preview'}{step === STEPS.LOADING && 'A importar...'}{step === STEPS.RESULT && 'Relatório'}
        </Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {step === STEPS.CHOOSE && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Fonte dos dados</Text>
            <Text style={s.sectionSub}>Exporta os dados do Outscraper e cola aqui. Suportamos CSV e JSON.</Text>
            <TouchableOpacity style={s.formatCard} activeOpacity={0.7} onPress={() => { setFormat('csv'); setStep(STEPS.PASTE); }}>
              <Text style={s.formatIcon}>📄</Text>
              <View style={{ flex: 1 }}><Text style={s.formatTitle}>CSV</Text><Text style={s.formatSub}>Exporta do Outscraper como CSV e cola o conteúdo</Text></View>
              <Icon name="arrowRight" size={18} color={COLORS.red} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s.formatCard} activeOpacity={0.7} onPress={() => { setFormat('json'); setStep(STEPS.PASTE); }}>
              <Text style={s.formatIcon}>{'{ }'}</Text>
              <View style={{ flex: 1 }}><Text style={s.formatTitle}>JSON</Text><Text style={s.formatSub}>Exporta do Outscraper como JSON e cola o conteúdo</Text></View>
              <Icon name="arrowRight" size={18} color={COLORS.red} strokeWidth={2} />
            </TouchableOpacity>
            <View style={s.infoBox}><Text style={s.infoBoxText}>💡 O sistema detecta duplicados pelo Google Place ID. Negócios com dono recebem sugestão em vez de serem sobrescritos.</Text></View>
          </View>
        )}
        {step === STEPS.PASTE && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cola o conteúdo {format?.toUpperCase()}</Text>
            <TextInput style={s.pasteArea} placeholder="Cole aqui o conteúdo exportado do Outscraper..." placeholderTextColor={COLORS.grayText} value={content} onChangeText={setContent} multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false} />
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity style={[s.primaryBtn, !content.trim() && s.primaryBtnDisabled]} onPress={handlePreview} disabled={!content.trim()} activeOpacity={0.8}>
              <Text style={s.primaryBtnText}>Ver preview →</Text>
            </TouchableOpacity>
          </View>
        )}
        {step === STEPS.PREVIEW && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Preview — primeiros {preview.length} registos</Text>
            {preview.map((row, idx) => (
              <View key={idx} style={s.previewCard}>
                <Text style={s.previewName}>{row.name || '—'}</Text>
                <Text style={s.previewSub}>{row.category || row.subtypes || '—'} · {row.city || '—'}</Text>
                <Text style={s.previewMeta}>📍 {row.latitude}, {row.longitude}{row.place_id ? ` · ID: ${String(row.place_id).slice(0, 12)}...` : ''}</Text>
              </View>
            ))}
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setStep(STEPS.PASTE)}><Text style={s.cancelBtnText}>Voltar</Text></TouchableOpacity>
              <TouchableOpacity style={s.primaryBtn} onPress={handleImport} activeOpacity={0.8}>
                <Icon name="upload" size={16} color={COLORS.white} strokeWidth={2} />
                <Text style={s.primaryBtnText}>Importar tudo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {step === STEPS.LOADING && (
          <View style={s.centeredState}>
            <ActivityIndicator size="large" color={COLORS.red} />
            <Text style={s.loadingText}>A processar importação...</Text>
            <Text style={s.loadingSub}>Isto pode demorar alguns segundos</Text>
          </View>
        )}
        {step === STEPS.RESULT && result && (
          <View style={s.section}>
            <View style={s.resultHeader}>
              <Text style={s.resultEmoji}>✅</Text>
              <Text style={s.resultTitle}>Importação concluída</Text>
              <Text style={s.resultSub}>{result.total} registos processados</Text>
            </View>
            <View style={s.resultGrid}>
              {[['Importados', result.imported, COLORS.green], ['Actualizados', result.updated, '#3B82F6'], ['Sugestões', result.suggested, '#F59E0B'], ['Ignorados', result.skipped, COLORS.grayText], ['Erros', result.errors, COLORS.red]].map(([label, value, color]) => (
                <View key={label} style={s.resultStat}><Text style={[s.resultStatValue, { color }]}>{value}</Text><Text style={s.resultStatLabel}>{label}</Text></View>
              ))}
            </View>
            {result.suggested > 0 && <View style={s.infoBox}><Text style={s.infoBoxText}>💡 {result.suggested} negócio(s) com dono receberam notificação para aceitar as actualizações.</Text></View>}
            <TouchableOpacity style={s.primaryBtn} onPress={handleClose} activeOpacity={0.8}><Text style={s.primaryBtnText}>Fechar</Text></TouchableOpacity>
            <TouchableOpacity style={[s.cancelBtn, { marginTop: 10 }]} onPress={reset} activeOpacity={0.7}><Text style={s.cancelBtnText}>Nova importação</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white, zIndex: 30000 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.darkText },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkText, marginBottom: 6 },
  sectionSub: { fontSize: 13, color: COLORS.grayText, lineHeight: 18, marginBottom: 20 },
  formatCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 12, backgroundColor: COLORS.grayBg, borderRadius: 14 },
  formatIcon: { fontSize: 28 },
  formatTitle: { fontSize: 16, fontWeight: '700', color: COLORS.darkText, marginBottom: 2 },
  formatSub: { fontSize: 12, color: COLORS.grayText, lineHeight: 16 },
  infoBox: { marginTop: 16, padding: 14, backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  infoBoxText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  pasteArea: { backgroundColor: COLORS.grayBg, borderRadius: 10, padding: 14, fontSize: 12, color: COLORS.darkText, minHeight: 200, marginBottom: 12 },
  previewCard: { backgroundColor: COLORS.grayBg, borderRadius: 10, padding: 12, marginBottom: 8 },
  previewName: { fontSize: 14, fontWeight: '700', color: COLORS.darkText, marginBottom: 2 },
  previewSub: { fontSize: 12, color: COLORS.grayText, marginBottom: 2 },
  previewMeta: { fontSize: 11, color: COLORS.grayText },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.red, borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.grayBg, borderRadius: 12, paddingVertical: 14 },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.darkText },
  errorText: { fontSize: 13, color: COLORS.red, marginBottom: 8 },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 },
  loadingText: { fontSize: 17, fontWeight: '700', color: COLORS.darkText },
  loadingSub: { fontSize: 13, color: COLORS.grayText },
  resultHeader: { alignItems: 'center', marginBottom: 24 },
  resultEmoji: { fontSize: 56, marginBottom: 10 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 },
  resultSub: { fontSize: 14, color: COLORS.grayText },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  resultStat: { flex: 1, minWidth: '28%', backgroundColor: COLORS.grayBg, borderRadius: 10, padding: 14, alignItems: 'center' },
  resultStatValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  resultStatLabel: { fontSize: 11, color: COLORS.grayText, fontWeight: '500' },
});
