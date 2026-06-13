import Decimal from 'decimal.js';

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ` ${ones[o]}` : '');
}

function threeDigitsToWords(n: number): string {
  let s = '';
  if (n >= 100) {
    s += `${ones[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) s += ' ';
  }
  if (n) s += twoDigitsToWords(n);
  return s.trim();
}

/** Converts non-negative integer rupees to words (Indian system). */
export function rupeesIntegerToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInWordsInr(amount: Decimal): string {
  const paise = amount.mod(1).mul(100).floor().toNumber();
  const rupees = amount.floor().toNumber();
  let w = `${rupeesIntegerToWords(rupees)} Rupees`;
  if (paise > 0) {
    w += ` and ${rupeesIntegerToWords(paise)} Paise`;
  }
  return `${w} only`;
}
