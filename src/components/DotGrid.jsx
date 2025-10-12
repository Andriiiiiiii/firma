// Высокопроизводительная кристаллическая решётка с массами-пружинами
// Оптимизации: кэширование, batch rendering, минимум вычислений в циклах

import React, { useEffect, useRef } from "react";

export default function CrystalLattice({
  dotRadius = 1.5,
  baseSpacing = 20,
  stiffness = 100,
  originStiffness = 10,
  damping = 0.4,
  mouseForce = 3000,
  mouseRadius = 400,
  mouseFalloff = 3,
  sideVignetteStrength = 1,
  className,
  style
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: true });

    const state = {
      w: 0, h: 0, dpr: 1,
      cols: 0, rows: 0, count: 0,
      spacing: baseSpacing,
      px: null, py: null,
      vx: null, vy: null,
      ox: null, oy: null,
      nbr: null,
      mx: -1e6, my: -1e6, mActive: false,
      acc: 0, last: 0,
      dotR: dotRadius,
      vignetteCanvas: null,
    };

    // Предвычисленные константы для соседей
    const neighborOffsets = new Int8Array([
      -1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1
    ]);

    // Предвычисление для радиуса мыши
    const mR2 = mouseRadius * mouseRadius;
    const mRInv = 1.0 / mouseRadius;
    
    // Константы для физики
    const SQRT2 = Math.SQRT2;
    const dampDecayFactor = damping * 10;

    // Пререндер виньетки
    const buildVignette = () => {
      const vw = state.w, vh = state.h;
      if (vw <= 0 || vh <= 0) return;

      const vCan = document.createElement("canvas");
      vCan.width = vw;
      vCan.height = vh;
      const vCtx = vCan.getContext("2d");

      vCtx.clearRect(0, 0, vw, vh);

      const bandX = Math.min(280, Math.max(120, vw * 0.18));
      const bandY = Math.min(240, Math.max(100, vh * 0.22));
      const a = Math.max(0, Math.min(1, sideVignetteStrength));

      // Левый
      let g = vCtx.createLinearGradient(0, 0, bandX, 0);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, 0, bandX, vh);

      // Правый
      g = vCtx.createLinearGradient(vw - bandX, 0, vw, 0);
      g.addColorStop(0, `rgba(0,0,0,0)`);
      g.addColorStop(1, `rgba(0,0,0,${a})`);
      vCtx.fillStyle = g;
      vCtx.fillRect(vw - bandX, 0, bandX, vh);

      // Верхний
      g = vCtx.createLinearGradient(0, 0, 0, bandY);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, 0, vw, bandY);

      // Нижний
      g = vCtx.createLinearGradient(0, vh - bandY, 0, vh);
      g.addColorStop(0, `rgba(0,0,0,0)`);
      g.addColorStop(1, `rgba(0,0,0,${a})`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, vh - bandY, vw, bandY);

      // Радиальная виньетка
      const cx = vw * 0.5, cy = vh * 0.5;
      const rOuter = Math.sqrt(cx * cx + cy * cy);
      const radial = vCtx.createRadialGradient(cx, cy, rOuter * 0.45, cx, cy, rOuter);
      radial.addColorStop(0, "rgba(0,0,0,0)");
      radial.addColorStop(1, `rgba(0,0,0,${a * 0.35})`);
      vCtx.fillStyle = radial;
      vCtx.fillRect(0, 0, vw, vh);

      state.vignetteCanvas = vCan;
    };

    const init = () => {
      const { width, height } = wrap.getBoundingClientRect();
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = Math.max(1, Math.floor(width));
      state.h = Math.max(1, Math.floor(height));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.width = Math.max(1, Math.floor(state.w * state.dpr));
      canvas.height = Math.max(1, Math.floor(state.h * state.dpr));
      canvas.style.width = `${state.w}px`;
      canvas.style.height = `${state.h}px`;
      ctx.scale(state.dpr, state.dpr);

      // Адаптивный шаг
      const base = Math.min(state.w, state.h);
      const t = Math.max(0, Math.min(1, (base - 420) / 900));
      state.spacing = baseSpacing + (baseSpacing * 0.35) * t;

      state.cols = Math.floor(state.w / state.spacing) + 2;
      state.rows = Math.floor(state.h / state.spacing) + 2;
      state.count = state.cols * state.rows;

      state.px = new Float32Array(state.count);
      state.py = new Float32Array(state.count);
      state.vx = new Float32Array(state.count);
      state.vy = new Float32Array(state.count);
      state.ox = new Float32Array(state.count);
      state.oy = new Float32Array(state.count);
      state.nbr = new Int32Array(state.count * 8);

      // Инициализация позиций
      let k = 0;
      for (let r = 0; r < state.rows; r++) {
        const y = r * state.spacing;
        for (let c = 0; c < state.cols; c++, k++) {
          const x = c * state.spacing;
          state.px[k] = state.ox[k] = x;
          state.py[k] = state.oy[k] = y;
        }
      }

      // Предвычисление индексов соседей
      const cols = state.cols;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const i = r * cols + c;
          const base = i * 8;
          for (let d = 0; d < 8; d++) {
            const nc = c + neighborOffsets[d * 2];
            const nr = r + neighborOffsets[d * 2 + 1];
            state.nbr[base + d] = 
              (nc >= 0 && nc < cols && nr >= 0 && nr < state.rows)
                ? nr * cols + nc
                : -1;
          }
        }
      }

      buildVignette();
      state.acc = 0;
      state.last = performance.now() / 1000;
    };

    const fixedDt = 1 / 60;
    const maxSub = 3;

    const update = (dt) => {
      // Предвычисленный фактор затухания
      const dampF = Math.exp(-dampDecayFactor * dt);
      
      const px = state.px, py = state.py;
      const vx = state.vx, vy = state.vy;
      const ox = state.ox, oy = state.oy;
      const nbr = state.nbr;
      
      const s = state.spacing;
      const sDiag = SQRT2 * s;
      
      // Локальные переменные для курсора
      const mActive = state.mActive;
      const mx = state.mx, my = state.my;

      // Основной цикл физики
      for (let i = 0; i < state.count; i++) {
        let fx = 0, fy = 0;
        const x = px[i], y = py[i];
        const base = i * 8;

        // Пружины к соседям (развёрнутый цикл для лучшей оптимизации)
        // Кардинальные направления (0-3)
        for (let d = 0; d < 4; d++) {
          const j = nbr[base + d];
          if (j < 0) continue;
          
          const dx = px[j] - x;
          const dy = py[j] - y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1e-6) continue;
          
          const disp = dist - s;
          const f = stiffness * disp;
          const invDist = 1.0 / dist;
          
          fx += dx * invDist * f;
          fy += dy * invDist * f;
        }

        // Диагональные направления (4-7)
        for (let d = 4; d < 8; d++) {
          const j = nbr[base + d];
          if (j < 0) continue;
          
          const dx = px[j] - x;
          const dy = py[j] - y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1e-6) continue;
          
          const disp = dist - sDiag;
          const f = stiffness * disp;
          const invDist = 1.0 / dist;
          
          fx += dx * invDist * f;
          fy += dy * invDist * f;
        }

        // Возврат к якорю
        fx += originStiffness * (ox[i] - x);
        fy += originStiffness * (oy[i] - y);

        // Курсор (быстрая отсечка)
        if (mActive) {
          const dx = x - mx;
          const dy = y - my;
          const dist2 = dx * dx + dy * dy;
          
          if (dist2 < mR2) {
            const dist = Math.sqrt(dist2);
            if (dist > 0.1) {
              const t = 1 - dist * mRInv;
              // Math.pow заменён на быстрое возведение для mouseFalloff = 3
              const str = t * t * t;
              const f = mouseForce * str;
              const invDist = 1.0 / dist;
              fx += dx * invDist * f;
              fy += dy * invDist * f;
            }
          }
        }

        // Semi-implicit Euler
        const nvx = (vx[i] + fx * dt) * dampF;
        const nvy = (vy[i] + fy * dt) * dampF;
        
        vx[i] = nvx;
        vy[i] = nvy;
        px[i] = x + nvx * dt;
        py[i] = y + nvy * dt;
      }
    };

    const render = () => {
      const { w, h, px, py, dotR, vignetteCanvas } = state;

      ctx.clearRect(0, 0, w, h);
      
      // Batch рендеринг всех точек одним путём
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.5;

      ctx.beginPath();
      const count = state.count;
      const wPad = w + 10;
      const hPad = h + 10;
      
      for (let i = 0; i < count; i++) {
        const x = px[i], y = py[i];
        // Быстрая проверка границ
        if (x < -10 || y < -10 || x > wPad || y > hPad) continue;
        ctx.moveTo(x + dotR, y);
        ctx.arc(x, y, dotR, 0, 6.283185307179586); // 2*PI
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      // Виньетка
      if (vignetteCanvas) {
        ctx.drawImage(vignetteCanvas, 0, 0, w, h);
      }
    };

    let rafId = 0;
    const tick = (tMs) => {
      const t = tMs / 1000;
      let dt = Math.min(t - state.last, 0.1);
      state.last = t;
      state.acc += dt;

      let steps = 0;
      while (state.acc >= fixedDt && steps < maxSub) {
        update(fixedDt);
        state.acc -= fixedDt;
        steps++;
      }

      render();
      rafId = requestAnimationFrame(tick);
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      state.mx = e.clientX - rect.left;
      state.my = e.clientY - rect.top;
      state.mActive = true;
    };

    const onPointerEnter = () => { state.mActive = true; };
    const onPointerLeave = () => { state.mActive = false; };

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const ro = new ResizeObserver(() => init());
    ro.observe(wrap);

    init();
    state.last = performance.now() / 1000;
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    baseSpacing, damping, dotRadius, mouseFalloff,
    mouseForce, mouseRadius, originStiffness,
    sideVignetteStrength, stiffness,
  ]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "crosshair",
          touchAction: "none",
        }}
      />
    </div>
  );
}