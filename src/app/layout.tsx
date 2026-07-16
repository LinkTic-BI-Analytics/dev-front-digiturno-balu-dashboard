import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Digiturno Balú | Tablero de Operación",
  description:
    "Panorama operativo nacional de tickets y asesores de Digiturno Balú. Desarrollado por el equipo de BI Analytics de LinkTic.",
};

/** Aplica el tema antes del primer paint (default: OSCURO, salvo opt-out explícito). */
const themeInitScript = `var t=null;try{t=localStorage.getItem("balu-theme")}catch(e){}if(t!=="light")document.documentElement.classList.add("dark")`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
