package gamesv1

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
	unsafe "unsafe"
)

const (
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type Deal struct {
	state           protoimpl.MessageState `protogen:"open.v1"`
	DealId          string                 `protobuf:"bytes,1,opt,name=deal_id,json=dealId,proto3" json:"deal_id,omitempty"`
	Title           string                 `protobuf:"bytes,2,opt,name=title,proto3" json:"title,omitempty"`
	StoreId         string                 `protobuf:"bytes,3,opt,name=store_id,json=storeId,proto3" json:"store_id,omitempty"`
	StoreName       string                 `protobuf:"bytes,4,opt,name=store_name,json=storeName,proto3" json:"store_name,omitempty"`
	SalePrice       string                 `protobuf:"bytes,5,opt,name=sale_price,json=salePrice,proto3" json:"sale_price,omitempty"`
	NormalPrice     string                 `protobuf:"bytes,6,opt,name=normal_price,json=normalPrice,proto3" json:"normal_price,omitempty"`
	SavingsPercent  int32                  `protobuf:"varint,7,opt,name=savings_percent,json=savingsPercent,proto3" json:"savings_percent,omitempty"`
	ThumbUrl        string                 `protobuf:"bytes,8,opt,name=thumb_url,json=thumbUrl,proto3" json:"thumb_url,omitempty"`
	BuyUrl          string                 `protobuf:"bytes,9,opt,name=buy_url,json=buyUrl,proto3" json:"buy_url,omitempty"`
	SteamRatingText string                 `protobuf:"bytes,10,opt,name=steam_rating_text,json=steamRatingText,proto3" json:"steam_rating_text,omitempty"`
	unknownFields   protoimpl.UnknownFields
	sizeCache       protoimpl.SizeCache
}

func (x *Deal) Reset() {
	*x = Deal{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Deal) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Deal) ProtoMessage() {}

func (x *Deal) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*Deal) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{0}
}

func (x *Deal) GetDealId() string {
	if x != nil {
		return x.DealId
	}
	return ""
}

func (x *Deal) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *Deal) GetStoreId() string {
	if x != nil {
		return x.StoreId
	}
	return ""
}

func (x *Deal) GetStoreName() string {
	if x != nil {
		return x.StoreName
	}
	return ""
}

func (x *Deal) GetSalePrice() string {
	if x != nil {
		return x.SalePrice
	}
	return ""
}

func (x *Deal) GetNormalPrice() string {
	if x != nil {
		return x.NormalPrice
	}
	return ""
}

func (x *Deal) GetSavingsPercent() int32 {
	if x != nil {
		return x.SavingsPercent
	}
	return 0
}

func (x *Deal) GetThumbUrl() string {
	if x != nil {
		return x.ThumbUrl
	}
	return ""
}

func (x *Deal) GetBuyUrl() string {
	if x != nil {
		return x.BuyUrl
	}
	return ""
}

func (x *Deal) GetSteamRatingText() string {
	if x != nil {
		return x.SteamRatingText
	}
	return ""
}

type StoreInfo struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	StoreId       string                 `protobuf:"bytes,1,opt,name=store_id,json=storeId,proto3" json:"store_id,omitempty"`
	StoreName     string                 `protobuf:"bytes,2,opt,name=store_name,json=storeName,proto3" json:"store_name,omitempty"`
	IconUrl       string                 `protobuf:"bytes,3,opt,name=icon_url,json=iconUrl,proto3" json:"icon_url,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *StoreInfo) Reset() {
	*x = StoreInfo{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *StoreInfo) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*StoreInfo) ProtoMessage() {}

func (x *StoreInfo) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*StoreInfo) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{1}
}

func (x *StoreInfo) GetStoreId() string {
	if x != nil {
		return x.StoreId
	}
	return ""
}

func (x *StoreInfo) GetStoreName() string {
	if x != nil {
		return x.StoreName
	}
	return ""
}

func (x *StoreInfo) GetIconUrl() string {
	if x != nil {
		return x.IconUrl
	}
	return ""
}

type ListBestDealsRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Limit         int32                  `protobuf:"varint,1,opt,name=limit,proto3" json:"limit,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ListBestDealsRequest) Reset() {
	*x = ListBestDealsRequest{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ListBestDealsRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ListBestDealsRequest) ProtoMessage() {}

func (x *ListBestDealsRequest) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*ListBestDealsRequest) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{2}
}

func (x *ListBestDealsRequest) GetLimit() int32 {
	if x != nil {
		return x.Limit
	}
	return 0
}

type ListBestDealsResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Deals         []*Deal                `protobuf:"bytes,1,rep,name=deals,proto3" json:"deals,omitempty"`
	Stores        []*StoreInfo           `protobuf:"bytes,2,rep,name=stores,proto3" json:"stores,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ListBestDealsResponse) Reset() {
	*x = ListBestDealsResponse{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ListBestDealsResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ListBestDealsResponse) ProtoMessage() {}

func (x *ListBestDealsResponse) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*ListBestDealsResponse) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{3}
}

func (x *ListBestDealsResponse) GetDeals() []*Deal {
	if x != nil {
		return x.Deals
	}
	return nil
}

func (x *ListBestDealsResponse) GetStores() []*StoreInfo {
	if x != nil {
		return x.Stores
	}
	return nil
}

type FindGameDealsRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Titles        []string               `protobuf:"bytes,1,rep,name=titles,proto3" json:"titles,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *FindGameDealsRequest) Reset() {
	*x = FindGameDealsRequest{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *FindGameDealsRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*FindGameDealsRequest) ProtoMessage() {}

func (x *FindGameDealsRequest) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*FindGameDealsRequest) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{4}
}

func (x *FindGameDealsRequest) GetTitles() []string {
	if x != nil {
		return x.Titles
	}
	return nil
}

type FindGameDealsResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Deals         []*Deal                `protobuf:"bytes,1,rep,name=deals,proto3" json:"deals,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *FindGameDealsResponse) Reset() {
	*x = FindGameDealsResponse{}
	mi := &file_btb_games_v1_deals_proto_msgTypes[5]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *FindGameDealsResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*FindGameDealsResponse) ProtoMessage() {}

func (x *FindGameDealsResponse) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_deals_proto_msgTypes[5]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*FindGameDealsResponse) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_deals_proto_rawDescGZIP(), []int{5}
}

func (x *FindGameDealsResponse) GetDeals() []*Deal {
	if x != nil {
		return x.Deals
	}
	return nil
}

var File_btb_games_v1_deals_proto protoreflect.FileDescriptor

const file_btb_games_v1_deals_proto_rawDesc = "" +
	"\n" +
	"\x18btb/games/v1/deals.proto\x12\fbtb.games.v1\"\xbc\x02\n" +
	"\x04Deal\x12\x17\n" +
	"\adeal_id\x18\x01 \x01(\tR\x06dealId\x12\x14\n" +
	"\x05title\x18\x02 \x01(\tR\x05title\x12\x19\n" +
	"\bstore_id\x18\x03 \x01(\tR\astoreId\x12\x1d\n" +
	"\n" +
	"store_name\x18\x04 \x01(\tR\tstoreName\x12\x1d\n" +
	"\n" +
	"sale_price\x18\x05 \x01(\tR\tsalePrice\x12!\n" +
	"\fnormal_price\x18\x06 \x01(\tR\vnormalPrice\x12'\n" +
	"\x0fsavings_percent\x18\a \x01(\x05R\x0esavingsPercent\x12\x1b\n" +
	"\tthumb_url\x18\b \x01(\tR\bthumbUrl\x12\x17\n" +
	"\abuy_url\x18\t \x01(\tR\x06buyUrl\x12*\n" +
	"\x11steam_rating_text\x18\n" +
	" \x01(\tR\x0fsteamRatingText\"`\n" +
	"\tStoreInfo\x12\x19\n" +
	"\bstore_id\x18\x01 \x01(\tR\astoreId\x12\x1d\n" +
	"\n" +
	"store_name\x18\x02 \x01(\tR\tstoreName\x12\x19\n" +
	"\bicon_url\x18\x03 \x01(\tR\aiconUrl\",\n" +
	"\x14ListBestDealsRequest\x12\x14\n" +
	"\x05limit\x18\x01 \x01(\x05R\x05limit\"r\n" +
	"\x15ListBestDealsResponse\x12(\n" +
	"\x05deals\x18\x01 \x03(\v2\x12.btb.games.v1.DealR\x05deals\x12/\n" +
	"\x06stores\x18\x02 \x03(\v2\x17.btb.games.v1.StoreInfoR\x06stores\".\n" +
	"\x14FindGameDealsRequest\x12\x16\n" +
	"\x06titles\x18\x01 \x03(\tR\x06titles\"A\n" +
	"\x15FindGameDealsResponse\x12(\n" +
	"\x05deals\x18\x01 \x03(\v2\x12.btb.games.v1.DealR\x05deals2\xc2\x01\n" +
	"\fDealsService\x12X\n" +
	"\rListBestDeals\x12\".btb.games.v1.ListBestDealsRequest\x1a#.btb.games.v1.ListBestDealsResponse\x12X\n" +
	"\rFindGameDeals\x12\".btb.games.v1.FindGameDealsRequest\x1a#.btb.games.v1.FindGameDealsResponseB\x8e\x01\n" +
	"\x10com.btb.games.v1B\n" +
	"DealsProtoP\x01Z\x1cbtb/gen/btb/games/v1;gamesv1\xa2\x02\x03BGX\xaa\x02\fBtb.Games.V1\xca\x02\fBtb\\Games\\V1\xe2\x02\x18Btb\\Games\\V1\\GPBMetadata\xea\x02\x0eBtb::Games::V1b\x06proto3"

var (
	file_btb_games_v1_deals_proto_rawDescOnce sync.Once
	file_btb_games_v1_deals_proto_rawDescData []byte
)

func file_btb_games_v1_deals_proto_rawDescGZIP() []byte {
	file_btb_games_v1_deals_proto_rawDescOnce.Do(func() {
		file_btb_games_v1_deals_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_btb_games_v1_deals_proto_rawDesc), len(file_btb_games_v1_deals_proto_rawDesc)))
	})
	return file_btb_games_v1_deals_proto_rawDescData
}

var file_btb_games_v1_deals_proto_msgTypes = make([]protoimpl.MessageInfo, 6)
var file_btb_games_v1_deals_proto_goTypes = []any{
	(*Deal)(nil),
	(*StoreInfo)(nil),
	(*ListBestDealsRequest)(nil),
	(*ListBestDealsResponse)(nil),
	(*FindGameDealsRequest)(nil),
	(*FindGameDealsResponse)(nil),
}
var file_btb_games_v1_deals_proto_depIdxs = []int32{
	0,
	1,
	0,
	2,
	4,
	3,
	5,
	5,
	3,
	3,
	3,
	0,
}

func init() { file_btb_games_v1_deals_proto_init() }
func file_btb_games_v1_deals_proto_init() {
	if File_btb_games_v1_deals_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_btb_games_v1_deals_proto_rawDesc), len(file_btb_games_v1_deals_proto_rawDesc)),
			NumEnums:      0,
			NumMessages:   6,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_btb_games_v1_deals_proto_goTypes,
		DependencyIndexes: file_btb_games_v1_deals_proto_depIdxs,
		MessageInfos:      file_btb_games_v1_deals_proto_msgTypes,
	}.Build()
	File_btb_games_v1_deals_proto = out.File
	file_btb_games_v1_deals_proto_goTypes = nil
	file_btb_games_v1_deals_proto_depIdxs = nil
}
