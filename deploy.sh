#!/bin/bash

# ============================================
# FIRMA DEPLOY SCRIPT
# Полный деплой frontend + backend на сервер
# ============================================

set -e  # Выход при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для красивого вывода
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Проверка что скрипт запущен на сервере
if [ ! -d "/var/www" ]; then
    log_error "Этот скрипт должен запускаться на сервере в /var/www"
    exit 1
fi

log_info "Начинаем деплой проекта firma..."

# ============================================
# 1. ОЧИСТКА И КЛОНИРОВАНИЕ РЕПОЗИТОРИЯ
# ============================================

log_info "Шаг 1/8: Клонирование репозитория..."

cd /var/www

# Удаляем старую версию если есть
if [ -d "firma" ]; then
    log_warning "Удаляем старую версию..."
    rm -rf firma
fi

# Клонируем свежую версию
git clone --depth=1 https://github.com/Andriiiiiiii/firma.git
cd firma

log_success "Репозиторий склонирован"

# ============================================
# 2. УСТАНОВКА ЗАВИСИМОСТЕЙ FRONTEND
# ============================================

log_info "Шаг 2/8: Установка зависимостей frontend..."

cd frontend
npm ci || npm install
npm i -D terser

log_success "Зависимости frontend установлены"

# ============================================
# 3. СБОРКА FRONTEND
# ============================================

log_info "Шаг 3/8: Сборка frontend..."

npm run build

log_success "Frontend собран"

# ============================================
# 4. УСТАНОВКА ЗАВИСИМОСТЕЙ BACKEND
# ============================================

log_info "Шаг 4/8: Установка зависимостей backend..."

cd ../backend

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    log_warning ".env файл не найден!"
    log_info "Создаём .env из .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning "ВАЖНО: Отредактируйте /var/www/firma/backend/.env"
        log_warning "Добавьте ваш TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_IDS"
    else
        log_error ".env.example не найден!"
        exit 1
    fi
fi

npm ci || npm install

log_success "Зависимости backend установлены"

# ============================================
# 5. НАСТРОЙКА ПРАВ ДОСТУПА
# ============================================

log_info "Шаг 5/8: Настройка прав доступа..."

cd /var/www/firma

# Права для frontend (только чтение для Nginx)
chown -R www-data:www-data frontend/dist
chmod -R 755 frontend/dist

# Права для backend (чтение и запись для Node.js)
chown -R www-data:www-data backend
chmod -R 755 backend
chmod 600 backend/.env  # .env должен быть доступен только владельцу

log_success "Права доступа настроены"

# ============================================
# 6. НАСТРОЙКА NGINX
# ============================================

log_info "Шаг 6/8: Настройка Nginx..."

# Копируем конфигурацию Nginx
if [ -f "nginx/firma.conf" ]; then
    cp nginx/firma.conf /etc/nginx/sites-available/firma
    
    # Создаём симлинк если его нет
    if [ ! -L "/etc/nginx/sites-enabled/firma" ]; then
        ln -s /etc/nginx/sites-available/firma /etc/nginx/sites-enabled/firma
    fi
    
    # Проверяем конфигурацию
    nginx -t
    
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        log_success "Nginx настроен и перезагружен"
    else
        log_error "Ошибка в конфигурации Nginx!"
        exit 1
    fi
else
    log_warning "nginx/firma.conf не найден, пропускаем настройку Nginx"
fi

# ============================================
# 7. НАСТРОЙКА SYSTEMD SERVICE
# ============================================

log_info "Шаг 7/8: Настройка systemd сервиса..."

# Создаём systemd unit файл
cat > /etc/systemd/system/firma-backend.service << 'EOF'
[Unit]
Description=Firma Backend API Server with Telegram Bot
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/firma/backend
ExecStart=/usr/bin/node src/index.js
Environment=NODE_ENV=production
EnvironmentFile=/var/www/firma/backend/.env
Restart=always
RestartSec=10
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=firma-backend
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd
systemctl daemon-reload

# Включаем автозапуск
systemctl enable firma-backend

# Перезапускаем сервис
systemctl restart firma-backend

# Проверяем статус
sleep 2
if systemctl is-active --quiet firma-backend; then
    log_success "Backend сервис запущен"
else
    log_error "Backend сервис не запустился!"
    log_info "Проверьте логи: journalctl -u firma-backend -n 50"
    exit 1
fi

# ============================================
# 8. ПРОВЕРКА ЗДОРОВЬЯ
# ============================================

log_info "Шаг 8/8: Проверка работоспособности..."

sleep 3

# Проверяем доступность API
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    log_success "API работает корректно"
else
    log_error "API недоступен!"
    log_info "Проверьте логи: journalctl -u firma-backend -n 50"
    exit 1
fi

# ============================================
# ЗАВЕРШЕНИЕ
# ============================================

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 ДЕПЛОЙ УСПЕШНО ЗАВЕРШЁН!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
log_info "Полезные команды:"
echo ""
echo "  Статус backend:"
echo "    sudo systemctl status firma-backend"
echo ""
echo "  Логи backend:"
echo "    sudo journalctl -u firma-backend -f"
echo ""
echo "  Перезапуск backend:"
echo "    sudo systemctl restart firma-backend"
echo ""
echo "  Проверка API:"
echo "    curl http://localhost:3001/api/health"
echo ""
echo "  Перезагрузка Nginx:"
echo "    sudo systemctl reload nginx"
echo ""
log_warning "НЕ ЗАБУДЬТЕ:"
echo "  1. Проверить /var/www/firma/backend/.env"
echo "  2. Добавить TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_IDS"
echo "  3. Перезапустить backend после редактирования .env"
echo ""