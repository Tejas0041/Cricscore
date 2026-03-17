'use client';
import { useRouter } from 'next/navigation';

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  const handleBack = () => href ? router.push(href) : router.back();
  return (
    <button onClick={handleBack}
      className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-medium">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
