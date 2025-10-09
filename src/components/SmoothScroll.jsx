import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

/**
 * Плавная инерционная прокрутка:
 *  • мягкий snap к слайдам (softSnap)
 *  • ослабление прокрутки только у выбранных якорей (slideSlowdown.targetSelector)
 *
 * Пропсы:
 *  - locked: boolean
 *  - onScroll: (y:number) => void
 *  - coeffs: { wheel?, touch?, impulse?, inertiaBoost?, decay?, ease? }
 *  - softSnap: {
 *      enabled?, selector?, threshold?, strength?, velocityLimit?
 *    }
 *  - slideSlowdown: {
 *      enabled?: boolean,           // вкл/выкл механики (по умолчанию true)
 *      targetSelector?: string|null,// КАКИЕ якоря тормозить (например, '#intro')
 *      radius?: number,             // зона вокруг якоря (<=1 ⇒ доля vh; >1 ⇒ px)
 *      minFactor?: number,          // минимальная чувствительность в центре (0..1)
 *      exponent?: number,           // нелинейность ослабления (>=1)
 *      deadband?: number,           // мёртвая зона вокруг якоря (<=1 ⇒ доля vh; >1 ⇒ px)
 *      applyPower?: number          // степень влияния slow-фактора на дельту/инерцию
 *    }
 *
 * Публичный API: ref.scrollTo(y, smooth?), ref.getCurrentScroll()
 */
const SmoothScroll = forwardRef(
  (
    {
      children,
      locked = false,
      onScroll,
      coeffs = {},
      softSnap = {},
      slideSlowdown = {},
    },
    ref
  ) => {
    const containerRef = useRef(null)
    const contentRef = useRef(null)
    const rafRef = useRef(null)

    const scrollDataRef = useRef({
      current: 0,
      target: 0,
      ease: 0.085,
      velocity: 0,
      lastTime: 0,
      maxScroll: 0,
      isScrolling: false,
    })

    useImperativeHandle(ref, () => ({
      scrollTo: (target, smooth = true) => {
        const data = scrollDataRef.current
        const clamped = Math.max(0, Math.min(target, data.maxScroll || 0))
        if (smooth) data.target = clamped
        else data.current = data.target = clamped
      },
      getCurrentScroll: () => scrollDataRef.current.current,
    }))

    useEffect(() => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) return

      const data = scrollDataRef.current

      // --- Коэффициенты скролла ---
      const WHEEL = coeffs?.wheel ?? 1.1
      const TOUCH = coeffs?.touch ?? 1.1
      const IMPULSE = coeffs?.impulse ?? 0.1
      const INERTIA_BOOST = coeffs?.inertiaBoost ?? 0.1
      const DECAY = coeffs?.decay ?? 0.1
      data.ease = coeffs?.ease ?? 0.0085

      // --- Мягкий snap (везде) ---
      const SNAP_ENABLED = softSnap?.enabled ?? true
      const SNAP_SELECTOR = softSnap?.selector ?? '.page-section, .snap-section'
      const SNAP_THRESHOLD = softSnap?.threshold ?? 0.22
      const SNAP_STRENGTH = softSnap?.strength ?? 0.06
      const SNAP_VEL_LIMIT = softSnap?.velocityLimit ?? 10

      // --- Ослабление прокрутки — ТОЛЬКО для выбранных якорей ---
      const SLOW_ENABLED = slideSlowdown?.enabled ?? true
      const SLOW_TARGET_SELECTOR = slideSlowdown?.targetSelector ?? null // например, '#intro'
      const SLOW_RADIUS = slideSlowdown?.radius ?? 0.65
      const SLOW_MIN = slideSlowdown?.minFactor ?? 0.12
      const SLOW_EXP = slideSlowdown?.exponent ?? 3
      const SLOW_DEADBAND = slideSlowdown?.deadband ?? 0.06
      const APPLY_POW = slideSlowdown?.applyPower ?? 2

      let anchorsSnap = [] // все секции для магнитов
      let anchorsSlow = [] // только выбранные секции для ослабления

      const toPx = (v) => (v <= 1 ? v * window.innerHeight : v)
      const thresholdPx = () =>
        SNAP_THRESHOLD <= 1 ? SNAP_THRESHOLD * window.innerHeight : SNAP_THRESHOLD
      const slowdownRadiusPx = () => toPx(SLOW_RADIUS)
      const deadbandPx = () => toPx(SLOW_DEADBAND)

      const collectOffsets = (selector) =>
        Array.from(content.querySelectorAll(selector)).map((n) => n.offsetTop)

      const updateAnchors = () => {
        anchorsSnap = collectOffsets(SNAP_SELECTOR)
        anchorsSlow =
          SLOW_TARGET_SELECTOR ? collectOffsets(SLOW_TARGET_SELECTOR) : []
      }

      const updateMaxScroll = () => {
        data.maxScroll = Math.max(0, content.scrollHeight - window.innerHeight)
      }

      const getSlowFactor = () => {
        if (!SLOW_ENABLED || anchorsSlow.length === 0) return 1
        const r = slowdownRadiusPx()
        if (r <= 0) return 1

        const pos = data.target
        let dmin = Infinity
        for (let i = 0; i < anchorsSlow.length; i++) {
          const d = Math.abs(anchorsSlow[i] - pos)
          if (d < dmin) dmin = d
        }

        if (dmin >= r) return 1 // вне зоны — обычная чувствительность

        const db = Math.max(0, deadbandPx())
        if (dmin <= db) return SLOW_MIN // мёртвая зона — минимальная чувствительность

        const t = Math.max(0, Math.min(1, (dmin - db) / Math.max(1, r - db)))
        const shaped = Math.pow(t, Math.max(1, SLOW_EXP))
        return SLOW_MIN + (1 - SLOW_MIN) * shaped
      }

      // --- Ввод: колесо ---
      const onWheel = (e) => {
        if (locked) return
        e.preventDefault()

        let delta = e.deltaY
        if (e.deltaMode === 1) delta *= 33
        else if (e.deltaMode === 2) delta *= window.innerHeight

        const slow = getSlowFactor()
        const eff = Math.pow(slow, APPLY_POW)

        data.target += delta * WHEEL * eff
        data.target = Math.max(0, Math.min(data.target, data.maxScroll))
        data.velocity += delta * IMPULSE * eff
      }

      // --- Ввод: тач ---
      let lastTouchY = 0
      let touchStart = 0
      let touchStartTime = 0

      const onTouchStart = (e) => {
        if (locked) return
        touchStart = e.touches[0].clientY
        lastTouchY = touchStart
        touchStartTime = Date.now()
        data.velocity = 0
      }

      const onTouchMove = (e) => {
        if (locked) return
        e.preventDefault()
        const y = e.touches[0].clientY
        const delta = lastTouchY - y
        lastTouchY = y

        const slow = getSlowFactor()
        const eff = Math.pow(slow, APPLY_POW)

        data.target += delta * TOUCH * eff
        data.target = Math.max(0, Math.min(data.target, data.maxScroll))
      }

      const onTouchEnd = (e) => {
        if (locked) return
        const y = e.changedTouches[0].clientY
        const dy = touchStart - y
        const dt = Math.max(1, Date.now() - touchStartTime)
        const velocity = (dy / dt) * 16

        const slow = getSlowFactor()
        const eff = Math.pow(slow, APPLY_POW)

        data.velocity = velocity * INERTIA_BOOST * eff
      }

      // --- Анимация ---
      const animate = (time) => {
        if (!data.lastTime) data.lastTime = time
        const dt = Math.min(time - data.lastTime, 100)
        data.lastTime = time

        // инерция (с учётом замедления на целевых якорях)
        if (Math.abs(data.velocity) > 0.1) {
          const slow = getSlowFactor()
          const eff = Math.pow(slow, APPLY_POW)
          data.target += data.velocity * (dt / 16.67) * eff
          data.target = Math.max(0, Math.min(data.target, data.maxScroll))
          data.velocity *= DECAY
        } else {
          data.velocity = 0
        }

        // мягкий snap — для всех секций
        if (SNAP_ENABLED && anchorsSnap.length > 0) {
          let nearest = anchorsSnap[0]
          let best = Math.abs(nearest - data.target)
          for (let i = 1; i < anchorsSnap.length; i++) {
            const d = Math.abs(anchorsSnap[i] - data.target)
            if (d < best) {
              best = d
              nearest = anchorsSnap[i]
            }
          }
          const dist = nearest - data.target
          const closeEnough = Math.abs(dist) < thresholdPx()
          const slowEnough =
            Math.abs(data.velocity) < SNAP_VEL_LIMIT &&
            Math.abs(data.target - data.current) < thresholdPx()

          if (closeEnough && slowEnough) {
            data.target += dist * SNAP_STRENGTH * (dt / 16.67)
          }
        }

        // lerp current → target
        const diff = data.target - data.current
        if (Math.abs(diff) > 0.05) {
          data.current += diff * data.ease
          data.isScrolling = true
        } else {
          data.current = data.target
          data.isScrolling = false
        }

        // вывод
        if (content) {
          const y = Math.round(data.current * 100) / 100
          content.style.transform = `translate3d(0, ${-y}px, 0)`
          onScroll?.(data.current)
        }

        rafRef.current = requestAnimationFrame(animate)
      }

      // init
      const updateAll = () => {
        updateMaxScroll()
        updateAnchors()
        if (data.target > data.maxScroll) data.target = data.maxScroll
      }
      updateAll()

      container.style.position = 'fixed'
      container.style.inset = '0'
      container.style.overflow = 'hidden'
      content.style.willChange = 'transform'
      content.style.backfaceVisibility = 'hidden'
      content.style.perspective = '1000px'

      container.addEventListener('wheel', onWheel, { passive: false })
      container.addEventListener('touchstart', onTouchStart, { passive: false })
      container.addEventListener('touchmove', onTouchMove, { passive: false })
      container.addEventListener('touchend', onTouchEnd, { passive: false })

      const ro = new ResizeObserver(updateAll)
      ro.observe(content)

      rafRef.current = requestAnimationFrame(animate)

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        container.removeEventListener('wheel', onWheel)
        container.removeEventListener('touchstart', onTouchStart)
        container.removeEventListener('touchmove', onTouchMove)
        container.removeEventListener('touchend', onTouchEnd)
        ro.disconnect()
      }
    }, [locked, onScroll, coeffs, softSnap, slideSlowdown])

    return (
      <div ref={containerRef} className="smooth-scroll-container">
        <div ref={contentRef} className="smooth-scroll-content">
          {children}
        </div>
      </div>
    )
  }
)

SmoothScroll.displayName = 'SmoothScroll'
export default SmoothScroll
