import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { IssueAndPrint } from './ui';

type Line = {
  id: string;
  description: string;
  hsnSac: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  gstRatePercent: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  lineTotal: string;
};

type Invoice = {
  id: string;
  status: string;
  invoiceNumber: number | null;
  issueDate: string;
  buyerName: string;
  buyerAddress: string;
  buyerStateCode: string;
  buyerStateName: string;
  placeOfSupplyStateCode: string;
  placeOfSupplyStateName: string;
  subtotal: string;
  totalTax: string;
  grandTotal: string;
  amountInWords: string;
  receivedAmount: string | null;
  balance: string | null;
  previousBalance: string | null;
  currentBalance: string | null;
  lineItems: Line[];
};

function dec(v: { toString(): string } | string | number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return typeof v === 'object' && v !== null && 'toString' in v ? v.toString() : String(v);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  let invoice: Invoice;
  try {
    invoice = await apiFetch<Invoice>(
      `/organizations/${orgId}/invoices/${id}`,
      session.access_token,
    );
  } catch {
    return <p>Invoice not found.</p>;
  }

  const isDraft = invoice.status === 'DRAFT';
  const displayNo = invoice.invoiceNumber != null ? `No. ${invoice.invoiceNumber}` : 'Draft Invoice';

  return (
    <main style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <p className="no-print" style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard">← Dashboard</Link>
      </p>

      <div className="flex-row-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginTop: 0, fontSize: '2rem' }}>{displayNo}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Issued Date: <strong>{new Date(invoice.issueDate).toLocaleDateString()}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`badge ${isDraft ? 'badge-draft' : 'badge-issued'}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="grid-2col" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Buyer Section */}
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--accent)' }}>Buyer Details</h2>
          <div className="kv-grid">
            <div className="kv-key">Name:</div>
            <div className="kv-val">{invoice.buyerName}</div>
            
            <div className="kv-key">Address:</div>
            <div className="kv-val" style={{ whiteSpace: 'pre-wrap' }}>{invoice.buyerAddress}</div>
            
            <div className="kv-key">State:</div>
            <div className="kv-val">{invoice.buyerStateCode} — {invoice.buyerStateName}</div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--accent)' }}>Delivery &amp; Supply</h2>
          <div className="kv-grid">
            <div className="kv-key">Place of Supply:</div>
            <div className="kv-val">{invoice.placeOfSupplyStateCode} — {invoice.placeOfSupplyStateName}</div>
            
            <div className="kv-key">Status:</div>
            <div className="kv-val" style={{ textTransform: 'capitalize' }}>{invoice.status.toLowerCase()}</div>

            <div className="kv-key">Document Type:</div>
            <div className="kv-val">Invoicing standard</div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="card stack" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <h2 style={{ margin: '0.5rem 0.5rem 0', fontSize: '1.15rem' }}>Billable Items</h2>
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: '6%', textAlign: 'center' }}>#</th>
                <th>Description</th>
                <th style={{ width: '15%' }}>HSN/SAC</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Qty</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Rate</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((l, idx) => (
                <tr key={l.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{l.description}</td>
                  <td><code>{l.hsnSac ?? '—'}</code></td>
                  <td style={{ textAlign: 'right' }}>
                    {dec(l.quantity)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.unit}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>₹{dec(l.unitPrice)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>₹{dec(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary totals block */}
      <div className="grid-2col" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Amount in Words / Balances */}
        <div className="card stack">
          <div>
            <span className="label">Total Amount in Words</span>
            <div style={{ fontStyle: 'italic', fontSize: '1rem', color: 'var(--text)' }}>
              {invoice.amountInWords}
            </div>
          </div>

          {(invoice.receivedAmount != null ||
            invoice.balance != null ||
            invoice.previousBalance != null ||
            invoice.currentBalance != null) && (
            <div className="stack" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>Payment Ledgers</h3>
              <div className="kv-grid" style={{ marginTop: '0.25rem' }}>
                {invoice.receivedAmount != null && (
                  <>
                    <div className="kv-key">Received:</div>
                    <div className="kv-val" style={{ color: 'var(--success)' }}>₹{dec(invoice.receivedAmount)}</div>
                  </>
                )}
                {invoice.balance != null && (
                  <>
                    <div className="kv-key">Balance:</div>
                    <div className="kv-val" style={{ color: 'var(--danger)' }}>₹{dec(invoice.balance)}</div>
                  </>
                )}
                {invoice.previousBalance != null && (
                  <>
                    <div className="kv-key">Prev Balance:</div>
                    <div className="kv-val">₹{dec(invoice.previousBalance)}</div>
                  </>
                )}
                {invoice.currentBalance != null && (
                  <>
                    <div className="kv-key">Curr Balance:</div>
                    <div className="kv-val">₹{dec(invoice.currentBalance)}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Final Totals Table */}
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--accent)' }}>Invoice Totals</h2>
          <div className="kv-grid" style={{ rowGap: '0.75rem' }}>
            <div className="kv-key" style={{ fontSize: '1rem' }}>Subtotal:</div>
            <div className="kv-val" style={{ fontSize: '1rem', textAlign: 'right' }}>₹{dec(invoice.subtotal)}</div>
            
            <div className="kv-key" style={{ fontSize: '1rem' }}>Calculated GST:</div>
            <div className="kv-val" style={{ fontSize: '1rem', textAlign: 'right' }}>₹{dec(invoice.totalTax)}</div>
            
            <div style={{ gridColumn: 'span 2', height: '1px', background: 'var(--border)' }}></div>

            <div className="kv-key" style={{ fontSize: '1.2rem', color: '#fff' }}>Grand Total:</div>
            <div className="kv-val" style={{ fontSize: '1.25rem', color: 'var(--accent)', textAlign: 'right' }}>₹{dec(invoice.grandTotal)}</div>
          </div>
        </div>
      </div>

      <div className="row no-print" style={{ gap: '1rem' }}>
        <Link href={`/invoices/${orgId}/${id}/print`}>
          <button type="button" style={{ minWidth: 150 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              style={{ width: '1.1rem', height: '1.1rem' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21h10.56v-7.179m-12 0a1.5 1.5 0 0 1-1.5-1.5V6.75A1.5 1.5 0 0 1 5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v5.579a1.5 1.5 0 0 1-1.5 1.5M6.72 13.821h10.56M12 10.5h.008v.008H12V10.5Zm-.008 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Z" />
            </svg>
            Print Preview
          </button>
        </Link>
        {isDraft ? (
          <IssueAndPrint orgId={orgId} invoiceId={id} />
        ) : null}
      </div>
    </main>
  );
}
