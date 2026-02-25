/**
 * ============================================================================
 * ACHEIAQUI MAIN  (v2.10.0)
 * ============================================================================
 * Ponto de entrada da aplicação.
 * Integra o AppShell (Core) com o BusinessEngine e mantém os modais
 * da camada de descoberta (home, lista de negócios, detalhe).
 *
 * ARQUITECTURA:
 *
 *   App (root)
 *   └── AppShell (Core — SafeAreaProvider + AppContext + StatusBar)
 *       └── AcheiAquiApp
 *           ├── SearchHeader  (Core)
 *           ├── [HomeScreen | BusinessDetail | OwnerDashboard]
 *           │       ↓ quando abre detalhe de negócio
 *           │   BusinessDetailModal
 *           │       └── BusinessEngine ← ROTEADOR OPERACIONAL
 *           │               ├── HospitalityModule (Fase 2)
 *           │               ├── BeautyWellnessModule (Fase 2)
 *           │               ├── DiningModule (Fase 3)
 *           │               └── ...
 *           └── NavigationBar (Core)
 *
 * ESTADO NESTE FICHEIRO:
 *   Apenas o que não pertence a nenhum módulo nem ao Core:
 *   - selectedBusinessId / showDetail (navegação para detalhe)
 *   - activeFilter, sortBy, searchFilters (filtros da lista home)
 *   - activeCategoryId (chip activo)
 *   - Modais de UI rápida (sort, advanced filters, all categories)
 *
 * ESTADO QUE SAI DAQUI (Fase 2+):
 *   - Todo o estado de reservas → HospitalityModule / BeautyModule
 *   - Todo o estado de owner settings → OwnerDashboard (ficheiro separado)
 *   - roomTypes, roomBlocks, etc. → HospitalityModule
 *
 * COMUNICAÇÃO ENTRE CAMADAS:
 *   Core  →  Main  via  useAppContext()
 *   Main  →  Engine via props  { business, mode, onBookingDone, onClose }
 *   Engine → Main  via callbacks onBookingDone / onClose
 *
 * FASE 2: Extrair OwnerDashboard para AcheiAqui_Owner.jsx
 * FASE 2: Extrair BusinessDetailModal para AcheiAqui_Detail.jsx
 * ============================================================================
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  SafeAreaView, FlatList, Image, TextInput, Alert, Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Core ──────────────────────────────────────────────────────────────────────
import {
  AppShell, useAppContext, Icon, COLORS, SCREEN_WIDTH,
  CATEGORIES, ALL_CATEGORIES, ALL_CAT_IDS, ALL_CAT_LABEL, ALL_CAT_ICON,
  CATEGORY_TO_BUSINESS_TYPES, BUSINESS_TYPE_BADGES, PRICE_FILTERS,
  DISTANCE_FILTERS, OWNER_BUSINESS, formatCurrency, renderStars,
  isAccommodationBusiness, NavigationBar, SearchHeader,
} from './AcheiAqui_Core';

// ── Engine ────────────────────────────────────────────────────────────────────
import { BusinessEngine } from './BusinessEngine';

// ── Mock data (Fase 1 — substituir por API calls na Fase 2) ──────────────────
// CONTRATO: GET /businesses → Business[]
const MOCK_BUSINESSES = [
  {
    id: '1', name: 'Pizzaria Bela Vista', category: 'Restaurante Italiano',
    businessType: 'food', primaryCategoryId: 'restaurants', subCategoryIds: ['food','nightlife','hotelsTravel'],
    rating: 4.8, reviews: 127, priceLevel: 2, distance: 0.3,
    isOpen: true, isPremium: true, promo: '20% OFF',
    address: 'Rua Valodia 123, Talatona', neighborhood: 'Talatona',
    latitude: -8.8388, longitude: 13.2894,
    statusText: 'Aberto • até 23:00', isPublic: true, verified: true,
    photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    amenities: ['wifi','parking','delivery','outdoor'],
    modules: { gastronomy: true, accommodation: true, delivery: true, customorder: true },
    roomTypes: [
      { id: '1', name: 'Quarto Standard', pricePerNight: 12000, maxGuests: 2, totalRooms: 5, amenities: ['wifi','ac'], available: true, taxRate: 14, weekendMultiplier: 1.2, minNights: 1, bookedRanges: [], seasonalRates: [] },
    ],
    highlights: ['"Pizza autêntica"', '"Ambiente familiar"'],
    commissionRate: 0.10, // informativo — split calculado no backend
  },
  {
    id: '2', name: 'Farmácia Central', category: 'Farmácia 24h',
    businessType: 'health', primaryCategoryId: 'health', subCategoryIds: ['health'],
    rating: 4.6, reviews: 89, priceLevel: 2, distance: 1.2,
    isOpen: true, isPremium: false,
    address: 'Av. Marginal 456, Miramar', neighborhood: 'Miramar',
    statusText: 'Aberto 24h', isPublic: true, verified: false,
    photos: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'],
    amenities: ['wheelchair'],
    modules: { health: true },
    commissionRate: 0.08,
  },
  {
    id: '3', name: 'Supermercado Shoprite', category: 'Supermercado',
    businessType: 'retail', primaryCategoryId: 'shopping', subCategoryIds: ['shopping','food'],
    rating: 4.3, reviews: 312, priceLevel: 2, distance: 2.1,
    isOpen: true, isPremium: false,
    address: 'Bairro Alvalade, Rua 12', neighborhood: 'Alvalade',
    statusText: 'Aberto • até 21:00', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'],
    amenities: ['parking','wheelchair'],
    modules: { retail: true, delivery: true },
    commissionRate: 0.07,
  },
  {
    id: '4', name: 'Café Musseque', category: 'Café & Brunch',
    businessType: 'food', primaryCategoryId: 'coffee', subCategoryIds: ['coffee','bars'],
    rating: 4.7, reviews: 54, priceLevel: 1, distance: 0.8,
    isOpen: true, isPremium: false, promo: 'Brunch especial',
    address: 'Talatona Business Park', neighborhood: 'Talatona',
    statusText: 'Aberto • até 22:00', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
    amenities: ['wifi','outdoor'],
    modules: { gastronomy: true },
    commissionRate: 0.10,
  },
  {
    id: '5', name: 'Restaurante Sabores', category: 'Culinária Angolana',
    businessType: 'food', primaryCategoryId: 'restaurants', subCategoryIds: ['food','localflavor'],
    rating: 4.5, reviews: 203, priceLevel: 2, distance: 3.4,
    isOpen: false, isPremium: false,
    address: 'Rua da Missão 789, Ingombota', neighborhood: 'Ingombota',
    statusText: 'Fechado • abre às 11:00', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'],
    amenities: ['wifi','parking'],
    modules: { gastronomy: true, delivery: true },
    commissionRate: 0.10,
  },
  {
    id: '6', name: 'Barbearia Style', category: 'Barbearia',
    businessType: 'beauty', primaryCategoryId: 'beautysalons', subCategoryIds: ['beauty','localservices'],
    rating: 4.9, reviews: 78, priceLevel: 2, distance: 1.5,
    isOpen: true, isPremium: false,
    address: 'Kilamba, Bloco C12', neighborhood: 'Kilamba',
    statusText: 'Aberto • até 20:00', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'],
    amenities: ['wifi'],
    modules: { health: true },
    commissionRate: 0.12,
  },
  {
    id: '7', name: 'Studio Design', category: 'Design Gráfico',
    businessType: 'freelancer', primaryCategoryId: 'professional', subCategoryIds: ['arts','professional'],
    rating: 4.4, reviews: 32, priceLevel: 3, distance: 5.2,
    isOpen: true, isPremium: false,
    address: 'Online / Luanda', neighborhood: 'Remoto',
    statusText: 'Disponível', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800'],
    amenities: ['online'],
    modules: { professional: true, customorder: true },
    commissionRate: 0.12,
  },
  {
    id: '8', name: 'FitCoach Angola', category: 'Personal Trainer',
    businessType: 'health', primaryCategoryId: 'active', subCategoryIds: ['health','active'],
    rating: 5.0, reviews: 41, priceLevel: 3, distance: 2.8,
    isOpen: true, isPremium: false,
    address: 'Talatona Sports Club', neighborhood: 'Talatona',
    statusText: 'Disponível hoje', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'],
    amenities: ['outdoor'],
    modules: { health: true },
    commissionRate: 0.12,
  },
  {
    id: '9', name: 'Dr. António Ferreira', category: 'Advogado',
    businessType: 'professional', primaryCategoryId: 'professional', subCategoryIds: ['professional','financial'],
    rating: 4.6, reviews: 28, priceLevel: 4, distance: 4.1,
    isOpen: true, isPremium: false,
    address: 'Av. 4 de Fevereiro, Ed. Multiusos', neighborhood: 'Baixa',
    statusText: 'Atendimento com marcação', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'],
    amenities: ['wifi','parking'],
    modules: { professional: true },
    commissionRate: 0.08,
  },
  {
    id: '10', name: 'English Pro Academy', category: 'Escola de Inglês',
    businessType: 'education', primaryCategoryId: 'education', subCategoryIds: ['education','localservices'],
    rating: 4.8, reviews: 95, priceLevel: 2, distance: 3.7,
    isOpen: true, isPremium: false,
    address: 'Talatona, Rua das Acácias', neighborhood: 'Talatona',
    statusText: 'Aberto • até 20:00', isPublic: true,
    photos: ['https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'],
    amenities: ['wifi'],
    modules: { education: true },
    commissionRate: 0.10,
  },
  // OWNER_BUSINESS injectado no estado inicial via AppProvider
];

// ─────────────────────────────────────────────────────────────────────────────
// SORT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recomendados'    },
  { id: 'rating',      label: 'Melhor Avaliados'},
  { id: 'distance',    label: 'Mais Próximos'   },
  { id: 'reviews',     label: 'Mais Avaliados'  },
  { id: 'newest',      label: 'Mais Recentes'   },
  { id: 'lowest',      label: 'Pior Avaliação'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS CARD — card compacto para a lista home
// ─────────────────────────────────────────────────────────────────────────────
function BusinessCard({ business, onPress, isBookmarked, onBookmark }) {
  const badge     = BUSINESS_TYPE_BADGES[business.businessType] || BUSINESS_TYPE_BADGES.other;
  const heroUri   = business.photos?.[0];

  return (
    <TouchableOpacity style={cardS.card} onPress={onPress} activeOpacity={0.92}>
      {/* Hero image */}
      <View style={cardS.heroWrap}>
        {heroUri
          ? <Image source={{ uri: heroUri }} style={cardS.hero} resizeMode="cover" />
          : <View style={[cardS.hero, cardS.heroFallback]}><Text style={cardS.heroEmoji}>{badge.icon}</Text></View>
        }
        {/* Badges */}
        {business.promo && (
          <View style={cardS.promoBadge}><Text style={cardS.promoText}>{business.promo}</Text></View>
        )}
        {business.verified && (
          <View style={cardS.verifiedBadge}>
            <Icon name="verified" size={10} color={COLORS.white} strokeWidth={2.5} />
          </View>
        )}
        {/* Bookmark */}
        <TouchableOpacity style={cardS.bookmarkBtn} onPress={onBookmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name={isBookmarked ? 'bookmarkFilled' : 'bookmark'} size={18} color={isBookmarked ? COLORS.red : COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={cardS.info}>
        <View style={cardS.infoTop}>
          <Text style={cardS.name} numberOfLines={1}>{business.name}</Text>
          <View style={cardS.ratingRow}>
            <Text style={cardS.ratingText}>★ {business.rating}</Text>
            <Text style={cardS.reviewCount}>({business.reviews})</Text>
          </View>
        </View>
        <View style={cardS.infoBottom}>
          <View style={[cardS.typeBadge, { backgroundColor: badge.color + '15' }]}>
            <Text style={[cardS.typeText, { color: badge.color }]}>{badge.icon} {badge.label}</Text>
          </View>
          <View style={cardS.metaRow}>
            <Text style={cardS.metaText}>{business.distance} km</Text>
            <Text style={cardS.metaDot}>·</Text>
            <Text style={[cardS.metaText, { color: business.isOpen ? COLORS.green : '#EF4444' }]}>
              {business.isOpen ? 'Aberto' : 'Fechado'}
            </Text>
          </View>
        </View>
        <Text style={cardS.statusText} numberOfLines={1}>{business.statusText}</Text>
      </View>
    </TouchableOpacity>
  );
}

const cardS = StyleSheet.create({
  card:         { backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  heroWrap:     { position: 'relative', height: 160 },
  hero:         { width: '100%', height: '100%' },
  heroFallback: { backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  heroEmoji:    { fontSize: 40 },
  promoBadge:   { position: 'absolute', top: 10, left: 10, backgroundColor: COLORS.red, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  promoText:    { fontSize: 10, fontWeight: '700', color: COLORS.white },
  verifiedBadge:{ position: 'absolute', top: 10, left: 10, backgroundColor: '#1565C0', borderRadius: 12, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bookmarkBtn:  { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 18, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  info:         { padding: 12 },
  infoTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name:         { fontSize: 15, fontWeight: '700', color: COLORS.darkText, flex: 1, marginRight: 8 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText:   { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  reviewCount:  { fontSize: 11, color: COLORS.grayText },
  infoBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeText:     { fontSize: 11, fontWeight: '600' },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 12, color: COLORS.grayText, fontWeight: '500' },
  metaDot:      { fontSize: 12, color: COLORS.grayText },
  statusText:   { fontSize: 11, color: COLORS.grayText },
});

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS DETAIL MODAL
// Wrapper que apresenta o BusinessEngine dentro de um Modal.
// Fase 2: extrair para AcheiAqui_Detail.jsx com todos os tabs e lógica.
// ─────────────────────────────────────────────────────────────────────────────
function BusinessDetailModal({ visible, business, onClose }) {
  const { isBusinessMode, bookmarkedIds, toggleBookmark } = useAppContext();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('engine');
  const mode = isBusinessMode ? 'owner' : 'client';

  if (!business) return null;

  const badge = BUSINESS_TYPE_BADGES[business.businessType] || BUSINESS_TYPE_BADGES.other;
  const tabs = ['engine', 'info', 'reviews'];
  const tabLabels = { engine: '🔌 Módulo', info: 'ℹ️ Info', reviews: '⭐ Avaliações' };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        {/* Header */}
        <View style={detS.header}>
          <TouchableOpacity onPress={onClose} style={detS.closeBtn}>
            <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2} />
          </TouchableOpacity>
          <View style={detS.headerCenter}>
            <Text style={detS.headerName} numberOfLines={1}>{business.name}</Text>
            <View style={[detS.headerBadge, { backgroundColor: badge.color + '18' }]}>
              <Text style={[detS.headerBadgeText, { color: badge.color }]}>{badge.icon} {badge.label}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={detS.bookmarkBtn}
            onPress={() => toggleBookmark(business.id)}
          >
            <Icon
              name={bookmarkedIds.includes(business.id) ? 'bookmarkFilled' : 'bookmark'}
              size={20}
              color={bookmarkedIds.includes(business.id) ? COLORS.red : COLORS.darkText}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={detS.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t}
              style={[detS.tab, activeTab === t && detS.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[detS.tabText, activeTab === t && detS.tabTextActive]}>
                {tabLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={{ flex: 1, backgroundColor: COLORS.grayBg }}>
          {activeTab === 'engine' && (
            <BusinessEngine
              business={business}
              mode={mode}
              onBookingDone={() => Alert.alert('Reserva', 'Fluxo de reserva — disponível na Fase 2')}
              onClose={onClose}
            />
          )}

          {activeTab === 'info' && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {/* Info cards */}
              {[
                { icon: 'location',    label: 'Morada',     value: business.address },
                { icon: 'phone',       label: 'Telefone',   value: business.phone || 'Não disponível' },
                { icon: 'clock',       label: 'Horário',    value: business.statusText },
                { icon: 'mapPin',      label: 'Zona',       value: business.neighborhood },
              ].map(item => (
                <View key={item.label} style={detS.infoCard}>
                  <View style={detS.infoIconWrap}>
                    <Icon name={item.icon} size={16} color={COLORS.red} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={detS.infoLabel}>{item.label}</Text>
                    <Text style={detS.infoValue}>{item.value}</Text>
                  </View>
                </View>
              ))}

              {/* Amenities */}
              {(business.amenities || []).length > 0 && (
                <View style={detS.amenitiesCard}>
                  <Text style={detS.sectionLabel}>COMODIDADES</Text>
                  <View style={detS.amenitiesWrap}>
                    {business.amenities.map(a => (
                      <View key={a} style={detS.amenityChip}>
                        <Text style={detS.amenityText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Commission note (só no modo dono — nunca mostrar ao cliente) */}
              {isBusinessMode && (
                <View style={[detS.infoCard, { backgroundColor: '#FFF3CD', borderColor: '#F59E0B40' }]}>
                  <View style={[detS.infoIconWrap, { backgroundColor: '#F59E0B18' }]}>
                    <Icon name="payment" size={16} color="#F59E0B" strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={detS.infoLabel}>Comissão AcheiAqui</Text>
                    <Text style={detS.infoValue}>{((business.commissionRate || 0.10) * 100).toFixed(0)}% — calculada no backend</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {activeTab === 'reviews' && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={detS.reviewsEmpty}>
                <Text style={detS.reviewsEmptyEmoji}>⭐</Text>
                <Text style={detS.reviewsEmptyTitle}>Avaliações</Text>
                <Text style={detS.reviewsEmptySub}>
                  O sistema de avaliações completo está disponível no app_v2_9_32.jsx.{'\n'}
                  Será migrado para AcheiAqui_Detail.jsx na Fase 2.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const detS = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine, gap: 12 },
  closeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  headerCenter:    { flex: 1, gap: 3 },
  headerName:      { fontSize: 16, fontWeight: '800', color: COLORS.darkText },
  headerBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
  headerBadgeText: { fontSize: 10, fontWeight: '700' },
  bookmarkBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  tabRow:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  tab:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.grayBg },
  tabActive:       { backgroundColor: COLORS.red + '15', borderWidth: 1.5, borderColor: COLORS.red },
  tabText:         { fontSize: 12, fontWeight: '600', color: COLORS.grayText },
  tabTextActive:   { color: COLORS.red, fontWeight: '700' },
  infoCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.grayLine },
  infoIconWrap:    { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.redLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel:       { fontSize: 10, color: COLORS.grayText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:       { fontSize: 14, color: COLORS.darkText, fontWeight: '500', marginTop: 2 },
  amenitiesCard:   { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.grayLine },
  sectionLabel:    { fontSize: 10, fontWeight: '700', color: COLORS.grayText, letterSpacing: 1, marginBottom: 10 },
  amenitiesWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip:     { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.grayBg, borderRadius: 20, borderWidth: 1, borderColor: COLORS.grayLine },
  amenityText:     { fontSize: 12, color: COLORS.darkText },
  reviewsEmpty:    { alignItems: 'center', paddingTop: 40, gap: 8 },
  reviewsEmptyEmoji:{ fontSize: 40 },
  reviewsEmptyTitle:{ fontSize: 18, fontWeight: '700', color: COLORS.darkText },
  reviewsEmptySub: { fontSize: 13, color: COLORS.grayText, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME SCREEN — lista de negócios com filtros e chips de categoria
// ─────────────────────────────────────────────────────────────────────────────
function HomeScreen({ onBusinessPress }) {
  const { businesses, bookmarkedIds, toggleBookmark, searchWhat } = useAppContext();
  const [activeFilter, setActiveFilter]       = useState('open');
  const [sortBy, setSortBy]                   = useState('recommended');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [showSortModal, setShowSortModal]     = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [priceFilter, setPriceFilter]         = useState('all');
  const [includeClosed, setIncludeClosed]     = useState(false);
  const scrollRef = useRef(null);

  // Filtro reactivo — todos os critérios calculados num único useMemo
  const filtered = useMemo(() => {
    return businesses.filter(b => {
      // Visibilidade
      if (!b.isPublic) return false;

      // Pesquisa
      if (searchWhat.trim()) {
        const q = searchWhat.toLowerCase();
        const match = b.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.neighborhood || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      // Estado (aberto/promoção)
      if (activeFilter === 'open'  && !b.isOpen && !includeClosed) return false;
      if (activeFilter === 'promo' && !b.promo) return false;
      if (activeFilter === 'top'   && b.rating < 4.5) return false;

      // Categoria
      if (activeCategoryId) {
        const matchPrimary = b.primaryCategoryId === activeCategoryId;
        const matchSub     = Array.isArray(b.subCategoryIds) && b.subCategoryIds.includes(activeCategoryId);

        if (ALL_CAT_IDS.has(activeCategoryId)) {
          // Categoria específica → exact match obrigatório
          if (!matchPrimary && !matchSub) return false;
        } else {
          // Chip principal → smart fallback
          if (activeCategoryId === 'hotels' || activeCategoryId === 'hotelsTravel') {
            if (!isAccommodationBusiness(b) && !matchPrimary && !matchSub) return false;
          } else {
            const types     = CATEGORY_TO_BUSINESS_TYPES[activeCategoryId] || [];
            const matchType = types.includes(b.businessType);
            const moduleMap = { restaurants: 'gastronomy', delivery: 'delivery', shopping: 'retail', health: 'health', services: 'professional' };
            const matchMod  = moduleMap[activeCategoryId] && b.modules?.[moduleMap[activeCategoryId]];
            if (!matchType && !matchMod && !matchPrimary && !matchSub) return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'rating':   return b.rating - a.rating;
        case 'distance': return (a.distance || 99) - (b.distance || 99);
        case 'reviews':  return (b.reviews || 0) - (a.reviews || 0);
        case 'lowest':   return a.rating - b.rating;
        default:         return (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0);
      }
    });
  }, [businesses, searchWhat, activeFilter, sortBy, activeCategoryId, includeClosed]);

  const FILTER_CHIPS = [
    { id: 'all',   label: 'Todos'       },
    { id: 'open',  label: 'Aberto agora'},
    { id: 'promo', label: 'Promoções'   },
    { id: 'top',   label: 'Mais avaliados'},
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Category chips */}
        <View style={homeS.categoryWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeS.categoryRow}>
            {CATEGORIES.map(cat => {
              const isActive     = activeCategoryId === cat.id;
              const isMoreActive = cat.id === 'more' && ALL_CAT_IDS.has(activeCategoryId);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[homeS.categoryChip, (isActive || isMoreActive) && homeS.categoryChipActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (cat.id === 'more') { setShowAllCategories(true); return; }
                    setActiveCategoryId(prev => prev === cat.id ? null : cat.id);
                  }}
                >
                  <Icon name={cat.icon} size={14} color={(isActive || isMoreActive) ? COLORS.red : COLORS.darkText} strokeWidth={isActive ? 2.5 : 1.5} />
                  <Text style={[homeS.categoryChipLabel, (isActive || isMoreActive) && homeS.categoryChipLabelActive]}>
                    {isMoreActive ? (ALL_CAT_LABEL[activeCategoryId] || cat.label) : cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filter bar */}
        <View style={homeS.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeS.filterRow}>
            {FILTER_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip.id}
                style={[homeS.filterChip, activeFilter === chip.id && homeS.filterChipActive]}
                onPress={() => setActiveFilter(chip.id)}
              >
                <Text style={[homeS.filterChipText, activeFilter === chip.id && homeS.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={homeS.sortBtn} onPress={() => setShowSortModal(true)}>
            <Icon name="sort" size={16} color={COLORS.darkText} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Results count */}
        <View style={homeS.resultsRow}>
          <Text style={homeS.resultsText}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
          {activeCategoryId && (
            <TouchableOpacity onPress={() => setActiveCategoryId(null)}>
              <Text style={homeS.clearFilter}>Limpar filtro ×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Business list */}
        {filtered.length === 0 ? (
          <View style={homeS.emptyState}>
            <Text style={homeS.emptyEmoji}>🔍</Text>
            <Text style={homeS.emptyTitle}>Nenhum resultado</Text>
            <Text style={homeS.emptySub}>Tenta outros filtros ou pesquisa diferente.</Text>
          </View>
        ) : (
          filtered.map(b => (
            <BusinessCard
              key={b.id}
              business={b}
              onPress={() => onBusinessPress(b)}
              isBookmarked={bookmarkedIds.includes(b.id)}
              onBookmark={() => toggleBookmark(b.id)}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sort modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity style={homeS.sortOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={homeS.sortSheet}>
            <Text style={homeS.sortTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[homeS.sortOption, sortBy === opt.id && homeS.sortOptionActive]}
                onPress={() => { setSortBy(opt.id); setShowSortModal(false); }}
              >
                <Text style={[homeS.sortOptionText, sortBy === opt.id && homeS.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.id && <Icon name="check" size={16} color={COLORS.red} strokeWidth={2.5} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All categories modal */}
      <Modal visible={showAllCategories} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllCategories(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
          <View style={homeS.allCatHeader}>
            <Text style={homeS.allCatTitle}>Todas as Categorias</Text>
            <TouchableOpacity onPress={() => setShowAllCategories(false)} style={homeS.allCatClose}>
              <Icon name="close" size={18} color={COLORS.darkText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {ALL_CATEGORIES.map(section => (
              <View key={section.section} style={{ marginBottom: 8 }}>
                <Text style={homeS.allCatSection}>{section.section}</Text>
                {section.items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[homeS.allCatItem, activeCategoryId === item.id && homeS.allCatItemActive]}
                    onPress={() => {
                      setActiveCategoryId(prev => prev === item.id ? null : item.id);
                      setShowAllCategories(false);
                    }}
                  >
                    <Icon name={item.icon} size={18} color={activeCategoryId === item.id ? COLORS.red : COLORS.darkText} strokeWidth={1.5} />
                    <Text style={[homeS.allCatItemText, activeCategoryId === item.id && { color: COLORS.red, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                    {activeCategoryId === item.id && <Icon name="check" size={16} color={COLORS.red} strokeWidth={2.5} />}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const homeS = StyleSheet.create({
  categoryWrapper:  { backgroundColor: COLORS.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  categoryRow:      { paddingHorizontal: 16, gap: 8 },
  categoryChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.grayBg, borderWidth: 1, borderColor: COLORS.grayLine },
  categoryChipActive:{ backgroundColor: COLORS.red + '15', borderColor: COLORS.red, borderWidth: 1.5 },
  categoryChipLabel:{ fontSize: 13, fontWeight: '600', color: COLORS.darkText },
  categoryChipLabelActive: { color: COLORS.red, fontWeight: '700' },
  filterBar:        { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12, paddingVertical: 8, gap: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  filterRow:        { flex: 1, gap: 8 },
  filterChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.grayBg, borderWidth: 1, borderColor: COLORS.grayLine },
  filterChipActive: { backgroundColor: COLORS.red + '12', borderColor: COLORS.red },
  filterChipText:   { fontSize: 12, fontWeight: '600', color: COLORS.grayText },
  filterChipTextActive: { color: COLORS.red },
  sortBtn:          { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.grayLine },
  resultsRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  resultsText:      { fontSize: 12, color: COLORS.grayText, fontWeight: '500' },
  clearFilter:      { fontSize: 12, color: COLORS.red, fontWeight: '600' },
  emptyState:       { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji:       { fontSize: 40 },
  emptyTitle:       { fontSize: 16, fontWeight: '700', color: COLORS.darkText },
  emptySub:         { fontSize: 13, color: COLORS.grayText },
  sortOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortSheet:        { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sortTitle:        { fontSize: 16, fontWeight: '800', color: COLORS.darkText, marginBottom: 12 },
  sortOption:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  sortOptionActive: { backgroundColor: COLORS.redLight, marginHorizontal: -20, paddingHorizontal: 20 },
  sortOptionText:   { fontSize: 14, color: COLORS.darkText },
  sortOptionTextActive: { color: COLORS.red, fontWeight: '700' },
  allCatHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  allCatTitle:      { fontSize: 18, fontWeight: '800', color: COLORS.darkText },
  allCatClose:      { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  allCatSection:    { fontSize: 11, fontWeight: '700', color: COLORS.grayText, letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.grayBg, textTransform: 'uppercase' },
  allCatItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  allCatItemActive: { backgroundColor: COLORS.redLight },
  allCatItemText:   { flex: 1, fontSize: 14, color: COLORS.darkText, fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────────────────
// OWNER DASHBOARD PLACEHOLDER
// Fase 2: extrair para AcheiAqui_Owner.jsx com todo o estado de settings,
// módulos, promos, notificações do dono, etc.
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboardPlaceholder() {
  const { toggleBusinessMode } = useAppContext();
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center', paddingTop: 40 }}>
      <Text style={{ fontSize: 40 }}>🏪</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.darkText }}>Modo Dono</Text>
      <Text style={{ fontSize: 14, color: COLORS.grayText, textAlign: 'center', lineHeight: 22 }}>
        O painel do dono completo está em {'\n'}
        <Text style={{ fontWeight: '700', color: COLORS.darkText }}>app_v2_9_32.jsx</Text>
        {'\n\n'}Será migrado para{'\n'}
        <Text style={{ fontWeight: '700', color: COLORS.red }}>AcheiAqui_Owner.jsx</Text>
        {'\n'}na Fase 2 da reestruturação.
      </Text>

      {[
        { label: '📊 Dashboard',          phase: 2 },
        { label: '🔔 Notificações',        phase: 2 },
        { label: '⚙️ Definições',          phase: 2 },
        { label: '📸 Fotos & Portfolio',   phase: 2 },
        { label: '🏷️ Promoções',           phase: 3 },
        { label: '📦 Encomendas',          phase: 4 },
        { label: '🚚 Delivery',            phase: 4 },
      ].map(item => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.grayLine }}>
          <Text style={{ fontSize: 14, color: COLORS.darkText }}>{item.label}</Text>
          <View style={{ backgroundColor: COLORS.red, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.white }}>FASE {item.phase}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={{ marginTop: 8, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: COLORS.red, borderRadius: 14 }}
        onPress={toggleBusinessMode}
      >
        <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.white }}>← Voltar ao modo cliente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHEIAQUI APP — componente raiz que usa o AppContext
// ─────────────────────────────────────────────────────────────────────────────
function AcheiAquiApp() {
  const {
    activeNavTab, setActiveNavTab,
    isBusinessMode, toggleBusinessMode,
    activeBusinessTab, setActiveBusinessTab,
  } = useAppContext();

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showDetail, setShowDetail]             = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const scrollRef = useRef(null);

  const handleBusinessPress = useCallback((business) => {
    setSelectedBusiness(business);
    setShowDetail(true);
  }, []);

  const handleNavTab = useCallback((tabId) => {
    if (tabId === 'exitbusiness') { toggleBusinessMode(); return; }
    if (tabId === 'home') { setShowDetail(false); }
  }, [toggleBusinessMode]);

  // Renderizar o conteúdo principal conforme o tab activo
  const renderContent = () => {
    if (isBusinessMode) {
      return <OwnerDashboardPlaceholder />;
    }
    switch (activeNavTab) {
      case 'home':
      case 'search':
        return <HomeScreen onBusinessPress={handleBusinessPress} />;
      case 'featured':
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Text style={{ fontSize: 32 }}>💎</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.darkText }}>Em Destaque</Text>
            <Text style={{ fontSize: 13, color: COLORS.grayText }}>Negócios premium — Fase 2</Text>
          </View>
        );
      case 'profile':
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Text style={{ fontSize: 32 }}>👤</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.darkText }}>Perfil</Text>
            <Text style={{ fontSize: 13, color: COLORS.grayText }}>Perfil completo — Fase 2</Text>
          </View>
        );
      default:
        return <HomeScreen onBusinessPress={handleBusinessPress} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayBg }}>
      {/* Header (oculto no modo dono) */}
      {!isBusinessMode && (
        <SearchHeader
          onModeToggle={toggleBusinessMode}
          onNotifPress={() => setShowNotifications(true)}
          onMenuPress={() => {}}
        />
      )}

      {/* Main content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Bottom nav */}
      <NavigationBar onTabPress={handleNavTab} scrollRef={scrollRef} />

      {/* Business detail modal */}
      <BusinessDetailModal
        visible={showDetail}
        business={selectedBusiness}
        onClose={() => setShowDetail(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHEIAQUI MAIN — export default
// Envolve tudo no AppShell com os dados iniciais
// ─────────────────────────────────────────────────────────────────────────────
export default function AcheiAquiMain() {
  // Injectar OWNER_BUSINESS na lista de negócios
  const businesses = useMemo(() => {
    const ownerInList = MOCK_BUSINESSES.some(b => b.id === OWNER_BUSINESS.id);
    return ownerInList ? MOCK_BUSINESSES : [OWNER_BUSINESS, ...MOCK_BUSINESSES];
  }, []);

  return (
    <AppShell businesses={businesses}>
      <AcheiAquiApp />
    </AppShell>
  );
}
