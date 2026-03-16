/**
 * ============================================================================
 * CLAIM FLOW  (v1.0.0 — Fase 2: Onboarding do Dono)
 * ============================================================================
 * Modal completo para o dono reclamar a propriedade de um negócio existente
 * ou criar um novo (caso não encontre o seu na plataforma).
 *
 * Fluxo:
 *   1. Pesquisa — dono pesquisa negócios existentes na plataforma
 *   2. Se encontrar → submete claim com evidência
 *   3. Se não encontrar → cria manualmente OU reporta ao admin
 *   4. Painel de claims activos — estado de cada pedido pendente
 *
 * Props:
 *   visible           — boolean
 *   onClose           — () => void
 *   onCreateNew       — () => void  [abre fluxo de criação manual existente]
 *   accessToken       — string
 *   existingClaims    — array (refreshed ao abrir)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Animated, Keyboard,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, COLORS } from '../../core/AchAqui_Core';
import { apiRequest } from '../../lib/backendApi';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STEPS = {
  SEARCH:   'SEARCH',    // Passo 1 — pesquisar negócio
  CONFIRM:  'CONFIRM',   // Passo 2 — confirmar e submeter claim
  SUCCESS:  'SUCCESS',   // Passo 3 — claim submetido com sucesso
  CLAIMS:   'CLAIMS',    // Painel — ver claims activos
  REPORT:   'REPORT',    // Reportar negócio em falta ao admin
};

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendente',  color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' },
  APPROVED: { label: 'Aprovado',  color: '#22A06B', bg: '#F0FDF4', icon: '✅' },
  REJECTED: { label: 'Rejeitado', color: '#D32323', bg: '#FFF0F0', icon: '❌' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ClaimFlow({ visible, onClose, onCreateNew, accessToken }) {
  const insets = useSafeAreaInsets();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState(STEPS.SEARCH);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [selectedBiz, setSelectedBiz]     = useState(null);
  const [evidence, setEvidence]           = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [myClaims, setMyClaims]           = useState([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [reportNote, setReportNote]       = useState('');
  const [reportBizName, setReportBizName] = useState('');
  const [isReporting, setIsReporting]     = useState(false);

  const slideAnim  = useRef(new Animated.Value(0)).current;
  const searchRef  = useRef(null);
  const debounceRef = useRef(null);

  // ── Animação entrada/saída ───────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      resetState();
      loadMyClaims();
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function resetState() {
    setStep(STEPS.SEARCH);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBiz(null);
    setEvidence('');
    setReportNote('');
    setReportBizName('');
  }

  // ── Carregar claims activos ──────────────────────────────────────────────────
  const loadMyClaims = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingClaims(true);
    try {
      const data = await apiRequest('/claims/mine', { accessToken });
      setMyClaims(Array.isArray(data) ? data : []);
    } catch {
      setMyClaims([]);
    } finally {
      setIsLoadingClaims(false);
    }
  }, [accessToken]);

  // ── Pesquisa de negócios ─────────────────────────────────────────────────────
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiRequest(`/businesses/search?q=${encodeURIComponent(text)}`, {
          accessToken,
        });
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [accessToken]);

  // ── Seleccionar negócio para claim ──────────────────────────────────────────
  function handleSelectBusiness(biz) {
    Keyboard.dismiss();
    setSelectedBiz(biz);
    setStep(STEPS.CONFIRM);
  }

  // ── Submeter claim ──────────────────────────────────────────────────────────
  async function handleSubmitClaim() {
    if (!evidence.trim()) {
      Alert.alert('Evidência obrigatória', 'Descreve brevemente como podes provar que és o dono deste negócio.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/claims/${selectedBiz.id}`, {
        method: 'POST',
        body: { evidence: evidence.trim() },
        accessToken,
      });
      await loadMyClaims();
      setStep(STEPS.SUCCESS);
    } catch (err) {
      const msg = err?.message || 'Erro ao submeter pedido de claim.';
      Alert.alert('Erro', msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Cancelar claim ──────────────────────────────────────────────────────────
  async function handleCancelClaim(claimId) {
    Alert.alert(
      'Cancelar pedido',
      'Tens a certeza que queres cancelar este pedido de claim?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar pedido',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/claims/${claimId}`, { method: 'DELETE', accessToken });
              await loadMyClaims();
            } catch (err) {
              Alert.alert('Erro', err?.message || 'Não foi possível cancelar o pedido.');
            }
          },
        },
      ],
    );
  }

  // ── Reportar negócio em falta ───────────────────────────────────────────────
  async function handleReportMissing() {
    if (!reportNote.trim()) {
      Alert.alert('Nota obrigatória', 'Descreve o negócio que não encontraste.');
      return;
    }

    setIsReporting(true);
    try {
      await apiRequest('/claims/report-missing', {
        method: 'POST',
        body: { note: reportNote.trim(), businessName: reportBizName.trim() || undefined },
        accessToken,
      });
      Alert.alert(
        'Reportado com sucesso',
        'O admin irá analisar o teu pedido e adicionar o negócio à plataforma.',
        [{ text: 'OK', onPress: () => setStep(STEPS.SEARCH) }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o relatório. Tenta novamente.');
    } finally {
      setIsReporting(false);
    }
  }

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [900, 0],
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        s.overlay,
        { transform: [{ translateY }], paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => {
            if (step === STEPS.CONFIRM || step === STEPS.REPORT) {
              setStep(STEPS.SEARCH);
            } else if (step === STEPS.SUCCESS || step === STEPS.CLAIMS) {
              setStep(STEPS.SEARCH);
            } else {
              onClose();
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow" size={20} color={COLORS.darkText} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>
          {step === STEPS.SEARCH  && 'Adicionar negócio'}
          {step === STEPS.CONFIRM && 'Reclamar negócio'}
          {step === STEPS.SUCCESS && 'Pedido enviado'}
          {step === STEPS.CLAIMS  && 'Meus pedidos'}
          {step === STEPS.REPORT  && 'Reportar ao admin'}
        </Text>

        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="x" size={20} color={COLORS.grayText} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* ── PASSO 1: PESQUISA ───────────────────────────────────────────── */}
        {step === STEPS.SEARCH && (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {/* Banner informativo */}
            <View style={s.infoBanner}>
              <Text style={s.infoBannerIcon}>🔍</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.infoBannerTitle}>O teu negócio já está na plataforma?</Text>
                <Text style={s.infoBannerText}>
                  Pesquisa antes de criar um novo para evitar duplicados.
                </Text>
              </View>
            </View>

            {/* Campo de pesquisa */}
            <View style={s.searchBox}>
              <Icon name="search" size={18} color={COLORS.grayText} strokeWidth={2} />
              <TextInput
                ref={searchRef}
                style={s.searchInput}
                placeholder="Nome do negócio..."
                placeholderTextColor={COLORS.grayText}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Icon name="x" size={16} color={COLORS.grayText} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Loading */}
            {isSearching && (
              <View style={s.centeredRow}>
                <ActivityIndicator size="small" color={COLORS.red} />
                <Text style={s.loadingText}>A pesquisar...</Text>
              </View>
            )}

            {/* Resultados */}
            {!isSearching && searchResults.length > 0 && (
              <View style={s.resultsSection}>
                <Text style={s.sectionLabel}>Resultados ({searchResults.length})</Text>
                {searchResults.map((biz) => (
                  <TouchableOpacity
                    key={biz.id}
                    style={s.bizCard}
                    activeOpacity={0.7}
                    onPress={() => handleSelectBusiness(biz)}
                  >
                    <View style={s.bizCardIcon}>
                      <Text style={{ fontSize: 24 }}>
                        {biz.icon || '🏢'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bizCardName}>{biz.name}</Text>
                      <Text style={s.bizCardSub}>
                        {biz.category}{biz.description ? ` · ${biz.description.slice(0, 50)}` : ''}
                      </Text>
                      {biz.isClaimed && (
                        <View style={s.claimedBadge}>
                          <Text style={s.claimedBadgeText}>✓ Já reclamado</Text>
                        </View>
                      )}
                    </View>
                    {!biz.isClaimed && (
                      <Icon name="arrowRight" size={18} color={COLORS.red} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Não encontrou */}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <View style={s.notFoundBox}>
                <Text style={s.notFoundEmoji}>🤷</Text>
                <Text style={s.notFoundTitle}>Negócio não encontrado</Text>
                <Text style={s.notFoundText}>
                  O teu negócio ainda não está na plataforma. O que queres fazer?
                </Text>
                <TouchableOpacity
                  style={s.primaryBtn}
                  activeOpacity={0.8}
                  onPress={() => { onClose(); onCreateNew?.(); }}
                >
                  <Icon name="plusSquare" size={18} color={COLORS.white} strokeWidth={2} />
                  <Text style={s.primaryBtnText}>Criar negócio manualmente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.secondaryBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setReportBizName(searchQuery);
                    setStep(STEPS.REPORT);
                  }}
                >
                  <Icon name="info" size={18} color={COLORS.darkText} strokeWidth={2} />
                  <Text style={s.secondaryBtnText}>Reportar ao admin</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sem pesquisa — claims activos */}
            {searchQuery.length < 2 && (
              <View style={s.claimsPreview}>
                <View style={s.claimsPreviewHeader}>
                  <Text style={s.sectionLabel}>
                    Os meus pedidos {myClaims.length > 0 ? `(${myClaims.length})` : ''}
                  </Text>
                  {myClaims.length > 0 && (
                    <TouchableOpacity onPress={() => setStep(STEPS.CLAIMS)}>
                      <Text style={s.seeAllLink}>Ver todos</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isLoadingClaims ? (
                  <ActivityIndicator size="small" color={COLORS.red} style={{ marginTop: 12 }} />
                ) : myClaims.length === 0 ? (
                  <Text style={s.emptyText}>Ainda não tens pedidos de claim.</Text>
                ) : (
                  myClaims.slice(0, 3).map((claim) => (
                    <ClaimCard key={claim.id} claim={claim} onCancel={handleCancelClaim} />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── PASSO 2: CONFIRMAR CLAIM ────────────────────────────────────── */}
        {step === STEPS.CONFIRM && selectedBiz && (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.confirmBizCard}>
              <View style={s.bizCardIcon}>
                <Text style={{ fontSize: 32 }}>{selectedBiz.icon || '🏢'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.confirmBizName}>{selectedBiz.name}</Text>
                <Text style={s.bizCardSub}>{selectedBiz.category}</Text>
                {selectedBiz.description && (
                  <Text style={s.bizCardSub} numberOfLines={2}>{selectedBiz.description}</Text>
                )}
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.fieldLabel}>Evidência de propriedade *</Text>
              <Text style={s.fieldHint}>
                Descreve como podes provar que és o dono. Ex: NIF da empresa, número de registo comercial, referências contactáveis.
              </Text>
              <TextInput
                style={s.textArea}
                placeholder="Ex: NIF 12345678A, registo comercial nº 98765, posso fornecer documentos..."
                placeholderTextColor={COLORS.grayText}
                value={evidence}
                onChangeText={setEvidence}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={s.infoNote}>
              <Text style={s.infoNoteText}>
                💡 O admin irá rever o teu pedido e entrar em contacto se necessário. O processo demora normalmente 24–48h.
              </Text>
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.cancelActionBtn}
                onPress={() => setStep(STEPS.SEARCH)}
                activeOpacity={0.7}
              >
                <Text style={s.cancelActionBtnText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
                onPress={handleSubmitClaim}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="share" size={16} color={COLORS.white} strokeWidth={2} />
                    <Text style={s.submitBtnText}>Submeter pedido</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── PASSO 3: SUCESSO ────────────────────────────────────────────── */}
        {step === STEPS.SUCCESS && (
          <View style={s.successContainer}>
            <Text style={s.successEmoji}>🎉</Text>
            <Text style={s.successTitle}>Pedido enviado!</Text>
            <Text style={s.successText}>
              O teu pedido de claim para{' '}
              <Text style={{ fontWeight: '700' }}>{selectedBiz?.name}</Text>{' '}
              foi submetido. O admin irá analisar e responder em 24–48h.
            </Text>

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => setStep(STEPS.CLAIMS)}
              activeOpacity={0.8}
            >
              <Text style={s.primaryBtnText}>Ver os meus pedidos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: 8 }]}
              onPress={() => { resetState(); }}
              activeOpacity={0.7}
            >
              <Text style={s.secondaryBtnText}>Pesquisar outro negócio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PAINEL: CLAIMS ACTIVOS ──────────────────────────────────────── */}
        {step === STEPS.CLAIMS && (
          <ScrollView style={{ flex: 1 }}>
            {isLoadingClaims ? (
              <View style={s.centeredRow}>
                <ActivityIndicator size="small" color={COLORS.red} />
              </View>
            ) : myClaims.length === 0 ? (
              <View style={s.successContainer}>
                <Text style={s.successEmoji}>📋</Text>
                <Text style={s.successTitle}>Sem pedidos</Text>
                <Text style={s.successText}>
                  Ainda não submeteste nenhum pedido de claim.
                </Text>
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={() => setStep(STEPS.SEARCH)}
                  activeOpacity={0.8}
                >
                  <Text style={s.primaryBtnText}>Pesquisar negócios</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.section}>
                {myClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onCancel={handleCancelClaim}
                    expanded
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── PASSO REPORT: REPORTAR AO ADMIN ────────────────────────────── */}
        {step === STEPS.REPORT && (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.infoBanner}>
              <Text style={s.infoBannerIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.infoBannerTitle}>Reportar negócio em falta</Text>
                <Text style={s.infoBannerText}>
                  O admin irá adicionar o negócio à plataforma e notificar-te.
                </Text>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.fieldLabel}>Nome do negócio</Text>
              <TextInput
                style={s.textInput}
                placeholder="Ex: Restaurante O Cais, Hotel Ilha..."
                placeholderTextColor={COLORS.grayText}
                value={reportBizName}
                onChangeText={setReportBizName}
              />

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Informações adicionais *</Text>
              <Text style={s.fieldHint}>
                Morada, tipo de negócio, contacto, ou qualquer informação útil para o admin encontrar e adicionar o negócio.
              </Text>
              <TextInput
                style={s.textArea}
                placeholder="Ex: Restaurante de comida angolana na Av. 4 de Fevereiro, Luanda. Tel: 900 000 000"
                placeholderTextColor={COLORS.grayText}
                value={reportNote}
                onChangeText={setReportNote}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.cancelActionBtn}
                onPress={() => setStep(STEPS.SEARCH)}
                activeOpacity={0.7}
              >
                <Text style={s.cancelActionBtnText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, isReporting && s.submitBtnDisabled]}
                onPress={handleReportMissing}
                activeOpacity={0.8}
                disabled={isReporting}
              >
                {isReporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="info" size={16} color={COLORS.white} strokeWidth={2} />
                    <Text style={s.submitBtnText}>Enviar relatório</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ─── Claim Card ───────────────────────────────────────────────────────────────

function ClaimCard({ claim, onCancel, expanded = false }) {
  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;

  return (
    <View style={s.claimCard}>
      <View style={s.claimCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.claimCardBizName}>{claim.business?.name || 'Negócio'}</Text>
          <Text style={s.claimCardBizCat}>{claim.business?.category}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.statusBadgeText, { color: cfg.color }]}>
            {cfg.icon} {cfg.label}
          </Text>
        </View>
      </View>

      {expanded && claim.evidence && (
        <Text style={s.claimEvidence} numberOfLines={2}>
          "{claim.evidence}"
        </Text>
      )}

      {expanded && claim.adminNote && (
        <View style={s.adminNoteBox}>
          <Text style={s.adminNoteLabel}>Nota do admin:</Text>
          <Text style={s.adminNoteText}>{claim.adminNote}</Text>
        </View>
      )}

      {claim.status === 'PENDING' && (
        <TouchableOpacity
          style={s.cancelClaimBtn}
          onPress={() => onCancel(claim.id)}
          activeOpacity={0.7}
        >
          <Text style={s.cancelClaimBtnText}>Cancelar pedido</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.white, zIndex: 25000,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.darkText },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center',
  },

  // Banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    margin: 16, padding: 14, backgroundColor: '#EFF6FF',
    borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoBannerIcon:  { fontSize: 24 },
  infoBannerTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 2 },
  infoBannerText:  { fontSize: 13, color: '#3B82F6', lineHeight: 18 },

  // Pesquisa
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.grayBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.darkText },

  // Loading
  centeredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  loadingText: { fontSize: 14, color: COLORS.grayText },

  // Resultados
  resultsSection: { paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel:   { fontSize: 12, fontWeight: '600', color: COLORS.grayText, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  bizCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine,
  },
  bizCardIcon: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center',
  },
  bizCardName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 },
  bizCardSub:  { fontSize: 12, color: COLORS.grayText, lineHeight: 16 },
  claimedBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  claimedBadgeText: { fontSize: 11, color: COLORS.green, fontWeight: '600' },

  // Não encontrou
  notFoundBox: { margin: 16, padding: 24, backgroundColor: COLORS.grayBg, borderRadius: 16, alignItems: 'center' },
  notFoundEmoji: { fontSize: 48, marginBottom: 12 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', color: COLORS.darkText, marginBottom: 6 },
  notFoundText:  { fontSize: 14, color: COLORS.grayText, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Botões
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.red, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    width: '100%', marginBottom: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.grayBg, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    width: '100%',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.darkText },

  // Claims preview
  claimsPreview: { marginHorizontal: 16, marginTop: 12 },
  claimsPreviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  seeAllLink: { fontSize: 13, fontWeight: '600', color: COLORS.red },
  emptyText:  { fontSize: 14, color: COLORS.grayText, paddingVertical: 8 },

  // Confirm
  confirmBizCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    margin: 16, padding: 16, backgroundColor: COLORS.grayBg, borderRadius: 14,
  },
  confirmBizName: { fontSize: 17, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 },

  section: { paddingHorizontal: 16, paddingVertical: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: COLORS.darkText, marginBottom: 4 },
  fieldHint:  { fontSize: 12, color: COLORS.grayText, lineHeight: 17, marginBottom: 8 },
  textInput: {
    backgroundColor: COLORS.grayBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.darkText,
  },
  textArea: {
    backgroundColor: COLORS.grayBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.darkText, minHeight: 110,
  },
  infoNote: {
    margin: 16, padding: 12, backgroundColor: '#FFFBEB',
    borderRadius: 10, borderWidth: 1, borderColor: '#FEF3C7',
  },
  infoNoteText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  actionRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 20,
  },
  cancelActionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.grayBg, alignItems: 'center',
  },
  cancelActionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.darkText },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // Sucesso
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: COLORS.darkText, marginBottom: 10, textAlign: 'center' },
  successText:  { fontSize: 15, color: COLORS.grayText, lineHeight: 22, textAlign: 'center', marginBottom: 28 },

  // Claim card
  claimCard: {
    backgroundColor: COLORS.grayBg, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  claimCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  claimCardBizName: { fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 },
  claimCardBizCat:  { fontSize: 12, color: COLORS.grayText },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  claimEvidence: { fontSize: 12, color: COLORS.grayText, marginTop: 8, fontStyle: 'italic', lineHeight: 16 },
  adminNoteBox:  { marginTop: 8, padding: 8, backgroundColor: '#FFF7ED', borderRadius: 8 },
  adminNoteLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  adminNoteText:  { fontSize: 12, color: '#92400E', lineHeight: 16 },
  cancelClaimBtn: {
    marginTop: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.white, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.grayLine,
  },
  cancelClaimBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.red },
});