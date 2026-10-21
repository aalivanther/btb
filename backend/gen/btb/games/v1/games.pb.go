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

type GameKind int32

const (
	GameKind_GAME_KIND_UNSPECIFIED GameKind = 0
	GameKind_GAME_KIND_GAME        GameKind = 1
	GameKind_GAME_KIND_DLC         GameKind = 2
	GameKind_GAME_KIND_EXPANSION   GameKind = 3
)

var (
	GameKind_name = map[int32]string{
		0: "GAME_KIND_UNSPECIFIED",
		1: "GAME_KIND_GAME",
		2: "GAME_KIND_DLC",
		3: "GAME_KIND_EXPANSION",
	}
	GameKind_value = map[string]int32{
		"GAME_KIND_UNSPECIFIED": 0,
		"GAME_KIND_GAME":        1,
		"GAME_KIND_DLC":         2,
		"GAME_KIND_EXPANSION":   3,
	}
)

func (x GameKind) Enum() *GameKind {
	p := new(GameKind)
	*p = x
	return p
}

func (x GameKind) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (GameKind) Descriptor() protoreflect.EnumDescriptor {
	return file_btb_games_v1_games_proto_enumTypes[0].Descriptor()
}

func (GameKind) Type() protoreflect.EnumType {
	return &file_btb_games_v1_games_proto_enumTypes[0]
}

func (x GameKind) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

func (GameKind) EnumDescriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{0}
}

type Platform int32

const (
	Platform_PLATFORM_UNSPECIFIED Platform = 0
	Platform_PLATFORM_PLAYSTATION Platform = 1
	Platform_PLATFORM_XBOX        Platform = 2
	Platform_PLATFORM_NINTENDO    Platform = 3
	Platform_PLATFORM_PC          Platform = 4
)

var (
	Platform_name = map[int32]string{
		0: "PLATFORM_UNSPECIFIED",
		1: "PLATFORM_PLAYSTATION",
		2: "PLATFORM_XBOX",
		3: "PLATFORM_NINTENDO",
		4: "PLATFORM_PC",
	}
	Platform_value = map[string]int32{
		"PLATFORM_UNSPECIFIED": 0,
		"PLATFORM_PLAYSTATION": 1,
		"PLATFORM_XBOX":        2,
		"PLATFORM_NINTENDO":    3,
		"PLATFORM_PC":          4,
	}
)

func (x Platform) Enum() *Platform {
	p := new(Platform)
	*p = x
	return p
}

func (x Platform) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (Platform) Descriptor() protoreflect.EnumDescriptor {
	return file_btb_games_v1_games_proto_enumTypes[1].Descriptor()
}

func (Platform) Type() protoreflect.EnumType {
	return &file_btb_games_v1_games_proto_enumTypes[1]
}

func (x Platform) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

func (Platform) EnumDescriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{1}
}

type GetServiceInfoRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetServiceInfoRequest) Reset() {
	*x = GetServiceInfoRequest{}
	mi := &file_btb_games_v1_games_proto_msgTypes[0]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetServiceInfoRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetServiceInfoRequest) ProtoMessage() {}

func (x *GetServiceInfoRequest) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[0]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GetServiceInfoRequest) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{0}
}

type GetServiceInfoResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	ServiceName   string                 `protobuf:"bytes,1,opt,name=service_name,json=serviceName,proto3" json:"service_name,omitempty"`
	Version       string                 `protobuf:"bytes,2,opt,name=version,proto3" json:"version,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetServiceInfoResponse) Reset() {
	*x = GetServiceInfoResponse{}
	mi := &file_btb_games_v1_games_proto_msgTypes[1]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetServiceInfoResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetServiceInfoResponse) ProtoMessage() {}

func (x *GetServiceInfoResponse) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[1]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GetServiceInfoResponse) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{1}
}

func (x *GetServiceInfoResponse) GetServiceName() string {
	if x != nil {
		return x.ServiceName
	}
	return ""
}

func (x *GetServiceInfoResponse) GetVersion() string {
	if x != nil {
		return x.Version
	}
	return ""
}

type ListGamesRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Year          int32                  `protobuf:"varint,1,opt,name=year,proto3" json:"year,omitempty"`
	Month         int32                  `protobuf:"varint,2,opt,name=month,proto3" json:"month,omitempty"`
	Kinds         []GameKind             `protobuf:"varint,3,rep,packed,name=kinds,proto3,enum=btb.games.v1.GameKind" json:"kinds,omitempty"`
	Platforms     []Platform             `protobuf:"varint,4,rep,packed,name=platforms,proto3,enum=btb.games.v1.Platform" json:"platforms,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ListGamesRequest) Reset() {
	*x = ListGamesRequest{}
	mi := &file_btb_games_v1_games_proto_msgTypes[2]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ListGamesRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ListGamesRequest) ProtoMessage() {}

func (x *ListGamesRequest) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[2]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*ListGamesRequest) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{2}
}

func (x *ListGamesRequest) GetYear() int32 {
	if x != nil {
		return x.Year
	}
	return 0
}

func (x *ListGamesRequest) GetMonth() int32 {
	if x != nil {
		return x.Month
	}
	return 0
}

func (x *ListGamesRequest) GetKinds() []GameKind {
	if x != nil {
		return x.Kinds
	}
	return nil
}

func (x *ListGamesRequest) GetPlatforms() []Platform {
	if x != nil {
		return x.Platforms
	}
	return nil
}

type ListGamesResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Games         []*Game                `protobuf:"bytes,1,rep,name=games,proto3" json:"games,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *ListGamesResponse) Reset() {
	*x = ListGamesResponse{}
	mi := &file_btb_games_v1_games_proto_msgTypes[3]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *ListGamesResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ListGamesResponse) ProtoMessage() {}

func (x *ListGamesResponse) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[3]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*ListGamesResponse) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{3}
}

func (x *ListGamesResponse) GetGames() []*Game {
	if x != nil {
		return x.Games
	}
	return nil
}

type GetGameRequest struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Id            string                 `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetGameRequest) Reset() {
	*x = GetGameRequest{}
	mi := &file_btb_games_v1_games_proto_msgTypes[4]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetGameRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetGameRequest) ProtoMessage() {}

func (x *GetGameRequest) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[4]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GetGameRequest) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{4}
}

func (x *GetGameRequest) GetId() string {
	if x != nil {
		return x.Id
	}
	return ""
}

type GetGameResponse struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Game          *Game                  `protobuf:"bytes,1,opt,name=game,proto3" json:"game,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GetGameResponse) Reset() {
	*x = GetGameResponse{}
	mi := &file_btb_games_v1_games_proto_msgTypes[5]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GetGameResponse) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GetGameResponse) ProtoMessage() {}

func (x *GetGameResponse) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[5]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GetGameResponse) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{5}
}

func (x *GetGameResponse) GetGame() *Game {
	if x != nil {
		return x.Game
	}
	return nil
}

type Game struct {
	state                   protoimpl.MessageState `protogen:"open.v1"`
	Id                      string                 `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	Kind                    GameKind               `protobuf:"varint,2,opt,name=kind,proto3,enum=btb.games.v1.GameKind" json:"kind,omitempty"`
	Platform                Platform               `protobuf:"varint,3,opt,name=platform,proto3,enum=btb.games.v1.Platform" json:"platform,omitempty"`
	Title                   string                 `protobuf:"bytes,4,opt,name=title,proto3" json:"title,omitempty"`
	Overview                string                 `protobuf:"bytes,5,opt,name=overview,proto3" json:"overview,omitempty"`
	ReleaseDate             string                 `protobuf:"bytes,6,opt,name=release_date,json=releaseDate,proto3" json:"release_date,omitempty"`
	CoverUrl                string                 `protobuf:"bytes,7,opt,name=cover_url,json=coverUrl,proto3" json:"cover_url,omitempty"`
	HeroImageUrl            string                 `protobuf:"bytes,8,opt,name=hero_image_url,json=heroImageUrl,proto3" json:"hero_image_url,omitempty"`
	Genres                  []string               `protobuf:"bytes,9,rep,name=genres,proto3" json:"genres,omitempty"`
	PrimaryLanguage         string                 `protobuf:"bytes,10,opt,name=primary_language,json=primaryLanguage,proto3" json:"primary_language,omitempty"`
	AudioLanguages          []string               `protobuf:"bytes,11,rep,name=audio_languages,json=audioLanguages,proto3" json:"audio_languages,omitempty"`
	TrailerYoutubeKey       string                 `protobuf:"bytes,12,opt,name=trailer_youtube_key,json=trailerYoutubeKey,proto3" json:"trailer_youtube_key,omitempty"`
	ComplementaryYoutubeKey string                 `protobuf:"bytes,13,opt,name=complementary_youtube_key,json=complementaryYoutubeKey,proto3" json:"complementary_youtube_key,omitempty"`
	Images                  []*Image               `protobuf:"bytes,14,rep,name=images,proto3" json:"images,omitempty"`
	Ratings                 *GameRatings           `protobuf:"bytes,15,opt,name=ratings,proto3" json:"ratings,omitempty"`
	Availability            *GameAvailability      `protobuf:"bytes,16,opt,name=availability,proto3" json:"availability,omitempty"`
	Franchise               *Collection            `protobuf:"bytes,17,opt,name=franchise,proto3" json:"franchise,omitempty"`
	Developers              []*Credit              `protobuf:"bytes,18,rep,name=developers,proto3" json:"developers,omitempty"`
	Publishers              []*Credit              `protobuf:"bytes,19,rep,name=publishers,proto3" json:"publishers,omitempty"`
	VoiceCast               []*Credit              `protobuf:"bytes,20,rep,name=voice_cast,json=voiceCast,proto3" json:"voice_cast,omitempty"`
	AgeRating        string `protobuf:"bytes,21,opt,name=age_rating,json=ageRating,proto3" json:"age_rating,omitempty"`
	PlaytimeEstimate string `protobuf:"bytes,22,opt,name=playtime_estimate,json=playtimeEstimate,proto3" json:"playtime_estimate,omitempty"`
	FreeToPlay       bool   `protobuf:"varint,23,opt,name=free_to_play,json=freeToPlay,proto3" json:"free_to_play,omitempty"`
	EarlyAccess      bool   `protobuf:"varint,24,opt,name=early_access,json=earlyAccess,proto3" json:"early_access,omitempty"`
	Multiplayer      bool   `protobuf:"varint,25,opt,name=multiplayer,proto3" json:"multiplayer,omitempty"`
	Hypes            int32  `protobuf:"varint,26,opt,name=hypes,proto3" json:"hypes,omitempty"`
	PcMinimum     *PcSpec `protobuf:"bytes,27,opt,name=pc_minimum,json=pcMinimum,proto3" json:"pc_minimum,omitempty"`
	PcRecommended *PcSpec `protobuf:"bytes,28,opt,name=pc_recommended,json=pcRecommended,proto3" json:"pc_recommended,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Game) Reset() {
	*x = Game{}
	mi := &file_btb_games_v1_games_proto_msgTypes[6]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Game) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Game) ProtoMessage() {}

func (x *Game) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[6]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*Game) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{6}
}

func (x *Game) GetId() string {
	if x != nil {
		return x.Id
	}
	return ""
}

func (x *Game) GetKind() GameKind {
	if x != nil {
		return x.Kind
	}
	return GameKind_GAME_KIND_UNSPECIFIED
}

func (x *Game) GetPlatform() Platform {
	if x != nil {
		return x.Platform
	}
	return Platform_PLATFORM_UNSPECIFIED
}

func (x *Game) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *Game) GetOverview() string {
	if x != nil {
		return x.Overview
	}
	return ""
}

func (x *Game) GetReleaseDate() string {
	if x != nil {
		return x.ReleaseDate
	}
	return ""
}

func (x *Game) GetCoverUrl() string {
	if x != nil {
		return x.CoverUrl
	}
	return ""
}

func (x *Game) GetHeroImageUrl() string {
	if x != nil {
		return x.HeroImageUrl
	}
	return ""
}

func (x *Game) GetGenres() []string {
	if x != nil {
		return x.Genres
	}
	return nil
}

func (x *Game) GetPrimaryLanguage() string {
	if x != nil {
		return x.PrimaryLanguage
	}
	return ""
}

func (x *Game) GetAudioLanguages() []string {
	if x != nil {
		return x.AudioLanguages
	}
	return nil
}

func (x *Game) GetTrailerYoutubeKey() string {
	if x != nil {
		return x.TrailerYoutubeKey
	}
	return ""
}

func (x *Game) GetComplementaryYoutubeKey() string {
	if x != nil {
		return x.ComplementaryYoutubeKey
	}
	return ""
}

func (x *Game) GetImages() []*Image {
	if x != nil {
		return x.Images
	}
	return nil
}

func (x *Game) GetRatings() *GameRatings {
	if x != nil {
		return x.Ratings
	}
	return nil
}

func (x *Game) GetAvailability() *GameAvailability {
	if x != nil {
		return x.Availability
	}
	return nil
}

func (x *Game) GetFranchise() *Collection {
	if x != nil {
		return x.Franchise
	}
	return nil
}

func (x *Game) GetDevelopers() []*Credit {
	if x != nil {
		return x.Developers
	}
	return nil
}

func (x *Game) GetPublishers() []*Credit {
	if x != nil {
		return x.Publishers
	}
	return nil
}

func (x *Game) GetVoiceCast() []*Credit {
	if x != nil {
		return x.VoiceCast
	}
	return nil
}

func (x *Game) GetAgeRating() string {
	if x != nil {
		return x.AgeRating
	}
	return ""
}

func (x *Game) GetPlaytimeEstimate() string {
	if x != nil {
		return x.PlaytimeEstimate
	}
	return ""
}

func (x *Game) GetFreeToPlay() bool {
	if x != nil {
		return x.FreeToPlay
	}
	return false
}

func (x *Game) GetEarlyAccess() bool {
	if x != nil {
		return x.EarlyAccess
	}
	return false
}

func (x *Game) GetMultiplayer() bool {
	if x != nil {
		return x.Multiplayer
	}
	return false
}

func (x *Game) GetHypes() int32 {
	if x != nil {
		return x.Hypes
	}
	return 0
}

func (x *Game) GetPcMinimum() *PcSpec {
	if x != nil {
		return x.PcMinimum
	}
	return nil
}

func (x *Game) GetPcRecommended() *PcSpec {
	if x != nil {
		return x.PcRecommended
	}
	return nil
}

type PcSpec struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Os            string                 `protobuf:"bytes,1,opt,name=os,proto3" json:"os,omitempty"`
	Processor     string                 `protobuf:"bytes,2,opt,name=processor,proto3" json:"processor,omitempty"`
	Memory        string                 `protobuf:"bytes,3,opt,name=memory,proto3" json:"memory,omitempty"`
	Graphics      string                 `protobuf:"bytes,4,opt,name=graphics,proto3" json:"graphics,omitempty"`
	Storage       string                 `protobuf:"bytes,5,opt,name=storage,proto3" json:"storage,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *PcSpec) Reset() {
	*x = PcSpec{}
	mi := &file_btb_games_v1_games_proto_msgTypes[7]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *PcSpec) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*PcSpec) ProtoMessage() {}

func (x *PcSpec) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[7]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*PcSpec) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{7}
}

func (x *PcSpec) GetOs() string {
	if x != nil {
		return x.Os
	}
	return ""
}

func (x *PcSpec) GetProcessor() string {
	if x != nil {
		return x.Processor
	}
	return ""
}

func (x *PcSpec) GetMemory() string {
	if x != nil {
		return x.Memory
	}
	return ""
}

func (x *PcSpec) GetGraphics() string {
	if x != nil {
		return x.Graphics
	}
	return ""
}

func (x *PcSpec) GetStorage() string {
	if x != nil {
		return x.Storage
	}
	return ""
}

type Image struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Url           string                 `protobuf:"bytes,1,opt,name=url,proto3" json:"url,omitempty"`
	Label         string                 `protobuf:"bytes,2,opt,name=label,proto3" json:"label,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Image) Reset() {
	*x = Image{}
	mi := &file_btb_games_v1_games_proto_msgTypes[8]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Image) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Image) ProtoMessage() {}

func (x *Image) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[8]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*Image) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{8}
}

func (x *Image) GetUrl() string {
	if x != nil {
		return x.Url
	}
	return ""
}

func (x *Image) GetLabel() string {
	if x != nil {
		return x.Label
	}
	return ""
}

type GameRatings struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Critic        float64                `protobuf:"fixed64,1,opt,name=critic,proto3" json:"critic,omitempty"`
	Metacritic    string                 `protobuf:"bytes,2,opt,name=metacritic,proto3" json:"metacritic,omitempty"`
	Opencritic    string                 `protobuf:"bytes,3,opt,name=opencritic,proto3" json:"opencritic,omitempty"`
	Steam         string                 `protobuf:"bytes,4,opt,name=steam,proto3" json:"steam,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *GameRatings) Reset() {
	*x = GameRatings{}
	mi := &file_btb_games_v1_games_proto_msgTypes[9]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GameRatings) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GameRatings) ProtoMessage() {}

func (x *GameRatings) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[9]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GameRatings) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{9}
}

func (x *GameRatings) GetCritic() float64 {
	if x != nil {
		return x.Critic
	}
	return 0
}

func (x *GameRatings) GetMetacritic() string {
	if x != nil {
		return x.Metacritic
	}
	return ""
}

func (x *GameRatings) GetOpencritic() string {
	if x != nil {
		return x.Opencritic
	}
	return ""
}

func (x *GameRatings) GetSteam() string {
	if x != nil {
		return x.Steam
	}
	return ""
}

type GameAvailability struct {
	state                protoimpl.MessageState `protogen:"open.v1"`
	Platforms            []string               `protobuf:"bytes,1,rep,name=platforms,proto3" json:"platforms,omitempty"`
	Storefronts          []string               `protobuf:"bytes,2,rep,name=storefronts,proto3" json:"storefronts,omitempty"`
	SubscriptionServices []string               `protobuf:"bytes,3,rep,name=subscription_services,json=subscriptionServices,proto3" json:"subscription_services,omitempty"`
	DubLanguages         []string               `protobuf:"bytes,4,rep,name=dub_languages,json=dubLanguages,proto3" json:"dub_languages,omitempty"`
	SubLanguages         []string               `protobuf:"bytes,5,rep,name=sub_languages,json=subLanguages,proto3" json:"sub_languages,omitempty"`
	unknownFields        protoimpl.UnknownFields
	sizeCache            protoimpl.SizeCache
}

func (x *GameAvailability) Reset() {
	*x = GameAvailability{}
	mi := &file_btb_games_v1_games_proto_msgTypes[10]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *GameAvailability) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*GameAvailability) ProtoMessage() {}

func (x *GameAvailability) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[10]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*GameAvailability) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{10}
}

func (x *GameAvailability) GetPlatforms() []string {
	if x != nil {
		return x.Platforms
	}
	return nil
}

func (x *GameAvailability) GetStorefronts() []string {
	if x != nil {
		return x.Storefronts
	}
	return nil
}

func (x *GameAvailability) GetSubscriptionServices() []string {
	if x != nil {
		return x.SubscriptionServices
	}
	return nil
}

func (x *GameAvailability) GetDubLanguages() []string {
	if x != nil {
		return x.DubLanguages
	}
	return nil
}

func (x *GameAvailability) GetSubLanguages() []string {
	if x != nil {
		return x.SubLanguages
	}
	return nil
}

type Collection struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Name          string                 `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
	Items         []*CollectionItem      `protobuf:"bytes,2,rep,name=items,proto3" json:"items,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Collection) Reset() {
	*x = Collection{}
	mi := &file_btb_games_v1_games_proto_msgTypes[11]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Collection) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Collection) ProtoMessage() {}

func (x *Collection) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[11]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*Collection) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{11}
}

func (x *Collection) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Collection) GetItems() []*CollectionItem {
	if x != nil {
		return x.Items
	}
	return nil
}

type CollectionItem struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Title         string                 `protobuf:"bytes,1,opt,name=title,proto3" json:"title,omitempty"`
	Year          string                 `protobuf:"bytes,2,opt,name=year,proto3" json:"year,omitempty"`
	PosterUrl     string                 `protobuf:"bytes,3,opt,name=poster_url,json=posterUrl,proto3" json:"poster_url,omitempty"`
	Overview      string                 `protobuf:"bytes,4,opt,name=overview,proto3" json:"overview,omitempty"`
	BackdropUrl   string                 `protobuf:"bytes,5,opt,name=backdrop_url,json=backdropUrl,proto3" json:"backdrop_url,omitempty"`
	Rating        float64                `protobuf:"fixed64,6,opt,name=rating,proto3" json:"rating,omitempty"`
	Extra         string                 `protobuf:"bytes,7,opt,name=extra,proto3" json:"extra,omitempty"`
	GameId        string                 `protobuf:"bytes,8,opt,name=game_id,json=gameId,proto3" json:"game_id,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *CollectionItem) Reset() {
	*x = CollectionItem{}
	mi := &file_btb_games_v1_games_proto_msgTypes[12]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *CollectionItem) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*CollectionItem) ProtoMessage() {}

func (x *CollectionItem) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[12]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*CollectionItem) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{12}
}

func (x *CollectionItem) GetTitle() string {
	if x != nil {
		return x.Title
	}
	return ""
}

func (x *CollectionItem) GetYear() string {
	if x != nil {
		return x.Year
	}
	return ""
}

func (x *CollectionItem) GetPosterUrl() string {
	if x != nil {
		return x.PosterUrl
	}
	return ""
}

func (x *CollectionItem) GetOverview() string {
	if x != nil {
		return x.Overview
	}
	return ""
}

func (x *CollectionItem) GetBackdropUrl() string {
	if x != nil {
		return x.BackdropUrl
	}
	return ""
}

func (x *CollectionItem) GetRating() float64 {
	if x != nil {
		return x.Rating
	}
	return 0
}

func (x *CollectionItem) GetExtra() string {
	if x != nil {
		return x.Extra
	}
	return ""
}

func (x *CollectionItem) GetGameId() string {
	if x != nil {
		return x.GameId
	}
	return ""
}

type Credit struct {
	state         protoimpl.MessageState `protogen:"open.v1"`
	Name          string                 `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
	Role          string                 `protobuf:"bytes,2,opt,name=role,proto3" json:"role,omitempty"`
	PhotoUrl      string                 `protobuf:"bytes,3,opt,name=photo_url,json=photoUrl,proto3" json:"photo_url,omitempty"`
	unknownFields protoimpl.UnknownFields
	sizeCache     protoimpl.SizeCache
}

func (x *Credit) Reset() {
	*x = Credit{}
	mi := &file_btb_games_v1_games_proto_msgTypes[13]
	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
	ms.StoreMessageInfo(mi)
}

func (x *Credit) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Credit) ProtoMessage() {}

func (x *Credit) ProtoReflect() protoreflect.Message {
	mi := &file_btb_games_v1_games_proto_msgTypes[13]
	if x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

func (*Credit) Descriptor() ([]byte, []int) {
	return file_btb_games_v1_games_proto_rawDescGZIP(), []int{13}
}

func (x *Credit) GetName() string {
	if x != nil {
		return x.Name
	}
	return ""
}

func (x *Credit) GetRole() string {
	if x != nil {
		return x.Role
	}
	return ""
}

func (x *Credit) GetPhotoUrl() string {
	if x != nil {
		return x.PhotoUrl
	}
	return ""
}

var File_btb_games_v1_games_proto protoreflect.FileDescriptor

const file_btb_games_v1_games_proto_rawDesc = "" +
	"\n" +
	"\x18btb/games/v1/games.proto\x12\fbtb.games.v1\"\x17\n" +
	"\x15GetServiceInfoRequest\"U\n" +
	"\x16GetServiceInfoResponse\x12!\n" +
	"\fservice_name\x18\x01 \x01(\tR\vserviceName\x12\x18\n" +
	"\aversion\x18\x02 \x01(\tR\aversion\"\xa0\x01\n" +
	"\x10ListGamesRequest\x12\x12\n" +
	"\x04year\x18\x01 \x01(\x05R\x04year\x12\x14\n" +
	"\x05month\x18\x02 \x01(\x05R\x05month\x12,\n" +
	"\x05kinds\x18\x03 \x03(\x0e2\x16.btb.games.v1.GameKindR\x05kinds\x124\n" +
	"\tplatforms\x18\x04 \x03(\x0e2\x16.btb.games.v1.PlatformR\tplatforms\"=\n" +
	"\x11ListGamesResponse\x12(\n" +
	"\x05games\x18\x01 \x03(\v2\x12.btb.games.v1.GameR\x05games\" \n" +
	"\x0eGetGameRequest\x12\x0e\n" +
	"\x02id\x18\x01 \x01(\tR\x02id\"9\n" +
	"\x0fGetGameResponse\x12&\n" +
	"\x04game\x18\x01 \x01(\v2\x12.btb.games.v1.GameR\x04game\"\xa0\t\n" +
	"\x04Game\x12\x0e\n" +
	"\x02id\x18\x01 \x01(\tR\x02id\x12*\n" +
	"\x04kind\x18\x02 \x01(\x0e2\x16.btb.games.v1.GameKindR\x04kind\x122\n" +
	"\bplatform\x18\x03 \x01(\x0e2\x16.btb.games.v1.PlatformR\bplatform\x12\x14\n" +
	"\x05title\x18\x04 \x01(\tR\x05title\x12\x1a\n" +
	"\boverview\x18\x05 \x01(\tR\boverview\x12!\n" +
	"\frelease_date\x18\x06 \x01(\tR\vreleaseDate\x12\x1b\n" +
	"\tcover_url\x18\a \x01(\tR\bcoverUrl\x12$\n" +
	"\x0ehero_image_url\x18\b \x01(\tR\fheroImageUrl\x12\x16\n" +
	"\x06genres\x18\t \x03(\tR\x06genres\x12)\n" +
	"\x10primary_language\x18\n" +
	" \x01(\tR\x0fprimaryLanguage\x12'\n" +
	"\x0faudio_languages\x18\v \x03(\tR\x0eaudioLanguages\x12.\n" +
	"\x13trailer_youtube_key\x18\f \x01(\tR\x11trailerYoutubeKey\x12:\n" +
	"\x19complementary_youtube_key\x18\r \x01(\tR\x17complementaryYoutubeKey\x12+\n" +
	"\x06images\x18\x0e \x03(\v2\x13.btb.games.v1.ImageR\x06images\x123\n" +
	"\aratings\x18\x0f \x01(\v2\x19.btb.games.v1.GameRatingsR\aratings\x12B\n" +
	"\favailability\x18\x10 \x01(\v2\x1e.btb.games.v1.GameAvailabilityR\favailability\x126\n" +
	"\tfranchise\x18\x11 \x01(\v2\x18.btb.games.v1.CollectionR\tfranchise\x124\n" +
	"\n" +
	"developers\x18\x12 \x03(\v2\x14.btb.games.v1.CreditR\n" +
	"developers\x124\n" +
	"\n" +
	"publishers\x18\x13 \x03(\v2\x14.btb.games.v1.CreditR\n" +
	"publishers\x123\n" +
	"\n" +
	"voice_cast\x18\x14 \x03(\v2\x14.btb.games.v1.CreditR\tvoiceCast\x12\x1d\n" +
	"\n" +
	"age_rating\x18\x15 \x01(\tR\tageRating\x12+\n" +
	"\x11playtime_estimate\x18\x16 \x01(\tR\x10playtimeEstimate\x12 \n" +
	"\ffree_to_play\x18\x17 \x01(\bR\n" +
	"freeToPlay\x12!\n" +
	"\fearly_access\x18\x18 \x01(\bR\vearlyAccess\x12 \n" +
	"\vmultiplayer\x18\x19 \x01(\bR\vmultiplayer\x12\x14\n" +
	"\x05hypes\x18\x1a \x01(\x05R\x05hypes\x123\n" +
	"\n" +
	"pc_minimum\x18\x1b \x01(\v2\x14.btb.games.v1.PcSpecR\tpcMinimum\x12;\n" +
	"\x0epc_recommended\x18\x1c \x01(\v2\x14.btb.games.v1.PcSpecR\rpcRecommended\"\x84\x01\n" +
	"\x06PcSpec\x12\x0e\n" +
	"\x02os\x18\x01 \x01(\tR\x02os\x12\x1c\n" +
	"\tprocessor\x18\x02 \x01(\tR\tprocessor\x12\x16\n" +
	"\x06memory\x18\x03 \x01(\tR\x06memory\x12\x1a\n" +
	"\bgraphics\x18\x04 \x01(\tR\bgraphics\x12\x18\n" +
	"\astorage\x18\x05 \x01(\tR\astorage\"/\n" +
	"\x05Image\x12\x10\n" +
	"\x03url\x18\x01 \x01(\tR\x03url\x12\x14\n" +
	"\x05label\x18\x02 \x01(\tR\x05label\"{\n" +
	"\vGameRatings\x12\x16\n" +
	"\x06critic\x18\x01 \x01(\x01R\x06critic\x12\x1e\n" +
	"\n" +
	"metacritic\x18\x02 \x01(\tR\n" +
	"metacritic\x12\x1e\n" +
	"\n" +
	"opencritic\x18\x03 \x01(\tR\n" +
	"opencritic\x12\x14\n" +
	"\x05steam\x18\x04 \x01(\tR\x05steam\"\xd1\x01\n" +
	"\x10GameAvailability\x12\x1c\n" +
	"\tplatforms\x18\x01 \x03(\tR\tplatforms\x12 \n" +
	"\vstorefronts\x18\x02 \x03(\tR\vstorefronts\x123\n" +
	"\x15subscription_services\x18\x03 \x03(\tR\x14subscriptionServices\x12#\n" +
	"\rdub_languages\x18\x04 \x03(\tR\fdubLanguages\x12#\n" +
	"\rsub_languages\x18\x05 \x03(\tR\fsubLanguages\"T\n" +
	"\n" +
	"Collection\x12\x12\n" +
	"\x04name\x18\x01 \x01(\tR\x04name\x122\n" +
	"\x05items\x18\x02 \x03(\v2\x1c.btb.games.v1.CollectionItemR\x05items\"\xdf\x01\n" +
	"\x0eCollectionItem\x12\x14\n" +
	"\x05title\x18\x01 \x01(\tR\x05title\x12\x12\n" +
	"\x04year\x18\x02 \x01(\tR\x04year\x12\x1d\n" +
	"\n" +
	"poster_url\x18\x03 \x01(\tR\tposterUrl\x12\x1a\n" +
	"\boverview\x18\x04 \x01(\tR\boverview\x12!\n" +
	"\fbackdrop_url\x18\x05 \x01(\tR\vbackdropUrl\x12\x16\n" +
	"\x06rating\x18\x06 \x01(\x01R\x06rating\x12\x14\n" +
	"\x05extra\x18\a \x01(\tR\x05extra\x12\x17\n" +
	"\agame_id\x18\b \x01(\tR\x06gameId\"M\n" +
	"\x06Credit\x12\x12\n" +
	"\x04name\x18\x01 \x01(\tR\x04name\x12\x12\n" +
	"\x04role\x18\x02 \x01(\tR\x04role\x12\x1b\n" +
	"\tphoto_url\x18\x03 \x01(\tR\bphotoUrl*e\n" +
	"\bGameKind\x12\x19\n" +
	"\x15GAME_KIND_UNSPECIFIED\x10\x00\x12\x12\n" +
	"\x0eGAME_KIND_GAME\x10\x01\x12\x11\n" +
	"\rGAME_KIND_DLC\x10\x02\x12\x17\n" +
	"\x13GAME_KIND_EXPANSION\x10\x03*y\n" +
	"\bPlatform\x12\x18\n" +
	"\x14PLATFORM_UNSPECIFIED\x10\x00\x12\x18\n" +
	"\x14PLATFORM_PLAYSTATION\x10\x01\x12\x11\n" +
	"\rPLATFORM_XBOX\x10\x02\x12\x15\n" +
	"\x11PLATFORM_NINTENDO\x10\x03\x12\x0f\n" +
	"\vPLATFORM_PC\x10\x042\x87\x02\n" +
	"\x12GameCatalogService\x12[\n" +
	"\x0eGetServiceInfo\x12#.btb.games.v1.GetServiceInfoRequest\x1a$.btb.games.v1.GetServiceInfoResponse\x12L\n" +
	"\tListGames\x12\x1e.btb.games.v1.ListGamesRequest\x1a\x1f.btb.games.v1.ListGamesResponse\x12F\n" +
	"\aGetGame\x12\x1c.btb.games.v1.GetGameRequest\x1a\x1d.btb.games.v1.GetGameResponseB\x8e\x01\n" +
	"\x10com.btb.games.v1B\n" +
	"GamesProtoP\x01Z\x1cbtb/gen/btb/games/v1;gamesv1\xa2\x02\x03BGX\xaa\x02\fBtb.Games.V1\xca\x02\fBtb\\Games\\V1\xe2\x02\x18Btb\\Games\\V1\\GPBMetadata\xea\x02\x0eBtb::Games::V1b\x06proto3"

var (
	file_btb_games_v1_games_proto_rawDescOnce sync.Once
	file_btb_games_v1_games_proto_rawDescData []byte
)

func file_btb_games_v1_games_proto_rawDescGZIP() []byte {
	file_btb_games_v1_games_proto_rawDescOnce.Do(func() {
		file_btb_games_v1_games_proto_rawDescData = protoimpl.X.CompressGZIP(unsafe.Slice(unsafe.StringData(file_btb_games_v1_games_proto_rawDesc), len(file_btb_games_v1_games_proto_rawDesc)))
	})
	return file_btb_games_v1_games_proto_rawDescData
}

var file_btb_games_v1_games_proto_enumTypes = make([]protoimpl.EnumInfo, 2)
var file_btb_games_v1_games_proto_msgTypes = make([]protoimpl.MessageInfo, 14)
var file_btb_games_v1_games_proto_goTypes = []any{
	(GameKind)(0),
	(Platform)(0),
	(*GetServiceInfoRequest)(nil),
	(*GetServiceInfoResponse)(nil),
	(*ListGamesRequest)(nil),
	(*ListGamesResponse)(nil),
	(*GetGameRequest)(nil),
	(*GetGameResponse)(nil),
	(*Game)(nil),
	(*PcSpec)(nil),
	(*Image)(nil),
	(*GameRatings)(nil),
	(*GameAvailability)(nil),
	(*Collection)(nil),
	(*CollectionItem)(nil),
	(*Credit)(nil),
}
var file_btb_games_v1_games_proto_depIdxs = []int32{
	0,
	1,
	8,
	8,
	0,
	1,
	10,
	11,
	12,
	13,
	15,
	15,
	15,
	9,
	9,
	14,
	2,
	4,
	6,
	3,
	5,
	7,
	19,
	16,
	16,
	16,
	0,
}

func init() { file_btb_games_v1_games_proto_init() }
func file_btb_games_v1_games_proto_init() {
	if File_btb_games_v1_games_proto != nil {
		return
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: unsafe.Slice(unsafe.StringData(file_btb_games_v1_games_proto_rawDesc), len(file_btb_games_v1_games_proto_rawDesc)),
			NumEnums:      2,
			NumMessages:   14,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_btb_games_v1_games_proto_goTypes,
		DependencyIndexes: file_btb_games_v1_games_proto_depIdxs,
		EnumInfos:         file_btb_games_v1_games_proto_enumTypes,
		MessageInfos:      file_btb_games_v1_games_proto_msgTypes,
	}.Build()
	File_btb_games_v1_games_proto = out.File
	file_btb_games_v1_games_proto_goTypes = nil
	file_btb_games_v1_games_proto_depIdxs = nil
}
