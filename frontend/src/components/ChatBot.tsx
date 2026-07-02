import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ChatBot: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: user?.language === 'hi' ? 'नमस्ते! मैं एयरगार्ड एआई सहायक हूँ। मैं वायु प्रदूषण, स्वास्थ्य सावधानी और आईओटी सेंसर के बारे में आपके प्रश्नों का उत्तर दे सकता हूँ।' :
               (user?.language === 'mr' ? 'नमस्कार! मी एअरगार्ड एआय सहाय्यक आहे. मी हवा प्रदूषण, आरोग्य खबरदारी आणि आयओटी सेन्सर्सबद्दल आपल्या प्रश्नांची उत्तरे देऊ शकतो.' :
               'Hello! I am AirGuard AI Assistant. Ask me anything about air quality, health precautions, GRAP regulations, or environmental parameters.')
    }
  ]);
  const [sending, setSending] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const userMessage = message;
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          language: user?.language || 'en',
          history: chatHistory.map(c => ({
            role: c.role,
            content: c.content
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I am facing connectivity issues. Please try again later.' }]);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Connection timed out. Ensure the backend server is running.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-2xl text-white hover:scale-105 transition-transform duration-300 z-50 hover:shadow-blue-500/20"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] glass-panel rounded-2xl shadow-2xl border border-slate-800 flex flex-col z-50 overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-slate-100 font-display">AirGuard AI Companion</span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Window */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {chatHistory.map((chat, idx) => {
              const isUser = chat.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                >
                  <div className={`
                    w-7.5 h-7.5 rounded-full flex items-center justify-center border text-xs font-bold shrink-0
                    ${isUser 
                      ? 'bg-slate-800 border-slate-700 text-blue-400' 
                      : 'bg-blue-950/40 border-blue-900/60 text-blue-400'}
                  `}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`
                    px-4 py-2.5 rounded-2xl text-xs leading-relaxed
                    ${isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'}
                  `}>
                    {chat.content}
                  </div>
                </div>
              );
            })}
            
            {sending && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-7.5 h-7.5 rounded-full bg-blue-950/40 border border-blue-900/60 flex items-center justify-center text-blue-400 shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className="px-4 py-2.5 bg-slate-900/85 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Form Input */}
          <form 
            onSubmit={handleSend} 
            className="p-3 bg-slate-900/80 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
