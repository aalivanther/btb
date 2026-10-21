/* eslint-disable */

import type { GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import { fileDesc, messageDesc, serviceDesc } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";

export const file_btb_games_v1_deals: GenFile =
  fileDesc("ChhidGIvZ2FtZXMvdjEvZGVhbHMucHJvdG8SDGJ0Yi5nYW1lcy52MSLOAQoERGVhbBIPCgdkZWFsX2lkGAEgASgJEg0KBXRpdGxlGAIgASgJEhAKCHN0b3JlX2lkGAMgASgJEhIKCnN0b3JlX25hbWUYBCABKAkSEgoKc2FsZV9wcmljZRgFIAEoCRIUCgxub3JtYWxfcHJpY2UYBiABKAkSFwoPc2F2aW5nc19wZXJjZW50GAcgASgFEhEKCXRodW1iX3VybBgIIAEoCRIPCgdidXlfdXJsGAkgASgJEhkKEXN0ZWFtX3JhdGluZ190ZXh0GAogASgJIkMKCVN0b3JlSW5mbxIQCghzdG9yZV9pZBgBIAEoCRISCgpzdG9yZV9uYW1lGAIgASgJEhAKCGljb25fdXJsGAMgASgJIiUKFExpc3RCZXN0RGVhbHNSZXF1ZXN0Eg0KBWxpbWl0GAEgASgFImMKFUxpc3RCZXN0RGVhbHNSZXNwb25zZRIhCgVkZWFscxgBIAMoCzISLmJ0Yi5nYW1lcy52MS5EZWFsEicKBnN0b3JlcxgCIAMoCzIXLmJ0Yi5nYW1lcy52MS5TdG9yZUluZm8iJgoURmluZEdhbWVEZWFsc1JlcXVlc3QSDgoGdGl0bGVzGAEgAygJIjoKFUZpbmRHYW1lRGVhbHNSZXNwb25zZRIhCgVkZWFscxgBIAMoCzISLmJ0Yi5nYW1lcy52MS5EZWFsMsIBCgxEZWFsc1NlcnZpY2USWAoNTGlzdEJlc3REZWFscxIiLmJ0Yi5nYW1lcy52MS5MaXN0QmVzdERlYWxzUmVxdWVzdBojLmJ0Yi5nYW1lcy52MS5MaXN0QmVzdERlYWxzUmVzcG9uc2USWAoNRmluZEdhbWVEZWFscxIiLmJ0Yi5nYW1lcy52MS5GaW5kR2FtZURlYWxzUmVxdWVzdBojLmJ0Yi5nYW1lcy52MS5GaW5kR2FtZURlYWxzUmVzcG9uc2VCjgEKEGNvbS5idGIuZ2FtZXMudjFCCkRlYWxzUHJvdG9QAVocYnRiL2dlbi9idGIvZ2FtZXMvdjE7Z2FtZXN2MaICA0JHWKoCDEJ0Yi5HYW1lcy5WMcoCDEJ0YlxHYW1lc1xWMeICGEJ0YlxHYW1lc1xWMVxHUEJNZXRhZGF0YeoCDkJ0Yjo6R2FtZXM6OlYxYgZwcm90bzM");

export type Deal = Message<"btb.games.v1.Deal"> & {
  dealId: string;

  title: string;

  storeId: string;

  storeName: string;

  salePrice: string;

  normalPrice: string;

  savingsPercent: number;

  thumbUrl: string;

  buyUrl: string;

  steamRatingText: string;
};

export const DealSchema: GenMessage<Deal> =
  messageDesc(file_btb_games_v1_deals, 0);

export type StoreInfo = Message<"btb.games.v1.StoreInfo"> & {
  storeId: string;

  storeName: string;

  iconUrl: string;
};

export const StoreInfoSchema: GenMessage<StoreInfo> =
  messageDesc(file_btb_games_v1_deals, 1);

export type ListBestDealsRequest = Message<"btb.games.v1.ListBestDealsRequest"> & {
  limit: number;
};

export const ListBestDealsRequestSchema: GenMessage<ListBestDealsRequest> =
  messageDesc(file_btb_games_v1_deals, 2);

export type ListBestDealsResponse = Message<"btb.games.v1.ListBestDealsResponse"> & {
  deals: Deal[];

  stores: StoreInfo[];
};

export const ListBestDealsResponseSchema: GenMessage<ListBestDealsResponse> =
  messageDesc(file_btb_games_v1_deals, 3);

export type FindGameDealsRequest = Message<"btb.games.v1.FindGameDealsRequest"> & {
  titles: string[];
};

export const FindGameDealsRequestSchema: GenMessage<FindGameDealsRequest> =
  messageDesc(file_btb_games_v1_deals, 4);

export type FindGameDealsResponse = Message<"btb.games.v1.FindGameDealsResponse"> & {
  deals: Deal[];
};

export const FindGameDealsResponseSchema: GenMessage<FindGameDealsResponse> =
  messageDesc(file_btb_games_v1_deals, 5);

export const DealsService: GenService<{
  listBestDeals: {
    methodKind: "unary";
    input: typeof ListBestDealsRequestSchema;
    output: typeof ListBestDealsResponseSchema;
  },
  findGameDeals: {
    methodKind: "unary";
    input: typeof FindGameDealsRequestSchema;
    output: typeof FindGameDealsResponseSchema;
  },
}> =
  serviceDesc(file_btb_games_v1_deals, 0);
