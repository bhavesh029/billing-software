import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { PrintActions } from './print-actions';

type SellerSnap = {
  legalName: string;
  tradeName?: string | null;
  address: string;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  gstin?: string | null;
  bankAccountNumber?: string | null;
  ifsc?: string | null;
  termsTemplate?: string | null;
  signatureLabel?: string | null;
  invoicePrefix?: string | null;
};

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
  documentType: string;
  buyerName: string;
  buyerAddress: string;
  buyerStateCode: string;
  buyerStateName: string;
  placeOfSupplyStateCode: string;
  placeOfSupplyStateName: string;
  sellerSnapshot: SellerSnap;
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

function money(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return '0.00';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return '0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export default async function PrintInvoicePage({
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

  const s = invoice.sellerSnapshot;
  const title =
    invoice.documentType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply';
  const displayNo =
    invoice.invoiceNumber != null
      ? `${s.invoicePrefix ?? ''}${invoice.invoiceNumber}`
      : 'DRAFT';

  const lineRows = invoice.lineItems.map((l) => {
    const qty = Number(l.quantity);
    const unitPrice = Number(l.unitPrice);
    const taxable = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0);
    const cgst = Number(l.cgstAmount) || 0;
    const sgst = Number(l.sgstAmount) || 0;
    const igst = Number(l.igstAmount) || 0;
    const tax = cgst + sgst + igst;
    const total = Number(l.lineTotal) || taxable + tax;
    return { ...l, taxable, tax, total };
  });

  type TaxSummaryRow = {
    hsnSac: string;
    taxable: number;
    cgstRate: number;
    cgstAmt: number;
    sgstRate: number;
    sgstAmt: number;
    igstRate: number;
    igstAmt: number;
    totalTax: number;
  };

  const taxSummaryMap = new Map<string, TaxSummaryRow>();
  for (const l of lineRows) {
    const hsn = (l.hsnSac ?? '').trim() || '—';
    const gstRate = Number(l.gstRatePercent) || 0;
    const intraState = (Number(l.igstAmount) || 0) === 0;
    const cgstRate = intraState ? gstRate / 2 : 0;
    const sgstRate = intraState ? gstRate / 2 : 0;
    const igstRate = intraState ? 0 : gstRate;
    const key = `${hsn}|${cgstRate}|${sgstRate}|${igstRate}`;
    const prev = taxSummaryMap.get(key);
    const row: TaxSummaryRow = prev ?? {
      hsnSac: hsn,
      taxable: 0,
      cgstRate,
      cgstAmt: 0,
      sgstRate,
      sgstAmt: 0,
      igstRate,
      igstAmt: 0,
      totalTax: 0,
    };
    row.taxable += l.taxable;
    row.cgstAmt += Number(l.cgstAmount) || 0;
    row.sgstAmt += Number(l.sgstAmount) || 0;
    row.igstAmt += Number(l.igstAmount) || 0;
    row.totalTax += l.tax;
    taxSummaryMap.set(key, row);
  }
  const taxSummary = Array.from(taxSummaryMap.values());

  const pageStyles: Record<string, React.CSSProperties> = {
    page: {
      maxWidth: '210mm',
      margin: '0 auto',
      color: '#111',
      fontFamily: 'Arial, system-ui, sans-serif',
    },
    smallTop: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      color: '#333',
      marginBottom: '6mm',
    },
    sellerName: { fontWeight: 700, fontSize: '16px', marginTop: '2mm' },
    sellerAddr: { whiteSpace: 'pre-wrap', fontSize: '11px', marginTop: '1mm' },
    sellerMeta: { fontSize: '11px', marginTop: '1mm' },
    sectionTitle: { fontWeight: 700, fontSize: '12px', marginTop: '6mm' },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8mm',
      marginTop: '2mm',
      fontSize: '11px',
    },
    keyValTable: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    kvTdK: { width: '36%', padding: '1px 0', color: '#222' },
    kvTdV: { width: '64%', padding: '1px 0' },
    tbl: { width: '100%', borderCollapse: 'collapse', marginTop: '4mm', fontSize: '10.5px' },
    th: { border: '1px solid #000', padding: '4px 5px', background: '#fff' },
    td: { border: '1px solid #000', padding: '4px 5px', verticalAlign: 'top' },
    right: { textAlign: 'right' as const },
    totalsBox: { display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' },
    totalsInner: { width: '68mm', fontSize: '11px' },
    totalsRow: { display: 'flex', justifyContent: 'space-between' },
    strongRow: { fontWeight: 700 },
    spacer: { height: '2mm' },
  };

  return (
    <div style={pageStyles.page}>
      <div className="no-print" style={{ marginBottom: '10px' }}>
        <Link href={`/invoices/${orgId}/${id}`}>← Back to invoice</Link>
        <PrintActions />
        <p style={{ fontSize: '0.85rem', color: '#444', marginTop: '0.5rem' }}>
          Use your browser&apos;s print dialog. Choose &quot;Save as PDF&quot; as the printer to
          export a PDF.
        </p>
      </div>

      <div style={pageStyles.smallTop}>
        <div>{new Date(invoice.issueDate).toLocaleDateString('en-GB')}</div>
        <div>Billing</div>
        <div />
      </div>

      <header>
        <div style={{ fontWeight: 700, fontSize: '18px' }}>{title}</div>
        <div style={{ display: 'flex', gap: '8mm', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={pageStyles.sellerName}>{s.tradeName || s.legalName}</div>
            <div style={pageStyles.sellerAddr}>{s.address}</div>
            <div style={pageStyles.sellerMeta}>
              {s.phone ? <>Phone: {s.phone} </> : null}
              {s.email ? <>Email: {s.email}</> : null}
            </div>
          </div>
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logoUrl}
              alt=""
              width={78}
              height={78}
              style={{ objectFit: 'contain' }}
            />
          ) : null}
        </div>
      </header>

      <div style={pageStyles.grid2}>
        <section>
          <div style={pageStyles.sectionTitle}>Bill To:</div>
          <div style={{ fontWeight: 700, marginTop: '2mm' }}>{invoice.buyerName}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{invoice.buyerAddress}</div>
          <div>
            State: {invoice.buyerStateCode}-{invoice.buyerStateName}
          </div>
        </section>

        <section>
          <div style={pageStyles.sectionTitle}>Invoice Details:</div>
          <table style={pageStyles.keyValTable}>
            <tbody>
              <tr>
                <td style={pageStyles.kvTdK}>No:</td>
                <td style={pageStyles.kvTdV}>{displayNo}</td>
              </tr>
              <tr>
                <td style={pageStyles.kvTdK}>Date:</td>
                <td style={pageStyles.kvTdV}>
                  {new Date(invoice.issueDate).toLocaleDateString('en-GB')}
                </td>
              </tr>
              <tr>
                <td style={pageStyles.kvTdK}>Place of Supply:</td>
                <td style={pageStyles.kvTdV}>
                  {invoice.placeOfSupplyStateCode}-{invoice.placeOfSupplyStateName}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <table style={pageStyles.tbl}>
        <thead>
          <tr>
            <th style={pageStyles.th}>#</th>
            <th style={{ ...pageStyles.th, textAlign: 'left' }}>Item Name</th>
            <th style={pageStyles.th}>HSN/ SAC</th>
            <th style={pageStyles.th}>Quantity</th>
            <th style={pageStyles.th}>Unit</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>Unit Price/ Unit (₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>GST(₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>Amount(₹)</th>
          </tr>
        </thead>
        <tbody>
          {lineRows.map((l, idx) => {
            return (
              <tr key={l.id}>
                <td style={pageStyles.td}>{idx + 1}</td>
                <td style={pageStyles.td}>{l.description}</td>
                <td style={pageStyles.td}>{l.hsnSac ?? ''}</td>
                <td style={{ ...pageStyles.td, ...pageStyles.right }}>{num(l.quantity)}</td>
                <td style={pageStyles.td}>{l.unit}</td>
                <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(l.unitPrice)}</td>
                <td style={{ ...pageStyles.td, ...pageStyles.right }}>
                  ₹ {money(l.tax)} ({num(l.gstRatePercent)}%)
                </td>
                <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(l.total)}</td>
              </tr>
            );
          })}
          <tr>
            <td style={pageStyles.td} />
            <td style={{ ...pageStyles.td, fontWeight: 700 }} colSpan={2}>
              Total
            </td>
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              {num(
                lineRows.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0),
              )}
            </td>
            <td style={pageStyles.td} />
            <td style={pageStyles.td} />
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(invoice.totalTax)}
            </td>
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(invoice.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={pageStyles.sectionTitle}>Tax Summary:</div>
      <table style={{ ...pageStyles.tbl, marginTop: '2mm', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={pageStyles.th}>HSN/ SAC</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>Taxable Amount (₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>CGST Rate (%)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>CGST Amt (₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>SGST Rate (%)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>SGST Amt (₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>IGST Rate (%)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>IGST Amt (₹)</th>
            <th style={{ ...pageStyles.th, ...pageStyles.right }}>Total Tax (₹)</th>
          </tr>
        </thead>
        <tbody>
          {taxSummary.map((r, i) => (
            <tr key={`${r.hsnSac}-${i}`}>
              <td style={pageStyles.td}>{r.hsnSac}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(r.taxable)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>{num(r.cgstRate)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(r.cgstAmt)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>{num(r.sgstRate)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(r.sgstAmt)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>{num(r.igstRate)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(r.igstAmt)}</td>
              <td style={{ ...pageStyles.td, ...pageStyles.right }}>₹ {money(r.totalTax)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...pageStyles.td, fontWeight: 700 }}>TOTAL</td>
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(invoice.subtotal)}
            </td>
            <td style={pageStyles.td} />
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(taxSummary.reduce((a, r) => a + r.cgstAmt, 0))}
            </td>
            <td style={pageStyles.td} />
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(taxSummary.reduce((a, r) => a + r.sgstAmt, 0))}
            </td>
            <td style={pageStyles.td} />
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(taxSummary.reduce((a, r) => a + r.igstAmt, 0))}
            </td>
            <td style={{ ...pageStyles.td, ...pageStyles.right, fontWeight: 700 }}>
              ₹ {money(invoice.totalTax)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={pageStyles.totalsBox}>
        <div style={pageStyles.totalsInner}>
          <div style={pageStyles.totalsRow}>
            <div>Sub Total</div>
            <div>: ₹ {money(invoice.subtotal)}</div>
          </div>
          <div style={pageStyles.totalsRow}>
            <div>Total</div>
            <div style={pageStyles.strongRow}>: ₹ {money(invoice.grandTotal)}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '5mm', fontSize: '11px' }}>
        <div style={{ fontWeight: 700 }}>Invoice Amount In Words :</div>
        <div style={{ marginTop: '1mm' }}>{invoice.amountInWords}</div>
      </div>

      {(invoice.receivedAmount != null ||
        invoice.balance != null ||
        invoice.previousBalance != null ||
        invoice.currentBalance != null) && (
        <div style={{ marginTop: '4mm', fontSize: '11px' }}>
          {invoice.receivedAmount != null ? (
            <div>
              Received : ₹ {money(invoice.receivedAmount)}
            </div>
          ) : null}
          {invoice.balance != null ? <div>Balance : ₹ {money(invoice.balance)}</div> : null}
          {invoice.previousBalance != null ? (
            <div>Previous Balance : ₹ {money(invoice.previousBalance)}</div>
          ) : null}
          {invoice.currentBalance != null ? (
            <div>Current Balance : ₹ {money(invoice.currentBalance)}</div>
          ) : null}
        </div>
      )}

      <section style={{ marginTop: '6mm', fontSize: '11px' }}>
        <div style={{ fontWeight: 700 }}>Terms And Conditions:</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{s.termsTemplate ?? '—'}</div>
      </section>

      <section style={{ marginTop: '4mm', fontSize: '11px' }}>
        <div style={{ fontWeight: 700 }}>Bank Details:</div>
        {s.bankName ? <div>Name: {s.bankName}</div> : null}
        {s.bankAccountNumber ? <div>Account No.: {s.bankAccountNumber}</div> : null}
        {s.ifsc ? <div>IFSC code: {s.ifsc}</div> : null}
        {s.accountHolderName ? (
          <div>Account Holder&apos;s Name: {s.accountHolderName}</div>
        ) : null}
      </section>

      <footer style={{ marginTop: '10mm', fontSize: '11px' }}>
        <div>For {s.tradeName || s.legalName}:</div>
        <div style={{ height: '12mm' }} />
        <div>{s.signatureLabel ?? 'Authorized Signatory'}</div>
      </footer>
    </div>
  );
}
