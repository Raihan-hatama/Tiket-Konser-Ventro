import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VENTRO",
  description: "Dashboard Admin Ventro",
  icons: {
    icon: "/icons/ventro.png",
    shortcut: "/icons/ventro.png",
    apple: "/icons/ventro.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="id" memberi tahu browser bahwa konten sudah berbahasa
    // Indonesia sehingga fitur auto-translate tidak menyisipkan atribut
    // (_msthash dsb.) yang membuat hydration React gagal.
    // translate="no" + suppressHydrationWarning menjadi pengaman tambahan
    // jika ekstensi penerjemah tetap aktif.
    <html lang="id" translate="no" suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}