#!/usr/bin/env bash
set -euo pipefail

# ===== Настройки (меняйте через переменные окружения при запуске) =====
TARGET_FACTOR="${TARGET_FACTOR:-5}"   # во сколько раз сделать меньше (минимум). Прим: 5 => ≥5x меньше
MAX_FACTOR="${MAX_FACTOR:-10}"        # верхняя цель (если удалось — отлично), не обязательна
Q_START="${Q_START:-70}"              # стартовое качество (первый проход)
Q_STEP="${Q_STEP:-5}"                 # шаг снижения качества
Q_MIN="${Q_MIN:-35}"                  # ниже — не опускаемся (страшные артефакты)
ALPHA_Q="${ALPHA_Q:-60}"              # качество альфа-канала (если есть)
METHOD="${METHOD:-6}"                 # 0..6 (6 — лучше)
SKIP_ANIM="${SKIP_ANIM:-1}"           # 1 — пропустить анимации; 0 — перекодировать (анимация потеряется!)
MAX_DIM="${MAX_DIM:-0}"               # 0 — не менять размер. Иначе ограничить max(width,height), напр. 2000
VERBOSE="${VERBOSE:-0}"               # 1 — болтливый режим

for bin in cwebp dwebp webpmux; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Не найдено: $bin (установите пакет 'webp')"; exit 1; }
done

if ! [[ "$TARGET_FACTOR" =~ ^[0-9]+$ ]] || [ "$TARGET_FACTOR" -lt 2 ]; then
  echo "TARGET_FACTOR должен быть целым ≥2"; exit 1
fi

shopt -s nullglob nocaseglob
files=( *.webp )
shopt -u nocaseglob

if [ ${#files[@]} -eq 0 ]; then
  echo "В текущей папке нет .webp"; exit 0
fi

echo "Найдено ${#files[@]} WebP. Цель: ≥${TARGET_FACTOR}× меньше (Q ${Q_START}→${Q_MIN} шаг ${Q_STEP}). In-place…"

process_one () {
  local f="$1"
  local info anim=0
  local src_size new_size q cur_tmp scale_args=""

  if info=$(webpmux -info "$f" 2>/dev/null); then
    if grep -q "ANIM" <<<"$info"; then anim=1; fi
  fi
  if [ "$anim" -eq 1 ] && [ "$SKIP_ANIM" -eq 1 ]; then
    echo "↷ Пропуск (анимация): $f"
    return 0
  fi

  src_size=$(stat -c%s -- "$f")

  # Подготовим args для downscale (если задан MAX_DIM)
  if [ "$MAX_DIM" -gt 0 ]; then
    # dwebp -> PNG -> cwebp с ресайзом
    scale_args="-resize ${MAX_DIM} ${MAX_DIM}"
  fi

  q="$Q_START"
  while :; do
    cur_tmp="${f}.tmp.$$"

    if [ "$VERBOSE" -eq 1 ]; then
      if [ -n "$scale_args" ]; then
        dwebp "$f" -o - | cwebp -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none $scale_args -o "$cur_tmp" -- -
      else
        dwebp "$f" -o - | cwebp -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none -o "$cur_tmp" -- -
      fi
    else
      if [ -n "$scale_args" ]; then
        dwebp "$f" -o - 2>/dev/null | cwebp -quiet -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none $scale_args -o "$cur_tmp" -- -
      else
        dwebp "$f" -o - 2>/dev/null | cwebp -quiet -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none -o "$cur_tmp" -- -
      fi
    fi

    new_size=$(stat -c%s -- "$cur_tmp")

    # Проверка цели: new_size * TARGET_FACTOR <= src_size
    if [ $(( new_size * TARGET_FACTOR )) -le "$src_size" ]; then
      mv -f -- "$cur_tmp" "$f"
      echo "✓ $f  → ~$(printf '%d' $(( 100*new_size/src_size )) )%%  (Q=$q)"
      break
    else
      rm -f -- "$cur_tmp"
      if [ "$q" -le "$Q_MIN" ]; then
        # Минимальное качество достигнуто — примем, что это лучшее возможное без слишком сильных артефактов
        # Всё равно заменим, чтобы уменьшить сколько возможно.
        q="$Q_MIN"
        cur_tmp="${f}.tmp.$$"
        if [ -n "$scale_args" ]; then
          dwebp "$f" -o - 2>/dev/null | cwebp -quiet -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none $scale_args -o "$cur_tmp" -- -
        else
          dwebp "$f" -o - 2>/dev/null | cwebp -quiet -mt -q "$q" -m "$METHOD" -alpha_q "$ALPHA_Q" -af -metadata none -o "$cur_tmp" -- -
        fi
        new_size=$(stat -c%s -- "$cur_tmp")
        mv -f -- "$cur_tmp" "$f"
        echo "• $f  → ~$(printf '%d' $(( 100*new_size/src_size )) )%%  (Q=$q, цель ≥${TARGET_FACTOR}× не достигнута)"
        break
      fi
      q=$(( q - Q_STEP ))
      if [ "$q" -lt "$Q_MIN" ]; then q="$Q_MIN"; fi
    fi
  done
}

export -f process_one
export TARGET_FACTOR Q_START Q_STEP Q_MIN ALPHA_Q METHOD SKIP_ANIM MAX_DIM VERBOSE

# Последовательно (надёжнее для больших файлов)
for f in "${files[@]}"; do
  process_one "$f"
done

echo "Готово."
