import { useEffect, useRef } from "react"
import { getDeviceType, getQualitySettings, isMobile } from "../utils/deviceUtils"

export default function CrystalLattice(props) {
  const {
    baseSpacing = 20,
    stiffness = 80,
    originStiffness = 8,
    damping = 0.6,
    mouseForce = 1500,
    mouseRadius = 400,
    mouseFalloff = 3,
    sideVignetteStrength = 1,
    className,
    style,
  } = props

  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  
  const isMobileDevice = isMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const deviceType = getDeviceType()
    const qualitySettings = getQualitySettings()
    const isMobileDevice = isMobile()
    
    const getGridDensity = () => {
      const { width, height } = wrap.getBoundingClientRect()
      const ar = height / Math.max(1, width)

      const decide = (baseCols) => {
        let rows = Math.ceil(ar * (baseCols - 1)) + 1
        rows = Math.max(rows, Math.min(18, baseCols))
        return { cols: baseCols, rows }
      }

      switch (deviceType) {
        case 'mobile':
          return decide(width < 360 ? 18 : width < 420 ? 22 : 26)
        case 'tablet':
          return decide(42)
        default:
          return decide(80)
      }
    }
    
    const { cols: fixedCols, rows: fixedRows } = getGridDensity()
    
    const enableInteractivity = true

    const ctx = canvas.getContext("2d", { alpha: true })

    const S = {
      w: 0, h: 0, dpr: qualitySettings.dpr,
      cols: fixedCols,
      rows: fixedRows,
      count: 0,
      spacing: baseSpacing,
      px: null, py: null,
      vx: null, vy: null,
      ox: null, oy: null,
      nbr: null, rest: null,
      mx: -1e6, my: -1e6, mActive: enableInteractivity,
      acc: 0, last: 0,
      dotR: 0,
      vignetteCanvas: null,
      dotSprite: null, dotSpriteSize: 0,
      waveTriggered: false,
    }

    const neighborOffsets = new Int8Array([
      -1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1
    ])

    const mR = mouseRadius
    const mR2 = mR * mR
    const mRInv = mR > 0 ? 1 / mR : 0

    // Расширяем затемнение по краям (было 280/240, делаем шире)
    const buildVignette = () => {
      const vw = S.w, vh = S.h
      if (vw <= 0 || vh <= 0) return

      const vCan = document.createElement("canvas")
      vCan.width = vw
      vCan.height = vh
      const vCtx = vCan.getContext("2d")
      vCtx.clearRect(0, 0, vw, vh)

      // Увеличиваем ширину затемнения
      const bandX = Math.min(450, Math.max(200, vw * 0.28))
      const bandY = Math.min(400, Math.max(160, vh * 0.32))
      const a = Math.max(0, Math.min(1, sideVignetteStrength))

      let g = vCtx.createLinearGradient(0, 0, bandX, 0)
      g.addColorStop(0, `rgba(0,0,0,${a})`)
      g.addColorStop(1, `rgba(0,0,0,0)`)
      vCtx.fillStyle = g
      vCtx.fillRect(0, 0, bandX, vh)

      g = vCtx.createLinearGradient(vw - bandX, 0, vw, 0)
      g.addColorStop(0, `rgba(0,0,0,0)`)
      g.addColorStop(1, `rgba(0,0,0,${a})`)
      vCtx.fillStyle = g
      vCtx.fillRect(vw - bandX, 0, bandX, vh)

      g = vCtx.createLinearGradient(0, 0, 0, bandY)
      g.addColorStop(0, `rgba(0,0,0,${a})`)
      g.addColorStop(1, `rgba(0,0,0,0)`)
      vCtx.fillStyle = g
      vCtx.fillRect(0, 0, vw, bandY)

      g = vCtx.createLinearGradient(0, vh - bandY, 0, vh)
      g.addColorStop(0, `rgba(0,0,0,0)`)
      g.addColorStop(1, `rgba(0,0,0,${a})`)
      vCtx.fillStyle = g
      vCtx.fillRect(0, vh - bandY, vw, bandY)

      const cx = vw * 0.5, cy = vh * 0.5
      const rOuter = Math.sqrt(cx * cx + cy * cy)
      const radial = vCtx.createRadialGradient(cx, cy, rOuter * 0.45, cx, cy, rOuter)
      radial.addColorStop(0, "rgba(0,0,0,0)")
      radial.addColorStop(1, `rgba(0,0,0,${a * 0.35})`)
      vCtx.fillStyle = radial
      vCtx.fillRect(0, 0, vw, vh)

      S.vignetteCanvas = vCan
    }

    const buildDotSprite = () => {
      const r = S.dotR
      const size = Math.max(1, (r * 2 + 2) | 0)
      const dCan = document.createElement("canvas")
      dCan.width = size
      dCan.height = size
      const dCtx = dCan.getContext("2d")
      dCtx.clearRect(0, 0, size, size)
      dCtx.beginPath()
      dCtx.arc(size * 0.5, size * 0.5, r, 0, Math.PI * 2)
      dCtx.fillStyle = "rgba(255,255,255,0.5)"
      dCtx.fill()
      S.dotSprite = dCan
      S.dotSpriteSize = size
    }

    const init = () => {
      const { width, height } = wrap.getBoundingClientRect()
      S.w = Math.max(1, width | 0)
      S.h = Math.max(1, height | 0)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      canvas.width = Math.max(1, (S.w * S.dpr) | 0)
      canvas.height = Math.max(1, (S.h * S.dpr) | 0)
      canvas.style.width = `${S.w}px`
      canvas.style.height = `${S.h}px`
      ctx.scale(S.dpr, S.dpr)

      S.spacingX = S.cols > 1 ? S.w / (S.cols - 1) : S.w
      S.spacingY = S.rows > 1 ? S.h / (S.rows - 1) : S.h
      S.spacing = Math.min(S.spacingX, S.spacingY)
      
      // Фиксированный размер точек (не зависит от масштаба браузера)
      const dotSizeFactor = isMobileDevice ? 0.11 : 0.07
      S.dotR = S.spacing * dotSizeFactor

      S.count = S.cols * S.rows

      S.px = new Float32Array(S.count)
      S.py = new Float32Array(S.count)
      S.vx = new Float32Array(S.count)
      S.vy = new Float32Array(S.count)
      S.ox = new Float32Array(S.count)
      S.oy = new Float32Array(S.count)
      S.nbr = new Int32Array(S.count * 8)
      S.rest = new Float32Array(S.count * 8)

      let k = 0
      for (let r = 0; r < S.rows; r++) {
        const y = r * S.spacingY
        for (let c = 0; c < S.cols; c++, k++) {
          const x = c * S.spacingX
          S.px[k] = S.ox[k] = x
          S.py[k] = S.oy[k] = y
        }
      }

      const cols = S.cols, rows = S.rows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c
          const base = i * 8
          for (let d = 0; d < 8; d++) {
            const nc = c + neighborOffsets[d * 2]
            const nr = r + neighborOffsets[d * 2 + 1]
            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
              S.nbr[base + d] = -1
              S.rest[base + d] = 0
              continue
            }
            const j = nr * cols + nc
            S.nbr[base + d] = j
            const dx = S.ox[j] - S.ox[i], dy = S.oy[j] - S.oy[i]
            S.rest[base + d] = Math.sqrt(dx * dx + dy * dy)
          }
        }
      }

      buildVignette()
      buildDotSprite()

      S.acc = 0
      S.last = performance.now() / 1000
      S.waveTriggered = false
    }

    // Добавляем волну при открытии
    const triggerInitialWave = () => {
      if (S.waveTriggered) return
      S.waveTriggered = true
      
      // Случайная точка и направление
      const cx = Math.random() * S.w
      const cy = Math.random() * S.h
      const angle = Math.random() * Math.PI * 2
      const waveForce = 8000
      
      const px = S.px, py = S.py, vx = S.vx, vy = S.vy
      const cnt = S.count
      const maxDist = Math.max(S.w, S.h)
      
      for (let i = 0; i < cnt; i++) {
        const dx = px[i] - cx
        const dy = py[i] - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) continue
        
        const t = Math.max(0, 1 - dist / maxDist)
        const str = t * t * waveForce
        
        const dirX = Math.cos(angle)
        const dirY = Math.sin(angle)
        
        vx[i] += dirX * str / dist
        vy[i] += dirY * str / dist
      }
    }

    const fixedDt = 1 / 60
    const maxSub = isMobileDevice ? 2 : 3
    const dampDecayFactor = damping * 10

    const update = (dt) => {
      const px = S.px, py = S.py
      const vx = S.vx, vy = S.vy
      const ox = S.ox, oy = S.oy
      const nbr = S.nbr, rest = S.rest
      const cols = S.cols, rows = S.rows

      const dampF = Math.exp(-dampDecayFactor * dt)
      const kS = stiffness
      const kO = originStiffness
      const kM = mouseForce

      let minC = 0, maxC = -1, minR = 0, maxR = -1
      const mActive = S.mActive && enableInteractivity
      if (mActive) {
        const avg = S.spacing
        const rad = mR + avg
        minC = Math.max(0, Math.floor((S.mx - rad) / S.spacingX))
        maxC = Math.min(cols - 1, Math.floor((S.mx + rad) / S.spacingX))
        minR = Math.max(0, Math.floor((S.my - rad) / S.spacingY))
        maxR = Math.min(rows - 1, Math.floor((S.my + rad) / S.spacingY))
      }

      let i = 0
      for (let r = 0; r < rows; r++) {
        const inR = mActive && r >= minR && r <= maxR
        for (let c = 0; c < cols; c++, i++) {
          let fx = 0, fy = 0
          const x = px[i], y = py[i]
          const base = i * 8

          for (let d = 0; d < 8; d++) {
            const j = nbr[base + d]
            if (j < 0) continue
            const dx = px[j] - x
            const dy = py[j] - y
            const d2 = dx * dx + dy * dy
            if (d2 < 1e-12) continue
            const invDist = 1 / Math.sqrt(d2)
            const dist = d2 * invDist
            const disp = dist - rest[base + d]
            const f = kS * disp
            fx += dx * invDist * f
            fy += dy * invDist * f
          }

          fx += kO * (ox[i] - x)
          fy += kO * (oy[i] - y)

          if (mActive) {
            if (inR && c >= minC && c <= maxC) {
              const dx = x - S.mx
              const dy = y - S.my
              const d2 = dx * dx + dy * dy
              if (d2 < mR2 && d2 > 0.01) {
                const dist = Math.sqrt(d2)
                const t = 1 - dist * mRInv
                const str = t * t * t
                const invDist = 1 / dist
                const f = kM * str
                fx += dx * invDist * f
                fy += dy * invDist * f
              }
            }
          }

          const nvx = (vx[i] + fx * dt) * dampF
          const nvy = (vy[i] + fy * dt) * dampF
          vx[i] = nvx
          vy[i] = nvy
          px[i] = x + nvx * dt
          py[i] = y + nvy * dt
        }
      }
    }

    const render = () => {
      const w = S.w, h = S.h
      ctx.clearRect(0, 0, w, h)

      const spr = S.dotSprite
      if (spr) {
        const px = S.px, py = S.py, cnt = S.count
        const size = S.dotSpriteSize
        const off = size * 0.5
        const wPad = w + size
        const hPad = h + size
        for (let i = 0; i < cnt; i++) {
          const x = px[i], y = py[i]
          if (x < -size || y < -size || x > wPad || y > hPad) continue
          ctx.drawImage(spr, x - off, y - off, size, size)
        }
      }

      if (S.vignetteCanvas) {
        ctx.drawImage(S.vignetteCanvas, 0, 0, w, h)
      }
    }

    let rafId = 0
    const tick = (tMs) => {
      const t = tMs / 1000
      let dt = t - S.last
      if (dt > 0.1) dt = 0.1
      S.last = t
      S.acc += dt

      // Запускаем волну при первом кадре
      if (!S.waveTriggered) {
        setTimeout(() => triggerInitialWave(), 100)
      }

      let steps = 0
      while (S.acc >= fixedDt && steps < maxSub) {
        update(fixedDt)
        S.acc -= fixedDt
        steps++
      }

      render()
      rafId = requestAnimationFrame(tick)
    }

    const onPointerMove = (e) => {
      if (!enableInteractivity) return
      const rect = canvas.getBoundingClientRect()
      S.mx = e.clientX - rect.left
      S.my = e.clientY - rect.top
      S.mActive = true
    }
    const onPointerEnter = () => { if (enableInteractivity) S.mActive = true }
    const onPointerLeave = () => { S.mActive = false }

    if (enableInteractivity) {
      canvas.addEventListener("pointermove", onPointerMove, { passive: true })
      canvas.addEventListener("pointerenter", onPointerEnter)
      canvas.addEventListener("pointerleave", onPointerLeave)
    }

    const ro = new ResizeObserver(() => init())
    ro.observe(wrap)

    init()
    S.last = performance.now() / 1000
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      if (enableInteractivity) {
        canvas.removeEventListener("pointermove", onPointerMove)
        canvas.removeEventListener("pointerenter", onPointerEnter)
        canvas.removeEventListener("pointerleave", onPointerLeave)
      }
    }
  }, [
    baseSpacing, damping, mouseFalloff,
    mouseForce, mouseRadius, originStiffness,
    sideVignetteStrength, stiffness,
  ])

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
          cursor: "default",
          touchAction: "pan-y",
          pointerEvents: "auto",
        }}
      />
    </div>
  )
}