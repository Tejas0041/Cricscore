'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      
      if (data.user && data.user.role === 'admin') {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.user.role === 'admin') {
        setUser(data.user);
      } else {
        setError('Invalid credentials or insufficient permissions');
      }
    } catch (error) {
      setError('Login failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      if (res.ok) {
        setAlertDialog({
          isOpen: true,
          title: 'Success',
          message: 'Password changed successfully',
        });
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to change password',
        });
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Error changing password',
      });
    }
  };

  const handleClearStats = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear All Stats',
      message: 'Are you sure you want to clear all player statistics? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/clear-stats', {
            method: 'POST',
          });
          
          if (res.ok) {
            setAlertDialog({
              isOpen: true,
              title: 'Success',
              message: 'All player stats cleared successfully',
            });
          } else {
            setAlertDialog({
              isOpen: true,
              title: 'Error',
              message: 'Failed to clear stats',
            });
          }
        } catch (error) {
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Error clearing stats',
          });
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ConfirmDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText="OK"
        onConfirm={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        onCancel={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Clear Stats"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        danger={true}
      />
      
      <header className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600 transition-all"
            >
              Change Password
            </button>
            <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-all">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {showChangePassword && (
          <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-xl mb-4">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required
                />
              </div>
              <button type="submit" className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg">
                Update Password
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push('/scorer/create-match')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Create Match</h2>
            <p className="opacity-60">Start a new match</p>
          </button>
          
          <button
            onClick={() => router.push('/scorer/live-matches')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Manage Matches</h2>
            <p className="opacity-60">Edit or delete matches</p>
          </button>
          
          <button
            onClick={() => router.push('/scorer/players')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Manage Players</h2>
            <p className="opacity-60">Add, edit, or delete players</p>
          </button>
          
          <button
            onClick={handleClearStats}
            className="bg-[var(--card)] border-2 border-red-500 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2 text-red-500">Clear All Stats</h2>
            <p className="opacity-60">Reset all player statistics to zero</p>
          </button>
          
          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-2">Settings</h2>
            <p className="opacity-60">Configure scoring rules</p>
          </button>
        </div>
      </main>
    </div>
  );
}
