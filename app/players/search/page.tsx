'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

interface Stats {
  player: { _id: string; name: string; nickname?: string; role: string };
  batting: {
    matches: number; innings: number; runs: number; balls: number;
    fours: number; sixes: number; outs: number; average: number;
    strikeRate: number; highestScore: number; highestBalls: number; highestSR: number;
  };
  bowling: {
    wickets: number; runs: number; balls: number; economy: number;
    average: number; bestFigures: { wickets: number; runs: number };
  };
  bestMatchRuns: { matchId: string; runs: number; balls: number; vs: string; date: string } | null;
  bestMatchWickets: { matchId: string; wickets: number; runs: number; vs: string; date: string } | null;
  matchups: {
    mostOutsVs: { name: string; count: number } | null;
    mostRunsVs: { name: string; runs: number; balls: number } | null;
    bestSRVs: { name: string; sr: number; runs: number; balls: number } | null;
  };
  motm: { count: number; history: { matchId: string; vs: string; date: string; reason: string; provider: string }[] };
}

function SearchPlayerContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If navigated with ?id=, load directly
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) loadStats(id);
  }, [searchParams]);

  const handleInput = (val: string) => {
    setQuery(val);
    setStats(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSuggestions(data.players || []);
      setShowSuggestions(true);
    }, 300);
  };

  const loadStats = async (id: string) => {
    setLoading(true);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/players/${id}/stats`);
      const data = await res.json();
      setStats(data);
      if (data.player) setQuery(data.player.name);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs opacity-50 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)] rounded-full" />
      <h2 className="text-lg font-bold">{children}</h2>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-10">
          <BackButton href="/players" />
          <h1 className="text-3xl font-bold mb-1 mt-2">Search Player</h1>
          <p className="opacity-80 text-sm">Find a player and view their full career profile</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Search box */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Type a player name..."
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-base"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 overflow-hidden">
              {suggestions.map((p) => (
                <button
                  key={p._id}
                  onClick={() => loadStats(p._id)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--muted)] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">{p.name}{p.nickname ? ` (${p.nickname})` : ''}</span>
                  <span className="text-xs opacity-50 capitalize">{p.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && stats && (
          <div className="space-y-8">
            {/* Player header */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-2xl font-bold">
                {stats.player.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stats.player.name}{stats.player.nickname ? ` (${stats.player.nickname})` : ''}</h2>
                <span className="text-xs capitalize bg-[var(--muted)] px-2 py-0.5 rounded-full mt-1 inline-block">{stats.player.role}</span>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-[var(--primary)]">{stats.batting.matches}</p>
                <p className="text-xs opacity-50">Matches</p>
                {stats.motm?.count > 0 && (
                  <p className="text-xs font-bold text-yellow-500 mt-1">🏅 {stats.motm.count}x MOTM</p>
                )}
              </div>
            </div>

            {/* Batting */}
            <section>
              <SectionTitle>Batting</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Runs" value={stats.batting.runs} sub={`${stats.batting.innings} innings`} />
                <StatCard label="Average" value={stats.batting.average.toFixed(1)} />
                <StatCard label="Strike Rate" value={stats.batting.strikeRate.toFixed(1)} />
                <StatCard label="Highest Score" value={stats.batting.highestScore}
                  sub={`${stats.batting.highestBalls} ${stats.batting.highestBalls === 1 ? 'ball' : 'balls'} · SR ${stats.batting.highestSR.toFixed(1)}`} />
                <StatCard label="Fours" value={stats.batting.fours} />
                <StatCard label="Sixes" value={stats.batting.sixes} />
              </div>
            </section>

            {/* Bowling */}
            <section>
              <SectionTitle>Bowling</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Wickets" value={stats.bowling.wickets} />
                <StatCard label="Economy" value={stats.bowling.economy.toFixed(2)} />
                <StatCard label="Average" value={stats.bowling.wickets > 0 ? stats.bowling.average.toFixed(1) : '—'} />
                <StatCard
                  label="Best Figures"
                  value={`${stats.bowling.bestFigures.wickets}-${stats.bowling.bestFigures.runs}`}
                />
                <StatCard
                  label="Overs Bowled"
                  value={`${Math.floor(stats.bowling.balls / 6)}.${stats.bowling.balls % 6}`}
                />
                <StatCard label="Runs Conceded" value={stats.bowling.runs} />
              </div>
            </section>

            {/* Best Matches */}
            <section>
              <SectionTitle>Best Performances</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                {stats.bestMatchRuns && (
                  <Link href={`/match/${stats.bestMatchRuns.matchId}`}>
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Best Batting</p>
                      <p className="text-3xl font-bold text-[var(--primary)]">
                        {stats.bestMatchRuns.runs}
                        <span className="text-base font-normal opacity-60 ml-1">({stats.bestMatchRuns.balls} {stats.bestMatchRuns.balls === 1 ? 'ball' : 'balls'})</span>
                      </p>
                      <p className="text-sm opacity-60 mt-1">vs {stats.bestMatchRuns.vs}</p>
                    </div>
                  </Link>
                )}
                {stats.bestMatchWickets && (
                  <Link href={`/match/${stats.bestMatchWickets.matchId}`}>
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Best Bowling</p>
                      <p className="text-3xl font-bold text-[var(--secondary)]">
                        {stats.bestMatchWickets.wickets}-{stats.bestMatchWickets.runs}
                      </p>
                      <p className="text-sm opacity-60 mt-1">vs {stats.bestMatchWickets.vs}</p>
                    </div>
                  </Link>
                )}
              </div>
            </section>

            {/* Matchups */}
            {(stats.matchups.mostOutsVs || stats.matchups.mostRunsVs || stats.matchups.bestSRVs) && (
              <section>
                <SectionTitle>Matchups</SectionTitle>
                <div className="grid sm:grid-cols-3 gap-4">
                  {stats.matchups.mostOutsVs && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Most Outs vs</p>
                      <p className="font-bold text-lg">{stats.matchups.mostOutsVs.name}</p>
                      <p className="text-sm opacity-60">{stats.matchups.mostOutsVs.count} time{stats.matchups.mostOutsVs.count !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {stats.matchups.mostRunsVs && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Most Runs vs</p>
                      <p className="font-bold text-lg">{stats.matchups.mostRunsVs.name}</p>
                      <p className="text-sm opacity-60">{stats.matchups.mostRunsVs.runs} runs ({stats.matchups.mostRunsVs.balls} {stats.matchups.mostRunsVs.balls === 1 ? 'ball' : 'balls'})</p>
                    </div>
                  )}
                  {stats.matchups.bestSRVs && (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Best SR vs</p>
                      <p className="font-bold text-lg">{stats.matchups.bestSRVs.name}</p>
                      <p className="text-sm opacity-60">SR {stats.matchups.bestSRVs.sr.toFixed(1)} ({stats.matchups.bestSRVs.runs} runs from {stats.matchups.bestSRVs.balls} balls)</p>
                    </div>
                  )}
                </div>
              </section>
            )}
        {/* MOTM History */}
            {stats.motm?.count > 0 && (
              <section>
                <SectionTitle>Man of the Match ({stats.motm.count})</SectionTitle>
                <div className="space-y-3">
                  {stats.motm.history.map((m, i) => (
                    <Link key={i} href={`/match/${m.matchId}`}>
                      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide">🏅 MOTM</span>
                          <span className="text-xs opacity-50 capitalize">{m.provider}</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold">vs {m.vs}</p>
                          <p className="text-xs opacity-50">
                            {new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' · '}
                            {new Date(m.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <p className="text-xs opacity-60 mt-1 leading-relaxed">{m.reason}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!loading && !stats && !query && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center opacity-60">
            <p>Search for a player to see their profile</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchPlayerContent />
    </Suspense>
  );
}
