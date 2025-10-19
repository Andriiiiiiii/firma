/**
 * Утилиты для работы с устройствами и адаптивностью
 */

// Определение типа устройства
export const getDeviceType = () => {
  const width = window.innerWidth
  
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  if (width < 1440) return 'laptop'
  return 'desktop'
}

// Проверка на мобильное устройство
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Проверка на touch-устройство
export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

// Получение размера экрана
export const getScreenSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1
  }
}

// Debounce для resize событий
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Определение производительности устройства
export const getDevicePerformance = () => {
  const { devicePixelRatio } = getScreenSize()
  const isMobileDevice = isMobile()
  const cores = navigator.hardwareConcurrency || 2
  
  // Примерная оценка производительности
  if (isMobileDevice && cores <= 4) return 'low'
  if (isMobileDevice || cores <= 6) return 'medium'
  return 'high'
}

// Настройки качества в зависимости от устройства
export const getQualitySettings = () => {
  const performance = getDevicePerformance()
  const deviceType = getDeviceType()
  
  const settings = {
    low: {
      particleCount: 500,
      enableAnimations: false,
      dpr: 1,
      antialias: false
    },
    medium: {
      particleCount: 1500,
      enableAnimations: deviceType !== 'mobile',
      dpr: Math.min(window.devicePixelRatio, 1.5),
      antialias: false
    },
    high: {
      particleCount: 3000,
      enableAnimations: true,
      dpr: Math.min(window.devicePixelRatio, 2),
      antialias: true
    }
  }
  
  return settings[performance]
}

// Hook для отслеживания размера экрана
export const useWindowSize = (callback) => {
  const handleResize = debounce(() => {
    callback(getScreenSize())
  }, 150)
  
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }
}

// Проверка на landscape ориентацию
export const isLandscape = () => {
  return window.innerWidth > window.innerHeight
}

// Проверка поддержки WebGL
export const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}