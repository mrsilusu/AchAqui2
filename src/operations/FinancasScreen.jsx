import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { Icon, COLORS, formatCurrency } from '../core/AchAqui_Core';
import { backendApi } from '../lib/backendApi';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const TABS = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'faturacao', label: 'Faturação' },
  { id: 'recebimentos', label: 'Recebimentos' },
  { id: 'caixas', label: 'Caixas' },
  { id: 'cityLedger', label: 'City Ledger' },
  { id: 'centros', label: 'Centros' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'config', label: 'Config.' },
];

const MOCK_CENTROS_MTD = [
  { label: 'Rooms', valor: 4200000, cor: '#15803D' },
  { label: 'F&B', valor: 2100000, cor: '#D97706' },
  { label: 'Outros', valor: 850000, cor: '#1565C0' },
];

const MOCK_PAGAMENTOS = [
  { metodo: 'Numerário', hoje: 320000, mes: 1450000 },
  { metodo: 'Multicaixa/TPA', hoje: 780000, mes: 3320000 },
  { metodo: 'Transferência', hoje: 190000, mes: 910000 },
  { metodo: 'City Ledger', hoje: 95000, mes: 420000 },
];

const MOCK_TESOURARIA = [
  { label: 'Saldo de Caixa', valor: formatCurrency(285000), icon: 'briefcase' },
  { label: 'A Receber (City Ledger)', valor: formatCurrency(730000), icon: 'tag' },
  { label: 'Adiantamentos Recebidos', valor: formatCurrency(410000), icon: 'payment' },
  { label: 'DSO (dias)', valor: '24 dias', icon: 'analytics' },
];

const MOCK_ALERTAS = [
  '2 faturas vencidas há mais de 30 dias',
  '1 cliente acima do limite de crédito',
];

const RELATORIOS_PLACEHOLDER = [
  'Resumo diário de receita',
  'Receita por centro de custo',
  'Recebimentos por meio de pagamento',
  'Aging de contas a receber',
];

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};


function KpiCard({ label, value, tone = '#1565C0' }) {
  return (
    <View style={fS.kpiCard}>
      <Text style={[fS.kpiValue, { color: tone }]} numberOfLines={1}>{value}</Text>
      <Text style={fS.kpiLabel}>{label}</Text>
    </View>
  );
}

function PlaceholderTab({ icon, title, subtitle, children = null }) {
  return (
    <View style={fS.placeholderWrap}>
      <View style={fS.placeholderIconWrap}>
        <Icon name={icon} size={48} color={COLORS.grayText} strokeWidth={2} />
      </View>
      <Text style={fS.placeholderTitle}>Em desenvolvimento</Text>
      <Text style={fS.placeholderSubtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

function OverviewTab({ dashData, loading, lastUpdatedAt }) {
  const centrosTotal = useMemo(
    () => MOCK_CENTROS_MTD.reduce((sum, item) => sum + item.valor, 0),
    [],
  );

  return (
    <View style={fS.tabPane}>
      <View style={fS.sectionHeader}>
        <Text style={fS.sectionTitle}>Visão Geral</Text>
        <Text style={fS.sectionMeta}>Atualizado: {formatDate(lastUpdatedAt)}</Text>
      </View>

      {loading && !dashData ? (
        <View style={fS.loadingCard}>
          <ActivityIndicator size="small" color={COLORS.blue} />
          <Text style={fS.loadingText}>A carregar indicadores financeiros...</Text>
        </View>
      ) : null}

      <View style={fS.blockCard}>
        <Text style={fS.blockTitle}>KPIs do Dia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fS.kpiRow}>
          <KpiCard label="Receita Hoje" value={formatCurrency(dashData?.today?.revenue ?? 0)} tone="#15803D" />
          <KpiCard label="Ocupação" value={`${dashData?.occupancyRate ?? 0}%`} tone="#1565C0" />
          <KpiCard label="ADR" value={formatCurrency(dashData?.kpis?.adr ?? 0)} tone="#0891B2" />
          <KpiCard label="RevPAR" value={formatCurrency(dashData?.kpis?.revpar ?? 0)} tone="#7C3AED" />
          <KpiCard label="Entradas Caixa" value={formatCurrency(540000)} tone="#D97706" />
        </ScrollView>
        <Text style={fS.todoNote}>TODO: ligar entradas de caixa a endpoint próprio.</Text>
      </View>

      <View style={fS.blockCard}>
        <Text style={fS.blockTitle}>Receita Mês em Curso (MTD)</Text>
        {MOCK_CENTROS_MTD.map((item) => {
          const percent = centrosTotal > 0 ? Math.max(8, Math.round((item.valor / centrosTotal) * 100)) : 0;
          return (
            <View key={item.label} style={fS.progressRow}>
              <View style={fS.progressHead}>
                <Text style={fS.progressLabel}>{item.label}</Text>
                <Text style={fS.progressValue}>{formatCurrency(item.valor)}</Text>
              </View>
              <View style={fS.progressTrack}>
                <View style={[fS.progressFill, { width: `${percent}%`, backgroundColor: item.cor }]} />
              </View>
            </View>
          );
        })}
        <Text style={fS.todoNote}>TODO: ligar a endpoint de receita por centro de custo.</Text>
      </View>

      <View style={fS.blockCard}>
        <Text style={fS.blockTitle}>Entradas por Meio de Pagamento (Hoje / MTD)</Text>
        <Text style={fS.todoNote}>TODO: ligar a endpoint de recebimentos por método.</Text>
        <View style={fS.tableWrap}>
          <View style={[fS.tableRow, fS.tableHead]}>
            <Text style={[fS.tableCell, fS.tableHeadText, fS.tableCellMethod]}>Meio</Text>
            <Text style={[fS.tableCell, fS.tableHeadText]}>Hoje</Text>
            <Text style={[fS.tableCell, fS.tableHeadText]}>Mês (MTD)</Text>
          </View>
          {MOCK_PAGAMENTOS.map((item, index) => (
            <View key={item.metodo} style={[fS.tableRow, index % 2 === 1 && fS.tableRowAlt]}>
              <Text style={[fS.tableCell, fS.tableCellMethod]}>{item.metodo}</Text>
              <Text style={fS.tableCell}>{formatCurrency(item.hoje)}</Text>
              <Text style={fS.tableCell}>{formatCurrency(item.mes)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={fS.blockCard}>
        <Text style={fS.blockTitle}>Tesouraria</Text>
        <Text style={fS.todoNote}>TODO: ligar a endpoints de caixa e city ledger.</Text>
        <View style={fS.treasuryGrid}>
          {MOCK_TESOURARIA.map((item) => (
            <View key={item.label} style={fS.treasuryCard}>
              <View style={fS.treasuryIconWrap}>
                <Icon name={item.icon} size={18} color={COLORS.blue} strokeWidth={2} />
              </View>
              <Text style={fS.treasuryLabel}>{item.label}</Text>
              <Text style={fS.treasuryValue}>{item.valor}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={fS.blockCard}>
        <Text style={fS.blockTitle}>Alertas</Text>
        <Text style={fS.todoNote}>TODO: ligar a query de aging e faturas vencidas.</Text>
        <View style={fS.alertList}>
          {MOCK_ALERTAS.map((alerta) => (
            <View key={alerta} style={fS.alertRow}>
              <Icon name="alertCircle" size={18} color="#D97706" strokeWidth={2} />
              <Text style={fS.alertText}>{alerta}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function FinancasScreen({ businessId, accessToken, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => {
    if (!businessId || !accessToken) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const dash = await backendApi.getHtDashboard(businessId, accessToken);
        if (!cancelled) {
          setDashData(dash);
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch {
        // manter dados anteriores
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [businessId, accessToken]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab dashData={dashData} loading={loading} lastUpdatedAt={lastUpdatedAt} />;
      case 'faturacao':
        return <PlaceholderTab icon="portfolio" title="Faturação" subtitle="Lista de FT, FR, NC, ND, RC" />;
      case 'recebimentos':
        return <PlaceholderTab icon="payment" title="Recebimentos" subtitle="Entradas por turno e meio de pagamento" />;
      case 'caixas':
        return <PlaceholderTab icon="briefcase" title="Caixas" subtitle="Abertura e fecho de caixa por turno" />;
      case 'cityLedger':
        return <PlaceholderTab icon="tag" title="City Ledger" subtitle="Contas a receber por empresa / aging" />;
      case 'centros':
        return <PlaceholderTab icon="analytics" title="Centros de Receita" subtitle="Breakdown por Rooms, F&B, Outros" />;
      case 'relatorios':
        return (
          <PlaceholderTab icon="briefcase" title="Relatórios" subtitle="Relatórios operacionais e financeiros do PMS">
            <View style={fS.reportList}>
              {RELATORIOS_PLACEHOLDER.map((item) => (
                <TouchableOpacity key={item} style={fS.reportItem} disabled>
                  <Text style={fS.reportText}>{item}</Text>
                  <Icon name="chevronRight" size={16} color={COLORS.grayText} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          </PlaceholderTab>
        );
      case 'config':
        return <PlaceholderTab icon="settings" title="Configuração" subtitle="Séries de documentos, meios de pagamento, IVA" />;
      default:
        return null;
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={fS.root}>
      <View style={fS.header}>
        <View style={{ flex: 1 }}>
          <Text style={fS.headerTitle}>Módulo Financeiro</Text>
          <Text style={fS.headerSub}>KPIs, recebimentos, city ledger e relatórios</Text>
        </View>
        <TouchableOpacity style={fS.closeBtn} onPress={onClose}>
          <Icon name="close" size={20} color={COLORS.darkText} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={fS.tabScrollBar}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[fS.tabChip, activeTab === tab.id && fS.tabChipActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[fS.tabChipText, activeTab === tab.id && fS.tabChipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={fS.content} contentContainerStyle={fS.contentPad}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
    </Modal>
  );
}

const fS = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLine,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkText,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.grayText,
    marginTop: 3,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabScrollBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLine,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexGrow: 0,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    marginRight: 6,
  },
  tabChipActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  tabChipText: {
    fontSize: 13,
    color: COLORS.grayText,
  },
  tabChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentPad: {
    padding: 16,
    paddingBottom: 36,
  },
  tabPane: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: isTablet ? 'row' : 'column',
    alignItems: isTablet ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionMeta: {
    fontSize: 11,
    color: COLORS.grayText,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.grayText,
  },
  blockCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    padding: 14,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.darkText,
    marginBottom: 10,
  },
  todoNote: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.grayText,
  },
  kpiRow: {
    gap: 10,
    paddingRight: 8,
  },
  kpiCard: {
    width: isTablet ? 180 : 150,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
    minHeight: 88,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  kpiLabel: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.grayText,
    fontWeight: '600',
  },
  progressRow: {
    marginBottom: 12,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  progressValue: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '700',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  tableHead: {
    backgroundColor: '#F8FAFC',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: COLORS.darkText,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  tableCellMethod: {
    flex: 1.3,
  },
  tableHeadText: {
    fontWeight: '800',
    color: COLORS.grayText,
  },
  treasuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  treasuryCard: {
    width: isTablet ? '48.8%' : '48.2%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    padding: 12,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  treasuryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  treasuryLabel: {
    fontSize: 12,
    color: COLORS.grayText,
    fontWeight: '600',
  },
  treasuryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.darkText,
    marginTop: 6,
  },
  alertList: {
    gap: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#9A3412',
    fontWeight: '600',
  },
  placeholderWrap: {
    minHeight: 360,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.darkText,
  },
  placeholderSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.grayText,
    textAlign: 'center',
    maxWidth: 320,
  },
  reportList: {
    width: '100%',
    marginTop: 18,
    gap: 8,
  },
  reportItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLine,
    backgroundColor: '#FAFAFA',
    opacity: 0.7,
  },
  reportText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '600',
  },
});

/*
FASE 2 — Tabelas a criar no Prisma:
- HtCashRegister (abertura/fecho de caixa por turno)
- HtPaymentEntry (recebimentos detalhados com terminal, referência)
- HtDocument (FT, FR, NC, ND, RC com séries e hash AGT)
- HtDocumentItem (linhas de documento fiscal)
- HtCityLedgerAccount (conta-corrente por empresa)
- HtCityLedgerMovement (movimentos: débito fatura / crédito pagamento)
- HtRevenueCenter (centros de receita configuráveis)
- HtAdvance (pré-pagamentos de reservas futuras)
*/