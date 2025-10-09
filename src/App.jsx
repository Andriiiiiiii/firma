import React, { useRef, useState } from 'react'
import Cover from './components/Cover.jsx'
import Hero from './components/Hero.jsx'
import Services from './components/Services.jsx'
import Team from './components/Team.jsx'
import About from './components/About.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import MenuButton from './components/MenuButton.jsx'
import OverlayMenu from './components/OverlayMenu.jsx'
import SmoothScroll from './components/SmoothScroll.jsx'

export default function App() {
  const contentRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sectionProgress, setSectionProgress] = useState([1, 0, 0, 0, 0, 0, 0])
  const [sectionLocal, setSectionLocal] = useState([0, 0, 0, 0, 0, 0, 0])
  const smoothScrollRef = useRef(null)

  const TEXT_DELAY = 0.15

  const handleScrollProgress = (scrollY) => {
    const sections = contentRef.current?.querySelectorAll('.page-section, .snap-section')
    if (!sections || sections.length === 0) return

    const vh = window.innerHeight
    const progress = new Array(sections.length).fill(0)
    const local = new Array(sections.length).fill(0)

    sections.forEach((section, idx) => {
      const sectionTop = section.offsetTop
      const start = sectionTop - vh
      const end = sectionTop - vh * 0.2

      let p = 0
      if (scrollY >= start && scrollY <= end) {
        p = (scrollY - start) / Math.max(1, (end - start))
      } else if (scrollY > end) {
        p = 1
      }
      if (idx === 0) p = 1
      progress[idx] = Math.max(0, Math.min(1, p))

      const lp = (scrollY - sectionTop) / vh
      local[idx] = Math.max(0, Math.min(1, lp))
    })

    setSectionProgress(progress)
    setSectionLocal(local)

    const currentSection = Math.max(0, Math.min(sections.length - 1, Math.floor(scrollY / vh)))
    if (currentSection !== activeIndex) setActiveIndex(currentSection)
  }

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (el && smoothScrollRef.current) {
      smoothScrollRef.current.scrollTo(el.offsetTop)
      setTimeout(() => setMenuOpen(false), 300)
    }
  }

  return (
    <>
      <MenuButton visible={activeIndex > 0 && !menuOpen} onClick={() => setMenuOpen(true)} />

      <OverlayMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNav={goTo} />

      <SmoothScroll
        ref={smoothScrollRef}
        locked={menuOpen}
        onScroll={handleScrollProgress}
        coeffs={{
          wheel: 1.15,
          touch: 1.4,
          impulse: 0.28,
          inertiaBoost: 1.8,
          decay: 0.93,
          ease: 0.085,
        }}
        softSnap={{
          enabled: true,
          selector: '.page-section, .snap-section',
          threshold: 0.22,   // мягкий магнит
          strength: 0.06,
          velocityLimit: 10,
        }}
        // Ослабляем прокрутку ТОЛЬКО на Hero (#intro)
        slideSlowdown={{
          enabled: true,
          targetSelector: '#intro', // только этот слайд
          radius: 0.7,              // широкая зона вокруг якоря
          minFactor: 0.1,          // чувствительность ~8% в центре — нужно много «кликов»
          exponent: 1,              // долго держит замедление у якоря
          deadband: 0.005,           // мёртвая зона около якоря
          applyPower: 1,          // усиливаем влияние на дельту и инерцию
        }}
      >
        <div ref={contentRef}>
          <Cover progress={sectionProgress[0] ?? 1} />
          <Hero
            progress={sectionProgress[1] ?? 0}
            spin={sectionLocal[1] ?? 0}
            textDelay={TEXT_DELAY}
          />
          <Services progress={sectionProgress[2] ?? 0} />
          <Team progress={sectionProgress[3] ?? 0} />
          <About progress={sectionProgress[4] ?? 0} />
          <Contact progress={sectionProgress[5] ?? 0} />
          <Footer progress={sectionProgress[6] ?? 0} />
        </div>
      </SmoothScroll>
    </>
  )
}
