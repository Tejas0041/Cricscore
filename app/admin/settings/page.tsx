'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/BackButton';

interface EnabledButtons {
  single: boolean; boundary: boolean; six: boolean;
  wicket: boolean; dot: boolean; wide: boolean; noball: boolean; deadball: boolean;
}

interface SettingsForm {
  defaultOvers: number;
  defaultBowlerOversLimit: number;
  scoringRules: { single: number; boundary: number; six: number; wideRuns: number; noballRuns: number };
  enabledButtons: EnabledButtons;
}

const DEFAULT: SettingsForm = {
  defaultOvers: 7,
  defaultBowlerOversLimit: 2,
  scoringRules: { single: 1, boundary: 4, six: 6, wideRuns: 1, noballRuns: 1 },
  enabledButtons: { single: true, boundary: true, six: true, wicket: true, dot: true, wide: true, noball: true, deadball: true },
};

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<SettingsForm>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [updatingRankings, setUpdatingRankings] = useState(false);
  const [rankingsUpdated, setRankingsUpdated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d.user?.role === 'admin') { setAuthed(true); loadSettings(); }
      else router.replace('/admin');
    });
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setForm({
          defaultOvers: data.settings.defaultOvers ?? 7,
          defaultBowlerOversLimit: data.settings.defaultBowlerOversLimit ?? 2,
          scoringRules: {
            single: data.settings.scoringRules?.single ?? 1,
            boundary: data.settings.scoringRules?.boundary ?? 4,
            six: data.settings.scoringRules?.six ?? 6,
            wideRuns: data.settings.scoringRules?.wideRuns ?? 1,
            noballRuns: data.settings.scoringRules?.noballRuns ?? 1,
          },
          enabledButtons: {
            single: data.settings.enabledButtons?.single ?? true,
            boundary: data.settings.enabledButtons?.boundary ?? true,
            six: data.settings.enabledButtons?.six ?? true,
            wicket: data.settings.enabledButtons?.wicket ?? true,
            dot: data.settings.enabledButtons?.dot ?? true,
            wide: data.settings.enabledButtons?.wide ?? true,
            noball: data.settings.enabledButtons?.noball ?? true,
            deadball: data.settings.enabledButtons?.deadball ?? true,
          },
        });
      }
    } finally { setLoading(false); }
  };

  const setRule = (key: keyof SettingsForm['scoringRules'], val: number) =>
    setForm(f => ({ ...f, scoringRules: { ...f.scoringRules, [key]: val } }));

  const toggleBtn = (key: keyof EnabledButtons) =>
    setForm(f => ({ ...f, enabledButtons: { ...f.enabledButtons, [key]: !f.enabledButtons[key] } }));

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const handleUpdateRankings = async () => {
    setUpdatingRankings(true); setRankingsUpdated(false);
    try {
      const res = await fetch('/api/rankings/update', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRankingsUpdated(true);
        setTimeout(() => setRankingsUpdated(false), 3000);
      } else {
        alert('Failed to update rankings: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error updating rankings: ' + error);
    } finally { setUpdatingRankings(false); }
  };

  if (!authed || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Stepper = ({ label, hint, value, onChange, min = 0, max = 20 }: {
    label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        {hint && <p className="text-xs opacity-50 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] font-bold text-lg transition-all flex items-center justify-center">−</button>
        <span className="w-8 text-center font-bold text-lg">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] font-bold text-lg transition-all flex items-center justify-center">+</button>
      </div>
    </div>
  );

  const Toggle = ({ label, hint, checked, onChange }: {
    label: string; hint?: string; checked: boolean; onChange: () => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <p className={`font-medium text-sm ${!checked ? 'opacity-40' : ''}`}>{label}</p>
        {hint && <p className="text-xs opacity-40 mt-0.5">{hint}</p>}
      </div>
      <button onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}>
        <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
        <div className="container mx-auto px-4 py-8">
          <BackButton href="/admin" />
          <h1 className="text-2xl font-bold mt-2">Default Settings</h1>
          <p className="text-sm opacity-80 mt-1">These defaults apply to all new matches</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">

        {/* Match Defaults */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wide opacity-50 mb-3">Match Defaults</p>
          <Stepper label="Default Overs" hint="Overs per innings for new matches"
            value={form.defaultOvers} onChange={v => setForm(f => ({ ...f, defaultOvers: v }))} min={1} max={50} />
          <Stepper label="Bowler Overs Limit" hint="Max overs a single bowler can bowl"
            value={form.defaultBowlerOversLimit} onChange={v => setForm(f => ({ ...f, defaultBowlerOversLimit: v }))} min={1} max={20} />
        </div>

        {/* Run Values */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wide opacity-50 mb-3">Run Values</p>
          <Stepper label="Single" hint="Runs for the +single button"
            value={form.scoringRules.single} onChange={v => setRule('single', v)} min={1} max={10} />
          <Stepper label="Boundary" hint="Runs for the +boundary button"
            value={form.scoringRules.boundary} onChange={v => setRule('boundary', v)} min={1} max={10} />
          <Stepper label="Six" hint="Runs for the +six button"
            value={form.scoringRules.six} onChange={v => setRule('six', v)} min={1} max={10} />
          <Stepper label="Wide Runs" hint="Runs added to score for a wide"
            value={form.scoringRules.wideRuns} onChange={v => setRule('wideRuns', v)} min={0} max={5} />
          <Stepper label="No Ball Runs" hint="Runs added to score for a no ball"
            value={form.scoringRules.noballRuns} onChange={v => setRule('noballRuns', v)} min={0} max={5} />
        </div>

        {/* Button Visibility */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wide opacity-50 mb-3">Scoring Buttons</p>
          <Toggle label={`+${form.scoringRules.single} (Single)`} checked={form.enabledButtons.single} onChange={() => toggleBtn('single')} />
          <Toggle label={`+${form.scoringRules.boundary} (Boundary)`} checked={form.enabledButtons.boundary} onChange={() => toggleBtn('boundary')} />
          <Toggle label={`+${form.scoringRules.six} (Six)`} checked={form.enabledButtons.six} onChange={() => toggleBtn('six')} />
          <Toggle label="Wicket" checked={form.enabledButtons.wicket} onChange={() => toggleBtn('wicket')} />
          <Toggle label="Dot" checked={form.enabledButtons.dot} onChange={() => toggleBtn('dot')} />
          <Toggle label="Wide" checked={form.enabledButtons.wide} onChange={() => toggleBtn('wide')} />
          <Toggle label="No Ball" checked={form.enabledButtons.noball} onChange={() => toggleBtn('noball')} />
          <Toggle label="Dead Ball" checked={form.enabledButtons.deadball} onChange={() => toggleBtn('deadball')} />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
        </button>

        <p className="text-xs text-center opacity-40">Changes apply to new matches only, not existing ones</p>

        {/* CricScore Rankings Update */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mt-6">
          <p className="text-xs font-bold uppercase tracking-wide opacity-50 mb-2">CricScore Rankings</p>
          <p className="text-sm opacity-70 mb-4">Recalculate player rankings based on all completed matches. This processes batting, bowling, and all-rounder performances using ICC-style weighted averages.</p>
          <button onClick={handleUpdateRankings} disabled={updatingRankings}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {updatingRankings && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {updatingRankings ? 'Updating Rankings...' : rankingsUpdated ? '✓ Rankings Updated' : '🏆 Update Rankings'}
          </button>
          <p className="text-xs text-center opacity-40 mt-2">This may take a few seconds for large datasets</p>
        </div>
      </main>
    </div>
  );
}
