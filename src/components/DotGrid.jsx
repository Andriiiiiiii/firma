import React, { useEffect, useRef } from 'react'

/**
 * Интерактивная решётка с упруго-вязкой динамикой + постоянные бегущие волны.
 * Оптимизации:
 *  - Соседи считаются по индексным сдвигам (без массива springs).
 *  - Курсор влияет только на локальный индексный window.
 *  - Адаптивная плотность решётки по целевому FPS.
 * Динамика:
 *  - Две трансверсальные волны (0° и 60°), смещение поперёк направления волны.
 *  - Репульсия/drag/swirl от курсора.
 *  - Возврат к origin и демпфирование.
 */

export default function DotGrid({ attachTo }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const mouseRef = useRef({
    x: 0, y: 0, active: false,
    vx: 0, vy: 0, lastX: 0, lastY: 0, lastT: 0
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    // ---- Параметры ----
    const P = {
      spacingMin: 14,
      spacingMax: 22,
      dotR: 1.25,

      // «пружины» и вязкость
      springK: 0.11,
      originK: 0.030,   // чуть ниже, чтобы волна читалась
      damping: 0.90,

      // курсор
      mouseForce: 2600,
      mouseRadius: 190,
      dragForce: 1600,
      swirlForce: 420,

      diagFactor: Math.SQRT1_2,
      maxSubsteps: 2,

      edgeFalloffX: 0.46,
      edgeFalloffY: 0.34,
      centerBoost: 0.22,

      // Волны (трансверсальные)
      waveK: 0.075,                 // «жёсткость» возврата к волновой форме
      waves: [
        { dir: [1, 0],        lambda: 260, speed: 160, amp: 3.2 },       // 0°
        { dir: [0.5, 0.866],  lambda: 320, speed: 120, amp: 2.4 }        // 60°
      ],

      // целевой FPS для LOD
      fpsHi: 75,
      fpsLo: 55
    }

    // ---- Состояние ----
    let W = 0, H = 0, SP = 18, cols = 0, rows = 0, N = 0
    let px, py, vx, vy, ox, oy, alphaEdge

    // предрасчёт для волн
    let waveData = []  // [{k, omega, dir:[dx,dy], nor:[nx,ny], dot: Float32Array}, ...]

    // соседи
    const NB = []

    // FPS адаптация
    let emaDt = 1 / 60
    const emaK = 0.06

    // глобальное время
    let gtime = 0

    // ---- Утилиты ----
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
    const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
    const hypot = (x, y) => Math.sqrt(x * x + y * y)

    const pickSpacing = (w) => {
      const t = clamp((w - 900) / 700, 0, 1)
      return Math.round(P.spacingMin * (1 - t) + P.spacingMax * t)
    }

    function setupGrid() {
      SP = pickSpacing(W / dpr)
      cols = Math.max(34, Math.floor((W / dpr) / SP))
      rows = Math.max(20, Math.floor((H / dpr) / SP))
      N = cols * rows

      px = new Float32Array(N)
      py = new Float32Array(N)
      vx = new Float32Array(N)
      vy = new Float32Array(N)
      ox = new Float32Array(N)
      oy = new Float32Array(N)
      alphaEdge = new Float32Array(N)

      const cx = (W / dpr) * 0.5
      const cy = (H / dpr) * 0.5
      const rx = (W / dpr) * P.edgeFalloffX
      const ry = (H / dpr) * P.edgeFalloffY

      // координаты решётки
      let k = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, k++) {
          const x = (c + 0.5) * SP
          const y = (r + 0.5) * SP
          px[k] = ox[k] = x
          py[k] = oy[k] = y
          vx[k] = 0
          vy[k] = 0

          const nx = (x - cx) / rx
          const ny = (y - cy) / ry
          const dist = Math.sqrt(nx * nx + ny * ny)
          let a = dist >= 1 ? 0 : smooth01(1 - dist)
          const boost = P.centerBoost * smooth01(1 - clamp(dist, 0, 1))
          alphaEdge[k] = clamp(a + boost, 0, 1)
        }
      }

      // соседи (вправо, вниз, диагонали)
      NB.length = 0
      const offR = 1
      const offD = cols
      const offDR = cols + 1
      const offDL = cols - 1
      NB.push([offR, SP, 1.0])
      NB.push([offD, SP, 1.0])
      NB.push([offDR, SP * Math.SQRT2, P.diagFactor])
      NB.push([offDL, SP * Math.SQRT2, P.diagFactor])

      // предрасчёт волн
      waveData = P.waves.map(w => {
        const [dx, dy] = w.dir
        const L = Math.hypot(dx, dy) || 1
        const dirx = dx / L, diry = dy / L
        const norx = -diry, nory = dirx        // поперёк — трансверсальная волна
        const kcoef = (Math.PI * 2) / w.lambda
        const omega = kcoef * w.speed
        const dot = new Float32Array(N)
        for (let i = 0; i < N; i++) {
          dot[i] = (ox[i] * dirx + oy[i] * diry) * kcoef
        }
        return { k: kcoef, omega, dir: [dirx, diry], nor: [norx, nory], dot, amp: w.amp }
      })
    }

    // ---- Рендер ----
    function draw() {
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = '#ffffff'
      const r = P.dotR

      for (let i = 0; i < N; i++) {
        const a = alphaEdge[i]
        if (a <= 0.002) continue
        ctx.globalAlpha = a * 0.85
        ctx.fillRect(px[i] - r, py[i] - r, r * 2, r * 2)
      }
      ctx.restore()
    }

    // ---- Курсор (локальное окно) ----
    function applyMouse(dt) {
      const m = mouseRef.current
      if (!m.active) return

      const mr = P.mouseRadius
      const cMin = clamp(Math.floor((m.x - mr) / SP - 0.5), 0, cols - 1)
      const cMax = clamp(Math.ceil((m.x + mr) / SP - 0.5), 0, cols - 1)
      const rMin = clamp(Math.floor((m.y - mr) / SP - 0.5), 0, rows - 1)
      const rMax = clamp(Math.ceil((m.y + mr) / SP - 0.5), 0, rows - 1)

      const mf = P.mouseForce
      const df = P.dragForce
      const sw = P.swirlForce
      const mvx = m.vx
      const mvy = m.vy

      for (let r = rMin; r <= rMax; r++) {
        const rowBase = r * cols
        for (let c = cMin; c <= cMax; c++) {
          const i = rowBase + c
          const a = alphaEdge[i]
          if (a <= 0.002) continue

          const dx = px[i] - m.x
          const dy = py[i] - m.y
          const dist = hypot(dx, dy)
          if (dist < mr) {
            const t = 1 - dist / mr
            const inv = 1 / (dist + 12)

            // репульсия
            const fr = mf * t * t * inv
            vx[i] += (dx * inv) * fr * dt
            vy[i] += (dy * inv) * fr * dt

            // drag (вдоль скорости курсора)
            const fd = df * t * inv
            vx[i] += mvx * fd * dt
            vy[i] += mvy * fd * dt

            // swirl (перпендикуляр)
            const fx = -dy * sw * t * inv
            const fy =  dx * sw * t * inv
            vx[i] += fx * dt
            vy[i] += fy * dt
          }
        }
      }
    }

    // ---- Волновой драйвер: смещение поперёк направления волны ----
    function applyWaves(dt) {
      const wk = P.waveK
      const aEdge = alphaEdge
      for (let i = 0; i < N; i++) {
        const a = aEdge[i]
        if (a <= 0.002) continue

        let wx = 0, wy = 0
        // суммируем две волны
        for (let w = 0; w < waveData.length; w++) {
          const Wv = waveData[w]
          const phase = Wv.dot[i] - Wv.omega * gtime
          const s = Math.sin(phase)
          wx += Wv.nor[0] * (Wv.amp * s) * a
          wy += Wv.nor[1] * (Wv.amp * s) * a
        }

        // стремимся к (origin + waveOffset)
        const tx = ox[i] + wx
        const ty = oy[i] + wy
        vx[i] += (tx - px[i]) * wk * dt
        vy[i] += (ty - py[i]) * wk * dt
      }
    }

    // ---- Пружины/возврат/интеграция ----
    function step(dt) {
      const k = P.springK
      const ko = P.originK
      const damp = P.damping

      const _px = px, _py = py, _vx = vx, _vy = vy, _alpha = alphaEdge
      const _cols = cols, _rows = rows
      const offR = 1,        restR = SP,          wR = 1.0
      const offD = cols,     restD = SP,          wD = 1.0
      const offDR = cols + 1,restDR = SP * Math.SQRT2, wDR = P.diagFactor
      const offDL = cols - 1,restDL = SP * Math.SQRT2, wDL = P.diagFactor

      for (let r = 0; r < _rows; r++) {
        const base = r * _cols
        for (let c = 0; c < _cols; c++) {
          const i = base + c
          const ai = _alpha[i]
          if (ai <= 0.002) continue

          // вправо
          if (c + 1 < _cols) {
            const j = i + offR
            const aj = _alpha[j]
            const dx = _px[j] - _px[i]
            const dy = _py[j] - _py[i]
            const dist = hypot(dx, dy) + 1e-6
            const force = k * (dist - restR) * (ai + aj) * 0.5 * wR
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            _vx[i] +=  fx * dt; _vy[i] +=  fy * dt
            _vx[j] += -fx * dt; _vy[j] += -fy * dt
          }
          // вниз
          if (r + 1 < _rows) {
            const j = i + offD
            const aj = _alpha[j]
            const dx = _px[j] - _px[i]
            const dy = _py[j] - _py[i]
            const dist = hypot(dx, dy) + 1e-6
            const force = k * (dist - restD) * (ai + aj) * 0.5 * wD
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            _vx[i] +=  fx * dt; _vy[i] +=  fy * dt
            _vx[j] += -fx * dt; _vy[j] += -fy * dt
          }
          // диагонали
          if (c + 1 < _cols && r + 1 < _rows) {
            const j = i + offDR
            const aj = _alpha[j]
            const dx = _px[j] - _px[i]
            const dy = _py[j] - _py[i]
            const dist = hypot(dx, dy) + 1e-6
            const force = k * (dist - restDR) * (ai + aj) * 0.5 * wDR
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            _vx[i] +=  fx * dt; _vy[i] +=  fy * dt
            _vx[j] += -fx * dt; _vy[j] += -fy * dt
          }
          if (c - 1 >= 0 && r + 1 < _rows) {
            const j = i + offDL
            const aj = _alpha[j]
            const dx = _px[j] - _px[i]
            const dy = _py[j] - _py[i]
            const dist = hypot(dx, dy) + 1e-6
            const force = k * (dist - restDL) * (ai + aj) * 0.5 * wDL
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            _vx[i] +=  fx * dt; _vy[i] +=  fy * dt
            _vx[j] += -fx * dt; _vy[j] += -fy * dt
          }
        }
      }

      // Возврат к origin + демпф + интеграция
      for (let i = 0; i < N; i++) {
        const a = _alpha[i]
        if (a <= 0.002) continue
        _vx[i] += (ox[i] - _px[i]) * ko * dt
        _vy[i] += (oy[i] - _py[i]) * ko * dt
        _vx[i] *= P.damping
        _vy[i] *= P.damping
        _px[i] += _vx[i] * dt
        _py[i] += _vy[i] * dt
      }
    }

    // ---- Цикл ----
    let lastT = performance.now()
    function loop(now) {
      const rawDt = (now - lastT) / 1000
      lastT = now
      gtime += rawDt

      // EMA для LOD
      emaDt = emaDt * (1 - emaK) + rawDt * emaK
      const fps = 1 / emaDt
      if (fps < P.fpsLo && SP < P.spacingMax) { SP += 1; setupGrid() }
      else if (fps > P.fpsHi && SP > P.spacingMin) { SP -= 1; setupGrid() }

      const dt = Math.min(0.033, Math.max(0.008, rawDt))
      const h = dt / Math.max(1, P.maxSubsteps)
      for (let i = 0; i < P.maxSubsteps; i++) {
        // порядок важен: сначала волна как целевая форма, потом курсор, потом пружины
        applyWaves(h)
        applyMouse(h)
        step(h)
      }
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    // ---- Размер/события ----
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
      const now = performance.now()
      const m = mouseRef.current
      const x = (e.clientX - rect.left)
      const y = (e.clientY - rect.top)

      const dt = Math.max(0.001, (now - (m.lastT || now)) / 1000)
      m.vx = (x - (m.lastX || x)) / dt * 0.05  // чуть сильнее импульс
      m.vy = (y - (m.lastY || y)) / dt * 0.05

      m.x = x; m.y = y; m.active = true
      m.lastX = x; m.lastY = y; m.lastT = now
    }
    const onLeave = () => { mouseRef.current.active = false }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('touchstart', (e) => { if (e.touches?.[0]) onMove(e.touches[0]) }, { passive: true })
    canvas.addEventListener('touchmove',  (e) => { if (e.touches?.[0]) onMove(e.touches[0]) }, { passive: true })
    canvas.addEventListener('touchend', onLeave)

    resize()
    lastT = performance.now()
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('touchstart', onMove)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="grid-canvas" aria-label="grid" />
}
