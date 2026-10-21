/* eslint-disable */

import type { GenEnum, GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import { enumDesc, fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";

export const file_btb_games_v1_games: GenFile =
  fileDesc("ChhidGIvZ2FtZXMvdjEvZ2FtZXMucHJvdG8SDGJ0Yi5nYW1lcy52MSIXChVHZXRTZXJ2aWNlSW5mb1JlcXVlc3QiPwoWR2V0U2VydmljZUluZm9SZXNwb25zZRIUCgxzZXJ2aWNlX25hbWUYASABKAkSDwoHdmVyc2lvbhgCIAEoCSKBAQoQTGlzdEdhbWVzUmVxdWVzdBIMCgR5ZWFyGAEgASgFEg0KBW1vbnRoGAIgASgFEiUKBWtpbmRzGAMgAygOMhYuYnRiLmdhbWVzLnYxLkdhbWVLaW5kEikKCXBsYXRmb3JtcxgEIAMoDjIWLmJ0Yi5nYW1lcy52MS5QbGF0Zm9ybSI2ChFMaXN0R2FtZXNSZXNwb25zZRIhCgVnYW1lcxgBIAMoCzISLmJ0Yi5nYW1lcy52MS5HYW1lIhwKDkdldEdhbWVSZXF1ZXN0EgoKAmlkGAEgASgJIjMKD0dldEdhbWVSZXNwb25zZRIgCgRnYW1lGAEgASgLMhIuYnRiLmdhbWVzLnYxLkdhbWUi0AYKBEdhbWUSCgoCaWQYASABKAkSJAoEa2luZBgCIAEoDjIWLmJ0Yi5nYW1lcy52MS5HYW1lS2luZBIoCghwbGF0Zm9ybRgDIAEoDjIWLmJ0Yi5nYW1lcy52MS5QbGF0Zm9ybRINCgV0aXRsZRgEIAEoCRIQCghvdmVydmlldxgFIAEoCRIUCgxyZWxlYXNlX2RhdGUYBiABKAkSEQoJY292ZXJfdXJsGAcgASgJEhYKDmhlcm9faW1hZ2VfdXJsGAggASgJEg4KBmdlbnJlcxgJIAMoCRIYChBwcmltYXJ5X2xhbmd1YWdlGAogASgJEhcKD2F1ZGlvX2xhbmd1YWdlcxgLIAMoCRIbChN0cmFpbGVyX3lvdXR1YmVfa2V5GAwgASgJEiEKGWNvbXBsZW1lbnRhcnlfeW91dHViZV9rZXkYDSABKAkSIwoGaW1hZ2VzGA4gAygLMhMuYnRiLmdhbWVzLnYxLkltYWdlEioKB3JhdGluZ3MYDyABKAsyGS5idGIuZ2FtZXMudjEuR2FtZVJhdGluZ3MSNAoMYXZhaWxhYmlsaXR5GBAgASgLMh4uYnRiLmdhbWVzLnYxLkdhbWVBdmFpbGFiaWxpdHkSKwoJZnJhbmNoaXNlGBEgASgLMhguYnRiLmdhbWVzLnYxLkNvbGxlY3Rpb24SKAoKZGV2ZWxvcGVycxgSIAMoCzIULmJ0Yi5nYW1lcy52MS5DcmVkaXQSKAoKcHVibGlzaGVycxgTIAMoCzIULmJ0Yi5nYW1lcy52MS5DcmVkaXQSKAoKdm9pY2VfY2FzdBgUIAMoCzIULmJ0Yi5nYW1lcy52MS5DcmVkaXQSEgoKYWdlX3JhdGluZxgVIAEoCRIZChFwbGF5dGltZV9lc3RpbWF0ZRgWIAEoCRIUCgxmcmVlX3RvX3BsYXkYFyABKAgSFAoMZWFybHlfYWNjZXNzGBggASgIEhMKC211bHRpcGxheWVyGBkgASgIEg0KBWh5cGVzGBogASgFEigKCnBjX21pbmltdW0YGyABKAsyFC5idGIuZ2FtZXMudjEuUGNTcGVjEiwKDnBjX3JlY29tbWVuZGVkGBwgASgLMhQuYnRiLmdhbWVzLnYxLlBjU3BlYyJaCgZQY1NwZWMSCgoCb3MYASABKAkSEQoJcHJvY2Vzc29yGAIgASgJEg4KBm1lbW9yeRgDIAEoCRIQCghncmFwaGljcxgEIAEoCRIPCgdzdG9yYWdlGAUgASgJIiMKBUltYWdlEgsKA3VybBgBIAEoCRINCgVsYWJlbBgCIAEoCSJUCgtHYW1lUmF0aW5ncxIOCgZjcml0aWMYASABKAESEgoKbWV0YWNyaXRpYxgCIAEoCRISCgpvcGVuY3JpdGljGAMgASgJEg0KBXN0ZWFtGAQgASgJIocBChBHYW1lQXZhaWxhYmlsaXR5EhEKCXBsYXRmb3JtcxgBIAMoCRITCgtzdG9yZWZyb250cxgCIAMoCRIdChVzdWJzY3JpcHRpb25fc2VydmljZXMYAyADKAkSFQoNZHViX2xhbmd1YWdlcxgEIAMoCRIVCg1zdWJfbGFuZ3VhZ2VzGAUgAygJIkcKCkNvbGxlY3Rpb24SDAoEbmFtZRgBIAEoCRIrCgVpdGVtcxgCIAMoCzIcLmJ0Yi5nYW1lcy52MS5Db2xsZWN0aW9uSXRlbSKZAQoOQ29sbGVjdGlvbkl0ZW0SDQoFdGl0bGUYASABKAkSDAoEeWVhchgCIAEoCRISCgpwb3N0ZXJfdXJsGAMgASgJEhAKCG92ZXJ2aWV3GAQgASgJEhQKDGJhY2tkcm9wX3VybBgFIAEoCRIOCgZyYXRpbmcYBiABKAESDQoFZXh0cmEYByABKAkSDwoHZ2FtZV9pZBgIIAEoCSI3CgZDcmVkaXQSDAoEbmFtZRgBIAEoCRIMCgRyb2xlGAIgASgJEhEKCXBob3RvX3VybBgDIAEoCSplCghHYW1lS2luZBIZChVHQU1FX0tJTkRfVU5TUEVDSUZJRUQQABISCg5HQU1FX0tJTkRfR0FNRRABEhEKDUdBTUVfS0lORF9ETEMQAhIXChNHQU1FX0tJTkRfRVhQQU5TSU9OEAMqeQoIUGxhdGZvcm0SGAoUUExBVEZPUk1fVU5TUEVDSUZJRUQQABIYChRQTEFURk9STV9QTEFZU1RBVElPThABEhEKDVBMQVRGT1JNX1hCT1gQAhIVChFQTEFURk9STV9OSU5URU5ETxADEg8KC1BMQVRGT1JNX1BDEAQyhwIKEkdhbWVDYXRhbG9nU2VydmljZRJbCg5HZXRTZXJ2aWNlSW5mbxIjLmJ0Yi5nYW1lcy52MS5HZXRTZXJ2aWNlSW5mb1JlcXVlc3QaJC5idGIuZ2FtZXMudjEuR2V0U2VydmljZUluZm9SZXNwb25zZRJMCglMaXN0R2FtZXMSHi5idGIuZ2FtZXMudjEuTGlzdEdhbWVzUmVxdWVzdBofLmJ0Yi5nYW1lcy52MS5MaXN0R2FtZXNSZXNwb25zZRJGCgdHZXRHYW1lEhwuYnRiLmdhbWVzLnYxLkdldEdhbWVSZXF1ZXN0Gh0uYnRiLmdhbWVzLnYxLkdldEdhbWVSZXNwb25zZUKOAQoQY29tLmJ0Yi5nYW1lcy52MUIKR2FtZXNQcm90b1ABWhxidGIvZ2VuL2J0Yi9nYW1lcy92MTtnYW1lc3YxogIDQkdYqgIMQnRiLkdhbWVzLlYxygIMQnRiXEdhbWVzXFYx4gIYQnRiXEdhbWVzXFYxXEdQQk1ldGFkYXRh6gIOQnRiOjpHYW1lczo6VjFiBnByb3RvMw");

export type GetServiceInfoRequest = Message<"btb.games.v1.GetServiceInfoRequest"> & {
};

export const GetServiceInfoRequestSchema: GenMessage<GetServiceInfoRequest> =
  messageDesc(file_btb_games_v1_games, 0);

export type GetServiceInfoResponse = Message<"btb.games.v1.GetServiceInfoResponse"> & {
  serviceName: string;

  version: string;
};

export const GetServiceInfoResponseSchema: GenMessage<GetServiceInfoResponse> =
  messageDesc(file_btb_games_v1_games, 1);

export type ListGamesRequest = Message<"btb.games.v1.ListGamesRequest"> & {
  year: number;

  month: number;

  kinds: GameKind[];

  platforms: Platform[];
};

export const ListGamesRequestSchema: GenMessage<ListGamesRequest> =
  messageDesc(file_btb_games_v1_games, 2);

export type ListGamesResponse = Message<"btb.games.v1.ListGamesResponse"> & {
  games: Game[];
};

export const ListGamesResponseSchema: GenMessage<ListGamesResponse> =
  messageDesc(file_btb_games_v1_games, 3);

export type GetGameRequest = Message<"btb.games.v1.GetGameRequest"> & {
  id: string;
};

export const GetGameRequestSchema: GenMessage<GetGameRequest> =
  messageDesc(file_btb_games_v1_games, 4);

export type GetGameResponse = Message<"btb.games.v1.GetGameResponse"> & {
  game?: Game | undefined;
};

export const GetGameResponseSchema: GenMessage<GetGameResponse> =
  messageDesc(file_btb_games_v1_games, 5);

export type Game = Message<"btb.games.v1.Game"> & {
  id: string;

  kind: GameKind;

  platform: Platform;

  title: string;

  overview: string;

  releaseDate: string;

  coverUrl: string;

  heroImageUrl: string;

  genres: string[];

  primaryLanguage: string;

  audioLanguages: string[];

  trailerYoutubeKey: string;

  complementaryYoutubeKey: string;

  images: Image[];

  ratings?: GameRatings | undefined;

  availability?: GameAvailability | undefined;

  franchise?: Collection | undefined;

  developers: Credit[];

  publishers: Credit[];

  voiceCast: Credit[];

  ageRating: string;

  playtimeEstimate: string;

  freeToPlay: boolean;

  earlyAccess: boolean;

  multiplayer: boolean;

  hypes: number;

  pcMinimum?: PcSpec | undefined;

  pcRecommended?: PcSpec | undefined;
};

export const GameSchema: GenMessage<Game> =
  messageDesc(file_btb_games_v1_games, 6);

export type PcSpec = Message<"btb.games.v1.PcSpec"> & {
  os: string;

  processor: string;

  memory: string;

  graphics: string;

  storage: string;
};

export const PcSpecSchema: GenMessage<PcSpec> =
  messageDesc(file_btb_games_v1_games, 7);

export type Image = Message<"btb.games.v1.Image"> & {
  url: string;

  label: string;
};

export const ImageSchema: GenMessage<Image> =
  messageDesc(file_btb_games_v1_games, 8);

export type GameRatings = Message<"btb.games.v1.GameRatings"> & {
  critic: number;

  metacritic: string;

  opencritic: string;

  steam: string;
};

export const GameRatingsSchema: GenMessage<GameRatings> =
  messageDesc(file_btb_games_v1_games, 9);

export type GameAvailability = Message<"btb.games.v1.GameAvailability"> & {
  platforms: string[];

  storefronts: string[];

  subscriptionServices: string[];

  dubLanguages: string[];

  subLanguages: string[];
};

export const GameAvailabilitySchema: GenMessage<GameAvailability> =
  messageDesc(file_btb_games_v1_games, 10);

export type Collection = Message<"btb.games.v1.Collection"> & {
  name: string;

  items: CollectionItem[];
};

export const CollectionSchema: GenMessage<Collection> =
  messageDesc(file_btb_games_v1_games, 11);

export type CollectionItem = Message<"btb.games.v1.CollectionItem"> & {
  title: string;

  year: string;

  posterUrl: string;

  overview: string;

  backdropUrl: string;

  rating: number;

  extra: string;

  gameId: string;
};

export const CollectionItemSchema: GenMessage<CollectionItem> =
  messageDesc(file_btb_games_v1_games, 12);

export type Credit = Message<"btb.games.v1.Credit"> & {
  name: string;

  role: string;

  photoUrl: string;
};

export const CreditSchema: GenMessage<Credit> =
  messageDesc(file_btb_games_v1_games, 13);

export enum GameKind {
  UNSPECIFIED = 0,

  GAME = 1,

  DLC = 2,

  EXPANSION = 3,
}

export const GameKindSchema: GenEnum<GameKind> =
  enumDesc(file_btb_games_v1_games, 0);

export enum Platform {
  UNSPECIFIED = 0,

  PLAYSTATION = 1,

  XBOX = 2,

  NINTENDO = 3,

  PC = 4,
}

export const PlatformSchema: GenEnum<Platform> =
  enumDesc(file_btb_games_v1_games, 1);

export const GameCatalogService: GenService<{
  getServiceInfo: {
    methodKind: "unary";
    input: typeof GetServiceInfoRequestSchema;
    output: typeof GetServiceInfoResponseSchema;
  },
  listGames: {
    methodKind: "unary";
    input: typeof ListGamesRequestSchema;
    output: typeof ListGamesResponseSchema;
  },
  getGame: {
    methodKind: "unary";
    input: typeof GetGameRequestSchema;
    output: typeof GetGameResponseSchema;
  },
}> =
  serviceDesc(file_btb_games_v1_games, 0);
