const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const { startHandler, startSetName, menuHandler, showCategories, showGetOrders, showProducts, showContactAdmin } = require('./handlers/componentHandler');
const { userData } = require('./handlers/userhandler');

const userSessions = {};

global.makeApiRequest = async (method, url, data = null) => {
  try {
    const response = await axios({
      method,
      url: `${process.env.API_BASE_URL}${url}`,
      data,
      headers: {
        Authorization: `Token ${process.env.API_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ API xatosi: ${method} ${url}`, error.response?.data || error.message);
    throw error;
  }
};

console.log("🤖 Bot ishga tushdi");

// --- /start buyrug‘i
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = userSessions[chatId] || {};
  await startHandler(bot, msg);
});

// --- Kontakt yuborilganda
bot.on('contact', async (msg) => {
  const { chat: { id: chatId }, contact } = msg;
  const phone = contact.phone_number;
  const name = contact.first_name || msg.from.first_name;
  const username = msg.from.username;

  userSessions[chatId] = userSessions[chatId] || {};
  await startSetName(bot, chatId, userSessions[chatId]);

  const user = await userData(bot, chatId, phone, name, username);
  const message = user ? "📲 Raqamingiz qabul qilindi!" : "❗ Telefon raqamingizni saqlashda xatolik. /start buyrug‘ini qayta yuboring.";
  await bot.sendMessage(chatId, message);
});

// --- Matnli xabarlar
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (msg.contact || text === "/start") return;

  const session = userSessions[chatId];

  if (session?.waitingFor === 'full_name_input') {
    try {
      const users = await makeApiRequest('get', `/users/`);
      const user = users.find(u => u.telegram_id === chatId);

      if (user) {
        await makeApiRequest('patch', `/users/${user.id}/`, { full_name: text });
        await bot.sendMessage(chatId, `✅ Ismingiz "${text}" saqlandi.`);
        session.waitingFor = null;
        await menuHandler(bot, chatId, user.status);
      } else {
        await bot.sendMessage(chatId, "❗ Profil topilmadi. /start buyrug‘ini qayta yuboring.");
      }
    } catch (e) {
      await bot.sendMessage(chatId, "❌ Ismni saqlashda xatolik.");
    }
    return;
  }

  const actions = {
    "🗃️ Kategoriyalar": () => showCategories(bot, chatId),
    "🛍️ Buyurtmalar": () => showGetOrders(bot, chatId),
    "🔔 Bizni kuzating": () =>
      bot.sendMessage(chatId,
        `<b>🌟 Bizni ijtimoiy tarmoqlarda kuzatib boring!</b>\n\n` +
        `📸 Instagram: 👉 <a href="https://www.instagram.com/iqro_quva_kitoblar?igsh=d3pvdWR6YjhmdHg=">Iqro_quva_kitoblar</a>\n` +
        `📢 Telegram: 👉 <a href="https://t.me/iqro_quvakitob">t.me/Iqro_quva_kitoblar</a>\n\n` +
        `🛍️ Aksiya va yangiliklardan xabardor bo‘ling!`, { parse_mode: "HTML" }),
    "👨‍💻 Admin bilan bog‘lanish": () => showContactAdmin(bot, chatId),
    "🔙 Menuga qaytish": () => menuHandler(bot, chatId),
    "🔙 Kategoriyaga qaytish": async () => {
      await menuHandler(bot, chatId);
      await showCategories(bot, chatId);
    }
  };

  if (actions[text]) return actions[text]();

  const categories = ["Kitoblar", "Xo‘jalik mollari", "Sirli idishlar", "O‘quv qurollari", "Sovg‘abob buyumlar", "Chinni buyumlari"];
  if (categories.includes(text)) {
    try {
      const category = await makeApiRequest('get', `/categories/?name=${encodeURIComponent(text)}`);
      await showProducts(bot, chatId, category.id);
    } catch {
      await bot.sendMessage(chatId, `"${text}" kategoriyasi topilmadi.`);
    }
  }
});

// --- Callback (inline tugmalar)
bot.on('callback_query', async ({ id, data, message, from }) => {
  const chatId = message.chat.id;
  await bot.answerCallbackQuery(id, { text: '⏳ Yuklanmoqda...', show_alert: false });

  if (data.startsWith("category_")) {
    const categoryId = data.split('_')[1];
    await showProducts(bot, chatId, categoryId);
  }

  if (data.startsWith("product_details_")) {
    const productId = data.split('_')[2];
    
    try {
        const product = await makeApiRequest('get', `/products/${productId}/`);
        console.log(product);

        const caption = `<b>📦 Mahsulot nomi:</b> ${product.name}\n` +
                        `<b>💰 Narxi:</b> ${product.price} so'm\n` +
                        `<b>📝 Tavsif:</b> ${product.description || 'Yo‘q'}`;

        // Rasm manzili aniqlanadi
        const imageURL = product.image?.img 
            ? product.image.img
            : 'https://www.tapeciarnia.pl/tapety/normalne/178919_mlyn_wodny_rzeka_kamienie_las.jpg';

        // Rasmni yuborish`
        await bot.sendPhoto(chatId, imageURL, {
            caption,
            parse_mode: "HTML"
        });

        } catch (err) {
            await bot.sendMessage(chatId, "❌ Mahsulot tafsilotlarini yuklashda xatolik.");
            console.error("Mahsulotni yuborishda xatolik:", err.response?.data || err.message || err);
        }
  }
  if (data.startsWith("order_now_")) {
    try {
      const productId = data.split('_')[2];
      const users = await makeApiRequest('get', `/users/`);
      const user = users.find(u => u.telegram_id === from.id);
      const product = await makeApiRequest('get', `/products/${productId}/`);

      if (!user || !product) {
        return await bot.sendMessage(chatId, "❌ Buyurtma uchun kerakli maʼlumot topilmadi.");
      }

      const orderData = {
        client: user.id,
        location: "Hozircha mavjud emas",
        items: [{ product_id: product.id, quantity: 1 }]
      };

      const order = await makeApiRequest('post', `/orders/`, orderData);
      await bot.sendMessage(chatId, `🎉 Buyurtmangiz qabul qilindi! Buyurtma ID: ${order.id}`);
    } catch (err) {
      await bot.sendMessage(chatId, "❌ Buyurtma berishda xatolik yuz berdi.");
    }
  }
});

// --- Pollingdagi xatolar
bot.on('polling_error', (err) => console.error("❗ Polling xatosi:", err.message));
