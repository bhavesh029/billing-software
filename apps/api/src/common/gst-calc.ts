import Decimal from 'decimal.js';

export type TaxSplit = {
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  lineTotal: Decimal;
};

/** Intra-state if org and buyer state codes match (2-digit). */
export function isIntraState(
  orgStateCode: string | null,
  buyerStateCode: string,
): boolean {
  if (!orgStateCode || orgStateCode.length < 2) return true;
  const o = orgStateCode.slice(0, 2).padStart(2, '0');
  const b = buyerStateCode.slice(0, 2).padStart(2, '0');
  return o === b;
}

export function computeLineTax(
  quantity: Decimal,
  unitPrice: Decimal,
  gstRatePercent: Decimal,
  intraState: boolean,
): TaxSplit {
  const taxable = quantity.mul(unitPrice);
  const rate = gstRatePercent.div(100);
  const tax = taxable.mul(rate);
  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);
  if (tax.gt(0)) {
    if (intraState) {
      const half = tax.div(2);
      cgst = half;
      sgst = half;
    } else {
      igst = tax;
    }
  }
  const lineTotal = taxable.add(tax);
  return { cgst, sgst, igst, lineTotal };
}
