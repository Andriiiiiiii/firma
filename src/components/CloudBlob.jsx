import React from 'react'

/**
 * Белое “облако” (один векторный контур).
 * Сдвиг задаётся CSS-переменными --cloud-tx/--cloud-ty,
 * которые меняются в Cover.jsx при движении мыши.
 */
export default function CloudBlob() {
  const style = {
    transform: 'translate(calc(-50% + var(--cloud-tx, 0px)), calc(-50% + var(--cloud-ty, 0px)))'
  }

  return (
    <svg className="cloud-blob" viewBox="0 0 800 420" style={style} aria-label="cloud">
      <path
        fill="#ffffff"
        d="
          M160,280
          C120,280,88,248,88,208
          C88,174,112,145,144,136
          C156,86,204,52,262,52
          C313,52,358,76,382,114
          C394,108,408,104,423,104
          C463,104,496,137,496,177
          C496,180,496,184,495,188
          C535,198,564,232,564,273
          C564,322,524,362,475,362
          L160,362
          C126,362,98,334,98,300
          C98,287,102,275,109,264
          C120,289,140,306,160,280 Z
        "
      />
    </svg>
  )
}
