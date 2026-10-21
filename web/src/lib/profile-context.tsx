"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import type { LaneKey } from "@/lib/timeline";

export type WishItem = {
  id: string;
  title: string;
  platform: LaneKey | "";
  releaseDate: string;
};

export type ProfileIdentity = {
  alias: string;
  bio: string;
  avatarKey: string;
};

export type Profile = {
  identity: ProfileIdentity;
  genres: string[];
  platforms: LaneKey[];
  wishlist: WishItem[];
};

export type RadarRule = "any" | "released";

export type RadarEntry = {
  gameId: string;
  rule: RadarRule;
};

const VALID_RADAR_RULES: readonly string[] = ["any", "released"];

const EMPTY_IDENTITY: ProfileIdentity = { alias: "", bio: "", avatarKey: "" };

const EMPTY_PROFILE: Profile = {
  identity: EMPTY_IDENTITY,
  genres: [],
  platforms: [],
  wishlist: [],
};
const STORAGE_KEY = "btb:profile:v1";

const RADAR_STORAGE_KEY = "btb:radar:v1";

export function parseStoredRadar(raw: unknown): RadarEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const byGameId = new Map<string, RadarRule>();
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.gameId !== "string" || candidate.gameId === "") {
      continue;
    }
    if (typeof candidate.rule !== "string" || !VALID_RADAR_RULES.includes(candidate.rule)) {
      continue;
    }
    byGameId.set(candidate.gameId, candidate.rule as RadarRule);
  }
  return Array.from(byGameId.entries()).map(([gameId, rule]) => ({ gameId, rule }));
}

const VALID_LANE_KEYS: readonly string[] = ["playstation", "xbox", "nintendo", "pc"];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function parseStoredProfile(raw: unknown): Profile {
  if (raw === null || typeof raw !== "object") {
    return EMPTY_PROFILE;
  }
  const candidate = raw as Record<string, unknown>;

  let identity = EMPTY_IDENTITY;
  if (candidate.identity !== null && typeof candidate.identity === "object") {
    const rawIdentity = candidate.identity as Record<string, unknown>;
    identity = {
      alias: typeof rawIdentity.alias === "string" ? rawIdentity.alias : "",
      bio: typeof rawIdentity.bio === "string" ? rawIdentity.bio : "",
      avatarKey: typeof rawIdentity.avatarKey === "string" ? rawIdentity.avatarKey : "",
    };
  }

  const genres = isStringArray(candidate.genres) ? candidate.genres : [];

  const platforms = Array.isArray(candidate.platforms)
    ? (candidate.platforms.filter(
        (entry): entry is LaneKey =>
          typeof entry === "string" && VALID_LANE_KEYS.includes(entry),
      ) as LaneKey[])
    : [];

  const wishlist: WishItem[] = [];
  if (Array.isArray(candidate.wishlist)) {
    for (const entry of candidate.wishlist) {
      if (entry === null || typeof entry !== "object") {
        continue;
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.id !== "string" || item.id === "") {
        continue;
      }
      if (typeof item.title !== "string" || item.title === "") {
        continue;
      }
      const platform =
        typeof item.platform === "string" && VALID_LANE_KEYS.includes(item.platform)
          ? (item.platform as LaneKey)
          : "";
      const releaseDate = typeof item.releaseDate === "string" ? item.releaseDate : "";
      wishlist.push({ id: item.id, title: item.title, platform, releaseDate });
    }
  }

  return { identity, genres, platforms, wishlist };
}

type ProfileContextValue = {
  profile: Profile;
  ready: boolean;
  toggleGenre: (genre: string) => void;
  togglePlatform: (platform: LaneKey) => void;
  toggleWishlist: (item: WishItem) => void;
  removeWishlist: (id: string) => void;
  clearWishlist: () => void;
  isWishlisted: (id: string) => boolean;
  matches: (laneKey: LaneKey, genres: string[]) => boolean;
  hasPrefs: boolean;
  setIdentity: (patch: Partial<ProfileIdentity>) => void;
  replaceProfile: (next: Profile) => void;
  clearProfile: () => void;
  radarRules: RadarEntry[];
  getRadarRule: (gameId: string) => RadarRule | null;
  setRadarRule: (gameId: string, rule: RadarRule | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }): JSX.Element {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);
  const [radarRules, setRadarRules] = useState<RadarEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile(parseStoredProfile(JSON.parse(raw)));
      }
    } catch {}
    try {
      const rawRadar = window.localStorage.getItem(RADAR_STORAGE_KEY);
      if (rawRadar) {
        setRadarRules(parseStoredRadar(JSON.parse(rawRadar)));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    try {
      window.localStorage.setItem(RADAR_STORAGE_KEY, JSON.stringify(radarRules));
    } catch {}
  }, [radarRules, ready]);

  const toggleGenre = useCallback((genre: string) => {
    setProfile((previous) => ({
      ...previous,
      genres: previous.genres.includes(genre)
        ? previous.genres.filter((value) => value !== genre)
        : [...previous.genres, genre],
    }));
  }, []);

  const togglePlatform = useCallback((platform: LaneKey) => {
    setProfile((previous) => ({
      ...previous,
      platforms: previous.platforms.includes(platform)
        ? previous.platforms.filter((value) => value !== platform)
        : [...previous.platforms, platform],
    }));
  }, []);

  const toggleWishlist = useCallback((item: WishItem) => {
    setProfile((previous) => ({
      ...previous,
      wishlist: previous.wishlist.some((entry) => entry.id === item.id)
        ? previous.wishlist.filter((entry) => entry.id !== item.id)
        : [...previous.wishlist, item],
    }));
  }, []);

  const removeWishlist = useCallback((id: string) => {
    setProfile((previous) => ({
      ...previous,
      wishlist: previous.wishlist.filter((entry) => entry.id !== id),
    }));
  }, []);

  const clearWishlist = useCallback(() => {
    setProfile((previous) => ({ ...previous, wishlist: [] }));
  }, []);

  const isWishlisted = useCallback(
    (id: string) => profile.wishlist.some((entry) => entry.id === id),
    [profile.wishlist],
  );

  const matches = useCallback(
    (laneKey: LaneKey, genres: string[]) =>
      profile.platforms.includes(laneKey) ||
      genres.some((genre) => profile.genres.includes(genre)),
    [profile.platforms, profile.genres],
  );

  const hasPrefs = profile.platforms.length > 0 || profile.genres.length > 0;

  const setIdentity = useCallback((patch: Partial<ProfileIdentity>) => {
    setProfile((previous) => ({
      ...previous,
      identity: { ...previous.identity, ...patch },
    }));
  }, []);

  const replaceProfile = useCallback((next: Profile) => {
    setProfile(next);
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    setRadarRules([]);
  }, []);

  const getRadarRule = useCallback(
    (gameId: string): RadarRule | null =>
      radarRules.find((entry) => entry.gameId === gameId)?.rule ?? null,
    [radarRules],
  );

  const setRadarRule = useCallback((gameId: string, rule: RadarRule | null) => {
    setRadarRules((previous) => {
      const withoutGame = previous.filter((entry) => entry.gameId !== gameId);
      if (rule === null) {
        return withoutGame;
      }
      return [...withoutGame, { gameId, rule }];
    });
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      ready,
      toggleGenre,
      togglePlatform,
      toggleWishlist,
      removeWishlist,
      clearWishlist,
      isWishlisted,
      matches,
      hasPrefs,
      setIdentity,
      replaceProfile,
      clearProfile,
      radarRules,
      getRadarRule,
      setRadarRule,
    }),
    [
      profile,
      ready,
      toggleGenre,
      togglePlatform,
      toggleWishlist,
      removeWishlist,
      clearWishlist,
      isWishlisted,
      matches,
      hasPrefs,
      setIdentity,
      replaceProfile,
      clearProfile,
      radarRules,
      getRadarRule,
      setRadarRule,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error("useProfile debe usarse dentro de <ProfileProvider>");
  }
  return value;
}
