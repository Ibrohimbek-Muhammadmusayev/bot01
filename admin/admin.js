// async function handleAdminCommands(bot, msg) {
//     const chatId = msg.chat.id;
//     const text = msg.text;
//     await bot.bot.sendMessage(chatId, "salom admin")
//     // if (!isAdmin(chatId)) {
//     //     await bot.sendMessage(chatId, "Sizda bu buyruqni ishlatish uchun ruxsat yo'q.");
//     //     return;
//     // }

//     // if (text === "/admin") {
//     //     await bot.sendMessage(chatId, "Admin paneli:\n/stats - Statistika\n/add_product - Mahsulot qo'shish");
//     // } else if (text === "/stats") {
//     //     // Statistika logikasi
//     //     await bot.sendMessage(chatId, "Statistika hozircha mavjud emas.");
//     // }
//     // Boshqa admin buyruqlari shu yerga qo'shiladi
// }

// module.exports = {
//     handleAdminCommands,
//     // Agar boshqa adminga oid funksiyalar bo'lsa, ularni ham bu yerda eksport qiling
// };