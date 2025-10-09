import React, { useEffect, useRef, useState } from 'react'
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
  const snapRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // наблюдаем, какая секция сейчас на экране, чтобы показывать кнопку с 2-го экрана
  useEffect(() => {
    const root = snapRef.current
    const sections = root.querySelectorAll('.snap-section')
    const io = new IntersectionObserver(
      (entries) => {
        // берём самую «видимую»
        const best = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!best) return
        const idx = Array.from(sections).indexOf(best.target)
        setActiveIndex(idx)
      },
      { root, threshold: [0.51, 0.66, 0.8] }
    )
    sections.forEach(s => io.observe(s))
    return () => io.disconnect()
  }, [])

  const goTo = (id) => {
    const root = snapRef.current
    const el = document.getElementById(id)
    if (root && el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // чуть позже закрываем меню, чтобы не прерывать прокрутку
      setTimeout(() => setMenuOpen(false), 260)
    }
  }

  return (
    <>
      {/* Фиксированная кнопка меню — видна только начиная со 2-й секции */}
      <MenuButton
        visible={activeIndex > 0 && !menuOpen}
        onClick={() => setMenuOpen(true)}
      />

      {/* Фуллскрин-меню */}
      <OverlayMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNav={goTo}
      />

      {/* snap-скролл по экранам */}
      <div id="snap-root" ref={snapRef} className={`snap-container ${menuOpen ? 'locked' : ''}`}>
        {/* 1 — Cover */}
        <Cover />
        {/* 2 — Введение */}
        <Hero />
        {/* 3 — Услуги */}
        <Services />
        {/* 4 — Команда */}
        <Team />
        {/* 5 — О компании */}
        <About />
        {/* 6 — Контакты */}
        <Contact />

        {/* Футер без снапа */}
        <div className="snap-end">
          <Footer />
        </div>
      </div>
    </>
  )
}
