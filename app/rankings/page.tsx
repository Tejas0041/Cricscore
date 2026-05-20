'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '../components/BackButton';

type Category = 'batting' | 'bowling' | 'allrounder';

interface RankingPlayer {
  _id: string;
  name: string;
  nickname?: string;
  role: string;
  rankings: {
    batting: number;
    bowling: number;
    allRounder: number;
    previousBatting?: number;
    previousBowling?: number;
    previousAllRounder?: number;
    lastUpdated: Date;
  };
  stats: {
    batting: { matches: number };
    bowling: { matches: number };
  };
}

export default function RankingsPage() {
  const [category, setCategory] = useState<Category>('batting');
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [previousRankings, setPreviousRankings] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isScorer, setIsScorer] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchRankings();
  }, [category]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user && (data.user.role === 'scorer' || data.user.role === 'admin')) {
        setIsScorer(true);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    }
  }

  async function fetchRankings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rankings?category=${category}`);
      if (!res.ok) throw new Error('Failed to fetch rankings');
      const data = await res.json();
      const fetchedPlayers = data.players || [];
      
      // Build previous rankings map for position comparison
      const prevMap = new Map<string, number>();
      fetchedPlayers.forEach((p: RankingPlayer, idx: number) => {
        const prevRating = category === 'batting' ? p.rankings.previousBatting :
                          category === 'bowling' ? p.rankings.previousBowling :
                          p.rankings.previousAllRounder;
        if (prevRating) prevMap.set(p._id, prevRating);
      });
      
      setPreviousRankings(prevMap);
      setPlayers(fetchedPlayers);
    } catch (err) {
      console.error('Rankings Fetch Error:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const res = await fetch('/api/rankings/update', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUpdateMsg({ type: 'success', text: `Updated! ${data.matchesProcessed} matches in ${data.duration}` });
        await fetchRankings();
      } else {
        setUpdateMsg({ type: 'error', text: data.error || 'Failed to update' });
      }
    } catch (error) {
      setUpdateMsg({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setUpdating(false);
      setTimeout(() => setUpdateMsg(null), 4000);
    }
  }

  const getPoints = (p: RankingPlayer) => {
    if (!p.rankings) return 0;
    if (category === 'bowling') return p.rankings.bowling ?? 0;
    if (category === 'allrounder') return p.rankings.allRounder ?? 0;
    return p.rankings.batting ?? 0;
  };

  const getPreviousPoints = (p: RankingPlayer) => {
    if (!p.rankings) return 0;
    if (category === 'bowling') return p.rankings.previousBowling ?? 0;
    if (category === 'allrounder') return p.rankings.previousAllRounder ?? 0;
    return p.rankings.previousBatting ?? 0;
  };

  const getRatingChange = (p: RankingPlayer) => {
    const current = getPoints(p);
    const previous = getPreviousPoints(p);
    if (!previous || previous === 0) return null;
    return current - previous;
  };

  const getPositionChange = (playerId: string, currentPos: number) => {
    const prevRating = previousRankings.get(playerId);
    if (!prevRating) return 0;
    
    // Calculate where they would have been ranked with previous rating
    const sortedByPrevious = [...players].sort((a, b) => {
      const aPrev = getPreviousPoints(a) || 0;
      const bPrev = getPreviousPoints(b) || 0;
      return bPrev - aPrev;
    });
    
    const previousPos = sortedByPrevious.findIndex(p => p._id === playerId) + 1;
    return previousPos - currentPos; // Positive = moved up, Negative = moved down
  };

  const formatLastUpdated = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-3 sm:px-4 pt-6 sm:pt-8 md:pt-10 max-w-4xl">
        <div className="hero-glow glass-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex items-center justify-between mb-4">
            <BackButton />
            {isScorer && (
              <button
                onClick={handleRecalculate}
                disabled={updating}
                className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-xs sm:text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-1.5 sm:gap-2"
              >
                {updating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Recalculate
                  </>
                )}
              </button>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-3 sm:mb-4 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] bg-clip-text text-transparent">
            CricScore Rankings
          </h1>
          <p className="text-xs sm:text-sm md:text-lg text-[var(--foreground)]/70 max-w-2xl font-medium tracking-tight">
            AI-powered weighted performance index for cricket legends. Based on consistency, strike rate, and match impact.
          </p>
          <div className="flex flex-col gap-2.5 mt-6">
            {players.length > 0 && players[0].rankings?.lastUpdated && (
              <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <svg className="w-3.5 h-3.5 opacity-40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Updated {formatLastUpdated(players[0].rankings.lastUpdated)}</span>
              </div>
            )}
            <button
              onClick={() => setShowInfo(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-all font-bold group"
            >
              <svg className="w-4 h-4 text-[var(--primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">How rankings are calculated</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        {updateMsg && (
          <div className={`mb-4 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2
            ${updateMsg.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {updateMsg.type === 'success' ? '✓' : '✕'} {updateMsg.text}
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-6 sm:mb-8 glass-card p-1.5 sm:p-2 rounded-xl sm:rounded-2xl">
          {(['batting', 'bowling', 'allrounder'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-3 rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest transition-all duration-500
                ${category === cat 
                  ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-xl scale-[1.02]' 
                  : 'hover:bg-[var(--muted)] opacity-60 hover:opacity-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass-card rounded-3xl p-20 flex flex-col items-center justify-center gap-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold opacity-50 tracking-widest uppercase">Analyzing Points...</p>
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-white/5">
              <div className="w-16 flex-shrink-0 text-[10px] font-bold uppercase tracking-widest opacity-40">Rank</div>
              <div className="flex-1 text-[10px] font-bold uppercase tracking-widest opacity-40">Player</div>
              <div className="w-24 text-right text-[10px] font-bold uppercase tracking-widest opacity-40">Rating</div>
            </div>

            <div className="divide-y divide-white/5">
              {players.map((player, idx) => {
                const posChange = getPositionChange(player._id, idx + 1);
                const ratingChange = getRatingChange(player);
                
                return (
                  <Link 
                    key={player._id} 
                    href={`/players/search?id=${player._id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors group"
                  >
                    {/* Rank + Arrow inline */}
                    <div className="w-16 flex-shrink-0 flex items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0
                        ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-orange-400/80 text-orange-950' :
                          'bg-white/10 text-[var(--foreground)]'}`}>
                        {idx + 1}
                      </div>
                      {posChange !== 0 ? (
                        <span className={`text-xs font-bold leading-none ${posChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {posChange > 0 ? '↑' : '↓'}{Math.abs(posChange)}
                        </span>
                      ) : (
                        <span className="text-xs opacity-20 leading-none">—</span>
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm group-hover:text-[var(--primary)] transition-colors truncate block">
                        {player.name}
                        {player.nickname && <span className="text-xs opacity-40 ml-1.5">({player.nickname})</span>}
                      </span>
                    </div>

                    {/* Rating + Change */}
                    <div className="w-24 flex items-baseline justify-end gap-1 flex-shrink-0">
                      <span className={`text-xl font-black tabular-nums
                        ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-[var(--primary)]'}`}>
                        {getPoints(player)}
                      </span>
                      {ratingChange !== null && ratingChange !== 0 && (
                        <span className={`text-[11px] font-bold ${ratingChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({ratingChange > 0 ? '+' : ''}{ratingChange})
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            {!players.length && (
              <div className="p-20 text-center">
                <p className="text-lg opacity-40 font-bold italic">No rankings available yet. Start some matches!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rankings Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative glass-card w-full max-w-lg rounded-[2rem] flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">How Rankings Work</h2>
                  <p className="text-xs opacity-50 mt-0.5">AI-powered · Updated on recalculation</p>
                </div>
                <button onClick={() => setShowInfo(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              {/* Scale */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Rating Scale (0–1000)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { range: '900–1000', label: 'Elite', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
                    { range: '800–900', label: 'Excellent', color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10 border-[var(--primary)]/20' },
                    { range: '700–800', label: 'Very Good', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { range: '600–700', label: 'Good', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
                    { range: '500–600', label: 'Average', color: 'text-slate-300', bg: 'bg-white/5 border-white/10' },
                    { range: 'Below 500', label: 'Developing', color: 'text-slate-500', bg: 'bg-white/5 border-white/10' },
                  ].map(s => (
                    <div key={s.range} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${s.bg}`}>
                      <span className={`text-xs font-black ${s.color}`}>{s.range}</span>
                      <span className="text-xs opacity-60">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batting */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-[var(--primary)] rounded-full" />
                  <p className="text-sm font-black uppercase tracking-widest text-[var(--primary)]">Batting</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mb-3">Eligibility: 10+ innings · 50+ runs · 60+ balls faced</p>
                  {[
                    ['Total Runs', 'Primary volume metric — more runs = higher base rating'],
                    ['Batting Average', 'Runs per dismissal — consistency over time'],
                    ['Strike Rate', 'Benchmark ~100 for this format — less weighted than avg'],
                    ['Match-Winning Knocks', 'Scored 40%+ of team total in a win — high impact'],
                    ['Consistency Score', 'How regularly the player contributes across innings'],
                    ['Recent Form', 'Average across last 5 matches — weighted higher'],
                    ['MOTM Awards', 'Peer-recognised match-defining performances'],
                    ['Win Rate', 'Team win % when player participates'],
                    ['30+ Scores', 'Number of significant innings played'],
                    ['Sample Size Penalty', 'Players with <15 innings are penalised for reliability'],
                  ].map(([param, desc]) => (
                    <div key={param} className="flex gap-3">
                      <span className="text-[var(--primary)] font-bold text-xs w-36 flex-shrink-0">{param}</span>
                      <span className="text-xs opacity-60 leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bowling */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-red-500 rounded-full" />
                  <p className="text-sm font-black uppercase tracking-widest text-red-400">Bowling</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mb-3">Eligibility: 10+ innings · 60+ balls bowled · 5+ wickets</p>
                  {[
                    ['Total Wickets', 'Most important metric — wickets are king in this format'],
                    ['Bowling Average', 'Runs per wicket — lower is better (benchmark 15–20)'],
                    ['Economy Rate', 'Runs per over — benchmark 6.0, lower is better'],
                    ['Bowling Strike Rate', 'Balls per wicket — lower means wickets come faster'],
                    ['3+ Wicket Hauls', 'Match-changing spells — heavily rewarded'],
                    ['4+ Wicket Hauls', 'Exceptional spells — highest impact bonus'],
                    ['Crucial Wickets', '3+ wickets taken in winning matches'],
                    ['Consistency Score', 'How regularly the bowler takes wickets'],
                    ['Recent Form', 'Wickets in last 5 matches — weighted higher'],
                    ['MOTM Awards', 'Recognised match-winning bowling performances'],
                    ['Sample Size Penalty', 'Players with <15 innings are penalised'],
                  ].map(([param, desc]) => (
                    <div key={param} className="flex gap-3">
                      <span className="text-red-400 font-bold text-xs w-36 flex-shrink-0">{param}</span>
                      <span className="text-xs opacity-60 leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All-Rounder */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-amber-400 rounded-full" />
                  <p className="text-sm font-black uppercase tracking-widest text-amber-400">All-Rounder</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mb-3">Eligibility: 8+ batting innings · 8+ bowling innings · 40+ runs · 4+ wickets</p>
                  {[
                    ['Formula', 'Geometric mean of batting and bowling ratings — √(bat × bowl)'],
                    ['Balance Requirement', 'Both disciplines must be rated — a weak discipline pulls the score down'],
                    ['Batting Rating', 'Full batting rating calculated independently first'],
                    ['Bowling Rating', 'Full bowling rating calculated independently first'],
                    ['Why Geometric Mean', 'Prevents a dominant discipline from masking a weak one'],
                  ].map(([param, desc]) => (
                    <div key={param} className="flex gap-3">
                      <span className="text-amber-400 font-bold text-xs w-36 flex-shrink-0">{param}</span>
                      <span className="text-xs opacity-60 leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inactivity Decay */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-slate-400 rounded-full" />
                  <p className="text-sm font-black uppercase tracking-widest opacity-60">Inactivity Decay</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-2.5">
                  {[
                    ['Decay Rate', '2% reduction every 2 days of absence after the first 2 days'],
                    ['Minimum Floor', '100 for batting/bowling · 10 for all-rounder'],
                    ['Purpose', 'Keeps rankings current — inactive players gradually drop'],
                  ].map(([param, desc]) => (
                    <div key={param} className="flex gap-3">
                      <span className="text-slate-400 font-bold text-xs w-36 flex-shrink-0">{param}</span>
                      <span className="text-xs opacity-60 leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] opacity-30 text-center pb-2">Powered by Groq AI (llama-3.3-70b) with formula-based fallback</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
