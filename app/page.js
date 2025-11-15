'use client'
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import './globals.css'

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Вітаю! **Компанія LynxAI**. Я ваш AI-консультант. Чим я можу допомогти вам сьогодні?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    // Перевіряємо, чи існує елемент
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth", // Додаємо плавний ефект прокрутки
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage = { role: "user", content: input };

    // 1. Оновлюємо історію, додаючи повідомлення користувача
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        // Ваш API Route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Відправляємо всю історію (контекст)
          // разом із новим повідомленням
          history: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Помилка від AI консультанта");
      }

      const data = await response.json();
      const aiResponse = { role: "assistant", content: data.text }; // data.text з вашого API

      // 2. Оновлюємо історію, додаючи відповідь AI
      setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error("Помилка під час спілкування з API:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "Вибачте, сталася помилка. Спробуйте пізніше.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Історія Повідомлень */}
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.role === "assistant" ? (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
              <span>{msg.content}</span>
            )}
          </div>
        ))}
        {isLoading && <div className="loading">AI думає...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма Вводу */}
      <form onSubmit={sendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Введіть ваше запитання про товари..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Надіслати
        </button>
      </form>
    </div>
  );
}

export default Chat