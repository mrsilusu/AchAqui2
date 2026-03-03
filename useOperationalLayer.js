/**
 * ============================================================================
 * useOperationalLayer  (v1.0.0)
 * ============================================================================
 * Hook que gere o estado das Camadas Operacionais dentro do BusinessDetailModal.
 *
 * Uma "camada operacional" é um módulo sectorial (HospitalityModule,
 * DiningModule, BeautyWellnessModule, ProfessionalModule) que desliza
 * sobre o detalhe do negócio quando o utilizador prime o botão de acção.
 *
 * Garante isolamento total: apenas UMA camada pode estar activa de cada vez.
 * Ao fechar, o estado é limpo antes de animar — evita ghost-data entre negócios.
 *
 * Devolve:
 *   activeLayer    — 'hospitality' | 'dining' | 'beauty' | 'professional' | null
 *   activeBusiness — objecto do negócio actualmente na camada (ou null)
 *   slideX         — Animated.Value  (SCREEN_WIDTH → 0 ao abrir; 0 → SCREEN_WIDTH ao fechar)
 *   open(layer, business) — abre a camada com animação slide-in da direita
 *   close()               — fecha com animação slide-out para a direita, limpa estado
 * ============================================================================
 */

import { useState, useRef, useCallback } from 'react';
import { Animated, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDE_DURATION = 300;

export function useOperationalLayer() {
  const [activeLayer,    setActiveLayer]    = useState(null);
  const [activeBusiness, setActiveBusiness] = useState(null);

  // slideX: começa em SCREEN_WIDTH (fora do ecrã à direita), anima até 0 (visível)
  const slideX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // ── Abrir camada ──────────────────────────────────────────────────────────
  const open = useCallback((layer, business) => {
    // Garante que o estado anterior está limpo antes de montar o novo módulo
    setActiveLayer(null);
    setActiveBusiness(null);
    slideX.setValue(SCREEN_WIDTH);

    // Monta o módulo correcto no próximo frame, depois anima
    requestAnimationFrame(() => {
      setActiveLayer(layer);
      setActiveBusiness(business);
      Animated.spring(slideX, {
        toValue:         0,
        tension:         68,
        friction:        13,
        useNativeDriver: true,
      }).start();
    });
  }, [slideX]);

  // ── Fechar camada ─────────────────────────────────────────────────────────
  const close = useCallback(() => {
    Animated.timing(slideX, {
      toValue:         SCREEN_WIDTH,
      duration:        SLIDE_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      // Limpa DEPOIS da animação — evita flash de conteúdo errado
      setActiveLayer(null);
      setActiveBusiness(null);
      slideX.setValue(SCREEN_WIDTH);
    });
  }, [slideX]);

  // Usado pelo PanResponder após animação manual já concluída
  const closeImmediate = useCallback(() => {
    setActiveLayer(null);
    setActiveBusiness(null);
    slideX.setValue(SCREEN_WIDTH);
  }, [slideX]);

  return {
    activeLayer,
    activeBusiness,
    slideX,
    open,
    close,
    closeImmediate,
  };
}