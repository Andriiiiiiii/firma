import React, { useEffect, useState, useRef } from 'react'
import Cover from './components/Cover.jsx'
import Hero from './components/Hero.jsx'
import Services from './components/Services.jsx'
import Team from './components/Team.jsx'
import About from './components/About.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import MenuButton from './components/MenuButton.jsx'
import OverlayMenu from './components/OverlayMenu.jsx'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const scrollingRef = useRef(false)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const firstSlideHeight = window.innerHeight
      setShowMenu(scrollY > firstSlideHeight * 0.5)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Плавный скроллинг с правильным snap
  useEffect(() => {
    let scrollTimeout
    let isSnapping = false
    
    const handleSmoothSnap = () => {
      if (isSnapping) return
      
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        
        // Определяем ближайший слайд
        const currentIndex = Math.round(scrollY / windowHeight)
        const targetScroll = currentIndex * windowHeight
        const distanceFromTarget = Math.abs(scrollY - targetScroll)
        
        // Snap только если находимся между слайдами
        if (distanceFromTarget > 10 && distanceFromTarget < windowHeight * 0.4) {
          isSnapping = true
          
          window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          })
          
          setTimeout(() => {
            isSnapping = false
          }, 800)
        }
      }, 150)
    }

    // Плавный скроллинг через CSS
    document.documentElement.style.scrollBehavior = 'smooth'
    
    window.addEventListener('scroll', handleSmoothSnap, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleSmoothSnap)
      clearTimeout(scrollTimeout)
    }
  }, [])

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMenuOpen(false)
    }
  }

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