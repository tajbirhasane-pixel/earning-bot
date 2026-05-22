const { Telegraf, Markup } = require('telegraf');

// Vercel-এর Environment Variable থেকে টোকেন নেবে
const bot = new Telegraf(process.env.BOT_TOKEN);

// ইউজারের ডাটা সেভ রাখার জন্য (মেমরি ডাটাবেজ)
const users = {};

// বটের মেইন মেনু কিবোর্ড
const mainMenu = Markup.keyboard([
    ['💰 My Balance', '🎁 Daily Bonus'],
    ['👥 Invite Friends', '📢 Help & Info']
]).resize();

// /start কমান্ড দিলে যা হবে
bot.start((ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name;

    // ইউজার নতুন হলে তার একাউন্ট তৈরি হবে (০ ব্যালেন্স দিয়ে)
    if (!users[userId]) {
        users[userId] = {
            balance: 0,
            lastBonus: 0
        };
    }

    ctx.reply(`স্বাগতম ${username}! আমাদের আর্নিং বটে আপনাকে স্বাগতম। নিচের বাটনগুলো ব্যবহার করে ইনকাম শুরু করুন।`, mainMenu);
});

// ব্যালেন্স দেখার বাটন
bot.hears('💰 My Balance', (ctx) => {
    const userId = ctx.from.id;
    const user = users[userId] || { balance: 0 };
    ctx.reply(`👤 আপনার নাম: ${ctx.from.first_name}\n\n💰 আপনার বর্তমান ব্যালেন্স: ${user.balance} টাকা`);
});

// DAILY BONUS বাটন
bot.hears('🎁 Daily Bonus', (ctx) => {
    const userId = ctx.from.id;
    if (!users[userId]) users[userId] = { balance: 0, lastBonus: 0 };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // ২৪ ঘণ্টা মিলিসেকেন্ডে

    if (now - users[userId].lastBonus < oneDay) {
        ctx.reply('❌ আপনি আজ অলরেডি বোনাস নিয়ে নিয়েছেন! আবার ২৪ ঘণ্টা পর চেষ্টা করুন।');
    } else {
        const bonusAmount = 10; // প্রতিদিন ১০ টাকা বোনাস
        users[userId].balance += bonusAmount;
        users[userId].lastBonus = now;
        ctx.reply(`🎉 অভিনন্দন! আপনি আজকের ডেইলি বোনাস ${bonusAmount} টাকা পেয়ে গেছেন।\n💰 বর্তমান ব্যালেন্স: ${users[userId].balance} টাকা`);
    }
});

// রেফারেল বাটন
bot.hears('👥 Invite Friends', (ctx) => {
    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=${ctx.from.id}`;
    ctx.reply(`👥 আপনার বন্ধুদের ইনভাইট করে ইনকাম করুন!\n\n🔗 আপনার রেফারেল লিংক:\n${referralLink}\n\n(প্রতি সফল রেফারে পাবেন ৫ টাকা)`);
});

// হেল্প বাটন
bot.hears('📢 Help & Info', (ctx) => {
    ctx.reply('🛠️ এই বটটি সম্পূর্ণ সচল আছে। যেকোনো সমস্যায় আমাদের এডমিনের সাথে যোগাযোগ করুন।');
});

// বটের সার্ভার সচল রাখার জন্য (Vercel Webhook)
bot.launch();

// Vercel-এর জন্য এক্সপোর্ট
module.exports = async (req, res) => {
    res.status(200).send("Bot is Running 24/7!");
};
