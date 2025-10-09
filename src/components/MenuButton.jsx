import React from 'react'

export default function MenuButton({ visible, onClick }) {
  return (
    <button
      aria-label="Открыть меню"
      className={`menu-btn ${visible ? 'show' : ''}`}
      onClick={onClick}
    >
      <span className="bar" />
      <span className="bar" />
      <span className="bar" />
    </button>
  )
}
