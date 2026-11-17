"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  ScanLine,
  XCircle,
} from "lucide-react";

import { checkInTicket, ScanResponse } from "@/services/ticket";

type Html5QrcodeInstance = import("html5-qrcode").Html5Qrcode;

const SCANNER_ELEMENT_ID = "ventro-ticket-reader";

const RESULT_META = {
  valid: {
    label: "VALID",
    title: "Tiket berhasil digunakan",
  },
  used: {
    label: "ALREADY USED",
    title: "Tiket sudah pernah digunakan",
  },
  cancelled: {
    label: "CANCELLED",
    title: "Tiket sudah dibatalkan",
  },
  unpaid: {
    label: "UNPAID",
    title: "Pesanan belum dibayar",
  },
  invalid: {
    label: "INVALID",
    title: "Tiket tidak valid",
  },
  error: {
    label: "ERROR",
    title: "Gagal memvalidasi tiket",
  },
} as const;

type ResultKind = keyof typeof RESULT_META;

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const cameraErrorMessage = (err: any) => {
  const name = String(err?.name || "");
  const message = String(err?.message || "");

  if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
    return "Izin kamera ditolak. Aktifkan izin kamera pada browser lalu coba lagi.";
  }

  if (name === "NotFoundError" || /no camera|not found/i.test(message)) {
    return "Kamera tidak ditemukan pada perangkat ini.";
  }

  if (name === "NotReadableError" || /in use|could not start/i.test(message)) {
    return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  }

  if (/secure context|https|localhost/i.test(message)) {
    return "Kamera memerlukan HTTPS atau localhost. Buka halaman ini melalui alamat yang aman.";
  }

  return message || "Gagal mengakses kamera. Periksa perangkat lalu coba lagi.";
};

export default function ScanTicketPage() {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const processingRef = useRef(false);
  const startingRef = useRef(false);
  const lastScanRef = useRef({ code: "", at: 0 });

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [lastCode, setLastCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    setScanning(false);
    setPaused(false);

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Scanner mungkin belum berjalan; abaikan.
    }

    try {
      scanner.clear();
    } catch {
      // Elemen mungkin sudah dilepas React; abaikan.
    }
  }, []);

  const handleDecoded = useCallback(async (decodedText: string) => {
    const code = decodedText.trim().toUpperCase();

    if (!code || processingRef.current) return;

    const now = Date.now();

    // Cegah request berulang ketika QR yang sama terbaca beberapa
    // kali dalam frame beruntun.
    if (
      lastScanRef.current.code === code &&
      now - lastScanRef.current.at < 4000
    ) {
      return;
    }

    lastScanRef.current = { code, at: now };
    processingRef.current = true;

    setValidating(true);
    setError(null);
    setLastCode(code);

    try {
      const response = await checkInTicket(code);
      setResult(response);
    } catch (err: any) {
      setResult({
        success: false,
        status: "error",
        message:
          err?.message ||
          "Backend tidak dapat dihubungi. Periksa koneksi lalu coba lagi.",
        data: null,
      });
    } finally {
      processingRef.current = false;
      setValidating(false);
      setPaused(true);

      try {
        scannerRef.current?.pause(true);
      } catch {
        // Jika scanner sudah berhenti, tidak perlu pause.
      }
    }
  }, []);

  const startScanner = useCallback(
    async (targetCameraId?: string) => {
      if (startingRef.current) return;

      startingRef.current = true;
      setStarting(true);
      setError(null);
      setResult(null);
      setPaused(false);
      setLastCode("");
      lastScanRef.current = { code: "", at: 0 };

      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // Abaikan scanner lama yang sudah berhenti.
          }

          try {
            scannerRef.current.clear();
          } catch {
            // Abaikan.
          }

          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
        });

        scannerRef.current = scanner;

        let target = targetCameraId || cameraId;

        if (!target) {
          const devices = await Html5Qrcode.getCameras();

          if (!devices || devices.length === 0) {
            throw new Error(
              "Kamera tidak ditemukan pada perangkat ini."
            );
          }

          const mapped = devices.map((device, index) => ({
            id: device.id,
            label:
              device.label || `Kamera ${index + 1}`,
          }));

          setCameras(mapped);

          const preferred =
            mapped.find((device) =>
              /back|rear|environment|belakang/i.test(device.label)
            ) || mapped[0];

          target = preferred.id;
          setCameraId(preferred.id);
        }

        await scanner.start(
          target,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (text) => {
            void handleDecoded(text);
          },
          () => {
            // Frame tanpa QR adalah kondisi normal; tidak perlu pesan.
          }
        );

        setScanning(true);
      } catch (err: any) {
        scannerRef.current = null;
        setError(cameraErrorMessage(err));
      } finally {
        startingRef.current = false;
        setStarting(false);
      }
    },
    [cameraId, handleDecoded]
  );

  const scanNext = useCallback(async () => {
    setResult(null);
    setError(null);
    setLastCode("");
    lastScanRef.current = { code: "", at: 0 };

    const scanner = scannerRef.current;

    if (scanner && paused) {
      try {
        await scanner.resume();
        setPaused(false);
        return;
      } catch {
        // Jika resume gagal, mulai scanner baru.
      }
    }

    await startScanner();
  }, [paused, startScanner]);

  const handleCameraChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextCameraId = event.target.value;

    setCameraId(nextCameraId);

    if (scanning) {
      await stopScanner();
      await startScanner(nextCameraId);
    }
  };

  // Bersihkan kamera ketika admin meninggalkan halaman.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // Abaikan.
            }
          });
      }
    };
  }, []);

  let resultKind: ResultKind | null = null;

  if (result) {
    if (result.success) {
      resultKind = "valid";
    } else if (
      Object.prototype.hasOwnProperty.call(
        RESULT_META,
        result.status
      )
    ) {
      resultKind = result.status as ResultKind;
    } else {
      resultKind = "invalid";
    }
  }

  const meta = resultKind ? RESULT_META[resultKind] : null;
  const data = result?.data;

  return (
    <div className="cdx-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-root {
          --ink: #0B0F19;
          --blue-900: #0A1E4D;
          --blue-700: #143FA6;
          --blue-600: #1D4ED8;
          --blue-500: #3B6CF0;
          --blue-100: #E7EDFC;
          --blue-50: #F4F7FE;
          --line: #D6E0F7;
          --white: #FFFFFF;
          --green-50: #F0FDF4;
          --green-100: #DCFCE7;
          --green-600: #16A34A;
          --green-700: #15803D;
          --red-50: #FEF2F2;
          --red-100: #FEE2E2;
          --red-600: #DC2626;
          --red-700: #B91C1C;
          --yellow-50: #FFFBEB;
          --yellow-100: #FEF9C3;
          --yellow-600: #CA8A04;
          --yellow-700: #A16207;

          min-height: 100vh;
          background: var(--blue-50);
          color: var(--ink);
          font-family: 'Inter', system-ui, sans-serif;
          padding-bottom: 48px;
        }

        /* ================= TRUSS ================= */
        .cdx-truss {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 32px;
          background: var(--blue-900);
          overflow: hidden;
        }
        .cdx-truss-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--blue-500);
          opacity: 0.35;
          flex-shrink: 0;
        }
        .cdx-truss-dot.is-lit {
          background: var(--white);
          opacity: 0.9;
        }
        .cdx-truss-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
        .cdx-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ADE80;
          animation: cdx-blink 2.2s ease-in-out infinite;
        }
        @keyframes cdx-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .cdx-truss-status span:last-child {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--white);
        }

        /* ================= HEADER ================= */
        .cdx-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 36px 32px 24px;
          flex-wrap: wrap;
        }
        .cdx-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--blue-700);
          font-weight: 700;
        }
        .cdx-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 36px;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: var(--ink);
          margin-top: 6px;
        }
        .cdx-subtitle {
          color: #4B5670;
          margin-top: 6px;
          font-size: 14.5px;
        }

        .cdx-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13.5px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }
        .cdx-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cdx-btn--primary {
          background: var(--blue-600);
          color: var(--white);
        }
        .cdx-btn--primary:hover:not(:disabled) {
          background: var(--blue-700);
        }
        .cdx-btn--stop {
          background: var(--red-50);
          border-color: #FECACA;
          color: var(--red-700);
        }
        .cdx-btn--stop:hover:not(:disabled) {
          background: var(--red-100);
        }
        .cdx-btn--ghost {
          background: var(--white);
          border-color: var(--line);
          color: var(--blue-700);
        }
        .cdx-btn--ghost:hover:not(:disabled) {
          background: var(--blue-50);
        }

        /* ================= LAYOUT ================= */
        .cdx-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
          gap: 18px;
          padding: 0 32px;
        }
        @media (max-width: 1000px) {
          .cdx-layout { grid-template-columns: 1fr; }
        }

        .cdx-panel {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(10, 30, 77, 0.04);
        }

        .cdx-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .cdx-panel-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--blue-600);
        }
        .cdx-panel-head h2 {
          font-family: 'Oswald', sans-serif;
          font-size: 20px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--blue-900);
          margin-top: 4px;
        }
        .cdx-panel-head p {
          font-size: 12.5px;
          color: #6B7590;
          margin-top: 4px;
        }
        .cdx-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 5px 11px;
          background: #E5E7EB;
          color: #4B5670;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .cdx-live-badge.is-live {
          background: var(--green-100);
          color: var(--green-700);
        }
        .cdx-live-badge .cdx-pulse {
          background: #9CA3AF;
          animation: none;
        }
        .cdx-live-badge.is-live .cdx-pulse {
          background: #4ADE80;
          animation: cdx-blink 2.2s ease-in-out infinite;
        }

        /* ================= CAMERA TOOLS ================= */
        .cdx-camera-tools {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .cdx-camera-tools label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #4B5670;
          text-transform: uppercase;
        }
        .cdx-camera-tools select {
          flex: 1;
          min-width: 200px;
          height: 42px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--blue-50);
          color: var(--ink);
          font-size: 13px;
          padding: 0 12px;
          outline: none;
        }
        .cdx-camera-tools select:focus {
          border-color: var(--blue-500);
          background: var(--white);
        }

        /* ================= READER ================= */
        .cdx-reader {
          position: relative;
          width: 100%;
          height: 360px;
          background: #06122F;
          border: 1px solid #122A5C;
          border-radius: 14px;
          overflow: hidden;
        }
        .cdx-reader > div {
          width: 100%;
          height: 100%;
        }
        .cdx-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
        }
        .cdx-reader-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px;
          text-align: center;
          color: #A9BCE8;
          background: radial-gradient(circle at 50% 35%, #122A5C, #06122F 72%);
        }
        .cdx-reader-placeholder strong {
          font-family: 'Oswald', sans-serif;
          font-size: 18px;
          letter-spacing: 0.04em;
          color: #FFFFFF;
          text-transform: uppercase;
        }
        .cdx-reader-placeholder span {
          font-size: 12.5px;
          line-height: 1.5;
          max-width: 300px;
        }
        .cdx-reader-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(6, 18, 47, 0.78);
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-align: center;
          padding: 24px;
        }
        .cdx-spin {
          animation: cdx-spin 1s linear infinite;
        }
        @keyframes cdx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .cdx-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 14px;
          padding: 11px 13px;
          border-radius: 10px;
          background: var(--red-50);
          border: 1px solid #FECACA;
          color: var(--red-700);
          font-size: 13px;
          line-height: 1.5;
        }
        .cdx-hint {
          margin-top: 12px;
          font-size: 12px;
          line-height: 1.55;
          color: #8A93AD;
        }

        /* ================= RESULT ================= */
        .cdx-idle {
          min-height: 430px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          color: #8A93AD;
          padding: 24px;
        }
        .cdx-idle h3 {
          font-family: 'Oswald', sans-serif;
          font-size: 20px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--blue-900);
          margin-top: 4px;
        }
        .cdx-idle p {
          font-size: 13px;
          line-height: 1.6;
          max-width: 300px;
        }

        .cdx-result {
          border: 1px solid;
          border-radius: 14px;
          padding: 20px;
        }
        .cdx-result--valid {
          background: var(--green-50);
          border-color: #BBF7D0;
        }
        .cdx-result--used {
          background: var(--yellow-50);
          border-color: #FDE68A;
        }
        .cdx-result--invalid {
          background: var(--red-50);
          border-color: #FECACA;
        }

        .cdx-result-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .cdx-result-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cdx-result--valid .cdx-result-icon {
          background: var(--green-100);
          color: var(--green-700);
        }
        .cdx-result--used .cdx-result-icon {
          background: var(--yellow-100);
          color: var(--yellow-700);
        }
        .cdx-result--invalid .cdx-result-icon {
          background: var(--red-100);
          color: var(--red-700);
        }

        .cdx-result-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
        }
        .cdx-result--valid .cdx-result-tag { color: var(--green-700); }
        .cdx-result--used .cdx-result-tag { color: var(--yellow-700); }
        .cdx-result--invalid .cdx-result-tag { color: var(--red-700); }

        .cdx-result-head h3 {
          font-family: 'Oswald', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 4px;
          line-height: 1.25;
        }

        .cdx-result-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }
        @media (max-width: 520px) {
          .cdx-result-grid { grid-template-columns: 1fr; }
        }
        .cdx-result-grid > div {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(10, 30, 77, 0.06);
          border-radius: 10px;
          padding: 10px 12px;
          min-width: 0;
        }
        .cdx-result-grid dt {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6B7590;
        }
        .cdx-result-grid dd {
          margin-top: 4px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
          word-break: break-word;
        }
        .cdx-result-grid dd.is-mono {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.03em;
          font-size: 12.5px;
        }

        .cdx-result-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
      `}</style>

      {/* TRUSS */}
      <div className="cdx-truss">
        {Array.from({ length: 34 }).map((_, i) => (
          <span
            key={i}
            className={`cdx-truss-dot ${i % 4 === 0 ? "is-lit" : ""}`}
          />
        ))}
        <div className="cdx-truss-status">
          <span className="cdx-pulse" />
          <span>SCANNER SIAP</span>
        </div>
      </div>

      {/* HEADER */}
      <div className="cdx-header-row">
        <div>
          <p className="cdx-eyebrow">Panel Admin — Check-in Tiket</p>
          <h1 className="cdx-title">Scan Ticket</h1>
          <p className="cdx-subtitle">
            Pindai QR tiket pengunjung. Setiap tiket hanya dapat
            digunakan satu kali.
          </p>
        </div>

        {scanning ? (
          <button
            type="button"
            className="cdx-btn cdx-btn--stop"
            onClick={stopScanner}
            disabled={starting}
          >
            <CameraOff size={16} />
            Stop Scanner
          </button>
        ) : (
          <button
            type="button"
            className="cdx-btn cdx-btn--primary"
            onClick={() => startScanner()}
            disabled={starting}
          >
            <Camera size={16} />
            {starting ? "Menyiapkan Kamera..." : "Mulai Scanner"}
          </button>
        )}
      </div>

      <div className="cdx-layout">
        {/* SCANNER */}
        <section className="cdx-panel">
          <div className="cdx-panel-head">
            <div>
              <p className="cdx-panel-tag">CAM — 01</p>
              <h2>Kamera Scanner</h2>
              <p>Pilih kamera lalu arahkan ke QR tiket.</p>
            </div>
            <span
              className={`cdx-live-badge ${
                scanning && !paused ? "is-live" : ""
              }`}
            >
              <span className="cdx-pulse" />
              {scanning && !paused
                ? "LIVE"
                : paused
                  ? "PAUSED"
                  : "OFFLINE"}
            </span>
          </div>

          <div className="cdx-camera-tools">
            <label htmlFor="camera-select">Kamera</label>
            <select
              id="camera-select"
              value={cameraId}
              onChange={handleCameraChange}
              disabled={starting || validating}
            >
              <option value="">Otomatis (kamera belakang)</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cdx-reader">
            <div id={SCANNER_ELEMENT_ID} />

            {!scanning && !starting && (
              <div className="cdx-reader-placeholder">
                <ScanLine size={44} />
                <strong>Kamera Belum Aktif</strong>
                <span>
                  Tekan tombol “Mulai Scanner”, lalu izinkan browser
                  mengakses kamera.
                </span>
              </div>
            )}

            {starting && (
              <div className="cdx-reader-overlay">
                <Loader2 size={26} className="cdx-spin" />
                <span>MENGAKTIFKAN KAMERA...</span>
              </div>
            )}

            {validating && (
              <div className="cdx-reader-overlay">
                <Loader2 size={26} className="cdx-spin" />
                <span>MEMVALIDASI TIKET...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="cdx-alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <p className="cdx-hint">
            Kamera hanya aktif setelah tombol ditekan. Jika izin ditolak,
            buka pengaturan situs pada browser dan izinkan akses kamera.
            Library html5-qrcode membutuhkan HTTPS atau localhost.
          </p>
        </section>

        {/* RESULT */}
        <section className="cdx-panel">
          <div className="cdx-panel-head">
            <div>
              <p className="cdx-panel-tag">RES — 02</p>
              <h2>Hasil Pemindaian</h2>
              <p>Status validasi tiket akan tampil di sini.</p>
            </div>
          </div>

          {!result ? (
            <div className="cdx-idle">
              <QrCode size={46} />
              <h3>Belum Ada Tiket Dipindai</h3>
              <p>
                Arahkan QR tiket ke kamera. Tiket yang valid akan
                otomatis tercatat sebagai sudah digunakan.
              </p>
            </div>
          ) : (
            <div className={`cdx-result cdx-result--${resultKind}`}>
              <div className="cdx-result-head">
                <div className="cdx-result-icon">
                  {resultKind === "valid" ? (
                    <CheckCircle2 size={26} />
                  ) : resultKind === "used" ||
                    resultKind === "unpaid" ? (
                    <Clock size={26} />
                  ) : resultKind === "error" ? (
                    <AlertTriangle size={26} />
                  ) : (
                    <XCircle size={26} />
                  )}
                </div>

                <div>
                  <p className="cdx-result-tag">{meta?.label}</p>
                  <h3>{result.message || meta?.title}</h3>
                </div>
              </div>

              {data ? (
                <dl className="cdx-result-grid">
                  <div>
                    <dt>Event</dt>
                    <dd>{data.event_title || "-"}</dd>
                  </div>
                  <div>
                    <dt>Pemilik Tiket</dt>
                    <dd>{data.customer_name || "-"}</dd>
                  </div>
                  <div>
                    <dt>Kategori</dt>
                    <dd>{data.category_name || "-"}</dd>
                  </div>
                  <div>
                    <dt>Kode Tiket</dt>
                    <dd className="is-mono">
                      {data.ticket_code || lastCode}
                    </dd>
                  </div>
                  {resultKind === "valid" ||
                  resultKind === "used" ? (
                    <div>
                      <dt>
                        {resultKind === "valid"
                          ? "Waktu Check-in"
                          : "Dipakai Pada"}
                      </dt>
                      <dd>{formatDateTime(data.used_at)}</dd>
                    </div>
                  ) : (
                    <div>
                      <dt>Kode Order</dt>
                      <dd className="is-mono">
                        {data.order_code || "-"}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Lokasi</dt>
                    <dd>{data.venue || "-"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="cdx-hint">
                  Kode dipindai:{" "}
                  <strong>{lastCode || "-"}</strong>
                </p>
              )}

              <div className="cdx-result-actions">
                <button
                  type="button"
                  className="cdx-btn cdx-btn--primary"
                  onClick={scanNext}
                  disabled={starting || validating}
                >
                  <ScanLine size={16} />
                  Scan Tiket Berikutnya
                </button>

                {scanning && (
                  <button
                    type="button"
                    className="cdx-btn cdx-btn--ghost"
                    onClick={stopScanner}
                  >
                    <CameraOff size={16} />
                    Stop
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
