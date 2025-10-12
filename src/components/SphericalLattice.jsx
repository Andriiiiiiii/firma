import React, { useEffect, useRef } from 'react'

export default function SphericalLattice({
  // ===== Экранный размер =====
  sizeRel = 0.62,         // доля от min(w,h) для ДИАМЕТРА сферы (масштаб на экране)

  // ===== Геометрия сетки =====
  pointsPerRow = 20,      // число «долгот»
  pointsPerCol = 200,      // число «широт»

  // ===== Физика точек =====
  stiffness = 5,         // упругость пружин между соседями (жёсткость «ткани»)
  originStiffness = 150,   // «якорь» к исходной позиции (держит форму сферы)
  damping = 0.7,         // вязкость/затухание скоростей точек7
  // ===== Курсор =====
  mouseForce = 1000,       // базовая сила взаимодействия
  mouseFalloff = 20,       // 0 = сила почти постоянна в пределах радиуса (быстрее)
  mouseRadius,            // опционально: радиус влияния в мировых единицах
  mouseRadiusRel = 5,     // иначе — доля от R (большое значение = почти вся сфера)
  mouseRepelGain = 0.02,  // слабое отталкивание как доля от mouseForce

  // ===== Рендер =====
  pointSize = 1.0,
  pointColor = '#ffffff',
  pointOpacity = 0.85,

  // ===== Камера / автоповорот =====
  autoRotation = true,
  rotationSpeed = 2,   // целевая ω по Y (yaw)
  basePitch = -0.25,      // базовый наклон по X (добавляется к динамическому pitch)

  // ===== Освещение =====
  lighting = true,
  depthBoost = 0.1,
  lambertIntensity = 0.8,
  specularPower = 10,
  specularIntensity = 0.9,
  rimIntensity = 0.2,
  rimPower = 10.0,
  lightDirCam = [0.4, 0.6, 1.0],

  // ===== Инерция вращения (двухосевая) =====
  rotationSpeedX = 2,  // целевая ω по X (pitch)
  rotSpring = 0.01,        // как быстро текущая ω тянется к целевой (1/с)
  rotFriction = 2,      // экспоненциальное затухание ω (1/с)
  rotDragGain = 20,      // чувствительность drag-жеста → приращение ω
  rotMaxSpeedY,           // лимит |yawVel|
  rotMaxSpeedX,           // лимит |pitchVel|

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
      // ===== общие =====
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      w: 0, h: 0,
      camDist: 3.5,
      focalPx: 600,
      last: 0, acc: 0,
      cols: Math.max(8, pointsPerRow | 0),
      rows: Math.max(6, pointsPerCol | 0),
      count: 0,
      R: 1, R2: 1,
      sizeRel,

      // массивы
      px: null, py: null, pz: null,
      vx: null, vy: null, vz: null,
      ox: null, oy: null, oz: null,
      nbr: null, rest: null,
      sx: null, sy: null, zc: null,
      rx: null, ry: null, rz: null,

      // рендер-спрайт точки
      sprite: null, spriteW: 0, spriteH: 0,

      // курсор/drag
      pointerInside: false,
      isPointerDown: false,
      mx: 0, my: 0,         // текущие координаты (в local space блока)
      prevMx: 0, prevMy: 0, // предыдущие
      dAccumX: 0, dAccumY: 0, // накопленные deltas (нормированные), применяются в tick
      hasHit: false,          // есть пересечение луча с сферой в текущем кадре
      pick: [0,0,0],          // точка пересечения (object space)
      pickDirN: [0,0,0],      // нормализованное направление (pick / R)
      phiMax: 0.5, cosPhiMax: Math.cos(0.5), // радиус влияния в углах

      // вращение
      yaw: 0, pitch: 0,
      yawVel: 0, pitchVel: 0,

      // опции
      stiffness, originStiffness, damping,
      mouseForce, mouseFalloff, mouseRepelGain,
      mouseRadiusWorld: 1,

      pointSize, pointOpacity, pointColor,
      lighting, depthBoost, lambertIntensity, specularPower, specularIntensity,
      rimIntensity, rimPower,

      light: [0,0,1],
      autoRotation, rotationSpeed, rotationSpeedX, basePitch,
      rotSpring, rotFriction, rotDragGain,
      rotMaxSpeedY: (typeof rotMaxSpeedY === 'number')
        ? Math.max(0.05, rotMaxSpeedY)
        : Math.max(1.2, rotationSpeed * 3),
      rotMaxSpeedX: (typeof rotMaxSpeedX === 'number')
        ? Math.max(0.05, rotMaxSpeedX)
        : Math.max(0.6, Math.abs(rotationSpeedX) * 3),

      // матрицы поворота, обновляются в tick и переиспользуются
      rotM: new Float32Array(9),
      invRot: new Float32Array(9),
    }

    // ===== утилиты (без аллокаций) =====
    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v))
    const buildRotation = (yaw, pitch, out) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw)
      const cx = Math.cos(pitch), sx = Math.sin(pitch)
      // Ry * Rx
      out[0] = cy;      out[1] = 0;   out[2] = -sy
      out[3] = sy*sx;   out[4] = cx;  out[5] = cy*sx
      out[6] = sy*cx;   out[7] = -sx; out[8] = cy*cx
    }
    const invertRotation = (m, out) => { // для ортонормальной: transpose
      out[0]=m[0]; out[1]=m[3]; out[2]=m[6]
      out[3]=m[1]; out[4]=m[4]; out[5]=m[7]
      out[6]=m[2]; out[7]=m[5]; out[8]=m[8]
    }
    const mulM3V3 = (m, x, y, z, out) => {
      out[0] = m[0]*x + m[1]*y + m[2]*z
      out[1] = m[3]*x + m[4]*y + m[5]*z
      out[2] = m[6]*x + m[7]*y + m[8]*z
    }
    const dot3 = (ax,ay,az,bx,by,bz) => ax*bx + ay*by + az*bz
    const invLen3 = (x,y,z) => 1.0 / Math.sqrt(x*x + y*y + z*z || 1)

    // нормируем свет один раз
    {
      const invL = invLen3(lightDirCam[0], lightDirCam[1], lightDirCam[2])
      S.light[0] = lightDirCam[0]*invL
      S.light[1] = lightDirCam[1]*invL
      S.light[2] = lightDirCam[2]*invL
    }

    // offscreen-спрайт круга (быстрее, чем тысячи arc())
    const makeSprite = () => {
      const dpr = S.dpr
      const r = Math.max(0.5, S.pointSize)
      const w = Math.ceil(r*2*dpr)
      const h = w
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const c = off.getContext('2d')
      c.fillStyle = S.pointColor
      c.beginPath()
      c.arc(w*0.5, h*0.5, (r*dpr), 0, Math.PI*2)
      c.fill()
      S.sprite = off
      S.spriteW = w
      S.spriteH = h
    }

    const computeRadiusFromSizeRel = () => {
      const minDim = Math.min(S.w, S.h)
      const screenR = clamp(S.sizeRel, 0.05, 0.95) * minDim * 0.5
      const zc = S.camDist
      S.focalPx = Math.min(S.w, S.h) * 0.9
      S.R = (screenR * zc) / S.focalPx
      S.R2 = S.R * S.R
      S.mouseRadiusWorld = (typeof mouseRadius === 'number')
        ? mouseRadius
        : clamp(mouseRadiusRel, 0.05, 2.0) * S.R
      S.phiMax = clamp(S.mouseRadiusWorld / S.R, 0.01, Math.PI)
      S.cosPhiMax = Math.cos(S.phiMax) // для быстрого сравнения без acos
    }

    const init = () => {
      const rect = wrap.getBoundingClientRect()
      S.w = Math.max(1, rect.width | 0)
      S.h = Math.max(1, rect.height | 0)
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.max(1, (S.w * S.dpr) | 0)
      canvas.height = Math.max(1, (S.h * S.dpr) | 0)
      canvas.style.width = `${S.w}px`
      canvas.style.height = `${S.h}px`
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
      ctx.imageSmoothingEnabled = true

      computeRadiusFromSizeRel()
      makeSprite()

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

      // раскладка по сфере (равномерная по широтам/долготам)
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
        }
      }

      // соседи (8-направлений) с обёрткой по долготе
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
            S.rest[base+d] = Math.sqrt(dx*dx + dy*dy + dz*dz)
          }
        }
      }

      S.acc = 0
      S.last = performance.now()/1000
    }

    const projectAll = (rotM) => {
      const cx = S.w * 0.5, cy = S.h * 0.5
      const f = S.focalPx, cd = S.camDist
      const px = S.px, py = S.py, pz = S.pz
      const sx = S.sx, sy = S.sy, zc = S.zc
      const rx = S.rx, ry = S.ry, rz = S.rz

      for (let i = 0; i < S.count; i++) {
        const x = px[i], y = py[i], z = pz[i]
        const _rx = rotM[0]*x + rotM[1]*y + rotM[2]*z
        const _ry = rotM[3]*x + rotM[4]*y + rotM[5]*z
        const _rz = rotM[6]*x + rotM[7]*y + rotM[8]*z
        rx[i] = _rx; ry[i] = _ry; rz[i] = _rz

        const zz = cd - _rz
        zc[i] = zz
        const inv = 1 / zz
        sx[i] = cx + (_rx * f) * inv
        sy[i] = cy - (_ry * f) * inv
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, S.w, S.h)
      const baseA = clamp(S.pointOpacity, 0, 1)
      const r = S.pointSize
      const sprite = S.sprite

      // базовый проход (глубина + ламберт + rim в альфу)
      for (let i = 0; i < S.count; i++) {
        const x = S.sx[i], y = S.sy[i]
        if (x < -10 || y < -10 || x > S.w + 10 || y > S.h + 10) continue

        // глубина → front [0..1]
        const front = clamp((S.rz[i] / S.R + 1) * 0.5, 0, 1)
        let alpha = baseA * (0.25 + S.depthBoost * front)

        if (S.lighting) {
          const nx = S.rx[i] / S.R, ny = S.ry[i] / S.R, nz = S.rz[i] / S.R
          const nl = clamp(nx*S.light[0] + ny*S.light[1] + nz*S.light[2], 0, 1)
          alpha *= (1 - S.lambertIntensity) + S.lambertIntensity * nl

          // rim (edge highlight)
          const nDotV = nz // камера ≈ (0,0,1)
          const rim = Math.pow(1 - Math.max(0, nDotV), S.rimPower) * S.rimIntensity
          alpha = clamp(alpha + rim * 0.2, 0, 1)
        }

        if (alpha <= 0.001) continue
        ctx.globalAlpha = alpha
        ctx.drawImage(sprite, x - r, y - r, r*2, r*2)
      }

      // спекуляр (аддитив)
      if (S.lighting && S.specularIntensity > 0.001) {
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < S.count; i++) {
          const x = S.sx[i], y = S.sy[i]
          if (x < -10 || y < -10 || x > S.w + 10 || y > S.h + 10) continue
          const nx = S.rx[i] / S.R, ny = S.ry[i] / S.R, nz = S.rz[i] / S.R
          // half-vector ≈ light + view(0,0,1)
          const hx = S.light[0], hy = S.light[1], hz = S.light[2] + 1
          const invH = invLen3(hx, hy, hz)
          const ndh = clamp((nx*hx + ny*hy + nz*hz) * invH, 0, 1)
          const a = Math.pow(ndh, S.specularPower) * S.specularIntensity
          if (a < 0.02) continue
          ctx.globalAlpha = a
          ctx.drawImage(sprite, x - r*0.9, y - r*0.9, r*1.8, r*1.8)
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.globalAlpha = 1
    }

    // ===== физика =====
    const fixedDt = 1/60
    const maxSub = 3

    const stepPhysics = (dt) => {
      const dampF = Math.exp(-S.damping * 10 * dt)
      const px = S.px, py = S.py, pz = S.pz
      const vx = S.vx, vy = S.vy, vz = S.vz
      const ox = S.ox, oy = S.oy, oz = S.oz
      const nbr = S.nbr, rest = S.rest
      const kSpring = S.stiffness, kAnchor = S.originStiffness

      // данные для репульсии (подготовлены в tick)
      const hasPick = S.hasHit && S.mouseRepelGain > 0
      const pnx = S.pickDirN[0], pny = S.pickDirN[1], pnz = S.pickDirN[2]
      const cosThr = S.cosPhiMax
      // для линейной аппроксимации «t = 1 - ang/phiMax» через косинусы
      // map cos ∈ [cosPhiMax..1] → t ∈ [0..1]:  t ≈ (cos - cosPhiMax) / (1 - cosPhiMax)
      const denom = (1 - cosThr) || 1

      for (let i = 0; i < S.count; i++) {
        let fx = 0, fy = 0, fz = 0
        const x = px[i], y = py[i], z = pz[i]
        const base = i*8

        // пружины (Hooke)
        // NB: всё в локальных переменных, минимум виртуальных вызовов
        for (let d = 0; d < 8; d++) {
          const j = nbr[base+d]
          if (j < 0) continue
          const dx = px[j]-x, dy = py[j]-y, dz = pz[j]-z
          const dist2 = dx*dx + dy*dy + dz*dz
          if (dist2 < 1e-12) continue
          const dist = Math.sqrt(dist2)
          const f = kSpring * (dist - rest[base+d]) / dist
          fx += dx * f; fy += dy * f; fz += dz * f
        }

        // якорь к исходной позиции
        fx += kAnchor * (ox[i]-x)
        fy += kAnchor * (oy[i]-y)
        fz += kAnchor * (oz[i]-z)

        // слабая репульсия по касательной (без acos)
        if (hasPick) {
          // нормаль в точке (единичный вектор)
          const invL = invLen3(x, y, z)
          const nx = x * invL, ny = y * invL, nz = z * invL

          // cos(угла) между нормалью точки и направлением pick
          const c = nx*pnx + ny*pny + nz*pnz // ∈ [-1..1]
          if (c >= cosThr) {
            // касательная компонента ОТ pick к точке
            // v = (x - pick) - proj_n((x - pick))  ; но чтобы не трогать радиус, берём проекцию на касательную к нормали в точке
            let tx = x - S.pick[0], ty = y - S.pick[1], tz = z - S.pick[2]
            const proj = tx*nx + ty*ny + tz*nz
            tx -= nx*proj; ty -= ny*proj; tz -= nz*proj
            const invT = invLen3(tx,ty,tz)
            if (invT > 1e-6) {
              const t = ((c - cosThr) / denom) // [0..1]
              const str = (mouseFalloff <= 0) ? 1 : Math.pow(clamp(t,0,1), mouseFalloff)
              const F = mouseForce * mouseRepelGain * str
              fx += tx * invT * F
              fy += ty * invT * F
              fz += tz * invT * F
            }
          }
        }

        // интегрирование + возврат на идеальную сферу
        const nvx = (vx[i] + fx*dt) * dampF
        const nvy = (vy[i] + fy*dt) * dampF
        const nvz = (vz[i] + fz*dt) * dampF
        vx[i] = nvx; vy[i] = nvy; vz[i] = nvz

        let nx = x + nvx*dt
        let ny = y + nvy*dt
        let nz = z + nvz*dt
        const invLen = S.R / Math.sqrt(nx*nx + ny*ny + nz*nz || 1)
        px[i] = nx * invLen
        py[i] = ny * invLen
        pz[i] = nz * invLen
      }
    }

    // ===== главный цикл =====
    let rafId = 0 // <-- объявляем ОДИН раз

    const tick = (tMs) => {
      const t = tMs/1000
      let dt = t - S.last
      if (dt > 0.1) dt = 0.1
      S.last = t
      S.acc += dt

      // инерция вращения к целевым ω + трение
      const ty = S.autoRotation ? S.rotationSpeed  : 0.0
      const tx = S.autoRotation ? S.rotationSpeedX : 0.0
      S.yawVel   += (ty - S.yawVel)   * S.rotSpring * dt
      S.pitchVel += (tx - S.pitchVel) * S.rotSpring * dt
      const fr = Math.exp(-S.rotFriction * dt)
      S.yawVel   *= fr
      S.pitchVel *= fr

      // hit-test (один раз в кадр) + подготовка pickDirN/cosPhi
      S.hasHit = false
      if (S.pointerInside) {
        // экран → луч в world
        const cx = S.w * 0.5, cy = S.h * 0.5
        const x = (S.mx - cx) / S.focalPx
        const y = -(S.my - cy) / S.focalPx
        const roW = [0,0,S.camDist]
        const invL = invLen3(x, y, -1)
        const rdW = [x*invL, y*invL, -1*invL]

        // world → object
        invertRotation(S.rotM, S.invRot) // rotM обновим чуть ниже; на первом кадре ок
        const ro = [0,0,0], rd = [0,0,0]
        mulM3V3(S.invRot, roW[0], roW[1], roW[2], ro)
        mulM3V3(S.invRot, rdW[0], rdW[1], rdW[2], rd)

        // пересечение луча со сферой (центр 0, радиус R): (-b - sqrt(b^2 - c))
        const b = dot3(ro[0],ro[1],ro[2], rd[0],rd[1],rd[2])
        const c = dot3(ro[0],ro[1],ro[2], ro[0],ro[1],ro[2]) - S.R2
        const D = b*b - c
        if (D >= 0) {
          const tHit = -b - Math.sqrt(D)
          if (tHit >= 0) {
            S.pick[0] = ro[0] + rd[0]*tHit
            S.pick[1] = ro[1] + rd[1]*tHit
            S.pick[2] = ro[2] + rd[2]*tHit
            const invP = 1 / S.R
            S.pickDirN[0] = S.pick[0] * invP
            S.pickDirN[1] = S.pick[1] * invP
            S.pickDirN[2] = S.pick[2] * invP
            S.hasHit = true
          }
        }
      }

      // применяем «накопленные» импульсы вращения только если ЛКМ зажата и действительно попали в сферу
      if (S.isPointerDown && S.hasHit) {
        S.yawVel   += S.dAccumX * S.rotDragGain
        S.pitchVel += -S.dAccumY * S.rotDragGain
        // сброс накопленных дельт
        S.dAccumX = 0
        S.dAccumY = 0
      } else {
        // если не вращаем — аккумулировать не нужно
        S.dAccumX = 0
        S.dAccumY = 0
      }

      // лимиты ω
      if (S.yawVel   >  S.rotMaxSpeedY) S.yawVel   =  S.rotMaxSpeedY
      if (S.yawVel   < -S.rotMaxSpeedY) S.yawVel   = -S.rotMaxSpeedY
      if (S.pitchVel >  S.rotMaxSpeedX) S.pitchVel =  S.rotMaxSpeedX
      if (S.pitchVel < -S.rotMaxSpeedX) S.pitchVel = -S.rotMaxSpeedX

      // обновляем углы и матрицы
      S.yaw   += S.yawVel   * dt
      S.pitch += S.pitchVel * dt
      buildRotation(S.yaw, S.basePitch + S.pitch, S.rotM)

      // фиксированная физика
      let steps = 0
      while (S.acc >= fixedDt && steps < maxSub) {
        stepPhysics(fixedDt)
        S.acc -= fixedDt
        steps++
      }

      // проекция + рендер
      projectAll(S.rotM)
      render()
      rafId = requestAnimationFrame(tick)
    }

    // ===== события мыши/тач (лёгкие!) =====
    const onPointerMove = (e) => {
      const rect = wrap.getBoundingClientRect()
      const x = e.clientX, y = e.clientY
      const inside = (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
      S.pointerInside = inside
      if (!inside) return

      const nx = x - rect.left
      const ny = y - rect.top

      if (S.isPointerDown) {
        const minDim = Math.max(1, Math.min(rect.width, rect.height))
        // аккумулируем нормализованные dx/dy — применим в tick, если попали в сферу
        S.dAccumX += (nx - S.mx) / minDim
        S.dAccumY += (ny - S.my) / minDim
      }

      S.prevMx = S.mx
      S.prevMy = S.my
      S.mx = nx
      S.my = ny
    }
    const onPointerDown = (e) => { if (e.button === 0) S.isPointerDown = true }
    const onPointerUp = () => { S.isPointerDown = false }
    const onPointerCancel = () => { S.isPointerDown = false }
    const onBlur = () => { S.isPointerDown = false }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })
    window.addEventListener('blur', onBlur, { passive: true })

    const ro = new ResizeObserver(() => init())
    ro.observe(wrap)

    init()
    S.last = performance.now()/1000
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onBlur)
    }
  }, [
    sizeRel,
    pointsPerRow, pointsPerCol,
    stiffness, originStiffness, damping,
    mouseForce, mouseFalloff, mouseRadius, mouseRadiusRel, mouseRepelGain,
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
        pointerEvents: 'none', // холст не перехватывает клики; слушаем window
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
