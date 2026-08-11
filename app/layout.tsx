import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Perpustakaan MI Al-Ma'arif Nusantara",
    template: "%s | Perpustakaan MI Al-Ma'arif Nusantara",
  },
  description:
    "Website resmi Perpustakaan MI Al-Ma'arif Nusantara Jimbaran. Akses koleksi buku siswa, buku guru, informasi sekolah, dan layanan perpustakaan.",
  applicationName: "Perpustakaan MI Al-Ma'arif Nusantara",
  authors: [
    {
      name: "MI Al-Ma'arif Nusantara",
    },
  ],
  keywords: [
    "Perpustakaan MI Al-Ma'arif Nusantara",
    "Perpustakaan Sekolah",
    "MI Al-Ma'arif Nusantara",
    "Jimbaran",
    "Buku Siswa",
    "Buku Guru",
    "Perpustakaan Digital",
  ],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
