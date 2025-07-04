async function userData(bot, chatId, phoneNumber, firstName, username) {
    console.log(`📞 Tel: ${phoneNumber}, 💬 Chat ID: ${chatId}, 👤 Ism: ${firstName}, 🧑‍💻 Username: ${username}`);

    try {
        // Foydalanuvchilar ro'yxatini olib kelamiz
        const users = await global.makeApiRequest('get', '/users/');

        // Telegram ID orqali foydalanuvchini topamiz
        const foundUser = users.find(user => user.telegram_id === chatId);

        let user;

        if (foundUser) {
            console.log(`✅ Foydalanuvchi topildi (ID: ${foundUser.id}), yangilanmoqda...`);

            // Foydalanuvchini yangilaymiz
            user = await global.makeApiRequest('patch', `/users/${foundUser.id}/`, {
                phone: phoneNumber,
                full_name: firstName,
                telegram_id: chatId,
                username: username
            });

            console.log('✅ Foydalanuvchi muvaffaqiyatli yangilandi.');
        } else {
            console.log('🆕 Foydalanuvchi topilmadi, yangi foydalanuvchi yaratilmoqda...');

            // Yangi foydalanuvchini yaratamiz
            user = await global.makeApiRequest('post', '/users/', {
                phone: phoneNumber,
                full_name: firstName,
                telegram_id: chatId,
                username: username
            });

            console.log('✅ Yangi foydalanuvchi yaratildi.');
        }

        return user;
    } catch (error) {
        console.error("❌ Xatolik yuz berdi:", error.response?.data || error.message || error);
        return null;
    }
}

module.exports = { userData };
