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

  // ✨ КРИТИЧНО: Загружаем ВСЕ фото при монтировании App
  useEffect(() => {
    preloadAllImages()
      .then(() => {
        setImagesLoaded(true)
        console.log('🎉 Приложение готово к работе')
      })
      .catch((err) => {
        console.error('Ошибка загрузки фото:', err)
        setImagesLoaded(true)
      })
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      setIsMobile(mobile)
      if (mobile) {
        setShowMenu(true)
      }
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

  const scrollToSection = useCallback((sectionId) => {
    setMenuOpen(false)
    
    setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }, [])

  // Обработка открытия/закрытия меню - ИСПРАВЛЕНО
  useEffect(() => {
    if (menuOpen) {
      // Сохраняем текущую позицию скролла
      scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop
      
      // Блокируем скролл
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPositionRef.current}px`
      document.body.style.width = '100%'
      document.body.style.left = '0'
      document.body.style.right = '0'
    } else {
      // Восстанавливаем скролл
      const scrollY = scrollPositionRef.current
      
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.left = ''
      document.body.style.right = ''
      
      // Возвращаем позицию скролла БЕЗ анимации
      window.scrollTo(0, scrollY)
    }
  }, [menuOpen])

  return (
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

      <div className="main-container">
        <Cover />
        <Hero />
        <Services />
        <Team />
        <About />
        <Contact />
      </div>
    </>
  )
}