'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

type Line = {
  description: string;
  hsnSac: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  gstRatePercent: string;
};

const emptyLine = (): Line => ({
  description: '',
  hsnSac: '',
  quantity: '1',
  unit: 'Kg',
  unitPrice: '0',
  gstRatePercent: '0',
});

type Party = {
  id: string;
  name: string;
  address: string;
  stateCode: string;
  stateName: string;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const search = useSearchParams();
  const orgId = search.get('orgId') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('08');
  const [buyerStateName, setBuyerStateName] = useState('Rajasthan');
  const [placeCode, setPlaceCode] = useState('08');
  const [placeName, setPlaceName] = useState('Rajasthan');
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [received, setReceived] = useState('');
  const [balance, setBalance] = useState('');
  const [prevBal, setPrevBal] = useState('');
  const [currBal, setCurrBal] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState('');

  const canSubmit = useMemo(() => orgId && buyerName && lines.some((l) => l.description), [
    orgId,
    buyerName,
    lines,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orgId) return;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const list = await apiFetch<Party[]>(`/organizations/${orgId}/parties`, token);
        if (!cancelled) setParties(list);
      } catch {
        if (!cancelled) setParties([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function submit(issue: boolean) {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      if (!orgId) throw new Error('Missing organization');
      const payload = {
        issueDate: new Date(issueDate).toISOString(),
        partyId: partyId || undefined,
        buyerName,
        buyerAddress,
        buyerStateCode,
        buyerStateName,
        placeOfSupplyStateCode: placeCode,
        placeOfSupplyStateName: placeName,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l) => ({
            description: l.description,
            hsnSac: l.hsnSac || undefined,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            gstRatePercent: l.gstRatePercent,
          })),
        receivedAmount: received || undefined,
        balance: balance || undefined,
        previousBalance: prevBal || undefined,
        currentBalance: currBal || undefined,
      };
      const inv = await apiFetch<{ id: string }>(
        `/organizations/${orgId}/invoices`,
        token,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      if (issue) {
        await apiFetch(`/organizations/${orgId}/invoices/${inv.id}/issue`, token, {
          method: 'POST',
        });
        router.replace(`/invoices/${orgId}/${inv.id}/print`);
      } else {
        router.replace(`/invoices/${orgId}/${inv.id}`);
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (!orgId) {
    return (
      <main>
        <p className="error">Missing orgId. Open this page from the dashboard.</p>
        <Link href="/dashboard">Dashboard</Link>
      </main>
    );
  }

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <p className="no-print" style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard">← Dashboard</Link>
      </p>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginTop: 0, fontSize: '2rem' }}>Create Invoice</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
          Generate a new bill. Enter details, add items, and either save as draft or issue immediately.
        </p>
      </div>

      <div className="grid-2col" style={{ alignItems: 'start', marginBottom: '1.5rem' }}>
        {/* Left Column: Buyer details */}
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.20rem', color: 'var(--accent)' }}>Buyer / Client Info</h2>
          
          <div>
            <label className="label">Select client (optional)</label>
            <select
              value={partyId}
              onChange={(e) => {
                const id = e.target.value;
                setPartyId(id);
                if (!id) return;
                const p = parties.find((x) => x.id === id);
                if (!p) return;
                setBuyerName(p.name);
                setBuyerAddress(p.address);
                setBuyerStateCode(p.stateCode);
                setBuyerStateName(p.stateName);
                setPlaceCode(p.stateCode);
                setPlaceName(p.stateName);
              }}
            >
              <option value="">— Manual entry —</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
              Manage contacts in{' '}
              <Link href={`/clients/${orgId}`}>Clients database</Link>.
            </p>
          </div>

          <div style={{ height: '1px', background: 'var(--border)' }}></div>

          <div>
            <label className="label">Buyer Name *</label>
            <input
              value={buyerName}
              onChange={(e) => {
                setPartyId('');
                setBuyerName(e.target.value);
              }}
              placeholder="Legal/Official name of the client"
              required
            />
          </div>
          <div>
            <label className="label">Billing Address *</label>
            <textarea
              rows={3}
              value={buyerAddress}
              onChange={(e) => {
                setPartyId('');
                setBuyerAddress(e.target.value);
              }}
              placeholder="Registered billing address"
              required
            />
          </div>
          <div className="row" style={{ gap: '0.75rem' }}>
            <div>
              <label className="label">State code</label>
              <input
                value={buyerStateCode}
                onChange={(e) => {
                  setPartyId('');
                  setBuyerStateCode(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="label">State name</label>
              <input
                value={buyerStateName}
                onChange={(e) => {
                  setPartyId('');
                  setBuyerStateName(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Details & Balances */}
        <div className="stack">
          <div className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.20rem', color: 'var(--accent)' }}>Invoice Configuration</h2>
            <div>
              <label className="label">Issue date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="row" style={{ gap: '0.75rem' }}>
              <div>
                <label className="label">Place of supply code</label>
                <input value={placeCode} onChange={(e) => setPlaceCode(e.target.value)} />
              </div>
              <div>
                <label className="label">Place of supply name</label>
                <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card stack">
            <h2 style={{ margin: 0, fontSize: '1.20rem', color: 'var(--accent)' }}>Balances (optional)</h2>
            <div className="row" style={{ gap: '0.75rem' }}>
              <div>
                <label className="label">Received amount (₹)</label>
                <input value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Remaining Balance (₹)</label>
                <input value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="row" style={{ gap: '0.75rem' }}>
              <div>
                <label className="label">Previous balance (₹)</label>
                <input value={prevBal} onChange={(e) => setPrevBal(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Current balance (₹)</label>
                <input value={currBal} onChange={(e) => setCurrBal(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table Section */}
      <div className="card stack" style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
        <div className="flex-row-between">
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--accent)' }}>Line Items</h2>
          <button
            type="button"
            className="secondary"
            style={{ minHeight: '36px', padding: '0 1rem', fontSize: '0.85rem' }}
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
          >
            + Add Row
          </button>
        </div>

        <div className="table-container">
          <table className="table-custom" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description *</th>
                <th style={{ width: '12%' }}>HSN/SAC</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '10%' }}>Unit</th>
                <th style={{ width: '15%' }}>Price/Unit (₹)</th>
                <th style={{ width: '13%' }}>GST %</th>
                <th style={{ width: '5%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      required
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      placeholder="e.g. Software Development Services"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.hsnSac}
                      onChange={(e) => updateLine(i, { hsnSac: e.target.value })}
                      placeholder="e.g. 9983"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.unit}
                      onChange={(e) => updateLine(i, { unit: e.target.value })}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      style={{ minHeight: '36px', padding: '0.5rem' }}
                      value={line.gstRatePercent}
                      onChange={(e) => updateLine(i, { gstRatePercent: e.target.value })}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="danger-btn"
                      style={{
                        minHeight: '34px',
                        width: '34px',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      disabled={lines.length <= 1}
                      onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        style={{ width: '1.1rem', height: '1.1rem' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="error" style={{ marginBottom: '1.5rem' }}>{error}</p> : null}

      <div className="row no-print" style={{ gap: '1rem' }}>
        <button
          type="button"
          disabled={loading || !canSubmit}
          onClick={() => void submit(false)}
          style={{ minWidth: 150 }}
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={loading || !canSubmit}
          onClick={() => void submit(true)}
          style={{ minWidth: 180 }}
        >
          Issue &amp; Print
        </button>
      </div>
    </main>
  );
}
