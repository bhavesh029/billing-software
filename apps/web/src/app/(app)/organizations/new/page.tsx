'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    bankName: '',
    accountHolderName: '',
    bankAccountNumber: '',
    ifsc: '',
    invoicePrefix: '',
    termsTemplate: 'Thank you for doing business with us.',
    signatureLabel: 'Authorized Signatory',
    logoUrl: '',
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const org = await apiFetch<{ id: string }>('/organizations', token, {
        method: 'POST',
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
          invoicePrefix: form.invoicePrefix || undefined,
          termsTemplate: form.termsTemplate || undefined,
          signatureLabel: form.signatureLabel || undefined,
          logoUrl: form.logoUrl || undefined,
        }),
      });
      router.replace(`/settings/${org.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  const [activeTab, setActiveTab] = useState<'identity' | 'bank' | 'branding'>('identity');

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </p>
      <h1 style={{ marginTop: 0, fontSize: '2rem' }}>New Organization</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Set up a new firm. You can fill bank details and logos now or update them later in Settings.
      </p>

      <div className="tab-container">
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

      <form className="stack" onSubmit={submit}>
        {activeTab === 'identity' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>General Details</h2>
            <div>
              <label className="label">Legal Name *</label>
              <input
                required
                value={form.legalName}
                onChange={(e) => set('legalName', e.target.value)}
                placeholder="e.g. Acme Corporation Pvt Ltd"
              />
            </div>
            <div>
              <label className="label">Trade Name (optional)</label>
              <input
                value={form.tradeName}
                onChange={(e) => set('tradeName', e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="label">Address *</label>
              <textarea
                required
                rows={3}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Full official address"
              />
            </div>
            <div className="row">
              <div>
                <label className="label">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="e.g. billing@acme.com"
                />
              </div>
            </div>
            <div className="row">
              <div>
                <label className="label">GSTIN (stored encrypted)</label>
                <input
                  value={form.gstin}
                  onChange={(e) => set('gstin', e.target.value)}
                  placeholder="e.g. 08AAAAA1111A1Z1"
                />
              </div>
              <div>
                <label className="label">Invoice Prefix (optional)</label>
                <input
                  value={form.invoicePrefix}
                  onChange={(e) => set('invoicePrefix', e.target.value)}
                  placeholder="e.g. ACME-"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>Bank Configuration</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              These bank details are encrypted at rest before storing and are shown on your issued PDFs.
            </p>
            <div>
              <label className="label">Bank Name</label>
              <input
                value={form.bankName}
                onChange={(e) => set('bankName', e.target.value)}
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div>
              <label className="label">Account Holder Name</label>
              <input
                value={form.accountHolderName}
                onChange={(e) => set('accountHolderName', e.target.value)}
                placeholder="Name exactly as in passbook"
              />
            </div>
            <div className="row">
              <div>
                <label className="label">Account Number (encrypted)</label>
                <input
                  value={form.bankAccountNumber}
                  onChange={(e) => set('bankAccountNumber', e.target.value)}
                  placeholder="Enter Account Number"
                />
              </div>
              <div>
                <label className="label">IFSC (encrypted)</label>
                <input
                  value={form.ifsc}
                  onChange={(e) => set('ifsc', e.target.value)}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="card stack" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>Branding &amp; Prints</h2>
            <div>
              <label className="label">Logo URL</label>
              <input
                value={form.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
                placeholder="URL of organization logo (HTTPS/signed storage URL)"
              />
            </div>
            <div>
              <label className="label">Default Terms and Conditions</label>
              <textarea
                rows={4}
                value={form.termsTemplate}
                onChange={(e) => set('termsTemplate', e.target.value)}
                placeholder="Write invoice disclaimer, terms, or conditions..."
              />
            </div>
            <div>
              <label className="label">Signature Label</label>
              <input
                value={form.signatureLabel}
                onChange={(e) => set('signatureLabel', e.target.value)}
                placeholder="e.g. Authorized Signatory"
              />
            </div>
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={loading} style={{ minWidth: 160 }}>
            {loading ? 'Creating…' : 'Create Organization'}
          </button>
          <Link href="/dashboard">
            <button type="button" className="secondary">Cancel</button>
          </Link>
        </div>
      </form>
    </main>
  );
}
