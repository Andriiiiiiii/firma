// Реал-тайм кристаллическая решётка (массы-пружины) с затемнением со ВСЕХ сторон.
// Использование: <div style={{height:'80vh'}}><CrystalLattice /></div>

import React, { useEffect, useRef } from "react";

export default function CrystalLattice({
  // --- НЕ МЕНЯТЬ ДЕФОЛТЫ (по просьбе пользователя) ---
  dotRadius = 1.5,          // радиус точки
  baseSpacing = 20,         // шаг решётки (px) на средних экранах
  stiffness = 100,          // жёсткость пружин между соседями
  originStiffness = 10,      // возврат к исходной позиции
  damping = 0.4,           // затухание (0..1), меньше — дольше «звенит»
  mouseForce = 3000,        // сила отталкивания курсора
  mouseRadius = 400,        // радиус влияния курсора
  mouseFalloff = 3,       // как быстро затухает сила от центра
  sideVignetteStrength = 1, // 0..1 — насколько тёмные края
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

    // ---------- Состояние симуляции ----------
    const state = {
      w: 0,
      h: 0,
      dpr: 1,
      cols: 0,
      rows: 0,
      count: 0,
      spacing: baseSpacing,

      // позиции / скорости / якоря
      px: null, py: null,
      vx: null, vy: null,
      ox: null, oy: null,

      // соседи (индексы) — плоский массив длиной count*8, -1 если соседа нет
      nbr: null,

      // курсор
      mx: -1e6,
      my: -1e6,
      mActive: false,

      // тайминг
      acc: 0,
      last: 0,

      // рендер
      dotR: dotRadius,

      // готовая текстура виньетки (пререндерим для FPS)
      vignetteCanvas: null,
      vignetteCtx: null,
    };

    // восьминаправленные соседи
    const neighborDirs = new Int8Array([
      -1,  0,   1,  0,   0, -1,   0,  1,  -1, -1,   1, -1,  -1,  1,   1,  1
    ]); // пары (dx,dy)

    // ---------- Пререндер виньетки (чтобы не строить градиенты каждый кадр) ----------
    const buildVignette = () => {
      const vw = state.w;
      const vh = state.h;
      if (vw <= 0 || vh <= 0) return;

      const vCan = document.createElement("canvas");
      vCan.width = vw;
      vCan.height = vh;
      const vCtx = vCan.getContext("2d");

      // Полная прозрачность
      vCtx.clearRect(0, 0, vw, vh);

      // Ширина полос по сторонам (адаптивно)
      const bandX = Math.min(280, Math.max(120, vw * 0.18));
      const bandY = Math.min(240, Math.max(100, vh * 0.22));
      const a = Math.max(0, Math.min(1, sideVignetteStrength));

      // Левый градиент
      let g = vCtx.createLinearGradient(0, 0, bandX, 0);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, 0, bandX, vh);

      // Правый градиент
      g = vCtx.createLinearGradient(vw - bandX, 0, vw, 0);
      g.addColorStop(0, `rgba(0,0,0,0)`);
      g.addColorStop(1, `rgba(0,0,0,${a})`);
      vCtx.fillStyle = g;
      vCtx.fillRect(vw - bandX, 0, bandX, vh);

      // Верхний градиент
      g = vCtx.createLinearGradient(0, 0, 0, bandY);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, 0, vw, bandY);

      // Нижний градиент
      g = vCtx.createLinearGradient(0, vh - bandY, 0, vh);
      g.addColorStop(0, `rgba(0,0,0,0)`);
      g.addColorStop(1, `rgba(0,0,0,${a})`);
      vCtx.fillStyle = g;
      vCtx.fillRect(0, vh - bandY, vw, bandY);

      // Мягкое «эллиптическое» усиление затемнения к углам:
      // имитируем овальную виньетку добавочным слабым радиальным градиентом
      const cx = vw * 0.5;
      const cy = vh * 0.5;
      const rOuter = Math.sqrt(cx * cx + cy * cy);
      const radial = vCtx.createRadialGradient(cx, cy, Math.max(0, rOuter * 0.45), cx, cy, rOuter);
      radial.addColorStop(0, "rgba(0,0,0,0)");
      radial.addColorStop(1, `rgba(0,0,0,${a * 0.35})`);
      vCtx.fillStyle = radial;
      vCtx.fillRect(0, 0, vw, vh);

      state.vignetteCanvas = vCan;
      state.vignetteCtx = vCtx;
    };

    // ---------- Инициализация сетки ----------
    const init = () => {
      const { width, height } = wrap.getBoundingClientRect();

      // DPR (ограничим для производительности)
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);

      state.w = Math.max(1, Math.floor(width));
      state.h = Math.max(1, Math.floor(height));

      // канвас под DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.width  = Math.max(1, Math.floor(state.w * state.dpr));
      canvas.height = Math.max(1, Math.floor(state.h * state.dpr));
      canvas.style.width  = `${state.w}px`;
      canvas.style.height = `${state.h}px`;
      ctx.scale(state.dpr, state.dpr);

      // адаптивный шаг
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

      // расставляем точки
      let k = 0;
      for (let r = 0; r < state.rows; r++) {
        const y = r * state.spacing;
        for (let c = 0; c < state.cols; c++, k++) {
          const x = c * state.spacing;
          state.px[k] = state.ox[k] = x;
          state.py[k] = state.oy[k] = y;
          state.vx[k] = 0;
          state.vy[k] = 0;
        }
      }

      // соседи (индексы) — заранее
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const i = r * state.cols + c;
          for (let d = 0; d < 8; d++) {
            const dc = neighborDirs[d * 2 + 0];
            const dr = neighborDirs[d * 2 + 1];
            const nc = c + dc;
            const nr = r + dr;
            state.nbr[i * 8 + d] =
              (nc >= 0 && nc < state.cols && nr >= 0 && nr < state.rows)
                ? nr * state.cols + nc
                : -1;
          }
        }
      }

      // пререндерим виньетку
      buildVignette();

      state.acc = 0;
      state.last = performance.now() / 1000;
    };

    // ---------- Физика ----------
    const fixedDt = 1 / 60;
    const maxSub = 3;

    const update = (dt) => {
      // экспоненциальное затухание (dt-инвариантно)
      const dampF = Math.exp(-damping * 10 * dt);

      const px = state.px, py = state.py, vx = state.vx, vy = state.vy;
      const ox = state.ox, oy = state.oy, nbr = state.nbr;

      const s = state.spacing;
      const sDiag = Math.SQRT2 * s; // быстрее, чем hypot(s,s)

      // локальные константы для курсора (микрооптимизация)
      const mActive = state.mActive;
      const mx = state.mx;
      const my = state.my;
      const mR = mouseRadius;
      const mR2 = mR * mR;

      for (let i = 0; i < state.count; i++) {
        let fx = 0, fy = 0;

        const x = px[i], y = py[i];

        // пружины к соседям (8 направлений)
        // 0..3 — кардинальные соседи, 4..7 — диагональные
        for (let d = 0; d < 8; d++) {
          const j = nbr[i * 8 + d];
          if (j < 0) continue;

          const dx = px[j] - x;
          const dy = py[j] - y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1e-6) continue;

          const rest = (d < 4) ? s : sDiag;
          const disp = dist - rest;
          const f = stiffness * disp; // закон Гука

          const inv = 1.0 / dist;
          fx += dx * inv * f;
          fy += dy * inv * f;
        }

        // возврат к якорю
        fx += originStiffness * (ox[i] - x);
        fy += originStiffness * (oy[i] - y);

        // курсор — только если активен
        if (mActive) {
          const dx = x - mx;
          const dy = y - my;

          // дешевая отсечка по AABB (избегаем hypot для дальних точек)
          if ((dx * dx + dy * dy) < mR2) {
            const dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
              const t = 1 - dist / mR;              // 1 в центре → 0 на границе
              const str = Math.pow(t, mouseFalloff); // медленное затухание
              const f = mouseForce * str;
              const inv = 1.0 / dist;
              fx += dx * inv * f;  // отталкивание от курсора
              fy += dy * inv * f;
            }
          }
        }

        // semi-implicit Euler
        vx[i] = (vx[i] + fx * dt) * dampF;
        vy[i] = (vy[i] + fy * dt) * dampF;

        px[i] = x + vx[i] * dt;
        py[i] = y + vy[i] * dt;
      }
    };

    // ---------- Рендер ----------
    const render = () => {
      const { w, h, px, py, dotR, vignetteCanvas } = state;

      // очистка (фон остаётся чёрным из стилей контейнера)
      ctx.clearRect(0, 0, w, h);

      // отрисовка точек единственным путём
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.95;

      ctx.beginPath();
      for (let i = 0; i < state.count; i++) {
        const x = px[i], y = py[i];
        if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
        ctx.moveTo(x + dotR, y);
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      // виньетка со всех сторон (пререндеренное изображение)
      if (vignetteCanvas) {
        ctx.drawImage(vignetteCanvas, 0, 0, w, h);
      }
    };

    // ---------- Цикл анимации ----------
    let rafId = 0;
    const tick = (tMs) => {
      const t = tMs / 1000;
      let dt = t - state.last;
      state.last = t;

      dt = Math.min(dt, 0.1); // защита от больших скачков
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

    // ---------- События указателя ----------
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

    // ---------- Resize ----------
    const ro = new ResizeObserver(() => {
      init();            // пересчёт решётки
      // tick перезапускать не нужно — raf продолжает работать,
      // draw использует актуальные размеры/массивы
    });
    ro.observe(wrap);

    // старт
    init();
    state.last = performance.now() / 1000;
    rafId = requestAnimationFrame(tick);

    // очистка
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    baseSpacing,
    damping,
    dotRadius,
    mouseFalloff,
    mouseForce,
    mouseRadius,
    originStiffness,
    sideVignetteStrength,
    stiffness,
  ]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",  // чёрный фон
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
          // Удалили CSS-фильтры ради FPS
        }}
      />
    </div>
  );
}
