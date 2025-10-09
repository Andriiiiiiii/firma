import React, { useEffect, useRef } from 'react'

/**
 * Jelly-подобное облако частиц.
 * Идея: прямоугольная решётка частиц со связями-пружинами (право/низ/диагонали),
 * демпфирование (вязкость), слабая “возвратная” пружина к исходной позиции.
 * От курсора — репульсивная сила с радиусом влияния. По краям — сглаженная прозрачность,
 * чтобы облако визуально выглядело как "облако", а не строгий прямоугольник.
 */

export default function ParticleCloud({ attachTo }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const cleanupRef = useRef(() => {})
  const mouseRef = useRef({ x: 0, y: 0, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    // ---- Параметры симуляции (можно твикать под производительность) ----
    const params = {
      spacingMin: 14,       // базовый шаг решётки (px) при ширине ~ 1200px
      spacingMax: 20,       // шаг на больших экранах
      particleRadius: 1.5,  // радиус точки при рисовании
      springK: 0.08,        // жёсткость пружин между соседями
      originK: 0.02,        // возврат к исходной позиции (мягкая пружина)
      damping: 0.92,        // вязкое демпфирование скорости
      mouseForce: 1600,     // сила отталкивания курсора
      mouseRadius: 170,     // радиус влияния курсора (px)
      diagFactor: Math.SQRT1_2, // поправка для диагональных пружин
      maxSubsteps: 2,       // интеграция при просадках FPS
      edgeFalloffX: 0.44,   // горизонтальный радиус полуоси для альфы
      edgeFalloffY: 0.35,   // вертикальный радиус полуоси для альфы
    }

    // ---- Состояние системы ----
    let W = 0, H = 0, SP = 16
    let cols = 0, rows = 0
    let N = 0

    // Позиции/скорости/исходные позиции/альфа-падение у краёв
    let px, py, vx, vy, ox, oy, alphaEdge

    // Список пружин: пары индексов и их «rest length»
    let springs = []

    // ---- Вспомогалки ----
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
    const smooth01 = (t) => { // плавная ступенька 0..1
      t = clamp(t, 0, 1); return t * t * (3 - 2 * t)
    }

    function pickSpacing(w) {
      const min = params.spacingMin
      const max = params.spacingMax
      const t = clamp((w - 900) / 600, 0, 1) // между 900px и 1500px плавно
      return Math.round(min * (1 - t) + max * t)
    }

    function setupGrid() {
      // Рассчитываем шаг, количество колонок/строк под текущий размер
      SP = pickSpacing(W / dpr)
      cols = Math.floor((W / dpr) / SP)
      rows = Math.floor((H / dpr) / SP)
      cols = Math.max(28, cols)
      rows = Math.max(16, rows)
      N = cols * rows

      px = new Float32Array(N)
      py = new Float32Array(N)
      vx = new Float32Array(N)
      vy = new Float32Array(N)
      ox = new Float32Array(N)
      oy = new Float32Array(N)
      alphaEdge = new Float32Array(N)
      springs = []

      // Центр и полуоси для "облачной" альфы
      const cx = (W / dpr) * 0.5
      const cy = (H / dpr) * 0.5
      const rx = (W / dpr) * params.edgeFalloffX
      const ry = (H / dpr) * params.edgeFalloffY

      // Инициализация частиц на регулярной сетке
      let idx = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, idx++) {
          const x = (c + 0.5) * SP
          const y = (r + 0.5) * SP

          px[idx] = ox[idx] = x
          py[idx] = oy[idx] = y
          vx[idx] = 0
          vy[idx] = 0

          // Плавное "исчезание" к краям — эллиптический профиль
          const nx = (x - cx) / rx
          const ny = (y - cy) / ry
          const dist = Math.sqrt(nx * nx + ny * ny) // 0 в центре, >1 за эллипсом
          const a = dist >= 1 ? 0 : smooth01(1 - dist) // от 1 в центре к 0 на краю
          alphaEdge[idx] = a
        }
      }

      // Соединяем пружинами с правым и нижним соседом + диагонали
      const idxAt = (cc, rr) => rr * cols + cc
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = idxAt(c, r)
          if (c + 1 < cols) {
            const j = idxAt(c + 1, r)
            springs.push([i, j, SP, 1.0]) // горизонталь
          }
          if (r + 1 < rows) {
            const j = idxAt(c, r + 1)
            springs.push([i, j, SP, 1.0]) // вертикаль
          }
          if (c + 1 < cols && r + 1 < rows) {
            const j = idxAt(c + 1, r + 1)
            springs.push([i, j, SP * Math.SQRT2, params.diagFactor]) // диагональ
          }
          if (c - 1 >= 0 && r + 1 < rows) {
            const j = idxAt(c - 1, r + 1)
            springs.push([i, j, SP * Math.SQRT2, params.diagFactor]) // диагональ
          }
        }
      }
    }

    // ---- Рендер ----
    function draw() {
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = '#ffffff'

      const r = params.particleRadius
      const aScale = 0.85 // верхняя граница прозрачности

      for (let i = 0; i < N; i++) {
        const a = alphaEdge[i]
        if (a <= 0.001) continue
        ctx.globalAlpha = a * aScale
        ctx.beginPath()
        ctx.arc(px[i], py[i], r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

    // ---- Физика ----
    function step(dt) {
      const k = params.springK
      const ko = params.originK
      const damp = params.damping
      const mr = params.mouseRadius
      const mf = params.mouseForce
      const m = mouseRef.current

      // Пружины (соседние связи, чуть дешевле чем полный соседский поиск)
      for (let s = 0; s < springs.length; s++) {
        const [i, j, rest, w] = springs[s]
        const dx = px[j] - px[i]
        const dy = py[j] - py[i]
        const dist = Math.hypot(dx, dy) + 1e-6
        const force = k * (dist - rest) * w
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        // Учитываем “облачность”: ослабляем влияние у краёв
        const ai = alphaEdge[i]
        const aj = alphaEdge[j]
        const aw = (ai + aj) * 0.5

        vx[i] += fx * aw * dt
        vy[i] += fy * aw * dt
        vx[j] -= fx * aw * dt
        vy[j] -= fy * aw * dt
      }

      // Возврат к исходнику + курсор + интеграция
      for (let i = 0; i < N; i++) {
        const a = alphaEdge[i]
        if (a <= 0.001) continue

        // Возврат к исходному положению (мягкий)
        const fx0 = (ox[i] - px[i]) * ko
        const fy0 = (oy[i] - py[i]) * ko

        vx[i] += fx0 * dt
        vy[i] += fy0 * dt

        // Влияние курсора (репульсия)
        if (m.active) {
          const dx = px[i] - m.x
          const dy = py[i] - m.y
          const dist = Math.hypot(dx, dy)
          if (dist < mr) {
            const t = 1 - dist / mr
            const f = (mf * t * t) / (dist + 12) // плавное усиление к центру
            vx[i] += (dx / (dist + 1e-6)) * f * dt
            vy[i] += (dy / (dist + 1e-6)) * f * dt
          }
        }

        // Вязкость
        vx[i] *= damp
        vy[i] *= damp

        // Интеграция
        px[i] += vx[i] * dt
        py[i] += vy[i] * dt
      }
    }

    // ---- Цикл ----
    let lastT = performance.now()
    function frame(now) {
      const rawDt = (now - lastT) / 1000
      lastT = now
      // защитимся от больших прыжков времени
      const dt = Math.min(0.033, Math.max(0.008, rawDt))
      const h = dt / Math.max(1, params.maxSubsteps)
      for (let i = 0; i < params.maxSubsteps; i++) step(h)
      draw()
      rafRef.current = requestAnimationFrame(frame)
    }

    // ---- Размеры и события ----
    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      W = Math.max(1, Math.floor(rect.width * dpr))
      H = Math.max(1, Math.floor(rect.height * dpr))
      canvas.width = W
      canvas.height = H
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      setupGrid()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left)
      mouseRef.current.y = (e.clientY - rect.top)
      mouseRef.current.active = true
    }
    const onLeave = () => { mouseRef.current.active = false }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) onMove(e.touches[0])
    }, { passive: true })
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) onMove(e.touches[0])
    }, { passive: true })
    canvas.addEventListener('touchend', onLeave)

    resize()
    lastT = performance.now()
    rafRef.current = requestAnimationFrame(frame)

    cleanupRef.current = () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('touchstart', onMove)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onLeave)
    }

    return () => cleanupRef.current()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="cloud-canvas"
      aria-label="cloud-particles"
    />
  )
}
