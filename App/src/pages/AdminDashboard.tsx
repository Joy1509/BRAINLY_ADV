import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import InboxPanel from '../components/InboxPanel/InboxPanel';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Stats { totalUsers: number; adminUsers: number; regularUsers: number; }
interface User { _id: string; username: string; email: string; role: 'user' | 'admin'; provider: string; createdAt: string; }

const AdminDashboard: React.FC = () => {
  const { isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (!isAdmin) navigate('/home'); }, [isAdmin, navigate]);

  // Load initial unread count from DB
  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${API_BASE}/api/v1/notifications/all`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(data => {
      if (data.success) {
        const total = data.notifications.reduce((acc: number, n: any) => acc + n.adminUnread, 0);
        setInboxUnread(total);
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!socket) return;
    const handler = (n: any) => {
      const lastMsg = n.messages?.[n.messages.length - 1];
      if (lastMsg?.sender === 'user') setInboxUnread(prev => prev + 1);
    };
    socket.on('new_notification', handler);
    socket.on('notification_reply', handler);
    socket.on('notification_updated', handler);
    return () => {
      socket.off('new_notification', handler);
      socket.off('notification_reply', handler);
      socket.off('notification_updated', handler);
    };
  }, [socket]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    Promise.all([
      fetch(`${API_BASE}/api/v1/admin/dashboard`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/admin/users`, { headers }).then(r => r.json()),
    ]).then(([dashData, usersData]) => {
      if (dashData.success) setStats(dashData.data);
      if (usersData.success) setUsers(usersData.users);
    }).catch(() => setError('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const toggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setUpdatingId(userId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        setStats(prev => prev ? {
          ...prev,
          adminUsers: prev.adminUsers + (newRole === 'admin' ? 1 : -1),
          regularUsers: prev.regularUsers + (newRole === 'user' ? 1 : -1),
        } : prev);
      }
    } catch { setError('Failed to update role'); }
    finally { setUpdatingId(null); }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <header className="bg-[#13131f] border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-white/50 text-sm">Welcome, {user?.username}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => { setInboxOpen(v => !v); setInboxUnread(0); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all duration-200"
            title="Inbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            {inboxUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{inboxUnread}</span>
            )}
          </button>
          <button onClick={() => navigate('/home')} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm transition-colors">
            ← User Dashboard
          </button>
          <button onClick={() => { logout(); navigate('/'); }} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
            Logout
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: stats?.totalUsers, icon: '👥', color: 'violet' },
            { label: 'Admins', value: stats?.adminUsers, icon: '👑', color: 'amber' },
            { label: 'Regular Users', value: stats?.regularUsers, icon: '🧑', color: 'indigo' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-[#13131f] border border-white/10 rounded-xl p-5 flex items-center gap-4">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-white/50 text-sm">{label}</p>
                <p className={`text-2xl font-bold text-${color}-400`}>
                  {loading ? '—' : value ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="bg-[#13131f] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-lg">User Management</h2>
            <p className="text-white/40 text-sm">{users.length} registered users</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3">User</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Provider</th>
                    <th className="text-left px-6 py-3">Joined</th>
                    <th className="text-left px-6 py-3">Role</th>
                    <th className="text-left px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
                            {u.username?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/60">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-white/5 rounded-md text-white/60 text-xs capitalize">{u.provider}</span>
                      </td>
                      <td className="px-6 py-4 text-white/40 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'}`}>
                          {u.role === 'admin' ? '👑 Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u._id === user?.id ? (
                          <span className="text-white/20 text-xs">You</span>
                        ) : (
                          <button
                            onClick={() => toggleRole(u._id, u.role)}
                            disabled={updatingId === u._id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${u.role === 'admin'
                              ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400'
                            } disabled:opacity-40`}
                          >
                            {updatingId === u._id ? '...' : u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      {inboxOpen && <InboxPanel onClose={() => setInboxOpen(false)} />}
    </div>
  );
};

export default AdminDashboard;
