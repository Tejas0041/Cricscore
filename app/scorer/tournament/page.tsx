'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

export default function ScorerTournamentsPage() {
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
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white px-4 py-8">
        <div className="container mx-auto max-w-2xl">
          <BackButton href="/scorer" />
          <div className="mt-3 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tournaments</h1>
              <p className="opacity-80 text-sm mt-1">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/scorer/tournament/create"
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all">
              + New
            </Link>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-3">
        {tournaments.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <p className="text-5xl mb-4">🏆</p>
            <p className="font-semibold">No tournaments yet</p>
            <Link href="/scorer/tournament/create" className="mt-4 inline-block px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold">
              Create First Tournament
            </Link>
          </div>
        )}
        {tournaments.map((t: any) => (
          <div key={t._id} className="glass-card rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-base">🏆 {t.name}</p>
                <p className="text-xs opacity-50 mt-1">{t.overs} overs · {t.teams?.length} teams · {t.dates?.join(', ')}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                t.status === 'active' ? 'bg-green-500/20 text-green-500' :
                t.status === 'completed' ? 'bg-[var(--muted)] opacity-60' :
                'bg-amber-500/20 text-amber-500'
              }`}>
                {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.teams?.map((team: any) => (
                <span key={team.name} className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">{team.name}</span>
              ))}
            </div>
            <p className="text-xs opacity-40 mt-2 mb-3">{t.matches?.length || 0} match{t.matches?.length !== 1 ? 'es' : ''}</p>
            <div className="flex gap-2">
              <Link href={`/scorer/tournament/${t._id}`}
                className="flex-1 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-xl text-sm font-semibold text-center">
                Manage
              </Link>
              <Link href={`/tournament/${t._id}`}
                className="flex-1 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm font-semibold text-center hover:border-[var(--primary)] transition-all">
                View Tournament ↗
              </Link>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
