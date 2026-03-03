/**
 * ============================================================================
 * useMetaAnimation  (v1.0.0 — Fase 3.5)
 * ============================================================================
 * Encapsula toda a lógica de animação "Meta pattern":
 *   • swipeProgress  — anima a home enquanto o BusinessDetailModal desliza
 *   • appLayerProgress — anima a home enquanto uma AppLayer está activa
 *   • homeAnimatedStyle — estilo completo pronto para <Animated.View>
 *   • appLayerX / appLayerPan — controlo das App Layers (allCategories, notifications…)
 *
 * Devolve:
 *   swipeProgress       — Animated.Value (partilhado com BusinessDetailModal)
 *   appLayerX           — Animated.Value (posição horizontal da layer)
 *   appLayerProgress    — Animated.Value (progresso 0→1 da layer)
 *   appLayerPan         — PanResponder handlers para swipe-right-to-close
 *   activeAppLayer      — string | null
 *   openAppLayer(name)  — abre uma layer com animação
 *   closeAppLayer()     — fecha com animação
 *   homeAnimatedStyle   — { transform, opacity, borderRadius, overflow }
 *                         pronto para passar a <Animated.View>
 * ============================================================================
 */

import { useState, useRef, useCallback } from 'react';
import { Animated, PanResponder, Platform, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * @param {{ showDetail: boolean }} options
 *   showDetail — se o BusinessDetailModal está visível (controla qual animação aplicar)
 */
export function useMetaAnimation({ showDetail }) {
  // ── Valores animados ────────────────────────────────────────────────────────
  const swipeProgress    = useRef(new Animated.Value(0)).current;
  const appLayerX        = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const appLayerProgress = useRef(new Animated.Value(0)).current;

  // ── App layer state ─────────────────────────────────────────────────────────
  const [activeAppLayer, setActiveAppLayer] = useState(null);

  // ── Open / Close ────────────────────────────────────────────────────────────
  const openAppLayer = useCallback((layerName) => {
    appLayerX.setValue(SCREEN_WIDTH);
    appLayerProgress.setValue(0);
    setActiveAppLayer(layerName);
    Animated.parallel([
      Animated.timing(appLayerX,        { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(appLayerProgress, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [appLayerX, appLayerProgress]);

  const closeAppLayer = useCallback(() => {
    Animated.parallel([
      Animated.timing(appLayerX,        { toValue: SCREEN_WIDTH, duration: 280, useNativeDriver: true }),
      Animated.timing(appLayerProgress, { toValue: 0,            duration: 280, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      appLayerProgress.setValue(0);
      requestAnimationFrame(() => setActiveAppLayer(null));
    });
  }, [appLayerX, appLayerProgress]);

  // ── PanResponder (swipe-right para fechar layer) ────────────────────────────
  const appLayerPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        const touchX = evt.nativeEvent.pageX - dx;
        if (touchX > SCREEN_WIDTH / 2) return false;
        if (Math.abs(dx) < (Platform.OS === 'android' ? 6 : 3)) return false;
        if (Math.abs(dx) < Math.abs(dy) * 1.5) return false;
        return dx > 0;
      },
      onPanResponderGrant: () => { appLayerX.stopAnimation(); },
      onPanResponderMove: (_, { dx }) => {
        if (dx <= 0) return;
        appLayerX.setValue(dx);
        appLayerProgress.setValue(Math.max(0, 1 - dx / SCREEN_WIDTH));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_WIDTH * 0.40 || vx > 1.0) {
          Animated.parallel([
            Animated.timing(appLayerX,        { toValue: SCREEN_WIDTH, duration: 280, useNativeDriver: true }),
            Animated.timing(appLayerProgress, { toValue: 0,            duration: 280, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (!finished) return;
            appLayerProgress.setValue(0);
            requestAnimationFrame(() => setActiveAppLayer(null));
          });
        } else {
          Animated.parallel([
            Animated.spring(appLayerX,        { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.spring(appLayerProgress, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(appLayerX,        { toValue: 0, useNativeDriver: true }),
          Animated.spring(appLayerProgress, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  // ── Interpolações de escala/opacidade da home (Meta pattern) ───────────────
  const homeScale   = swipeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.0] });
  const homeOpacity = swipeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.0] });
  const homeScaleApp   = appLayerProgress.interpolate({ inputRange: [0, 1], outputRange: [1.0, 0.94] });
  const homeOpacityApp = appLayerProgress.interpolate({ inputRange: [0, 1], outputRange: [1.0, 0.88] });

  // ── Estilo final da home Animated.View ────────────────────────────────────
  const homeAnimatedStyle = {
    flex: 1,
    transform: [{ scale: showDetail ? homeScale : activeAppLayer ? homeScaleApp : 1 }],
    opacity:   showDetail ? homeOpacity : activeAppLayer ? homeOpacityApp : 1,
    borderRadius: (showDetail || activeAppLayer) ? 16 : 0,
    overflow: 'hidden',
  };

  return {
    swipeProgress,
    appLayerX,
    appLayerProgress,
    appLayerPan,
    activeAppLayer,
    openAppLayer,
    closeAppLayer,
    homeAnimatedStyle,
  };
}