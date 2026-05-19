import telebot
from telebot import types
import flask
import threading
import os

# --- আপনার দেওয়া টোকেন ও আইডি সেট করা হয়েছে ---
BOT_TOKEN = "8772527327:AAHQ3YowFQ5bzWgnKK_585t3oI5gNTRMn2U"  
ADMIN_ID = 8078398755  

bot = telebot.TeleBot(BOT_TOKEN)
app = flask.Flask(__name__)

# --- ডাটাবেস (আপাতত মেমোরি বেসড) ---
users_db = {}
current_task = "আমাদের অফিশিয়াল চ্যানেলে জয়েন করুন এবং স্ক্রিনশট গ্রুপে জমা দিন।"
task_reward = 10  # টাকা

@app.route('/')
def index():
    return "Bot is Running 24/7!"

# --- মেইন বট কোড ---
@bot.message_handler(commands=['start'])
def start(message):
    user_id = message.from_user.id
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'submitted': False}
    
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row("📋 Task", "💰 Balance")
    markup.row("💳 Withdraw", "📞 Support")
    
    if user_id == ADMIN_ID:
        markup.row("👑 Admin Panel")
        
    bot.send_message(message.chat.id, "👋 স্বাগতম আর্নিং বটে! নিচে বাটনে ক্লিক করে কাজ শুরু করুন।", reply_markup=markup)

@bot.message_handler(func=lambda message: True)
def handle_menu(message):
    user_id = message.from_user.id
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'submitted': False}
        
    if message.text == "📋 Task":
        bot.send_message(message.chat.id, f"🎯 **আজকের টাস্ক:**\n{current_task}\n\n💰 **পুরস্কার:** {task_reward} টাকা\n\n(কাজ শেষ করে গ্রুপে বা অ্যাডমিনকে স্ক্রিনশট দিন)")
        
    elif message.text == "💰 Balance":
        bal = users_db[user_id]['balance']
        bot.send_message(message.chat.id, f"💵 **আপনার বর্তমান ব্যালেন্স:** {bal} টাকা")
        
    elif message.text == "💳 Withdraw":
        bal = users_db[user_id]['balance']
        if bal < 50:
            bot.send_message(message.chat.id, "⚠️ সর্বনিম্ন উইথড্র ৫০ টাকা। আগে ব্যালেন্স তৈরি করুন।")
        else:
            msg = bot.send_message(message.chat.id, "💸 উইথড্র করার জন্য আপনার **বিকাশ/নগদ নম্বর এবং টাকার পরিমাণ** লিখে পাঠান।\n\nউদাহরণ: `017XXXXXXXX - Bkash - 50`")
            bot.register_next_step_handler(msg, process_withdraw)
            
    elif message.text == "📞 Support":
        bot.send_message(message.chat.id, "ℹ️ যেকোনো সমস্যার জন্য সরাসরি অ্যাডমিনের সাথে যোগাযোগ করুন।")
        
    elif message.text == "👑 Admin Panel" and user_id == ADMIN_ID:
        admin_markup = types.InlineKeyboardMarkup()
        admin_markup.add(types.InlineKeyboardButton("🔄 চেঞ্জ টাস্ক", callback_data="change_task"))
        admin_markup.add(types.InlineKeyboardButton("➕ ইউজারকে টাকা দিন", callback_data="give_money"))
        bot.send_message(message.chat.id, "⚙️ **অ্যাডমিন প্যানেল:**", reply_markup=admin_markup)

# --- উইথড্র প্রসেস (অ্যাডমিনের কাছে নোটিফিকেশন যাবে) ---
def process_withdraw(message):
    user_id = message.from_user.id
    details = message.text
    bal = users_db[user_id]['balance']
    
    # অ্যাডমিনকে পাঠানো
    bot.send_message(ADMIN_ID, f"🔔 **নতুন উইথড্র রিকোয়েস্ট!**\n👤 ইউজার আইডি: `{user_id}`\n📱 ডিটেইলস: {details}\n💵 ব্যালেন্স ছিল: {bal} টাকা")
    bot.send_message(message.chat.id, "✅ আপনার উইথড্র রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে। ১-২৪ ঘণ্টার মধ্যে পেমেন্ট পেয়ে যাবেন।")

# --- ইনলাইন বাটন হ্যান্ডলার (অ্যাডমিনের জন্য) ---
@bot.callback_query_handler(func=lambda call: True)
def admin_callback(call):
    if call.from_user.id != ADMIN_ID:
        return
        
    if call.data == "change_task":
        msg = bot.send_message(call.message.chat.id, "✍️ নতুন টাস্কটি লিখে পাঠান:")
        bot.register_next_step_handler(msg, set_new_task)
        
    elif call.data == "give_money":
        msg = bot.send_message(call.message.chat.id, "✍️ ইউজারের ID এবং টাকার পরিমাণ দিন (স্পেস দিয়ে):\n\nউদাহরণ: `123456789 50`")
        bot.register_next_step_handler(msg, credit_user)

def set_new_task(message):
    global current_task
    current_task = message.text
    bot.send_message(ADMIN_ID, "✅ টাস্ক সফলভাবে পরিবর্তন হয়েছে!")

def credit_user(message):
    try:
        u_id, amount = message.text.split()
        u_id = int(u_id)
        amount = int(amount)
        
        if u_id in users_db:
            users_db[u_id]['balance'] += amount
            bot.send_message(ADMIN_ID, f"✅ ইউজার `{u_id}` কে {amount} টাকা দেওয়া হয়েছে।")
            bot.send_message(u_id, f"🎉 অ্যাডমিন আপনাকে {amount} টাকা রিওয়ার্ড দিয়েছেন! ব্যালেন্স চেক করুন।")
        else:
            # যদি ইউজার এখনো ডাটাবেসে না থাকে, তাও ফোর্সড অ্যাড করা হবে
            users_db[u_id] = {'balance': amount, 'submitted': False}
            bot.send_message(ADMIN_ID, f"✅ ইউজার নতুন ছিল। ডাটাবেসে তৈরি করে `{u_id}` কে {amount} টাকা দেওয়া হয়েছে।")
            try:
                bot.send_message(u_id, f"🎉 অ্যাডমিন আপনাকে {amount} টাকা রিওয়ার্ড দিয়েছেন! ব্যালেন্স চেক করুন।")
            except:
                pass
    except:
        bot.send_message(ADMIN_ID, "❌ ভুল ফরম্যাট! আবার চেষ্টা করুন।")

# --- সার্ভার রান করার ফাংশন ---
def run_server():
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

if __name__ == "__main__":
    # ব্যাকগ্রাউন্ডে ফ্ল্যাস্ক ওয়েব সার্ভার চলবে যাতে রেন্ডার একটিভ থাকে
    t = threading.Thread(target=run_server)
    t.start()
    
    print("Bot started...")
    bot.infinity_polling()
