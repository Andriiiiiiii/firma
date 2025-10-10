import React from 'react'

export default function MenuButton({ visible, onClick }) {
  return (
    <button
      aria-label="Открыть меню"
      className={`hamburger-menu ${visible ? 'visible' : ''}`}
      onClick={onClick}
    >
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
    </button>
  )
}