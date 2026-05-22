const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// আপনার দেওয়া ইনফরমেশন এখানে সরাসরি সেট করা হলো
const BOT_TOKEN = "8916888298:AAEIuLU0f4n_DuVXNhKj5bs22D5LtS0eWHA";
const ADMIN_ID = 7750636787; 
const MUST_JOIN_CHANNEL = "@earnBd134"; 
const DROPLINK_API_KEY = "4bb693a47d56a87d9842dd009113cdb13ae73396";

const bot = new Telegraf(BOT_TOKEN);

// ডাটাবেস অবজেক্ট
const db = {
    users: {},
    tasks: [] 
};

// বাধ্যতামূলক চ্যানেল জয়েন চেক করার মিডলওয়্যার
async function checkChannelJoin(ctx, next) {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID) return next(); 

    try {
        const member = await ctx.telegram.getChatMember(MUST_JOIN_CHANNEL, userId);
        if (member.status === 'left' || member.status === 'kicked') {
            return ctx.reply(`📢 আমাদের বটে কাজ করে টাকা ইনকাম করতে হলে প্রথমে আমাদের চ্যানেলে জয়েন করতে হবে!\n\n👉 জয়েন করুন: ${MUST_JOIN_CHANNEL}\n\nজয়েন করার পর আবার বটের নিচে /start লিখুন বা নিচের বোতামে চাপুন।`, 
            Markup.inlineKeyboard([
                [Markup.button.url('📢 Join Channel', `https://t.me/${MUST_JOIN_CHANNEL.replace('@', '')}`)],
                [Markup.button.callback('✅ Checked Join', 'check_again')]
            ]));
        }
        return next();
    } catch (error) {
        console.error("Channel error:", error);
        return next(); 
    }
}

function registerUser(userId, name) {
    if (!db.users[userId]) {
        db.users[userId] = {
            id: userId,
            name: name,
            balance: 0.00,
            completed: {},
            totalWithdrawn: 0
        };
    }
}

// =================== ইউজার প্যানেল ===================

const userMenu = Markup.keyboard([
    ['💰 My Balance', '🎯 Complete Task'],
    ['🎁 Daily Bonus', '👥 Invite & Earn'],
    ['💳 Withdraw Money', '📢 Help & Info']
]).resize();

bot.start(checkChannelJoin, (ctx) => {
    const userId = ctx.from.id;
    registerUser(userId, ctx.from.first_name);

    let msg = `👋 স্বাগতম ${ctx.from.first_name}!\nআমাদের অটোমেটিক আর্নিং বটে কাজ করে আপনি প্রতিদিন বিকাশ ও নগদে আনলিমিটেড পেমেন্ট নিতে পারবেন। নিচের বাটন চেপে কাজ শুরু করুন।`;
    if (userId === ADMIN_ID) {
        msg += `\n\n👑 হ্যালো বস! আপনি এই বটের মালিক। অ্যাডমিন ড্যাশবোর্ডের জন্য টাইপ করুন: /admin`;
    }
    ctx.reply(msg, userMenu);
});

bot.action('check_again', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply('🔄 যাচাই করা হচ্ছে... অনুগ্রহ করে আবার /start লিখুন।');
});

bot.hears('💰 My Balance', checkChannelJoin, (ctx) => {
    const userId = ctx.from.id;
    registerUser(userId, ctx.from.first_name);
    const user = db.users[userId];
    ctx.reply(`👤 ইউজার: ${user.name}\n🆔 আইডি: ${user.id}\n\n💰 আপনার বর্তমান ব্যালেন্স: ${user.balance.toFixed(2)} টাকা\n💳 মোট উইথড্র করেছেন: ${user.totalWithdrawn} টাকা`);
});

bot.hears('🎁 Daily Bonus', checkChannelJoin, (ctx) => {
    const userId = ctx.from.id;
    registerUser(userId, ctx.from.first_name);
    
    db.users[userId].balance += 1.00; 
    ctx.reply(`🎉 অভিনন্দন! আপনি আজকের ডেইলি বোনাস ১.০০ টাকা পেয়ে গেছেন।\n💰 বর্তমান ব্যালেন্স: ${db.users[userId].balance.toFixed(2)} টাকা`);
});

bot.hears('🎯 Complete Task', checkChannelJoin, async (ctx) => {
    const userId = ctx.from.id;
    registerUser(userId, ctx.from.first_name);

    if (db.tasks.length === 0) {
        return ctx.reply("😔 এই মুহূর্তে কোনো কাজ খালি নেই। অ্যাডমিন নতুন কাজ দিলে অ্যাপে আপডেট পাবেন।");
    }

    ctx.reply("⏳ আপনার জন্য অটোমেটিক লিংক জেনারেট করা হচ্ছে, দয়া করে ২ সেকেন্ড অপেক্ষা করুন...");

    for (let i = 0; i < db.tasks.length; i++) {
        const task = db.tasks[i];
        if (db.users[userId].completed[i]) continue;

        try {
            const destinationUrl = `https://t.me/${ctx.botInfo.username}?start=verify_${i}_${userId}`;
            const response = await axios.get(`https://droplink.co/api?api=${DROPLINK_API_KEY}&url=${encodeURIComponent(destinationUrl)}`);
            
            if (response.data && response.data.shortenedUrl) {
                const shortLink = response.data.shortenedUrl;
                return ctx.reply(`🎯 **টাস্ক নাম্বার #${i + 1}**\n💰 রিওয়ার্ড: ${task.reward} টাকা\n\n👇 নিচের লিংকে ক্লিক করে ওয়েবসাইটটি সম্পূর্ণ ভিজিট করুন। ভিজিট শেষ হলে এই বট আপনাকে অটোমেটিক টাকা দিয়ে দেবে:\n\n🔗 লিংক: ${shortLink}`);
            }
        } catch (err) {
            console.error("Droplink API Error:", err.message);
        }
    }
    ctx.reply("🎉 চমৎকার! আপনি আজকের সমস্ত কাজ সম্পূর্ণ করে ফেলেছেন। নতুন কাজের জন্য অপেক্ষা করুন।");
});

bot.start(async (ctx) => {
    const startPayload = ctx.message.text.split(' ')[1];
    if (startPayload && startPayload.startsWith('verify_')) {
        const parts = startPayload.split('_');
        const taskIndex = parseInt(parts[1]);
        const userId = parseInt(parts[2]);

        if (ctx.from.id !== userId) return ctx.reply("❌ ত্রুটি: লিঙ্ক ভেরিফিকেশন ম্যাচ করেনি!");

        registerUser(userId, ctx.from.first_name);

        if (db.users[userId].completed[taskIndex]) {
            return ctx.reply("❌ আপনি এই কাজটি অলরেডি একবার কমপ্লিট করে ফেলেছেন!");
        }

        const reward = db.tasks[taskIndex].reward;
        db.users[userId].balance += reward;
        db.users[userId].completed[taskIndex] = true;

        ctx.reply(`✅ অভিনন্দন! ড্রপলিংক ওয়েবসাইট ভেরিফিকেশন সফল হয়েছে।\n💰 আপনার অ্যাকাউন্টে ${reward} টাকা যোগ করা হয়েছে।`);
    }
});

bot.hears('💳 Withdraw Money', checkChannelJoin, (ctx) => {
    const userId = ctx.from.id;
    const user = db.users[userId] || { balance: 0 };

    if (user.balance < 50) {
        return ctx.reply("❌ দুঃখিত! সর্বনিম্ন উইথড্র লিমিট ৫০ টাকা। টাকা ইনকাম করে আবার চেষ্টা করুন।");
    }

    ctx.reply("💳 **উইথড্র করার নিয়ম:**\n\nনিচের বক্সে আপনার নাম্বার ও টাকার পরিমাণ লিখে এডমিনকে মেসেজ পাঠান।\n\nযেমন: `বিকাশ পার্সোনাল - ০১৭XXXXXXXX - ৫০ টাকা`\n\n(এডমিন আপনার রিকোয়েস্ট দেখে সাথে সাথে টাকা পাঠিয়ে দেবে)।");
});

bot.hears('👥 Invite & Earn', checkChannelJoin, (ctx) => {
    const link = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.from.id}`;
    ctx.reply(`👥 বন্ধুদের ইনভাইট করে আনলিমিটেড ইনকাম করুন!\n\n🔗 আপনার রেফারেল লিংক:\n${link}`);
});

bot.hears('📢 Help & Info', (ctx) => {
    ctx.reply('🛠️ এই বটটি সম্পূর্ণ সচল আছে। যেকোনো সমস্যায় আমাদের এডমিনের সাথে যোগাযোগ করুন।');
});

// =================== এডমিন প্যানেল ===================

bot.command('admin', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ আপনি এই বটের মালিক নন!");

    ctx.reply(`👑 **অ্যাডমিন ড্যাশবোর্ড প্যানেল**\n\n📈 বটের মোট একটিভ ইউজার: ${Object.keys(db.users).length} জন\n📊 লাইভ টাস্ক সংখ্যা: ${db.tasks.length} টি\n\n🛠️ **অ্যাডমিন কমান্ডস (কোড ছাড়া কন্ট্রোল):**\n\n🔹 \`/users\` - সব ইউজারের আইডি, নাম ও ব্যালেন্স একসাথে দেখুন\n🔹 \`/addtask [লিংক] [টাকা]\` - নতুন শর্টলিংক কাজ দিন\n🔹 \`/pay [ইউজার_আইডি] [টাকা]\` - ইউজারকে পেমেন্ট করে ব্যালেন্স কেটে নেওয়া\n🔹 \`/cleartask\` - সব পুরনো কাজ এক ক্লিকে মুছে ফেলা`, { parse_mode: 'Markdown' });
});

bot.command('addtask', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply("❌ ভুল ফরম্যাট! এভাবে লিখুন: /addtask [লিংক] [টাকার_পরিমাণ]");

    const url = args[1];
    const reward = parseFloat(args[2]);

    db.tasks.push({ url, reward });
    ctx.reply(`✅ নতুন টাস্ক সফলভাবে যুক্ত হয়েছে!\n💰 ইউজার পাবে: ${reward} টাকা\n🔗 ড্রপলিংক এপিআই দিয়ে এটি অটো শর্ট হয়ে যাবে।`);
});

bot.command('users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (Object.keys(db.users).length === 0) return ctx.reply("বটে এখনো কোনো ইউজার জয়েন করেনি।");

    let list = "👥 **ইউজার ডাটাবেস ইনফরমেশন:**\n\n";
    for (let id in db.users) {
        let u = db.users[id];
        list += `👤 নাম: ${u.name}\n🆔 আইডি: \`${u.id}\`\n💰 ব্যালেন্স: ${u.balance.toFixed(2)} টাকা\n-----------------------\n`;
    }
    ctx.replyWithMarkdown(list);
});

bot.command('pay', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply("❌ সঠিক নিয়ম: /pay [ইউজার_আইডি] [টাকা]");

    const targetId = args[1];
    const amount = parseFloat(args[2]);

    if (db.users[targetId]) {
        db.users[targetId].balance -= amount;
        db.users[targetId].totalWithdrawn += amount;
        
        ctx.reply(`✅ ইউজার \`${targetId}\` কে সফলভাবে পেমেন্ট করা হয়েছে। তার অ্যাকাউন্ট থেকে ${amount} টাকা কেটে নেওয়া হয়েছে।`, { parse_mode: 'Markdown' });
        ctx.telegram.sendMessage(targetId, `🎉 অভিনন্দন এডমিন আপনার বিকাশ/নগদ পেমেন্ট রিকোয়েস্ট অ্যাপ্রুভ করেছে! আপনার নাম্বারে ${amount} টাকা পেমেন্ট করা হয়েছে।`);
    } else {
        ctx.reply("❌ এই আইডি ওয়ালা কোনো ইউজার বটের ডাটাতে নেই!");
    }
});

bot.command('cleartask', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    db.tasks = [];
    ctx.reply("🧹 বটের আগের সব কাজ সফলভাবে মুছে ফেলা হয়েছে!");
});

bot.launch();

module.exports = async (req, res) => {
    res.status(200).send("Earning Network Engine Online!");
};
