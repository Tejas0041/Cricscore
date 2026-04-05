'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  const links = [
    { href: '/', label: 'Home' },
    { href: '/matches', label: 'Matches' },
    { href: '/stats', label: 'Stats' },
    { href: '/rankings', label: 'Rankings' },
  ];

  if (user) {
    if (user.role === 'admin' || user.role === 'scorer') {
      links.push({ href: '/scorer', label: 'Scorer' });
    }
    if (user.role === 'admin') {
      links.push({ href: '/admin', label: 'Admin' });
    }
  }

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-2xl shadow-[0_8px_28px_rgba(2,6,23,0.12)] transition-all duration-300"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <img src="/favicon.ico" alt="CricScore" className="w-8 h-8 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            </div>
            <span className="text-xl font-extrabold tracking-tight gradient-text">
              CricScore
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-1 backdrop-blur-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  pathname === link.href
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg scale-105'
                    : 'text-[var(--foreground)]/85 hover:bg-[var(--card)] hover:scale-105'
                }`}
              >
                {pathname === link.href && (
                  <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
                )}
                <span className="relative z-10" style={pathname === link.href ? { color: 'black' } : {}}>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110 hover:rotate-12 overflow-hidden group"
              aria-label="Toggle theme"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              {theme === 'light' ? (
                <svg className="w-5 h-5 relative z-10 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 relative z-10 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {!loading && (
              <>
                {user ? (
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm opacity-60 px-3 font-medium">{user.username}</span>
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:opacity-90 transition-all duration-300 text-sm font-semibold hover:scale-105 hover:shadow-lg"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="hidden md:block px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl hover:opacity-90 transition-all duration-300 text-sm font-semibold shadow-lg hover:scale-105 hover:shadow-xl"
                  >
                    Login
                  </Link>
                )}
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && typeof document !== 'undefined' && (
        <div 
          className="fixed inset-0 z-[100] md:hidden overflow-y-auto bg-[var(--background)] animate-[fadeIn_0.3s_ease-out] flex flex-col"
          style={{ height: '100vh', width: '100vw' }}
        >
          <div className="container mx-auto px-6 py-6 flex flex-col h-full min-h-screen">
            {/* Top Bar with Logo and Close Button */}
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-[2px] shadow-lg">
                  <div className="w-full h-full bg-[var(--background)] rounded-lg flex items-center justify-center overflow-hidden">
                    <img src="/favicon.ico" alt="CricScore" className="w-7 h-7" />
                  </div>
                </div>
                <span className="text-2xl font-black gradient-text tracking-tighter">CricScore</span>
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[var(--muted)] hover:bg-[var(--border)] active:scale-95 transition-all border border-[var(--border)] shadow-sm"
                aria-label="Close menu"
              >
                <svg className="w-8 h-8 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 space-y-3">
              <span className="text-[11px] font-black tracking-[0.25em] opacity-40 uppercase block mb-4 ml-1">Quick Navigation</span>
              <div className="grid grid-cols-1 gap-3">
                {links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-center py-5 px-6 rounded-3xl transition-all duration-400 font-bold text-lg border ${
                      pathname === link.href
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] border-transparent shadow-xl shadow-[var(--primary)]/30'
                        : 'bg-white/95 border-black/5 shadow-md'
                    }`}
                    style={{ animationDelay: `${index * 50}ms`, color: 'black' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Account Info */}
            {!loading && (
              <div className="mt-8 pt-8 border-t border-[var(--border)] w-full">
                {user ? (
                  <div className="w-full">
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-center py-5 bg-gradient-to-r from-rose-400 to-red-500 rounded-3xl font-black text-lg shadow-xl shadow-red-500/30 active:scale-95 transition-all outline-none"
                      style={{ color: 'black' }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-3xl font-black text-lg shadow-xl shadow-primary/30 active:scale-95 transition-all"
                    style={{ color: 'black' }}
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        danger
        onConfirm={() => { setShowLogoutConfirm(false); handleLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </nav>
  );
}
