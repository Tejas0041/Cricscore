'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches', { cache: 'no-store' });
      const data = await res.json();
      console.log('All matches response:', data);
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Match',
      message: 'Are you sure you want to delete this match? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/matches/${matchId}`, {
            method: 'DELETE',
          });
          
          if (res.ok) {
            setMatches(matches.filter(m => m._id !== matchId));
          }
        } catch (error) {
          console.error('Error deleting match:', error);
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        danger={true}
      />
      
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">All Matches</h1>
          <p className="mt-2 opacity-90">Manage and score matches</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--muted)] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xl mb-4 opacity-60">No matches yet</p>
            <Link 
              href="/scorer/create-match" 
              className="inline-block bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              Create New Match
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <div key={match._id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {match.status === 'live' && (
                      <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--primary)]"></span>
                        </span>
                        <span className="text-sm font-bold text-[var(--primary)]">LIVE</span>
                      </>
                    )}
                    {match.status === 'completed' && (
                      <span className="text-sm font-bold opacity-60">COMPLETED</span>
                    )}
                    {match.status === 'upcoming' && (
                      <span className="text-sm font-bold text-[var(--secondary)]">UPCOMING</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteMatch(match._id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete match"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <Link href={match.status === 'completed' ? `/match/${match._id}` : `/scorer/score/${match._id}`}>
                  <h2 className="text-lg font-bold mb-3 hover:text-[var(--primary)] transition-colors cursor-pointer">
                    {match.teamA.name} vs {match.teamB.name}
                  </h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{match.teamA.name}</span>
                      <span className="text-lg font-bold">
                        {match.innings.first.runs}/{match.innings.first.wickets}
                        <span className="text-sm opacity-60 ml-1">
                          ({match.innings.first.overs}.{match.innings.first.balls})
                        </span>
                      </span>
                    </div>
                    
                    <div className="h-px bg-[var(--border)]"></div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{match.teamB.name}</span>
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
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
