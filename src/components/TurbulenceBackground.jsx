import React, { useEffect, useRef } from "react"

/**
 * ТУРБУЛЕНТНЫЙ ФОН (HIGH PERF)
 * - Локальные белые шлейфы при резком движении мышью.
 * - Черный фон, "светящиеся" линии (lighter).
 * - TypedArray + убираем объекты => минимум аллокаций.
 * - Адаптив под FPS: снижает разрешение/плотность при просадке.
 */
export default function TurbulenceBackground({
  active = true,

  // ==== ФИЗИКА / ВИЗУАЛ ====
  viscosity = 0.9,         // 0..1 — "вязкость" среды (демпфирование скорости). Больше => гуще/медленнее.
  turbulence = 400,          // сила завихрений (амплитуда curl-ускорения, px/s^2).
  speedScale = 1.0,          // глобальный множитель скоростей (ускоряет/замедляет движение).
  fadeRate = 0.18,           // скорость растворения следов в черный фон (0..1; ~0.12–0.25).
  strokeAlpha = 0.12,        // базовая яркость линий.
  thickness = 1.0,           // множитель толщины трейлов (линий).
  lifeMin = 0.8,             // сек — мин. жизнь частицы.
  lifeMax = 1.5,             // сек — макс. жизнь частицы.

  // ==== ТУРБУЛЕНТНОСТЬ (поле шума) ====
  curlScale = 1.0,           // масштаб домена curl (1 — базовый размер вихрей; >1 — крупнее).
  timeScale = 1.0,           // скорость эволюции поля шума.
  noiseFreqX = 11.3,         // частоты "шума" по X
  noiseFreqY = 10.1,         // частоты "шума" по Y
  noiseFreq2X = 27.7,        // вторичная компонента (делает поле богаче)
  noiseFreq2Y = 19.3,

  // ==== РОЖДЕНИЕ ЧАСТИЦ (ПЛОТНОСТЬ) ====
  speedThreshold = 1200,     // px/s — порог "резкого" движения для старта всплеска.
  burstBase = 30,            // базовое число частиц во всплеске.
  burstSlope = 70,           // добавка частиц при превышении порога (пропорционально скорости).
  burstRadius = 30,          // радиус рождения частиц вокруг курсора.
  densityCap = 5000,         // мягкий лимит активных частиц (плотность сцены).
  spawnCooldownMs = 50,      // минимальный интервал между всплесками, мс (стабилизирует нагрузку).
  thicknessJitter = [0.8, 1.8], // разброс толщины линий

  // ==== КАЧЕСТВО / АДАПТАЦИЯ ====
  resolutionScale = 0.5,     // 1 = нативно; 0.75/0.5 — экономия GPU.
  dprMax = 2,                // ограничение devicePixelRatio.
  adaptive = true,           // вкл/выкл автоадаптацию под FPS.
  targetFps = 60,
  adaptDownFps = 50,         // если ниже — понижаем качество
  adaptUpFps = 58,           // если выше — пробуем повысить
  adaptQualityStep = 0.05,   // шаг изменения resolutionScale
  densityStep = 300,         // шаг изменения densityCap при адаптации
  minResolutionScale = 0.6,  // нижняя граница качества
  maxResolutionScale = 1.0,  // верхняя граница качества
  minDensityCap = 1400,      // нижняя граница плотности
  maxDensityCap = 4000,      // верхняя граница плотности

  // ==== ПРОЧЕЕ ====
  quality = 1.0              // алиас на resolutionScale для обратной совместимости
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const runningRef = useRef(false)

  // Состояние/буферы: статичные TypedArray на максимум плотности (upper bound),
  // а текущий "активный лимит" регулируем без реаллокаций.
  const S = useRef({
    w: 0, h: 0, dpr: 1,
    t: 0, lastTs: 0,
    lastMx: 0, lastMy: 0, lastMoveTs: 0, lastSpawnTs: 0,
    // буферы частиц (Struct of Arrays)
    cap: 0,
    count: 0,
    x: null, y: null, vx: null, vy: null, life: null, maxLife: null, size: null,
    // рендер/адаптация
    resScale: Math.min(resolutionScale || quality, maxResolutionScale),
    densityCapCurrent: densityCap,
    fpsAvg: targetFps,
    needClear: true,
  })

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  function allocIfNeeded(maxCap) {
    const s = S.current
    if (s.cap >= maxCap) return
    s.cap = maxCap
    s.x = new Float32Array(maxCap)
    s.y = new Float32Array(maxCap)
    s.vx = new Float32Array(maxCap)
    s.vy = new Float32Array(maxCap)
    s.life = new Float32Array(maxCap)
    s.maxLife = new Float32Array(maxCap)
    s.size = new Float32Array(maxCap)
    s.count = 0
  }

  function resize() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, dprMax)
    const rect = canvas.parentElement.getBoundingClientRect()
    const s = S.current
    const scale = clamp(s.resScale, minResolutionScale, maxResolutionScale)

    const wCss = Math.max(1, Math.floor(rect.width))
    const hCss = Math.max(1, Math.floor(rect.height))
    canvas.style.width = `${wCss}px`
    canvas.style.height = `${hCss}px`

    canvas.width = Math.floor(wCss * dpr * scale)
    canvas.height = Math.floor(hCss * dpr * scale)

    s.w = canvas.width
    s.h = canvas.height
    s.dpr = dpr
    s.needClear = true
  }

  // Быстрый псевдошум + curl
  function noise(nx, ny, t) {
    return (
      Math.sin(nx * noiseFreqX + t * 0.9 * timeScale) * Math.cos(ny * noiseFreqY - t * 1.1 * timeScale) +
      0.5 * Math.sin((nx * noiseFreq2X - ny * noiseFreq2Y) + t * 0.7 * timeScale)
    )
  }
  function curl(nx, ny, t) {
    const e = 0.0025
    const dx = (noise(nx + e, ny, t) - noise(nx - e, ny, t)) / (2 * e)
    const dy = (noise(nx, ny + e, t) - noise(nx, ny - e, t)) / (2 * e)
    return { x: dy, y: -dx }
  }

  function spawnBurst(mx, my, dirx, diry, base, slope, radius, now) {
    const s = S.current
    if (now - s.lastSpawnTs < spawnCooldownMs) return
    s.lastSpawnTs = now

    const remain = Math.max(0, s.densityCapCurrent - s.count)
    if (remain <= 0) return

    // количество по скорости
    const spd = Math.hypot(dirx, diry)
    const k = spd > 0 ? Math.max(0, (spd - speedThreshold) / speedThreshold) : 0
    let N = Math.floor(base + slope * k)
    if (N <= 0) return
    N = Math.min(N, remain)

    const minW = thicknessJitter[0], maxW = thicknessJitter[1]
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2
      const r = radius * Math.sqrt(Math.random())
      const idx = s.count++

      s.x[idx] = mx + Math.cos(a) * r
      s.y[idx] = my + Math.sin(a) * r
      // начальная скорость ~ направлению мыши + небольшая поперечная компонента
      const jitter = 0.6 + Math.random() * 0.6
      const perpX = -diry * ((Math.random() - 0.5) * 0.5)
      const perpY =  dirx * ((Math.random() - 0.5) * 0.5)
      s.vx[idx] = (dirx + perpX) * jitter * 10 * speedScale
      s.vy[idx] = (diry + perpY) * jitter * 10 * speedScale

      s.life[idx] = 0
      s.maxLife[idx] = lifeMin + Math.random() * (lifeMax - lifeMin)
      s.size[idx] = (minW + Math.random() * (maxW - minW)) * s.dpr * thickness
    }
  }

  // Быстрый O(1) "удалить i-ую" — заменяем последним
  function kill(i) {
    const s = S.current
    const last = s.count - 1
    if (i !== last) {
      s.x[i] = s.x[last]
      s.y[i] = s.y[last]
      s.vx[i] = s.vx[last]
      s.vy[i] = s.vy[last]
      s.life[i] = s.life[last]
      s.maxLife[i] = s.maxLife[last]
      s.size[i] = s.size[last]
    }
    s.count = last
  }

  function step(ts) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const s = S.current

    if (!s.lastTs) s.lastTs = ts
    const dt = Math.min(0.05, (ts - s.lastTs) / 1000) // cap 50ms
    s.lastTs = ts
    s.t += dt

    // === адаптация FPS ===
    const fps = 1 / dt
    s.fpsAvg = s.fpsAvg * 0.92 + fps * 0.08
    if (adaptive) {
      if (s.fpsAvg < adaptDownFps) {
        // понижаем нагрузку
        if (s.resScale > minResolutionScale) {
          s.resScale = clamp(s.resScale - adaptQualityStep, minResolutionScale, maxResolutionScale)
          resize()
        } else if (s.densityCapCurrent > minDensityCap) {
          s.densityCapCurrent = Math.max(minDensityCap, s.densityCapCurrent - densityStep)
          if (s.count > s.densityCapCurrent) s.count = s.densityCapCurrent
        }
      } else if (s.fpsAvg > adaptUpFps) {
        // пробуем поднять качество
        if (s.densityCapCurrent < maxDensityCap) {
          s.densityCapCurrent = Math.min(maxDensityCap, s.densityCapCurrent + densityStep)
        } else if (s.resScale < maxResolutionScale) {
          s.resScale = clamp(s.resScale + adaptQualityStep, minResolutionScale, maxResolutionScale)
          resize()
        }
      }
    }

    // Инициализация/очистка фона
    if (s.needClear) {
      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = 1
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, s.w, s.h)
      s.needClear = false
    }
    // Постепенный fade к черному
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = clamp(fadeRate * dt * 60, 0, 0.85)
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, s.w, s.h)

    // Обновление/рисование
    const invW = 1 / s.w, invH = 1 / s.h
    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#fff"

    // ВНИМАНИЕ: пер-частично меняем globalAlpha и lineWidth — это быстро, но всё равно state change.
    // Альтернатива — "биннинг" по 2–3 классам яркости/толщины; на практике текущий вариант достаточно быстрый.

    let i = 0
    while (i < s.count) {
      const x0 = s.x[i], y0 = s.y[i]
      // curl поле
      const c = curl(x0 * invW * curlScale, y0 * invH * curlScale, s.t)
      s.vx[i] += c.x * turbulence * dt * speedScale
      s.vy[i] += c.y * turbulence * dt * speedScale

      // вязкость
      s.vx[i] *= viscosity
      s.vy[i] *= viscosity

      // перемещение
      s.x[i] += s.vx[i] * dt
      s.y[i] += s.vy[i] * dt

      // жизнь
      s.life[i] += dt
      if (s.life[i] > s.maxLife[i]) {
        kill(i)
        continue
      }

      // если далеко за экран — удаляем
      if (s.x[i] < -5 || s.x[i] > s.w + 5 || s.y[i] < -5 || s.y[i] > s.h + 5) {
        kill(i)
        continue
      }

      // рисуем трейл
      const lifeK = 1 - s.life[i] / s.maxLife[i]
      ctx.globalAlpha = Math.max(0, strokeAlpha * (0.25 + 0.75 * lifeK))
      ctx.lineWidth = Math.max(0.7, s.size[i])
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(s.x[i], s.y[i])
      ctx.stroke()

      i++
    }

    if (runningRef.current && active) {
      rafRef.current = requestAnimationFrame(step)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s = S.current

    // верхняя граница для аллокации — максимум возможной плотности
    const upperCap = Math.max(maxDensityCap, densityCap)
    allocIfNeeded(upperCap)
    s.densityCapCurrent = clamp(densityCap, minDensityCap, maxDensityCap)
    s.resScale = clamp(resolutionScale || quality, minResolutionScale, maxResolutionScale)

    const onResize = () => resize()
    window.addEventListener("resize", onResize, { passive: true })
    resize()

    // трекинг движения курсора
    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (s.w / rect.width)
      const my = (e.clientY - rect.top) * (s.h / rect.height)
      const now = performance.now()

      if (s.lastMoveTs) {
        const dtMs = now - s.lastMoveTs
        if (dtMs > 0) {
          const dx = mx - s.lastMx
          const dy = my - s.lastMy
          const spd = Math.hypot(dx, dy) / (dtMs / 1000)
          if (spd > speedThreshold) {
            spawnBurst(mx, my, dx, dy, burstBase, burstSlope, burstRadius, now)
          }
        }
      }
      s.lastMx = mx
      s.lastMy = my
      s.lastMoveTs = now
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })

    runningRef.current = true
    rafRef.current = requestAnimationFrame(step)

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, []) // init once

  useEffect(() => {
    if (active && !runningRef.current) {
      runningRef.current = true
      S.current.lastTs = 0
      rafRef.current = requestAnimationFrame(step)
    } else if (!active && runningRef.current) {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  )
}
