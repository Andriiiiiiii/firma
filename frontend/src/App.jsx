import { useEffect, useState, useCallback, useRef } from 'react'
import { preloadAllImages } from './utils/imageLoader'
import Cover from './components/Cover'
import Hero from './components/Hero'
import Services from './components/Services'
import Team from './components/Team'
import About from './components/About'
import Contact from './components/Contact'
import MenuButton from './components/MenuButton'
import OverlayMenu from './components/OverlayMenu'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const scrollPositionRef = useRef(0)

  // Загружаем ВСЕ фото при монтировании App
  useEffect(() => {
    preloadAllImages()
      .then(() => {
        setImagesLoaded(true)
        console.log('✅ Приложение готово к работе')
      })
      .catch((err) => {
        console.error('❌ Ошибка загрузки фото:', err)
        setImagesLoaded(true)
      })
  }, [])

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Показываем меню при скролле (ТОЛЬКО для десктопа)
  useEffect(() => {
    if (isMobile) return // На мобильных меню не нужно

    const handleScroll = () => {
      const scrollY = window.scrollY
      const threshold = window.innerHeight * 0.5
      setShowMenu(scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  const scrollToSection = useCallback((sectionId) => {
    setMenuOpen(false)
    
    setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }, [])

  // Обработка открытия/закрытия меню
  useEffect(() => {
    if (menuOpen) {
      scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop
      
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPositionRef.current}px`
      document.body.style.width = '100%'
      document.body.style.left = '0'
      document.body.style.right = '0'
    } else {
      const scrollY = scrollPositionRef.current
      
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.left = ''
      document.body.style.right = ''
      
      window.scrollTo(0, scrollY)
    }
  }, [menuOpen])

  return (
    <>
      {/* Меню показываем ТОЛЬКО на десктопе */}
      {!isMobile && (
        <>
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
        </>
      )}

      <div className="main-container">
        <Cover isMobile={isMobile} />
        <Hero />
        <Services />
        <Team />
        <About />
        <Contact />
      </div>
    </>
  )
}