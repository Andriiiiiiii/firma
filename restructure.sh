#!/bin/bash

# Скрипт для реструктуризации проекта firma
# Запускать из корня проекта: bash restructure.sh

echo "🔄 Начинаем реструктуризацию проекта..."

# Создаём новую структуру
mkdir -p frontend backend/src nginx

# Перемещаем frontend файлы
echo "📦 Перемещаем frontend файлы..."
mv src frontend/ 2>/dev/null || true
mv public frontend/ 2>/dev/null || true
mv index.html frontend/ 2>/dev/null || true
mv vite.config.js frontend/ 2>/dev/null || true

# Создаём package.json для frontend
cat > frontend/package.json << 'EOF'
{
  "name": "firma-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "terser": "^5.44.0",
    "vite": "^5.4.20"
  }
}
EOF

# Перемещаем backend файлы
echo "🤖 Перемещаем backend файлы..."
if [ -d "src/server" ]; then
    mv src/server/index.js backend/src/ 2>/dev/null || true
    mv src/server/.env.example backend/ 2>/dev/null || true
    mv src/server/package.json backend/ 2>/dev/null || true
fi

# Если файлы не найдены, создаём с нуля
if [ ! -f "backend/src/index.js" ]; then
    echo "⚠️  Файлы backend не найдены, создаём новые..."
    # Файлы будут созданы отдельно
fi

# Очищаем старые файлы
rm -rf src/server

# Создаём .gitignore для backend
cat > backend/.gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
EOF

# Создаём корневой package.json для управления workspace
cat > package.json << 'EOF'
{
  "name": "firma-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "build": "npm run build:frontend && npm run build:backend",
    "deploy": "bash deploy.sh"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

echo "✅ Реструктуризация завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте структуру проекта"
echo "2. Создайте файлы backend (используйте следующие артефакты)"
echo "3. Запустите: npm install (установит зависимости для всех workspace)"