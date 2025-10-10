import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Фоновая 3D-капля за формой обратной связи:
 * - Взаимодействие ТОЛЬКО при наведении на саму каплю (hover-hit).
 * - Вне капли курсор не влияет.
 * - После отталкивания капля ВСЕГДА возвращается к "якорю"
 *   — якорь автоматически ставится за форму (центр .contact-form),
 *   можно сместить через ANCHOR_OFFSET_PX.
 * - Форма капли фиксирована (пред-деформация 1 раз и по клику регенерация).
 */

export default function DropletBackground() {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ---------- ПАРАМЕТРЫ ----------
    const RADIUS = 0.1
    const SEG_W = 80
    const SEG_H = 60

    // Смещение якоря относительно центра формы (в пикселях)
    const ANCHOR_OFFSET_PX = { x: 0, y: 30 } // например, чуть ниже центра формы

    // Физика смещения центра
    const PHYS_SPRING       = 4.8
    const PHYS_DAMP         = 0.88
    const PHYS_REPULSE      = 3
    const PHYS_FIELD_RADIUS = 1.25
    const PHYS_MAX_OFFSET   = 1

    // Вращение
    const ROT_SPEED_Y = 0.32
    const ROT_SPEED_X = 0.08

    // ---------- СЦЕНА / КАМЕРА / РЕНДЕР ----------
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(
      35,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 2.0)

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    })
    let currentDPR = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(currentDPR)
    renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    renderer.shadowMap.enabled = false
    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // ---------- СВЕТ ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.22))
    const dir = new THREE.DirectionalLight(0xffffff, 0.95)
    dir.position.set(2.2, 1.6, 2.6)
    scene.add(dir)

    // ---------- КАПЛЯ (сфера высокой детализации) ----------
    let geometry = new THREE.SphereGeometry(RADIUS, SEG_W, SEG_H)

    // Пред-деформация (неровности) — фиксированная форма
    const LUMP_AMP = 2 * RADIUS
    const F1 = 2.3, F2 = 3.7, F3 = 4.1
    const MIN_R = RADIUS * 0.001

    const pos = geometry.attributes.position
    const baseDir = new Float32Array(pos.count * 3)
    {
      const v = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).normalize()
        baseDir[3*i+0] = v.x
        baseDir[3*i+1] = v.y
        baseDir[3*i+2] = v.z
      }
    }

    let PH1 = Math.random() * Math.PI * 2
    let PH2 = Math.random() * Math.PI * 2
    let PH3 = Math.random() * Math.PI * 2

    const applyShape = () => {
      const arr = pos.array
      for (let i = 0; i < pos.count; i++) {
        const nx = baseDir[3*i+0], ny = baseDir[3*i+1], nz = baseDir[3*i+2]
        const noise =
          Math.sin(nx * F1 + ny * 1.1 + 0.7 + PH1) * 0.45 +
          Math.cos(ny * F2 - nz * 0.6 + 0.2 + PH2) * 0.35 +
          Math.sin(nz * F3 + nx * 0.9 + PH3)      * 0.20

        const newR = Math.max(MIN_R, RADIUS + LUMP_AMP * noise)
        arr[3*i+0] = nx * newR
        arr[3*i+1] = ny * newR
        arr[3*i+2] = nz * newR
      }
      pos.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere() // важно для быстрой проверки hover
    }
    applyShape()

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x888888,
      shininess: 64,
    })

    const droplet = new THREE.Mesh(geometry, material)
    droplet.matrixAutoUpdate = true
    scene.add(droplet)

    // ---------- ВЕКТОРА/СОСТОЯНИЯ ----------
    const anchor = new THREE.Vector3(0, 0, 0) // будет выставлен за форму
    const vel    = new THREE.Vector3(0, 0, 0)
    const tmpV1  = new THREE.Vector3()
    const tmpV2  = new THREE.Vector3()

    // Луч/координаты курсора и плоскость z=0
    const ray = new THREE.Ray()
    const ndc = new THREE.Vector2()
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const planePoint = new THREE.Vector3()

    // Hover-флаги (репульсия — только если действительно навели на каплю)
    let havePointer = false
    let hoverDroplet = false
    const raycaster = new THREE.Raycaster()

    // ---------- ФУНКЦИИ ----------
    const screenToWorldOnPlane = (clientX, clientY, out) => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
      ray.origin.setFromMatrixPosition(camera.matrixWorld)
      ray.direction.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(ray.origin).normalize()
      return ray.intersectPlane(planeZ, out)
    }

    const updateAnchorFromForm = () => {
      // Пытаемся найти форму внутри секции #contact
      const contact = mount.closest('#contact') || document.getElementById('contact') || document
      const form = contact.querySelector('.contact-form') || document.querySelector('.contact-form')
      if (!form) { anchor.set(0, 0, 0); return }

      const rect = form.getBoundingClientRect()
      const cx = rect.left + rect.width * 0.5 + ANCHOR_OFFSET_PX.x
      const cy = rect.top  + rect.height * 0.5 + ANCHOR_OFFSET_PX.y

      if (screenToWorldOnPlane(cx, cy, tmpV1)) {
        anchor.copy(tmpV1)
      } else {
        anchor.set(0, 0, 0)
      }
    }

    // Первичная установка якоря (за формой)
    updateAnchorFromForm()

    const setPointerFromEvent = (e) => {
      havePointer = screenToWorldOnPlane(e.clientX, e.clientY, planePoint)
      if (!havePointer) { hoverDroplet = false; return }

      // Быстрый отбор: расстояние до центра меньше радиуса boundingSphere
      droplet.updateMatrixWorld()
      const centerW = droplet.getWorldPosition(tmpV1.set(0, 0, 0))
      const worldRadius = (geometry.boundingSphere?.radius || RADIUS) * droplet.scale.x
      const dist = planePoint.distanceTo(centerW)

      if (dist <= worldRadius * 1.05) {
        // Точный тест пересечения только когда достаточно близко
        raycaster.ray.copy(ray)
        const hit = raycaster.intersectObject(droplet, false)
        hoverDroplet = hit.length > 0
      } else {
        hoverDroplet = false
      }
    }

    const onPointerMove = (e) => setPointerFromEvent(e)

    // Клик по капле => регенерация формы на месте
    const onPointerDown = (e) => {
      setPointerFromEvent(e)
      if (!hoverDroplet) return
      PH1 = Math.random() * Math.PI * 2
      PH2 = Math.random() * Math.PI * 2
      PH3 = Math.random() * Math.PI * 2
      applyShape()
    }

    const onPointerLeave = () => {
      havePointer = false
      hoverDroplet = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    // ---------- RESIZE / LAYOUT ----------
    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      updateAnchorFromForm() // при изменении размеров — вернуть якорь за форму
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    // ---------- ПАУЗА РЕНДЕРА ВНЕ ВЬЮПОРТА ----------
    let inView = true
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true
      if (inView) updateAnchorFromForm()
    }, { root: null, threshold: 0.0 })
    io.observe(mount)

    // ---------- АДАПТИВНЫЙ DPR ----------
    let frameCount = 0
    let accMs = 0
    const HIGH_MS = 22.0
    const LOW_MS  = 14.0
    const DPR_MIN = 0.8
    const DPR_MAX = Math.min(2, (window.devicePixelRatio || 1))
    const adjustDPR = (avgMs) => {
      let newDPR = currentDPR
      if (avgMs > HIGH_MS && currentDPR > DPR_MIN) newDPR = Math.max(DPR_MIN, currentDPR * 0.9)
      else if (avgMs < LOW_MS && currentDPR < DPR_MAX) newDPR = Math.min(DPR_MAX, currentDPR * 1.1)
      if (Math.abs(newDPR - currentDPR) > 0.02) {
        currentDPR = newDPR
        renderer.setPixelRatio(currentDPR)
        const w = mount.clientWidth, h = mount.clientHeight
        renderer.setSize(w, h, false)
      }
    }

    // ---------- АНИМАЦИЯ ----------
    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05)
      const ms = dt * 1000

      if (inView) {
        // Вращение
        droplet.rotation.y += ROT_SPEED_Y * dt
        droplet.rotation.x += ROT_SPEED_X * dt

        // Репульсия ТОЛЬКО при наведении на каплю
        if (hoverDroplet && havePointer) {
          const centerW = droplet.getWorldPosition(tmpV1.set(0, 0, 0))
          tmpV2.copy(centerW).sub(planePoint)
          const dist = tmpV2.length()
          if (dist < PHYS_FIELD_RADIUS && dist > 1e-4) {
            tmpV2.multiplyScalar(PHYS_REPULSE / dist)
            vel.addScaledVector(tmpV2, dt)
          }
        }

        // Возврат к якорю (за формой) + демпфер
        tmpV1.copy(anchor).sub(droplet.position).multiplyScalar(PHYS_SPRING * dt)
        vel.add(tmpV1)
        vel.multiplyScalar(PHYS_DAMP)

        droplet.position.addScaledVector(vel, dt)
        if (droplet.position.length() > PHYS_MAX_OFFSET) {
          droplet.position.setLength(PHYS_MAX_OFFSET)
        }

        renderer.render(scene, camera)

        // Адаптивный DPR раз в 30 кадров
        accMs += ms
        frameCount++
        if (frameCount >= 30) {
          adjustDPR(accMs / frameCount)
          accMs = 0
          frameCount = 0
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // ---------- ОЧИСТКА ----------
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerleave', onPointerLeave)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,            // остается за формой
        pointerEvents: 'none' // не блокирует элементы формы
      }}
      aria-hidden
    />
  )
}
