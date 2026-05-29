import React, { useEffect, useState } from "react";
import { Rectangle } from "recharts";

/** Animações unificadas — barras da base (0), linhas e pizza */

export const VALUE_AXIS_DOMAIN = [0, "auto"];

export const CHART_ANIMATION_DURATION = 900;
export const CHART_ANIMATION_EASING = "ease-out";
export const CHART_BAR_STAGGER_MS = 70;

/** Barras verticais: animação customizada da base ao topo */
export const CHART_BAR_ANIMATION = {
  isAnimationActive: false,
};

/** Segunda série em barras agrupadas */
export const CHART_BAR_ANIMATION_DELAYED = {
  isAnimationActive: false,
};

/** Labels fixos no topo — não “caem” com a barra */
export const BAR_LABEL_ANIMATION = {
  isAnimationActive: false,
};

/** Linhas: traço da esquerda para a direita */
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

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/** Barra vertical (default) ou horizontal (`horizontal`) crescendo da base. */
export function GrowingBarShape(props) {
  const { x, y, width, height, fill, radius, index, horizontal = false, staggerOffset = 0 } = props;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const delay = (index ?? 0) * CHART_BAR_STAGGER_MS + staggerOffset;
    const duration = CHART_ANIMATION_DURATION;
    let rafId = 0;
    let startTime = 0;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - delay;
      if (elapsed < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / duration);
      setProgress(easeOutCubic(t));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [x, y, width, height, index, horizontal, staggerOffset]);

  if (x == null || y == null || width == null || height == null) return null;

  if (horizontal) {
    const w = Math.max(0, width * progress);
    return <Rectangle x={x} y={y} width={w} height={height} fill={fill} radius={radius} />;
  }

  const h = Math.max(0, height * progress);
  return (
    <Rectangle
      x={x}
      y={y + height - h}
      width={width}
      height={h}
      fill={fill}
      radius={radius}
    />
  );
}

export function chartMountKey(...parts) {
  return parts.filter((p) => p !== undefined && p !== null && p !== "").join("|");
}

/** Chart.js — barras crescendo da base com leve escalonamento */
export function chartJsBarGrowAnimations(stagger = CHART_BAR_STAGGER_MS, duration = CHART_ANIMATION_DURATION) {
  return {
    animation: { duration, easing: "easeOutQuart" },
    animations: {
      y: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: (ctx) => {
          if (ctx.type !== "data") return undefined;
          const scaleId = ctx.dataset.yAxisID || "y";
          const scale = ctx.chart.scales[scaleId];
          return scale ? scale.getPixelForValue(0) : undefined;
        },
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * stagger : 0),
      },
      height: {
        type: "number",
        easing: "easeOutQuart",
        duration,
        from: 0,
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * stagger : 0),
      },
    },
  };
}
