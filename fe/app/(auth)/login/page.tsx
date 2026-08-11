"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login } from "@/services/auth";
import {
  ArrowRight,
  CalendarDays,
  Mic2,
  ShoppingCart,
  CreditCard,
} from "lucide-react";

const features = [
  { icon: CalendarDays, label: "Event & Venue" },
  { icon: Mic2, label: "Artis" },
  { icon: ShoppingCart, label: "Pesanan" },
  { icon: CreditCard, label: "Pembayaran" },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await login({
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", res);

      localStorage.setItem("token", res.token);

      console.log("TOKEN TERSIMPAN:", localStorage.getItem("token"));

      router.push("/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.message || "Login gagal");
    }
  };

  return (
    <div className="cdx-login">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

        .cdx-login {
          --blue-900: #0A1E4D;
          --blue-700: #143FA6;
          --blue-600: #1D4ED8;
          --blue-500: #3B6CF0;
          --blue-100: #E7EDFC;
          --blue-50: #F4F7FE;
          --line: #D6E0F7;
          --ink: #0B0F19;

          min-height: 100vh;
          width: 100%;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--ink);
        }

        /* ---- left: identity panel ---- */
        .cdx-panel-left {
          flex: 1.15;
          position: relative;
          background: var(--blue-900);
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          padding: 56px;
          overflow: hidden;
        }
        .cdx-rig-field {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.10) 1.4px, transparent 1.4px);
          background-size: 26px 26px;
          background-position: 0 0;
          mask-image: linear-gradient(to bottom, black, transparent 75%);
          -webkit-mask-image: linear-gradient(to bottom, black, transparent 75%);
        }

        /* decorative floating ticket stubs for texture */
        .cdx-deco-stub {
          position: absolute;
          width: 132px;
          height: 78px;
          border: 1.5px dashed rgba(255,255,255,0.14);
          border-radius: 12px;
        }
        .cdx-deco-stub::before {
          content: "";
          position: absolute;
          top: 50%;
          left: -1px;
          right: -1px;
          border-top: 1.5px dashed rgba(255,255,255,0.14);
        }
        .cdx-deco-stub.s1 {
          top: 8%;
          right: 8%;
          transform: rotate(-10deg);
        }
        .cdx-deco-stub.s2 {
          bottom: 12%;
          left: -30px;
          transform: rotate(8deg);
          width: 100px;
          height: 60px;
        }

        /* centered brand block, Shopee-style */
        .cdx-brand-center {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 0;
        }

        .cdx-brand-logo {
          width: 148px;
          height: 148px;
          object-fit: contain;
          filter: drop-shadow(0 0 20px rgba(255,255,255,0.30));
        }

        .cdx-brand-name {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: clamp(44px, 6vw, 68px);
          letter-spacing: 0.04em;
          line-height: 1;
          margin-top: 18px;
        }

        .cdx-brand-tagline {
          margin-top: 12px;
          font-size: 17px;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
        }

        .cdx-brand-desc {
          margin-top: 14px;
          max-width: 360px;
          font-size: 13.5px;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
        }

        .cdx-features {
          margin-top: 30px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .cdx-feature-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .cdx-feature-chip span {
          font-size: 12px;
          color: rgba(255,255,255,0.75);
        }

        .cdx-left-footer {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.14);
        }
        .cdx-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ADE80;
          animation: cdx-blink 2.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes cdx-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .cdx-left-footer span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.7);
        }

        /* ---- right: form panel ---- */
        .cdx-panel-right {
          flex: 1;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px;
        }
        .cdx-form {
          width: 100%;
          max-width: 360px;
        }
        .cdx-form-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--blue-700);
          font-weight: 700;
        }
        .cdx-form-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: 32px;
          text-transform: uppercase;
          letter-spacing: 0.01em;
          margin-top: 8px;
        }
        .cdx-form-sub {
          margin-top: 8px;
          font-size: 14px;
          color: #4B5670;
        }

        .cdx-field {
          margin-top: 30px;
        }
        .cdx-field label {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #6B7690;
          margin-bottom: 8px;
        }
        .cdx-field input {
          width: 100%;
          border: none;
          border-bottom: 1.5px solid var(--line);
          background: transparent;
          padding: 10px 2px;
          font-size: 15px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s ease;
        }
        .cdx-field input::placeholder {
          color: #A6AFC4;
        }
        .cdx-field input:focus {
          border-bottom-color: var(--blue-600);
        }

        .cdx-submit {
          margin-top: 40px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--blue-600);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 15px;
          padding: 14px;
          border-radius: 10px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .cdx-submit:hover {
          background: var(--blue-700);
          transform: translateY(-1px);
        }

        @media (max-width: 860px) {
          .cdx-login {
            flex-direction: column;
          }
          .cdx-panel-left {
            flex: none;
            padding: 40px 32px;
            min-height: 320px;
          }
          .cdx-brand-logo {
            width: 84px;
            height: 84px;
          }
          .cdx-brand-name {
            font-size: 38px;
          }
          .cdx-brand-desc,
          .cdx-features {
            display: none;
          }
          .cdx-deco-stub {
            display: none;
          }
          .cdx-panel-right {
            flex: none;
            padding: 40px 32px 56px;
          }
        }
      `}</style>

      <div className="cdx-panel-left">
        <div className="cdx-rig-field" />
        <div className="cdx-deco-stub s1" />
        <div className="cdx-deco-stub s2" />

        <div className="cdx-brand-center">
          <Image
  src="/icons/voltra.png"
  alt="Voltra"
  width={148}
  height={148}
  className="cdx-brand-logo"
  priority
/>  
          <h1 className="cdx-brand-name">VENTRO</h1>
          <p className="cdx-brand-tagline">Kelola Konser Lebih Mudah</p>
          <p className="cdx-brand-desc">
            Panel admin untuk mengelola event, artis, pesanan, dan pembayaran
            di seluruh jaringan konser Ventro.
          </p>

          <div className="cdx-features">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="cdx-feature-chip">
                  <Icon size={14} />
                  <span>{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cdx-left-footer">
          <span className="cdx-pulse" />
          <span>SISTEM ONLINE — AKSES TERBATAS UNTUK ADMIN</span>
        </div>
      </div>

      <div className="cdx-panel-right">
        <form onSubmit={submit} className="cdx-form">
          <p className="cdx-form-eyebrow">Admin Access</p>
          <h2 className="cdx-form-title">Masuk ke Panel</h2>
          <p className="cdx-form-sub">
            Gunakan akun admin untuk melanjutkan.
          </p>

          <div className="cdx-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="nama@ventro.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="cdx-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="cdx-submit">
            Login
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
} 