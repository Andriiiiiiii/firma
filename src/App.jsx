import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const firstSlideHeight = window.innerHeight
      // Показываем меню после 50% первого слайда
      setShowMenu(scrollY > firstSlideHeight * 0.5)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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