import React from 'react'

export default function MenuButton({
  open = false,
  visible = false,
  onClick,
  className = '',
  ariaLabel = 'Меню',
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      className={`menu-trigger ${open ? 'open' : ''} ${visible ? 'visible' : ''} ${className}`}
      onClick={onClick}
    >
      <span className="line line-top" />
      <span className="line line-mid" />
      <span className="line line-bot" />
    </button>
  )
}