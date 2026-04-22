/**
 * ============================================================================
 * ACHAQUI — CORE  (v2.10.0)
 * ============================================================================
 * Responsabilidades:
 *   - Sistema de Ícones SVG (IconSystem)
 *   - Paleta de Cores global (COLORS)
 *   - Constantes de configuração (categorias, filtros, módulos)
 *   - Mock data que simulam contratos NestJS (businesses, owner)
 *   - Utilitários partilhados (formatCurrency, formatDate, renderStars)
 *   - AppShell: SafeAreaProvider + StatusBar + NavigationBar + Header de busca
 *   - AppContext: estado de autenticação e alternância Modo Cliente / Modo Dono
 *
 * CONTRATOS DE API (prontos para NestJS):
 *   GET /businesses          › MOCK_BUSINESSES_INITIAL[]
 *   GET /businesses/:id      › Business
 *   GET /auth/me             › { user, ownerBusiness? }
 *   POST /auth/switch-mode   › { isBusinessMode: bool }
 *
 * PROPS QUE EXPÕE (via AppContext):
 *   - businesses, setBusinesses
 *   - isLoggedIn, isBusinessMode, toggleBusinessMode
 *   - activeNavTab, setActiveNavTab
 *   - darkMode, toggleDarkMode
 *   - bookmarkedIds, toggleBookmark
 *   - notifications, markNotificationRead, clearAllNotifications
 *   - searchWhat, setSearchWhat, searchWhere, setSearchWhere
 *   - locationPermission
 *   - updateOwnerBiz (helper que sincroniza o negócio do dono em businesses[])
 *
 * FASE 2+: Para ligar ao backend, substituir MOCK_BUSINESSES_INITIAL
 *          por uma chamada TanStack Query: useQuery(['businesses'], fetchBusinesses)
 * ============================================================================
 */

import React, { useState, useContext, createContext, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Platform, UIManager, Dimensions, TextInput, Keyboard,
  Alert, Modal,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android LayoutAnimation enabler (mantido mas não usado no filtro — v2.9.32 fix)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// ICON SYSTEM (SVG inline via react-native-svg)
// Copiado aqui para independência total deste ficheiro.
// Outros módulos importam { Icon } de AchAqui_Core.
// ─────────────────────────────────────────────────────────────────────────────
let Svg, Path, Circle, Line, Polyline, Polygon, Rect, G;
try {
  const rnsvg = require('react-native-svg');
  Svg = rnsvg.Svg; Path = rnsvg.Path; Circle = rnsvg.Circle;
  Line = rnsvg.Line; Polyline = rnsvg.Polyline; Polygon = rnsvg.Polygon;
  Rect = rnsvg.Rect; G = rnsvg.G;
} catch (_) { /* fallback para texto */ }

export function Icon({ name, size = 20, color = '#1F1F1F', strokeWidth = 1.5 }) {
  if (!Svg) {
    const FALLBACK = {
      search:'⌕', location:'◎', filter:'⊟', sort:'≡', map:'◈', star:'★',
      bookmark:'♡', bookmarkFilled:'♥', share:'↗', back:'‹', close:'×',
      check:'✓', plus:'+', minus:'−', phone:'☎', web:'↗', directions:'›',
      clock:'○', payment:'$', wifi:'◉', parking:'P', delivery:'⚡',
      wheelchair:'♿', outdoor:'◐', reservation:'◷', camera:'⊙', like:'▲',
      moon:'◑', sun:'○', bell:'◔', analytics:'▦', crown:'♛', verified:'✓',
      tag:'⊛', fire:'▲', user:'○', checkin:'◉', save:'◈', certified:'✓',
      professional:'▪', warning:'△', arrow:'›', chevronDown:'∨',
      chevronRight:'›', info:'ⓘ', heart:'♡', heartFilled:'♥', edit:'✎',
      trash:'⊠', x:'×', briefcase:'▪', settings:'⚙', hotel:'⌂',
    };
    return <Text style={{ fontSize: size * 0.8, color, lineHeight: size }}>{FALLBACK[name] || '○'}</Text>;
  }
  const s = size, sw = strokeWidth, c = color;
  const base = { stroke: c, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const icons = {
    search:     <G {...base}><Circle cx="11" cy="11" r="8"/><Line x1="21" y1="21" x2="16.65" y2="16.65"/></G>,
    location:   <G {...base}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><Circle cx="12" cy="10" r="3"/></G>,
    filter:     <G {...base}><Polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></G>,
    sort:       <G {...base}><Line x1="3" y1="6" x2="21" y2="6"/><Line x1="3" y1="12" x2="15" y2="12"/><Line x1="3" y1="18" x2="9" y2="18"/></G>,
    map:        <G {...base}><Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><Line x1="8" y1="2" x2="8" y2="18"/><Line x1="16" y1="6" x2="16" y2="22"/></G>,
    star:       <G {...base}><Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={c}/></G>,
    starEmpty:  <G {...base}><Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></G>,
    diamond4:   <G {...base}><Path d="M12 2 L16 12 L12 22 L8 12 Z" fill={c}/><Path d="M2 12 L12 8 L22 12 L12 16 Z" fill={c}/></G>,
    bookmark:   <G {...base}><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></G>,
    bookmarkFilled: <G {...base}><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={c}/></G>,
    share:      <G {...base}><Circle cx="18" cy="5" r="3"/><Circle cx="6" cy="12" r="3"/><Circle cx="18" cy="19" r="3"/><Line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><Line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></G>,
    back:       <G {...base}><Polyline points="15 18 9 12 15 6"/></G>,
    close:      <G {...base}><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></G>,
    x:          <G {...base}><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></G>,
    check:      <G {...base}><Polyline points="20 6 9 17 4 12"/></G>,
    checkCircle:<G {...base}><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Polyline points="22 4 12 14.01 9 11.01"/></G>,
    phone:      <G {...base}><Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></G>,
    web:        <G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="2" y1="12" x2="22" y2="12"/><Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></G>,
    clock:      <G {...base}><Circle cx="12" cy="12" r="10"/><Polyline points="12 6 12 12 16 14"/></G>,
    payment:    <G {...base}><Rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><Line x1="1" y1="10" x2="23" y2="10"/></G>,
    wifi:       <G {...base}><Path d="M5 12.55a11 11 0 0 1 14.08 0"/><Path d="M1.42 9a16 16 0 0 1 21.16 0"/><Path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><Line x1="12" y1="20" x2="12.01" y2="20"/></G>,
    parking:    <G {...base}><Rect x="3" y="3" width="18" height="18" rx="2"/><Path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></G>,
    delivery:   <G {...base}><Rect x="1" y="3" width="15" height="13"/><Polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><Circle cx="5.5" cy="18.5" r="2.5"/><Circle cx="18.5" cy="18.5" r="2.5"/></G>,
    outdoor:    <G {...base}><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><Polyline points="9 22 9 12 15 12 15 22"/></G>,
    reservation:<G {...base}><Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><Line x1="16" y1="2" x2="16" y2="6"/><Line x1="8" y1="2" x2="8" y2="6"/><Line x1="3" y1="10" x2="21" y2="10"/></G>,
    calendar:   <G {...base}><Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><Line x1="16" y1="2" x2="16" y2="6"/><Line x1="8" y1="2" x2="8" y2="6"/><Line x1="3" y1="10" x2="21" y2="10"/></G>,
    camera:     <G {...base}><Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><Circle cx="12" cy="13" r="4"/></G>,
    like:       <G {...base}><Path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></G>,
    moon:       <G {...base}><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></G>,
    sun:        <G {...base}><Circle cx="12" cy="12" r="5"/><Line x1="12" y1="1" x2="12" y2="3"/><Line x1="12" y1="21" x2="12" y2="23"/><Line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><Line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><Line x1="1" y1="12" x2="3" y2="12"/><Line x1="21" y1="12" x2="23" y2="12"/></G>,
    bell:       <G {...base}><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><Path d="M13.73 21a2 2 0 0 1-3.46 0"/></G>,
    analytics:  <G {...base}><Line x1="18" y1="20" x2="18" y2="10"/><Line x1="12" y1="20" x2="12" y2="4"/><Line x1="6" y1="20" x2="6" y2="14"/></G>,
    verified:   <G {...base}><Polyline points="20 6 9 17 4 12"/></G>,
    tag:        <G {...base}><Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><Line x1="7" y1="7" x2="7.01" y2="7"/></G>,
    fire:       <G {...base}><Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></G>,
    user:       <G {...base}><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><Circle cx="12" cy="7" r="4"/></G>,
    users:      <G {...base}><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><Circle cx="9" cy="7" r="4"/><Path d="M23 21v-2a4 4 0 0 0-3-3.87"/><Path d="M16 3.13a4 4 0 0 1 0 7.75"/></G>,
    heart:      <G {...base}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></G>,
    heartFilled:<G {...base}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={c}/></G>,
    info:       <G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="12" y1="16" x2="12" y2="12"/><Line x1="12" y1="8" x2="12.01" y2="8"/></G>,
    edit:       <G {...base}><Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></G>,
    trash:      <G {...base}><Polyline points="3 6 5 6 21 6"/><Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><Path d="M10 11v6"/><Path d="M14 11v6"/><Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></G>,
    plus:       <G {...base}><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></G>,
    minus:      <G {...base}><Line x1="5" y1="12" x2="19" y2="12"/></G>,
    chevronDown:<G {...base}><Polyline points="6 9 12 15 18 9"/></G>,
    chevronRight:<G {...base}><Polyline points="9 18 15 12 9 6"/></G>,
    arrow:      <G {...base}><Line x1="5" y1="12" x2="19" y2="12"/><Polyline points="12 5 19 12 12 19"/></G>,
    arrowRight: <G {...base}><Line x1="5" y1="12" x2="19" y2="12"/><Polyline points="12 5 19 12 12 19"/></G>,
    hotel:      <G {...base}><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><Path d="M9 22V12h6v10"/></G>,
    briefcase:  <G {...base}><Rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></G>,
    settings:   <G {...base}><Circle cx="12" cy="12" r="3"/><Path d="M12 1v6m0 6v6m5.196-13.196l-4.243 4.243m-2.828 2.828l-4.243 4.243"/></G>,
    award:      <G {...base}><Circle cx="12" cy="8" r="7"/><Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></G>,
    globe:      <G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="2" y1="12" x2="22" y2="12"/><Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></G>,
    eye:        <G {...base}><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><Circle cx="12" cy="12" r="3"/></G>,
    mapPin:     <G {...base}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><Circle cx="12" cy="10" r="3"/></G>,
    certified:  <G {...base}><Circle cx="12" cy="8" r="6"/><Path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></G>,
    portfolio:  <G {...base}><Rect x="3" y="3" width="18" height="18" rx="2"/><Line x1="3" y1="9" x2="21" y2="9"/><Line x1="9" y1="21" x2="9" y2="9"/></G>,
    professional:<G {...base}><Rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></G>,
    crown:      <G {...base}><Polyline points="2 4 12 14 22 4"/><Polyline points="2 4 2 20 22 20 22 4"/></G>,
    live:       <G {...base}><Circle cx="12" cy="12" r="10"/><Circle cx="12" cy="12" r="3" fill={c}/></G>,
    plusSquare: <G {...base}><Rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><Line x1="12" y1="8" x2="12" y2="16"/><Line x1="8" y1="12" x2="16" y2="12"/></G>,
    plusCircle: <G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="12" y1="8" x2="12" y2="16"/><Line x1="8" y1="12" x2="16" y2="12"/></G>,
    save:       <G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="12" y1="8" x2="12" y2="16"/><Line x1="8" y1="12" x2="16" y2="12"/></G>,
    alertCircle:<G {...base}><Circle cx="12" cy="12" r="10"/><Line x1="12" y1="8" x2="12" y2="12"/><Line x1="12" y1="16" x2="12.01" y2="16"/></G>,
    messageSquare:<G {...base}><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></G>,
    fastdelivery:<G {...base}><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></G>,
    online:     <G {...base}><Circle cx="12" cy="12" r="2"/><Path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></G>,
    appointment:<G {...base}><Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><Line x1="16" y1="2" x2="16" y2="6"/><Line x1="8" y1="2" x2="8" y2="6"/><Line x1="3" y1="10" x2="21" y2="10"/><Polyline points="12 14 12 18 15 18"/></G>,
    remote:     <G {...base}><Rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><Line x1="8" y1="21" x2="16" y2="21"/><Line x1="12" y1="17" x2="12" y2="21"/></G>,
    wheelchair: <G {...base}><Circle cx="12" cy="4" r="2"/><Path d="M14 12H9l-1-4H6"/><Path d="M9 12v6"/><Path d="M14 18H9"/><Circle cx="17" cy="19" r="3"/></G>,
    helpCircle: <G {...base}><Circle cx="12" cy="12" r="10"/><Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><Line x1="12" y1="17" x2="12.01" y2="17"/></G>,
    folder:     <G {...base}><Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></G>,
    open:       <G {...base}><Polyline points="22 11.08 22 12 12 22 2 12 2 11.08"/><Polyline points="22 2 12 12 2 2"/></G>,
    sparkles:   <G {...base}><Path d="M12 3v3m0 12v3m9-9h-3m-12 0H3"/><Circle cx="12" cy="12" r="2" fill={c}/></G>,
    whatsapp:   <G {...base}><Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></G>,
    directions: <G {...base}><Polygon points="3 11 22 2 13 21 11 13 3 11"/></G>,
  };
  const paths = icons[name];
  if (!paths) return <Text style={{ fontSize: size * 0.8, color }}>{name?.[0]?.toUpperCase() || '?'}</Text>;
  return <Svg width={s} height={s} viewBox="0 0 24 24">{paths}</Svg>;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORS — fonte única de verdade para toda a UI
// ─────────────────────────────────────────────────────────────────────────────
export const COLORS = {
  red:        '#D32323',
  redLight:   '#FFF0F0',
  white:      '#FFFFFF',
  grayBg:     '#F7F7F8',
  grayLine:   '#EBEBEB',
  grayText:   '#8A8A8A',
  darkText:   '#111111',
  green:      '#22A06B',
  blue:       '#1565C0',
  heroOverlay:'rgba(0,0,0,0.40)',
  mapBg:      '#ECEFF3',
  cardShadow: '#00000012',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS PARTILHADOS
// Cada módulo pode importar estes helpers directamente daqui.
// ─────────────────────────────────────────────────────────────────────────────

/** Formata valores monetários no padrão angolano: 12.500 Kz */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  return `${Number(value).toLocaleString('pt-AO')} Kz`;
};

/** Formata dd/mm/yyyy › "15 de Março" */
export const formatDateLabel = (ddmmyyyy) => {
  if (!ddmmyyyy) return '';
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [dd, mm] = ddmmyyyy.split('/');
  return `${parseInt(dd)} de ${months[parseInt(mm) - 1] || ''}`;
};

/** Renderiza estrelas de rating (preenchidas/vazias) */
export const renderStars = (rating, size = 14) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text key={i} style={{ fontSize: size, color: i <= rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
};

/** Detecta se um negócio é do tipo alojamento */
export const isAccommodationBusiness = (b) =>
  b.businessType === 'accommodation' ||
  b.category === 'accommodation' ||
  (b.roomTypes && b.roomTypes.length > 0) ||
  /hotel|hostel|pensão|pousada|alojamento|resort/i.test(`${b.category} ${b.subcategory} ${b.name}`);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE CONFIGURAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurantes', icon: 'fire'        },
  { id: 'delivery',    label: 'Delivery',     icon: 'delivery'    },
  { id: 'hotels',      label: 'Hotéis',       icon: 'hotel'       },
  { id: 'shopping',    label: 'Compras',      icon: 'payment'     },
  { id: 'bank',        label: 'Banco',        icon: 'payment'     },
  { id: 'atm',         label: 'ATM',          icon: 'payment'     },
  { id: 'health',      label: 'Saúde',        icon: 'certified'   },
  { id: 'services',    label: 'Serviços',     icon: 'professional'},
  { id: 'more',        label: 'Mais',         icon: 'chevronRight'},
];

export const ALL_CATEGORIES = [
  { section: 'Popular', items: [
    { id: 'bank',       label: 'Banco',             icon: 'payment'      },
    { id: 'atm',        label: 'ATM',               icon: 'payment'      },
    { id: 'accountants', label: 'Contabilistas',     icon: 'payment'      },
    { id: 'handyman',    label: 'Faz-tudo',          icon: 'professional' },
    { id: 'electricians',label: 'Eletricistas',      icon: 'certified'    },
  ]},
  { section: 'Lanches e bebidas', items: [
    { id: 'coffee',    label: 'Café e chá',          icon: 'fire'         },
    { id: 'bars',      label: 'Bares',               icon: 'fire'         },
    { id: 'icecream',  label: 'Doçaria',             icon: 'fire'         },
  ]},
  { section: 'Spas e salões de beleza', items: [
    { id: 'beautysalons', label: 'Salões de beleza', icon: 'certified'    },
    { id: 'massage',      label: 'Massagistas',      icon: 'certified'    },
    { id: 'spas',         label: 'Spas',             icon: 'certified'    },
  ]},
  { section: 'Serviços de automóveis', items: [
    { id: 'carwash',     label: 'Lavagem automóvel', icon: 'delivery'     },
    { id: 'mechanics',   label: 'Mecânicos',         icon: 'professional' },
    { id: 'gasstations', label: 'Postos de gasolina',icon: 'location'     },
  ]},
  { section: 'Serviços de limpeza', items: [
    { id: 'laundry',      label: 'Lavandaria',       icon: 'briefcase'    },
    { id: 'dryclean',     label: 'Limpeza a seco',   icon: 'briefcase'    },
    { id: 'housecleaning',label: 'Limpeza doméstica',icon: 'professional' },
  ]},
  { section: 'Todas as categorias', items: [
    { id: 'restaurants',   label: 'Restaurantes',          icon: 'fire'         },
    { id: 'nightlife',     label: 'Vida noturna',          icon: 'moon'         },
    { id: 'shopping',      label: 'Compras',               icon: 'payment'      },
    { id: 'food',          label: 'Comida',                icon: 'fire'         },
    { id: 'health',        label: 'Saúde & Medicina',      icon: 'certified'    },
    { id: 'beauty',        label: 'Beleza & Spas',         icon: 'certified'    },
    { id: 'homeservices',  label: 'Serviços residenciais', icon: 'professional' },
    { id: 'localservices', label: 'Serviços Locais',       icon: 'professional' },
    { id: 'eventplanning', label: 'Planeamento de Eventos',icon: 'reservation'  },
    { id: 'arts',          label: 'Artes & Entretenimento',icon: 'star'         },
    { id: 'active',        label: 'Vida Ativa',            icon: 'outdoor'      },
    { id: 'professional',  label: 'Serviços Profissionais',icon: 'professional' },
    { id: 'automotive',    label: 'Veículos',              icon: 'delivery'     },
    { id: 'hotelsTravel',  label: 'Hotéis & Viagem',       icon: 'hotel'        },
    { id: 'education',     label: 'Educação',              icon: 'certified'    },
    { id: 'pets',          label: 'Animais de Estimação',  icon: 'heart'        },
    { id: 'financial',     label: 'Serviços Financeiros',  icon: 'payment'      },
    { id: 'bank',          label: 'Banco',                 icon: 'payment'      },
    { id: 'atm',           label: 'ATM',                   icon: 'payment'      },
    { id: 'localflavor',   label: 'Tesouros Locais',       icon: 'star'         },
    { id: 'public',        label: 'Serviços Públicos',     icon: 'info'         },
    { id: 'massmedia',     label: 'Meios de Comunicação',  icon: 'web'          },
    { id: 'religious',     label: 'Organizações Religiosas',icon: 'info'        },
  ]},
];

// Lookups O(1) calculados uma vez no arranque (sem flatMap no render)
export const ALL_CAT_IDS   = new Set(ALL_CATEGORIES.flatMap(s => s.items.map(i => i.id)));
export const ALL_CAT_LABEL = Object.fromEntries(ALL_CATEGORIES.flatMap(s => s.items.map(i => [i.id, i.label])));
export const ALL_CAT_ICON  = Object.fromEntries(ALL_CATEGORIES.flatMap(s => s.items.map(i => [i.id, i.icon])));

/** Map: chipId › businessType[] do dono */
export const CATEGORY_TO_BUSINESS_TYPES = {
  restaurants: ['food'],      delivery: ['food','retail','logistics'],
  hotels: ['accommodation'],  shopping: ['retail'],
  health: ['health','beauty'],services: ['professional','service','education','freelancer','tech','finance','automotive','logistics'],
  coffee: ['food'], bars: ['food','entertainment'], icecream: ['food'],
  beautysalons: ['beauty'], massage: ['beauty','health'], spas: ['beauty','health'],
  carwash: ['automotive','service'], mechanics: ['automotive','service'], gasstations: ['automotive'],
  laundry: ['service'], dryclean: ['service'], housecleaning: ['service'],
  nightlife: ['food','entertainment'], food: ['food'], beauty: ['beauty'],
  homeservices: ['service'], localservices: ['service'], eventplanning: ['service','entertainment'],
  arts: ['entertainment'], active: ['sports','health'], professional: ['professional','service'],
  automotive: ['automotive'], hotelsTravel: ['accommodation'], education: ['education'],
  pets: ['service'], financial: ['finance'], bank: ['finance'], atm: ['finance'], localflavor: ['food','entertainment'],
  public: ['service'], massmedia: ['tech'], religious: ['service'],
  accountants: ['professional','finance'], handyman: ['service'], electricians: ['service'],
};

export const BUSINESS_TYPE_BADGES = {
  food:          { icon: '🍴', label: 'Alimentação',    color: '#EA580C' },
  retail:        { icon: '🛍️', label: 'Comércio',       color: '#D97706' },
  health:        { icon: '🏥', label: 'Saúde',          color: '#10B981' },
  beauty:        { icon: '💅', label: 'Beleza',         color: '#EC4899' },
  professional:  { icon: '👔', label: 'Profissional',   color: '#059669' },
  service:       { icon: '⚙️', label: 'Serviço',        color: '#3B82F6' },
  education:     { icon: '🎓', label: 'Educação',       color: '#DC2626' },
  freelancer:    { icon: '💼', label: 'Freelancer',     color: '#8B5CF6' },
  accommodation: { icon: '🏨', label: 'Alojamento',     color: '#0EA5E9' },
  entertainment: { icon: '🎭', label: 'Entretenimento', color: '#7C3AED' },
  sports:        { icon: '⚽', label: 'Desporto',       color: '#16A34A' },
  automotive:    { icon: '🚗', label: 'Automóvel',      color: '#6B7280' },
  tech:          { icon: '💻', label: 'Tecnologia',     color: '#2563EB' },
  finance:       { icon: '💰', label: 'Finanças',       color: '#B45309' },
  logistics:     { icon: '🚚', label: 'Logística',      color: '#78716C' },
  other:         { icon: '🏢', label: 'Outro',          color: '#6B7280' },
};

export const PRICE_FILTERS = [
  { id: 'budget', label: '· Económico', levels: [1] },
  { id: 'mid',    label: '·· Moderado', levels: [2] },
  { id: 'upscale',label: '··· Caro',    levels: [3] },
  { id: 'luxury', label: '···· Luxo',   levels: [4] },
];

export const DISTANCE_FILTERS = [
  { id: 'near',   label: '< 1 km',  max: 1   },
  { id: 'medium', label: '< 5 km',  max: 5   },
  { id: 'far',    label: '< 15 km', max: 15  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — Simula contratos NestJS
// FASE 2+: Substituir por TanStack Query (useQuery / useMutation)
//
// Contrato esperado de GET /businesses:
// {
//   id: string, name: string, category: string, businessType: BusinessType,
//   primaryCategoryId: string, subCategoryIds: string[],
//   rating: number, reviews: number, isOpen: boolean, isPublic: boolean,
//   priceLevel: number, distance: number, isPremium: boolean,
//   modules: Record<ModuleKey, boolean>,
//   latitude?: number, longitude?: number,
//   photos?: string[], amenities?: string[],
// }
// ─────────────────────────────────────────────────────────────────────────────
export const OWNER_BUSINESS = {
  id: '5d5f1a56-0b74-4e40-b4d7-fdb2c438efaa',
  name: 'AchAqui Real',
  category: 'Restaurante Italiano',
  businessType: 'accommodation',
  primaryCategoryId: 'hotelsTravel',
  subCategoryIds: ['hotelsTravel', 'restaurants', 'localflavor'],
  verified: true,
  referralCode: 'PIZZA20',
  amenities: ['wifi', 'parking', 'delivery', 'outdoor', 'wheelchair'],
  icalLink: '',
  modules: {
    gastronomy: true, accommodation: true, retail: true,
    health: false, education: false, professional: false,
    logistics: false, customorder: true, delivery: true,
  },
  // Comissão AchAqui (configurável por negócio — calculada no backend)
  // NUNCA usar no cliente para cálculos de split. Apenas informativo.
  commissionRate: 0.10,
  address: 'Rua Comandante Valodia, 123, Talatona',
  neighborhood: 'Talatona, Luanda',
  phone: '+244 923 456 789',
  hours: 'Seg-Dom: 11:00 - 23:00',
  isOpen: true,
  icon: '🍕',
  latitude: -8.8388,
  longitude: 13.2894,
  recentReviews: [
    { id: 'rev1', author: 'Ana M.', rating: 5, comment: 'Excelente!', date: '12 Fev 2026' },
  ],
  roomTypes: [
    {
      id: '1', name: 'Quarto Standard', description: 'Cama de casal, WC privado',
      pricePerNight: 12000, maxGuests: 2, amenities: ['wifi', 'ac'], totalRooms: 5,
      minNights: 1, taxRate: 14, weekendMultiplier: 1.2,
      // CONTRATO: availability_nights no NestJS
      // { date_start: string, date_end: string, room_id: string, count: number }
      seasonalRates: [
        { id: 's1', label: 'Época Alta', from: '2026-06-01', to: '2026-08-31', pricePerNight: 18000 },
      ],
      bookedRanges: [],
      available: true,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// APP CONTEXT — Estado global partilhado entre Core, Engine e futuros módulos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AppContext expõe APENAS o estado verdadeiramente global:
 * - Auth/Mode (isLoggedIn, isBusinessMode)
 * - Dados base (businesses[])
 * - Navegação (activeNavTab)
 * - Preferências UI (darkMode)
 * - Bookmarks (persistidos em AsyncStorage)
 * - Notificações do cliente
 * - Pesquisa global (searchWhat, searchWhere)
 *
 * Estado específico de módulos (reservas, room editor, etc.) NÃO entra aqui.
 * Fica em cada módulo isolado.
 */
export const AppContext = createContext(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};

export function AppProvider({ children, initialBusinesses }) {
  // ── Auth / Mode ────────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn]       = useState(true);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [locationPermission, setLocationPermission] = useState('denied');

  // ── Dados base ────────────────────────────────────────────────────────────
  // FASE 2+: substituir por useQuery(['businesses'], fetchBusinesses)
  const [businesses, setBusinesses] = useState(initialBusinesses || []);

  /**
   * updateOwnerBiz — sincroniza campos do negócio do dono em businesses[]
   * FASE 2+: substituir por useMutation + invalidate query
   * @param {Partial<Business>} fields
   */
  const updateOwnerBiz = useCallback((fields) => {
    setBusinesses(prev => prev.map(b =>
      b.id === OWNER_BUSINESS.id ? { ...b, ...fields } : b
    ));
  }, []);

  // ── Navegação ─────────────────────────────────────────────────────────────
  const [activeNavTab, setActiveNavTab] = useState('home');
  const [activeBusinessTab, setActiveBusinessTab] = useState('dashboard');

  // ── UI Global ─────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(d => !d);

  // ── Pesquisa ──────────────────────────────────────────────────────────────
  const [searchWhat, setSearchWhat]   = useState('');
  const [searchWhere, setSearchWhere] = useState('Talatona, Luanda');

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('bookmarks')
      .then(s => s && setBookmarkedIds(JSON.parse(s)))
      .catch(() => {});
  }, []);

  const toggleBookmark = useCallback(async (id) => {
    setBookmarkedIds(prev => {
      const updated = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      AsyncStorage.setItem('bookmarks', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // ── Notificações cliente ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Nova oferta!',        message: 'Pizzaria Bela Vista: 20% OFF',       time: '5 min atrás', read: false },
    { id: 'n2', title: 'Reserva confirmada',  message: 'Personal Trainer amanhã às 10h',    time: '1h atrás',    read: false },
  ]);
  const markNotificationRead  = useCallback((id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const clearAllNotifications = useCallback(() => setNotifications([]), []);

  // ── Toggle modo dono ──────────────────────────────────────────────────────
  const toggleBusinessMode = useCallback(() => {
    setIsBusinessMode(prev => {
      const next = !prev;
      setActiveNavTab(next ? 'dashboard' : 'home');
      return next;
    });
  }, []);

  const requestLocationPermission = useCallback(() => {
    Alert.alert('Permitir Localização', 'AchAqui precisa da sua localização para mostrar negócios perto de si.', [
      { text: 'Não Permitir', onPress: () => setLocationPermission('denied') },
      { text: 'Permitir',     onPress: () => setLocationPermission('granted') },
    ]);
  }, []);

  const value = {
    // Auth
    isLoggedIn, setIsLoggedIn,
    isBusinessMode, toggleBusinessMode,
    locationPermission, requestLocationPermission,
    // Data
    businesses, setBusinesses, updateOwnerBiz,
    // Navigation
    activeNavTab, setActiveNavTab,
    activeBusinessTab, setActiveBusinessTab,
    // UI
    darkMode, toggleDarkMode,
    // Search
    searchWhat, setSearchWhat,
    searchWhere, setSearchWhere,
    // Bookmarks
    bookmarkedIds, toggleBookmark,
    // Notifications
    notifications, markNotificationRead, clearAllNotifications,
    // Shared constants (evita re-importar em cada módulo)
    COLORS, SCREEN_WIDTH,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION BAR — bottom tabs cliente e dono
// Props recebidas do AppContext via useAppContext()
// ─────────────────────────────────────────────────────────────────────────────
export function NavigationBar({ onTabPress, scrollRef }) {
  const { activeNavTab, setActiveNavTab, isBusinessMode, notifications } = useAppContext();
  const insets    = useSafeAreaInsets();
  const lastTap   = useRef(0);
  const DTAP_MS   = 300;

  const clientTabs = [
    { id: 'home',     icon: 'outdoor',   label: 'Início'    },
    { id: 'search',   icon: 'search',    label: 'Pesquisar' },
    { id: 'featured', icon: 'diamond4',  label: 'Destaque'  },
    { id: 'profile',  icon: 'user',      label: 'Perfil'    },
  ];
  const ownerTabs = [
    { id: 'dashboard',    icon: 'analytics', label: 'Dashboard'   },
    { id: 'notifications',icon: 'bell',      label: 'Notificações' },
    { id: 'mybusiness',   icon: 'briefcase', label: 'Meu Negócio' },
    { id: 'exitbusiness', icon: 'x',         label: 'Sair'        },
  ];
  const tabs = isBusinessMode ? ownerTabs : clientTabs;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[navStyles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map(tab => {
        const active = activeNavTab === tab.id;
        const showBadge = tab.id === 'profile' && unreadCount > 0 && !isBusinessMode;
        return (
          <TouchableOpacity
            key={tab.id}
            style={navStyles.tab}
            activeOpacity={0.7}
            onPress={() => {
              const now = Date.now();
              if (activeNavTab === tab.id && now - lastTap.current < DTAP_MS) {
                scrollRef?.current?.scrollTo({ y: 0, animated: true });
                lastTap.current = 0;
                return;
              }
              lastTap.current = now;
              onTabPress?.(tab.id);
              setActiveNavTab(tab.id);
            }}
          >
            <View style={{ position: 'relative' }}>
              <Icon name={tab.icon} size={22} color={active ? COLORS.red : COLORS.grayText} strokeWidth={active ? 2.5 : 1.5} />
              {showBadge && (
                <View style={navStyles.badge}>
                  <Text style={navStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[navStyles.tabLabel, active && navStyles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
  bar:          { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.grayLine },
  tab:          { flex: 1, alignItems: 'center', paddingTop: 10, gap: 4 },
  tabLabel:     { fontSize: 10, color: COLORS.grayText, fontWeight: '500' },
  tabLabelActive:{ color: COLORS.red, fontWeight: '700' },
  badge:        { position: 'absolute', top: -4, right: -6, backgroundColor: COLORS.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeText:    { fontSize: 9, color: COLORS.white, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HEADER — barra de pesquisa global com localização
// ─────────────────────────────────────────────────────────────────────────────
export function SearchHeader({ onMenuPress, onNotifPress, onModeToggle }) {
  const { searchWhat, setSearchWhat, searchWhere, isBusinessMode, notifications, darkMode } = useAppContext();
  const insets     = useSafeAreaInsets();
  const unread     = notifications.filter(n => !n.read).length;

  return (
    <View style={[headerStyles.wrapper, { paddingTop: insets.top + 8 }]}>
      {/* Top row: logo + actions */}
      <View style={headerStyles.topRow}>
        <View style={headerStyles.logoWrap}>
          <Text style={headerStyles.logo}>AchAqui</Text>
          <Text style={headerStyles.version}>v2.10.0</Text>
        </View>
        <View style={headerStyles.actions}>
          <TouchableOpacity style={headerStyles.actionBtn} onPress={onModeToggle}>
            <Icon name={isBusinessMode ? 'user' : 'briefcase'} size={20} color={isBusinessMode ? COLORS.red : COLORS.darkText} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={headerStyles.actionBtn} onPress={onNotifPress}>
            <View style={{ position: 'relative' }}>
              <Icon name="bell" size={20} color={COLORS.darkText} strokeWidth={2} />
              {unread > 0 && (
                <View style={headerStyles.notifBadge}>
                  <Text style={headerStyles.notifBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={headerStyles.actionBtn} onPress={onMenuPress}>
            <Icon name="analytics" size={20} color={COLORS.darkText} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search fields */}
      <View style={headerStyles.searchRow}>
        <View style={headerStyles.searchField}>
          <Text style={headerStyles.searchLabel}>O QUE</Text>
          <TextInput
            style={headerStyles.searchInput}
            value={searchWhat}
            onChangeText={setSearchWhat}
            placeholder="restaurantes, farmacias, cafes"
            placeholderTextColor={COLORS.grayText}
            returnKeyType="search"
          />
        </View>
        <View style={headerStyles.searchDivider} />
        <View style={[headerStyles.searchField, { flex: 0.85 }]}>
          <Text style={headerStyles.searchLabel}>ONDE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TextInput
              style={[headerStyles.searchInput, { flex: 1 }]}
              value={searchWhere}
              onChangeText={() => {}}
              placeholder="Talatona, Luanda"
              placeholderTextColor={COLORS.grayText}
              editable={false}
            />
            <Icon name="location" size={16} color={COLORS.grayText} strokeWidth={2} />
          </View>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrapper:       { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLine },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  logoWrap:      { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  logo:          { fontSize: 22, fontWeight: '800', color: COLORS.red, letterSpacing: -0.5 },
  version:       { fontSize: 11, color: COLORS.grayText, fontWeight: '500' },
  actions:       { flexDirection: 'row', gap: 4 },
  actionBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayBg, alignItems: 'center', justifyContent: 'center' },
  notifBadge:    { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  notifBadgeText:{ fontSize: 9, color: COLORS.white, fontWeight: '800' },
  searchRow:     { flexDirection: 'row', backgroundColor: COLORS.grayBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.grayLine, overflow: 'hidden' },
  searchField:   { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchLabel:   { fontSize: 9, fontWeight: '700', color: COLORS.grayText, letterSpacing: 0.8, marginBottom: 2 },
  searchInput:   { fontSize: 13, color: COLORS.darkText, padding: 0 },
  searchDivider: { width: 1, backgroundColor: COLORS.grayLine, marginVertical: 8 },
});

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL — wrapper raiz que fornece SafeAreaProvider + AppContext
// Usado em AchAqui_Main.jsx como <AppShell businesses={data}>{children}</AppShell>
// ─────────────────────────────────────────────────────────────────────────────
export function AppShell({ children, businesses }) {
  return (
    <SafeAreaProvider>
      <AppProvider initialBusinesses={businesses}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        {children}
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default AppShell;
