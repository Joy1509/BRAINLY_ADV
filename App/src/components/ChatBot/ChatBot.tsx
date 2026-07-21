import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface Message {
  role: 'user' | 'bot';
  text: string;
  isError?: boolean;
}

interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const URGENT_KEYWORDS = ['urgent', 'emergency', 'deadline', 'missing', 'lost', 'gone', 'asap', 'help', 'critical', 'immediately', 'right now', 'not working', 'broken'];

function isUrgent(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some(k => lower.includes(k));
}

async function escalateToAdmin(message: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Urgent Help Request', message, priority: 'urgent' }),
    });
    return res.ok;
  } catch { return false; }
}

const SYSTEM_CONTEXT = `You are Brainy, an AI assistant for Second Brain — a personal knowledge management web app. You can both answer questions AND perform actions.

🧠 CORE ABILITIES:
- Answer questions about Second Brain features
- Add content (YouTube, Twitter, Instagram, Notion, Text notes)
- Search and filter existing content
- Delete content items
- Create share links
- Provide content summaries and insights

📋 AVAILABLE ACTIONS:
1. add_content(url, title, contentType, tags) - Add new content to user's brain
2. search_content(query, contentType) - Search existing content
3. delete_content(contentId) - Remove content by ID
4. create_share_link() - Generate shareable link for user's brain
5. get_content_stats() - Get user's content statistics

🎯 WHEN TO USE FUNCTIONS:
- User asks to "add", "save", "store" content → use add_content
- User asks to "find", "search", "show me" content → use search_content  
- User asks to "delete", "remove" content → use delete_content
- User asks to "share" their brain → use create_share_link
- User asks about their "stats" or "overview" → use get_content_stats

💡 SUPPORTED CONTENT TYPES:
- YouTube: youtube.com, youtu.be links
- Twitter: twitter.com, x.com links  
- Instagram: instagram.com links
- Notion: notion.so, notion.site links
- Text: Plain text notes (no URL needed)

🎨 PERSONALITY: Be friendly, helpful, and proactive. Suggest actions when appropriate. Always confirm successful operations.

⚠️ STRICT RULES FOR FUNCTION CALLS:
- tags must ALWAYS be a JSON array e.g. ["tag1", "tag2"], never a string
- contentType must ALWAYS be one of: Youtube, Twitter, Instagram, Notion, Text
- Never pass undefined or null for required fields`;

// Function definitions for Groq (OpenAI-compatible)
const TOOLS = [{
  "functions": [
    {
      "name": "add_content",
      "description": "Add new content to the user's Second Brain",
      "parameters": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string", 
            "description": "URL to add (optional for text notes)"
          },
          "title": {
            "type": "string",
            "description": "Title for the content"
          },
          "contentType": {
            "type": "string",
            "enum": ["Youtube", "Twitter", "Instagram", "Notion", "Text"],
            "description": "Type of content being added"
          },
          "tags": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Tags array e.g. [\"react\", \"tutorial\"]. Must be an array, never a string."
          },
          "text": {
            "type": "string",
            "description": "Text content (required for Text type)"
          }
        },
        "required": ["title", "contentType"]
      }
    },
    {
      "name": "search_content",
      "description": "Search and retrieve user's existing content",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query (title, tags, content type)"
          },
          "contentType": {
            "type": "string",
            "enum": ["All", "Youtube", "Twitter", "Instagram", "Notion", "Text", "Voice"],
            "description": "Filter by content type"
          }
        }
      }
    },
    {
      "name": "delete_content",
      "description": "Delete content from user's Second Brain by ID or title",
      "parameters": {
        "type": "object",
        "properties": {
          "contentId": {
            "type": "string",
            "description": "ID of content to delete (use this if you have it)"
          },
          "title": {
            "type": "string",
            "description": "Title of content to delete (used if contentId is unknown)"
          }
        }
      }
    },
    {
      "name": "create_share_link",
      "description": "Generate a shareable link for user's Second Brain",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "get_content_stats",
      "description": "Get statistics about user's content",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  ]
}];

const GROQ_TOOLS = TOOLS[0].functions.map((fn: any) => ({
  type: 'function',
  function: { name: fn.name, description: fn.description, parameters: fn.parameters }
}));

const INITIAL_HISTORY: HistoryItem[] = [
  { role: 'user', parts: [{ text: SYSTEM_CONTEXT }] },
  { role: 'model', parts: [{ text: "Hi! I'm Brainy 🧠 I can help you manage your Second Brain! I can add content, search your saved items, create share links, and more. What would you like to do?" }] },
];

function RainEffect({ isDark }: { isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dropColor = isDark ? 'rgba(167,139,250,0.4)' : 'rgba(109,40,217,0.2)';

    function createDrop() {
      const drop = document.createElement('div');
      Object.assign(drop.style, {
        position: 'absolute',
        top: '-20px',
        left: (20 + Math.random() * 100) + '%',
        width: (Math.random() * 2 + 1) + 'px',
        height: (Math.random() * 20 + 10) + 'px',
        background: dropColor,
        borderRadius: '50%',
        opacity: '0.7',
        animation: `chatRainFall ${Math.random() * 1 + 0.5}s ${Math.random() * 2}s linear infinite`,
      });
      return drop;
    }

    const initial: HTMLDivElement[] = [];
    for (let i = 0; i < 80; i++) {
      const d = createDrop();
      container.appendChild(d);
      initial.push(d);
    }

    const interval = setInterval(() => {
      const d = createDrop();
      container.appendChild(d);
      setTimeout(() => d.remove(), 3000);
    }, 80);

    const lightningEl = document.createElement('div');
    lightningEl.className = 'chat-lightning';
    Object.assign(lightningEl.style, {
      position: 'absolute', inset: '0', background: 'white',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.15s',
    });
    container.appendChild(lightningEl);

    const lightningInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        lightningEl.style.opacity = '0.15';
        setTimeout(() => { lightningEl.style.opacity = '0'; }, 150);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(lightningInterval);
      initial.forEach(d => d.remove());
      lightningEl.remove();
    };
  }, [isDark]);

  return (
    <>
      <style>{`
        @keyframes chatRainFall { to { transform: translateY(520px); } }
        @keyframes gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 8px rgba(139,92,246,0.4); } 50% { box-shadow: 0 0 20px rgba(139,92,246,0.8), 0 0 40px rgba(139,92,246,0.3); } }
        @keyframes floatDot { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(600px); } }
        .chat-gradient-header {
          background: linear-gradient(135deg, #1a0533, #0f0f1a, #1a1a2e, #2d1b69, #1a0533);
          background-size: 300% 300%;
          animation: gradientShift 6s ease infinite;
        }
        .chat-gradient-header-light {
          background: linear-gradient(135deg, #ede9fe, #f5f3ff, #ddd6fe, #c4b5fd, #ede9fe);
          background-size: 300% 300%;
          animation: gradientShift 6s ease infinite;
        }
        .chat-window-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .msg-bot-glow { box-shadow: 0 0 12px rgba(139,92,246,0.15); }
        .msg-user-glow { box-shadow: 0 0 12px rgba(109,40,217,0.4); }
        .scanline {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
          animation: scanline 4s linear infinite;
          pointer-events: none;
        }
        .input-glow:focus { box-shadow: 0 0 0 2px rgba(139,92,246,0.4), 0 0 16px rgba(139,92,246,0.2); }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0" />
    </>
  );
}

export default function ChatBot() {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hi! I'm Brainy 🧠 Your agentic AI assistant! I can help you:\n\n✅ Add content (YouTube, Twitter, Instagram, Notion, Text)\n🔍 Search your saved items\n📊 Show your content stats\n🗑️ Delete content\n🔗 Create share links\n\nTry saying: 'Add this YouTube video' or 'Show my stats'!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<HistoryItem[]>([...INITIAL_HISTORY]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please log in to use this feature');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const executeFunctionCall = async (functionCall: FunctionCall): Promise<string> => {
    try {
      const { name, args } = functionCall;
      if (!args) return `❌ Invalid function call: no arguments provided`;
      if (args.tags && typeof args.tags === 'string') {
        args.tags = args.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (args.tags && !Array.isArray(args.tags)) {
        args.tags = Object.values(args.tags || {});
      }
      if (!Array.isArray(args.tags)) {
        args.tags = [];
      }
      
      switch (name) {
        case 'add_content':
          const addResponse = await fetch(`${API_BASE_URL}/api/v1/addcontent`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              link: args.url || '',
              title: args.title,
              contentType: args.contentType,
              tags: args.tags || [],
              text: args.text || ''
            })
          });
          if (!addResponse.ok) throw new Error('Failed to add content');
          window.dispatchEvent(new CustomEvent('brain:reload'));
          return `✅ Successfully added "${args.title}" to your Second Brain!`;
          
        case 'search_content':
          const searchResponse = await fetch(`${API_BASE_URL}/api/v1/content`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (!searchResponse.ok) throw new Error('Failed to search content');
          const searchData = await searchResponse.json();
          
          let filtered = searchData.data || [];
          if (args.contentType && args.contentType !== 'All') {
            filtered = filtered.filter((item: any) => item.contentType === args.contentType);
          }
          if (args.query) {
            const query = args.query.toLowerCase();
            filtered = filtered.filter((item: any) => 
              item.title?.toLowerCase().includes(query) ||
              item.tags?.some((tag: string) => tag.toLowerCase().includes(query)) ||
              item.summary?.toLowerCase().includes(query)
            );
          }
          
          if (filtered.length === 0) {
            return `🔍 No content found${args.query ? ` for "${args.query}"` : ''}${args.contentType && args.contentType !== 'All' ? ` in ${args.contentType}` : ''}.`;
          }
          
          const results = filtered.slice(0, 5).map((item: any, i: number) => 
            `${i + 1}. **${item.title}** (${item.contentType}) [ID: ${item._id}]${item.tags?.length ? ` - Tags: ${item.tags.join(', ')}` : ''}`
          ).join('\n');
          
          return `🔍 Found ${filtered.length} item(s):\n\n${results}${filtered.length > 5 ? '\n\n...and more items' : ''}`;
          
        case 'delete_content':
          let deleteId = args.contentId;
          if (!deleteId && args.title) {
            const allRes = await fetch(`${API_BASE_URL}/api/v1/content`, { method: 'GET', headers: getAuthHeaders(), credentials: 'include' });
            if (!allRes.ok) throw new Error('Failed to fetch content');
            const allData = await allRes.json();
            const match = (allData.data || []).find((item: any) => item.title?.toLowerCase() === args.title.toLowerCase());
            if (!match) return `❌ No content found with title "${args.title}"`;
            deleteId = match._id;
          }
          if (!deleteId) return `❌ Please provide a content ID or title to delete`;
          const deleteResponse = await fetch(`${API_BASE_URL}/api/v1/delete/${deleteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (!deleteResponse.ok) throw new Error('Failed to delete content');
          window.dispatchEvent(new CustomEvent('brain:reload'));
          return `🗑️ Content deleted successfully!`;
          
        case 'create_share_link':
          const shareResponse = await fetch(`${API_BASE_URL}/api/v1/create-share`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (!shareResponse.ok) throw new Error('Failed to create share link');
          const shareData = await shareResponse.json();
          return `🔗 Share link created: ${shareData.shareUrl}\n\nAnyone with this link can view your Second Brain!`;
          
        case 'get_content_stats':
          const statsResponse = await fetch(`${API_BASE_URL}/api/v1/content`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          if (!statsResponse.ok) throw new Error('Failed to get stats');
          const statsData = await statsResponse.json();
          const content = statsData.data || [];
          
          const stats = content.reduce((acc: any, item: any) => {
            acc[item.contentType] = (acc[item.contentType] || 0) + 1;
            return acc;
          }, {});
          
          const statsList = Object.entries(stats).map(([type, count]) => `- ${type}: ${count}`).join('\n');
          return `📊 Your Second Brain Stats:\n\n📚 Total Items: ${content.length}\n\n${statsList || 'No content yet!'}`;
          
        default:
          return `❌ Unknown function: ${name}`;
      }
    } catch (error: any) {
      return `❌ Error: ${error.message}`;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages(prev => [...prev, { role: 'user', text }]);
    historyRef.current.push({ role: 'user', parts: [{ text }] });
    setLoading(true);

    try {
      // Check urgency — escalate to admin inbox
      const token = localStorage.getItem('token');
      if (token && isUrgent(text)) {
        const escalated = await escalateToAdmin(text, token);
        if (escalated) {
          const escalationMsg = '🚨 Your message has been flagged as urgent and forwarded to an admin. You\'ll receive a reply in your inbox shortly. I\'ll also try to help you now...';
          setMessages(prev => [...prev, { role: 'bot', text: escalationMsg }]);
          historyRef.current.push({ role: 'model', parts: [{ text: escalationMsg }] });
        }
      }

      const groqMessages = [
        { role: 'system', content: SYSTEM_CONTEXT },
        ...historyRef.current
          .filter(m => !(m.role === 'user' && m.parts[0]?.text === SYSTEM_CONTEXT))
          .map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts[0]?.text || ''
          }))
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMessages, tools: GROQ_TOOLS, tool_choice: 'auto' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API error');

      const message = data.choices?.[0]?.message;
      if (!message) throw new Error('No response from AI');

      const toolCall = message.tool_calls?.[0];
      if (toolCall) {
        const parsedArgs = JSON.parse(toolCall.function.arguments || '{}') || {};
        if (parsedArgs.tags) {
          if (typeof parsedArgs.tags === 'string') {
            parsedArgs.tags = parsedArgs.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          } else if (!Array.isArray(parsedArgs.tags)) {
            parsedArgs.tags = Object.values(parsedArgs.tags || {});
          }
        } else {
          parsedArgs.tags = [];
        }
        const functionResult = await executeFunctionCall({
          name: toolCall.function.name,
          args: parsedArgs
        });

        historyRef.current.push({ role: 'model', parts: [{ text: functionResult }] });
        setMessages(prev => [...prev, { role: 'bot', text: functionResult }]);
      } else {
        const reply = message.content || 'No response.';
        historyRef.current.push({ role: 'model', parts: [{ text: reply }] });
        setMessages(prev => [...prev, { role: 'bot', text: reply }]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ ' + err.message, isError: true }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Chat window */}
      <div
        className={`relative flex flex-col w-[360px] sm:w-[400px] h-[560px] rounded-3xl overflow-hidden transition-all duration-500 origin-bottom-right chat-window-glow ${
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'
        } ${isDark ? 'border border-violet-500/20' : 'border border-violet-300/40'}`}
      >
        {/* BG */}
        <div className={`absolute inset-0 z-0 ${
          isDark
            ? 'bg-gradient-to-b from-[#0a0a14] via-[#0f0f1a] to-[#13131f]'
            : 'bg-gradient-to-b from-[#f5f3ff] via-white to-[#ede9fe]'
        }`} />

        {/* Scanline effect */}
        <div className="scanline z-10" />

        {/* Rain */}
        <RainEffect isDark={isDark} />

        {/* ── HEADER ── */}
        <div className={`relative z-10 ${isDark ? 'chat-gradient-header' : 'chat-gradient-header-light'}`}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {/* Animated orb */}
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full bg-violet-500 opacity-30 animate-ping" />
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/50">
                  <span className="text-base">🧠</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-violet-900'}`}>Brainy</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className={`text-[10px] ${isDark ? 'text-violet-300/60' : 'text-violet-600/70'}`}>Powered by Groq · Always on</p>
              </div>
            </div>
          </div>

          {/* Divider with glow */}
          <div className={`h-px mx-4 mb-0 ${isDark ? 'bg-gradient-to-r from-transparent via-violet-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-violet-400/40 to-transparent'}`} />

          {/* Status bar */}
          <div className={`flex items-center gap-3 px-4 py-2 text-[10px] ${isDark ? 'text-white/30' : 'text-violet-500/60'}`}>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" /> Agentic Mode
            </span>
            <span>·</span>
            <span>{messages.length - 1} messages</span>
            <span>·</span>
            <span>llama-3.3-70b</span>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div className="relative z-10 flex-1 overflow-y-auto flex flex-col gap-3 px-4 py-3 scrollbar-hide">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0 shadow-md shadow-violet-500/30">🧠</div>
              )}
              <div
                className={`max-w-[78%] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? `rounded-2xl rounded-br-sm msg-user-glow ${isDark ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'}`
                    : msg.isError
                    ? `rounded-2xl rounded-bl-sm text-red-400 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`
                    : `rounded-2xl rounded-bl-sm msg-bot-glow border ${isDark ? 'bg-white/5 text-gray-200 border-violet-500/10 backdrop-blur-sm' : 'bg-white/80 text-gray-800 border-violet-200/50 backdrop-blur-sm'}`
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ml-2 mt-1 flex-shrink-0 ${isDark ? 'bg-white/10 text-white/60' : 'bg-violet-100 text-violet-600'}`}>U</div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">🧠</div>
              <div className={`px-4 py-3 rounded-2xl rounded-bl-sm border flex gap-1.5 items-center ${isDark ? 'bg-white/5 border-violet-500/10' : 'bg-white/80 border-violet-200/50'}`}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500"
                    style={{ animation: `floatDot 1s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT ── */}
        <div className={`relative z-10 px-3 py-3 border-t ${isDark ? 'border-violet-500/10 bg-[#0a0a14]/80 backdrop-blur-md' : 'border-violet-200/40 bg-white/60 backdrop-blur-md'}`}>
          {/* Glow line */}
          <div className={`absolute top-0 left-8 right-8 h-px ${isDark ? 'bg-gradient-to-r from-transparent via-violet-500/40 to-transparent' : 'bg-gradient-to-r from-transparent via-violet-400/30 to-transparent'}`} />
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className={`input-glow flex-1 resize-none text-sm rounded-2xl px-4 py-2.5 outline-none max-h-[120px] overflow-y-auto transition-all border ${
                isDark
                  ? 'bg-white/5 text-gray-200 placeholder-white/20 border-violet-500/20 focus:border-violet-500/50'
                  : 'bg-white/80 text-gray-800 placeholder-gray-400 border-violet-200 focus:border-violet-400'
              }`}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 ${
                loading || !input.trim()
                  ? 'bg-violet-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 hover:scale-110 shadow-lg shadow-violet-500/40'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-white/15' : 'text-gray-400/60'}`}>Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* ── TOGGLE BUTTON ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`relative flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? `w-10 h-10 rounded-full ${isDark ? 'bg-[#1a1a2e] border border-violet-500/40 text-violet-400' : 'bg-white border border-violet-300 text-violet-500'}`
            : 'w-14 h-14 rounded-full hover:scale-110'
        }`}
        style={!open ? (
          isDark
            ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 32px rgba(124,58,237,0.5), 0 0 0 1px rgba(139,92,246,0.3)' }
            : { background: 'linear-gradient(135deg, #26f472, #15803d)', boxShadow: '0 8px 32px rgba(22,163,74,0.5), 0 0 0 1px rgba(34,197,94,0.3)' }
        ) : {}}
        title="Chat with Brainy"
      >
        {!open && <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse" />}
        <span className={`relative z-10 ${open ? 'text-base' : ''}`}>
          {open ? '✕' : <img src="/chatbot.svg" alt="Brainy" className="w-8 h-8 transition-transform duration-700 hover:rotate-[360deg]" />}
        </span>
      </button>
    </div>
  );
}
