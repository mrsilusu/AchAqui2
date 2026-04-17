/**
 * ============================================================================
 * BusinessDetailModal  (v4.0.0 — Layout Original Restaurado)
 * ============================================================================
 * Motor de animação + shell visual completo.
 *
 * ✅ Hero foto full-bleed com scroll que desaparece
 * ✅ Header fixo animado (transparente → branco com scroll-reveal do nome)
 * ✅ Botões flutuantes fora da safe area (só a foto invade o safe area)
 * ✅ Botões funcionais: back, share, bookmark
 * ✅ Info strip: nome, categoria, rating, status, distância, badges
 * ✅ INICIE UMA AVALIAÇÃO (estrelas interactivas)
 * ✅ Seguidores + Check-ins + Botões sociais (Seguir, Check-in, Guardar)
 * ✅ Tabs: Menu / Informacoes / Avaliacoes / Mais
 * ✅ Módulos operacionais contextuais (mapeamento por business.modules)
 * ✅ Botões: WhatsApp, Ligar, Website
 * ✅ Avaliações com sort/filter, resposta do proprietário
 * ✅ Q&A, Código de Referência
 * ✅ Swipe-right-to-close (Meta pattern)
 * ✅ Camadas operacionais (useOperationalLayer + OperationalLayerRenderer)
 * ============================================================================
 */

import React, {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Animated, PanResponder, Linking, Share, Alert,
  Dimensions, Platform, TextInput, Modal, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, COLORS } from '../../core/AchAqui_Core';
import { apiRequest, backendApi } from '../../lib/backendApi';
import RoomDetailModal from '../../components/RoomDetailModal';
import { getAmenitiesPreview } from '../../lib/roomAmenities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;
const HEADER_SCROLL_THRESHOLD = HERO_HEIGHT * 0.55; // a partir de quando o nome aparece no header

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BUSINESS_TYPE_BADGES = {
  food:          { icon: '🍴', label: 'Alimentação',   color: '#EA580C' },
  retail:        { icon: '🛍️', label: 'Comércio',      color: '#D97706' },
  health:        { icon: '🏥', label: 'Saúde',         color: '#10B981' },
  beauty:        { icon: '💅', label: 'Beleza',         color: '#EC4899' },
  professional:  { icon: '👔', label: 'Profissional',  color: '#059669' },
  education:     { icon: '🎓', label: 'Educação',      color: '#DC2626' },
  freelancer:    { icon: '💼', label: 'Freelancer',    color: '#8B5CF6' },
  accommodation: { icon: '🏨', label: 'Alojamento',    color: '#0EA5E9' },
  finance:       { icon: '💰', label: 'Financeiro',    color: '#1D4ED8' },
};

function getBusinessBadge(business) {
  const ids = business.subCategoryIds || [];
  if (ids.includes('atm'))  return { icon: '🏧', label: 'ATM',   color: '#047857' };
  if (ids.includes('bank')) return { icon: '🏦', label: 'Banco', color: '#1D4ED8' };
  return business.businessType ? (BUSINESS_TYPE_BADGES[business.businessType] ?? null) : null;
}

const OPERATIONAL_MODULES = [
  { id: 'gastronomy',    layer: 'dining',       label: 'Menu & Reservar Mesa',        emoji: '🍽️', color: '#EA580C', bgColor: '#FFF7ED' },
  { id: 'accommodation', layer: 'hospitality',  label: 'Disponibilidade & Reservas',  emoji: '🛏️', color: '#0EA5E9', bgColor: '#F0F9FF' },
  { id: 'beauty',        layer: 'beauty',       label: 'Marcações & Serviços',        emoji: '✂️', color: '#EC4899', bgColor: '#FDF2F8' },
  { id: 'professional',  layer: 'professional', label: 'Consultar & Agendar',         emoji: '📅', color: '#7C3AED', bgColor: '#F5F3FF' },
  { id: 'health',        layer: 'professional', label: 'Marcar Consulta',             emoji: '🏥', color: '#059669', bgColor: '#F0FDF4' },
  { id: 'education',     layer: 'professional', label: 'Agendar Aula',                emoji: '📚', color: '#0284C7', bgColor: '#F0F9FF' },
];

const REVIEW_SORT_OPTIONS = [
  { id: 'recent',  label: 'Mais Recentes'    },
  { id: 'helpful', label: 'Mais Uteis'       },
  { id: 'highest', label: 'Melhor Avaliacao' },
  { id: 'lowest',  label: 'Pior Avaliacao'   },
];

const REVIEW_FILTERS = [
  { id: 'all',    label: 'Todas'       },
  { id: '5',      label: '5 estrelas'  },
  { id: '4',      label: '4+ estrelas' },
  { id: 'photos', label: 'Com fotos'   },
];

const REVIEWS_MOCK = [
  { id: 'r1', name: 'Ana M.',   avatar: '👩',   rating: 5, date: '12 Fev 2026', comment: 'Atendimento excelente e comida impecavel.',       photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'], helpful: 24, ownerResponse: 'Obrigado Ana!',                           ownerResponseDate: '13 Fev 2026' },
  { id: 'r2', name: 'Bruno L.', avatar: '👨',   rating: 4, date: '03 Fev 2026', comment: 'Bom ambiente, voltarei para experimentar mais.',  photos: [],                                                                    helpful: 12, ownerResponse: null,                                        ownerResponseDate: null          },
  { id: 'r3', name: 'Carla S.', avatar: '👩‍🦱', rating: 5, date: '28 Jan 2026', comment: 'Servico rapido e tudo muito saboroso.',          photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'], helpful: 18, ownerResponse: 'Muito obrigado pelo carinho Carla!', ownerResponseDate: '29 Jan 2026' },
  { id: 'r4', name: 'David P.', avatar: '👨‍🦲', rating: 3, date: '15 Jan 2026', comment: 'Comida boa mas o tempo de espera foi longo.',     photos: [],                                                                    helpful:  8, ownerResponse: 'Pedimos desculpa pela espera.',     ownerResponseDate: '16 Jan 2026' },
  { id: 'r5', name: 'Elena R.', avatar: '👩‍🦰', rating: 5, date: '10 Jan 2026', comment: 'Melhor pizza de Luanda!',                        photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'], helpful: 31, ownerResponse: null,                                        ownerResponseDate: null          },
];

const QA_MOCK = [
  { id: 'q1', question: 'Tem menu vegetariano?',                 answer: 'Sim! Temos várias opções vegetarianas incluindo saladas, massas e pizzas.', date: '10 Fev 2026', helpful: 12 },
  { id: 'q2', question: 'Aceitam reservas para grupos grandes?', answer: 'Sim, aceitamos reservas para grupos até 20 pessoas.',                        date: '05 Fev 2026', helpful:  8 },
];

const AMENITY_ICON_MAP = {
  wifi: 'wifi', parking: 'parking', outdoor: 'outdoor', delivery: 'delivery',
  takeaway: 'fastdelivery', vegan: 'heart', wheelchair: 'wheelchair', kids: 'users',
  livemusic: 'star', tpa: 'payment', homedelivery: 'delivery', '24h': 'clock',
  ac: 'certified', appointment: 'calendar', certified: 'certified', online: 'web',
  portfolio: 'portfolio', generator: 'certified', professional: 'professional',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getBusinessStatus(statusText, isOpen) {
  if (!statusText || !statusText.includes('ate')) return { isClosed: !isOpen, minsLeft: null };
  const match = statusText.match(/ate (\d{2}):(\d{2})/);
  if (!match) return { isClosed: !isOpen, minsLeft: null };
  const now = new Date(); const closing = new Date();
  closing.setHours(parseInt(match[1]), parseInt(match[2]), 0);
  const diffMs = closing - now;
  if (diffMs < 0) return { isClosed: true, minsLeft: null };
  if (diffMs <= 30 * 60 * 1000) return { isClosed: false, minsLeft: Math.max(0, Math.floor(diffMs / 60000)) };
  return { isClosed: false, minsLeft: null };
}

function StarRow({ rating, size = 11, color = '#F59E0B' }) {
  const full = Math.floor(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Text key={i} style={{ fontSize: size, marginRight: 1, color: i <= full ? color : '#E5E7EB' }}>★</Text>
      ))}
    </View>
  );
}

function RoomTypeCard({ roomType, onPressDetails }) {
  const photos = roomType.photos ?? [];
  const visible = photos.slice(0, 3);
  const extra = photos.length - 3;
  const { preview: amenityPreview, remaining: amenityRemaining } =
    getAmenitiesPreview(roomType.amenities ?? [], 4);

  return (
    <View style={s.roomCardPublic}>
      <Text style={s.roomCardPublicName}>{roomType.name}</Text>
      <Text style={s.roomCardPublicPrice}>
        {roomType.pricePerNight?.toLocaleString('pt-AO')} Kz / noite · Até {roomType.maxGuests} hóspedes
      </Text>

      <View style={s.roomThumbRow}>
        {visible.length > 0 ? (
          <>
            {visible.map((url, i) => (
              <TouchableOpacity key={`${url}-${i}`} onPress={() => onPressDetails(roomType, i)} style={s.roomThumb}>
                <Image source={{ uri: url }} style={s.roomThumbImg} />
              </TouchableOpacity>
            ))}
            {extra > 0 && (
              <TouchableOpacity style={[s.roomThumb, s.roomExtraThumb]} onPress={() => onPressDetails(roomType, 3)}>
                <Text style={s.roomExtraText}>+{extra}{'\n'}fotos</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={s.roomPlaceholder}>
            <Text style={s.roomPlaceholderIcon}>🛏️</Text>
            <Text style={s.roomPlaceholderText}>Sem fotos disponíveis</Text>
          </View>
        )}
      </View>

      {amenityPreview.length > 0 && (
        <View style={s.roomAmenityRow}>
          {amenityPreview.map((a) => (
            <Text key={a.id} style={s.roomAmenityTag}>{a.icon} {a.label}</Text>
          ))}
          {amenityRemaining > 0 && (
            <Text style={s.roomAmenityMore}>e mais {amenityRemaining}...</Text>
          )}
        </View>
      )}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function BusinessDetailModal({
  business,
  isOwner = false,
  bookmarkedIds = [],
  onToggleBookmark,
  swipeProgress,
  onClose,
  layer,  // useOperationalLayer() criado externamente (Main) — Nível 2 acima
  authSession = null,  // { accessToken, userId, role }
  onOpenAuth = null,   // () => void — abre modal de login
  userLocation = null, // { latitude, longitude } — distância real de estrada via OSRM
}) {
  const insets  = useSafeAreaInsets();
  const safeTop = insets.top + (Platform.OS === 'android' ? 4 : 0);

  // ── Animated values ────────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current;
  const scrollY    = useRef(new Animated.Value(0)).current;

  // Header animado: bg opacity 0→1 e título opacity 0→1 conforme scroll
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_THRESHOLD - 60, HEADER_SCROLL_THRESHOLD + 20],
    outputRange: [0, 1], extrapolate: 'clamp',
  });
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_THRESHOLD, HEADER_SCROLL_THRESHOLD + 60],
    outputRange: [0, 1], extrapolate: 'clamp',
  });
  // Foto desaparece ao scrollar
  const photoOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.6],
    outputRange: [1, 0], extrapolate: 'clamp',
  });

  // ── Estado local ───────────────────────────────────────────────────────────
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [ratingStars,       setRatingStars]        = useState(0);
  const [followed,          setFollowed]            = useState(false);
  const [userCheckIns,      setUserCheckIns]        = useState(0);
  const [activeTab,         setActiveTab]           = useState('Menu');
  const [helpfulReviews,    setHelpfulReviews]      = useState({});
  const [reviewSort,        setReviewSort]          = useState('recent');
  const [reviewFilter,      setReviewFilter]        = useState('all');
  const [showReviewStats,   setShowReviewStats]     = useState(false);
  const [claimLoading,      setClaimLoading]        = useState(false);
  const [claimDone,         setClaimDone]           = useState(false);
  const [socialLoading,     setSocialLoading]       = useState(false);
  const [isBookmarked,      setIsBookmarked]        = useState(false);
  const [checkInCount,      setCheckInCount]        = useState(0);
  const [followerCount,     setFollowerCount]       = useState(0);
  const [feedPosts,         setFeedPosts]           = useState([]);
  const [loyaltyState,      setLoyaltyState]        = useState({ points: 0, tier: 'bronze' });
  // Reviews (Sprint B)
  const [reviews,           setReviews]             = useState([]);
  const [reviewsLoading,    setReviewsLoading]      = useState(false);
  const [helpfulReviewsMap, setHelpfulReviewsMap]   = useState({}); // reviewId -> { isHelpful, count }
  const [showReviewModal,   setShowReviewModal]     = useState(false);
  const [pendingStars,      setPendingStars]        = useState(0);
  const [reviewComment,     setReviewComment]       = useState('');
  const [reviewSubmitting,  setReviewSubmitting]    = useState(false);
  // Q&A (Sprint B/C)
  const [questions,         setQuestions]           = useState([]);
  const [showAskModal,      setShowAskModal]        = useState(false);
  const [askText,           setAskText]             = useState('');
  const [askSubmitting,     setAskSubmitting]       = useState(false);
  const [detailModal,       setDetailModal]         = useState(null);

  const scrollRef      = useRef(null);

  // Distância de estrada via OSRM (OpenStreetMap routing, gratuito).
  // Substitui a estimativa dos cards assim que o modal abre.
  const [roadDistanceText, setRoadDistanceText] = useState(null);
  useEffect(() => {
    setRoadDistanceText(null);
    const lat = Number(business?.latitude);
    const lng = Number(business?.longitude);
    if (!userLocation || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    let active = true;
    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.longitude},${userLocation.latitude};${lng},${lat}?overview=false`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!active) return;
        if (data.code === 'Ok' && data.routes?.[0]) {
          const meters = data.routes[0].distance;
          const km = meters / 1000;
          setRoadDistanceText(km < 1 ? `${Math.round(meters)}m` : `${km.toFixed(1)}km`);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [business?.id, userLocation?.latitude, userLocation?.longitude]);


  // -- Estado social real + reviews + Q&A
  useEffect(() => {
    setIsBookmarked(bookmarkedIds.includes(business?.id));
    if (!business?.id) return;

    // Reviews e Q&A são públicos — carregam sempre
    setReviewsLoading(true);
    Promise.all([
      backendApi.getReviews(business.id).catch(() => []),
      backendApi.getQuestions(business.id).catch(() => []),
    ]).then(([fetchedReviews, fetchedQuestions]) => {
      if (Array.isArray(fetchedReviews)) setReviews(fetchedReviews);
      if (Array.isArray(fetchedQuestions)) setQuestions(fetchedQuestions);
    }).finally(() => setReviewsLoading(false));

    if (!authSession?.accessToken) return;
    Promise.all([
      backendApi.getSocialState(business.id, authSession.accessToken),
      backendApi.getBusinessFeed(business.id, 10, authSession.accessToken),
      backendApi.getLoyaltyState(business.id, authSession.accessToken),
    ])
      .then(([state, feed, loyalty]) => {
        if (state?.isBookmarked !== undefined) setIsBookmarked(state.isBookmarked);
        if (state?.isFollowed   !== undefined) setFollowed(state.isFollowed);
        if (state?.followerCount !== undefined) setFollowerCount(state.followerCount);
        if (state?.checkInCount !== undefined) setCheckInCount(state.checkInCount);
        if (Array.isArray(feed)) setFeedPosts(feed);
        if (loyalty?.points !== undefined) setLoyaltyState(loyalty);
      })
      .catch(() => {});
  }, [business?.id, authSession?.accessToken]);
  const sectionOffsets = useRef({});
  const gestureStartY  = useRef(0);        // Y onde o gesto começou
  const carouselAtStart = useRef(true);    // true = carrossel na primeira foto

  // ── Derived ────────────────────────────────────────────────────────────────
  if (!business) return null;

  const bookmarked     = bookmarkedIds.includes(business.id);
  const status         = getBusinessStatus(business.statusText, business.isOpen);
  const photos         = business.photos?.length > 0 ? business.photos : null;
  const badge          = getBusinessBadge(business);
  const activeModules  = OPERATIONAL_MODULES.filter(m => business.modules?.[m.id]);
  // dedupe por layer
  const actionButtons  = activeModules.filter((m, i, a) => a.findIndex(x => x.layer === m.layer) === i);

  // Tab "Menu" only shown if gastronomy module exists
  const detailTabs = useMemo(() => {
    const tabs = [];
    if (business.modules?.gastronomy || business.popularDishes?.length > 0 || business.deals?.length > 0) tabs.push('Menu');
    tabs.push('Informacoes');
    tabs.push('Avaliacoes');
    tabs.push('Mais');
    return tabs;
  }, [business]);

  const mapLat = business.latitude || -8.8368;
  const mapLng = business.longitude || 13.2343;
  const staticMapUrl = `https://static-maps.yandex.ru/1.x/?lang=pt_PT&ll=${mapLng},${mapLat}&z=15&size=650,220&l=map&pt=${mapLng},${mapLat},pm2rdm`;

  const filteredReviews = useMemo(() => {
    const source = reviews;
    let r = [...source].map(rv => ({
      ...rv,
      // Normalize API response fields to UI fields
      date: rv.date || (rv.createdAt ? new Date(rv.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
      name: rv.name || rv.user?.name || 'Utilizador',
      avatar: rv.avatar || '👤',
      photos: rv.photos || [],
      helpful: rv.helpfulCount ?? rv.helpful ?? 0,
      ownerResponse: rv.ownerResponse ?? rv.ownerReply ?? null,
      ownerResponseDate: rv.ownerResponseDate ?? (rv.ownerReplyDate ? new Date(rv.ownerReplyDate).toLocaleDateString('pt-PT') : null),
    }));
    if (reviewFilter === '5')      r = r.filter(x => x.rating === 5);
    if (reviewFilter === '4')      r = r.filter(x => x.rating >= 4);
    if (reviewFilter === 'photos') r = r.filter(x => x.photos.length > 0);
    if (reviewSort === 'helpful')  r.sort((a, b) => b.helpful - a.helpful);
    if (reviewSort === 'highest')  r.sort((a, b) => b.rating - a.rating);
    if (reviewSort === 'lowest')   r.sort((a, b) => a.rating - b.rating);
    return r;
  }, [reviews, reviewsLoading, reviewSort, reviewFilter]);

  const reviewStats = useMemo(() => {
    const source = reviews;
    const total = source.length;
    if (total === 0) return { total: business.reviews || 0, avg: (business.rating || 0).toFixed(1), dist: { 5:0,4:0,3:0,2:0,1:0 } };
    const avg = (source.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
    const dist = [5,4,3,2,1].reduce((acc, n) => { acc[n] = source.filter(r => r.rating === n).length; return acc; }, {});
    return { total, avg, dist };
  }, [reviews, business.rating, business.reviews]);

  // ── Swipe-right-to-close ───────────────────────────────────────────────────
  // Regras de activação:
  //  1. Sem layer operacional activa
  //  2. Gesto claramente horizontal (dx > dy * 2.5) e para a direita
  //  3. Se o gesto começa na zona do hero (Y < HERO_HEIGHT) E o carrossel
  //     NÃO está na primeira foto → NÃO capturar (é navegação do carrossel)
  //  4. Threshold de dx mínimo mais alto (12px) para evitar falsos positivos
  const panResponder = useRef(
    PanResponder.create({
      // Regista onde o toque começou (para distinguir zona hero vs conteúdo)
      onStartShouldSetPanResponder: (evt) => {
        gestureStartY.current = evt.nativeEvent.pageY;
        return false; // não captura no início — só em movimento
      },
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (detailModal) return false;
        // Layer operacional activa → não interferir
        if (layer.activeLayer) return false;

        // Movimento mínimo horizontal
        const minDx = Platform.OS === 'android' ? 12 : 10;
        if (Math.abs(dx) < minDx) return false;

        // Deve ser claramente mais horizontal do que vertical
        if (Math.abs(dx) < Math.abs(dy) * 2.5) return false;

        // Só captura swipe para a direita
        if (dx <= 0) return false;

        // Se o gesto começou na zona do hero E o carrossel não está na 1ª foto
        // → é navegação do carrossel, não fechar o modal
        const safeTopVal = gestureStartY.current;
        const heroZoneBottom = HERO_HEIGHT + 60; // margem extra de segurança
        if (safeTopVal < heroZoneBottom && !carouselAtStart.current) return false;

        return true;
      },
      onPanResponderGrant: () => translateX.stopAnimation(),
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) return;
        // Resistência progressiva: movimento real = Math.sqrt(dx) * factor
        // dá sensação de "peso" sem bloquear completamente
        const resistance = dx < 60 ? dx * 0.85 : 60 * 0.85 + (dx - 60) * 0.6;
        translateX.setValue(resistance);
        swipeProgress.setValue(Math.min(1, resistance / SCREEN_WIDTH));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_WIDTH * 0.38 || vx > 0.9) {
          Animated.parallel([
            Animated.timing(translateX,    { toValue: SCREEN_WIDTH, duration: 260, useNativeDriver: true }),
            Animated.timing(swipeProgress, { toValue: 1,            duration: 260, useNativeDriver: true }),
          ]).start(() => onClose());
        } else {
          Animated.parallel([
            Animated.spring(translateX,    { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.spring(swipeProgress, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateX,    { toValue: 0, useNativeDriver: true }),
          Animated.spring(swipeProgress, { toValue: 0, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (layer.activeLayer) { layer.close(); return; }
    Animated.parallel([
      Animated.timing(translateX,    { toValue: SCREEN_WIDTH, duration: 260, useNativeDriver: true }),
      Animated.timing(swipeProgress, { toValue: 1,            duration: 260, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [layer, translateX, swipeProgress, onClose]);

  const handleShare = useCallback(() => {
    Share.share({ message: `${business.name} — ${business.address || 'Luanda, Angola'}` });
  }, [business]);

  const handleClaim = useCallback(async () => {
    if (!authSession?.accessToken) {
      Alert.alert('Sessão expirada', 'Faz login novamente para reivindicar este negócio.');
      return;
    }
    Alert.alert(
      'Reivindicar negócio',
      `Tens a certeza que queres reivindicar "${business.name}"? A tua candidatura será analisada pelo admin.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reivindicar',
          onPress: async () => {
            setClaimLoading(true);
            try {
              await apiRequest(`/claims/${business.id}`, {
                method: 'POST',
                body: { evidence: `Pedido via app — ${business.name}` },
                accessToken: authSession.accessToken,
              });
              setClaimDone(true);
              Alert.alert('✅ Pedido enviado', 'O teu pedido foi enviado. Receberás uma notificação quando for analisado.');
            } catch (err) {
              Alert.alert('Erro', err?.message || 'Não foi possível enviar o pedido.');
            } finally {
              setClaimLoading(false);
            }
          },
        },
      ],
    );
  }, [authSession, business]);

  const handleCall = useCallback(() => {
    if (business.phone) Linking.openURL(`tel:${business.phone}`);
  }, [business]);

  const handleWhatsApp = useCallback(() => {
    if (business.phone) Linking.openURL(`https://wa.me/${business.phone.replace(/\D/g, '')}`);
  }, [business]);

  const handleWebsite = useCallback(() => {
    if (business.website) Linking.openURL(business.website);
  }, [business]);

  const handleTabPress = useCallback((tab) => {
    setActiveTab(tab);
    const offset = sectionOffsets.current[tab];
    if (offset !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, offset - 48), animated: true });
  }, []);

  const requireAuth = useCallback((action) => {
    if (authSession?.accessToken) { action(); return; }
    // Open login directly — Alert.alert is unreliable on web/Expo environments
    onOpenAuth?.();
  }, [authSession, onOpenAuth]);

  const toggleHelpful = (id) => setHelpfulReviews(p => ({ ...p, [id]: !p[id] }));

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[s.root, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* ── FIXED HEADER BACKGROUND (animado com scroll) ──────────────── */}
      <Animated.View
        style={[s.fixedHeaderBg, { opacity: headerBgOpacity, height: safeTop + 50 }]}
        pointerEvents="none"
      />

      {/* ── BOTÕES FLUTUANTES — posição absoluta, ABAIXO da safe area ── */}
      {/* A safe area não é invadida pelos botões, só pela foto           */}
      <View style={[s.fixedBtnsRow, { top: safeTop + 6 }]}>
        <TouchableOpacity onPress={handleClose} style={s.floatingBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="back" size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <Animated.Text style={[s.fixedTitle, { opacity: headerTitleOpacity }]} numberOfLines={1}>
          {business.name}
        </Animated.Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleShare} style={s.floatingBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="share" size={16} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onToggleBookmark?.(business.id)} style={s.floatingBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name={bookmarked ? 'heartFilled' : 'heart'} size={16} color={bookmarked ? '#FF6B6B' : '#FFFFFF'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCROLL VIEW PRINCIPAL ─────────────────────────────────────── */}
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={Platform.OS === 'ios'}
        alwaysBounceVertical={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── HERO — foto full-bleed, invade a safe area ── */}
        <Animated.View style={[s.heroWrap, { height: HERO_HEIGHT + safeTop, opacity: photoOpacity }]}>
          {photos ? (
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentPhotoIndex(idx);
                carouselAtStart.current = (idx === 0);
              }}
              onScrollBeginDrag={() => { /* ScrollView está a capturar — não interferir */ }}
            >
              {photos.map((uri, idx) => (
                <Image key={idx} style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT + safeTop }} source={{ uri }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[s.heroFallback, { height: HERO_HEIGHT + safeTop }]}>
              <Text style={{ fontSize: 80 }}>{business.icon || '🏢'}</Text>
            </View>
          )}
          {/* Scrim bottom gradient */}
          <View style={s.heroScrim} />
          {photos?.length > 1 && (
            <View style={s.photoCounter}>
              <Text style={s.photoCounterText}>{currentPhotoIndex + 1} / {photos.length}</Text>
            </View>
          )}
          {/* Botão reivindicar — flutuante sobre a foto, canto inferior esquerdo */}
          {!business.isClaimed && authSession?.accessToken && authSession?.role !== 'ADMIN' && (
            <TouchableOpacity
              style={[s.claimHeroBadge, claimDone && s.claimHeroBadgeDone]}
              onPress={claimDone ? null : handleClaim}
              activeOpacity={claimDone ? 1 : 0.85}
              disabled={claimLoading}
            >
              <Icon
                name={claimDone ? 'check' : 'flag'}
                size={12}
                color={claimDone ? '#16a34a' : COLORS.white}
                strokeWidth={2.5}
              />
              <Text style={[s.claimHeroBadgeText, claimDone && { color: '#16a34a' }]}>
                {claimDone ? 'Pedido enviado' : 'Reivindicar'}
              </Text>
            </TouchableOpacity>
          )}
          {business.isClaimed && business.ownerId === authSession?.userId && (
            <View style={s.claimHeroBadgeDone}>
              <Icon name="check" size={12} color="#16a34a" strokeWidth={2.5} />
              <Text style={[s.claimHeroBadgeText, { color: '#16a34a' }]}>És o dono</Text>
            </View>
          )}
        </Animated.View>

        {/* ── INFO STRIP — branco, abaixo do hero ── */}
        <View style={s.infoStrip}>
          <View style={s.infoStripTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.bizName}>{business.name}</Text>
              <Text style={s.bizCategory}>{business.subcategory || business.category}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              {business.isPremium && (
                <View style={s.premiumBadge}><Text style={s.premiumText}>👑 Premium</Text></View>
              )}
              {badge && (
                <View style={[s.typeBadge, { backgroundColor: badge.color + '18', borderColor: badge.color + '60' }]}>
                  <Text style={[s.typeBadgeText, { color: badge.color }]}>{badge.icon} {badge.label}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.infoMetaRow}>
            <StarRow rating={business.rating} size={12} />
            <Text style={s.ratingVal}>{business.rating}</Text>
            <Text style={s.reviewCount}>({business.reviews} avaliações)</Text>
            <View style={s.metaSep} />
            <View style={[s.statusDot, { backgroundColor: business.isOpen ? COLORS.green : COLORS.red }]} />
            <Text style={[s.statusText, { color: business.isOpen ? COLORS.green : COLORS.red }]}>
              {status.minsLeft !== null
                ? `Aberto • fecha em ${status.minsLeft} min`
                : status.isClosed ? 'Fechado' : (business.statusText || 'Aberto agora')}
            </Text>
          </View>
          <View style={s.infoMeta2}>
            <Icon name="location" size={12} color={COLORS.grayText} strokeWidth={1.5} />
            <Text style={s.distanceText}>{roadDistanceText ?? business.distanceText}</Text>
            {business.priceLevel && <Text style={s.priceDot}>·</Text>}
            {business.priceLevel && <Text style={s.priceText}>{'Kz'.repeat(business.priceLevel)}</Text>}
          </View>
        </View>

        {/* ── AVALIAÇÃO + SOCIAL — secção compacta ─────────────────── */}
        <View style={s.ratingSection}>
          {/* Linha 1: estrelas + stats inline */}
          <View style={s.ratingRow}>
            <Text style={s.ratingTitle}>Avaliar</Text>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => requireAuth(() => { setPendingStars(i); setReviewComment(''); setShowReviewModal(true); })} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={{ fontSize: 20, color: i <= ratingStars ? '#F59E0B' : '#E5E7EB' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statValue}>{(followerCount || business.followers || 0).toLocaleString()}</Text>
              <Text style={s.statLabel}>Seguidores</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statValue}>{(checkInCount || business.checkIns || 0).toLocaleString()}</Text>
              <Text style={s.statLabel}>Check-ins</Text>
            </View>
          </View>

          {/* Linha 2: botões sociais */}
          <View style={s.socialBtnsRow}>
            <TouchableOpacity
              style={[s.socialBtn, followed && s.socialBtnActive]}
              onPress={() => requireAuth(async () => {
                if (socialLoading) return;
                setSocialLoading(true);
                try {
                  const res = await backendApi.toggleFollow(business.id, authSession.accessToken);
                  setFollowed(res.isFollowed);
                  if (res.followerCount !== undefined) setFollowerCount(res.followerCount);
                } catch { setFollowed(p => !p); }
                finally { setSocialLoading(false); }
              })}
              activeOpacity={0.8}
            >
              <Icon name={followed ? 'check' : 'save'} size={13} color={followed ? COLORS.white : COLORS.darkText} strokeWidth={2} />
              <Text style={[s.socialBtnText, followed && s.socialBtnTextActive]}>{followed ? 'A seguir' : 'Seguir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.socialBtn}
              onPress={() => requireAuth(async () => {
                if (socialLoading) return;
                setSocialLoading(true);
                try {
                  const res = await backendApi.checkIn(business.id, authSession.accessToken);
                  if (res.checkedIn) { setCheckInCount(res.checkInCount); Alert.alert('Check-in feito! ✓', 'Obrigado pela visita.'); }
                  else { Alert.alert('Já fizeste check-in', res.message || 'Volta amanhã.'); }
                } catch { Alert.alert('Erro', 'Não foi possível registar.'); }
                finally { setSocialLoading(false); }
              })}
              activeOpacity={0.8}
            >
              <Icon name="checkin" size={13} color={COLORS.darkText} strokeWidth={1.5} />
              <Text style={s.socialBtnText}>Check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => requireAuth(async () => {
                if (socialLoading) return;
                setSocialLoading(true);
                try {
                  const res = await backendApi.toggleBookmark(business.id, authSession.accessToken);
                  setIsBookmarked(res.isBookmarked);
                  onToggleBookmark?.(business.id);
                } catch { onToggleBookmark?.(business.id); }
                finally { setSocialLoading(false); }
              })}
              activeOpacity={0.8}
            >
              <Icon name={isBookmarked ? 'heartFilled' : 'bookmark'} size={13} color={isBookmarked ? COLORS.white : COLORS.darkText} strokeWidth={1.5} />
              <Text style={[s.socialBtnText, isBookmarked && s.socialBtnTextActive]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TABS ─────────────────────────────────────────────────── */}
        <View style={s.tabsBar}>
          {detailTabs.map(tab => (
            <TouchableOpacity key={tab} style={s.tabItem} onPress={() => handleTabPress(tab)} activeOpacity={0.7}>
              <Text style={activeTab === tab ? s.tabTextActive : s.tabText}>{tab}</Text>
              {activeTab === tab && <View style={s.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MÓDULOS OPERACIONAIS (botões de acção contextuais) ────── */}
        {actionButtons.length > 0 && (
          <View style={s.block}
            onLayout={e => { if (sectionOffsets.current) sectionOffsets.current.Menu = e.nativeEvent.layout.y; }}
          >
            <Text style={s.blockTitle}>✦ Ações Disponíveis</Text>
            {actionButtons.map(btn => (
              <TouchableOpacity
                key={btn.layer}
                style={s.actionBtn}
                onPress={() => requireAuth(() => layer.open(btn.layer, business))}
                activeOpacity={0.82}
              >
                <Text style={s.actionEmoji}>{btn.emoji}</Text>
                <Text style={s.actionLabel}>{btn.label}</Text>
                <Icon name="chevronRight" size={15} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── DEALS ────────────────────────────────────────────────── */}
        {business.deals?.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>🔥 Ofertas Ativas</Text>
            {business.deals.map(d => (
              <View key={d.id} style={s.dealCard}>
                <View style={s.dealCardHead}>
                  <Text style={s.dealTitle}>{d.title}</Text>
                  <View style={s.dealCodeBadge}><Text style={s.dealCodeText}>{d.code}</Text></View>
                </View>
                {!!d.description && <Text style={s.dealDesc}>{d.description}</Text>}
                {!!d.expires && <Text style={s.dealExpiry}>Válido até: {d.expires}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ── PRATOS POPULARES ─────────────────────────────────────── */}
        {business.popularDishes?.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>Pratos Populares</Text>
            <View style={s.menuCard}>
              {business.popularDishes.map((d, i) => (
                <View key={i} style={[s.menuItem, i === business.popularDishes.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.dishRank}><Text style={s.dishRankText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dishName}>{d.name}</Text>
                    {d.orders && <Text style={s.dishOrders}>{d.orders} pedidos</Text>}
                  </View>
                  <Text style={s.dishPrice}>{d.price}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(business.modules?.accommodation || business.roomTypes?.length > 0) && (
          <View style={s.block}>
            <Text style={s.blockTitle}>Quartos Disponíveis</Text>
            {business.roomTypes?.length > 0 ? (
              <View style={{ gap: 12 }}>
                {business.roomTypes.map((rt) => (
                  <RoomTypeCard
                    key={rt.id}
                    roomType={rt}
                    onPressDetails={(roomType, idx) => setDetailModal({ roomType, initialPhotoIdx: idx })}
                  />
                ))}
              </View>
            ) : (
              <View style={s.emptyStateBox}>
                <Text style={s.emptyStateText}>Quartos em preparação.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── INFORMACOES ──────────────────────────────────────────── */}
        <View
          style={s.block}
          onLayout={e => { if (sectionOffsets.current) sectionOffsets.current.Informacoes = e.nativeEvent.layout.y; }}
        >
          <Text style={s.blockTitle}>Informacoes</Text>
          {/* WhatsApp, Ligar, Website */}
          <View style={s.infoActionsRow}>
            {business.phone && (
              <TouchableOpacity style={[s.infoActionBtn, s.whatsappBtn]} onPress={handleWhatsApp} activeOpacity={0.85}>
                <View style={s.waBadge}>
                  <Icon name="whatsapp" size={12} color="#25D366" strokeWidth={1.5} />
                </View>
                <Text style={s.waBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {business.phone && (
              <TouchableOpacity style={s.infoActionBtn} onPress={handleCall} activeOpacity={0.85}>
                <Icon name="phone" size={14} color={COLORS.darkText} strokeWidth={1.5} />
                <Text style={s.infoActionText}>Ligar</Text>
              </TouchableOpacity>
            )}
            {business.website && (
              <TouchableOpacity style={s.infoActionBtn} onPress={handleWebsite} activeOpacity={0.85}>
                <Icon name="web" size={14} color={COLORS.darkText} strokeWidth={1.5} />
                <Text style={s.infoActionText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Highlights itálico */}
          {business.highlights?.length > 0 && (
            <Text style={s.highlights}>{business.highlights.join(' • ')}</Text>
          )}
          {business.description && <Text style={s.description}>{business.description}</Text>}

          {/* Mini mapa clicável */}
          {(business.latitude || business.longitude) && (() => {
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={s.mapPlaceholder}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`).catch(() => {})}
              >
                <Image source={{ uri: staticMapUrl }} style={s.mapImage} resizeMode="cover" />
                <View style={s.mapOverlayBadge}>
                  <Icon name="mapPin" size={13} color={COLORS.red} strokeWidth={1.8} />
                  <Text style={s.mapOverlayText}>Abrir no Google Maps</Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* Morada */}
          {business.address && (
            <View style={s.addressRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.addressMain}>{business.address}</Text>
                {business.neighborhood && <Text style={s.addressSub}>{business.neighborhood}</Text>}
              </View>
              <TouchableOpacity style={s.directionsBtn} onPress={() => {
                const lat = business.latitude || -8.8368;
                const lng = business.longitude || 13.2343;
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
                  .catch(() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`));
              }}>
                <Text style={s.directionsBtnText}>Direcoes →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Horários */}
          {business.hours && (
            <View style={s.infoRow}>
              <Icon name="clock" size={15} color={COLORS.grayText} strokeWidth={1.5} />
              <Text style={s.infoRowText}>{business.hours}</Text>
            </View>
          )}

          {/* Comodidades */}
          {business.amenities?.length > 0 && (
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {business.amenities.map(a => (
                <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F7F7F8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                  <Icon name={AMENITY_ICON_MAP[a] || 'check'} size={12} color={COLORS.grayText} strokeWidth={1.5} />
                  <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Formas de pagamento */}
          {business.payment?.length > 0 && (
            <View style={[s.infoRow, { marginTop: 8 }]}>
              <Icon name="payment" size={15} color={COLORS.grayText} strokeWidth={1.5} />
              <Text style={s.infoRowText}>{business.payment.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* ── AVALIACOES ───────────────────────────────────────────── */}
        <View
          style={s.block}
          onLayout={e => { if (sectionOffsets.current) sectionOffsets.current.Avaliacoes = e.nativeEvent.layout.y; }}
        >
          <Text style={s.blockTitle}>Avaliacoes</Text>

          {/* Stats card */}
          <TouchableOpacity style={s.reviewStatsCard} onPress={() => setShowReviewStats(p => !p)} activeOpacity={0.9}>
            <View style={s.reviewStatsHeader}>
              <View>
                <Text style={s.reviewAvgBig}>{reviewStats.avg}</Text>
                <StarRow rating={parseFloat(reviewStats.avg)} size={13} />
                <Text style={s.reviewTotalText}>{reviewStats.total} avaliacoes</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#8A8A8A' }}>{showReviewStats ? '▼' : '▶'}</Text>
            </View>
            {showReviewStats && (
              <View style={{ marginTop: 12, gap: 6 }}>
                {[5,4,3,2,1].map(star => (
                  <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: '#8A8A8A', width: 24 }}>{star}★</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#EBEBEB', borderRadius: 3 }}>
                      <View style={{ width: `${(reviewStats.dist[star] / reviewStats.total) * 100}%`, height: 6, backgroundColor: COLORS.red, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#8A8A8A', width: 18, textAlign: 'right' }}>{reviewStats.dist[star]}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>

          {/* Sort + Filter */}
          <View style={{ marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <Text style={s.controlLabel}>Ordenar:</Text>
              {REVIEW_SORT_OPTIONS.map(so => (
                <TouchableOpacity key={so.id} style={[s.chip, reviewSort === so.id && s.chipActive]} onPress={() => setReviewSort(so.id)}>
                  <Text style={[s.chipText, reviewSort === so.id && s.chipTextActive]}>{so.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={s.controlLabel}>Filtrar:</Text>
              {REVIEW_FILTERS.map(f => (
                <TouchableOpacity key={f.id} style={[s.chip, reviewFilter === f.id && s.chipActive]} onPress={() => setReviewFilter(f.id)}>
                  <Text style={[s.chipText, reviewFilter === f.id && s.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lista de reviews */}
          <View style={{ gap: 12, marginBottom: 12 }}>
            {filteredReviews.length === 0 && !reviewsLoading && (
              <Text style={{ color: COLORS.grayText, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                Sem avaliações ainda. Sê o primeiro a avaliar!
              </Text>
            )}
            {filteredReviews.slice(0, 5).map(review => {
              const helpfulEntry = helpfulReviewsMap[review.id] ?? { isHelpful: false, count: review.helpful ?? 0 };
              return (
                <View key={review.id} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 26 }}>{review.avatar}</Text>
                      <View>
                        <Text style={s.reviewName}>{review.name}</Text>
                        <Text style={s.reviewDate}>{review.date}</Text>
                      </View>
                    </View>
                  </View>
                  <StarRow rating={review.rating} size={11} />
                  <Text style={s.reviewComment}>{review.comment}</Text>
                  {review.photos?.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {review.photos.map((p, i) => (
                        <Image key={i} source={{ uri: p }} style={{ width: 80, height: 60, borderRadius: 8, marginRight: 8 }} />
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                    onPress={() => requireAuth(async () => {
                      try {
                        const res = await backendApi.toggleReviewHelpful(review.id, authSession.accessToken);
                        setHelpfulReviewsMap(p => ({ ...p, [review.id]: { isHelpful: res.isHelpful, count: res.helpfulCount } }));
                      } catch { /* silent */ }
                    })}
                  >
                    <Icon name="like" size={14} color={helpfulEntry.isHelpful ? COLORS.red : COLORS.grayText} strokeWidth={1.5} />
                    <Text style={{ fontSize: 12, color: helpfulEntry.isHelpful ? COLORS.red : COLORS.grayText, fontWeight: '600' }}>
                      Útil ({helpfulEntry.count})
                    </Text>
                  </TouchableOpacity>
                  {review.ownerResponse && (
                    <View style={s.ownerReplyCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={s.ownerReplyBadge}>🏪 Resposta do proprietario</Text>
                        <Text style={s.ownerReplyDate}>{review.ownerResponseDate}</Text>
                      </View>
                      <Text style={s.ownerReplyText}>{review.ownerResponse}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={s.viewAllBtn} onPress={() => Alert.alert('Avaliações', `Ver todas as ${filteredReviews.length} avaliações`)}>
            <Text style={s.viewAllText}>Ver todas as avaliações ({filteredReviews.length}) →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.addPhotoBtn} onPress={() => requireAuth(() => { setPendingStars(0); setReviewComment(''); setShowReviewModal(true); })}>
            <Icon name="camera" size={18} color={COLORS.darkText} strokeWidth={1.5} />
            <Text style={s.addPhotoText}>Escrever avaliação</Text>
          </TouchableOpacity>
        </View>

        {/* ── MAIS (Q&A + Código de Referência) ───────────────────── */}
        <View
          style={s.block}
          onLayout={e => { if (sectionOffsets.current) sectionOffsets.current.Mais = e.nativeEvent.layout.y; }}
        >
          <Text style={s.blockTitle}>Mais</Text>

          {/* Q&A */}
          <View style={s.qaSection}>
            <View style={s.qaHeader}>
              <Text style={s.qaTitle}>Perguntas & Respostas</Text>
              <TouchableOpacity onPress={() => requireAuth(() => { setAskText(''); setShowAskModal(true); })}>
                <Text style={s.qaAskBtn}>Perguntar</Text>
              </TouchableOpacity>
            </View>
            {questions.length === 0 && !reviewsLoading && (
              <Text style={{ color: COLORS.grayText, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>Sem perguntas ainda. Sê o primeiro a perguntar!</Text>
            )}
            {questions.slice(0, 5).map(qa => (
              <View key={qa.id} style={s.qaItem}>
                <Text style={s.qaQuestion}>❓ {qa.question}</Text>
                {qa.answer ? (
                  <Text style={s.qaAnswer}>{qa.answer}</Text>
                ) : (
                  <Text style={[s.qaAnswer, { color: COLORS.grayText, fontStyle: 'italic' }]}>Sem resposta ainda.</Text>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={s.qaDate}>{qa.date || (qa.createdAt ? new Date(qa.createdAt).toLocaleDateString('pt-PT') : '')}</Text>
                  <TouchableOpacity onPress={() => requireAuth(async () => {
                    try {
                      const res = await backendApi.toggleQuestionHelpful(qa.id, authSession.accessToken);
                      setQuestions(prev => prev.map(q => q.id === qa.id ? { ...q, helpfulCount: res.helpfulCount } : q));
                    } catch { /* silent */ }
                  })}>
                    <Text style={s.qaHelpful}>👍 {qa.helpfulCount ?? qa.helpful ?? 0} útil</Text>
                  </TouchableOpacity>
                </View>
                {/* Owner answer button (only shown to owner) */}
                {isOwner && !qa.answer && (
                  <TouchableOpacity
                    style={{ marginTop: 4 }}
                    onPress={() => { setAskText(''); setShowAskModal(qa.id); }}
                  >
                    <Text style={{ fontSize: 12, color: COLORS.red, fontWeight: '600' }}>Responder →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => {}}>
              <Text style={s.viewAllText}>Ver todas as perguntas ({questions.length}) →</Text>
            </TouchableOpacity>
          </View>

          {/* Código de Referência */}
          {(business.referralCode || business.deals?.length > 0) && (
            <View style={s.referralCard}>
              <View style={s.referralHeader}>
                <Text style={{ fontSize: 26 }}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.referralTitle}>Código de Referência</Text>
                  <Text style={s.referralSub}>Partilhe e ganhe descontos!</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.referralCodeBox}
                onPress={() => Alert.alert('Copiado!', `Código ${business.referralCode || business.deals?.[0]?.code} copiado.`)}
              >
                <Text style={s.referralCodeText}>{business.referralCode || business.deals?.[0]?.code}</Text>
                <Text style={{ fontSize: 18 }}>📋</Text>
              </TouchableOpacity>
              <Text style={s.referralHint}>Toque para copiar</Text>
            </View>
          )}

          <View style={s.feedCard}>
            <View style={s.feedHeader}>
              <Text style={s.feedTitle}>Feed do Negócio</Text>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    if (!authSession?.accessToken) return;
                    backendApi.createBusinessFeedPost(
                      business.id,
                      { content: `Novidade de ${business.name} em ${new Date().toLocaleDateString('pt-PT')}.` },
                      authSession.accessToken,
                    )
                      .then(async () => {
                        const fresh = await backendApi.getBusinessFeed(business.id, 10, authSession.accessToken);
                        setFeedPosts(Array.isArray(fresh) ? fresh : []);
                      })
                      .catch(() => Alert.alert('Erro', 'Não foi possível publicar no feed.'));
                  }}
                >
                  <Text style={s.feedPostBtn}>Publicar</Text>
                </TouchableOpacity>
              )}
            </View>
            {feedPosts.length === 0 ? (
              <Text style={s.feedEmpty}>Sem posts ainda. Este espaço mostra novidades e campanhas em tempo real.</Text>
            ) : (
              feedPosts.slice(0, 4).map(post => (
                <View key={post.id} style={s.feedItem}>
                  <Text style={s.feedItemText}>{post.content}</Text>
                  <Text style={s.feedItemMeta}>
                    {post.author?.name || 'Negócio'} • {new Date(post.createdAt).toLocaleDateString('pt-PT')}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={s.loyaltyCard}>
            <Text style={s.loyaltyTitle}>Fidelidade</Text>
            <Text style={s.loyaltyPoints}>{(loyaltyState?.points || 0).toLocaleString()} pts</Text>
            <Text style={s.loyaltyTier}>Nível: {(loyaltyState?.tier || 'bronze').toUpperCase()}</Text>
            <TouchableOpacity
              style={s.loyaltyRedeemBtn}
              onPress={() => requireAuth(async () => {
                try {
                  const res = await backendApi.redeemLoyalty(business.id, { points: 50, rewardCode: 'SNACK50' }, authSession.accessToken);
                  setLoyaltyState(s0 => ({ ...s0, points: res.currentPoints, tier: res.tier }));
                  Alert.alert('Resgate concluído', 'Cupão SNACK50 aplicado com sucesso.');
                } catch {
                  Alert.alert('Fidelidade', 'Pontos insuficientes ou sistema indisponível.');
                }
              })}
            >
              <Text style={s.loyaltyRedeemText}>Resgatar 50 pts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      <RoomDetailModal
        visible={!!detailModal}
        roomType={detailModal?.roomType}
        business={business}
        initialPhotoIdx={detailModal?.initialPhotoIdx}
        onClose={() => setDetailModal(null)}
        onBook={(roomType) => {
          setDetailModal(null);
          requireAuth(() => layer.open('hospitality', business));
        }}
      />

      {/* Nível 2 (OperationalLayerRenderer) renderizado externamente em Main */}

      {/* ── REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
            activeOpacity={1}
            onPress={() => setShowReviewModal(false)}
          />
          <View style={s.bottomSheet}>
            <View style={s.bottomSheetHandle} />
            <Text style={s.bottomSheetTitle}>Avaliar {business.name}</Text>
            {/* Star picker */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 16 }}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => setPendingStars(i)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <Text style={{ fontSize: 36, color: i <= pendingStars ? '#F59E0B' : '#E5E7EB' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Comment input */}
            <TextInput
              style={s.reviewInput}
              placeholder="Descreve a tua experiência... (mínimo 5 caracteres)"
              placeholderTextColor={COLORS.grayText}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={{ fontSize: 11, color: COLORS.grayText, textAlign: 'right', marginBottom: 12 }}>
              {reviewComment.length}/500
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[s.sheetBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={[s.sheetBtnText, { color: COLORS.darkText }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetBtn, { flex: 2, backgroundColor: pendingStars > 0 && reviewComment.trim().length >= 5 ? COLORS.red : '#E5E7EB' }]}
                disabled={reviewSubmitting || pendingStars === 0 || reviewComment.trim().length < 5}
                onPress={async () => {
                  if (reviewSubmitting || pendingStars === 0 || reviewComment.trim().length < 5) return;
                  setReviewSubmitting(true);
                  try {
                    const newReview = await backendApi.createReview(
                      business.id,
                      { rating: pendingStars, comment: reviewComment.trim() },
                      authSession.accessToken,
                    );
                    setReviews(prev => {
                      const without = prev.filter(r => r.userId !== authSession.userId);
                      return [newReview, ...without];
                    });
                    setRatingStars(pendingStars);
                    setShowReviewModal(false);
                  } catch (err) {
                    Alert.alert('Erro', err?.message || 'Não foi possível guardar a avaliação.');
                  } finally {
                    setReviewSubmitting(false);
                  }
                }}
              >
                <Text style={[s.sheetBtnText, { color: pendingStars > 0 && reviewComment.trim().length >= 5 ? '#FFF' : COLORS.grayText }]}>
                  {reviewSubmitting ? 'A enviar...' : 'Publicar avaliação'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── ASK / ANSWER MODAL ───────────────────────────────────── */}
      {showAskModal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
            activeOpacity={1}
            onPress={() => setShowAskModal(false)}
          />
          <View style={s.bottomSheet}>
            <View style={s.bottomSheetHandle} />
            <Text style={s.bottomSheetTitle}>
              {typeof showAskModal === 'string' ? 'Responder à pergunta' : 'Fazer uma pergunta'}
            </Text>
            <TextInput
              style={[s.reviewInput, { marginTop: 12 }]}
              placeholder={typeof showAskModal === 'string' ? 'Escreve a tua resposta...' : 'Qual é a tua pergunta sobre este negócio?'}
              placeholderTextColor={COLORS.grayText}
              value={askText}
              onChangeText={setAskText}
              multiline
              maxLength={300}
              textAlignVertical="top"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.sheetBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowAskModal(false)}
              >
                <Text style={[s.sheetBtnText, { color: COLORS.darkText }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetBtn, { flex: 2, backgroundColor: askText.trim().length >= 5 ? COLORS.red : '#E5E7EB' }]}
                disabled={askSubmitting || askText.trim().length < 5}
                onPress={async () => {
                  if (askSubmitting || askText.trim().length < 5) return;
                  setAskSubmitting(true);
                  try {
                    if (typeof showAskModal === 'string') {
                      // Owner answering a question
                      const updated = await backendApi.answerQuestion(showAskModal, askText.trim(), authSession.accessToken);
                      setQuestions(prev => prev.map(q => q.id === showAskModal ? { ...q, answer: updated.answer, answeredAt: updated.answeredAt } : q));
                    } else {
                      // User asking a question
                      const newQ = await backendApi.askQuestion(business.id, askText.trim(), authSession.accessToken);
                      setQuestions(prev => [newQ, ...prev]);
                    }
                    setShowAskModal(false);
                    setAskText('');
                  } catch (err) {
                    Alert.alert('Erro', err?.message || 'Não foi possível enviar.');
                  } finally {
                    setAskSubmitting(false);
                  }
                }}
              >
                <Text style={[s.sheetBtnText, { color: askText.trim().length >= 5 ? '#FFF' : COLORS.grayText }]}>
                  {askSubmitting ? 'A enviar...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#FFFFFF' },

  // Fixed header
  fixedHeaderBg:     { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998, elevation: 9, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  fixedBtnsRow:      { position: 'absolute', left: 0, right: 0, zIndex: 9999, elevation: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  floatingBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  fixedTitle:        { flex: 1, fontSize: 16, fontWeight: '700', color: '#111111', letterSpacing: -0.3, textAlign: 'center' },

  // Bottom sheet (Review modal + Ask modal)
  bottomSheet:       { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, zIndex: 9999, elevation: 15 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  bottomSheetTitle:  { fontSize: 17, fontWeight: '700', color: '#111', textAlign: 'center' },
  reviewInput:       { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#111', minHeight: 100, backgroundColor: '#F9FAFB' },
  sheetBtn:          { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText:      { fontSize: 15, fontWeight: '700' },

  // Hero
  heroWrap:          { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#1A1A2E' },
  heroFallback:      { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E' },
  heroScrim:         { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.18)' },
  photoCounter:      { position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  photoCounterText:  { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Info strip
  infoStrip:         { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  infoStripTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bizName:           { fontSize: 20, fontWeight: '800', color: '#111111', letterSpacing: -0.4, marginBottom: 3 },
  bizCategory:       { fontSize: 12, color: '#8A8A8A', fontWeight: '500' },
  premiumBadge:      { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD700' },
  premiumText:       { fontSize: 11, fontWeight: '700', color: '#B8860B' },
  typeBadge:         { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  typeBadgeText:     { fontSize: 11, fontWeight: '700' },
  infoMetaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 5 },
  ratingVal:         { fontSize: 13, fontWeight: '700', color: '#111111' },
  reviewCount:       { fontSize: 12, color: '#8A8A8A' },
  metaSep:           { width: 1, height: 12, backgroundColor: '#EBEBEB', marginHorizontal: 4 },
  statusDot:         { width: 7, height: 7, borderRadius: 3.5 },
  statusText:        { fontSize: 12, fontWeight: '600' },
  infoMeta2:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText:      { fontSize: 11, color: '#8A8A8A', fontWeight: '500' },
  priceDot:          { fontSize: 14, color: '#8A8A8A' },
  priceText:         { fontSize: 11, color: '#8A8A8A', fontWeight: '600' },

  // Rating starter
  ratingSection:     { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  ratingRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ratingTitle:       { fontSize: 11, color: '#8A8A8A', fontWeight: '700', letterSpacing: 0.5 },
  starsRow:          { flexDirection: 'row', gap: 3, flex: 1 },
  ratingCta:         { fontSize: 11, color: '#8A8A8A', fontWeight: '600' },

  // Social
  socialSection:     { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  socialStats:       { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 10 },
  statCol:           { alignItems: 'center' },
  statValue:         { fontSize: 15, fontWeight: '700', color: '#111111' },
  statLabel:         { fontSize: 10, color: '#8A8A8A', marginTop: 1 },
  statDivider:       { width: 1, height: 26, backgroundColor: '#EBEBEB' },
  socialBtnsRow:     { flexDirection: 'row', gap: 8 },
  socialBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 20, paddingVertical: 8, gap: 5 },
  socialBtnActive:   { backgroundColor: COLORS.red || '#D32323', borderColor: COLORS.red || '#D32323' },
  socialBtnText:     { fontSize: 12, fontWeight: '700', color: '#111111' },
  socialBtnTextActive: { color: '#FFFFFF' },

  // Tabs
  tabsBar:           { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1.5, borderBottomColor: '#EBEBEB', paddingHorizontal: 12 },
  tabItem:           { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText:           { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  tabTextActive:     { fontSize: 12, color: '#D32323', fontWeight: '700' },
  tabIndicator:      { height: 2, width: 28, backgroundColor: '#D32323', borderRadius: 2, marginTop: 4 },

  // Blocks
  block:             { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, backgroundColor: '#FFFFFF' },
  blockTitle:        { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 12 },

  // Action buttons
  actionBtn:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#D32323', gap: 12, marginBottom: 8 },
  actionEmoji:       { fontSize: 22 },
  actionLabel:       { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Deals
  dealCard:          { backgroundColor: '#FFFBF0', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FFE082' },
  dealCardHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  dealTitle:         { fontSize: 14, fontWeight: '700', color: '#111111', flex: 1, marginRight: 8 },
  dealCodeBadge:     { backgroundColor: '#D32323', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dealCodeText:      { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  dealDesc:          { fontSize: 12, color: '#8A8A8A', marginBottom: 5 },
  dealExpiry:        { fontSize: 11, color: '#D32323', fontWeight: '600' },

  // Menu / popular dishes
  menuCard:          { borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#FFFFFF', marginBottom: 8 },
  menuItem:          { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  dishRank:          { width: 26, height: 26, borderRadius: 13, backgroundColor: '#D32323', alignItems: 'center', justifyContent: 'center' },
  dishRankText:      { fontSize: 12, fontWeight: '800', color: '#FFF' },
  dishName:          { fontSize: 13, fontWeight: '700', color: '#111111' },
  dishOrders:        { fontSize: 11, color: '#8A8A8A' },
  dishPrice:         { fontSize: 13, fontWeight: '700', color: '#D32323' },

  // Informações
  infoActionsRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  infoActionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBEB' },
  infoActionText:    { fontSize: 13, fontWeight: '600', color: '#111111' },
  whatsappBtn:       { borderColor: '#25D366', backgroundColor: '#F0FFF4' },
  waBadge:           { width: 20, height: 20, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  waBtnText:         { fontSize: 13, fontWeight: '700', color: '#128C7E' },
  highlights:        { fontSize: 13, color: '#8A8A8A', fontStyle: 'italic', marginBottom: 10 },
  description:       { fontSize: 13, color: '#111111', lineHeight: 20, marginBottom: 12 },
  mapPlaceholder:    { height: 130, backgroundColor: '#F7F7F8', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  mapImage:          { width: '100%', height: '100%' },
  mapOverlayBadge:   { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  mapOverlayText:    { fontSize: 11, color: '#1F2937', fontWeight: '700' },
  addressRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  addressMain:       { fontSize: 13, fontWeight: '600', color: '#111111' },
  addressSub:        { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  directionsBtn:     { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EBEBEB', marginLeft: 10 },
  directionsBtnText: { fontSize: 12, fontWeight: '700', color: '#D32323' },
  infoRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoRowText:       { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },

  // Avaliações
  reviewStatsCard:   { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  reviewStatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewAvgBig:      { fontSize: 38, fontWeight: '800', color: '#111111', lineHeight: 44 },
  reviewTotalText:   { fontSize: 12, color: '#8A8A8A', marginTop: 4 },
  controlLabel:      { fontSize: 11, fontWeight: '700', color: '#8A8A8A', marginRight: 8, alignSelf: 'center' },
  chip:              { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', marginRight: 6 },
  chipActive:        { borderColor: '#D32323', backgroundColor: '#FFF0F0' },
  chipText:          { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  chipTextActive:    { color: '#D32323' },
  reviewCard:        { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  reviewHeader:      { marginBottom: 8 },
  reviewName:        { fontSize: 14, fontWeight: '700', color: '#111111' },
  reviewDate:        { fontSize: 11, color: '#8A8A8A' },
  reviewComment:     { fontSize: 13, color: '#111111', lineHeight: 20, marginTop: 8, marginBottom: 8 },
  ownerReplyCard:    { backgroundColor: '#F0FFF4', borderLeftWidth: 3, borderLeftColor: '#22A06B', borderRadius: 8, padding: 10, marginTop: 8 },
  ownerReplyBadge:   { fontSize: 11, fontWeight: '700', color: '#22A06B' },
  ownerReplyDate:    { fontSize: 10, color: '#8A8A8A' },
  ownerReplyText:    { fontSize: 12, color: '#111111', lineHeight: 17, marginTop: 2 },
  viewAllBtn:        { paddingVertical: 10 },
  viewAllText:       { fontSize: 12, color: '#D32323', fontWeight: '700', textAlign: 'center' },
  addPhotoBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EBEBEB', marginTop: 4 },
  addPhotoText:      { fontSize: 13, fontWeight: '600', color: '#111111' },
  claimHeroBadge: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingVertical: 6, paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  claimHeroBadgeDone: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(240,255,244,0.92)',
    paddingVertical: 6, paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1, borderColor: '#16a34a40',
  },
  claimHeroBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.white, letterSpacing: 0.2 },

  // Q&A
  qaSection:         { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  qaHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  qaTitle:           { fontSize: 14, fontWeight: '700', color: '#111111' },
  qaAskBtn:          { fontSize: 13, fontWeight: '700', color: '#D32323' },
  qaItem:            { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  qaQuestion:        { fontSize: 13, fontWeight: '700', color: '#111111', marginBottom: 5 },
  qaAnswer:          { fontSize: 12, color: '#8A8A8A', lineHeight: 18, marginBottom: 5 },
  qaDate:            { fontSize: 11, color: '#8A8A8A' },
  qaHelpful:         { fontSize: 11, color: '#8A8A8A' },

  // Referral
  referralCard:      { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#FCD34D' },
  referralHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  referralTitle:     { fontSize: 14, fontWeight: '700', color: '#111111' },
  referralSub:       { fontSize: 12, color: '#8A8A8A' },
  referralCodeBox:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: '#D32323', gap: 8, marginBottom: 6 },
  referralCodeText:  { fontSize: 22, fontWeight: '800', color: '#D32323', letterSpacing: 3 },
  referralHint:      { fontSize: 11, color: '#8A8A8A', textAlign: 'center' },

  // Feed social + fidelidade
  feedCard:          { marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
  feedHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feedTitle:         { fontSize: 14, fontWeight: '700', color: '#111111' },
  feedPostBtn:       { fontSize: 12, color: '#D32323', fontWeight: '700' },
  feedEmpty:         { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  feedItem:          { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  feedItemText:      { fontSize: 13, color: '#111111', lineHeight: 18 },
  feedItemMeta:      { fontSize: 11, color: '#8A8A8A', marginTop: 4 },
  loyaltyCard:       { marginTop: 12, borderRadius: 12, padding: 14, backgroundColor: '#FFF7E8', borderWidth: 1, borderColor: '#F5D18C' },
  loyaltyTitle:      { fontSize: 13, fontWeight: '700', color: '#7A4A00' },
  loyaltyPoints:     { fontSize: 24, fontWeight: '800', color: '#111111', marginTop: 2 },
  loyaltyTier:       { fontSize: 12, color: '#7A4A00', fontWeight: '700', marginTop: 2 },
  loyaltyRedeemBtn:  { marginTop: 10, backgroundColor: '#D32323', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  loyaltyRedeemText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Room cards (public)
  roomCardPublic:      { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  roomCardPublicName:  { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  roomCardPublicPrice: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  roomThumbRow:        { flexDirection: 'row', gap: 6, marginBottom: 10 },
  roomThumb:           { width: 80, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  roomThumbImg:        { width: '100%', height: '100%' },
  roomExtraThumb:      { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  roomExtraText:       { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  roomPlaceholder:     { flex: 1, height: 60, backgroundColor: '#F8FAFC', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  roomPlaceholderIcon: { fontSize: 20 },
  roomPlaceholderText: { fontSize: 12, color: '#94A3B8' },
  roomAmenityRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  roomAmenityTag:      { fontSize: 12, color: '#334155', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  roomAmenityMore:     { fontSize: 12, color: '#94A3B8', alignSelf: 'center' },
  roomCardCta:         { backgroundColor: '#1565C0', borderRadius: 10, padding: 12, alignItems: 'center' },
  roomCardCtaText:     { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyStateBox:       { borderRadius: 12, padding: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
});