import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
// Припускаємо, що 'shop-bd.json' знаходиться у кореневому каталозі або в 'src/'
// і експортує масив товарів за замовчуванням.
import shop from "@/shop-bd.json";
import sendTelegramNotification from "../telegram/route";

// Ініціалізація AI (робіть це поза межами POST, щоб уникнути повторного ініціалізації)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash"; // Оптимальна модель для чату

// Функція для отримання даних (використовуємо імпортований shop)
const getProductData = () => {
  // Тут ви можете додати логіку фільтрації, якщо каталог великий
  return shop;
};

const telegramTool = {
  functionDeclarations: [
    {
      name: "sendTelegramNotification",
      description:
        'Відправляє сповіщення менеджеру магазину, коли клієнт висловлює чітке бажання здійснити покупку, наприклад, каже "Хочу купити", "Готовий замовляти" або "Оформлюйте замовлення".',
      parameters: {
        type: "OBJECT",
        properties: {
          message: {
            type: "STRING",
            description:
              "Повідомлення для менеджера. Має містити останній запит клієнта та рекомендований товар, якщо це можливо.",
          },
        },
        required: ["message"],
      },
    },
  ],
};


export async function POST(req) {
  try {
    const { history } = await req.json(); // Отримуємо всю історію з фронтенду

    // --- 1. ПІДГОТОВКА ДАНИХ ТА ПРОМПТА ---

    // Отримуємо всі товари
    const productData = getProductData();
    // Краще відправляти дані як JSON-рядок, щоб AI міг їх легко обробити
    const productsString = JSON.stringify(productData, null, 2);

    // Формування Системного Prompt
    const systemInstruction = `Ти – експерт-консультант інтернет-магазину. Твоя мета – допомогти клієнту вибрати найкращий товар. Використовуй тільки ці дані про товари для консультації: \n\n<CATALOG>${productsString}</CATALOG>\n\nБудь ввічливим та дружнім. Пропонуй конкретні товари з їхніми назвами, цінами та перевагами. Давай короткі та чіткі відповіді. Використовуй маркдаун. Якшо клієнт шось хоче купити спершу взнай імя, телефон може пошту або телеграм і тоді відправляй заявку`;

    // 3. Перетворення історії для моделі (Gemini)
    const geminiHistory = history.map((msg) => ({
      // Gemini використовує 'model' для відповідей, а не 'assistant'
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

    // --- 4. ВИКЛИК GEMINI API ---

    // Зверніть увагу: ми використовуємо chat.sendMessage або generateContent
    // Запускаємо генерацію контенту, передаючи всю історію та системну інструкцію
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: geminiHistory,
      config: {
        systemInstruction: systemInstruction,
        tools: [telegramTool], // Передаємо інструмент сюди
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];

      if (call.name === "sendTelegramNotification") {
        const { message } = call.args;

        // --- 4. ВИКЛИК ФАКТИЧНОГО ТЕЛЕГРАМ БОТА ---
        await sendTelegramNotification(message);

        // --- 5. ДРУГИЙ ВИКЛИК GEMINI API ---
        // Після виконання функції, ви повинні відправити результат назад до Gemini,
        // щоб вона могла сформувати текстову відповідь клієнту (наприклад, "Дякую, зараз менеджер зв'яжеться...").

        const secondResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            ...geminiHistory,
            // Повідомлення про виклик функції
            {
              role: "model",
              parts: [{ functionCall: call }],
            },
            // Результат виконання функції
            {
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: "sendTelegramNotification",
                    response: { status: "success" }, // Або статус помилки
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction: systemInstruction,
            tools: [telegramTool],
          },
        });

        return NextResponse.json({ text: secondResponse.text });
      }
    }

    const aiResponseText = response.text;

    // --- 5. ВІДПОВІДЬ ФРОНТЕНДУ ---
    return NextResponse.json({
      text: aiResponseText,
    });
  } catch (error) {
    console.error("Помилка під час обробки запиту:", error);
    // Повертаємо помилку 500
    return NextResponse.json(
      { error: "Внутрішня помилка сервера. Не вдалося зв'язатися з AI." },
      { status: 500 }
    );
  }
}