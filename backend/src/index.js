import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());

// CORS настройки
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://188.120.232.8',
      'https://ne-firma.ru',
      'http://ne-firma.ru'
    ];
    
    // Разрешаем запросы без origin (Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - 5 запросов в 15 минут с одного IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5,
  message: { 
    success: false, 
    error: 'Слишком много запросов. Попробуйте позже.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// TELEGRAM ФУНКЦИИ
// ============================================

/**
 * Отправка сообщения в Telegram
 */
async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = process.env.TELEGRAM_CHAT_IDS.split(',').map(id => id.trim());
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не установлен');
  }
  
  if (!chatIds || chatIds.length === 0) {
    throw new Error('TELEGRAM_CHAT_IDS не установлен');
  }
  
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const results = [];
  
  // Отправляем сообщение каждому получателю
  for (const chatId of chatIds) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        results.push({ chatId, success: true });
        console.log(`✓ Сообщение отправлено в чат ${chatId}`);
      } else {
        results.push({ chatId, success: false, error: data.description });
        console.error(`✗ Ошибка отправки в чат ${chatId}:`, data.description);
      }
    } catch (error) {
      results.push({ chatId, success: false, error: error.message });
      console.error(`✗ Ошибка отправки в чат ${chatId}:`, error.message);
    }
  }
  
  // Возвращаем true только если хотя бы одно сообщение отправлено успешно
  return results.some(r => r.success);
}

/**
 * Форматирование сообщения для Telegram
 */
function formatMessage(name, contact, message) {
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `🔔 <b>Новая заявка с сайта firma'</b>\n\n` +
         `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
         `📞 <b>Контакт:</b> ${escapeHtml(contact)}\n` +
         `💬 <b>Сообщение:</b>\n${escapeHtml(message)}\n\n` +
         `🕐 <b>Время:</b> ${timestamp}`;
}

/**
 * Экранирование HTML для Telegram
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// ПРОВЕРКА КОНФИГУРАЦИИ
// ============================================

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен в .env файле');
  console.error('💡 Получите токен у @BotFather в Telegram');
  process.exit(1);
}

if (!process.env.TELEGRAM_CHAT_IDS) {
  console.error('❌ ОШИБКА: TELEGRAM_CHAT_IDS не установлен в .env файле');
  console.error('💡 Получите Chat ID у @userinfobot или @get_id_bot');
  process.exit(1);
}

// ============================================
// ROUTES
// ============================================

/**
 * Главный endpoint для приема заявок
 */
app.post('/api/contact', limiter, async (req, res) => {
  try {
    const { name, contact, message } = req.body;
    
    // Валидация данных
    if (!name || !contact || !message) {
      return res.status(400).json({
        success: false,
        error: 'Все поля обязательны для заполнения'
      });
    }
    
    // Проверка длины полей
    if (name.length > 100 || contact.length > 100 || message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Превышена максимальная длина полей'
      });
    }
    
    // Базовая защита от спама
    const suspiciousPatterns = /<script|javascript:|onerror=|onclick=/i;
    if (suspiciousPatterns.test(name) || 
        suspiciousPatterns.test(contact) || 
        suspiciousPatterns.test(message)) {
      return res.status(400).json({
        success: false,
        error: 'Обнаружен недопустимый контент'
      });
    }
    
    // Формирование и отправка сообщения
    const telegramMessage = formatMessage(name, contact, message);
    const sent = await sendTelegramMessage(telegramMessage);
    
    if (sent) {
      res.json({
        success: true,
        message: 'Заявка успешно отправлена'
      });
    } else {
      throw new Error('Не удалось отправить ни одно сообщение');
    }
    
  } catch (error) {
    console.error('Ошибка при обработке заявки:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера. Попробуйте позже.'
    });
  }
});

/**
 * Endpoint для проверки здоровья сервера
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    chatIds: process.env.TELEGRAM_CHAT_IDS.split(',').length,
    uptime: process.uptime()
  });
});

/**
 * Endpoint для тестирования Telegram (только в development)
 */
if (NODE_ENV === 'development') {
  app.post('/api/test-telegram', async (req, res) => {
    try {
      const testMessage = formatMessage(
        'Тестовое имя',
        'test@example.com',
        'Это тестовое сообщение для проверки работы бота'
      );
      
      const sent = await sendTelegramMessage(testMessage);
      
      res.json({
        success: sent,
        message: sent ? 'Тестовое сообщение отправлено' : 'Ошибка отправки'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Обработка несуществующих маршрутов
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint не найден'
  });
});

/**
 * Обработка ошибок
 */
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'development' ? err.message : 'Внутренняя ошибка сервера'
  });
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Backend сервер запущен                ║
║   📡 Порт: ${PORT.toString().padEnd(32)}║
║   🤖 Telegram Bot: активен                 ║
║   👥 Получателей: ${process.env.TELEGRAM_CHAT_IDS.split(',').length.toString().padEnd(25)}║
║   🌍 Окружение: ${NODE_ENV.padEnd(28)}║
║   📍 URL: http://localhost:${PORT.toString().padEnd(18)}║
╚════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal) => {
  console.log(`\n👋 Получен сигнал ${signal}, останавливаем сервер...`);
  
  server.close(() => {
    console.log('✅ HTTP сервер остановлен');
    process.exit(0);
  });
  
  // Если через 10 секунд сервер не остановился, принудительно завершаем
  setTimeout(() => {
    console.error('⚠️  Принудительное завершение');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение промиса:', promise, 'причина:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;