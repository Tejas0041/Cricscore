'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Match {
  _id: string;
  teamA: { name: string };
  teamB: { name: string };
  status: string;
  winner?: string;
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
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-[var(--foreground)]">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome to CricScore</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Real-time cricket scoring for cricket matches. Track scores, stats, and more.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Links */}
        <section className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/matches', label: 'Matches', icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              )},
              { href: '/stats', label: 'Stats', icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )},
              { href: '/players', label: 'Players', icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )},
              { href: '/players/search', label: 'Search Player', icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              )},
            ].map(({ href, label, icon }) => (
              <Link key={href} href={href}>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-lg hover:scale-[1.03] transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white">
                    {icon}
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-bold">Live Matches</h2>
          </div>
          
          {liveMatches.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--muted)] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--foreground)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[var(--foreground)] opacity-60">No live matches at the moment</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map((match) => (
                <Link key={match._id} href={`/match/${match._id}`}>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--primary)]"></span>
                      </span>
                      <span className="text-sm font-bold text-[var(--primary)]">LIVE</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[var(--card-foreground)]">{match.teamA.name}</span>
                        <span className="text-lg font-bold">
                          {match.innings.first.runs}/{match.innings.first.wickets}
                          <span className="text-sm opacity-60 ml-1">
                            ({match.innings.first.overs}.{match.innings.first.balls})
                          </span>
                        </span>
                      </div>
                      
                      <div className="h-px bg-[var(--border)]"></div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[var(--card-foreground)]">{match.teamB.name}</span>
                        <span className="text-lg font-bold">
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--secondary)] to-[var(--accent)] rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-bold">Recent Matches</h2>
          </div>
          
          {completedMatches.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <p className="text-[var(--foreground)] opacity-60">No completed matches yet</p>
            </div>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedMatches.map((match: any) => {
                const d = new Date(match.createdAt);
                const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const winMsg = (() => {
                  if (!match.winner) return null;
                  if (match.winner === 'Tie') return 'Match Tied';
                  if (match.winner === match.teamB.name) {
                    const w = match.teamB.players?.length - match.innings.second.wickets;
                    return `${match.winner} won by ${w} wicket${w !== 1 ? 's' : ''}`;
                  }
                  const r = match.innings.first.runs - match.innings.second.runs;
                  return `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
                })();
                return (
                  <Link key={match._id} href={`/match/${match._id}`}>
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
                      <div className="flex items-center justify-between px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)]">
                        <span className="text-xs opacity-50">{dateStr}</span>
                        <span className="text-xs opacity-50">{timeStr}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamA.name}</span>
                          <span className="font-bold">
                            {match.innings.first.runs}/{match.innings.first.wickets}
                            <span className="text-xs opacity-50 ml-1">({match.innings.first.overs}.{match.innings.first.balls})</span>
                          </span>
                        </div>
                        <div className="h-px bg-[var(--border)]" />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm truncate max-w-[55%]">{match.teamB.name}</span>
                          <span className="font-bold">
                            {match.innings.second.runs}/{match.innings.second.wickets}
                            <span className="text-xs opacity-50 ml-1">({match.innings.second.overs}.{match.innings.second.balls})</span>
                          </span>
                        </div>
                        {winMsg && (
                          <div className="pt-1 border-t border-[var(--border)]">
                            <p className="text-xs font-semibold text-[var(--primary)]">{winMsg}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
