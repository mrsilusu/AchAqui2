/**
 * ============================================================================
 * BUSINESS DETAIL VIEW  (v1.0.0 — Fase 2 Extracção)
 * ============================================================================
 * Shell visual puro — sem lógica de animação, sem PanResponder, sem gestos.
 * Renderiza todo o conteúdo visível quando um negócio é seleccionado:
 *   • Fixed header animado (botões flutuantes + título scroll-reveal)
 *   • Hero foto full-bleed com paginação
 *   • Info strip (nome, categoria, rating, status, distância)
 *   • Rating starter
 *   • Social actions (Seguir, Check-in, Guardar)
 *   • Sticky tabs (Informacoes / Avaliacoes / Mais)
 *   • Conteúdo das tabs (módulos, deals, serviços, quartos, menu, etc.)
 *   • BusinessEngine no final (módulos operacionais Fase 2/3)
 *   • Sub-layers são montados pelo BusinessDetailModal acima desta view
 *
 * Props recebidas do BusinessDetailModal (motor de animação):
 *   business         — objecto de negócio completo
 *   isOwner          — boolean: modo proprietário
 *   bookmarkedIds    — array de IDs de negócios guardados
 *   onToggleBookmark — callback(businessId)
 *   onShare          — callback()
 *   onCall           — callback()
 *   onWhatsApp       — callback()
 *   onWebsite        — callback()
 *   onSafeClose      — callback() — fecho seguro com dirty guard
 *   onOpenSubLayer   — callback(layerName) — abre sub-layer na Camada 2
 *   scrollRef        — ref do ScrollView (passada do motor para controlo externo)
 *   scrollY          — Animated.Value partilhada (drive do header animado)
 *   sectionOffsets   — ref partilhada (para scroll-to-section via tabs)
 *   headerBgOpacity  — Animated.Value interpolada
 *   headerTitleOpacity — Animated.Value interpolada
 *   photoOpacity     — Animated.Value interpolada
 *   safeTop          — número (safe area top platform-specific)
 * ============================================================================
 */

import React, {
  useState, useMemo, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, TextInput, Alert, Share,
  Dimensions, Platform, Animated,
} from 'react-native';

import { Icon, COLORS } from '../../core/AchAqui_Core';
import { ImageWithFallback } from '../../shared/ImageWithFallback';
import { BusinessEngine } from '../../core/BusinessEngine';
import { HospitalityModule } from '../../operations/HospitalityModule';
import RoomDetailModal from '../../components/RoomDetailModal';
import { getAmenitiesPreview } from '../../lib/roomAmenities';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes locais
// ─────────────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320; // foto full-bleed incluindo safe area

const BUSINESS_TYPE_BADGES = {
  food:          { icon: '🍴', label: 'Alimentação',    color: '#EA580C' },
  retail:        { icon: '🛍️', label: 'Comércio',       color: '#D97706' },
  health:        { icon: '🏥', label: 'Saúde',          color: '#10B981' },
  beauty:        { icon: '💅', label: 'Beleza',          color: '#EC4899' },
  professional:  { icon: '👔', label: 'Profissional',   color: '#059669' },
  service:       { icon: '⚙️', label: 'Serviço',        color: '#3B82F6' },
  education:     { icon: '🎓', label: 'Educação',       color: '#DC2626' },
  freelancer:    { icon: '💼', label: 'Freelancer',     color: '#8B5CF6' },
  accommodation: { icon: '🏨', label: 'Alojamento',     color: '#0EA5E9' },
  entertainment: { icon: '🎭', label: 'Entretenimento', color: '#7C3AED' },
};

const OPERATIONAL_MODULES = [
  { id: 'gastronomy',   label: 'Gastronomia & Vida Noturna',   icon: 'star',      actions: [{ id: 'open_dining',          label: 'Reservar Mesa',             icon: 'calendar' }, { id: 'view_menu',            label: 'Ver Menu',                  icon: 'web'      }] },
  { id: 'accommodation',label: 'Alojamento & Turismo',          icon: 'globe',     actions: [{ id: 'check_availability',   label: 'Consultar Disponibilidade', icon: 'calendar' }, { id: 'online_checkin',       label: 'Check-in Online',           icon: 'check'    }] },
  { id: 'retail',       label: 'Comércio & Retalho',            icon: 'delivery',  actions: [{ id: 'view_catalog',         label: 'Ver Catálogo',              icon: 'web'      }, { id: 'whatsapp_order',       label: 'Encomendar via WhatsApp',   icon: 'phone'    }] },
  { id: 'health',       label: 'Saúde & Bem-Estar',             icon: 'heart',     actions: [{ id: 'open_professional',    label: 'Marcar Consulta',           icon: 'calendar' }] },
  { id: 'education',    label: 'Educação & Formação',           icon: 'users',     actions: [{ id: 'courses_enrollment',   label: 'Cursos & Inscrições',       icon: 'web'      }] },
  { id: 'professional', label: 'Serviços Profissionais',        icon: 'portfolio', actions: [{ id: 'open_professional',    label: 'Marcar Consulta',           icon: 'calendar' }, { id: 'view_portfolio',       label: 'Portfólio',                 icon: 'portfolio'}] },
  { id: 'customorder',  label: 'Encomendas Personalizadas',     icon: 'star',      actions: [{ id: 'custom_order',         label: 'Fazer Encomenda',           icon: 'web'      }] },
  { id: 'delivery',     label: 'Entrega & Delivery',            icon: 'delivery',  actions: [{ id: 'request_delivery',     label: 'Pedir Entrega',             icon: 'delivery' }] },
];

const REVIEW_SORT_OPTIONS = [
  { id: 'recent',  label: 'Mais Recentes'   },
  { id: 'helpful', label: 'Mais Úteis'      },
  { id: 'highest', label: 'Melhor Avaliação'},
  { id: 'lowest',  label: 'Pior Avaliação'  },
];
const REVIEW_FILTERS = [
  { id: 'all',    label: 'Todas'       },
  { id: '5',      label: '5 estrelas'  },
  { id: '4',      label: '4+ estrelas' },
  { id: 'photos', label: 'Com fotos'   },
];

const REVIEWS_MOCK = [
  { id: 'r1', name: 'Ana M.',    avatar: '👩',      rating: 5, date: '12 Fev 2026', comment: 'Atendimento excelente e comida impecavel.',                          photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'], helpful: 24, ownerResponse: 'Obrigado Ana!',                            ownerResponseDate: '13 Fev 2026' },
  { id: 'r2', name: 'Bruno L.',  avatar: '👨',      rating: 4, date: '03 Fev 2026', comment: 'Bom ambiente, voltarei para experimentar mais pratos.',              photos: [],                                                                    helpful: 12, ownerResponse: null,                                         ownerResponseDate: null          },
  { id: 'r3', name: 'Carla S.',  avatar: '👩‍🦱',    rating: 5, date: '28 Jan 2026', comment: 'Servico rapido e tudo muito saboroso.',                              photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'], helpful: 18, ownerResponse: 'Muito obrigado pelo carinho Carla!',           ownerResponseDate: '29 Jan 2026' },
  { id: 'r4', name: 'David P.',  avatar: '👨‍🦲',    rating: 3, date: '15 Jan 2026', comment: 'Comida boa mas o tempo de espera foi longo.',                        photos: [],                                                                    helpful: 8,  ownerResponse: 'Pedimos desculpa pela espera David.',        ownerResponseDate: '16 Jan 2026' },
  { id: 'r5', name: 'Elena R.',  avatar: '👩‍🦰',    rating: 5, date: '10 Jan 2026', comment: 'Melhor pizza de Luanda!',                                            photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'], helpful: 31, ownerResponse: null,                                         ownerResponseDate: null          },
];

const QA_MOCK = [
  { id: 'q1', question: 'Tem menu vegetariano?',                    answer: 'Sim! Temos várias opções vegetarianas incluindo saladas, massas e pizzas.', askedBy: 'Maria L.',  answeredBy: 'Proprietário', date: '10 Fev 2026', helpful: 12 },
  { id: 'q2', question: 'Aceitam reservas para grupos grandes?',    answer: 'Sim, aceitamos reservas para grupos até 20 pessoas.',                        askedBy: 'Pedro S.',  answeredBy: 'Proprietário', date: '05 Fev 2026', helpful: 8  },
  { id: 'q3', question: 'Têm estacionamento?',                      answer: 'Temos estacionamento gratuito para clientes na parte traseira.',             askedBy: 'Ana R.',    answeredBy: 'Proprietário', date: '28 Jan 2026', helpful: 15 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <View style={starS.row}>
      {[1,2,3,4,5].map(i => (
        <Text key={i} style={[starS.star, i<=full ? starS.filled : (i===full+1&&half ? starS.half : starS.empty)]}>★</Text>
      ))}
    </View>
  );
}

const starS = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center' },
  star:   { fontSize: 11, marginRight: 1 },
  filled: { color: '#F59E0B' },
  half:   { color: '#F59E0B' },
  empty:  { color: '#E5E7EB' },
});

const heroStarS = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center' },
  star:   { fontSize: 13, marginRight: 1 },
  filled: { color: '#F59E0B' },
  empty:  { color: '#E5E7EB' },
});

function renderHeroStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <View style={heroStarS.row}>
      {[1,2,3,4,5].map(i => (
        <Text key={i} style={[heroStarS.star, i<=full ? heroStarS.filled : (i===full+1&&half ? heroStarS.filled : heroStarS.empty)]}>★</Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AMENITY_ICON_MAP — importado do contexto original
// ─────────────────────────────────────────────────────────────────────────────
const AMENITY_ICON_MAP = {
  wifi: 'wifi', parking: 'parking', outdoor: 'outdoor', delivery: 'delivery',
  takeaway: 'fastdelivery', vegan: 'heart', wheelchair: 'wheelchair', kids: 'users',
  livemusic: 'star', tpa: 'payment', homedelivery: 'delivery', '24h': 'clock',
  ac: 'certified', carts: 'delivery', appointment: 'calendar', courtesy: 'heart',
  shower: 'outdoor', certified: 'certified', online: 'web', freeconsult: 'heart',
  portfolio: 'portfolio', languages: 'globe', generator: 'certified',
};

function RoomTypeCard({ roomType, onPressDetails }) {
  const photos = roomType.photos ?? [];
  const TOTAL_SLOTS = 4;
  const MAX_VISIBLE = 3;
  const extra = Math.max(photos.length - MAX_VISIBLE, 0);
  const { preview: amenityPreview, remaining: amenityRemaining } =
    getAmenitiesPreview(roomType.amenities ?? [], 4);

  return (
    <View style={vS.roomCard}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.darkText }}>{roomType.name}</Text>
      <Text style={{ fontSize: 12, color: COLORS.grayText, marginTop: 2, marginBottom: 8 }}>
        {roomType.pricePerNight?.toLocaleString('pt-AO')} Kz / noite · Até {roomType.maxGuests} hóspedes
      </Text>

      <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8, overflow: 'hidden' }}>
        {photos.length > 0 ? (
          Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            if (i < MAX_VISIBLE) {
              const uri = photos[i];
              return uri ? (
                <TouchableOpacity key={i} onPress={() => onPressDetails(roomType, i)} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ) : (
                <View key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: '#F1F5F9' }} />
              );
            }
            // slot 4 — extra counter or placeholder
            return extra > 0 ? (
              <TouchableOpacity key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' }} onPress={() => onPressDetails(roomType, MAX_VISIBLE)}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>+{extra}</Text>
                <Text style={{ color: '#FFF', fontSize: 10 }}>fotos</Text>
              </TouchableOpacity>
            ) : (
              <View key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: '#F1F5F9' }} />
            );
          })
        ) : (
          <View style={{ flex: 1, height: 60, backgroundColor: '#F8FAFC', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            <Text style={{ fontSize: 20 }}>🛏️</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8' }}>Sem fotos disponíveis</Text>
          </View>
        )}
      </View>

      {amenityPreview.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {amenityPreview.map((a) => (
            <Text key={a.id} style={{ fontSize: 12, color: '#334155', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>{a.icon} {a.label}</Text>
          ))}
          {amenityRemaining > 0 && <Text style={{ fontSize: 12, color: '#94A3B8', alignSelf: 'center' }}>e mais {amenityRemaining}...</Text>}
        </View>
      )}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────
export const BusinessDetailView = React.memo(function BusinessDetailView({
  business,
  isOwner,
  bookmarkedIds,
  onToggleBookmark,
  onShare,
  onCall,
  onWhatsApp,
  onWebsite,
  onSafeClose,
  onOpenSubLayer,
  onProcessingChange,
  scrollRef,
  scrollY,
  sectionOffsets,
  headerBgOpacity,
  headerTitleOpacity,
  photoOpacity,
  safeTop,
}) {
  // ── Estado local visual ───────────────────────────────────────────────────
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [ratingStars,       setRatingStars]        = useState(0);
  const [reviewText,        setReviewText]          = useState('');
  const [showReviewStats,   setShowReviewStats]     = useState(false);
  const [helpfulReviews,    setHelpfulReviews]      = useState({});
  const [followed,          setFollowed]            = useState(false);
  const [userCheckIns,      setUserCheckIns]        = useState(0);
  const [activeTab,         setActiveTab]           = useState('Informacoes');
  const [preselectedRoomId, setPreselectedRoomId]   = useState(null);
  const [detailModal,       setDetailModal]         = useState(null);
  const [qaItems,           setQaItems]             = useState(QA_MOCK);
  const [reviewSort,        setReviewSort]          = useState('recent');
  const [reviewFilter,      setReviewFilter]        = useState('all');

  const [failedPhotos, setFailedPhotos] = useState(new Set());
  const photos   = (business.photos && business.photos.length > 0) ? business.photos : null;
  const validPhotos = (photos || []).filter(uri => !failedPhotos.has(uri));
  const bookmarked = bookmarkedIds?.includes(business.id);

  // ── Tabs dinâmicas ────────────────────────────────────────────────────────
  const detailTabs = useMemo(() => {
    const tabs = ['Informacoes'];
    if (business.modules && Object.values(business.modules).some(Boolean)) tabs.push('Avaliacoes');
    tabs.push('Mais');
    return tabs;
  }, [business]);

  // ── Reviews filtradas ─────────────────────────────────────────────────────
  const filteredReviews = useMemo(() => {
    let r = [...REVIEWS_MOCK];
    if (reviewFilter === '5')      r = r.filter(x => x.rating === 5);
    if (reviewFilter === '4')      r = r.filter(x => x.rating >= 4);
    if (reviewFilter === 'photos') r = r.filter(x => x.photos.length > 0);
    if (reviewSort === 'helpful')  r.sort((a, b) => b.helpful - a.helpful);
    if (reviewSort === 'highest')  r.sort((a, b) => b.rating - a.rating);
    if (reviewSort === 'lowest')   r.sort((a, b) => a.rating - b.rating);
    return r;
  }, [reviewSort, reviewFilter]);

  const reviewStats = useMemo(() => {
    const total = REVIEWS_MOCK.length;
    const avgRating = (REVIEWS_MOCK.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
    const distribution = [5,4,3,2,1].reduce((acc, n) => { acc[n] = REVIEWS_MOCK.filter(r => r.rating === n).length; return acc; }, {});
    return { total, avgRating, distribution };
  }, []);

  // ── Scroll até secção via tab ─────────────────────────────────────────────
  const handleTabPress = useCallback((tab) => {
    setActiveTab(tab);
    const offset = sectionOffsets?.current?.[tab];
    if (offset !== undefined) scrollRef?.current?.scrollTo({ y: offset - 52, animated: true });
  }, [sectionOffsets, scrollRef]);

  const toggleHelpful = (id) => setHelpfulReviews(p => ({ ...p, [id]: !p[id] }));
  const copyReferral  = (code) => Alert.alert('Copiado!', `Código ${code} copiado.`);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── FIXED HEADER BACKGROUND — transparente → branco com scroll ── */}
      <Animated.View
        style={[vS.fixedHeader, { opacity: headerBgOpacity, height: safeTop + 52 }]}
        pointerEvents="none"
      >
        <View style={vS.fixedHeaderBg} />
      </Animated.View>

      {/* ── BOTÕES FLUTUANTES — sempre visíveis sobre a foto ── */}
      <View style={[vS.fixedHeaderRow, { top: safeTop, position: 'absolute', left: 0, right: 0, zIndex: 10000 }]}>
        {/* Back */}
        <TouchableOpacity onPress={onSafeClose} style={vS.floatingBtn}>
          <Icon name="back" size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Nome — aparece com scroll */}
        <Animated.Text
          style={[vS.topBarTitle, { opacity: headerTitleOpacity, flex: 1, textAlign: 'center' }]}
          numberOfLines={1}
        >
          {business.name}
        </Animated.Text>

        {/* Share + Bookmark */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onShare} style={vS.floatingBtn}>
            <Icon name="share" size={16} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onToggleBookmark?.(business.id)} style={vS.floatingBtn}>
            <Icon name={bookmarked ? 'heartFilled' : 'heart'} size={16} color={bookmarked ? '#FF6B6B' : '#FFFFFF'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCROLL VIEW PRINCIPAL ── */}
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={vS.scrollContent}
        scrollEventThrottle={16}
        bounces={Platform.OS === 'ios'}
        alwaysBounceVertical={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── HERO — foto full-bleed ── */}
        <Animated.View style={[vS.heroImageWrap, { opacity: photoOpacity }]}>
          {photos ? (
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setCurrentPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            >
              {photos.map((photo, idx) => (
                <Image key={idx} style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }} source={{ uri: photo }} resizeMode="cover" onError={() => setFailedPhotos(prev => new Set([...prev, photo]))} />
              ))}
            </ScrollView>
          ) : (
            <View style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.grayBg }}>
              <Text style={{ fontSize: 80 }}>{business.icon || '🏢'}</Text>
            </View>
          )}
          {validPhotos.length > 1 && (
            <View style={vS.photoCounter}>
              <Text style={vS.photoCounterText}>{currentPhotoIndex + 1} / {validPhotos.length}</Text>
            </View>
          )}
        </Animated.View>

        {/* ── INFO STRIP — nome, categoria, rating, status ── */}
        <View style={vS.heroInfoStrip}>
          <View style={vS.heroInfoTop}>
            <View style={{ flex: 1 }}>
              <Text style={vS.heroTitle}>{business.name}</Text>
              <Text style={vS.heroCategory}>{business.subcategory || business.category}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {business.isPremium && (
                <View style={vS.heroPremiumBadge}><Text style={vS.heroPremiumText}>👑 Premium</Text></View>
              )}
              {business.businessType && BUSINESS_TYPE_BADGES[business.businessType] && (() => {
                const badge = BUSINESS_TYPE_BADGES[business.businessType];
                return (
                  <View style={[vS.heroTypeBadge, { backgroundColor: badge.color + '18', borderColor: badge.color + '60' }]}>
                    <Text style={[vS.heroTypeBadgeText, { color: badge.color }]}>{badge.icon} {badge.label}</Text>
                  </View>
                );
              })()}
            </View>
          </View>
          <View style={vS.heroMetaRow}>
            {renderStars(business.rating)}
            <Text style={vS.heroRating}>{business.rating}</Text>
            <Text style={vS.heroReviews}>({business.reviews} avaliações)</Text>
            <View style={vS.heroSeparator} />
            <View style={[vS.heroStatusDot, { backgroundColor: business.isOpen ? COLORS.green : COLORS.red }]} />
            <Text style={[vS.heroStatusText, { color: business.isOpen ? COLORS.green : COLORS.red }]}>
              {business.isOpen ? (business.statusText || 'Aberto agora') : 'Fechado'}
            </Text>
          </View>
          <View style={vS.heroInfoMeta}>
            <Icon name="location" size={12} color={COLORS.grayText} strokeWidth={1.5} />
            <Text style={vS.heroDistance}>{business.distanceText}</Text>
            {business.priceLevel && <Text style={vS.heroPriceDot}>·</Text>}
            {business.priceLevel && <Text style={vS.heroPrice}>{'Kz'.repeat(business.priceLevel)}</Text>}
          </View>
        </View>

        {/* ── RATING STARTER ── */}
        <View style={vS.ratingSection}>
          <Text style={vS.reviewStarterTitle}>Inicie uma avaliação</Text>
          <View style={vS.reviewStarterStars}>
            {[1,2,3,4,5].map(i => (
              <TouchableOpacity key={i} onPress={() => { setRatingStars(i); onOpenSubLayer?.('rating'); }} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Text style={[vS.reviewStarterStar, i <= ratingStars && vS.reviewStarterStarFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => onOpenSubLayer?.('rating')} style={{ marginTop: 6 }}>
            <Text style={vS.reviewStarterCta}>Toque para avaliar</Text>
          </TouchableOpacity>
        </View>

        {/* ── SOCIAL ACTIONS ── */}
        <View style={vS.socialActionsSection}>
          <View style={vS.socialStatsRow}>
            <View style={vS.socialStat}>
              <Text style={vS.socialStatValue}>{business.followers || 0}</Text>
              <Text style={vS.socialStatLabel}>Seguidores</Text>
            </View>
            <View style={vS.socialStat}>
              <Text style={vS.socialStatValue}>{(business.checkIns || 0) + userCheckIns}</Text>
              <Text style={vS.socialStatLabel}>Check-ins</Text>
            </View>
          </View>
          <View style={vS.socialButtonsRow}>
            <TouchableOpacity style={[vS.socialButton, followed && vS.socialButtonActive]} onPress={() => setFollowed(p => !p)}>
              <Icon name={followed ? 'check' : 'save'} size={14} color={followed ? COLORS.white : COLORS.darkText} strokeWidth={2} />
              <Text style={[vS.socialButtonText, followed && vS.socialButtonTextActive]}>{followed ? 'A seguir' : 'Seguir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={vS.socialButton} onPress={() => { setUserCheckIns(p => p + 1); Alert.alert('Check-in feito!', 'Obrigado pela visita.'); }}>
              <Icon name="checkin" size={14} color={COLORS.darkText} strokeWidth={1.5} />
              <Text style={vS.socialButtonText}>Check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={vS.socialButton} onPress={() => onToggleBookmark?.(business.id)}>
              <Icon name="bookmark" size={14} color={COLORS.darkText} strokeWidth={1.5} />
              <Text style={vS.socialButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STICKY TABS ── */}
        <View style={vS.stickyHeader}>
          <View style={vS.tabsBar}>
            {detailTabs.map(tab => (
              <TouchableOpacity key={tab} style={vS.tabItem} onPress={() => handleTabPress(tab)} activeOpacity={0.7}>
                <Text style={activeTab === tab ? vS.tabTextActive : vS.tabText}>{tab}</Text>
                {activeTab === tab && <View style={vS.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── OPERATIONAL MODULES CTAs ── */}
        {business.modules && Object.keys(business.modules).some(k => business.modules[k]) && (
          <View style={vS.sectionBlock}>
            <Text style={vS.sectionTitle}>✦ Ações Disponíveis</Text>
            {OPERATIONAL_MODULES.filter(m => business.modules[m.id]).map(m => (
              <View key={m.id} style={{ marginBottom: 12 }}>
                <Text style={vS.modulesSectionLabel}>{m.label}</Text>
                <View style={vS.modulesActionsRow}>
                  {m.actions.map(action => (
                    <TouchableOpacity
                      key={action.id}
                      style={vS.moduleActionButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (action.id === 'check_availability') {
                          onOpenSubLayer?.('hospitality'); setPreselectedRoomId(null);
                        } else if (action.id === 'open_dining' || action.id === 'view_menu') {
                          handleTabPress('Mais');
                          setTimeout(() => scrollRef?.current?.scrollToEnd({ animated: true }), 300);
                        } else if (action.id === 'open_professional' || action.id === 'schedule_appointment') {
                          handleTabPress('Mais');
                          setTimeout(() => scrollRef?.current?.scrollToEnd({ animated: true }), 300);
                        } else if (action.id === 'custom_order') {
                          onOpenSubLayer?.('makeOrder');
                        } else {
                          Alert.alert(action.label, 'Em breve estará disponível nesta secção.');
                        }
                      }}
                    >
                      <Icon name={action.icon} size={18} color={COLORS.red} strokeWidth={2} />
                      <Text style={vS.moduleActionButtonText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── DEALS ── */}
        {business.deals?.length > 0 && (
          <View style={vS.sectionBlock}>
            <Text style={vS.sectionTitle}>🔥 Ofertas Ativas</Text>
            {business.deals.map(deal => (
              <View key={deal.id} style={vS.dealCard}>
                <View style={vS.dealCardHeader}>
                  <Text style={vS.dealTitle}>{deal.title}</Text>
                  <View style={vS.dealCodeBadge}><Text style={vS.dealCodeText}>{deal.code}</Text></View>
                </View>
                <Text style={vS.dealDescription}>{deal.description}</Text>
                <Text style={vS.dealExpires}>Válido até: {deal.expires}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── SERVICES OFFERED ── */}
        {business.servicesOffered?.length > 0 && (
          <View style={vS.menuSectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Servicos = e.nativeEvent.layout.y; }}>
            <Text style={vS.sectionTitle}>Serviços Oferecidos</Text>
            <View style={vS.menuCard}>
              {business.servicesOffered.map(s => (
                <View key={s.id} style={vS.menuItem}>
                  <View style={vS.menuItemText}>
                    <Text style={vS.menuItemTitle}>{s.name}</Text>
                    {s.duration && <Text style={vS.menuItemCategory}>⏱️ {s.duration}</Text>}
                    <Text style={vS.menuItemDesc}>{s.description}</Text>
                  </View>
                  <Text style={vS.menuItemPrice}>{s.price || `${s.basePrice} Kz`}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── PORTFOLIO ── */}
        {business.portfolio?.length > 0 && (
          <View style={vS.sectionBlock}>
            <Text style={vS.sectionTitle}>Portfólio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vS.portfolioScroll}>
              {business.portfolio.map((img, i) => <Image key={i} source={{ uri: img }} style={vS.portfolioImage} />)}
            </ScrollView>
          </View>
        )}

        {/* ── AVAILABILITY ── */}
        {business.modules?.professional && business.availability && (
          <View style={vS.sectionBlock}>
            <Text style={vS.sectionTitle}>Disponibilidade</Text>
            <View style={vS.availabilityCalendar}>
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map((label, i) => {
                const key = ['sun','mon','tue','wed','thu','fri','sat'][i];
                const hasSlots = !!business.availability[key];
                return (
                  <View key={key} style={vS.availabilityDay}>
                    <View style={[vS.availabilityDayCircle, hasSlots ? vS.availabilityDayAvailable : vS.availabilityDayUnavailable]}>
                      <Text style={[vS.availabilityDayText, hasSlots && vS.availabilityDayTextAvailable]}>{label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── MENU ── */}
        {business.modules?.gastronomy && (
          <View style={vS.menuSectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Menu = e.nativeEvent.layout.y; }}>
            <Text style={vS.sectionTitle}>Menu</Text>
            {business.menuItems?.length > 0 ? (
              <View style={vS.menuCard}>
                {business.menuItems.map(item => (
                  <View key={item.id} style={vS.menuItem}>
                    <View style={vS.menuItemText}>
                      <Text style={vS.menuItemTitle}>{item.name}</Text>
                      <Text style={vS.menuItemDesc}>{item.description}</Text>
                      <Text style={vS.menuItemCategory}>{item.category}</Text>
                    </View>
                    <Text style={vS.menuItemPrice}>{item.price} Kz</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={vS.emptyState}>
                <Icon name="web" size={48} color={COLORS.grayText} strokeWidth={1} />
                <Text style={vS.emptyStateTitle}>Menu em Preparação</Text>
                <Text style={vS.emptyStateText}>Estamos a atualizar o nosso menu.</Text>
              </View>
            )}
            {business.popularDishes?.length > 0 && (
              <>
                <Text style={[vS.sectionTitle, { marginTop: 16 }]}>Pratos Populares</Text>
                <View style={vS.popularDishesCard}>
                  {business.popularDishes.map((d, i) => (
                    <View key={i} style={vS.popularDishItem}>
                      <View style={vS.popularDishRank}><Text style={vS.popularDishRankText}>{i + 1}</Text></View>
                      <View style={vS.popularDishInfo}><Text style={vS.popularDishName}>{d.name}</Text><Text style={vS.popularDishOrders}>{d.orders} pedidos</Text></View>
                      <Text style={vS.popularDishPrice}>{d.price}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── CATALOG ── */}
        {business.modules?.retail && (
          <View style={vS.menuSectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Catalogo = e.nativeEvent.layout.y; }}>
            <Text style={vS.sectionTitle}>Catálogo de Produtos</Text>
            {business.inventoryItems?.length > 0 ? (
              <View style={vS.menuCard}>
                {business.inventoryItems.map(item => (
                  <View key={item.id} style={vS.menuItem}>
                    <View style={vS.menuItemText}>
                      <Text style={vS.menuItemTitle}>{item.name}</Text>
                      <Text style={vS.menuItemCategory}>{item.category}</Text>
                      <Text style={vS.menuItemDesc}>Stock: {item.stock} unidades</Text>
                    </View>
                    <Text style={vS.menuItemPrice}>{item.price} Kz</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={vS.emptyState}>
                <Icon name="delivery" size={48} color={COLORS.grayText} strokeWidth={1} />
                <Text style={vS.emptyStateTitle}>Catálogo em Preparação</Text>
                <Text style={vS.emptyStateText}>Estamos a atualizar o nosso catálogo.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── ROOMS ── */}
        {(business.modules?.accommodation || business.roomTypes?.length > 0) && (
          <View style={vS.menuSectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Quartos = e.nativeEvent.layout.y; }}>
            <Text style={vS.sectionTitle}>Quartos Disponíveis</Text>
            {business.roomTypes?.length > 0 ? (
              <View style={{ gap: 12 }}>
                {business.roomTypes.map((room) => (
                  <RoomTypeCard
                    key={room.id}
                    roomType={room}
                    onPressDetails={(roomType, idx) => setDetailModal({ roomType, initialPhotoIdx: idx })}
                  />
                ))}
              </View>
            ) : (
              <View style={vS.emptyState}>
                <Icon name="globe" size={48} color={COLORS.grayText} strokeWidth={1} />
                <Text style={vS.emptyStateTitle}>Quartos em Preparação</Text>
                <Text style={vS.emptyStateText}>Estamos a atualizar os nossos quartos.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── DELIVERY AREAS ── */}
        {business.modules?.delivery && business.deliveryAreas?.length > 0 && (
          <View style={vS.menuSectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Entrega = e.nativeEvent.layout.y; }}>
            <Text style={vS.sectionTitle}>Áreas de Entrega</Text>
            <View style={vS.menuCard}>
              {business.deliveryAreas.map(area => (
                <View key={area.id} style={vS.menuItem}>
                  <View style={vS.menuItemText}>
                    <Text style={vS.menuItemTitle}>{area.name}</Text>
                    <Text style={vS.menuItemCategory}>⏱️ {area.estimatedTime}</Text>
                  </View>
                  <Text style={vS.menuItemPrice}>{area.fee} Kz</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── INFORMACOES ── */}
        <View style={vS.sectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Informacoes = e.nativeEvent.layout.y; }}>
          <Text style={vS.sectionTitle}>Informacoes</Text>
          {/* Action buttons */}
          <View style={vS.infoActionRow}>
            {business.phone && (
              <TouchableOpacity style={[vS.actionOutline, vS.actionEqual, vS.whatsappButton]} onPress={onWhatsApp} activeOpacity={0.85}>
                <View style={vS.whatsappBadge}><Icon name="whatsapp" size={12} color="#25D366" strokeWidth={1.5} /></View>
                <Text style={vS.whatsappButtonText} numberOfLines={1}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {business.phone && (
              <TouchableOpacity style={[vS.actionOutline, vS.actionEqual]} onPress={onCall}>
                <Icon name="phone" size={14} color={COLORS.darkText} strokeWidth={1.5} />
                <Text style={vS.actionText}>Ligar</Text>
              </TouchableOpacity>
            )}
            {business.website && (
              <TouchableOpacity style={[vS.actionOutline, vS.actionEqual]} onPress={onWebsite}>
                <Icon name="web" size={14} color={COLORS.darkText} strokeWidth={1.5} />
                <Text style={vS.actionText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
          {business.highlights?.length > 0 && (
            <Text style={vS.infoHighlightText}>{business.highlights.map(h => h.replace(/"/g, '')).join(' • ')}</Text>
          )}
          {business.description && <Text style={vS.infoDescription}>{business.description}</Text>}
          {/* Address */}
          {business.address && (
            <View style={vS.mapCard}>
              <Icon name="mapPin" size={16} color={COLORS.red} strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.darkText }}>{business.address}</Text>
                <Text style={{ fontSize: 11, color: COLORS.grayText, marginTop: 2 }}>{business.neighborhood}</Text>
              </View>
            </View>
          )}
          {/* Hours */}
          {business.hours && (
            <View style={[vS.mapCard, { marginTop: 8 }]}>
              <Icon name="clock" size={16} color={COLORS.red} strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.darkText }}>{business.hours}</Text>
              </View>
            </View>
          )}
          {/* Payment */}
          {business.payment?.length > 0 && (
            <View style={[vS.mapCard, { marginTop: 8 }]}>
              <Icon name="payment" size={16} color={COLORS.red} strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.darkText }}>{business.payment.join(' · ')}</Text>
              </View>
            </View>
          )}
          {/* Amenities */}
          {business.amenities?.length > 0 && (
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {business.amenities.map(a => (
                <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.grayBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                  <Icon name={AMENITY_ICON_MAP[a] || 'check'} size={12} color={COLORS.grayText} strokeWidth={1.5} />
                  <Text style={{ fontSize: 11, color: COLORS.grayText, fontWeight: '600' }}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── AVALIACOES ── */}
        <View style={vS.sectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Avaliacoes = e.nativeEvent.layout.y; }}>
          <Text style={vS.sectionTitle}>Avaliacoes</Text>
          {reviewStats && (
            <TouchableOpacity style={vS.reviewStatsCard} onPress={() => setShowReviewStats(p => !p)} activeOpacity={0.9}>
              <View style={vS.reviewStatsHeader}>
                <View>
                  <Text style={vS.reviewStatsAvg}>{reviewStats.avgRating}</Text>
                  <View style={vS.reviewStars}>{renderStars(parseFloat(reviewStats.avgRating))}</View>
                  <Text style={vS.reviewStatsTotal}>{reviewStats.total} avaliacoes</Text>
                </View>
                <Text style={vS.reviewStatsToggle}>{showReviewStats ? '▼' : '▶'}</Text>
              </View>
              {showReviewStats && (
                <View style={vS.reviewStatsDistribution}>
                  {[5,4,3,2,1].map(star => (
                    <View key={star} style={vS.reviewStatsRow}>
                      <Text style={vS.reviewStatsLabel}>{star}★</Text>
                      <View style={vS.reviewStatsBarBg}>
                        <View style={[vS.reviewStatsBarFill, { width: `${(reviewStats.distribution[star] / reviewStats.total) * 100}%` }]} />
                      </View>
                      <Text style={vS.reviewStatsCount}>{reviewStats.distribution[star]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
          <View style={vS.reviewControls}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <Text style={vS.reviewControlLabel}>Ordenar:</Text>
              {REVIEW_SORT_OPTIONS.map(s => (
                <TouchableOpacity key={s.id} style={[vS.reviewSortChip, reviewSort === s.id && vS.reviewSortChipActive]} onPress={() => setReviewSort(s.id)}>
                  <Text style={[vS.reviewSortText, reviewSort === s.id && vS.reviewSortTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={vS.reviewControlLabel}>Filtrar:</Text>
              {REVIEW_FILTERS.map(f => (
                <TouchableOpacity key={f.id} style={[vS.reviewFilterChip, reviewFilter === f.id && vS.reviewFilterChipActive]} onPress={() => setReviewFilter(f.id)}>
                  <Text style={[vS.reviewFilterText, reviewFilter === f.id && vS.reviewFilterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={vS.reviewsList}>
            {filteredReviews.slice(0, 3).map(review => {
              const helpful = helpfulReviews[review.id];
              return (
                <View key={review.id} style={vS.reviewCard}>
                  <View style={vS.reviewHeader}>
                    <View style={vS.reviewUserInfo}>
                      <Text style={vS.reviewAvatar}>{review.avatar}</Text>
                      <View>
                        <Text style={vS.reviewName}>{review.name}</Text>
                        <Text style={vS.reviewDate}>{review.date}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={vS.reviewStars}>{renderStars(review.rating)}</View>
                  <Text style={vS.reviewComment}>{review.comment}</Text>
                  {review.photos?.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vS.reviewPhotosScroll}>
                      {review.photos.map((p, i) => <Image key={i} source={{ uri: p }} style={vS.reviewPhoto} />)}
                    </ScrollView>
                  )}
                  <TouchableOpacity style={vS.reviewHelpfulBtn} onPress={() => toggleHelpful(review.id)}>
                    <Icon name="like" size={14} color={helpful ? COLORS.red : COLORS.grayText} strokeWidth={1.5} />
                    <Text style={[vS.reviewHelpfulText, helpful && vS.reviewHelpfulTextActive]}>Útil ({review.helpful + (helpful ? 1 : 0)})</Text>
                  </TouchableOpacity>
                  {review.ownerResponse && (
                    <View style={vS.ownerResponseCard}>
                      <View style={vS.ownerResponseHeader}>
                        <Text style={vS.ownerResponseBadge}>🏪 Resposta do proprietário</Text>
                        <Text style={vS.ownerResponseDate}>{review.ownerResponseDate}</Text>
                      </View>
                      <Text style={vS.ownerResponseText}>{review.ownerResponse}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={vS.qaViewAll} onPress={() => Alert.alert('Avaliações', `Ver todas as ${filteredReviews.length} avaliações`)}>
            <Text style={vS.qaViewAllText}>Ver todas as avaliações ({filteredReviews.length}) →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={vS.uploadPhotoBtn} onPress={() => onOpenSubLayer?.('photoOptions')}>
            <Icon name="camera" size={18} color={COLORS.darkText} strokeWidth={1.5} />
            <Text style={vS.uploadPhotoText}>Adicionar fotos</Text>
          </TouchableOpacity>
        </View>

        {/* ── MAIS ── */}
        <View style={vS.sectionBlock} onLayout={e => { if (sectionOffsets?.current) sectionOffsets.current.Mais = e.nativeEvent.layout.y; }}>
          <Text style={vS.sectionTitle}>Mais</Text>
          {/* Q&A */}
          <View style={vS.qaSection}>
            <View style={vS.qaSectionHeader}>
              <Text style={vS.qaTitle}>Perguntas & Respostas</Text>
              <TouchableOpacity onPress={() => onOpenSubLayer?.('qa')}>
                <Text style={vS.qaAskBtn}>Perguntar</Text>
              </TouchableOpacity>
            </View>
            {qaItems.slice(0, 2).map(qa => (
              <View key={qa.id} style={vS.qaItem}>
                <Text style={vS.qaQuestion}>❓ {qa.question}</Text>
                <Text style={vS.qaAnswer}>💬 {qa.answer}</Text>
                <View style={vS.qaFooter}>
                  <Text style={vS.qaDate}>{qa.date}</Text>
                  <Text style={vS.qaHelpful}>👍 {qa.helpful} útil</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={vS.qaViewAll} onPress={() => onOpenSubLayer?.('qa')}>
              <Text style={vS.qaViewAllText}>Ver todas as perguntas →</Text>
            </TouchableOpacity>
          </View>
          {/* Referral */}
          {business.referralCode && (
            <View style={vS.referralCard}>
              <View style={vS.referralHeader}>
                <Text style={vS.referralIcon}>🎁</Text>
                <View style={vS.referralHeaderText}>
                  <Text style={vS.referralTitle}>Código de Referência</Text>
                  <Text style={vS.referralSubtitle}>Partilhe e ganhe descontos!</Text>
                </View>
              </View>
              <TouchableOpacity style={vS.referralCodeContainer} onPress={() => copyReferral(business.referralCode)}>
                <Text style={vS.referralCode}>{business.referralCode}</Text>
                <Text style={vS.referralCopyIcon}>📋</Text>
              </TouchableOpacity>
              <Text style={vS.referralHint}>Toque para copiar</Text>
            </View>
          )}
          {/* Highlights chips */}
          {business.highlights?.length > 0 && (
            <View style={vS.highlightsRow}>
              {business.highlights.map(h => <View key={h} style={vS.highlightChip}><Text style={vS.highlightText}>{h}</Text></View>)}
            </View>
          )}
        </View>

        {/* ── BUSINESS ENGINE — Módulos Fase 2/3 ── */}
        <View style={vS.sectionBlock}>
          <BusinessEngine
            business={business}
            mode={isOwner ? 'owner' : 'client'}
            onBookingDone={() => {}}
            onClose={onSafeClose}
            onBack={onSafeClose}
            onProcessingChange={onProcessingChange}
          />
        </View>

        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      <RoomDetailModal
        visible={!!detailModal}
        roomType={detailModal?.roomType}
        business={business}
        initialPhotoIdx={detailModal?.initialPhotoIdx}
        onClose={() => setDetailModal(null)}
        onBook={(roomType) => {
          setPreselectedRoomId(roomType?.id ?? null);
          setDetailModal(null);
          onOpenSubLayer?.('hospitality');
        }}
      />
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — idênticos ao dS do Main, prefixo vS (view styles)
// ─────────────────────────────────────────────────────────────────────────────
const vS = StyleSheet.create({
  scrollContent:           { paddingBottom: 24 },
  fixedHeader:             { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, elevation: 10 },
  fixedHeaderBg:           { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  fixedHeaderRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  topBarTitle:             { fontSize: 17, color: '#111111', fontWeight: '700', letterSpacing: -0.3 },
  floatingBtn:             { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  heroImageWrap:           { width: '100%', height: HERO_HEIGHT, position: 'relative', overflow: 'hidden', backgroundColor: '#F7F7F8' },
  photoCounter:            { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  photoCounterText:        { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroInfoStrip:           { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  heroInfoTop:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  heroTitle:               { fontSize: 20, fontWeight: '800', color: '#111111', letterSpacing: -0.5 },
  heroCategory:            { fontSize: 12, color: '#8A8A8A', marginTop: 3, fontWeight: '500' },
  heroPremiumBadge:        { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD700' },
  heroPremiumText:         { fontSize: 11, fontWeight: '700', color: '#B8860B' },
  heroTypeBadge:           { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  heroTypeBadgeText:       { fontSize: 11, fontWeight: '700' },
  heroMetaRow:             { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  heroRating:              { fontSize: 13, fontWeight: '700', color: '#111111' },
  heroReviews:             { fontSize: 12, color: '#8A8A8A' },
  heroSeparator:           { width: 1, height: 12, backgroundColor: '#EBEBEB', marginHorizontal: 8 },
  heroStatusDot:           { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
  heroStatusText:          { fontSize: 12, fontWeight: '600' },
  heroInfoMeta:            { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  heroDistance:            { fontSize: 11, color: '#8A8A8A', fontWeight: '500' },
  heroPriceDot:            { fontSize: 14, color: '#8A8A8A' },
  heroPrice:               { fontSize: 11, color: '#8A8A8A', fontWeight: '600' },
  ratingSection:           { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB', alignItems: 'center' },
  reviewStarterTitle:      { fontSize: 11, color: '#8A8A8A', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  reviewStarterStars:      { flexDirection: 'row', gap: 8 },
  reviewStarterStar:       { fontSize: 28, color: '#E5E7EB' },
  reviewStarterStarFilled: { color: '#F59E0B' },
  reviewStarterCta:        { fontSize: 11, color: '#8A8A8A', fontWeight: '600', letterSpacing: 0.3 },
  socialActionsSection:    { backgroundColor: '#F7F7F8', paddingVertical: 10, paddingHorizontal: 16 },
  socialStatsRow:          { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  socialStat:              { alignItems: 'center' },
  socialStatValue:         { fontSize: 20, fontWeight: '700', color: '#111111' },
  socialStatLabel:         { fontSize: 11, color: '#8A8A8A', marginTop: 4 },
  socialButtonsRow:        { flexDirection: 'row', gap: 8 },
  socialButton:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 20, paddingVertical: 10, gap: 6 },
  socialButtonActive:      { backgroundColor: '#D32323', borderColor: '#D32323' },
  socialButtonText:        { fontSize: 12, fontWeight: '700', color: '#111111' },
  socialButtonTextActive:  { color: '#FFFFFF' },
  stickyHeader:            { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  tabsBar:                 { flexDirection: 'row', justifyContent: 'space-between', gap: 20, paddingHorizontal: 15 },
  tabItem:                 { paddingVertical: 6, alignItems: 'center' },
  tabText:                 { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  tabTextActive:           { fontSize: 12, color: '#D32323', fontWeight: '700' },
  tabIndicator:            { marginTop: 6, height: 2, width: 24, backgroundColor: '#D32323', borderRadius: 2 },
  sectionBlock:            { paddingHorizontal: 16, paddingTop: 12 },
  menuSectionBlock:        { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle:            { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 12 },
  modulesSectionLabel:     { fontSize: 11, fontWeight: '700', color: '#8A8A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  modulesActionsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  moduleActionButton:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#D32323', minWidth: '48%', flex: 1 },
  moduleActionButtonText:  { fontSize: 12, fontWeight: '700', color: '#D32323', flex: 1 },
  dealCard:                { backgroundColor: '#FFFBF0', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#FFE082' },
  dealCardHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  dealTitle:               { fontSize: 15, fontWeight: '700', color: '#111111', flex: 1, marginRight: 8 },
  dealCodeBadge:           { backgroundColor: '#D32323', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dealCodeText:            { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  dealDescription:         { fontSize: 12, color: '#8A8A8A', marginBottom: 6 },
  dealExpires:             { fontSize: 11, color: '#D32323', fontWeight: '600' },
  menuCard:                { borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', overflow: 'hidden', marginBottom: 8 },
  menuItem:                { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  menuItemText:            { flex: 1, marginRight: 12 },
  menuItemTitle:           { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 3 },
  menuItemDesc:            { fontSize: 12, color: '#8A8A8A', lineHeight: 17, marginBottom: 3 },
  menuItemCategory:        { fontSize: 11, color: '#8A8A8A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  menuItemPrice:           { fontSize: 14, fontWeight: '800', color: '#D32323' },
  emptyState:              { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyStateTitle:         { fontSize: 16, fontWeight: '700', color: '#111111' },
  emptyStateText:          { fontSize: 13, color: '#8A8A8A', textAlign: 'center' },
  popularDishesCard:       { borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', overflow: 'hidden', marginBottom: 8 },
  popularDishItem:         { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB', gap: 12 },
  popularDishRank:         { width: 26, height: 26, borderRadius: 13, backgroundColor: '#D32323', alignItems: 'center', justifyContent: 'center' },
  popularDishRankText:     { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  popularDishInfo:         { flex: 1 },
  popularDishName:         { fontSize: 13, fontWeight: '700', color: '#111111' },
  popularDishOrders:       { fontSize: 11, color: '#8A8A8A' },
  popularDishPrice:        { fontSize: 13, fontWeight: '700', color: '#D32323' },
  portfolioScroll:         { marginBottom: 8 },
  portfolioImage:          { width: 120, height: 90, borderRadius: 10, marginRight: 8 },
  availabilityCalendar:    { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F7F7F8', borderRadius: 14, marginBottom: 8 },
  availabilityDay:         { alignItems: 'center' },
  availabilityDayCircle:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  availabilityDayAvailable:{ backgroundColor: '#22A06B' },
  availabilityDayUnavailable:{ backgroundColor: '#EBEBEB' },
  availabilityDayText:     { fontSize: 10, fontWeight: '700', color: '#8A8A8A' },
  availabilityDayTextAvailable:{ color: '#FFFFFF' },
  roomCard:                { borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', padding: 14, marginBottom: 0, overflow: 'hidden' },
  mapCard:                 { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#F7F7F8', borderRadius: 12, marginBottom: 8 },
  infoActionRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionOutline:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBEB' },
  actionEqual:             { flex: 1 },
  actionText:              { fontSize: 13, fontWeight: '600', color: '#111111' },
  whatsappButton:          { borderColor: '#25D366', backgroundColor: '#F0FFF4' },
  whatsappButtonText:      { fontSize: 13, fontWeight: '700', color: '#128C7E', flex: 1 },
  whatsappBadge:           { width: 20, height: 20, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  infoHighlightText:       { fontSize: 13, color: '#8A8A8A', fontStyle: 'italic', marginBottom: 10, lineHeight: 18 },
  infoDescription:         { fontSize: 13, color: '#111111', lineHeight: 20, marginBottom: 12 },
  reviewStatsCard:         { backgroundColor: '#F7F7F8', borderRadius: 14, padding: 14, marginBottom: 14 },
  reviewStatsHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewStatsAvg:          { fontSize: 36, fontWeight: '800', color: '#111111' },
  reviewStars:             { flexDirection: 'row', marginTop: 4, marginBottom: 4 },
  reviewStatsTotal:        { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  reviewStatsToggle:       { fontSize: 16, color: '#8A8A8A' },
  reviewStatsDistribution: { marginTop: 12, gap: 6 },
  reviewStatsRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewStatsLabel:        { fontSize: 12, fontWeight: '600', color: '#8A8A8A', width: 26 },
  reviewStatsBarBg:        { flex: 1, height: 6, backgroundColor: '#EBEBEB', borderRadius: 3 },
  reviewStatsBarFill:      { height: 6, backgroundColor: '#D32323', borderRadius: 3 },
  reviewStatsCount:        { fontSize: 12, color: '#8A8A8A', width: 20, textAlign: 'right' },
  reviewControls:          { marginBottom: 12 },
  reviewControlLabel:      { fontSize: 11, fontWeight: '700', color: '#8A8A8A', marginRight: 8, alignSelf: 'center' },
  reviewSortChip:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', marginRight: 6 },
  reviewSortChipActive:    { borderColor: '#D32323', backgroundColor: '#FFF0F0' },
  reviewSortText:          { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  reviewSortTextActive:    { color: '#D32323' },
  reviewFilterChip:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', marginRight: 6 },
  reviewFilterChipActive:  { borderColor: '#D32323', backgroundColor: '#FFF0F0' },
  reviewFilterText:        { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  reviewFilterTextActive:  { color: '#D32323' },
  reviewsList:             { gap: 12, marginBottom: 12 },
  reviewCard:              { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  reviewHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewUserInfo:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar:            { fontSize: 28 },
  reviewName:              { fontSize: 14, fontWeight: '700', color: '#111111' },
  reviewDate:              { fontSize: 11, color: '#8A8A8A' },
  reviewComment:           { fontSize: 13, color: '#111111', lineHeight: 20, marginTop: 8, marginBottom: 8 },
  reviewPhotosScroll:      { marginBottom: 8 },
  reviewPhoto:             { width: 80, height: 60, borderRadius: 8, marginRight: 8 },
  reviewHelpfulBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewHelpfulText:       { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  reviewHelpfulTextActive: { color: '#D32323' },
  ownerResponseCard:       { backgroundColor: '#F0FFF4', borderLeftWidth: 3, borderLeftColor: '#22A06B', borderRadius: 8, padding: 10, marginTop: 8 },
  ownerResponseHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ownerResponseBadge:      { fontSize: 11, fontWeight: '700', color: '#22A06B' },
  ownerResponseDate:       { fontSize: 10, color: '#8A8A8A' },
  ownerResponseText:       { fontSize: 12, color: '#111111', lineHeight: 17 },
  uploadPhotoBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EBEBEB', marginTop: 8 },
  uploadPhotoText:         { fontSize: 13, fontWeight: '600', color: '#111111' },
  qaSection:               { backgroundColor: '#F7F7F8', borderRadius: 14, padding: 14, marginBottom: 12 },
  qaSectionHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qaTitle:                 { fontSize: 14, fontWeight: '700', color: '#111111' },
  qaAskBtn:                { fontSize: 13, fontWeight: '700', color: '#D32323' },
  qaItem:                  { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 8 },
  qaQuestion:              { fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 6 },
  qaAnswer:                { fontSize: 12, color: '#8A8A8A', lineHeight: 18, marginBottom: 6 },
  qaFooter:                { flexDirection: 'row', justifyContent: 'space-between' },
  qaDate:                  { fontSize: 11, color: '#8A8A8A' },
  qaHelpful:               { fontSize: 11, color: '#8A8A8A' },
  qaViewAll:               { paddingVertical: 10 },
  qaViewAllText:           { fontSize: 12, color: '#D32323', fontWeight: '700' },
  referralCard:            { backgroundColor: '#FFF0F0', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D32323' + '30' },
  referralHeader:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  referralIcon:            { fontSize: 28 },
  referralHeaderText:      { flex: 1 },
  referralTitle:           { fontSize: 14, fontWeight: '700', color: '#111111' },
  referralSubtitle:        { fontSize: 12, color: '#8A8A8A' },
  referralCodeContainer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: '#D32323', gap: 8, marginBottom: 6 },
  referralCode:            { fontSize: 20, fontWeight: '800', color: '#D32323', letterSpacing: 2 },
  referralCopyIcon:        { fontSize: 18 },
  referralHint:            { fontSize: 11, color: '#8A8A8A', textAlign: 'center' },
  highlightsRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  highlightChip:           { backgroundColor: '#F7F7F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  highlightText:           { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
});