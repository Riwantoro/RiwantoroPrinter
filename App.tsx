import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type QueueState = {
  date: string;
  lastNumber: number;
};

type Ticket = {
  number: string;
  issuedAt: Date;
  barcode: string;
};

const QUEUE_KEY = 'queue-state-v1';
const SCAN_GAP_MS = 120;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDisplayTime = (date: Date) =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const loadQueueState = (): QueueState => {
  const today = formatDateKey(new Date());
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return { date: today, lastNumber: 0 };
  }
  try {
    const parsed = JSON.parse(raw) as QueueState;
    if (parsed.date !== today) {
      return { date: today, lastNumber: 0 };
    }
    return parsed;
  } catch (error) {
    console.error('Gagal membaca state antrian', error);
    return { date: today, lastNumber: 0 };
  }
};

const saveQueueState = (state: QueueState) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(state));
};

const App: React.FC = () => {
  const [queueState, setQueueState] = useState<QueueState>(() => loadQueueState());
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [lastScan, setLastScan] = useState('');
  const [autoPrint, setAutoPrint] = useState(true);
  const [manualCode, setManualCode] = useState('');

  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef(0);

  const queueNumberPreview = useMemo(() => {
    const next = queueState.lastNumber + 1;
    return String(next).padStart(3, '0');
  }, [queueState.lastNumber]);

  useEffect(() => {
    saveQueueState(queueState);
  }, [queueState]);

  const triggerPrint = () => {
    // Ensure state has rendered before printing.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  const issueTicket = useCallback(
    (barcode: string) => {
      const now = new Date();
      const nextNumber = queueState.lastNumber + 1;
      const padded = String(nextNumber).padStart(3, '0');
      const nextState = { date: formatDateKey(now), lastNumber: nextNumber };
      setQueueState(nextState);
      setTicket({ number: padded, issuedAt: now, barcode });
      setLastScan(barcode);

      if (autoPrint) {
        triggerPrint();
      }
    },
    [autoPrint, queueState.lastNumber]
  );

  const finalizeScan = useCallback(() => {
    const code = scanBufferRef.current.trim();
    scanBufferRef.current = '';
    if (!code) return;
    issueTicket(code);
  }, [issueTicket]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' || event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastScanTimeRef.current;
      lastScanTimeRef.current = now;

      if (elapsed > SCAN_GAP_MS) {
        scanBufferRef.current = '';
      }

      if (event.key === 'Enter') {
        finalizeScan();
        return;
      }

      if (event.key.length === 1) {
        scanBufferRef.current += event.key;
      }

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = window.setTimeout(() => {
        finalizeScan();
      }, SCAN_GAP_MS + 20);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finalizeScan]);

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    issueTicket(trimmed);
    setManualCode('');
  };

  const handleResetQueue = () => {
    const today = formatDateKey(new Date());
    const nextState = { date: today, lastNumber: 0 };
    setQueueState(nextState);
    setTicket(null);
  };

  const nowLabel = ticket ? `${formatDisplayDate(ticket.issuedAt)} ${formatDisplayTime(ticket.issuedAt)}` : '-';

  return (
    <div className="app">
      <style>{`
        :root {
          color-scheme: light;
          --bg: #f5f3ef;
          --ink: #151515;
          --muted: #6b6b6b;
          --accent: #004bd6;
          --soft: #ffffff;
        }

        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background: var(--bg); color: var(--ink); }
        .app { min-height: 100vh; display: flex; flex-direction: column; }
        header { padding: 28px 24px 16px; }
        header h1 { margin: 0; font-size: 28px; letter-spacing: 0.4px; }
        header p { margin: 6px 0 0; color: var(--muted); }

        main { flex: 1; padding: 0 24px 32px; display: grid; gap: 20px; grid-template-columns: 1.1fr 0.9fr; }
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr; }
        }

        .card { background: var(--soft); border-radius: 18px; padding: 20px; box-shadow: 0 12px 28px rgba(0,0,0,0.08); }
        .card h2 { margin: 0 0 12px; font-size: 18px; }
        .status { display: grid; gap: 10px; }
        .status-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
        .badge { padding: 6px 10px; background: #e6ecff; color: #1339a8; border-radius: 999px; font-weight: 600; }
        .queue { font-size: 48px; font-weight: 700; letter-spacing: 2px; }
        .muted { color: var(--muted); font-size: 13px; }

        .controls { display: grid; gap: 12px; }
        .input { display: grid; gap: 6px; }
        input[type="text"] { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #d7d7d7; font-size: 14px; }
        button { border: none; border-radius: 10px; padding: 10px 14px; background: var(--accent); color: white; font-weight: 600; cursor: pointer; }
        button.secondary { background: #e9e9e9; color: #1c1c1c; }
        button.outline { background: transparent; border: 1px solid #d7d7d7; color: #1c1c1c; }
        .toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; }

        .print-preview { display: grid; place-items: center; min-height: 300px; border: 1px dashed #c7c7c7; border-radius: 16px; padding: 16px; }

        .ticket {
          width: 100%; max-width: 420px; background: white; border: 1px solid #111; padding: 24px; text-align: center;
        }
        .ticket h3 { margin: 0 0 6px; font-size: 18px; letter-spacing: 1px; }
        .ticket .number { font-size: 64px; font-weight: 700; margin: 12px 0; }
        .ticket .meta { font-size: 14px; }

        @media print {
          body { background: white; }
          header, .controls-card, .help-card { display: none !important; }
          main { grid-template-columns: 1fr; padding: 0; }
          .print-card { box-shadow: none; border-radius: 0; }
          .print-preview { border: none; min-height: auto; }
          .ticket { border: 1px solid #111; width: 100%; max-width: none; }
        }

        @page { size: A4; margin: 14mm; }
      `}</style>

      <header>
        <h1>Queue Printer</h1>
        <p>Scan barcode untuk cetak nomor antrian otomatis (format 001) dengan tanggal dan jam.</p>
      </header>

      <main>
        <section className="card controls-card">
          <h2>Status</h2>
          <div className="status">
            <div className="status-row">
              <span>Nomor berikutnya</span>
              <span className="queue">{queueNumberPreview}</span>
            </div>
            <div className="status-row">
              <span>Scan terakhir</span>
              <span className="badge">{lastScan || '-'}</span>
            </div>
            <div className="status-row">
              <span>Waktu cetak</span>
              <span>{nowLabel}</span>
            </div>
          </div>

          <div className="controls" style={{ marginTop: 18 }}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(event) => setAutoPrint(event.target.checked)}
              />
              Auto print setelah scan
            </label>

            <div className="input">
              <span className="muted">Tes manual (ketik barcode lalu Enter)</span>
              <input
                type="text"
                value={manualCode}
                placeholder="Contoh: 1234567890"
                onChange={(event) => setManualCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleManualSubmit();
                }}
              />
            </div>

            <button type="button" onClick={handleManualSubmit}>Print Manual</button>
            <button type="button" className="outline" onClick={() => ticket && triggerPrint()}>Print Ulang</button>
            <button type="button" className="secondary" onClick={handleResetQueue}>Reset Nomor Hari Ini</button>
          </div>
        </section>

        <section className="card print-card">
          <h2>Preview Cetak</h2>
          <div className="print-preview">
            <div className="ticket">
              <h3>NOMOR ANTRIAN</h3>
              <div className="number">{ticket?.number ?? queueNumberPreview}</div>
              <div className="meta">Tanggal: {ticket ? formatDisplayDate(ticket.issuedAt) : formatDisplayDate(new Date())}</div>
              <div className="meta">Jam: {ticket ? formatDisplayTime(ticket.issuedAt) : formatDisplayTime(new Date())}</div>
              <div className="meta">Barcode: {ticket?.barcode || '-'}</div>
            </div>
          </div>
        </section>

        <section className="card help-card">
          <h2>Catatan</h2>
          <p className="muted">
            Scanner barcode USB biasanya terbaca seperti keyboard dan mengirim Enter di akhir input.
            Jika ingin print tanpa dialog (langsung keluar kertas), jalankan Chrome/Edge dengan opsi kiosk printing.
          </p>
          <p className="muted">
            Nomor antrian akan reset otomatis setiap pergantian tanggal lokal.
          </p>
        </section>
      </main>
    </div>
  );
};

export default App;
