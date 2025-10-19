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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://188.120.232.8/',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - максимум 5 запросов в 15 минут с одного IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { 
    success: false, 
    error: 'Слишком много запросов. Попробуйте позже.' 
  }
});

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = process.env.TELEGRAM_CHAT_IDS.split(',').map(id => id.trim());
  
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

// Форматирование сообщения для Telegram
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

// Экранирование HTML для Telegram
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Проверка наличия обязательных переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен в .env файле');
  process.exit(1);
}

if (!process.env.TELEGRAM_CHAT_IDS) {
  console.error('❌ ОШИБКА: TELEGRAM_CHAT_IDS не установлен в .env файле');
  process.exit(1);
}

// Главный endpoint для приема заявок
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

// Endpoint для проверки здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    chatIds: process.env.TELEGRAM_CHAT_IDS.split(',').length
  });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint не найден'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Сервер запущен                        ║
║   📡 Порт: ${PORT}                           ║
║   🤖 Telegram Bot: активен                 ║
║   👥 Получателей: ${process.env.TELEGRAM_CHAT_IDS.split(',').length}                          ║
║   🌍 Окружение: ${process.env.NODE_ENV}           ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Получен сигнал SIGTERM, останавливаем сервер...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Получен сигнал SIGINT, останавливаем сервер...');
  process.exit(0);
});