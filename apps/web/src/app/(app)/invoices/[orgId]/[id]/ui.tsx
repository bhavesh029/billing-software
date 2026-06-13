'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

export function IssueAndPrint({ orgId, invoiceId }: { orgId: string; invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      await apiFetch(`/organizations/${orgId}/invoices/${invoiceId}/issue`, token, {
        method: 'POST',
      });
      router.replace(`/invoices/${orgId}/${invoiceId}/print`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={loading} onClick={() => void issue()}>
        {loading ? 'Issuing…' : 'Issue number & print'}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
