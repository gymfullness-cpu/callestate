import { z } from "zod";
import { SocialPlatform } from "@prisma/client";

export const PLATFORMS: { key: SocialPlatform; label: string; placeholder: string }[] = [
  { key: "FACEBOOK", label: "Facebook", placeholder: "https://facebook.com/twoj.profil" },
  { key: "INSTAGRAM", label: "Instagram", placeholder: "https://instagram.com/twoj.profil" },
  { key: "TIKTOK", label: "TikTok", placeholder: "https://tiktok.com/@twojprofil" },
  { key: "YOUTUBE", label: "YouTube", placeholder: "https://youtube.com/@twojkanal" },
  { key: "LINKEDIN", label: "LinkedIn", placeholder: "https://linkedin.com/in/twoj-profil" },
  { key: "GOOGLE_BUSINESS", label: "Google Business Profile", placeholder: "https://g.page/r/..." },
  { key: "WHATSAPP", label: "WhatsApp", placeholder: "https://wa.me/48123123123" },
  { key: "X", label: "X (Twitter)", placeholder: "https://x.com/twojprofil" },
  { key: "TELEGRAM", label: "Telegram", placeholder: "https://t.me/twojprofil" },
  { key: "MESSENGER", label: "Messenger", placeholder: "https://m.me/twojprofil" },
];

export const SocialLinkUpsertSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  url: z.string().url("Podaj poprawny URL (musi zaczynać się od https://)"),
  label: z.string().max(50).optional().or(z.literal("")),
});
