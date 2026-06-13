export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Make print routes readable on-screen (matching dark theme style). */
        body { background: #070a13; color: #111; }
        .print-root { padding: 24px; min-height: 100vh; display: flex; align-items: center; }
        @media print {
          body { background: #fff; }
          .print-root { padding: 0; min-height: auto; }
        }
      `}</style>
      <div className="print-root">
        <div
          style={{
            background: '#fff',
            color: '#111',
            maxWidth: '210mm',
            width: '100%',
            margin: '0 auto',
            padding: '16mm',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
            borderRadius: '12px',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
