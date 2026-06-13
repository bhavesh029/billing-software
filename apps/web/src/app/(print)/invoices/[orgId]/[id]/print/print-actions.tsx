'use client';

export function PrintActions() {
  return (
    <button type="button" style={{ marginLeft: '0.75rem' }} onClick={() => window.print()}>
      Print bill
    </button>
  );
}
