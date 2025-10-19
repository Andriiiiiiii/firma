#!/usr/bin/env bash
set -euo pipefail

# Настройки по умолчанию (можно переопределить: Q=92 ./png2webp.sh)
Q="${Q:-90}"           # качество для "фото" (lossy)
ALPHA_Q="${ALPHA_Q:-90}" # качество альфа-канала
METHOD="${METHOD:-6}"  # скорость/качество кодера (0..6), 6 — лучше
THREADS="${THREADS:-$(nproc)}"

# Проверки зависимостей
command -v cwebp >/dev/null 2>&1 || { echo "cwebp не найден. Установите пакет 'webp'"; exit 1; }

# identify (ImageMagick) нужен только для эвристики по кол-ву цветов; если нет — считаем, что фото
HAS_IDENTIFY=0
if command -v identify >/dev/null 2>&1; then
  HAS_IDENTIFY=1
fi

shopt -s nullglob nocaseglob
pngs=( *.png )
shopt -u nocaseglob

if [ ${#pngs[@]} -eq 0 ]; then
  echo "PNG-файлы не найдены в текущей папке."
  exit 0
fi

echo "Найдено ${#pngs[@]} PNG-файлов. Конвертирую в WebP…"

# Параллельная обработка через xargs (если есть GNU xargs)
process_file () {
  local f="$1"
  local out="${f%.*}.webp"

  # Определяем режим: lossless для «графики» с небольшим числом цветов, иначе lossy
  local mode="lossy"
  if [ "$HAS_IDENTIFY" -eq 1 ]; then
    # %k — оценка уникальных цветов (для больших изображений это приблизительно)
    local colors
    colors=$(identify -format "%k" "$f" 2>/dev/null || echo 1000000)
    # Порог можно подстроить: 256 часто хорошо отделяет иконки/скриншоты от фото
    if [ "$colors" -le 256 ]; then
      mode="lossless"
    fi
  fi

  # Временный файл для сравнения размеров
  local tmp_out="${out}.tmp"

  if [ "$mode" = "lossless" ]; then
    # Максимально сжать без потерь (-lossless -z 9), сохраняет пиксели 1:1
    cwebp -quiet -mt -lossless -z 9 -metadata none "$f" -o "$tmp_out"
  else
    # Качественное lossy для фото; alpha_q для прозрачности
    cwebp -quiet -mt -q "$Q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none "$f" -o "$tmp_out"
  fi

  # Если webp вдруг больше исходного — попробуем чуть агрессивнее (q-5), но только для lossy
  if [ "$mode" = "lossy" ]; then
    local src_size webp_size
    src_size=$(stat -c%s "$f")
    webp_size=$(stat -c%s "$tmp_out")
    if [ "$webp_size" -ge "$src_size" ] && [ "$Q" -gt 80 ]; then
      local q2=$((Q-5))
      cwebp -quiet -mt -q "$q2" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none "$f" -o "$tmp_out"
      webp_size=$(stat -c%s "$tmp_out")
    fi
  fi

  # Если итоговый webp всё ещё больше PNG — пропускаем (сохраняем качество/экономим место)
  local src_size webp_size
  src_size=$(stat -c%s "$f")
  webp_size=$(stat -c%s "$tmp_out")
  if [ "$webp_size" -ge "$src_size" ]; then
    rm -f "$tmp_out"
    echo "↷ Пропуск: $f — WebP не стал меньше."
  else
    mv -f "$tmp_out" "$out"
    touch -r "$f" "$out"   # сохранить время модификации как у исходника
    echo "✓ $f → ${out}  (≈ $(( (100*webp_size)/src_size ))% от оригинала; режим: $mode)"
  fi
}

export -f process_file
export Q ALPHA_Q METHOD HAS_IDENTIFY

# Если есть xargs с -P — параллелим; иначе по одному
if xargs --help >/dev/null 2>&1; then
  printf '%s\0' "${pngs[@]}" | xargs -0 -n1 -P "$THREADS" bash -c 'process_file "$@"' _
else
  for f in "${pngs[@]}"; do
    process_file "$f"
  done
fi

echo "Готово."
