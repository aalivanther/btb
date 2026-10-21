export type VideoLang = "es" | "en";

export const VIDEO_LANG_STORAGE_KEY = "btb.videoLang";

export const VIDEO_LANG_EVENT = "btb:videoLang";

export const DEFAULT_VIDEO_LANG: VideoLang = "es";

const YOUTUBE_NOCOOKIE_EMBED_BASE = "https://www.youtube-nocookie.com/embed/";

function subtitlePrefsFor(lang: VideoLang): Record<string, string> {
  if (lang === "es") {
    return { cc_load_policy: "1", cc_lang_pref: "es-419", hl: "es-MX" };
  }
  return { hl: "en" };
}

export type BuildEmbedOptions = {
  youtubeKey: string;
  lang?: VideoLang;
  autoplay?: boolean;
  preview?: boolean;
};

export function buildEmbedUrl({
  youtubeKey,
  lang = DEFAULT_VIDEO_LANG,
  autoplay = false,
  preview = false,
}: BuildEmbedOptions): string {
  const params = new URLSearchParams(subtitlePrefsFor(lang));
  if (autoplay || preview) params.set("autoplay", "1");
  if (preview) {
    params.set("mute", "1");
    params.set("controls", "0");
    params.set("loop", "1");
    params.set("playlist", youtubeKey);
    params.set("modestbranding", "1");
    params.set("rel", "0");
    params.set("disablekb", "1");
    params.set("playsinline", "1");
    params.set("fs", "0");
  }
  return `${YOUTUBE_NOCOOKIE_EMBED_BASE}${encodeURIComponent(youtubeKey)}?${params.toString()}`;
}
