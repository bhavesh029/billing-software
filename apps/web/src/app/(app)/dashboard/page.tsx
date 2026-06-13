import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

type Org = {
  id: string;
  legalName: string;
  invoicePrefix: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  let orgs: Org[] = [];
  try {
    orgs = await apiFetch<Org[]>('/organizations', session.access_token);
  } catch {
    orgs = [];
  }

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="hero-card flex-row-between">
        <div>
          <h1 style={{ marginTop: 0, fontSize: '2rem' }}>Welcome to Your Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 520, margin: '0.25rem 0 0' }}>
            Select an organization below to manage details, clients, or immediately create invoices and print bills.
          </p>
        </div>
        <Link href="/organizations/new" style={{ marginTop: '0.5rem' }}>
          <button type="button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              style={{ width: '1.1rem', height: '1.1rem' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Organization
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Your Organizations</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {orgs.length} total
        </span>
      </div>

      {orgs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            No organizations found. Create your first one to start invoicing.
          </p>
          <Link href="/organizations/new">
            <button type="button">Create Organization</button>
          </Link>
        </div>
      ) : (
        <div className="grid-3col" style={{ gap: '1.5rem' }}>
          {orgs.map((o) => {
            const initials = o.legalName ? o.legalName.substring(0, 2) : 'OR';
            return (
              <div key={o.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220 }}>
                <div>
                  <div className="avatar-initials">{initials}</div>
                  <strong style={{ fontSize: '1.15rem', display: 'block', marginBottom: '0.25rem', color: '#fff' }}>
                    {o.legalName}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.5rem' }}>
                    Invoice Prefix: {o.invoicePrefix ? <code>{o.invoicePrefix}</code> : 'None'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link href={`/settings/${o.id}`} style={{ flex: '1 1 auto' }}>
                    <button type="button" className="secondary" style={{ width: '100%', padding: '0.5rem', minHeight: '36px', fontSize: '0.85rem' }}>
                      Settings
                    </button>
                  </Link>
                  <Link href={`/clients/${o.id}`} style={{ flex: '1 1 auto' }}>
                    <button type="button" className="secondary" style={{ width: '100%', padding: '0.5rem', minHeight: '36px', fontSize: '0.85rem' }}>
                      Clients
                    </button>
                  </Link>
                  <Link href={`/invoices/new?orgId=${o.id}`} style={{ width: '100%' }}>
                    <button type="button" style={{ width: '100%', padding: '0.5rem', minHeight: '38px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      New Invoice
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
