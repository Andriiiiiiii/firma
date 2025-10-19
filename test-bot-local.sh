#!/bin/bash

# ============================================
# ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ TELEGRAM БОТА
# Запускать из корня проекта
# ============================================

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  ТЕСТИРОВАНИЕ TELEGRAM БОТА${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# ============================================
# 1. ПРОВЕРКА СТРУКТУРЫ ПРОЕКТА
# ============================================

log_info "Шаг 1/6: Проверка структуры проекта..."

if [ ! -d "backend" ]; then
    log_error "Директория backend не найдена!"
    log_warning "Запустите сначала: bash restructure.sh"
    exit 1
fi

if [ ! -f "backend/src/index.js" ]; then
    log_error "Файл backend/src/index.js не найден!"
    exit 1
fi

log_success "Структура проекта корректна"

# ============================================
# 2. ПРОВЕРКА .ENV ФАЙЛА
# ============================================

log_info "Шаг 2/6: Проверка .env файла..."

cd backend

if [ ! -f ".env" ]; then
    log_warning ".env файл не найден!"
    
    if [ -f ".env.example" ]; then
        log_info "Копируем .env.example в .env..."
        cp .env.example .env
        log_success ".env файл создан"
        log_warning "ОТКРОЙТЕ backend/.env И ЗАПОЛНИТЕ:"
        log_warning "  - TELEGRAM_BOT_TOKEN"
        log_warning "  - TELEGRAM_CHAT_IDS"
        echo ""
        read -p "Нажмите Enter после заполнения .env..."
    else
        log_error ".env.example не найден!"
        exit 1
    fi
fi

# Проверяем заполнение токена
if grep -q "your_bot_token_here" .env; then
    log_error "TELEGRAM_BOT_TOKEN не заполнен в .env!"
    log_warning "Получите токен у @BotFather и добавьте в backend/.env"
    exit 1
fi

log_success ".env файл найден и заполнен"

# ============================================
# 3. УСТАНОВКА ЗАВИСИМОСТЕЙ
# ============================================

log_info "Шаг 3/6: Установка зависимостей..."

if [ ! -d "node_modules" ]; then
    log_info "Устанавливаем зависимости..."
    npm install
    log_success "Зависимости установлены"
else
    log_success "Зависимости уже установлены"
fi

# ============================================
# 4. ЗАПУСК СЕРВЕРА
# ============================================

log_info "Шаг 4/6: Запуск сервера..."
log_warning "Сервер запустится в фоновом режиме..."

# Убиваем старый процесс если есть
pkill -f "node src/index.js" 2>/dev/null || true
sleep 1

# Запускаем сервер в фоне
NODE_ENV=development node src/index.js > /tmp/firma-backend.log 2>&1 &
SERVER_PID=$!

log_info "PID сервера: $SERVER_PID"
sleep 3

# Проверяем что сервер запустился
if ps -p $SERVER_PID > /dev/null; then
    log_success "Сервер запущен (PID: $SERVER_PID)"
else
    log_error "Сервер не запустился!"
    log_info "Логи:"
    cat /tmp/firma-backend.log
    exit 1
fi

# ============================================
# 5. ПРОВЕРКА HEALTH ENDPOINT
# ============================================

log_info "Шаг 5/6: Проверка API..."

sleep 2

HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)

if [ $? -eq 0 ]; then
    log_success "API доступен"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    log_error "API недоступен!"
    log_info "Логи сервера:"
    cat /tmp/firma-backend.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# ============================================
# 6. ОТПРАВКА ТЕСТОВОГО СООБЩЕНИЯ
# ============================================

log_info "Шаг 6/6: Отправка тестового сообщения в Telegram..."

TEST_RESPONSE=$(curl -s -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тест Локальный",
    "contact": "test@example.com",
    "message": "Это тестовое сообщение с локального сервера. Если вы его видите - бот работает!"
  }')

echo "$TEST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TEST_RESPONSE"

if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    log_success "Тестовое сообщение отправлено!"
    log_info "Проверьте Telegram - вам должно прийти сообщение"
else
    log_error "Ошибка отправки сообщения!"
    log_info "Проверьте:"
    log_info "  1. TELEGRAM_BOT_TOKEN корректен"
    log_info "  2. TELEGRAM_CHAT_IDS корректен"
    log_info "  3. Бот не заблокирован пользователем"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  ТЕСТИРОВАНИЕ ЗАВЕРШЕНО${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

log_info "Полезные команды:"
echo ""
echo "  Логи сервера:"
echo "    tail -f /tmp/firma-backend.log"
echo ""
echo "  Остановить сервер:"
echo "    kill $SERVER_PID"
echo ""
echo "  Повторная отправка тестового сообщения:"
echo "    curl -X POST http://localhost:3001/api/test-telegram"
echo ""
echo "  Полная проверка формы:"
echo "    curl -X POST http://localhost:3001/api/contact \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"name\":\"Тест\",\"contact\":\"test@test.com\",\"message\":\"Привет!\"}'"
echo ""

read -p "Нажмите Enter для остановки сервера или Ctrl+C для продолжения работы..."

kill $SERVER_PID 2>/dev/null
log_success "Сервер остановлен"