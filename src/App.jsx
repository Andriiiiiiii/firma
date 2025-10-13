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

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

    const handleSmoothSnap = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        const currentIndex = Math.round(scrollY / windowHeight)
        const targetScroll = currentIndex * windowHeight
        const distanceFromTarget = Math.abs(scrollY - targetScroll)

        if (distanceFromTarget > 10 && distanceFromTarget < windowHeight * 0.4) {
          window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          })
        }
      }, 150)
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
      <MenuButton 
        visible={showMenu && !menuOpen} 
        onClick={() => setMenuOpen(true)} 
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