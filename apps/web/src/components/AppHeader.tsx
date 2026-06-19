'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AppHeader() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="nav no-print">
      <Link href="/dashboard" className="nav-logo">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          style={{ width: '1.5rem', height: '1.5rem' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 12a.75.75 0 0 1 .75.75v2.25H21a.75.75 0 0 1 0 1.5h-3v3A.75.75 0 0 1 17 19.5h-2.25a.75.75 0 0 1 0-1.5H17v-3.75A.75.75 0 0 1 17.25 12Z"
          />
        </svg>
        <span>Billing Soft</span>
      </Link>
      <div className="nav-links">
        <Link href="/dashboard" className="nav-item">
          Dashboard
        </Link>
        <button
          type="button"
          className="secondary"
          style={{ minHeight: '36px', padding: '0 0.85rem', fontSize: '0.85rem' }}
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
