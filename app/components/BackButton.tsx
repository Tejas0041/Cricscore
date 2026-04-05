'use client';
import { useRouter } from 'next/navigation';

export default function BackButton({ href, iconOnly = false }: { href?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const handleBack = () => href ? router.push(href) : router.back();
  return (
    <button onClick={handleBack}
      className={`group inline-flex items-center gap-1.5 text-[var(--foreground)]/80 hover:text-[var(--foreground)] transition-all duration-300 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-md hover:scale-105 hover:shadow-lg hover:border-[var(--primary)]/50 ${iconOnly ? 'p-2.5' : 'px-4 py-2'}`}>
      <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
      {!iconOnly && <span>Back</span>}
    </button>
  );
}
