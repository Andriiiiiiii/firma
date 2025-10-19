/**
 * Система предзагрузки всех фотографий
 * Загружает ВСЕ фото при старте приложения
 */

const imageCache = new Map()
const loadingPromises = new Map()

export const preloadAllImages = async () => {
  const images = [
    '/team.webp',
    '/karpenko.webp',
    '/terentev.webp',
    '/blokhin.webp',
    '/shcherbakov.webp',
    '/voronov.webp',
    '/nemirovskiy.webp',
    '/panov.webp',
    '/kozlov.webp',
    '/zhivetev.webp',
    '/logo.png',
    '/wheel.png',
  ]

  try {
    // Загружаем все фото параллельно
    await Promise.all(images.map(preloadImage))
    console.log('✅ Все фотографии успешно загружены')
  } catch (error) {
    console.error('❌ Ошибка при загрузке фотографий:', error)
  }
}

export const preloadImage = (src) => {
  // Если уже в кэше — return immediately
  if (imageCache.has(src)) {
    return Promise.resolve()
  }

  // Если уже загружается — return existing promise
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)
  }

  // Создаём новый promise
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      imageCache.set(src, true)
      loadingPromises.delete(src)
      resolve()
    }
    
    img.onerror = () => {
      loadingPromises.delete(src)
      reject(new Error(`Failed to load: ${src}`))
    }
    
    // Важно: используем crossOrigin для правильной обработки
    img.crossOrigin = 'anonymous'
    img.src = src
  })

  loadingPromises.set(src, promise)
  return promise
}

export const isImageLoaded = (src) => {
  return imageCache.has(src)
}

export const getAllLoadedImages = () => {
  return Array.from(imageCache.keys())
}