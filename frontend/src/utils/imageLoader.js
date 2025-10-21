/**
 * Система предзагрузки всех изображений
 * 
 * ВАЖНО: Все изображения находятся в frontend/public/
 * Пути начинаются с "/" - это корень сайта
 * 
 * В dev: / → http://localhost:3000/
 * В prod: / → https://ne-firma.ru/
 * 
 * Vite автоматически копирует файлы из public/ в корень dist/ при билде
 */

const imageCache = new Map()
const loadingPromises = new Map()

/**
 * Предзагрузка ВСЕХ изображений сайта
 * Вызывается один раз при старте приложения
 */
export const preloadAllImages = async () => {
  // Полный список всех изображений из frontend/public/
  const images = [
    '/team.webp',         // frontend/public/team.webp
    '/karpenko.webp',     // frontend/public/karpenko.webp
    '/terentev.webp',     // frontend/public/terentev.webp
    '/blokhin.webp',      // frontend/public/blokhin.webp
    '/shcherbakov.webp',  // frontend/public/shcherbakov.webp
    '/voronov.webp',      // frontend/public/voronov.webp
    '/nemirovskiy.webp',  // frontend/public/nemirovskiy.webp
    '/panov.webp',        // frontend/public/panov.webp
    '/zhivetev.webp',     // frontend/public/zhivetev.webp
    '/logo.webp',         // frontend/public/logo.webp
    '/wheel.webp',        // frontend/public/wheel.webp
  ]

  try {
    // Загружаем все изображения параллельно
    await Promise.all(images.map(preloadImage))
    console.log('✅ Все изображения успешно загружены из /public/')
  } catch (error) {
    console.error('❌ Ошибка при загрузке изображений:', error)
  }
}

/**
 * Предзагрузка одного изображения
 * @param {string} src - Путь к изображению (например: '/logo.webp')
 */
export const preloadImage = (src) => {
  // Если уже в кэше
  if (imageCache.has(src)) {
    return Promise.resolve()
  }

  // Если уже загружается
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)
  }

  // Создаём новый промис загрузки
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      imageCache.set(src, true)
      loadingPromises.delete(src)
      console.log(`✓ Загружено: ${src}`)
      resolve()
    }
    
    img.onerror = () => {
      loadingPromises.delete(src)
      console.error(`✗ Ошибка загрузки: ${src}`)
      reject(new Error(`Failed to load: ${src}`))
    }
    
    img.crossOrigin = 'anonymous'
    img.src = src
  })

  loadingPromises.set(src, promise)
  return promise
}

/**
 * Проверка, загружено ли изображение
 */
export const isImageLoaded = (src) => {
  return imageCache.has(src)
}

/**
 * Получить список всех загруженных изображений
 */
export const getAllLoadedImages = () => {
  return Array.from(imageCache.keys())
}