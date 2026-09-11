import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Server,
  Terminal,
  ExternalLink,
  MapPin,
  User,
  ShieldCheck,
  Activity,
  Sparkles,
  Smartphone,
  ChevronRight,
  Info,
  Compass,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface UserState {
  phone: string;
  state: string;
  name?: string;
  location?: string;
  isNairobi?: boolean | null;
  updatedAt?: string;
}

interface ServerStatus {
  service: string;
  port: number;
  environment: string;
  hasWhatsAppToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  activeConversations: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'inspector' | 'deploy'>('simulator');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Welcome to Bonan Vivon Project. To begin, please type *Ready*.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [userState, setUserState] = useState<UserState>({
    phone: '254712345678',
    state: 'NOT_STARTED',
    name: '',
    location: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inspector states
  const [healthResult, setHealthResult] = useState<any>(null);
  const [webhookVerifyResult, setWebhookVerifyResult] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [customVerifyToken, setCustomVerifyToken] = useState('BonanVivonVerifyToken2026');
  const [customDomain, setCustomDomain] = useState('bonan-vivon-bot.onrender.com');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch server status on mount
  useEffect(() => {
    fetchServerStatus();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch server status:', err);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, message: text }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.replies && Array.isArray(data.replies)) {
        data.replies.forEach((replyText: string, index: number) => {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${index}`,
                sender: 'bot',
                text: replyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }, index * 400);
        });
      }

      if (data.state) {
        setUserState(data.state);
      }
      fetchServerStatus();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `⚠️ Network error communicating with bot server: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserState(data.state);
      }
    } catch (e) {
      console.error(e);
    }

    setMessages([
      {
        id: String(Date.now()),
        sender: 'bot',
        text: "No problem 👍 Let's start again.\n\nPlease type *Ready* when you're ready to begin.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const testHealthEndpoint = async () => {
    try {
      const res = await fetch('/health');
      const json = await res.json();
      setHealthResult({ status: res.status, ok: res.ok, data: json });
    } catch (err: any) {
      setHealthResult({ status: 'Error', ok: false, error: err.message });
    }
  };

  const testWebhookGet = async () => {
    try {
      const query = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': customVerifyToken,
        'hub.challenge': 'CHALLENGE_ACCEPTED_98765',
      });
      const res = await fetch(`/webhook?${query.toString()}`);
      const text = await res.text();
      setWebhookVerifyResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        body: text,
      });
    } catch (err: any) {
      setWebhookVerifyResult({ status: 'Error', ok: false, error: err.message });
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const stateColorMap: Record<string, string> = {
    NOT_STARTED: 'bg-stone-100 text-stone-700 border-stone-300',
    WAITING_FOR_DETAILS: 'bg-amber-100 text-amber-800 border-amber-300',
    WAITING_FOR_LOCATION_CLARIFICATION: 'bg-orange-100 text-orange-800 border-orange-300',
    NAIROBI_TRAINING: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ONLINE_TRAINING: 'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-emerald-600 text-white border-emerald-700',
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg text-stone-900 tracking-tight">
                Bonan Vivon WhatsApp Bot
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                v1.0 Render Ready
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Node.js + Express + WhatsApp Cloud API v22.0
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-sm">
          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            WhatsApp Simulator
          </button>
          <button
            id="tab-inspector"
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'inspector'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-600" />
            API & Health
          </button>
          <button
            id="tab-deploy"
            onClick={() => setActiveTab('deploy')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'deploy'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Server className="w-4 h-4 text-purple-600" />
            Render & Meta Setup
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: WHATSAPP SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Mobile WhatsApp Interface Simulator (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-md bg-stone-900 rounded-[36px] p-3 shadow-xl border-4 border-stone-800">
                {/* Simulated Phone Screen */}
                <div className="w-full bg-[#EFEAE2] rounded-[28px] overflow-hidden flex flex-col h-[650px] border border-stone-300 relative shadow-inner">
                  {/* WhatsApp Chat Header */}
                  <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-sm shadow-xs border border-emerald-500">
                        BV
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm leading-tight text-white">
                            Bonan Vivon Bot
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 fill-emerald-500" />
                        </div>
                        <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Official WhatsApp Business
                        </p>
                      </div>
                    </div>
                    <button
                      id="reset-chat-btn"
                      onClick={handleReset}
                      title="Reset Conversation"
                      className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-full transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* WhatsApp Message Thread Area */}
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
                    <div className="flex justify-center my-2">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] px-3 py-1 rounded-lg text-center shadow-xs max-w-xs">
                        🔒 End-to-end simulated session for {phoneNumber}
                      </span>
                    </div>

                    {messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-xs relative ${
                              isUser
                                ? 'bg-[#DCF8C6] text-stone-900 rounded-tr-none'
                                : 'bg-white text-stone-900 rounded-tl-none border border-stone-200/60'
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words">
                              {msg.text.split('\n').map((line, i) => (
                                <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                                  {line.startsWith('*') && line.endsWith('*') ? (
                                    <strong>{line.slice(1, -1)}</strong>
                                  ) : (
                                    line
                                  )}
                                </p>
                              ))}
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-stone-500">
                              <span>{msg.time}</span>
                              {isUser && (
                                <span className="text-emerald-700 font-bold">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-stone-200 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-stone-500 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggested Quick Prompt Chips */}
                  <div className="bg-white/90 backdrop-blur-xs border-t border-stone-200 px-3 py-1.5 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                        Flow:
                      </span>
                      <button
                        id="chip-ready"
                        onClick={() => sendMessage('Ready')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-medium whitespace-nowrap transition-colors"
                      >
                        "Ready"
                      </button>
                      <button
                        id="chip-nairobi"
                        onClick={() => sendMessage('Felix — Nairobi')}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-full whitespace-nowrap transition-colors"
                      >
                        "Felix — Nairobi"
                      </button>
                      <button
                        id="chip-kisii"
                        onClick={() => sendMessage("My name is Felix and I'm in Kisii")}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-full whitespace-nowrap transition-colors"
                      >
                        "Felix in Kisii"
                      </button>
                      <button
                        id="chip-yes"
                        onClick={() => sendMessage('Yes')}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-full whitespace-nowrap transition-colors"
                      >
                        "Yes"
                      </button>
                      <button
                        id="chip-reset"
                        onClick={() => sendMessage('reset')}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full whitespace-nowrap transition-colors"
                      >
                        "reset"
                      </button>
                    </div>

                    {/* Section 20 Quick Questions */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-stone-100">
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 whitespace-nowrap">
                        <HelpCircle className="w-3 h-3" /> Q&A:
                      </span>
                      <button
                        id="chip-q-what"
                        onClick={() => sendMessage('What is Bonan Vivon?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "What is Bonan Vivon?"
                      </button>
                      <button
                        id="chip-q-work"
                        onClick={() => sendMessage('How does it work?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "How does it work?"
                      </button>
                      <button
                        id="chip-q-where"
                        onClick={() => sendMessage('Where is the training?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "Where is training?"
                      </button>
                      <button
                        id="chip-q-online"
                        onClick={() => sendMessage('Is it online?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "Is it online?"
                      </button>
                      <button
                        id="chip-q-cost"
                        onClick={() => sendMessage('How much does it cost?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "How much cost?"
                      </button>
                      <button
                        id="chip-q-earn"
                        onClick={() => sendMessage('How much can I earn?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "How much can I earn?"
                      </button>
                      <button
                        id="chip-q-legit"
                        onClick={() => sendMessage('Is it legitimate?')}
                        className="px-2.5 py-0.5 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "Is it legitimate?"
                      </button>
                      <button
                        id="chip-q-time"
                        onClick={() => sendMessage('What time is it?')}
                        className="px-2.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-full whitespace-nowrap transition-colors text-[11px]"
                      >
                        "What time is it?"
                      </button>
                    </div>
                  </div>

                  {/* Message Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="bg-stone-100 px-3 py-2 border-t border-stone-200 flex items-center gap-2"
                  >
                    <input
                      id="whatsapp-chat-input"
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type a WhatsApp message..."
                      className="flex-1 bg-white border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-full px-4 py-2 text-sm outline-hidden transition-all shadow-xs"
                    />
                    <button
                      id="send-message-btn"
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right: State Inspector & Conversational Flow Engine (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Active Conversation State Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-semibold text-stone-900 text-base">
                      Conversation State
                    </h2>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      stateColorMap[userState.state] || 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {userState.state}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-stone-400" /> Extracted Name:
                    </span>
                    <span className="font-medium text-stone-900">
                      {userState.name || <em className="text-stone-400 font-normal">Pending</em>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-stone-400" /> Extracted Location:
                    </span>
                    <span className="font-medium text-stone-900">
                      {userState.location || <em className="text-stone-400 font-normal">Pending</em>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-stone-400" /> Training Route:
                    </span>
                    <span className="font-medium text-stone-900">
                      {userState.isNairobi === true ? (
                        <span className="text-emerald-700 font-semibold">
                          Physical (Caxton House, Nairobi)
                        </span>
                      ) : userState.isNairobi === false ? (
                        <span className="text-blue-700 font-semibold">
                          Online Session
                        </span>
                      ) : (
                        <em className="text-stone-400 font-normal">Undetermined</em>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-500">Phone Identifier:</span>
                    <input
                      id="phone-identifier-input"
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="text-xs font-mono bg-white border border-stone-200 px-2 py-1 rounded text-stone-800 w-36 text-right"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">JSON State Store:</span>
                  <button
                    id="state-reset-button"
                    onClick={handleReset}
                    className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset this user
                  </button>
                </div>
              </div>

              {/* Bot Guardrails & Compliance Checklist */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Bonan Vivon Bot Compliance Rules
                </h3>
                <ul className="text-xs space-y-2 text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Starts strictly with "Ready":</strong> If the user types anything else initially, the bot replies with a polite prompt.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Official Project Description:</strong> Strictly presents the official initiative description without mentions of fees or guaranteed profits.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Location-Aware Routing:</strong> Nairobi residents are routed to Caxton House, 1st Floor, Kenyatta Ave. Outside residents are routed to Online Session.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Reset Commands:</strong> Supports <code>reset</code> and <code>restart</code> anywhere in the conversation.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Section 20 Question-Answering Test Card */}
              <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    Section 20: Question-Answering
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    State Preserving
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  The bot answers prospect questions using verified administrator information without breaking state. Click any question to simulate:
                </p>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Project & Process
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      <button
                        onClick={() => sendMessage('What is Bonan Vivon?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"What is Bonan Vivon?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('How does it work?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"How does it work?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('What do I need to join?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"What do I need to join?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Training & Location
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      <button
                        onClick={() => sendMessage('Where is the training?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Where is the training?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('Is it online?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Is it online?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('Do I have to travel to Nairobi?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Do I have to travel to Nairobi?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('What happens during the training?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"What happens during the training?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('How long is the training?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"How long is the training?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('Can I ask questions during training?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Can I ask questions during training?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Trust, Cost & Earnings
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      <button
                        onClick={() => sendMessage('Is it legitimate?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Is it legitimate?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('How much does it cost?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"How much does it cost?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('How much can I earn?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"How much can I earn?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('Is income guaranteed?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Is income guaranteed?"</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Edge Cases & Guardrails
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 mt-1">
                      <button
                        onClick={() => sendMessage('What time is it?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"What time is it?" (Unrelated safe query)</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                      <button
                        onClick={() => sendMessage('Who owns Bonan Vivon and what are the products?')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-amber-50 hover:text-amber-900 border border-stone-200 text-stone-700 transition-colors flex items-center justify-between text-xs"
                      >
                        <span>"Who owns Bonan Vivon?" (Unverified info rule)</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: API & HEALTH INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Server Status Header */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Live Server Health & Endpoints
                  </h2>
                  <p className="text-sm text-stone-500">
                    Render-compatible Express server running on port {serverStatus?.port || 3000}.
                  </p>
                </div>
                <button
                  id="btn-refresh-status"
                  onClick={fetchServerStatus}
                  className="px-3.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Refresh Status
                </button>
              </div>

              {/* Status metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium">Service Name</p>
                  <p className="text-sm font-semibold text-stone-900 mt-1">Bonan Vivon Bot</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium">Listening Port</p>
                  <p className="text-sm font-semibold text-stone-900 mt-1">
                    0.0.0.0:{serverStatus?.port || 3000}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium">Active Conversations</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-1">
                    {serverStatus?.activeConversations ?? 1}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium">Render Env Status</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-1">Ready for Deploy</p>
                </div>
              </div>
            </div>

            {/* Test 1: GET /health */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                      GET
                    </span>
                    <span className="font-mono text-sm font-semibold text-stone-900">/health</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Used by Render for health checks and zero-downtime deployments.
                  </p>
                </div>
                <button
                  id="btn-test-health"
                  onClick={testHealthEndpoint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                >
                  Test /health Endpoint
                </button>
              </div>

              {healthResult && (
                <div className="mt-4 p-3.5 bg-stone-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
                  <div className="text-stone-400 mb-1">
                    HTTP Status: {healthResult.status} {healthResult.ok ? 'OK' : ''}
                  </div>
                  <pre>{JSON.stringify(healthResult.data, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Test 2: GET /webhook (Verification Challenge) */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800">
                      GET
                    </span>
                    <span className="font-mono text-sm font-semibold text-stone-900">/webhook</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Verifies <code>hub.verify_token</code> and returns <code>hub.challenge</code> to Meta.
                  </p>
                </div>
                <button
                  id="btn-test-webhook-verify"
                  onClick={testWebhookGet}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                >
                  Simulate Meta Webhook Handshake
                </button>
              </div>

              {webhookVerifyResult && (
                <div className="mt-4 p-3.5 bg-stone-900 text-stone-100 font-mono text-xs rounded-xl overflow-x-auto">
                  <div className="text-stone-400 mb-1">
                    Status: {webhookVerifyResult.status} ({webhookVerifyResult.statusText})
                  </div>
                  <div>Challenge Response Body:</div>
                  <div className="text-emerald-400 font-bold mt-1">
                    "{webhookVerifyResult.body}"
                  </div>
                </div>
              )}
            </div>

            {/* Sample cURL Commands */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <h3 className="font-semibold text-stone-900 text-sm mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-stone-600" />
                Quick cURL Commands for Testing
              </h3>
              <div className="space-y-3 mt-3">
                <div className="relative">
                  <div className="bg-stone-900 text-stone-200 text-xs font-mono p-3 rounded-lg overflow-x-auto">
                    curl http://localhost:3000/health
                  </div>
                  <button
                    id="copy-curl-health"
                    onClick={() => copyToClipboard('curl-health', 'curl http://localhost:3000/health')}
                    className="absolute right-2 top-2 p-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded"
                  >
                    {copiedKey === 'curl-health' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="relative">
                  <div className="bg-stone-900 text-stone-200 text-xs font-mono p-3 rounded-lg overflow-x-auto">
                    curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d '&#123;"object":"whatsapp_business_account","entry":[&#123;"changes":[&#123;"value":&#123;"messages":[&#123;"from":"254712345678","type":"text","text":&#123;"body":"Ready"&#125;&#125;]&#125;&#125;]&#125;]&#125;'
                  </div>
                  <button
                    id="copy-curl-post"
                    onClick={() =>
                      copyToClipboard(
                        'curl-post',
                        'curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d \'{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"254712345678","type":"text","text":{"body":"Ready"}}]}}]}]}\''
                      )
                    }
                    className="absolute right-2 top-2 p-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded"
                  >
                    {copiedKey === 'curl-post' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RENDER & META SETUP */}
        {activeTab === 'deploy' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Deploy banner */}
            <div className="bg-gradient-to-br from-emerald-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm">
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Render Deployment Ready
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Deploying Bonan Vivon Bot to Render
              </h2>
              <p className="text-stone-300 text-sm mt-2 max-w-2xl leading-relaxed">
                Follow this 3-step checklist to deploy this repository to Render and bind it to the WhatsApp Cloud API (Meta Developer Console).
              </p>
            </div>

            {/* Step 1: Render Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">
                    Create a Web Service on Render
                  </h3>
                  <p className="text-xs text-stone-500">
                    Connect your GitHub repository to Render (free or starter plan).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block font-medium">Build Command</span>
                  <code className="text-stone-900 font-mono font-bold mt-1 block">npm install</code>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-stone-500 block font-medium">Start Command</span>
                  <code className="text-stone-900 font-mono font-bold mt-1 block">npm start</code>
                </div>
              </div>
            </div>

            {/* Step 2: Environment Variables */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">
                    Set Environment Variables in Render Dashboard
                  </h3>
                  <p className="text-xs text-stone-500">
                    Navigate to Service Settings &gt; Environment Variables.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Variable Name</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="p-3 font-mono font-bold text-stone-900">PORT</td>
                      <td className="p-3 font-mono text-stone-600">3000</td>
                      <td className="p-3 text-stone-500">Listening port (assigned automatically by Render).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-stone-900">WHATSAPP_TOKEN</td>
                      <td className="p-3 font-mono text-stone-600">your_meta_system_token</td>
                      <td className="p-3 text-stone-500">Permanent Meta token with <code>whatsapp_business_messaging</code>.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-stone-900">PHONE_NUMBER_ID</td>
                      <td className="p-3 font-mono text-stone-600">your_phone_number_id</td>
                      <td className="p-3 text-stone-500">Obtained from Meta Dashboard &gt; WhatsApp &gt; API Setup.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-stone-900">VERIFY_TOKEN</td>
                      <td className="p-3 font-mono text-stone-600">your_custom_secret</td>
                      <td className="p-3 text-stone-500">Secret string you choose for webhook verification.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3: Meta Webhook URL */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">
                    Configure Callback URL in Meta for Developers
                  </h3>
                  <p className="text-xs text-stone-500">
                    Go to WhatsApp &gt; Configuration &gt; Webhook in your Meta App.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Your Render Domain:
                  </label>
                  <input
                    id="render-domain-input"
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full font-mono bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-800"
                    placeholder="your-app-name.onrender.com"
                  />
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600 font-medium">Callback URL:</span>
                    <button
                      id="copy-callback-url"
                      onClick={() => copyToClipboard('callback-url', `https://${customDomain}/webhook`)}
                      className="text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === 'callback-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy URL
                    </button>
                  </div>
                  <code className="block font-mono text-emerald-800 font-bold bg-white p-2 rounded border border-stone-200">
                    https://{customDomain}/webhook
                  </code>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-stone-600 font-medium">Health Check URL:</span>
                    <button
                      id="copy-health-url"
                      onClick={() => copyToClipboard('health-url', `https://${customDomain}/health`)}
                      className="text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === 'health-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy URL
                    </button>
                  </div>
                  <code className="block font-mono text-stone-800 font-bold bg-white p-2 rounded border border-stone-200">
                    https://{customDomain}/health
                  </code>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <span>
                    After saving the callback URL, remember to click <strong>Manage Webhook Fields</strong> and check <strong>messages</strong> so WhatsApp delivers incoming chats to your bot.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
