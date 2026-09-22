import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Analyze Engine', message: 'Analyze the current engine condition.' },
  { label: 'Explain Anomaly', message: 'Explain the current anomaly.' },
  { label: 'Explain RUL', message: 'Explain the RUL.' },
  { label: 'Explain Risk', message: 'Why is the engine risk at its current level?' },
  { label: 'Maintenance Advice', message: 'What maintenance action is recommended?' },
];

export default function AeroTwinAICopilot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const question = (text ?? input).trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      const reply = data?.response || 'No response received from AI Copilot.';
      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Could not reach the AI Copilot backend. Confirm the FastAPI server is running.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">
              AeroTwin-X AI Copilot
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              AI-assisted analysis of the current engine state
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            onClick={() => sendMessage(qa.message)}
            disabled={isLoading}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Response / Conversation Area */}
      <div
        ref={scrollRef}
        className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 mb-3 h-56 overflow-y-auto space-y-3"
      >
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs px-6">
            <Bot size={20} className="mb-2 text-slate-300" />
            Ask about the current engine, or use a quick action above.
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && (
              <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0 mt-0.5">
                <Bot size={12} />
              </div>
            )}
            <div
              className={`text-xs leading-relaxed rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
              }`}
            >
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="p-1 bg-sky-100 text-sky-700 rounded-md shrink-0 mt-0.5">
                <User size={12} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
              <Bot size={12} />
            </div>
            <Loader2 size={13} className="animate-spin" />
            Analyzing current engine state...
          </div>
        )}
      </div>

      {/* Input Row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the current engine..."
          disabled={isLoading}
          className="flex-1 text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center p-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
