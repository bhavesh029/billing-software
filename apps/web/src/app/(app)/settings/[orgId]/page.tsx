'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

type Org = {
  id: string;
  legalName: string;
  tradeName: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  bankAccountNumber: string | null;
  ifsc: string | null;
  invoicePrefix: string;
  termsTemplate: string | null;
  signatureLabel: string | null;
  logoUrl: string | null;
};

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params['orgId'] as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState<Partial<Org>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Not signed in');
        const org = await apiFetch<Org>(`/organizations/${orgId}`, token);
        if (!cancelled) setForm(org);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function set<K extends keyof Org>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      await apiFetch(`/organizations/${orgId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          legalName: form.legalName,
          tradeName: form.tradeName || undefined,
          address: form.address,
          phone: form.phone || undefined,
          email: form.email || undefined,
          gstin: form.gstin || undefined,
          bankName: form.bankName || undefined,
          accountHolderName: form.accountHolderName || undefined,
          bankAccountNumber: form.bankAccountNumber || undefined,
          ifsc: form.ifsc || undefined,
          invoicePrefix: form.invoicePrefix,
          termsTemplate: form.termsTemplate || undefined,
          signatureLabel: form.signatureLabel || undefined,
          logoUrl: form.logoUrl || undefined,
        }),
      });
      setOk(true);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const [activeTab, setActiveTab] = useState<'identity' | 'bank' | 'branding'>('identity');

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</p>;
  if (error && !form.legalName) return <p className="error" style={{ margin: '2rem' }}>{error}</p>;

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <p className="no-print" style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard">← Dashboard</Link>
        {' · '}
        <Link href={`/clients/${orgId}`}>Clients</Link>
        {' · '}
        <Link href={`/invoices/new?orgId=${orgId}`}>New Bill</Link>
      </p>

      <div className="flex-row-between" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginTop: 0, fontSize: '2rem' }}>Organization Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Modify official details, credentials, logo and billing settings for <strong>{form.legalName}</strong>.
          </p>
        </div>
      </div>

      <div className="tab-container no-print">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'identity' ? 'active' : ''}`}
          onClick={() => setActiveTab('identity')}
        >
          Identity &amp; Contact
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank')}
        >
          Bank Details
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          Branding &amp; Terms
        </button>
      </div>

      <form className="stack" onSubmit={save}>
        {activeTab === 'identity' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>General Identity</h2>
            <div>
              <label className="label">Legal Name *</label>
              <input
                required
                value={form.legalName ?? ''}
                onChange={(e) => set('legalName', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Trade Name</label>
              <input
                value={form.tradeName ?? ''}
                onChange={(e) => set('tradeName', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Address *</label>
              <textarea
                required
                rows={3}
                value={form.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
            <div className="row">
              <div>
                <label className="label">Phone</label>
                <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
            </div>
            <div className="row">
              <div>
                <label className="label">GSTIN (encrypted at rest)</label>
                <input value={form.gstin ?? ''} onChange={(e) => set('gstin', e.target.value)} />
              </div>
              <div>
                <label className="label">Invoice Prefix</label>
                <input
                  value={form.invoicePrefix ?? ''}
                  onChange={(e) => set('invoicePrefix', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>Bank Details</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Sensitive bank fields are encrypted dynamically.
            </p>
            <div>
              <label className="label">Bank Name</label>
              <input value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} />
            </div>
            <div>
              <label className="label">Account Holder Name</label>
              <input
                value={form.accountHolderName ?? ''}
                onChange={(e) => set('accountHolderName', e.target.value)}
              />
            </div>
            <div className="row">
              <div>
                <label className="label">Account Number</label>
                <input
                  value={form.bankAccountNumber ?? ''}
                  onChange={(e) => set('bankAccountNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="label">IFSC</label>
                <input value={form.ifsc ?? ''} onChange={(e) => set('ifsc', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>Logo &amp; Declarations</h2>
            <div>
              <label className="label">Logo URL</label>
              <input value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} />
            </div>
            <div>
              <label className="label">Default Terms &amp; Templates</label>
              <textarea
                rows={4}
                value={form.termsTemplate ?? ''}
                onChange={(e) => set('termsTemplate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Signature Line Label</label>
              <input
                value={form.signatureLabel ?? ''}
                onChange={(e) => set('signatureLabel', e.target.value)}
              />
            </div>
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}
        {ok ? <p style={{ color: 'var(--success)', fontWeight: 600, animation: 'fadeIn 0.2s' }}>✓ Settings saved successfully.</p> : null}
        
        <div className="row no-print" style={{ marginTop: '1rem' }}>
          <button type="submit" disabled={saving} style={{ minWidth: 150 }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <Link href={`/clients/${orgId}`}>
            <button type="button" className="secondary">
              Go to Clients
            </button>
          </Link>
          <Link href={`/invoices/new?orgId=${orgId}`}>
            <button type="button" className="secondary">
              Create Invoice
            </button>
          </Link>
        </div>
      </form>
    </main>
  );
}
