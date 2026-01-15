// app/prospects/ads/fonts.ts
import {
  Inter,
  Playfair_Display,
  DM_Sans,
  Manrope,
  Plus_Jakarta_Sans,
  Lora,
  Merriweather,
  Crimson_Pro,
  Montserrat,
  Poppins,
  Oswald,
  Bebas_Neue,
  Raleway,
  Sora,
  Space_Grotesk,
  Libre_Baskerville,
} from "next/font/google";

export const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-inter" });
export const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-dmsans" });
export const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope" });
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plusjakarta",
});
export const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sora" });
export const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-spacegrotesk" });
export const raleway = Raleway({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-raleway" });
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-montserrat" });
export const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-poppins" });
export const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-oswald" });
export const bebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas" });

export const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-playfair" });
export const lora = Lora({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lora" });
export const merri = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-merri" });
export const crimson = Crimson_Pro({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-crimson" });
export const libreBask = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre" });

/**
 * Wartości w `css` sć… gotowe do wklejenia do `font-family:` w stylach warstw.
 * `label` to nazwa w UI.
 */
export const FONT_LIBRARY = [
  { id: "inter", label: "Inter (clean)", css: "Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "dmSans", label: "DM Sans (modern)", css: "DM Sans, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "manrope", label: "Manrope (premium UI)", css: "Manrope, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "plusJakarta", label: "Plus Jakarta Sans (lux)", css: "Plus Jakarta Sans, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "sora", label: "Sora (sharp)", css: "Sora, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "spaceGrotesk", label: "Space Grotesk (editorial modern)", css: "Space Grotesk, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "raleway", label: "Raleway (elegant)", css: "Raleway, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "montserrat", label: "Montserrat (ads)", css: "Montserrat, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "poppins", label: "Poppins (friendly)", css: "Poppins, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "oswald", label: "Oswald (headline)", css: "Oswald, Inter, system-ui, -apple-system, Segoe UI, Roboto" },
  { id: "bebas", label: "Bebas Neue (BIG headline)", css: "Bebas Neue, Inter, system-ui, -apple-system, Segoe UI, Roboto" },

  { id: "playfair", label: "Playfair Display (editorial)", css: "Playfair Display, Georgia, serif" },
  { id: "lora", label: "Lora (classic)", css: "Lora, Georgia, serif" },
  { id: "merri", label: "Merriweather (newspaper)", css: "Merriweather, Georgia, serif" },
  { id: "crimson", label: "Crimson Pro (high-end)", css: "Crimson Pro, Georgia, serif" },
  { id: "libre", label: "Libre Baskerville (lux serif)", css: "Libre Baskerville, Georgia, serif" },
] as const;

export const FONT_VARS_CLASSNAME = [
  inter.variable,
  dmSans.variable,
  manrope.variable,
  plusJakarta.variable,
  sora.variable,
  spaceGrotesk.variable,
  raleway.variable,
  montserrat.variable,
  poppins.variable,
  oswald.variable,
  bebas.variable,
  playfair.variable,
  lora.variable,
  merri.variable,
  crimson.variable,
  libreBask.variable,
].join(" ");
