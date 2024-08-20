import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/header";
import Footer from "./components/footer";
import { getCanonicalUrl } from "@/utils/index";

// const nunitoDefaultFont = Nunito({subsets: ["latin"]});
// const cuteFont = Josefin_Sans({subsets: ["latin"]});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalUrl()),
  title: "Movie Diary",
  description:
    "Explorez le catalogue de films de Movie Diary : cherchez et ajoutez de nouvelles références pour de votre cinémathèque personnelle.",
  openGraph: {
    images: [`/assets/diary.svg`],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
