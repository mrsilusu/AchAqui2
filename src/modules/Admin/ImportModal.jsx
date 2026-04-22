import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { COLORS, Icon } from '../../core/AchAqui_Core';
import { apiRequest } from '../../lib/backendApi';

const STEPS = { CHOOSE: 'CHOOSE', PASTE: 'PASTE', PREVIEW: 'PREVIEW', LOADING: 'LOADING', RESULT: 'RESULT', API: 'API' };


const PROVINCIAS = [
  { id: 'luanda',     label: 'Luanda',     coords: '-8.8368,13.2343'  },
  { id: 'benguela',   label: 'Benguela',   coords: '-12.5763,13.4055' },
  { id: 'huambo',     label: 'Huambo',     coords: '-12.7756,15.7390' },
  { id: 'lubango',    label: 'Lubango',    coords: '-14.9167,13.5000' },
  { id: 'malanje',    label: 'Malanje',    coords: '-9.5400,16.3400'  },
  { id: 'cabinda',    label: 'Cabinda',    coords: '-5.5500,12.2000'  },
  { id: 'soyo',       label: 'Soyo',       coords: '-6.1333,12.3667'  },
  { id: 'uige',       label: 'Uíge',       coords: '-7.6167,15.0500'  },
  { id: 'saurimo',    label: 'Saurimo',    coords: '-9.6600,20.3900'  },
  { id: 'menongue',   label: 'Menongue',   coords: '-14.6567,17.6900' },
  { id: 'ondjiva',    label: 'Ondjiva',    coords: '-17.0667,15.7333' },
  { id: 'sumbe',      label: 'Sumbe',      coords: '-11.2000,13.8500' },
  { id: 'ndalatando', label: 'Ndalatando', coords: '-9.3000,14.9167'  },
  { id: 'caxito',     label: 'Caxito',     coords: '-8.5667,15.1000'  },
  { id: 'kuito',      label: 'Kuito',      coords: '-12.3833,16.9333' },
  { id: 'lobito',     label: 'Lobito',     coords: '-12.3500,13.5500' },
  { id: 'namibe',     label: 'Namibe',     coords: '-15.1961,12.1522' },
  { id: 'luena',      label: 'Luena',      coords: '-11.7833,19.9167' },
];

const IMPORT_CATEGORIES = [
  { id: 'hoteis',        label: 'Hotéis & Alojamento',    query: 'hotéis'               },
  { id: 'restaurantes',  label: 'Restaurantes',            query: 'restaurantes'         },
  { id: 'cafes',         label: 'Cafés & Pastelarias',     query: 'cafés pastelarias'    },
  { id: 'bares',         label: 'Bares & Nightlife',       query: 'bares discotecas'     },
  { id: 'saloes',        label: 'Salões de Beleza',        query: 'salões beleza'        },
  { id: 'spas',          label: 'Spas & Massagens',        query: 'spas massagens'       },
  { id: 'clinicas',      label: 'Clínicas & Hospitais',    query: 'clínicas hospitais'   },
  { id: 'farmacias',     label: 'Farmácias',               query: 'farmácias'            },
  { id: 'academias',     label: 'Academias & Ginásios',    query: 'academias ginásios'   },
  { id: 'supermercados', label: 'Supermercados',           query: 'supermercados'        },
  { id: 'lojas',         label: 'Lojas & Comércio',        query: 'lojas comércio'       },
  { id: 'escolas',       label: 'Escolas & Colégios',      query: 'escolas colégios'     },
  { id: 'bancos',        label: 'Bancos & Financeiros',    query: 'bancos seguros'       },
  { id: 'oficinas',      label: 'Oficinas & Auto',         query: 'oficinas mecânicos'   },
  { id: 'profissionais', label: 'Serviços Profissionais',  query: 'advogados consultores'},
  { id: 'domesticos',    label: 'Serviços Domésticos',     query: 'eletricistas lavandarias'},
  { id: 'eventos',       label: 'Eventos & Catering',      query: 'espaços eventos'      },
  { id: 'veterinarios',  label: 'Veterinários & Pets',     query: 'veterinários pet shop'},
];

export function ImportModal({ visible, onClose, accessToken }) {
  const [step, setStep] = useState(STEPS.CHOOSE);
  const [format, setFormat] = useState(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [apiQuery, setApiQuery] = useState('');
  const [apiLimit, setApiLimit] = useState('100');
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedProvincia, setSelectedProvincia] = useState(PROVINCIAS[0]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  function reset() { setStep(STEPS.CHOOSE); setFormat(null); setContent(''); setPreview([]); setResult(null); setError(''); setApiQuery(''); setApiLimit('100'); setSelectedCategory(null); }
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

  async function handleApiImport() {
    if (!apiQuery.trim()) return;
    setApiLoading(true); setError('');
    try {
      const data = await apiRequest('/admin/import/outscraper', {
        method: 'POST',
        body: { query: apiQuery.trim(), limit: parseInt(apiLimit, 10) || 100, coordinates: selectedProvincia.coords, language: 'pt', region: 'ao' },
        accessToken,
      });
      setResult(data); setStep(STEPS.RESULT);
    } catch (err) {
      setError(err?.message || 'Erro. Verifica OUTSCRAPER_API_KEY no servidor.');
    } finally { setApiLoading(false); }
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
        <TouchableOpacity style={s.backBtn} onPress={() => { if (step === STEPS.CHOOSE || step === STEPS.RESULT) handleClose(); else if (step === STEPS.PASTE || step === STEPS.API) setStep(STEPS.CHOOSE); else if (step === STEPS.PREVIEW) setStep(STEPS.PASTE); }}>
          <Icon name={step === STEPS.CHOOSE || step === STEPS.RESULT ? 'x' : 'arrowLeft'} size={20} color={COLORS.darkText} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {step === STEPS.CHOOSE && 'Importar negócios'}{step === STEPS.PASTE && `Colar ${format?.toUpperCase()}`}{step === STEPS.PREVIEW && 'Preview'}{step === STEPS.API && 'API Directa'}{step === STEPS.LOADING && 'A importar...'}{step === STEPS.RESULT && 'Relatório'}
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
            <TouchableOpacity style={[s.formatCard, { borderWidth: 2, borderColor: '#1565C0' }]} activeOpacity={0.7} onPress={() => setStep(STEPS.API)}>
              <Text style={s.formatIcon}>🔌</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.formatTitle}>API Directa</Text>
                <Text style={s.formatSub}>Importa directamente do Google Maps sem exportar ficheiros</Text>
              </View>
              <Icon name="arrowRight" size={18} color='#1565C0' strokeWidth={2} />
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
              <Text style={s.primaryBtnText}>Ver preview ›</Text>
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
        {step === STEPS.API && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Importar via API</Text>
            <Text style={s.sectionSub}>Selecciona a província e categoria. A query é gerada automaticamente com as coordenadas correctas.</Text>

            {/* Seletor de Província */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkText, marginBottom: 8 }}>📍 Província:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                {PROVINCIAS.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: selectedProvincia.id === p.id ? '#1565C0' : '#F0F4F8',
                      borderWidth: 1.5, borderColor: selectedProvincia.id === p.id ? '#1565C0' : '#CBD5E1' }}
                    onPress={() => {
                      setSelectedProvincia(p);
                      if (selectedCategory) setApiQuery(selectedCategory.query + ' ' + p.label + ' Angola');
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700',
                      color: selectedProvincia.id === p.id ? '#fff' : COLORS.darkText }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Seletor de Categoria */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkText, marginBottom: 8 }}>🏢 Categoria:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {IMPORT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: selectedCategory?.id === cat.id ? '#1565C0' : '#EFF6FF',
                    borderWidth: 1, borderColor: selectedCategory?.id === cat.id ? '#1565C0' : '#BFDBFE' }}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setApiQuery(cat.query + ' ' + selectedProvincia.label + ' Angola');
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '600',
                    color: selectedCategory?.id === cat.id ? '#fff' : '#1565C0' }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Query gerada */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.grayText, marginBottom: 6 }}>
              Query gerada (editável):
            </Text>
            <TextInput
              style={[s.pasteArea, { minHeight: 50, paddingVertical: 12 }]}
              placeholder="Selecciona categoria e província acima, ou escreve aqui..."
              placeholderTextColor={COLORS.grayText}
              value={apiQuery} onChangeText={setApiQuery}
              autoCapitalize="none" autoCorrect={false}
            />

            {/* Preview */}
            {apiQuery.trim() && (
              <View style={[s.infoBox, { marginBottom: 12, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '600' }}>
                  🔍 Vai importar: "{apiQuery.trim()}" · Coords: {selectedProvincia.label} · Limite: {apiLimit}
                </Text>
              </View>
            )}

            {/* Limite */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.grayText, marginBottom: 6 }}>
              Limite de resultados:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {['20','50','100','200','500'].map(n => (
                <TouchableOpacity key={n}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                    backgroundColor: apiLimit === n ? '#1565C0' : '#F7F7F8',
                    borderWidth: 1, borderColor: apiLimit === n ? '#1565C0' : '#E5E7EB' }}
                  onPress={() => setApiLimit(n)}>
                  <Text style={{ fontSize: 13, fontWeight: '700',
                    color: apiLimit === n ? '#fff' : COLORS.darkText }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: '#1565C0' },
                (!apiQuery.trim() || apiLoading) && s.primaryBtnDisabled]}
              onPress={handleApiImport} disabled={!apiQuery.trim() || apiLoading} activeOpacity={0.8}>
              {apiLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Icon name="upload" size={16} color="#fff" strokeWidth={2} /><Text style={s.primaryBtnText}>Importar agora</Text></>}
            </TouchableOpacity>
            <View style={[s.infoBox, { marginTop: 14 }]}>
              <Text style={s.infoBoxText}>
                💡 Cada importação pode demorar 5-15 segundos. O Outscraper cobra por resultado — usa limites menores para testar.
              </Text>
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