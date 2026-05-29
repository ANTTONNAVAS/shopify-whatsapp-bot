"use client";

import { useEffect, useState } from "react";

type Message = {
  id: string;
  role: "CUSTOMER" | "BOT" | "AGENT";
  content: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: "BOT" | "HUMAN" | "RESOLVED";
  updatedAt: string;
  messages: Message[];
};

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data);
  };

  const fetchMessages = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setMessages(data);
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected);
    const interval = setInterval(() => fetchMessages(selected), 3000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedConv = conversations.find((c) => c.id === selected);

  const sendMessage = async () => {
    if (!input.trim() || !selected) return;
    setLoading(true);
    await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected, message: input }),
    });
    setInput("");
    await fetchMessages(selected);
    setLoading(false);
  };

  const toggleStatus = async (status: "BOT" | "HUMAN") => {
    if (!selected) return;
    await fetch(`/api/conversations/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchConversations();
  };

  const roleStyle = (role: string) => {
    if (role === "CUSTOMER") return "bg-gray-100 text-gray-800 self-start";
    if (role === "BOT") return "bg-blue-100 text-blue-800 self-end";
    return "bg-green-100 text-green-800 self-end";
  };

  const roleLabel = (role: string) => {
    if (role === "CUSTOMER") return "Cliente";
    if (role === "BOT") return "🤖 Bot";
    return "👤 Agente";
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">💬 Soporte WhatsApp</h1>
          <p className="text-xs text-gray-500">{conversations.length} conversaciones</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selected === conv.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900 truncate">
                  {conv.customerName ?? conv.customerPhone}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    conv.status === "BOT"
                      ? "bg-blue-100 text-blue-700"
                      : conv.status === "HUMAN"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {conv.status === "BOT" ? "🤖 Bot" : conv.status === "HUMAN" ? "👤 Humano" : "✅ Resuelto"}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {conv.messages[0]?.content ?? "Sin mensajes"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(conv.updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No hay conversaciones aún
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedConv.customerName ?? selectedConv.customerPhone}
                </h2>
                <p className="text-xs text-gray-500">{selectedConv.customerPhone}</p>
              </div>
              <div className="flex gap-2">
                {selectedConv.status === "BOT" ? (
                  <button
                    onClick={() => toggleStatus("HUMAN")}
                    className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Tomar control
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus("BOT")}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Devolver al bot
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-lg ${msg.role !== "CUSTOMER" ? "self-end items-end" : "self-start items-start"}`}
                >
                  <span className="text-xs text-gray-400 mb-1">{roleLabel(msg.role)}</span>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${roleStyle(msg.role)}`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-300 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              {selectedConv.status === "HUMAN" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400">
                  🤖 El bot está manejando esta conversación — haz clic en &quot;Tomar control&quot; para escribir
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
