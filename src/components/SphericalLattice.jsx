// Сферическая решётка из белых точек с физикой масс-пружин,
// лёгким 3D-освещением и ИНЕРЦИЕЙ ВРАЩЕНИЯ по двум осям (yaw + pitch).
//
// sizeRel — относительный диаметр сферы на экране: диаметр = sizeRel * min(width, height)

import React, { useEffect, useRef } from 'react'

export default function SphericalLattice({
  // Экранный размер
  sizeRel = 0.62,         // доля от min(w,h) для ДИАМЕТРА сферы
  // Геометрия
  pointsPerRow = 32,
  pointsPerCol = 24,
  // Физика точек
  stiffness = 80,
  originStiffness = 15,
  damping = 0.35,
  // Курсор
  mouseForce = 2800,
  mouseFalloff = 2.5,
  mouseRadius,            // опционально: в мировых единицах
  mouseRadiusRel = 0.55,  // иначе: доля от R сферы
  // Рендер (только точки)
  pointSize = 2.0,        // px
  pointColor = '#ffffff',
  pointOpacity = 0.85,
  // Камера/автоповорот
  autoRotation = true,
  rotationSpeed = 0.08,   // целевая угловая скорость по Y (yaw), рад/с
  basePitch = -0.25,      // базовый наклон (добавляется к динамическому pitch)
  // 3D-освещение
  lighting = true,
  depthBoost = 0.65,
  lambertIntensity = 0.4,
  specularPower = 24,
  specularIntensity = 0.55,
  rimIntensity = 0.2,
  rimPower = 2.0,
  lightDirCam = [0.4, 0.6, 1.0],
  // Инерция глобального вращения (НОВОЕ — двухосевая)
  // (по умолчанию НЕ меняет твой текущий вид:
  //  yaw держится на rotationSpeed, pitch стремится к 0)
  rotationSpeedX = 0.0,   // целевая угловая скорость по X (pitch), рад/с
  rotSpring = 1.2,        // 1/с: насколько быстро (yawVel/pitchVel) → (targetYaw/targetPitch)
  rotFriction = 0.25,     // 1/с: «трение» вращения — экспоненциальное затухание скорости
  rotDragGain = 3.0,      // рад/с за нормализованный dx (по X) И dy (по Y) от «свайпа» курсора
  rotMaxSpeedY,           // рад/с: потолок |yawVel| (если не задан — max(1.2, 3*rotationSpeed))
  rotMaxSpeedX,           // рад/с: потолок |pitchVel| (если не задан — max(1.2, 3*|rotationSpeedX|, 0.6))
  className,
  style,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })

    const S = {
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      w: 0, h: 0,
      camDist: 3.5,
      focalPx: 600,
      last: 0, acc: 0,
      cols: Math.max(8, pointsPerRow | 0),
      rows: Math.max(6, pointsPerCol | 0),
      count: 0,
      R: 1,
      sizeRel,
      // массивы динамики
      px: null, py: null, pz: null,
      vx: null, vy: null, vz: null,
      ox: null, oy: null, oz: null,
      nbr: null, rest: null,
      // проекция/повёрнутые координаты
      sx: null, sy: null, zc: null,
      rx: null, ry: null, rz: null,
      // курсор
      mActive: false,
      mx: -1e6, my: -1e6,
      _hadInside: false,
      // вращение
      yaw: 0,              // угол вокруг Y
      pitch: 0,            // угол вокруг X (добавляется к basePitch при отрисовке)
      yawVel: 0,           // угловая скорость yaw
      pitchVel: 0,         // угловая скорость pitch
      // опции
      stiffness, originStiffness, damping,
      mouseForce, mouseFalloff,
      pointSize, pointOpacity, pointColor,
      rotationSpeed, rotationSpeedX, basePitch, autoRotation,
      mouseRadiusWorld: 1,
      // освещение
      lighting,
      depthBoost,
      lambertIntensity,
      specularPower,
      specularIntensity,
      rimIntensity,
      rimPower,
      light: [0,0,1],
      // инерция
      rotSpring,
      rotFriction,
      rotDragGain,
      rotMaxSpeedY: (typeof rotMaxSpeedY === 'number')
        ? Math.max(0.05, rotMaxSpeedY)
        : Math.max(1.2, rotationSpeed * 3),
      rotMaxSpeedX: (typeof rotMaxSpeedX === 'number')
        ? Math.max(0.05, rotMaxSpeedX)
        : Math.max(0.6, Math.abs(rotationSpeedX) * 3), // безопасный потолок по X
    }

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
    const buildRotation = (yaw, pitch) => {
      // R = Ry(yaw) * Rx(pitch)
      const cy = Math.cos(yaw), sy = Math.sin(yaw)
      const cx = Math.cos(pitch), sx = Math.sin(pitch)
      return [
        cy,      0,   -sy,
        sy*sx,   cx,  cy*sx,
        sy*cx,  -sx,  cy*cx
      ]
    }
    const invertRotation = (m) => [ m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8] ]
    const mulM3V3 = (m, x, y, z) => ([ m[0]*x+m[1]*y+m[2]*z, m[3]*x+m[4]*y+m[5]*z, m[6]*x+m[7]*y+m[8]*z ])
    const dot = (ax,ay,az,bx,by,bz) => ax*bx + ay*by + az*bz
    const normalize3 = (x,y,z) => {
      const L = Math.hypot(x,y,z) || 1
      return [x/L, y/L, z/L]
    }
    const raySphereIntersect = (ro, rd, R) => {
      const b = dot(ro[0],ro[1],ro[2], rd[0],rd[1],rd[2])
      const c = dot(ro[0],ro[1],ro[2], ro[0],ro[1],ro[2]) - R*R
      const D = b*b - c
      if (D < 0) return null
      const t = -b - Math.sqrt(D)
      if (t < 0) return null
      return [ ro[0]+rd[0]*t, ro[1]+rd[1]*t, ro[2]+rd[2]*t ]
    }

    // Нормируем направление света
    {
      const n = normalize3(lightDirCam[0], lightDirCam[1], lightDirCam[2])
      S.light[0] = n[0]; S.light[1] = n[1]; S.light[2] = n[2]
    }

    const computeRadiusFromSizeRel = () => {
      const minDim = Math.min(S.w, S.h)
      const screenR = clamp(S.sizeRel, 0.05, 0.95) * minDim * 0.5
      const zc = S.camDist
      S.R = (screenR * zc) / S.focalPx
      S.mouseRadiusWorld = (typeof mouseRadius === 'number')
        ? mouseRadius
        : clamp(mouseRadiusRel, 0.05, 2.0) * S.R
    }

    const init = () => {
      const rect = wrap.getBoundingClientRect()
      S.w = Math.max(1, Math.floor(rect.width))
      S.h = Math.max(1, Math.floor(rect.height))
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.max(1, Math.floor(S.w * S.dpr))
      canvas.height = Math.max(1, Math.floor(S.h * S.dpr))
      canvas.style.width = `${S.w}px`
      canvas.style.height = `${S.h}px`
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
      ctx.imageSmoothingEnabled = true

      S.focalPx = Math.min(S.w, S.h) * 0.9
      computeRadiusFromSizeRel()

      S.count = S.cols * S.rows
      S.px = new Float32Array(S.count)
      S.py = new Float32Array(S.count)
      S.pz = new Float32Array(S.count)
      S.vx = new Float32Array(S.count)
      S.vy = new Float32Array(S.count)
      S.vz = new Float32Array(S.count)
      S.ox = new Float32Array(S.count)
      S.oy = new Float32Array(S.count)
      S.oz = new Float32Array(S.count)
      S.nbr = new Int32Array(S.count * 8)
      S.rest = new Float32Array(S.count * 8)
      S.sx = new Float32Array(S.count)
      S.sy = new Float32Array(S.count)
      S.zc = new Float32Array(S.count)
      S.rx = new Float32Array(S.count)
      S.ry = new Float32Array(S.count)
      S.rz = new Float32Array(S.count)

      // Раскладка по сфере
      let k = 0
      for (let r = 0; r < S.rows; r++) {
        const t = (r + 0.5) / S.rows
        const theta = t * Math.PI
        const ct = Math.cos(theta), st = Math.sin(theta)
        for (let c = 0; c < S.cols; c++, k++) {
          const p = c / S.cols
          const phi = p * Math.PI * 2
          const cp = Math.cos(phi), sp = Math.sin(phi)
          const x = S.R * st * cp
          const y = S.R * ct
          const z = S.R * st * sp
          S.px[k] = S.ox[k] = x
          S.py[k] = S.oy[k] = y
          S.pz[k] = S.oz[k] = z
          S.vx[k] = S.vy[k] = S.vz[k] = 0
        }
      }

      // Соседи (8 направлений) с wrap по долготе
      const idx = (rr,cc) => rr*S.cols + cc
      const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]
      for (let r = 0; r < S.rows; r++) {
        for (let c = 0; c < S.cols; c++) {
          const i = idx(r,c), base = i*8
          for (let d = 0; d < 8; d++) {
            let rr = r + dirs[d][0], cc = c + dirs[d][1]
            if (cc < 0) cc = S.cols - 1
            if (cc >= S.cols) cc = 0
            if (rr < 0 || rr >= S.rows) { S.nbr[base+d] = -1; S.rest[base+d] = 0; continue }
            const j = idx(rr,cc)
            S.nbr[base+d] = j
            const dx = S.ox[j]-S.ox[i], dy = S.oy[j]-S.oy[i], dz = S.oz[j]-S.oz[i]
            S.rest[base+d] = Math.hypot(dx,dy,dz)
          }
        }
      }

      S.acc = 0
      S.last = performance.now()/1000
    }

    const projectAll = (rotM) => {
      const cx = S.w * 0.5, cy = S.h * 0.5
      const f = S.focalPx, cd = S.camDist

      for (let i = 0; i < S.count; i++) {
        const rx = rotM[0]*S.px[i] + rotM[1]*S.py[i] + rotM[2]*S.pz[i]
        const ry = rotM[3]*S.px[i] + rotM[4]*S.py[i] + rotM[5]*S.pz[i]
        const rz = rotM[6]*S.px[i] + rotM[7]*S.py[i] + rotM[8]*S.pz[i]

        S.rx[i] = rx; S.ry[i] = ry; S.rz[i] = rz

        const zc = cd - rz
        S.zc[i] = zc
        const inv = 1 / zc
        S.sx[i] = cx + (rx * f) * inv
        S.sy[i] = cy - (ry * f) * inv
      }
    }

    const render = () => {
      const baseAlpha = clamp(S.pointOpacity, 0, 1)
      ctx.clearRect(0, 0, S.w, S.h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = S.pointColor

      const r = Math.max(0.5, S.pointSize)
      const vCamZ = 1.0 // взгляд ~ (0,0,1)

      // Проход с глубиной и ламбертом
      for (let i = 0; i < S.count; i++) {
        const x = S.sx[i], y = S.sy[i]
        if (x < -10 || y < -10 || x > S.w + 10 || y > S.h + 10) continue

        const front = clamp((S.rz[i] / S.R + 1) * 0.5, 0, 1) // 0=зад, 1=перед
        let alpha = baseAlpha * (0.25 + S.depthBoost * front)

        if (S.lighting) {
          const nx = S.rx[i] / S.R, ny = S.ry[i] / S.R, nz = S.rz[i] / S.R
          const nl = clamp(nx*S.light[0] + ny*S.light[1] + nz*S.light[2], 0, 1)
          alpha *= (1 - S.lambertIntensity) + S.lambertIntensity * nl

          const nDotV = clamp(nz * vCamZ, -1, 1)
          const rim = Math.pow(1 - Math.max(0, nDotV), S.rimPower) * S.rimIntensity
          alpha = clamp(alpha + rim * 0.2, 0, 1)
        }

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Спекуляр (аддитив)
      if (S.lighting && S.specularIntensity > 0) {
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < S.count; i++) {
          const x = S.sx[i], y = S.sy[i]
          if (x < -10 || y < -10 || x > S.w + 10 || y > S.h + 10) continue
          const nx = S.rx[i] / S.R, ny = S.ry[i] / S.R, nz = S.rz[i] / S.R
          const hx = S.light[0], hy = S.light[1], hz = S.light[2] + 1
          const hL = Math.hypot(hx, hy, hz) || 1
          const ndh = clamp((nx*hx + ny*hy + nz*hz) / hL, 0, 1)
          const spec = Math.pow(ndh, S.specularPower)
          const a = spec * S.specularIntensity
          if (a < 0.02) continue
          ctx.globalAlpha = a
          ctx.beginPath()
          ctx.arc(x, y, r * 0.9, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const fixedDt = 1/60
    const maxSub = 3

    const stepPhysics = (dt, pickObjSpace) => {
      const dampF = Math.exp(-S.damping * 10 * dt)
      const { px,py,pz, vx,vy,vz, ox,oy,oz, nbr,rest } = S
      const kSpring = S.stiffness, kAnchor = S.originStiffness
      const hasPick = !!pickObjSpace, pick = pickObjSpace
      const phiMax = clamp(S.mouseRadiusWorld / S.R, 0.01, Math.PI)

      for (let i = 0; i < S.count; i++) {
        let fx = 0, fy = 0, fz = 0
        const x = px[i], y = py[i], z = pz[i]
        const base = i*8

        // Пружины
        for (let d = 0; d < 8; d++) {
          const j = nbr[base+d]
          if (j < 0) continue
          const dx = px[j]-x, dy = py[j]-y, dz = pz[j]-z
          const dist = Math.hypot(dx,dy,dz)
          if (dist < 1e-6) continue
          const disp = dist - rest[base+d]
          const f = kSpring * disp
          const inv = 1 / dist
          fx += dx*inv * f; fy += dy*inv * f; fz += dz*inv * f
        }

        // Якорь
        fx += kAnchor * (ox[i]-x)
        fy += kAnchor * (oy[i]-y)
        fz += kAnchor * (oz[i]-z)

        // Мышь — касательный толчок
        if (hasPick) {
          let nx = x, ny = y, nz = z
          { const L = Math.hypot(nx,ny,nz)||1; nx/=L; ny/=L; nz/=L }
          const pxp = pick[0], pyp = pick[1], pzp = pick[2]
          const cang = clamp(nx*pxp + ny*pyp + nz*pzp, -1, 1)
          const ang = Math.acos(cang)
          if (ang < phiMax) {
            let tx = pxp - x, ty = pyp - y, tz = pzp - z
            const proj = tx*nx + ty*ny + tz*nz
            tx -= nx*proj; ty -= ny*proj; tz -= nz*proj
            const L = Math.hypot(tx,ty,tz)
            if (L > 1e-6) {
              const tnx = tx/L, tny = ty/L, tnz = tz/L
              const t = 1 - (ang/phiMax)
              const str = Math.pow(clamp(t,0,1), S.mouseFalloff)
              const F = S.mouseForce * str
              fx += tnx*F; fy += tny*F; fz += tnz*F
            }
          }
        }

        // Интегрирование + проекция на сферу
        const nvx = (vx[i] + fx*dt) * dampF
        const nvy = (vy[i] + fy*dt) * dampF
        const nvz = (vz[i] + fz*dt) * dampF
        vx[i] = nvx; vy[i] = nvy; vz[i] = nvz
        px[i] = x + nvx*dt
        py[i] = y + nvy*dt
        pz[i] = z + nvz*dt

        const L = Math.hypot(px[i],py[i],pz[i]) || 1
        const s = S.R / L
        px[i]*=s; py[i]*=s; pz[i]*=s
      }
    }

    // Главный цикл с инерцией вращения по двум осям
    let raf = 0
    const tick = (tMs) => {
      const t = tMs/1000
      let dt = Math.min(t - S.last, 0.1)
      S.last = t
      S.acc += dt

      // ИНЕРЦИЯ: yawVel/pitchVel → targetYaw/targetPitch, затухание, ограничение
      const targetYaw   = S.autoRotation ? S.rotationSpeed  : 0.0
      const targetPitch = S.autoRotation ? S.rotationSpeedX : 0.0
      S.yawVel   += (targetYaw   - S.yawVel)   * S.rotSpring * dt
      S.pitchVel += (targetPitch - S.pitchVel) * S.rotSpring * dt
      const fr = Math.exp(-S.rotFriction * dt)
      S.yawVel   *= fr
      S.pitchVel *= fr
      // Ограничения по модулю
      if (S.yawVel   >  S.rotMaxSpeedY) S.yawVel   =  S.rotMaxSpeedY
      if (S.yawVel   < -S.rotMaxSpeedY) S.yawVel   = -S.rotMaxSpeedY
      if (S.pitchVel >  S.rotMaxSpeedX) S.pitchVel =  S.rotMaxSpeedX
      if (S.pitchVel < -S.rotMaxSpeedX) S.pitchVel = -S.rotMaxSpeedX

      // Обновляем углы
      S.yaw   += S.yawVel   * dt
      S.pitch += S.pitchVel * dt

      // Построить матрицу поворота (yaw, затем pitch+basePitch)
      const rotM = buildRotation(S.yaw, S.basePitch + S.pitch)
      const invRot = invertRotation(rotM)

      // Пик курсора на сфере
      let pickObj = null
      if (S.mActive) {
        const cx = S.w * 0.5, cy = S.h * 0.5
        const x = (S.mx - cx) / S.focalPx
        const y = -(S.my - cy) / S.focalPx
        const roWorld = [0, 0, S.camDist]
        const rdWorld = normalize3(x, y, -1)
        const roObj = mulM3V3(invRot, roWorld[0], roWorld[1], roWorld[2])
        const rdObj = mulM3V3(invRot, rdWorld[0], rdWorld[1], rdWorld[2])
        const hit = raySphereIntersect(roObj, rdObj, S.R)
        if (hit) pickObj = hit
      }

      // Фиксированная физика
      let steps = 0
      while (S.acc >= fixedDt && steps < maxSub) {
        stepPhysics(fixedDt, pickObj)
        S.acc -= fixedDt
        steps++
      }

      projectAll(rotM)
      render()
      raf = requestAnimationFrame(tick)
    }

    // Импульсы вращения от «свайпа» мышью по двум осям
    const onPointerMove = (e) => {
      const rect = wrap.getBoundingClientRect()
      const x = e.clientX, y = e.clientY
      const inside = (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
      const minDim = Math.max(1, Math.min(rect.width, rect.height))
      if (inside) {
        const nx = x - rect.left
        const ny = y - rect.top
        if (S._hadInside) {
          const dxNorm = (nx - S.mx) / minDim
          const dyNorm = (ny - S.my) / minDim
          // Положительный dx → вращение вправо (yaw+), положительный dy → наклон вниз (pitch+)
          S.yawVel   += dxNorm * S.rotDragGain
          S.pitchVel += dyNorm * S.rotDragGain * -1 // инвертировать, чтобы движение вверх → pitch-
          // Ограничить после импульса
          if (S.yawVel   >  S.rotMaxSpeedY) S.yawVel   =  S.rotMaxSpeedY
          if (S.yawVel   < -S.rotMaxSpeedY) S.yawVel   = -S.rotMaxSpeedY
          if (S.pitchVel >  S.rotMaxSpeedX) S.pitchVel =  S.rotMaxSpeedX
          if (S.pitchVel < -S.rotMaxSpeedX) S.pitchVel = -S.rotMaxSpeedX
        }
        S.mx = nx
        S.my = ny
        S.mActive = true
        S._hadInside = true
      } else {
        S.mActive = false
        S._hadInside = false
      }
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const ro = new ResizeObserver(() => init())
    ro.observe(wrap)

    init()
    S.last = performance.now()/1000
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [
    sizeRel,
    pointsPerRow, pointsPerCol,
    stiffness, originStiffness, damping,
    mouseForce, mouseFalloff, mouseRadius, mouseRadiusRel,
    pointSize, pointColor, pointOpacity,
    autoRotation, rotationSpeed, rotationSpeedX, basePitch,
    lighting, depthBoost, lambertIntensity, specularPower, specularIntensity,
    rimIntensity, rimPower, lightDirCam,
    rotSpring, rotFriction, rotDragGain, rotMaxSpeedY, rotMaxSpeedX,
  ])

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none', // фон не блокирует клики
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          background: 'transparent',
          pointerEvents: 'none',
          touchAction: 'none',
        }}
      />
    </div>
  )
}
