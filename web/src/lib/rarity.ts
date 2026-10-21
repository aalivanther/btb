export type Tier = "legendary" | "epic" | "rare" | "common";

const THRESHOLD_LEGENDARY = 8.5;
const THRESHOLD_EPIC = 7.5;
const THRESHOLD_RARE = 6.5;

export function deriveRarity(critic: number): Tier {
  if (critic >= THRESHOLD_LEGENDARY) {
    return "legendary";
  }
  if (critic >= THRESHOLD_EPIC) {
    return "epic";
  }
  if (critic >= THRESHOLD_RARE) {
    return "rare";
  }
  return "common";
}

const HYPES_LEGENDARY = 150;
const HYPES_EPIC = 50;
const HYPES_RARE = 20;
export function deriveRarityFromHypes(hypes: number): Tier {
  if (hypes >= HYPES_LEGENDARY) {
    return "legendary";
  }
  if (hypes >= HYPES_EPIC) {
    return "epic";
  }
  if (hypes >= HYPES_RARE) {
    return "rare";
  }
  return "common";
}
