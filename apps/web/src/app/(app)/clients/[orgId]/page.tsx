'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

type Party = {
  id: string;
  name: string;
  address: string;
  stateCode: string;
  stateName: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

const emptyForm = () => ({
  name: '',
  address: '',
  stateCode: '08',
  stateName: 'Rajasthan',
  gstin: '',
  phone: '',
  email: '',
  notes: '',
});

export default function ClientsPage() {
  const params = useParams();
  const orgId = params['orgId'] as string;
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const list = await apiFetch<Party[]>(`/organizations/${orgId}/parties`, token);
      setParties(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      await apiFetch(`/organizations/${orgId}/parties`, token, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          stateCode: form.stateCode,
          stateName: form.stateName,
          gstin: form.gstin || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          notes: form.notes || undefined,
        }),
      });
      setForm(emptyForm());
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add client');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this client?')) return;
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      await apiFetch(`/organizations/${orgId}/parties/${id}`, token, { method: 'DELETE' });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <p className="no-print" style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard">← Dashboard</Link>
        {' · '}
        <Link href={`/settings/${orgId}`}>Settings</Link>
        {' · '}
        <Link href={`/invoices/new?orgId=${orgId}`}>New Bill</Link>
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginTop: 0, fontSize: '2rem' }}>Client Database</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Manage your clients and customers. Selected buyers automatically populate your invoices.
        </p>
      </div>

      {error ? <p className="error" style={{ marginBottom: '1.5rem' }}>{error}</p> : null}

      <div className="grid-2col">
        {/* Left Column: Clients List & Search */}
        <div className="stack">
          <div className="card stack" style={{ padding: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Your Clients</h2>
            <div className="search-wrapper">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="search-icon"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.608 10.608Z" />
              </svg>
              <input
                className="search-input"
                type="text"
                placeholder="Search clients by name, email, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading clients...</p>
          ) : filteredParties.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                {parties.length === 0
                  ? 'No clients added yet. Fill in the form on the right to add one.'
                  : 'No clients match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="stack">
              {filteredParties.map((p) => {
                const initials = p.name ? p.name.substring(0, 2) : 'CL';
                return (
                  <div key={p.id} className="card stack" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          textTransform: 'uppercase',
                          color: 'var(--accent)'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{p.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            State: {p.stateCode} — {p.stateName}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="danger-btn"
                        style={{ minHeight: '32px', padding: '0 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => void remove(p.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', width: '70px', flexShrink: 0 }}>Address:</span>
                        <span style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{p.address}</span>
                      </div>
                      {p.gstin && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', width: '70px', flexShrink: 0 }}>GSTIN:</span>
                          <span className="badge badge-issued" style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>{p.gstin}</span>
                        </div>
                      )}
                      {(p.phone || p.email) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.25rem' }}>
                          {p.phone && (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>📞</span>
                              <span>{p.phone}</span>
                            </div>
                          )}
                          {p.email && (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>✉️</span>
                              <a href={`mailto:${p.email}`} style={{ fontSize: '0.9rem' }}>{p.email}</a>
                            </div>
                          )}
                        </div>
                      )}
                      {p.notes && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <strong>Notes:</strong> {p.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Add Client Form */}
        <div style={{ position: 'sticky', top: '1.5rem', height: 'fit-content' }}>
          <div className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)' }}>Add New Client</h2>
            <form className="stack" onSubmit={addClient}>
              <div>
                <label className="label">Client Name *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. John Doe & Co." />
              </div>
              <div>
                <label className="label">Billing Address *</label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Official registered address"
                />
              </div>
              <div className="row" style={{ gap: '0.75rem' }}>
                <div>
                  <label className="label">State Code</label>
                  <input value={form.stateCode} onChange={(e) => set('stateCode', e.target.value)} placeholder="e.g. 08" />
                </div>
                <div>
                  <label className="label">State Name</label>
                  <input value={form.stateName} onChange={(e) => set('stateName', e.target.value)} placeholder="e.g. Rajasthan" />
                </div>
              </div>
              <div className="row" style={{ gap: '0.75rem' }}>
                <div>
                  <label className="label">GSTIN (optional)</label>
                  <input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="15-digit GSTIN" />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone number" />
                </div>
              </div>
              <div>
                <label className="label">Email Address (optional)</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="e.g. client@company.com" />
              </div>
              <div>
                <label className="label">Additional Notes (optional)</label>
                <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Internal notes or special terms..." />
              </div>
              <button type="submit" disabled={saving} style={{ width: '100%', marginTop: '0.5rem' }}>
                {saving ? 'Saving…' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
