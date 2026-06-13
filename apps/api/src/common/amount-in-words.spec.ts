import Decimal from 'decimal.js';
import { amountInWordsInr, rupeesIntegerToWords } from './amount-in-words';

describe('amountInWords', () => {
  it('handles zero', () => {
    expect(rupeesIntegerToWords(0)).toBe('Zero');
  });

  it('handles sample fifty four thousand', () => {
    expect(rupeesIntegerToWords(54000)).toContain('Fifty Four');
    expect(rupeesIntegerToWords(54000)).toContain('Thousand');
  });

  it('full amount string', () => {
    expect(amountInWordsInr(new Decimal('54000'))).toMatch(/Rupees only$/);
  });
});
