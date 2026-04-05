'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Match {
  _id: string;
  teamA: { name: string; players?: any[] };
  teamB: { name: string; players?: any[] };
  status: string;
  winner?: string;
  motm?: { playerName: string; team: string };
  innings: {
    first: { runs: number; wickets: number; overs: number; balls: number };
    second: { runs: number; wickets: number; overs: number; balls: number };
  };
  currentInnings: string;
  createdAt: string;
  overs: number;
}

export default function Home() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const [liveRes, completedRes] = await Promise.all([
        fetch('/api/matches?status=live'),
        fetch('/api/matches?status=completed'),
      ]);
      
      const liveData = await liveRes.json();
      const completedData = await completedRes.json();
      
      setLiveMatches(liveData.matches || []);
      setCompletedMatches(completedData.matches || []);
      setVisibleCompletedCount(10);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 flex flex-col items-center gap-4 animate-[scaleIn_0.3s_ease-out]">
          <div className="loading-spinner" />
          <p className="text-lg font-semibold text-[var(--foreground)]">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-8 md:pt-10">
        <section className="relative glass-card rounded-[2rem] p-7 md:p-12 overflow-hidden mb-8 shadow-xl border border-[var(--primary)]/10">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-transparent" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-black tracking-widest uppercase animate-[fadeInUp_0.5s_ease-out]">
              <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse" />
              Live intelligence
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-[1000] tracking-tight leading-[1.1] animate-[fadeInUp_0.6s_ease-out]">
              Welcome to <span className="gradient-text">CricScore</span>
            </h1>
            <p className="mt-3 text-base md:text-xl text-[var(--foreground)]/70 animate-[fadeInUp_0.7s_ease-out] font-medium leading-relaxed">
              Real-time scores, player stats, and interactive scorecards in a modern interface.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 animate-[fadeInUp_0.8s_ease-out]">
              {['Live scores', 'Player stats', 'Scorecards', 'Match insights'].map((label) => (
                <span 
                  key={label} 
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-xs font-bold opacity-80 whitespace-nowrap"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          {/* Primary Feature Grid (4 items) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-4">
            {[
              { href: '/matches', label: 'Matches', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              )},
              { href: '/stats', label: 'Stats', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )},
              { href: '/players', label: 'Players', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )},
              { href: '/players/search', label: 'Search', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              )},
            ].map(({ href, label, icon }) => (
              <Link key={href} href={href}>
                <div className="glass-card elevated-hover rounded-2xl p-4 md:p-5 flex flex-col items-center gap-3 cursor-pointer group h-full">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                    {icon}
                  </div>
                  <span className="text-sm font-semibold transition-colors duration-300 group-hover:text-[var(--primary)]">{label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Rankings Full-width Callout */}
          <Link href="/rankings" className="block">
            <div className="glass-card elevated-hover rounded-[1.5rem] p-5 md:p-6 flex items-center justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 translate-x-4 -translate-y-4">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black italic tracking-tighter gradient-text uppercase italic">CricScore Rankings</h3>
                  <p className="text-[10px] font-bold tracking-[0.3em] opacity-40 uppercase">Performance Index</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--muted)]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight gradient-text">Live Matches</h2>
            <span className="feature-chip rounded-full px-3 py-1.5 text-xs font-semibold pulse-badge">
              {liveMatches.length} live
            </span>
          </div>

          {liveMatches.length === 0 ? (
            <div className="glass-card rounded-2xl p-9 text-center animate-[fadeInUp_0.4s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--muted)] to-[var(--muted)]/50 rounded-2xl flex items-center justify-center float-animation">
                <svg className="w-8 h-8 text-[var(--foreground)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[var(--foreground)] opacity-70 font-medium">No live matches at the moment</p>
              <p className="text-sm text-[var(--foreground)] opacity-50 mt-2">Check back soon for live action!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map((match) => (
                <Link key={match._id} href={`/match/${match._id}`}>
                  <div className="match-card glass-card rounded-2xl p-5 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--primary)] glow-effect" />
                        </span>
                        <span className="text-xs font-bold tracking-wider text-[var(--primary)] pulse-badge">LIVE</span>
                      </div>
                      <span className="text-xs text-[var(--foreground)]/60 font-medium">Tap to open →</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-3">
                        <span className="font-semibold truncate">{match.teamA.name}</span>
                        <span className="text-lg font-bold gradient-text">
                          {match.innings.first.runs}/{match.innings.first.wickets}
                          <span className="text-sm opacity-60 ml-1">
                            ({match.innings.first.overs}.{match.innings.first.balls})
                          </span>
                        </span>
                      </div>

                      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                      <div className="flex justify-between items-center gap-3">
                        <span className="font-semibold truncate">{match.teamB.name}</span>
                        <span className="text-lg font-bold gradient-text">
                          {match.currentInnings === 'second'
                            ? `${match.innings.second.runs}/${match.innings.second.wickets}`
                            : '—'}
                          {match.currentInnings === 'second' && (
                            <span className="text-sm opacity-60 ml-1">
                              ({match.innings.second.overs}.{match.innings.second.balls})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight gradient-text">Recent Matches</h2>
            <span className="feature-chip rounded-full px-3 py-1.5 text-xs font-semibold">
              {completedMatches.length} completed
            </span>
          </div>

          {completedMatches.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-[var(--foreground)] opacity-70">No completed matches yet</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedMatches.slice(0, visibleCompletedCount).map((match) => {
                const d = new Date(match.createdAt);
                const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const winMsg = (() => {
                  if (!match.winner) return null;
                  if (match.winner === 'Tie') return 'Match Tied';
                  if (match.winner === match.teamB.name) {
                    const w = (match.teamB.players?.length || 0) - match.innings.second.wickets;
                    return `${match.winner} won by ${w || '?'} wicket${w !== 1 ? 's' : ''}`;
                  }
                  const r = match.innings.first.runs - match.innings.second.runs;
                  return `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
                })();
                return (
                  <Link key={match._id} href={`/match/${match._id}`}>
                    <div className="match-card glass-card rounded-2xl overflow-hidden cursor-pointer h-full">
                      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[var(--muted)]/60 to-[var(--muted)]/40 border-b border-[var(--border)]">
                        <span className="text-xs opacity-60 font-medium">{dateStr}</span>
                        <span className="text-xs opacity-60 font-medium">{timeStr}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center gap-3">
                          <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamA.name}</span>
                          <span className="font-bold">
                            {match.innings.first.runs}/{match.innings.first.wickets}
                            <span className="text-xs opacity-55 ml-1">({match.innings.first.overs}.{match.innings.first.balls})</span>
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                        <div className="flex justify-between items-center gap-3">
                          <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamB.name}</span>
                          <span className="font-bold">
                            {match.innings.second.runs}/{match.innings.second.wickets}
                            <span className="text-xs opacity-55 ml-1">({match.innings.second.overs}.{match.innings.second.balls})</span>
                          </span>
                        </div>
                        {(winMsg || match.motm?.playerName) && (
                          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
                            {winMsg && <p className="text-xs font-semibold gradient-text">{winMsg}</p>}
                            {match.motm?.playerName && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)]/70 ml-auto">
                                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-500 font-bold tracking-wide text-[10px]">MOTM</span>
                                <span className="truncate max-w-[80px]">{match.motm.playerName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>

              {visibleCompletedCount < completedMatches.length && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setVisibleCompletedCount((prev) => prev + 10)}
                    className="ui-btn btn-primary px-6 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Load more ({Math.max(completedMatches.length - visibleCompletedCount, 0)} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
