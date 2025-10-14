// App.jsx
import { useEffect, useState, useCallback } from 'react'
import Cover from './components/Cover'
import Hero from './components/Hero'
import Services from './components/Services'
import Team from './components/Team'
import About from './components/About'
import Contact from './components/Contact'
import Footer from './components/Footer'
import MenuButton from './components/MenuButton'
import OverlayMenu from './components/OverlayMenu'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      setIsMobile(mobile)
      // На мобильных показываем меню всегда
      if (mobile) {
        setShowMenu(true)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Показываем кнопку после половины экрана скролла
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const threshold = window.innerHeight * 0.5
      setShowMenu(scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth snap только для десктопа
  useEffect(() => {
    if (isMobile) return
    let scrollTimeout
    // Track last position/time to compute simple velocity
    let lastY = window.scrollY
    let lastT = performance.now()

    const getSectionsCount = () => document.querySelectorAll('.snap-section').length || 1

    const handleSmoothSnap = () => {
      const now = performance.now()
      const y = window.scrollY
      const dy = y - lastY
      const dt = Math.max(1, now - lastT)
      const velocity = dy / dt // px per ms
      lastY = y
      lastT = now

      clearTimeout(scrollTimeout)
      // Wait a short moment after user stops scrolling to snap
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight || 1
        const indexF = scrollY / windowHeight

        // Decide target index: default nearest, but respect strong fling (velocity)
        let targetIndex = Math.round(indexF)

        // If user performed a quick scroll (fling), move to next/prev section in direction
        // velocity threshold tuned empirically (0.5 px/ms => ~500 px in 1s)
        if (Math.abs(velocity) > 0.5) {
          if (velocity > 0) targetIndex = Math.ceil(indexF + 0.05)
          else targetIndex = Math.floor(indexF - 0.05)
        }

        const sectionsCount = getSectionsCount()
        targetIndex = Math.max(0, Math.min(sectionsCount - 1, targetIndex))

        const targetScroll = targetIndex * windowHeight

        // Only trigger smooth scroll if we're reasonably far from target
        if (Math.abs(scrollY - targetScroll) > 8) {
          window.scrollTo({ top: targetScroll, behavior: 'smooth' })
        }
      }, 120)
    }

    window.addEventListener('scroll', handleSmoothSnap, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleSmoothSnap)
      clearTimeout(scrollTimeout)
    }
  }, [isMobile])

  const scrollToSection = useCallback((sectionId) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMenuOpen(false)
    }
  }, [])

  // Блокируем скролл когда меню открыто на мобильных
  useEffect(() => {
    if (menuOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [menuOpen, isMobile])

  return (
    <>
      {/* ВАЖНО: visible = showMenu || menuOpen => не прячем кнопку, когда меню открыто */}
      <MenuButton
        open={menuOpen}
        visible={showMenu || menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      />

      <OverlayMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNav={scrollToSection}
      />

      <div className="main-container">
        <Cover />
        <Hero />
        <Services />
        <Team />
        <About />
        <Contact />
        <Footer />
      </div>
    </>
  )
}