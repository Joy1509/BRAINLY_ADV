import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Reaction { emoji: string; sender: 'user' | 'admin'; }
interface Message { sender: 'user' | 'admin'; text: string; createdAt: string; reactions: Reaction[]; }
interface Notification {
  _id: string; userId: string; username: string; subject: string;
  status: 'open' | 'closed'; priority: string; messages: Message[];
  adminUnread: number; userUnread: number; updatedAt: string; solvedAt: string | null;
}
interface Props { onClose: () => void; }

const InboxPanel: React.FC<Props> = ({ onClose }) => {
  const { isAdmin } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchNotifications = async () => {
    try {
      const endpoint = isAdmin ? `${API_BASE}/api/v1/notifications/all` : `${API_BASE}/api/v1/notifications/mine`;
      const res = await fetch(endpoint, { headers: headers() });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    const readUrl = isAdmin ? `${API_BASE}/api/v1/notifications/all/read` : `${API_BASE}/api/v1/notifications/mine/read`;
    fetch(readUrl, { method: 'PATCH', headers: headers() });
  }, [isAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  useEffect(() => {
    if (!socket) return;
    const updateHandler = (updated: Notification) => {
      setNotifications(prev =>
        prev.map(n => n._id === updated._id ? updated : n)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      setSelected(prev => prev?._id === updated._id ? updated : prev);
    };
    const deleteHandler = (id: string) => {
      setNotifications(prev => prev.filter(n => n._id !== id));
      setSelected(prev => prev?._id === id ? null : prev);
    };
    socket.on('notification_updated', updateHandler);
    socket.on('new_notification', (n: Notification) => setNotifications(prev => [n, ...prev]));
    socket.on('notification_reply', updateHandler);
    socket.on('notification_deleted', deleteHandler);
    return () => {
      socket.off('notification_updated', updateHandler);
      socket.off('new_notification');
      socket.off('notification_reply', updateHandler);
      socket.off('notification_deleted', deleteHandler);
    };
  }, [socket]);

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    const endpoint = isAdmin
      ? `${API_BASE}/api/v1/notifications/${selected._id}/admin-reply`
      : `${API_BASE}/api/v1/notifications/${selected._id}/reply`;
    const res = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify({ text: reply }) });
    const data = await res.json();
    if (data.success) { setSelected(data.notification); setReply(''); }
  };

  const markSolved = async (id?: string) => {
    const targetId = id || selected?._id;
    if (!targetId) return;
    const res = await fetch(`${API_BASE}/api/v1/notifications/${targetId}/solve`, { method: 'PATCH', headers: headers() });
    const data = await res.json();
    if (data.success) {
      setNotifications(prev => prev.map(n => n._id === targetId ? data.notification : n));
      if (selected?._id === targetId) setSelected(data.notification);
    }
  };

  const deleteNotification = async (id: string) => {
    await fetch(`${API_BASE}/api/v1/notifications/${id}`, { method: 'DELETE', headers: headers() });
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const sendReaction = async (msgIndex: number, emoji: string) => {
    if (!selected) return;
    setHoveredMsg(null);
    const res = await fetch(`${API_BASE}/api/v1/notifications/${selected._id}/react`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ msgIndex, emoji }),
    });
    const data = await res.json();
    if (data.success) setSelected(data.notification);
  };

  const groupReactions = (reactions: Reaction[]) => {
    const map: Record<string, { count: number; senders: string[] }> = {};
    reactions?.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, senders: [] };
      map[r.emoji].count++;
      map[r.emoji].senders.push(r.sender);
    });
    return map;
  };

  const totalUnread = notifications.reduce((acc, n) => acc + (isAdmin ? n.adminUnread : n.userUnread), 0);
  const myRole = isAdmin ? 'admin' : 'user';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 pointer-events-none">
      <div className="pointer-events-auto w-[380px] max-h-[560px] flex flex-col dark:bg-[#13131f] bg-white border dark:border-white/10 border-gray-200 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/10 border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {selected && (
              <button onClick={() => setSelected(null)} className="dark:text-white/50 text-gray-400 dark:hover:text-white hover:text-gray-900 mr-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="font-semibold dark:text-white text-gray-900 text-sm">
              {selected ? selected.subject : 'Inbox'}
            </span>
            {selected?.status === 'closed' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">✓ Solved</span>
            )}
            {!selected && totalUnread > 0 && (
              <span className="bg-violet-500 text-white text-xs px-1.5 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {selected?.status === 'open' && (
              <button onClick={() => markSolved()}
                className="text-xs px-2 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 transition-colors">
                ✓ Solve
              </button>
            )}
            {selected && (
              <button onClick={() => deleteNotification(selected._id)}
                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors">
                Delete
              </button>
            )}
            <button onClick={onClose} className="dark:text-white/40 text-gray-400 dark:hover:text-white hover:text-gray-900 ml-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification list */}
        {!selected && (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <span className="text-4xl mb-3">📭</span>
                <p className="dark:text-white/40 text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : notifications.map(n => {
              const unread = isAdmin ? n.adminUnread : n.userUnread;
              const last = n.messages[n.messages.length - 1];
              return (
                <div key={n._id} className="flex items-start gap-3 px-4 py-3 border-b dark:border-white/5 border-gray-100">
                  <div onClick={() => setSelected(n)} className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer dark:hover:bg-white/5 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      n.status === 'closed' ? 'bg-green-500/20 text-green-400' :
                      n.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-400'
                    }`}>
                      {n.status === 'closed' ? '✓' : n.priority === 'urgent' ? '🚨' : n.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium dark:text-white text-gray-900 truncate">{isAdmin ? n.username : 'Support'}</span>
                        <span className="text-xs dark:text-white/30 text-gray-400 ml-2 flex-shrink-0">{new Date(n.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs dark:text-white/50 text-gray-500 truncate">{n.subject}</p>
                        {n.status === 'closed' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 flex-shrink-0">Solved</span>}
                      </div>
                      {last && <p className="text-xs dark:text-white/30 text-gray-400 truncate">{last.text}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {unread > 0 && <span className="w-2 h-2 bg-violet-500 rounded-full" />}
                    {n.status === 'open' && (
                      <button onClick={e => { e.stopPropagation(); markSolved(n._id); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors">
                        Solve
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteNotification(n._id); }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                      Del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chat thread */}
        {selected && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
              {selected.messages.map((msg, i) => {
                const isMe = isAdmin ? msg.sender === 'admin' : msg.sender === 'user';
                const grouped = groupReactions(msg.reactions || []);
                const hasReactions = Object.keys(grouped).length > 0;
                const myReaction = msg.reactions?.find(r => r.sender === myRole)?.emoji;

                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1`}>
                    <div
                      className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      onMouseEnter={() => setHoveredMsg(i)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Emoji trigger */}
                      <div className="relative flex-shrink-0 self-center">
                        <button
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-xs transition-all duration-150 ${hoveredMsg === i ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'} dark:bg-white/10 bg-gray-200`}
                          onClick={() => setHoveredMsg(hoveredMsg === i ? null : i)}
                        >
                          😊
                        </button>
                        {hoveredMsg === i && (
                          <div className={`absolute bottom-7 ${isMe ? 'right-0' : 'left-0'} z-10 flex gap-1 px-2 py-1.5 rounded-2xl shadow-xl dark:bg-[#1e1e30] bg-white border dark:border-white/10 border-gray-200`}>
                            {EMOJIS.map(emoji => (
                              <button key={emoji} onClick={() => sendReaction(i, emoji)}
                                className={`text-base hover:scale-125 transition-transform duration-100 ${myReaction === emoji ? 'opacity-100 scale-110' : 'opacity-70 hover:opacity-100'}`}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${
                        isMe ? 'bg-violet-600 text-white rounded-br-sm' : 'dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-[10px] mb-1 opacity-60">
                          {msg.sender === 'admin' ? 'Admin' : (isAdmin ? selected.username : 'You')}
                        </p>
                        {msg.text}
                      </div>
                    </div>

                    {/* Reactions */}
                    {hasReactions && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(grouped).map(([emoji, { count, senders }]) => (
                          <button key={emoji} onClick={() => sendReaction(i, emoji)} title={senders.join(', ')}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                              senders.includes(myRole)
                                ? 'dark:bg-violet-500/20 bg-violet-100 dark:border-violet-500/40 border-violet-300 dark:text-white text-violet-700'
                                : 'dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 dark:text-white/60 text-gray-600'
                            }`}>
                            {emoji}{count > 1 && <span>{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input — disabled when solved */}
            <div className="px-3 py-3 border-t dark:border-white/10 border-gray-100 flex-shrink-0">
              {selected.status === 'closed' ? (
                <p className="text-xs text-center dark:text-white/30 text-gray-400 py-1">
                  ✓ Solved — auto-deletes in 24hrs
                </p>
              ) : (
                <div className="flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendReply()}
                    placeholder="Type a reply..."
                    className="flex-1 text-sm px-3 py-2 rounded-xl dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 border dark:border-white/10 border-gray-200 outline-none focus:ring-1 focus:ring-violet-500" />
                  <button onClick={sendReply} disabled={!reply.trim()}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm rounded-xl transition-colors">
                    Send
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InboxPanel;
