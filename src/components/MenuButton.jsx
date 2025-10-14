// MenuButton.jsx
import React from 'react'

export default function MenuButton({
  open = false,
  onClick,
  className = '',
  ariaLabel = 'Меню',
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      className={`menu-trigger ${open ? 'open' : ''} ${className}`}
      onClick={onClick}
    >
      <span className="line line-top" />
      <span className="line line-mid" />
      <span className="line line-bot" />
    </button>
  )
}
