'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/app/components/ConfirmDialog';

type DateFilter = 'today' | 'yesterday' | 'all' | string; // string = custom date key

function toDateKey(date: Date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export default function AllMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const pusherRef = useRef<any>(null);
  const channelsRef = useRef<any[]>([]);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches', { cache: 'no-store' });
      const data = await res.json();
      setMatches(data.matches || []);
      return data.matches || [];
    } catch (e) { console.error(e); return []; }
    finally { setLoading(false); }
  };

  const subscribeToLive = (allMatches: any[]) => {
    if (typeof window === 'undefined' || !(window as any).Pusher) return;
    channelsRef.current.forEach(ch => { ch.unbind_all(); ch.unsubscribe(); });
    channelsRef.current = [];
    if (!pusherRef.current) {
      pusherRef.current = new (window as any).Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });
    }
    allMatches.filter(m => m.status === 'live').forEach(m => {
      const ch = pusherRef.current.subscribe(`match-${m._id}`);
      ch.bind('score-update', () => { fetchMatches().then(subscribeToLive); });
      channelsRef.current.push(ch);
    });
  };

  useEffect(() => {
    fetchMatches().then(subscribeToLive);
    return () => {
      channelsRef.current.forEach(ch => { ch.unbind_all(); ch.unsubscribe(); });
      if (pusherRef.current) { pusherRef.current.disconnect(); pusherRef.current = null; }
    };
  }, []);

  const handleDelete = (matchId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Match',
      message: 'Delete this match? This cannot be undone and will revert all player stats.',
      onConfirm: async () => {
        const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
        if (res.ok) setMatches(m => m.filter(x => x._id !== matchId));
        setConfirmDialog(d => ({ ...d, isOpen: false }));
      },
    });
  };

  // Assign overall index and per-day index
  const matchesWithMeta = matches.map((m, i) => {
    const d = new Date(m.createdAt);
    return { ...m, overallNo: i + 1, _date: d, _dateKey: toDateKey(d) };
  });

  // Per-day numbering
  const dayCount: Record<string, number> = {};
  matchesWithMeta.forEach(m => {
    dayCount[m._dateKey] = (dayCount[m._dateKey] || 0) + 1;
    m.dayNo = dayCount[m._dateKey];
  });

  // Unique date keys for custom date picker
  const uniqueDates = [...new Set(matchesWithMeta.map(m => m._dateKey))];

  // Filter
  const filtered = matchesWithMeta.filter(m => {
    if (dateFilter === 'today') return isSameDay(m._date, today);
    if (dateFilter === 'yesterday') return isSameDay(m._date, yesterday);
    if (dateFilter === 'all') return true;
    return m._dateKey === dateFilter;
  });

  const todayCount = matchesWithMeta.filter(m => isSameDay(m._date, today)).length;
  const yesterdayCount = matchesWithMeta.filter(m => isSameDay(m._date, yesterday)).length;

  const winMessage = (match: any) => {
    if (!match.winner || match.winner === 'Tie') return match.winner === 'Tie' ? 'Match Tied' : null;
    if (match.winner === match.teamB.name) {
      const w = match.teamB.players.length - match.innings.second.wickets;
      return `${match.winner} won by ${w} wicket${w !== 1 ? 's' : ''}`;
    }
    const r = match.innings.first.runs - match.innings.second.runs;
    return `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        danger={true}
      />

      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold">All Matches</h1>
          <p className="mt-1 opacity-90 text-sm">{matches.length} total · {todayCount} today</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Date filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button onClick={() => setDateFilter('today')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all ${dateFilter === 'today' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
            Today ({todayCount})
          </button>
          <button onClick={() => setDateFilter('yesterday')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all ${dateFilter === 'yesterday' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
            Yesterday ({yesterdayCount})
          </button>
          <button onClick={() => setDateFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all ${dateFilter === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
            All ({matches.length})
          </button>
          {/* Other dates */}
          {uniqueDates
            .filter(dk => dk !== toDateKey(today) && dk !== toDateKey(yesterday))
            .map(dk => (
              <button key={dk} onClick={() => setDateFilter(dk)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all ${dateFilter === dk ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] hover:bg-[var(--border)]'}`}>
                {dk}
              </button>
            ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="mb-4">No matches {dateFilter === 'today' ? 'today' : dateFilter === 'yesterday' ? 'yesterday' : ''}</p>
            <Link href="/scorer/create-match"
              className="inline-block bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all text-sm opacity-100">
              Create Match
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((match) => {
              const matchTime = match._date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              const hasSecond = match.currentInnings === 'second' || match.innings.second.runs > 0 || match.innings.second.wickets > 0;
              const wMsg = winMessage(match);
              const href = match.status === 'completed' ? `/match/${match._id}` : `/scorer/score/${match._id}`;

              return (
                <div key={match._id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]">
                    <div className="flex items-center gap-2 text-xs opacity-60">
                      <span>#{match.overallNo}</span>
                      <span>·</span>
                      <span>Match {match.dayNo} · {match._dateKey}</span>
                      <span>·</span>
                      <span>{matchTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {match.status === 'live' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          LIVE
                        </span>
                      )}
                      {match.status === 'completed' && <span className="text-xs font-semibold text-green-600">Done</span>}
                      {match.status === 'upcoming' && <span className="text-xs font-semibold opacity-50">Soon</span>}
                      <button onClick={() => handleDelete(match._id)}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Match body */}
                  <Link href={href}>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamA.name}</span>
                        <div className="text-right">
                          <span className="font-bold">{match.innings.first.runs}/{match.innings.first.wickets}</span>
                          <span className="text-xs opacity-50 ml-1">({match.innings.first.overs}.{match.innings.first.balls})</span>
                        </div>
                      </div>
                      <div className="h-px bg-[var(--border)]" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamB.name}</span>
                        <div className="text-right">
                          {hasSecond ? (
                            <>
                              <span className="font-bold">{match.innings.second.runs}/{match.innings.second.wickets}</span>
                              <span className="text-xs opacity-50 ml-1">({match.innings.second.overs}.{match.innings.second.balls})</span>
                            </>
                          ) : <span className="font-bold opacity-30">—</span>}
                        </div>
                      </div>
                      {wMsg && (
                        <div className="pt-1 border-t border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--primary)]">{wMsg}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
