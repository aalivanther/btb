export type VideoCategory = "trailer" | "gameplay" | "dev_diary" | "otro";

export type GameVideo = {
  key: string;
  name: string;
  category: VideoCategory;
};

export type SeedVideos = Record<string, GameVideo[]>;
