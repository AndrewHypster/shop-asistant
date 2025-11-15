const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // ID чату або групи менеджера

async function sendTelegramNotification(message) {
  if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
    console.error("Telegram credentials are not set.");
    return; // Не можемо відправити
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔥 ЗАМОВЛЕННЯ ЧЕРЕЗ AI КОНСУЛЬТАНТА 🔥\n\nПовідомлення клієнта: ${message}`,
        parse_mode: "HTML",
      }),
    });
    console.log("Telegram notification sent successfully.");
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}

export default sendTelegramNotification