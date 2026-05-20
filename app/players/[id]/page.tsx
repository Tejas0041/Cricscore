'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/app/components/BackButton';

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayer();
  }, [params.id]);

  const fetchPlayer = async () => {
    try {
      const res = await fetch(`/api/players/${params.id}`);
      const data = await res.json();
      setPlayer(data.player);
    } catch (error) {
      console.error('Error fetching player:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-[2rem] p-8 text-center max-w-sm">
          <p className="text-xl font-bold opacity-60">Profile not found</p>
          <button onClick={() => router.back()} className="mt-4 text-[var(--primary)] font-bold hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 pt-8 md:pt-10 max-w-4xl">
        <div className="hero-glow glass-card rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent pointer-events-none" />
          <BackButton />
          
          <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex feature-chip px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2">
                {player.role || 'Player Profile'}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                {player.name}
                {player.nickname && (
                  <span className="block text-2xl md:text-3xl opacity-40 font-bold mt-1">
                    "{player.nickname}"
                  </span>
                )}
              </h1>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* CricScore Rankings */}
              {(player.rankings?.batting > 0 || player.rankings?.bowling > 0 || player.rankings?.allRounder > 0) && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {player.rankings?.batting > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Bat</span>
                      <span className="text-sm font-black text-[var(--primary)]">{player.rankings.batting}</span>
                    </div>
                  )}
                  {player.rankings?.bowling > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Bowl</span>
                      <span className="text-sm font-black text-red-400">{player.rankings.bowling}</span>
                    </div>
                  )}
                  {player.rankings?.allRounder > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">AR</span>
                      <span className="text-sm font-black text-amber-400">{player.rankings.allRounder}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Key Stats */}
              <div className="flex gap-3">
                <div className="text-center p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-2xl md:text-4xl font-black text-[var(--primary)]">{player.stats.batting.runs}</p>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Total Runs</p>
                </div>
                <div className="text-center p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <p className="text-2xl md:text-4xl font-black text-red-500">{player.stats.bowling.wickets}</p>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Wickets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Batting Card */}
          <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">🏏</div>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-2">
              <span className="w-2 h-8 bg-[var(--primary)] rounded-full" />
              Batting
            </h2>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { label: 'Matches', value: player.stats.batting.matches },
                { label: 'Highest', value: player.stats.batting.highestScore },
                { label: 'Average', value: player.stats.batting.average.toFixed(2) },
                { label: 'SR', value: player.stats.batting.strikeRate.toFixed(1) },
                { label: '50s', value: player.stats.batting.fifties, color: 'text-amber-500' },
                { label: '4s/6s', value: `${player.stats.batting.fours}/${player.stats.batting.sixes}` }
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <p className={`text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bowling Card */}
          <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">🔴</div>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-2">
              <span className="w-2 h-8 bg-red-500 rounded-full" />
              Bowling
            </h2>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { label: 'Matches', value: player.stats.bowling.matches },
                { label: 'Wickets', value: player.stats.bowling.wickets, color: 'text-red-500' },
                { label: 'Economy', value: player.stats.bowling.economy.toFixed(2) },
                { label: 'SR', value: player.stats.bowling.strikeRate.toFixed(1) },
                { label: 'Avg', value: player.stats.bowling.average.toFixed(2) },
                { label: 'Best', value: player.stats.bowling.bestFigures || '-' }
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <p className={`text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Teams Section (If available) */}
        {player.teams?.length > 0 && (
          <div className="mt-8 glass-card rounded-3xl p-8">
            <h2 className="text-xl font-black mb-4">Affiliations</h2>
            <div className="flex flex-wrap gap-2">
              {player.teams.map((team: any) => (
                <span key={team._id} className="px-4 py-2 rounded-2xl bg-[var(--muted)] text-sm font-bold border border-[var(--border)]">
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
