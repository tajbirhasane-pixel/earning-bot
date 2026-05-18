else:
            bot.send_message(message.chat.id, "❌ এই মুহূর্তে কোনো নতুন টাস্ক নেই!")
            
    elif message.text == "💳 Withdraw করুন":
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(text="বিকাশ (bKash)", callback_data="w_bkash"))
        markup.add(types.InlineKeyboardButton(text="নগদ (Nagad)", callback_data="w_nagad"))
        bot.send_message(message.chat.id, "👇 টাকা তোলার মাধ্যমটি সিলেক্ট করুন:", reply_markup=markup)
        
    elif message.text == "/admin" and user_id == ADMIN_ID:
        bot.send_message(message.chat.id, "👑 অ্যাডমিন প্যানেল অ্যাক্টিভেট হয়েছে।", reply_markup=admin_menu())
        
    elif message.text == "➕ নতুন টাস্ক দিন" and user_id == ADMIN_ID:
        msg = bot.send_message(message.chat.id, "টাস্কের লিংকটি দিন (যেমন: https://youtube.com/):")
        bot.register_next_step_handler(msg, get_task_link)
        
    elif message.text == "🔙 মেইন মেনু":
        bot.send_message(message.chat.id, "আপনি মেইন মেনুতে ফিরে এসেছেন।", reply_markup=main_menu())

def get_task_link(message):
    link = message.text
    msg = bot.send_message(message.chat.id, "এই টাস্কের জন্য কত পয়েন্ট দিতে চান? (যেমন: 15.5):")
    bot.register_next_step_handler(msg, lambda m: save_task(m, link))

def save_task(message, link):
    try:
        reward = float(message.text)
        conn = sqlite3.connect("earning.db")
        cursor = conn.cursor()
        cursor.execute("INSERT INTO tasks (link, reward) VALUES (?, ?)", (link, reward))
        conn.commit()
        conn.close()
        bot.send_message(message.chat.id, "✅ টাস্কটি সফলভাবে যুক্ত হয়েছে! ইউজাররা এখন এটি করতে পারবে।")
    except:
        bot.send_message(message.chat.id, "❌ ভুল ইনপুট! শুধু সংখ্যা লিখুন।")

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    user_id = call.from_user.id
    
    if not check_join(user_id):
        bot.answer_callback_query(call.id, "⚠️ আগে চ্যানেলে জয়েন করুন!", show_alert=True)
        return
    
    if call.data.startswith("done_"):
        _, task_id, reward = call.data.split("_")
        reward = float(reward)
        
        conn = sqlite3.connect("earning.db")
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET balance = balance + ? WHERE id=?", (reward, user_id))
        conn.commit()
        conn.close()
        
        bot.answer_callback_query(call.id, "✅ টাস্ক সফল!")
        bot.send_message(call.message.chat.id, f"🎉 অভিনন্দন! আপনার ব্যালেন্সে {reward} Points যোগ করা হয়েছে।")
        
    elif call.data.startswith("w_"):
        method = "বিকাশ" if "bkash" in call.data else "নগদ"
        msg = bot.send_message(call.message.chat.id, f"📱 আপনার {method} নাম্বারটি টাইপ করে পাঠান:")
        bot.register_next_step_handler(msg, lambda m: request_withdraw(m, method))

def request_withdraw(message, method):
    number = message.text
    user_id = message.from_user.id
    
    conn = sqlite3.connect("earning.db")
    cursor = conn.cursor()
    cursor.execute("SELECT balance FROM users WHERE id=?", (user_id,))
    res = cursor.fetchone()
    balance = res[0] if res else 0.0
    
    if balance >= 50.0: # সর্বনিম্ন উইথড্র ৫০ পয়েন্ট
        cursor.execute("UPDATE users SET balance = 0.0 WHERE id=?", (user_id,))
        conn.commit()
        conn.close()
        
        # সরাসরি অ্যাডমিনকে (আপনাকে) নোটিফিকেশন পাঠানো
        bot.send_message(ADMIN_ID, f"🔔 নতুন উইথড্র রিকোয়েস্ট!\n\n👤 ইউজার আইডি: {user_id}\n📱 মাধ্যম: {method}\n🔢 নাম্বার: {number}\n💰 পরিমাণ: {balance} Points")
        bot.send_message(message.chat.id, "✅ আপনার উইথড্র রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে! কিছুক্ষণের মধ্যে টাকা পেয়ে যাবেন।")
    else:
        conn.close()
        bot.send_message(message.chat.id, f"❌ আপনার ব্যালেন্স পর্যাপ্ত নয়! সর্বনিম্ন ৫০ পয়েন্ট প্রয়োজন (আপনার আছে: {balance})।")

bot.infinity_polling(timeout=20, long_polling_timeout=10)
