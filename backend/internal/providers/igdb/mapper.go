package igdb

import (
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"

	gamesv1 "btb/gen/btb/games/v1"
)

type RawGame struct {
	ID int `json:"id"`
	Name string `json:"name"`
	Summary string `json:"summary"`
	FirstReleaseDate int64 `json:"first_release_date"`
	Cover igdbImage `json:"cover"`
	Screenshots []igdbImage `json:"screenshots"`
	Artworks []igdbImage `json:"artworks"`
	Genres []igdbNamed `json:"genres"`
	Platforms []igdbPlatform `json:"platforms"`
	InvolvedCompanies []igdbInvolvedCompany `json:"involved_companies"`
	AgeRatings []igdbAgeRating `json:"age_ratings"`
	Videos []igdbVideo `json:"videos"`
	AggregatedRating float64 `json:"aggregated_rating"`
	AggregatedRatingCount int `json:"aggregated_rating_count"`
	TotalRating float64 `json:"total_rating"`
	TotalRatingCount int `json:"total_rating_count"`
	Hypes int `json:"hypes"`
	ExternalGames []igdbExternalGame `json:"external_games"`
	Collections []igdbCollectionRef `json:"collections"`
	GameType int `json:"game_type"`
}

type igdbImage struct {
	ImageID string `json:"image_id"`
}

type igdbNamed struct {
	Name string `json:"name"`
}

type igdbPlatform struct {
	ID int `json:"id"`
	Name string `json:"name"`
	Abbreviation string `json:"abbreviation"`
}

type igdbInvolvedCompany struct {
	Company igdbNamed `json:"company"`
	Developer bool `json:"developer"`
	Publisher bool `json:"publisher"`
}

type igdbAgeRating struct {
	Category int `json:"category"`
	Rating int `json:"rating"`
}

type igdbVideo struct {
	Name string `json:"name"`
	VideoID string `json:"video_id"`
}

type igdbExternalGame struct {
	UID string `json:"uid"`
	URL string `json:"url"`
}

const steamURLMark = "store.steampowered.com/app/"

func (g *RawGame) SteamAppID() (int, bool) {
	for _, external := range g.ExternalGames {
		if !strings.Contains(external.URL, steamURLMark) {
			continue
		}
		if appID, err := strconv.Atoi(strings.TrimSpace(external.UID)); err == nil && appID > 0 {
			return appID, true
		}
		tail := external.URL[strings.Index(external.URL, steamURLMark)+len(steamURLMark):]
		digits := strings.Builder{}
		for _, char := range tail {
			if char < '0' || char > '9' {
				break
			}
			digits.WriteRune(char)
		}
		if appID, err := strconv.Atoi(digits.String()); err == nil && appID > 0 {
			return appID, true
		}
	}
	return 0, false
}

const fallbackSlug = "game"

const idSuffix = "-igdb-"

const maxGalleryImages = 6

const coverSize = "t_cover_big"

const heroSize = "t_1080p"

const criticScaleDivisor = 10.0

const minRatingCount = 3

var platformBrand = map[int]gamesv1.Platform{
	167: gamesv1.Platform_PLATFORM_PLAYSTATION,
	48:  gamesv1.Platform_PLATFORM_PLAYSTATION,
	9:   gamesv1.Platform_PLATFORM_PLAYSTATION,
	8:   gamesv1.Platform_PLATFORM_PLAYSTATION,
	390: gamesv1.Platform_PLATFORM_PLAYSTATION,
	46:  gamesv1.Platform_PLATFORM_PLAYSTATION,
	38:  gamesv1.Platform_PLATFORM_PLAYSTATION,

	169: gamesv1.Platform_PLATFORM_XBOX,
	49:  gamesv1.Platform_PLATFORM_XBOX,
	12:  gamesv1.Platform_PLATFORM_XBOX,
	11:  gamesv1.Platform_PLATFORM_XBOX,

	130: gamesv1.Platform_PLATFORM_NINTENDO,
	508: gamesv1.Platform_PLATFORM_NINTENDO,
	41:  gamesv1.Platform_PLATFORM_NINTENDO,
	5:   gamesv1.Platform_PLATFORM_NINTENDO,
	21:  gamesv1.Platform_PLATFORM_NINTENDO,
	4:   gamesv1.Platform_PLATFORM_NINTENDO,
	18:  gamesv1.Platform_PLATFORM_NINTENDO,
	19:  gamesv1.Platform_PLATFORM_NINTENDO,
	37:  gamesv1.Platform_PLATFORM_NINTENDO,
	20:  gamesv1.Platform_PLATFORM_NINTENDO,
	24:  gamesv1.Platform_PLATFORM_NINTENDO,
	33:  gamesv1.Platform_PLATFORM_NINTENDO,

	6:  gamesv1.Platform_PLATFORM_PC,
	14: gamesv1.Platform_PLATFORM_PC,
	3:  gamesv1.Platform_PLATFORM_PC,
}

var brandPriority = []gamesv1.Platform{
	gamesv1.Platform_PLATFORM_NINTENDO,
	gamesv1.Platform_PLATFORM_XBOX,
	gamesv1.Platform_PLATFORM_PLAYSTATION,
	gamesv1.Platform_PLATFORM_PC,
}

var gameKindByType = map[int]gamesv1.GameKind{
	0: gamesv1.GameKind_GAME_KIND_GAME,
	1: gamesv1.GameKind_GAME_KIND_DLC,
	2: gamesv1.GameKind_GAME_KIND_EXPANSION,
	4: gamesv1.GameKind_GAME_KIND_EXPANSION,
}

var esrbRatingText = map[int]string{
	8:  "E",
	9:  "E10+",
	10: "T",
	11: "M",
	12: "AO",
}

var pegiRatingText = map[int]string{
	1: "3",
	2: "7",
	3: "12",
	4: "16",
	5: "18",
}

const (
	ageCategoryESRB = 1
	ageCategoryPEGI = 2
)

func MapGameToGame(game *RawGame, filterBrand gamesv1.Platform) *gamesv1.Game {
	trailerKey, complementaryKey := pickTrailer(game.Videos)
	developers, publishers := splitCompanies(game.InvolvedCompanies)

	result := &gamesv1.Game{
		Id:   buildID(game.Name, game.ID),
		Kind: classifyKind(game.GameType),
		Platform:    leadPlatform(game.Platforms, filterBrand),
		Title:       game.Name,
		Overview:    game.Summary,
		ReleaseDate: releaseDate(game.FirstReleaseDate),
		CoverUrl: imageURL(game.Cover.ImageID, coverSize),
		HeroImageUrl: heroImageURL(game),
		Genres:       genreNames(game.Genres),
		PrimaryLanguage: "",
		AudioLanguages:  nil,
		TrailerYoutubeKey:       trailerKey,
		ComplementaryYoutubeKey: complementaryKey,
		Images:                  buildGallery(game.Screenshots),
		Ratings:                 buildRatings(game),
		Availability:            buildAvailability(game.Platforms),
		Developers: developers,
		Publishers: publishers,
		AgeRating:  ageRatingText(game.AgeRatings),
		PlaytimeEstimate: "",
		FreeToPlay:       false,
		EarlyAccess:      false,
		Multiplayer:      false,
		Hypes: int32(game.Hypes),
		VoiceCast: nil,
	}

	for _, collectionRef := range game.Collections {
		if collectionRef.Name != "" {
			result.Franchise = &gamesv1.Collection{
				Name:  collectionRef.Name,
				Items: nil,
			}
			break
		}
	}

	return result
}

func buildID(name string, igdbID int) string {
	return slugify(name) + idSuffix + strconv.Itoa(igdbID)
}

func slugify(text string) string {
	normalized := norm.NFD.String(strings.ToLower(text))

	var builder strings.Builder
	previousWasHyphen := false

	for _, character := range normalized {
		switch {
		case unicode.Is(unicode.Mn, character):
			continue
		case character < unicode.MaxASCII && unicode.IsLetter(character):
			builder.WriteRune(character)
			previousWasHyphen = false
		case character < unicode.MaxASCII && unicode.IsDigit(character):
			builder.WriteRune(character)
			previousWasHyphen = false
		default:
			if !previousWasHyphen {
				builder.WriteRune('-')
				previousWasHyphen = true
			}
		}
	}

	slug := strings.Trim(builder.String(), "-")

	if slug == "" {
		return fallbackSlug
	}
	return slug
}

const igdbImageBaseURL = "https://images.igdb.com/igdb/image/upload/"

func imageURL(imageID, size string) string {
	if imageID == "" {
		return ""
	}
	return igdbImageBaseURL + size + "/" + imageID + ".jpg"
}

func heroImageURL(game *RawGame) string {
	if len(game.Screenshots) > 0 {
		return imageURL(game.Screenshots[0].ImageID, heroSize)
	}
	if len(game.Artworks) > 0 {
		return imageURL(game.Artworks[0].ImageID, heroSize)
	}
	return ""
}

func buildGallery(screenshots []igdbImage) []*gamesv1.Image {
	if len(screenshots) == 0 {
		return nil
	}
	gallery := make([]*gamesv1.Image, 0, maxGalleryImages)
	for _, shot := range screenshots {
		if shot.ImageID == "" {
			continue
		}
		gallery = append(gallery, &gamesv1.Image{
			Url:   imageURL(shot.ImageID, heroSize),
			Label: fmt.Sprintf("Gameplay %02d", len(gallery)+1),
		})
		if len(gallery) >= maxGalleryImages {
			break
		}
	}
	if len(gallery) == 0 {
		return nil
	}
	return gallery
}

func classifyPlatform(id int) gamesv1.Platform {
	if brand, ok := platformBrand[id]; ok {
		return brand
	}
	return gamesv1.Platform_PLATFORM_UNSPECIFIED
}

func leadPlatform(platforms []igdbPlatform, filterBrand gamesv1.Platform) gamesv1.Platform {
	present := make(map[gamesv1.Platform]bool, len(platforms))
	for _, platform := range platforms {
		brand := classifyPlatform(platform.ID)
		if brand != gamesv1.Platform_PLATFORM_UNSPECIFIED {
			present[brand] = true
		}
	}

	if filterBrand != gamesv1.Platform_PLATFORM_UNSPECIFIED && present[filterBrand] {
		return filterBrand
	}

	for _, brand := range brandPriority {
		if present[brand] {
			return brand
		}
	}

	return gamesv1.Platform_PLATFORM_UNSPECIFIED
}

func platformNames(platforms []igdbPlatform) []string {
	if len(platforms) == 0 {
		return nil
	}
	names := make([]string, 0, len(platforms))
	for _, platform := range platforms {
		if name := platformLabel(platform); name != "" {
			names = append(names, name)
		}
	}
	if len(names) == 0 {
		return nil
	}
	return names
}

func platformLabel(platform igdbPlatform) string {
	if abbreviation := strings.TrimSpace(platform.Abbreviation); abbreviation != "" {
		return abbreviation
	}
	return strings.TrimSpace(platform.Name)
}

func buildAvailability(platforms []igdbPlatform) *gamesv1.GameAvailability {
	return &gamesv1.GameAvailability{
		Platforms: platformNames(platforms),
		Storefronts:          nil,
		SubscriptionServices: nil,
		DubLanguages: nil,
		SubLanguages: nil,
	}
}

func classifyKind(gameType int) gamesv1.GameKind {
	if kind, ok := gameKindByType[gameType]; ok {
		return kind
	}
	return gamesv1.GameKind_GAME_KIND_GAME
}

func releaseDate(unixSeconds int64) string {
	if unixSeconds == 0 {
		return ""
	}
	return time.Unix(unixSeconds, 0).UTC().Format("2006-01-02")
}

func genreNames(genres []igdbNamed) []string {
	if len(genres) == 0 {
		return nil
	}
	names := make([]string, 0, len(genres))
	for _, genre := range genres {
		if genre.Name != "" {
			names = append(names, genre.Name)
		}
	}
	if len(names) == 0 {
		return nil
	}
	return names
}

func buildRatings(game *RawGame) *gamesv1.GameRatings {
	criticValue, criticCount := criticSource(game)
	return &gamesv1.GameRatings{
		Critic: normalizeCritic(criticValue, criticCount),
		Metacritic: "",
		Opencritic: "",
		Steam:      "",
	}
}

func criticSource(game *RawGame) (float64, int) {
	if game.AggregatedRating > 0 {
		return game.AggregatedRating, game.AggregatedRatingCount
	}
	return game.TotalRating, game.TotalRatingCount
}

func normalizeCritic(aggregated float64, count int) float64 {
	if count < minRatingCount || aggregated <= 0 {
		return 0.0
	}
	scaled := aggregated / criticScaleDivisor
	return roundToOneDecimal(scaled)
}

func roundToOneDecimal(value float64) float64 {
	return float64(int64(value*10+0.5)) / 10
}

func ageRatingText(ratings []igdbAgeRating) string {
	if len(ratings) == 0 {
		return ""
	}
	labels := make([]string, 0, len(ratings))
	for _, rating := range ratings {
		if label := singleAgeRatingText(rating); label != "" {
			labels = append(labels, label)
		}
	}
	if len(labels) == 0 {
		return ""
	}
	return strings.Join(labels, " / ")
}

func singleAgeRatingText(rating igdbAgeRating) string {
	switch rating.Category {
	case ageCategoryESRB:
		if text, ok := esrbRatingText[rating.Rating]; ok {
			return "ESRB " + text
		}
	case ageCategoryPEGI:
		if text, ok := pegiRatingText[rating.Rating]; ok {
			return "PEGI " + text
		}
	}
	return ""
}

const trailerNameHint = "trailer"

var complementaryNameHints = []string{
	"gameplay",
	"developer",
	"dev diary",
	"dev ",
	"behind the scenes",
	"making of",
	"making-of",
	"diary",
	"walkthrough",
	"demo",
}

const commentaryHint = "commentary"

func pickTrailer(videos []igdbVideo) (string, string) {
	trailerIndex := -1
	for index, video := range videos {
		if video.VideoID == "" {
			continue
		}
		if strings.Contains(strings.ToLower(video.Name), trailerNameHint) {
			trailerIndex = index
			break
		}
	}

	if trailerIndex == -1 {
		for index, video := range videos {
			if video.VideoID != "" {
				trailerIndex = index
				break
			}
		}
	}

	if trailerIndex == -1 {
		return "", ""
	}

	trailerKey := videos[trailerIndex].VideoID

	complementaryKey := ""
	for index, video := range videos {
		if index == trailerIndex || video.VideoID == "" {
			continue
		}
		name := strings.ToLower(video.Name)
		if strings.Contains(name, commentaryHint) {
			continue
		}
		for _, hint := range complementaryNameHints {
			if strings.Contains(name, hint) {
				complementaryKey = video.VideoID
				break
			}
		}
		if complementaryKey != "" {
			break
		}
	}
	if complementaryKey == "" {
		for index, video := range videos {
			if index == trailerIndex || video.VideoID == "" {
				continue
			}
			if strings.Contains(strings.ToLower(video.Name), commentaryHint) {
				continue
			}
			complementaryKey = video.VideoID
			break
		}
	}

	return trailerKey, complementaryKey
}

const roleDeveloper = "Desarrollo"

const rolePublisher = "Distribuidora"

func splitCompanies(involved []igdbInvolvedCompany) (developers, publishers []*gamesv1.Credit) {
	seenDevelopers := make(map[string]bool, len(involved))
	seenPublishers := make(map[string]bool, len(involved))
	for _, entry := range involved {
		name := strings.TrimSpace(entry.Company.Name)
		if name == "" {
			continue
		}
		if entry.Developer && !seenDevelopers[name] {
			seenDevelopers[name] = true
			developers = append(developers, &gamesv1.Credit{Name: name, Role: roleDeveloper})
		}
		if entry.Publisher && !seenPublishers[name] {
			seenPublishers[name] = true
			publishers = append(publishers, &gamesv1.Credit{Name: name, Role: rolePublisher})
		}
	}
	return developers, publishers
}

var _ func(*RawGame, gamesv1.Platform) *gamesv1.Game = MapGameToGame
