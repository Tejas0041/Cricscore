'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments').then(r => r.json()).then(d => {
      setTournaments(d.tournaments || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 pt-8 max-w-3xl">
        <div className="hero-glow glass-card rounded-[2rem] p-6 md:p-8">
          <BackButton href="/" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">🏆 Tournaments</h1>
          <p className="mt-2 text-sm opacity-75">Live scores, points table and stats for all tournaments</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {tournaments.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <p className="text-5xl mb-4">🏆</p>
            <p className="font-semibold">No tournaments yet</p>
          </div>
        )}
        {tournaments.map((t: any) => (
          <Link key={t._id} href={`/tournament/${t._id}`}>
            <div className="glass-card elevated-hover rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-lg">🏆 {t.name}</p>
                  <p className="text-xs opacity-50 mt-1">{t.overs} overs · {t.teams?.length} teams · {t.dates?.join(', ')}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  t.status === 'active' ? 'bg-green-500/20 text-green-500' :
                  t.status === 'completed' ? 'bg-[var(--muted)] opacity-60' :
                  'bg-amber-500/20 text-amber-500'
                }`}>
                  {t.status === 'active' ? '● Live' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.teams?.map((team: any) => (
                  <span key={team.name} className="text-xs px-2.5 py-1 rounded-full bg-[var(--muted)] border border-[var(--border)]">{team.name}</span>
                ))}
              </div>
              <p className="text-xs opacity-40 mt-2">{t.matches?.length || 0} match{t.matches?.length !== 1 ? 'es' : ''}</p>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
