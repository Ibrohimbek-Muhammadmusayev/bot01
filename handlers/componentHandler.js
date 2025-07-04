// start.js

async function startHandler(bot, msg) {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'aziz foydalanuvchi';
    console.log(`📥 /start: ${firstName} (${chatId})`);

    try {
        await bot.sendMessage(chatId, `Salom ${firstName}, botga xush kelibsiz!`);
        await bot.sendMessage(chatId, "📱 Telefon raqamingizni yuborish uchun tugmani bosing:", {
            reply_markup: {
                keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } catch (err) {
        console.error("❌ startHandler:", err.message || err);
        await bot.sendMessage(chatId, "Xatolik yuz berdi. Keyinroq urinib ko‘ring.");
    }
}

async function startSetName(bot, chatId, userSession) {
    try {
        await bot.sendMessage(chatId, "📛 Iltimos, ismingizni kiriting:", {
            reply_markup: { force_reply: true }
        });
        userSession.waitingFor = 'full_name_input';
    } catch (err) {
        console.error("❌ startSetName:", err.message || err);
        await bot.sendMessage(chatId, "Xatolik yuz berdi.");
    }
}

async function menuHandler(bot, chatId) {
    try {
        await bot.sendMessage(chatId, "Menyudan tanlang:", {
            reply_markup: {
                keyboard: [
                    ["🗃️ Kategoriyalar", "🔔 Bizni kuzating"],
                    ["👨‍💻 Admin bilan bog‘lanish"]
                ],
                resize_keyboard: true
            }
        });
    } catch (err) {
        console.error("❌ menuHandler:", err.message || err);
        await bot.sendMessage(chatId, "Menyuni ko‘rsatishda xatolik.");
    }
}

async function showGetOrders(bot, chatId) {
    try {
        const user = (await global.makeApiRequest('get', `/users/`)).find(u => u.telegram_id === chatId);
        const orders = await global.makeApiRequest('get', `/orders/`);
        const userOrders = orders.filter(order => order.client === user.id);

        if (userOrders.length) {
            let msg = "🛍️ Buyurtmalaringiz:\n\n";
            for (const order of userOrders) {
                msg += `**Buyurtma ID:** #${order.id}\n`;
                msg += `**Holati:** ${order.status}\n`;
                msg += `**Narxi:** ${order.total_price} UZS\n`;
                msg += `**Sana:** ${new Date(order.created_at).toLocaleString('uz-UZ')}\n`;
                msg += `--------------------\n\n`;
            }
            await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        } else {
            await bot.sendMessage(chatId, "Buyurtmalaringiz topilmadi.");
        }
    } catch (err) {
        console.error("❌ showGetOrders:", err.message || err);
        await bot.sendMessage(chatId, "Buyurtmalarni olishda xatolik yuz berdi.");
    }
}

async function showDeliveringList(bot, chatId) {
    try {
        const users = (await global.makeApiRequest('get', `/users/?telegram_id=${chatId}`)).results;
        if (!users?.length) return bot.sendMessage(chatId, "Ro‘yxatdan o‘ting (/start)");

        const userId = users[0].id;
        const orders = (await global.makeApiRequest('get', `/orders/?client=${userId}&status=delivering`)).results;

        if (orders.length) {
            let msg = "🚚 Yetkazilayotgan buyurtmalar:\n\n";
            for (const order of orders) {
                msg += `**Buyurtma ID:** #${order.id}\n`;
                msg += `**Holati:** ${order.status}\n`;
                msg += `**Manzil:** ${order.location || 'Noma\'lum'}\n`;
                msg += `**Sana:** ${new Date(order.created_at).toLocaleString('uz-UZ')}\n`;
                msg += `--------------------\n\n`;
            }
            await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
        } else {
            await bot.sendMessage(chatId, "Hozirda yetkazilayotgan buyurtmalar yo‘q.");
        }
    } catch (err) {
        console.error("❌ showDeliveringList:", err.message || err);
        await bot.sendMessage(chatId, "Buyurtmalarni olishda xatolik.");
    }
}

async function showContactAdmin(bot, chatId) {
    try {
        await bot.sendMessage(chatId,
            `👨‍💻 Admin bilan bog‘lanish:\n📞 Telefon: +998916602001\n💬 Telegram: @Muhammadrasul1995`);
    } catch (err) {
        console.error("❌ showContactAdmin:", err.message || err);
        await bot.sendMessage(chatId, "Admin ma’lumotlarini ko‘rsatishda xatolik.");
    }
}

async function showCategories(bot, chatId) {
    try {
        const categories = await global.makeApiRequest('get', '/categories/');
        if (!categories.length) return bot.sendMessage(chatId, "Kategoriyalar mavjud emas.");

        const buttons = categories.reduce((acc, cat, idx) => {
            if (idx % 2 === 0) acc.push([]);
            acc[acc.length - 1].push({
                text: cat.name,
                callback_data: `category_${cat.id}`
            });
            return acc;
        }, []);

        buttons.push([{ text: "🔙 Menuga qaytish", callback_data: "back_to_menu" }]);

        await bot.sendMessage(chatId, "Quyidagi kategoriyalardan tanlang:", {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        console.error("❌ showCategories:", err.message || err);
        await bot.sendMessage(chatId, "Kategoriyalarni olishda xatolik.");
    }
}

async function showProducts(bot, chatId, categoryId = null) {
    try {
        let products = await global.makeApiRequest('get', '/products/');
        if (!products.length) return bot.sendMessage(chatId, "📂 Hozircha mahsulotlar yo‘q.");

        if (categoryId) {
            products = products.filter(p => p.category?.id === +categoryId || p.category === +categoryId);
            if (!products.length) {
                const category = await global.makeApiRequest('get', `/categories/${categoryId}/`);
                return bot.sendMessage(chatId, `📂 "${category.name}" kategoriyasida mahsulot yo‘q.`);
            }
        }

        let message = `<b>🛍 Mahsulotlar ro'yxati:</b>\n\n`;
        const buttons = [];

        products.forEach((product, idx) => {
            const desc = (product.description || "Tavsif yo‘q").slice(0, 70);
            message += `📦 <b>${idx + 1}. ${product.name}</b>\n`;
            message += `💰 <b>Narxi:</b> ${product.price ?? 'Noma’lum'} so‘m\n`;
            message += `📝 <b>Tavsif:</b> ${desc}\n\n`;
            if (idx % 3 === 0) buttons.push([]);
            buttons[buttons.length - 1].push({
                text: `${idx + 1}`,
                callback_data: `product_details_${product.id}`
            });
        });

        await bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        });

        await bot.sendMessage(chatId, "🔙 Kategoriyaga qaytish uchun quyidagi tugmadan foydalaning:", {
            reply_markup: {
                keyboard: [[{ text: "🔙 Kategoriyaga qaytish" }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });

    } catch (err) {
        console.error("❌ showProducts:", err.message || err);
        await bot.sendMessage(chatId, "Mahsulotlarni ko‘rsatishda xatolik yuz berdi.");
    }
}

module.exports = {
    startHandler,
    startSetName,
    menuHandler,
    showGetOrders,
    showDeliveringList,
    showContactAdmin,
    showCategories,
    showProducts
};
