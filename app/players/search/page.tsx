'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

interface Stats {
  player: { _id: string; name: string; nickname?: string; role: string; rankings?: { batting: number; bowling: number; allRounder: number }; ranks?: { batting: number; bowling: number; allRounder: number } };
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
  captaincy: { matches: number; wins: number; losses: number; ties: number; winPercentage: number } | null;
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
      const [statsRes, batRes, bowlRes, arRes] = await Promise.all([
        fetch(`/api/players/${id}/stats`),
        fetch(`/api/rankings?category=batting&limit=100`),
        fetch(`/api/rankings?category=bowling&limit=100`),
        fetch(`/api/rankings?category=allrounder&limit=100`),
      ]);
      const data = await statsRes.json();
      const batData = await batRes.json();
      const bowlData = await bowlRes.json();
      const arData = await arRes.json();

      // Find rank positions
      const batRank = (batData.players || []).findIndex((p: any) => p._id === id) + 1;
      const bowlRank = (bowlData.players || []).findIndex((p: any) => p._id === id) + 1;
      const arRank = (arData.players || []).findIndex((p: any) => p._id === id) + 1;

      if (data.player) {
        data.player.ranks = { batting: batRank, bowling: bowlRank, allRounder: arRank };
      }

      setStats(data);
      if (data.player) setQuery(data.player.name);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1 elevated-hover">
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
    <div className="min-h-screen pb-8">
      <div className="container mx-auto px-4 pt-8 md:pt-10">
        <div className="hero-glow glass-card rounded-[2rem] p-8 md:p-10">
          <BackButton />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 mt-2">Player Intelligence</h1>
          <p className="text-sm md:text-base text-[var(--foreground)]/75">Search any player and open an interactive career dashboard.</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="relative mb-8 glass-card rounded-2xl p-4">
          <input
            type="text"
            placeholder="Type a player name..."
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-base"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 overflow-hidden">
              {suggestions.map((p) => (
                <button
                  key={p._id}
                  onClick={() => loadStats(p._id)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--muted)]/60 transition-colors flex items-center justify-between"
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
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-lg font-black shadow-lg flex-shrink-0">
                  {stats.player.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black leading-tight truncate">
                    {stats.player.name}
                    {stats.player.nickname && <span className="text-xs font-normal opacity-40 ml-1">({stats.player.nickname})</span>}
                  </h2>
                  <span className="text-[10px] capitalize bg-[var(--muted)] px-2 py-0.5 rounded-full inline-block opacity-60">{stats.player.role}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-[var(--primary)]">{stats.batting.matches}</p>
                  <p className="text-[10px] opacity-40 uppercase tracking-wide">Matches</p>
                  {stats.motm?.count > 0 && (
                    <p className="text-[10px] font-bold text-yellow-500">{stats.motm.count}x MOTM</p>
                  )}
                </div>
              </div>

              {/* Rankings — single row */}
              {stats.player.rankings && (
                <div className="flex gap-2 mt-3">
                  {(stats.player.rankings.batting ?? 0) > 0 && (
                    <div className="flex-1 flex flex-col items-center py-2 px-1 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">Batting</span>
                      <span className="text-base font-black text-[var(--primary)] leading-none">{stats.player.rankings.batting}</span>
                      {stats.player.ranks?.batting ? (
                        <span className="text-[9px] opacity-40 mt-0.5">#{stats.player.ranks.batting}</span>
                      ) : null}
                    </div>
                  )}
                  {(stats.player.rankings.bowling ?? 0) > 0 && (
                    <div className="flex-1 flex flex-col items-center py-2 px-1 rounded-xl bg-red-500/10 border border-red-500/20">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">Bowling</span>
                      <span className="text-base font-black text-red-400 leading-none">{stats.player.rankings.bowling}</span>
                      {stats.player.ranks?.bowling ? (
                        <span className="text-[9px] opacity-40 mt-0.5">#{stats.player.ranks.bowling}</span>
                      ) : null}
                    </div>
                  )}
                  {(stats.player.rankings.allRounder ?? 0) > 0 && (
                    <div className="flex-1 flex flex-col items-center py-2 px-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">All-Round</span>
                      <span className="text-base font-black text-amber-400 leading-none">{stats.player.rankings.allRounder}</span>
                      {stats.player.ranks?.allRounder ? (
                        <span className="text-[9px] opacity-40 mt-0.5">#{stats.player.ranks.allRounder}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
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
            
            {/* Captaincy */}
            {stats.captaincy && (
              <section>
                <SectionTitle>Captaincy Record</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Matches Led" value={stats.captaincy.matches} />
                  <StatCard label="Wins" value={stats.captaincy.wins} />
                  <StatCard label="Win %" value={`${stats.captaincy.winPercentage.toFixed(1)}%`} />
                  <StatCard label="Loss/Tie" value={`${stats.captaincy.losses}/${stats.captaincy.ties}`} />
                </div>
              </section>
            )}

            {/* Best Matches */}
            <section>
              <SectionTitle>Best Performances</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                {stats.bestMatchRuns && (
                  <Link href={`/match/${stats.bestMatchRuns.matchId}`}>
                    <div className="glass-card elevated-hover rounded-xl p-4 cursor-pointer">
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
                    <div className="glass-card elevated-hover rounded-xl p-4 cursor-pointer">
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
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Most Outs vs</p>
                      <p className="font-bold text-lg">{stats.matchups.mostOutsVs.name}</p>
                      <p className="text-sm opacity-60">{stats.matchups.mostOutsVs.count} time{stats.matchups.mostOutsVs.count !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {stats.matchups.mostRunsVs && (
                    <div className="glass-card rounded-xl p-4">
                      <p className="text-xs opacity-50 mb-1 uppercase tracking-wide">Most Runs vs</p>
                      <p className="font-bold text-lg">{stats.matchups.mostRunsVs.name}</p>
                      <p className="text-sm opacity-60">{stats.matchups.mostRunsVs.runs} runs ({stats.matchups.mostRunsVs.balls} {stats.matchups.mostRunsVs.balls === 1 ? 'ball' : 'balls'})</p>
                    </div>
                  )}
                  {stats.matchups.bestSRVs && (
                    <div className="glass-card rounded-xl p-4">
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
          <div className="glass-card rounded-xl p-12 text-center opacity-70">
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
