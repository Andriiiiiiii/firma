import React, { useEffect, useRef } from 'react'

export default function SphericalLattice(props) {
  const {
    // ===== Экранный размер =====
    sizeRel = 0.62,

    // ===== Геометрия =====
    pointsPerRow = 20,
    pointsPerCol = 200,

    // ===== Физика =====
    stiffness = 5,
    originStiffness = 150,
    damping = 0.5,

    // ===== Курсор =====
    mouseForce = 1000,
    mouseFalloff = 20,
    mouseRadius,
    mouseRadiusRel = 5,
    mouseRepelGain = 0.02,

    // ===== Рендер =====
    pointSize = 1.0,
    pointColor = '#ffffff',
    pointOpacity = 0.85,

    // ===== Камера / «целевая» автокрутка =====
    autoRotation = true,
    rotationSpeed = 2,
    rotationSpeedX = 2,
    basePitch = -0.25,

    // ===== Освещение =====
    lighting = true,
    depthBoost = 0.1,
    lambertIntensity = 0.8,
    specularPower = 10,
    specularIntensity = 0.9,
    rimIntensity = 0.2,
    rimPower = 10.0,
    lightDirCam = [0.4, 0.6, 1.0],

    // ===== Инерция вращения =====
    rotSpring = 0.01,
    rotFriction = 2,
    rotDragGain = 20,
    rotMaxSpeedY,
    rotMaxSpeedX,

    // ===== Старт/подтягивание =====
    initialYawVel,
    initialPitchVel,
    pullToTarget,

    className,
    style,
  } = props

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })

    // ======= Состояние (храним всё в одном объекте и TypedArrays) =======
    const S = {
      // экраны/камера
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      w: 0, h: 0, camDist: 3.5, focalPx: 600,
      last: 0, acc: 0,

      // сетка
      cols: Math.max(8, pointsPerRow | 0),
      rows: Math.max(6, pointsPerCol | 0),
      count: 0,
      R: 1, R2: 1, invR: 1,
      sizeRel,

      // точки/скорости/оригиналы
      px: null, py: null, pz: null,
      vx: null, vy: null, vz: null,
      ox: null, oy: null, oz: null,

      // соседства и покоевые длины
      nbr: null, rest: null,

      // проекция/вращённые координаты
      sx: null, sy: null, zc: null,
      rx: null, ry: null, rz: null,

      // рисование
      sprite: null, spriteW: 0, spriteH: 0,

      // указатель/drag
      pointerInside: false,
      isPointerDown: false,
      mx: 0, my: 0, prevMx: 0, prevMy: 0,
      dAccumX: 0, dAccumY: 0,
      hasHit: false,
      // предсозданные временные буферы для hit-test (без аллокаций в кадре)
      pick: new Float32Array(3),
      pickDirN: new Float32Array(3),
      roW: new Float32Array([0, 0, 0]),
      rdW: new Float32Array([0, 0, 0]),
      ro:  new Float32Array(3),
      rd:  new Float32Array(3),
      phiMax: 0.5, cosPhiMax: Math.cos(0.5),

      // вращение
      yaw: 0, pitch: 0,
      yawVel: 0, pitchVel: 0,

      // опции (кешируем в S для быстрых чтений в горячих циклах)
      stiffness, originStiffness, damping,
      mouseForce, mouseFalloff, mouseRepelGain,
      mouseRadiusWorld: 1,

      pointSize, pointOpacity, pointColor,
      lighting, depthBoost, lambertIntensity, specularPower, specularIntensity,
      rimIntensity, rimPower,

      light: new Float32Array(3),
      autoRotation, rotationSpeed, rotationSpeedX, basePitch,
      rotSpring, rotFriction, rotDragGain,
      rotMaxSpeedY: (typeof rotMaxSpeedY === 'number')
        ? Math.max(0.05, rotMaxSpeedY)
        : Math.max(1.2, (rotationSpeed || 0.1) * 3),
      rotMaxSpeedX: (typeof rotMaxSpeedX === 'number')
        ? Math.max(0.05, rotMaxSpeedX)
        : Math.max(0.6, Math.abs(rotationSpeedX || 0.1) * 3),

      // матрицы (Float32Array/9) — без аллокаций в кадре
      rotM: new Float32Array(9),
      invRot: new Float32Array(9),

      // режим подтягивания
      followTarget:
        typeof pullToTarget === 'boolean'
          ? pullToTarget
          : !(typeof initialYawVel === 'number' || typeof initialPitchVel === 'number'),
    }

    // ======== Утилиты (без аллокаций) ========
    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v))

    const buildRotation = (yaw, pitch, out) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw)
      const cx = Math.cos(pitch), sx = Math.sin(pitch)
      // Ry * Rx
      out[0] = cy;      out[1] = 0;   out[2] = -sy
      out[3] = sy*sx;   out[4] = cx;  out[5] = cy*sx
      out[6] = sy*cx;   out[7] = -sx; out[8] = cy*cx
    }

    const invertRotation = (m, out) => { // ортонормальная → transpose
      out[0]=m[0]; out[1]=m[3]; out[2]=m[6]
      out[3]=m[1]; out[4]=m[4]; out[5]=m[7]
      out[6]=m[2]; out[7]=m[5]; out[8]=m[8]
    }

    const invLen3 = (x,y,z) => 1.0 / Math.sqrt(x*x + y*y + z*z || 1)

    // нормируем свет (единоразово)
    {
      const invL = invLen3(lightDirCam[0], lightDirCam[1], lightDirCam[2])
      S.light[0] = lightDirCam[0]*invL
      S.light[1] = lightDirCam[1]*invL
      S.light[2] = lightDirCam[2]*invL
    }

    // offscreen-спрайт (один раз)
    const makeSprite = () => {
      const dpr = S.dpr
      const r = Math.max(0.5, S.pointSize)
      const w = Math.ceil(r*2*dpr)
      const off = document.createElement('canvas')
      off.width = w
      off.height = w
      const c = off.getContext('2d', { desynchronized: true })
      c.fillStyle = S.pointColor
      c.beginPath()
      c.arc(w*0.5, w*0.5, (r*dpr), 0, Math.PI*2)
      c.fill()
      S.sprite = off
      S.spriteW = w
      S.spriteH = w
    }

    const computeRadiusFromSizeRel = () => {
      const minDim = Math.min(S.w, S.h)
      const screenR = clamp(S.sizeRel, 0.05, 0.95) * minDim * 0.5
      const zc = S.camDist
      S.focalPx = Math.min(S.w, S.h) * 0.9
      S.R = (screenR * zc) / S.focalPx
      S.R2 = S.R * S.R
      S.invR = 1 / S.R
      S.mouseRadiusWorld = (typeof mouseRadius === 'number')
        ? mouseRadius
        : clamp(mouseRadiusRel, 0.05, 2.0) * S.R
      S.phiMax = clamp(S.mouseRadiusWorld / S.R, 0.01, Math.PI)
      S.cosPhiMax = Math.cos(S.phiMax)
    }

    const init = () => {
      const rect = wrap.getBoundingClientRect()
      S.w = (rect.width | 0) || 1
      S.h = (rect.height | 0) || 1
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)

      const cw = Math.max(1, (S.w * S.dpr) | 0)
      const ch = Math.max(1, (S.h * S.dpr) | 0)
      if (canvas.width !== cw) canvas.width = cw
      if (canvas.height !== ch) canvas.height = ch
      if (canvas.style.width !== `${S.w}px`) canvas.style.width = `${S.w}px`
      if (canvas.style.height !== `${S.h}px`) canvas.style.height = `${S.h}px`
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
      ctx.imageSmoothingEnabled = true

      computeRadiusFromSizeRel()
      makeSprite()

      S.count = S.cols * S.rows
      const N = S.count
      // Typed arrays (инициализация один раз)
      S.px = new Float32Array(N); S.py = new Float32Array(N); S.pz = new Float32Array(N)
      S.vx = new Float32Array(N); S.vy = new Float32Array(N); S.vz = new Float32Array(N)
      S.ox = new Float32Array(N); S.oy = new Float32Array(N); S.oz = new Float32Array(N)
      S.nbr = new Int32Array(N * 8)
      S.rest = new Float32Array(N * 8)
      S.sx = new Float32Array(N); S.sy = new Float32Array(N); S.zc = new Float32Array(N)
      S.rx = new Float32Array(N); S.ry = new Float32Array(N); S.rz = new Float32Array(N)

      // раскладка по сфере (без аллокаций, минимум Math)
      let k = 0
      const rows = S.rows, cols = S.cols, R = S.R
      for (let r = 0; r < rows; r++) {
        const t = (r + 0.5) / rows
        const theta = t * Math.PI
        const ct = Math.cos(theta), st = Math.sin(theta)
        for (let c = 0; c < cols; c++, k++) {
          const p = c / cols
          const phi = p * Math.PI * 2
          const cp = Math.cos(phi), sp = Math.sin(phi)
          const x = R * st * cp
          const y = R * ct
          const z = R * st * sp
          S.px[k] = S.ox[k] = x
          S.py[k] = S.oy[k] = y
          S.pz[k] = S.oz[k] = z
        }
      }

      // соседи с обёрткой по долготе; длины покоя считаем один раз
      const idx = (rr,cc) => rr*cols + cc
      const dirs = [0,1,  0,-1,  1,0,  -1,0,  1,1,  1,-1,  -1,1,  -1,-1] // плоский массив, меньше индирекций
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = idx(r,c), base = i<<3
          const ox = S.ox[i], oy = S.oy[i], oz = S.oz[i]
          for (let d = 0; d < 8; d++) {
            let rr = r + dirs[(d<<1)], cc = c + dirs[(d<<1)+1]
            if (cc < 0) cc = cols - 1
            else if (cc >= cols) cc = 0
            if (rr < 0 || rr >= rows) { S.nbr[base+d] = -1; S.rest[base+d] = 0; continue }
            const j = idx(rr,cc)
            S.nbr[base+d] = j
            const dx = S.ox[j]-ox, dy = S.oy[j]-oy, dz = S.oz[j]-oz
            S.rest[base+d] = Math.sqrt(dx*dx + dy*dy + dz*dz)
          }
        }
      }

      // стартовые угл. скорости
      if (typeof initialYawVel === 'number')
        S.yawVel = clamp(initialYawVel, -S.rotMaxSpeedY, S.rotMaxSpeedY)
      if (typeof initialPitchVel === 'number')
        S.pitchVel = clamp(initialPitchVel, -S.rotMaxSpeedX, S.rotMaxSpeedX)

      S.acc = 0
      S.last = performance.now()/1000
    }

    // проекция (без аллокаций)
    const projectAll = (rotM) => {
      const cx = S.w * 0.5, cy = S.h * 0.5
      const f = S.focalPx, cd = S.camDist
      const px = S.px, py = S.py, pz = S.pz
      const sx = S.sx, sy = S.sy, zc = S.zc
      const rx = S.rx, ry = S.ry, rz = S.rz
      const N = S.count

      const m0=rotM[0], m1=rotM[1], m2=rotM[2]
      const m3=rotM[3], m4=rotM[4], m5=rotM[5]
      const m6=rotM[6], m7=rotM[7], m8=rotM[8]

      for (let i = 0; i < N; i++) {
        const x = px[i], y = py[i], z = pz[i]
        const _rx = m0*x + m1*y + m2*z
        const _ry = m3*x + m4*y + m5*z
        const _rz = m6*x + m7*y + m8*z
        rx[i] = _rx; ry[i] = _ry; rz[i] = _rz

        const zz = cd - _rz
        zc[i] = zz
        const inv = 1 / zz
        sx[i] = cx + (_rx * f) * inv
        sy[i] = cy - (_ry * f) * inv
      }
    }

    // рендер (минимум переключений состояния контекста)
    const render = () => {
      ctx.clearRect(0, 0, S.w, S.h)

      const baseA = pointOpacity > 1 ? 1 : (pointOpacity < 0 ? 0 : pointOpacity)
      const r = S.pointSize
      const sprite = S.sprite
      const invR = S.invR
      const w = S.w, h = S.h
      const minX = -r - 2, maxX = w + r + 2
      const minY = -r - 2, maxY = h + r + 2

      // diffuse + rim в одном проходе
      let lastAlpha = -1
      ctx.globalCompositeOperation = 'source-over'
      const N = S.count
      const rx = S.rx, ry = S.ry, rz = S.rz
      const sx = S.sx, sy = S.sy

      if (S.lighting) {
        const lx = S.light[0], ly = S.light[1], lz = S.light[2]
        const lamI = S.lambertIntensity
        const rimI = S.rimIntensity, rimP = S.rimPower
        const depthB = S.depthBoost

        for (let i = 0; i < N; i++) {
          const x = sx[i], y = sy[i]
          if (x < minX || y < minY || x > maxX || y > maxY) continue

          const nz = rz[i] * invR
          const front = (nz + 1) * 0.5
          let alpha = baseA * (0.25 + depthB * (front > 1 ? 1 : front < 0 ? 0 : front))

          // lambert + rim
          const nx = rx[i] * invR
          const ny = ry[i] * invR
          const nl = nx*lx + ny*ly + nz*lz
          alpha *= (1 - lamI) + lamI * (nl < 0 ? 0 : nl > 1 ? 1 : nl)
          const nDotV = nz < 0 ? 0 : (nz > 1 ? 1 : nz)
          const rim = Math.pow(1 - nDotV, rimP) * rimI
          alpha += rim * 0.2
          if (alpha <= 0.001) continue

          if (alpha !== lastAlpha) { ctx.globalAlpha = alpha; lastAlpha = alpha }
          ctx.drawImage(sprite, x - r, y - r, r*2, r*2)
        }

        // specular отдельным лёгким проходом (инварианты кадра вынесены)
        if (S.specularIntensity > 0.001) {
          ctx.globalCompositeOperation = 'lighter'
          const lx2 = S.light[0], ly2 = S.light[1], lz2 = S.light[2] + 1
          const invH = 1 / Math.sqrt(lx2*lx2 + ly2*ly2 + lz2*lz2)
          const sPow = S.specularPower
          const sInt = S.specularIntensity
          const rr = r*0.9, dd = rr*2
          for (let i = 0; i < N; i++) {
            const x = sx[i], y = sy[i]
            if (x < minX || y < minY || x > maxX || y > maxY) continue
            const nx = rx[i] * invR
            const ny = ry[i] * invR
            const nz = rz[i] * invR
            const ndh = (nx*lx2 + ny*ly2 + nz*lz2) * invH
            if (ndh <= 0) continue
            const a = Math.pow(ndh, sPow) * sInt
            if (a < 0.02) continue
            if (a !== lastAlpha) { ctx.globalAlpha = a; lastAlpha = a }
            ctx.drawImage(sprite, x - rr, y - rr, dd, dd)
          }
          ctx.globalCompositeOperation = 'source-over'
        }
      } else {
        // быстрый плоский проход
        for (let i = 0; i < N; i++) {
          const x = sx[i], y = sy[i]
          if (x < minX || y < minY || x > maxX || y > maxY) continue

          const nz = rz[i] * invR
          const front = (nz + 1) * 0.5
          const alpha = baseA * (0.25 + S.depthBoost * (front > 1 ? 1 : front < 0 ? 0 : front))
          if (alpha <= 0.001) continue
          if (alpha !== lastAlpha) { ctx.globalAlpha = alpha; lastAlpha = alpha }
          ctx.drawImage(sprite, x - r, y - r, r*2, r*2)
        }
      }

      ctx.globalAlpha = 1
    }

    // ======= Физика =======
    const fixedDt = 1/60
    const maxSub = 3

    const stepPhysics = (dt) => {
      // инварианты шага
      const dampF = Math.exp(-S.damping * 10 * dt)
      const kSpring = S.stiffness
      const kAnchor = S.originStiffness
      const hasPick = S.hasHit && S.mouseRepelGain > 0
      const pnx = S.pickDirN[0], pny = S.pickDirN[1], pnz = S.pickDirN[2]
      const cosThr = S.cosPhiMax
      const denom = (1 - cosThr) || 1
      const R = S.R, invR = S.invR

      const N = S.count
      const px = S.px, py = S.py, pz = S.pz
      const vx = S.vx, vy = S.vy, vz = S.vz
      const ox = S.ox, oy = S.oy, oz = S.oz
      const nbr = S.nbr, rest = S.rest

      for (let i = 0; i < N; i++) {
        let fx = 0, fy = 0, fz = 0
        const x = px[i], y = py[i], z = pz[i]
        const base = i<<3

        // пружины
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

        // якорь
        fx += kAnchor * (ox[i]-x)
        fy += kAnchor * (oy[i]-y)
        fz += kAnchor * (oz[i]-z)

        // слабая репульсия по касательной (без аллокаций/ветвлений где можно)
        if (hasPick) {
          // нормаль текущей точки
          const invL = invLen3(x, y, z)
          const nx = x * invL, ny = y * invL, nz = z * invL
          const c = nx*pnx + ny*pny + nz*pnz
          if (c >= cosThr) {
            let tx = x - S.pick[0], ty = y - S.pick[1], tz = z - S.pick[2]
            const proj = tx*nx + ty*ny + tz*nz
            tx -= nx*proj; ty -= ny*proj; tz -= nz*proj
            const invT = invLen3(tx,ty,tz)
            if (invT > 1e-6) {
              const t = (c - cosThr) / denom
              const str = (S.mouseFalloff <= 0) ? 1 : Math.pow(t < 0 ? 0 : (t > 1 ? 1 : t), S.mouseFalloff)
              const F = S.mouseForce * S.mouseRepelGain * str
              fx += tx * invT * F
              fy += ty * invT * F
              fz += tz * invT * F
            }
          }
        }

        // интегрирование + нормализация к сфере (semi-implicit Euler)
        const nvx = (vx[i] + fx*dt) * dampF
        const nvy = (vy[i] + fy*dt) * dampF
        const nvz = (vz[i] + fz*dt) * dampF
        vx[i] = nvx; vy[i] = nvy; vz[i] = nvz

        let nx = x + nvx*dt
        let ny = y + nvy*dt
        let nz = z + nvz*dt
        const scl = R / Math.sqrt(nx*nx + ny*ny + nz*nz || 1)
        px[i] = nx * scl
        py[i] = ny * scl
        pz[i] = nz * scl
      }
    }

    // ======= Главный цикл =======
    let rafId = 0  // объявлено один раз (исправляет дубль let/const)

    const tick = (tMs) => {
      const t = tMs/1000
      let dt = t - S.last
      if (dt > 0.1) dt = 0.1
      S.last = t
      S.acc += dt

      // инерция вращения
      const follow = S.autoRotation && S.followTarget
      const targetY = follow ? S.rotationSpeed  : 0.0
      const targetX = follow ? S.rotationSpeedX : 0.0
      S.yawVel   += (targetY - S.yawVel)   * S.rotSpring * dt
      S.pitchVel += (targetX - S.pitchVel) * S.rotSpring * dt
      const fr = Math.exp(-S.rotFriction * dt)
      S.yawVel   *= fr
      S.pitchVel *= fr

      // hit-test (перерасчёт инверсии один раз/кадр при необходимости)
      S.hasHit = false
      if (S.pointerInside) {
        const cx = S.w * 0.5, cy = S.h * 0.5
        const x = (S.mx - cx) / S.focalPx
        const y = -(S.my - cy) / S.focalPx
        S.roW[0] = 0; S.roW[1] = 0; S.roW[2] = S.camDist
        const invL = 1.0 / (Math.sqrt(x*x + y*y + 1) || 1)
        S.rdW[0] = x*invL; S.rdW[1] = y*invL; S.rdW[2] = -1*invL

        invertRotation(S.rotM, S.invRot)
        const M = S.invRot
        // mulM3V3 без функций
        S.ro[0] = M[0]*S.roW[0] + M[1]*S.roW[1] + M[2]*S.roW[2]
        S.ro[1] = M[3]*S.roW[0] + M[4]*S.roW[1] + M[5]*S.roW[2]
        S.ro[2] = M[6]*S.roW[0] + M[7]*S.roW[1] + M[8]*S.roW[2]
        S.rd[0] = M[0]*S.rdW[0] + M[1]*S.rdW[1] + M[2]*S.rdW[2]
        S.rd[1] = M[3]*S.rdW[0] + M[4]*S.rdW[1] + M[5]*S.rdW[2]
        S.rd[2] = M[6]*S.rdW[0] + M[7]*S.rdW[1] + M[8]*S.rdW[2]

        const r0 = S.ro, rd = S.rd
        const b = r0[0]*rd[0] + r0[1]*rd[1] + r0[2]*rd[2]
        const c = r0[0]*r0[0] + r0[1]*r0[1] + r0[2]*r0[2] - S.R2
        const D = b*b - c
        if (D >= 0) {
          const tHit = -b - Math.sqrt(D)
          if (tHit >= 0) {
            S.pick[0] = r0[0] + rd[0]*tHit
            S.pick[1] = r0[1] + rd[1]*tHit
            S.pick[2] = r0[2] + rd[2]*tHit
            const invP = S.invR
            S.pickDirN[0] = S.pick[0] * invP
            S.pickDirN[1] = S.pick[1] * invP
            S.pickDirN[2] = S.pick[2] * invP
            S.hasHit = true
          }
        }
      }

      // импульсы от drag (накапливаем нормализованное смещение)
      if (S.isPointerDown && S.hasHit) {
        S.yawVel   += S.dAccumX * S.rotDragGain
        S.pitchVel += -S.dAccumY * S.rotDragGain
        S.dAccumX = 0; S.dAccumY = 0
      } else {
        S.dAccumX = 0; S.dAccumY = 0
      }

      // лимиты ω
      const maxY = S.rotMaxSpeedY, maxX = S.rotMaxSpeedX
      if (S.yawVel   >  maxY) S.yawVel   =  maxY
      else if (S.yawVel < -maxY) S.yawVel = -maxY
      if (S.pitchVel >  maxX) S.pitchVel =  maxX
      else if (S.pitchVel < -maxX) S.pitchVel = -maxX

      // углы и матрица
      S.yaw   += S.yawVel   * dt
      S.pitch += S.pitchVel * dt
      buildRotation(S.yaw, S.basePitch + S.pitch, S.rotM)

      // физика (фикс. шаги, максимум 3 — меньше дрожи и CPU)
      let steps = 0
      while (S.acc >= fixedDt && steps < maxSub) {
        stepPhysics(fixedDt)
        S.acc -= fixedDt
        steps++
      }

      // рендер
      projectAll(S.rotM)
      render()

      rafId = requestAnimationFrame(tick)
    }

    // ======= События (стабильные обработчики) =======
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
        const invMin = 1 / minDim
        S.dAccumX += (nx - S.mx) * invMin
        S.dAccumY += (ny - S.my) * invMin
      }
      S.prevMx = S.mx; S.prevMy = S.my
      S.mx = nx; S.my = ny
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
    initialYawVel, initialPitchVel, pullToTarget,
  ])

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        ...(style || {}),
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
