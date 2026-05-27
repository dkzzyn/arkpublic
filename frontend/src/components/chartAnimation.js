/** Animações unificadas — barras da base (0), linhas e pizza */

export const VALUE_AXIS_DOMAIN = [0, "auto"];

export const CHART_ANIMATION_DURATION = 720;
export const CHART_ANIMATION_EASING = "ease-out";

/** Barras verticais: crescem da base até o valor */
export const CHART_BAR_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: CHART_ANIMATION_DURATION,
  animationEasing: CHART_ANIMATION_EASING,
  baseValue: 0,
};

/** Segunda série em barras agrupadas (leve atraso) */
export const CHART_BAR_ANIMATION_DELAYED = {
  ...CHART_BAR_ANIMATION,
  animationBegin: 80,
};

/** Linhas: traço da esquerda para a direita, pontos no fim */
export const CHART_LINE_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: CHART_ANIMATION_DURATION,
  animationEasing: CHART_ANIMATION_EASING,
};

/** Pizza / rosca */
export const CHART_PIE_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 600,
  animationEasing: CHART_ANIMATION_EASING,
};

export function chartMountKey(...parts) {
  return parts.filter((p) => p !== undefined && p !== null && p !== "").join("|");
}
