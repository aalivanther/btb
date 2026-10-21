package igdb

import (
	"strings"
	"testing"

	gamesv1 "btb/gen/btb/games/v1"
)

func TestMapGameToGame(t *testing.T) {
	t.Parallel()

	game := &RawGame{
		ID:               1234,
		Name:             "The Legend of Zelda: Tears of the Kingdom",
		Summary:          "Una aventura épica por Hyrule y los cielos.",
		FirstReleaseDate: 1623200400,
		Cover:            igdbImage{ImageID: "co1cover"},
		Screenshots: []igdbImage{
			{ImageID: "scshot1"},
			{ImageID: "scshot2"},
		},
		Artworks: []igdbImage{
			{ImageID: "art1"},
		},
		Genres: []igdbNamed{
			{Name: "Aventura"},
			{Name: "RPG"},
		},
		Platforms: []igdbPlatform{
			{ID: 130, Name: "Nintendo Switch", Abbreviation: "NSW"},
			{ID: 167, Name: "PlayStation 5", Abbreviation: "PS5"},
			{ID: 6, Name: "PC (Microsoft Windows)", Abbreviation: "PC"},
		},
		InvolvedCompanies: []igdbInvolvedCompany{
			{Company: igdbNamed{Name: "Nintendo"}, Developer: true, Publisher: true},
			{Company: igdbNamed{Name: "Monolith Soft"}, Developer: true, Publisher: false},
		},
		AgeRatings: []igdbAgeRating{
			{Category: ageCategoryESRB, Rating: 9},
			{Category: ageCategoryPEGI, Rating: 2},
		},
		Videos: []igdbVideo{
			{Name: "Gameplay Walkthrough", VideoID: "gameplayKEY"},
			{Name: "Official Trailer", VideoID: "trailerKEY"},
		},
		AggregatedRating:      96.0,
		AggregatedRatingCount: 50,
		TotalRating:           94.0,
		Collections:           []igdbCollectionRef{{ID: 106, Name: "The Legend of Zelda"}},
		GameType:              0,
	}

	result := MapGameToGame(game, gamesv1.Platform_PLATFORM_UNSPECIFIED)

	wantID := "the-legend-of-zelda-tears-of-the-kingdom-igdb-1234"
	if result.GetId() != wantID {
		t.Errorf("Id = %q, want %q", result.GetId(), wantID)
	}

	if result.GetKind() != gamesv1.GameKind_GAME_KIND_GAME {
		t.Errorf("Kind = %v, want GAME_KIND_GAME", result.GetKind())
	}

	if result.GetPlatform() != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("Platform = %v, want PLATFORM_NINTENDO (priority winner)", result.GetPlatform())
	}

	if result.GetTitle() != "The Legend of Zelda: Tears of the Kingdom" {
		t.Errorf("Title = %q, want %q", result.GetTitle(), "The Legend of Zelda: Tears of the Kingdom")
	}
	if result.GetOverview() != "Una aventura épica por Hyrule y los cielos." {
		t.Errorf("Overview = %q, want the summary text", result.GetOverview())
	}

	if result.GetReleaseDate() != "2021-06-09" {
		t.Errorf("ReleaseDate = %q, want %q", result.GetReleaseDate(), "2021-06-09")
	}

	if result.GetCoverUrl() == "" {
		t.Error("CoverUrl is empty, want a non-empty image URL")
	}
	if !strings.HasSuffix(result.GetCoverUrl(), "/co1cover.jpg") {
		t.Errorf("CoverUrl = %q, want it to end with %q", result.GetCoverUrl(), "/co1cover.jpg")
	}
	if !strings.Contains(result.GetCoverUrl(), "/"+coverSize+"/") {
		t.Errorf("CoverUrl = %q, want it to contain the cover size %q", result.GetCoverUrl(), coverSize)
	}

	if !strings.HasSuffix(result.GetHeroImageUrl(), "/scshot1.jpg") {
		t.Errorf("HeroImageUrl = %q, want it to end with the first screenshot %q", result.GetHeroImageUrl(), "/scshot1.jpg")
	}
	if !strings.Contains(result.GetHeroImageUrl(), "/"+heroSize+"/") {
		t.Errorf("HeroImageUrl = %q, want it to contain the hero size %q", result.GetHeroImageUrl(), heroSize)
	}

	wantGenres := []string{"Aventura", "RPG"}
	if len(result.GetGenres()) != len(wantGenres) {
		t.Fatalf("Genres = %v, want %v", result.GetGenres(), wantGenres)
	}
	for index, wantGenre := range wantGenres {
		if result.GetGenres()[index] != wantGenre {
			t.Errorf("Genres[%d] = %q, want %q", index, result.GetGenres()[index], wantGenre)
		}
	}

	if result.GetTrailerYoutubeKey() != "trailerKEY" {
		t.Errorf("TrailerYoutubeKey = %q, want %q", result.GetTrailerYoutubeKey(), "trailerKEY")
	}
	if result.GetComplementaryYoutubeKey() != "gameplayKEY" {
		t.Errorf("ComplementaryYoutubeKey = %q, want %q", result.GetComplementaryYoutubeKey(), "gameplayKEY")
	}

	if len(result.GetImages()) != 2 {
		t.Fatalf("Images has %d entries, want 2", len(result.GetImages()))
	}
	if result.GetImages()[0].GetLabel() != "Gameplay 01" {
		t.Errorf("Images[0].Label = %q, want %q", result.GetImages()[0].GetLabel(), "Gameplay 01")
	}

	if result.GetRatings().GetCritic() != 9.6 {
		t.Errorf("Ratings.Critic = %v, want %v", result.GetRatings().GetCritic(), 9.6)
	}
	if result.GetRatings().GetMetacritic() != "" || result.GetRatings().GetOpencritic() != "" || result.GetRatings().GetSteam() != "" {
		t.Errorf("Ratings text scores = {%q, %q, %q}, want all empty (manual curation)",
			result.GetRatings().GetMetacritic(), result.GetRatings().GetOpencritic(), result.GetRatings().GetSteam())
	}

	wantPlatforms := []string{"NSW", "PS5", "PC"}
	platforms := result.GetAvailability().GetPlatforms()
	if len(platforms) != len(wantPlatforms) {
		t.Fatalf("Availability.Platforms = %v, want %v", platforms, wantPlatforms)
	}
	for index, wantPlatform := range wantPlatforms {
		if platforms[index] != wantPlatform {
			t.Errorf("Availability.Platforms[%d] = %q, want %q", index, platforms[index], wantPlatform)
		}
	}

	developers := result.GetDevelopers()
	if len(developers) != 2 {
		t.Fatalf("Developers = %+v, want 2 entries", developers)
	}
	if developers[0].GetName() != "Nintendo" || developers[0].GetRole() != roleDeveloper {
		t.Errorf("Developers[0] = {name=%q, role=%q}, want {Nintendo, %q}",
			developers[0].GetName(), developers[0].GetRole(), roleDeveloper)
	}
	if developers[1].GetName() != "Monolith Soft" {
		t.Errorf("Developers[1].Name = %q, want %q", developers[1].GetName(), "Monolith Soft")
	}

	publishers := result.GetPublishers()
	if len(publishers) != 1 {
		t.Fatalf("Publishers = %+v, want 1 entry (only Nintendo)", publishers)
	}
	if publishers[0].GetName() != "Nintendo" || publishers[0].GetRole() != rolePublisher {
		t.Errorf("Publishers[0] = {name=%q, role=%q}, want {Nintendo, %q}",
			publishers[0].GetName(), publishers[0].GetRole(), rolePublisher)
	}

	if result.GetAgeRating() != "ESRB E10+ / PEGI 7" {
		t.Errorf("AgeRating = %q, want %q", result.GetAgeRating(), "ESRB E10+ / PEGI 7")
	}

	if result.GetFranchise() == nil || result.GetFranchise().GetName() != "The Legend of Zelda" {
		t.Errorf("Franchise = %+v, want name %q", result.GetFranchise(), "The Legend of Zelda")
	}
	if len(result.GetFranchise().GetItems()) != 0 {
		t.Errorf("Franchise.Items = %v, want empty (filled later in seedgen)", result.GetFranchise().GetItems())
	}

	if result.GetPrimaryLanguage() != "" || len(result.GetAudioLanguages()) != 0 {
		t.Errorf("language fields = {%q, %v}, want empty (manual curation)",
			result.GetPrimaryLanguage(), result.GetAudioLanguages())
	}
	if len(result.GetVoiceCast()) != 0 {
		t.Errorf("VoiceCast = %v, want empty (manual curation)", result.GetVoiceCast())
	}
	if result.GetPlaytimeEstimate() != "" || result.GetFreeToPlay() || result.GetEarlyAccess() || result.GetMultiplayer() {
		t.Error("optional curation fields should be empty/false (manual curation)")
	}
	if len(result.GetAvailability().GetStorefronts()) != 0 ||
		len(result.GetAvailability().GetSubscriptionServices()) != 0 ||
		len(result.GetAvailability().GetDubLanguages()) != 0 ||
		len(result.GetAvailability().GetSubLanguages()) != 0 {
		t.Error("Availability storefronts/subscriptions/dub/sub languages should be empty (manual curation)")
	}
}

func TestMapGameToGameWithFilterBrand(t *testing.T) {
	t.Parallel()

	game := &RawGame{
		ID:   42,
		Name: "Super Mario Odyssey",
		Platforms: []igdbPlatform{
			{ID: 130, Name: "Nintendo Switch", Abbreviation: "NSW"},
			{ID: 167, Name: "PlayStation 5", Abbreviation: "PS5"},
		},
		GameType: 0,
	}

	result := MapGameToGame(game, gamesv1.Platform_PLATFORM_NINTENDO)
	if result.GetPlatform() != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("Platform = %v, want PLATFORM_NINTENDO (filter brand present)", result.GetPlatform())
	}

	if result.GetFranchise() != nil {
		t.Errorf("Franchise = %+v, want nil (no collection in fixture)", result.GetFranchise())
	}
}

func TestImageURL(t *testing.T) {
	t.Parallel()

	got := imageURL("co1wyy", coverSize)
	want := igdbImageBaseURL + coverSize + "/co1wyy.jpg"
	if got != want {
		t.Errorf("imageURL(%q, %q) = %q, want %q", "co1wyy", coverSize, got, want)
	}

	if got := imageURL("", coverSize); got != "" {
		t.Errorf("imageURL(empty id) = %q, want empty", got)
	}
}

func TestClassifyPlatform(t *testing.T) {
	t.Parallel()

	cases := []struct {
		platformID int
		want       gamesv1.Platform
	}{
		{platformID: 167, want: gamesv1.Platform_PLATFORM_PLAYSTATION},
		{platformID: 48, want: gamesv1.Platform_PLATFORM_PLAYSTATION},
		{platformID: 169, want: gamesv1.Platform_PLATFORM_XBOX},
		{platformID: 11, want: gamesv1.Platform_PLATFORM_XBOX},
		{platformID: 130, want: gamesv1.Platform_PLATFORM_NINTENDO},
		{platformID: 4, want: gamesv1.Platform_PLATFORM_NINTENDO},
		{platformID: 6, want: gamesv1.Platform_PLATFORM_PC},
		{platformID: 14, want: gamesv1.Platform_PLATFORM_PC},
		{platformID: 99999, want: gamesv1.Platform_PLATFORM_UNSPECIFIED},
	}
	for _, testCase := range cases {
		if got := classifyPlatform(testCase.platformID); got != testCase.want {
			t.Errorf("classifyPlatform(%d) = %v, want %v", testCase.platformID, got, testCase.want)
		}
	}
}

func TestClassifyKind(t *testing.T) {
	t.Parallel()

	cases := []struct {
		gameType int
		want     gamesv1.GameKind
	}{
		{gameType: 0, want: gamesv1.GameKind_GAME_KIND_GAME},
		{gameType: 1, want: gamesv1.GameKind_GAME_KIND_DLC},
		{gameType: 2, want: gamesv1.GameKind_GAME_KIND_EXPANSION},
		{gameType: 4, want: gamesv1.GameKind_GAME_KIND_EXPANSION},
		{gameType: 3, want: gamesv1.GameKind_GAME_KIND_GAME},
		{gameType: 99, want: gamesv1.GameKind_GAME_KIND_GAME},
	}
	for _, testCase := range cases {
		if got := classifyKind(testCase.gameType); got != testCase.want {
			t.Errorf("classifyKind(%d) = %v, want %v", testCase.gameType, got, testCase.want)
		}
	}
}

func TestLeadPlatform(t *testing.T) {
	t.Parallel()

	multi := []igdbPlatform{
		{ID: 130},
		{ID: 167},
		{ID: 6},
	}
	if got := leadPlatform(multi, gamesv1.Platform_PLATFORM_UNSPECIFIED); got != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("leadPlatform(multi, no filter) = %v, want PLATFORM_NINTENDO (priority)", got)
	}

	if got := leadPlatform(multi, gamesv1.Platform_PLATFORM_NINTENDO); got != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("leadPlatform(multi, filter Nintendo) = %v, want PLATFORM_NINTENDO (filter wins)", got)
	}

	if got := leadPlatform(multi, gamesv1.Platform_PLATFORM_XBOX); got != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("leadPlatform(multi, filter Xbox absent) = %v, want PLATFORM_NINTENDO (fallback to priority)", got)
	}

	nintendoAndPC := []igdbPlatform{
		{ID: 6},
		{ID: 130},
	}
	if got := leadPlatform(nintendoAndPC, gamesv1.Platform_PLATFORM_UNSPECIFIED); got != gamesv1.Platform_PLATFORM_NINTENDO {
		t.Errorf("leadPlatform(Nintendo+PC) = %v, want PLATFORM_NINTENDO (priority over PC)", got)
	}

	unknownOnly := []igdbPlatform{
		{ID: 99999},
		{ID: 88888},
	}
	if got := leadPlatform(unknownOnly, gamesv1.Platform_PLATFORM_UNSPECIFIED); got != gamesv1.Platform_PLATFORM_UNSPECIFIED {
		t.Errorf("leadPlatform(unknown only) = %v, want PLATFORM_UNSPECIFIED", got)
	}

	if got := leadPlatform(nil, gamesv1.Platform_PLATFORM_UNSPECIFIED); got != gamesv1.Platform_PLATFORM_UNSPECIFIED {
		t.Errorf("leadPlatform(empty) = %v, want PLATFORM_UNSPECIFIED", got)
	}
}

func TestNormalizeCritic(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name       string
		aggregated float64
		count      int
		want       float64
	}{
		{name: "alta fiable", aggregated: 96.0, count: 50, want: 9.6},
		{name: "redondeo hacia arriba", aggregated: 87.5, count: 10, want: 8.8},
		{name: "redondeo hacia abajo", aggregated: 84.9, count: 10, want: 8.5},
		{name: "minimo de resenas", aggregated: 75.0, count: minRatingCount, want: 7.5},
		{name: "pocas resenas", aggregated: 99.0, count: minRatingCount - 1, want: 0.0},
		{name: "nota ausente", aggregated: 0.0, count: 100, want: 0.0},
		{name: "nota negativa", aggregated: -5.0, count: 100, want: 0.0},
	}
	for _, testCase := range cases {
		if got := normalizeCritic(testCase.aggregated, testCase.count); got != testCase.want {
			t.Errorf("normalizeCritic(%v, %d) [%s] = %v, want %v",
				testCase.aggregated, testCase.count, testCase.name, got, testCase.want)
		}
	}
}

func TestAgeRatingText(t *testing.T) {
	t.Parallel()

	both := []igdbAgeRating{
		{Category: ageCategoryESRB, Rating: 11},
		{Category: ageCategoryPEGI, Rating: 5},
	}
	if got := ageRatingText(both); got != "ESRB M / PEGI 18" {
		t.Errorf("ageRatingText(ESRB M + PEGI 18) = %q, want %q", got, "ESRB M / PEGI 18")
	}

	if got := ageRatingText([]igdbAgeRating{{Category: ageCategoryESRB, Rating: 10}}); got != "ESRB T" {
		t.Errorf("ageRatingText(ESRB T) = %q, want %q", got, "ESRB T")
	}

	mixed := []igdbAgeRating{
		{Category: 99, Rating: 1},
		{Category: ageCategoryPEGI, Rating: 3},
	}
	if got := ageRatingText(mixed); got != "PEGI 12" {
		t.Errorf("ageRatingText(unknown + PEGI 12) = %q, want %q", got, "PEGI 12")
	}

	if got := ageRatingText([]igdbAgeRating{{Category: ageCategoryESRB, Rating: 999}}); got != "" {
		t.Errorf("ageRatingText(unknown ESRB code) = %q, want empty", got)
	}

	if got := ageRatingText(nil); got != "" {
		t.Errorf("ageRatingText(nil) = %q, want empty", got)
	}
}

func TestPickTrailer(t *testing.T) {
	t.Parallel()

	withTrailer := []igdbVideo{
		{Name: "Gameplay Walkthrough", VideoID: "gameplayKEY"},
		{Name: "Official Trailer", VideoID: "trailerKEY"},
	}
	if trailer, complementary := pickTrailer(withTrailer); trailer != "trailerKEY" || complementary != "gameplayKEY" {
		t.Errorf("pickTrailer(with trailer) = (%q, %q), want (trailerKEY, gameplayKEY)", trailer, complementary)
	}

	noTrailerName := []igdbVideo{
		{Name: "Gameplay", VideoID: "firstKEY"},
		{Name: "Dev Diary", VideoID: "secondKEY"},
	}
	if trailer, complementary := pickTrailer(noTrailerName); trailer != "firstKEY" || complementary != "secondKEY" {
		t.Errorf("pickTrailer(no trailer name) = (%q, %q), want (firstKEY, secondKEY)", trailer, complementary)
	}

	single := []igdbVideo{
		{Name: "Reveal Trailer", VideoID: "onlyKEY"},
	}
	if trailer, complementary := pickTrailer(single); trailer != "onlyKEY" || complementary != "" {
		t.Errorf("pickTrailer(single) = (%q, %q), want (onlyKEY, empty)", trailer, complementary)
	}

	withEmptyIDs := []igdbVideo{
		{Name: "Broken Trailer", VideoID: ""},
		{Name: "Gameplay", VideoID: "goodKEY"},
	}
	if trailer, complementary := pickTrailer(withEmptyIDs); trailer != "goodKEY" || complementary != "" {
		t.Errorf("pickTrailer(empty ids) = (%q, %q), want (goodKEY, empty)", trailer, complementary)
	}

	if trailer, complementary := pickTrailer(nil); trailer != "" || complementary != "" {
		t.Errorf("pickTrailer(nil) = (%q, %q), want (empty, empty)", trailer, complementary)
	}
}

func TestSplitCompanies(t *testing.T) {
	t.Parallel()

	involved := []igdbInvolvedCompany{
		{Company: igdbNamed{Name: "Nintendo"}, Developer: true, Publisher: true},
		{Company: igdbNamed{Name: "Monolith Soft"}, Developer: true, Publisher: false},
		{Company: igdbNamed{Name: "Bandai Namco"}, Developer: false, Publisher: true},
		{Company: igdbNamed{Name: "   "}, Developer: true, Publisher: true},
		{Company: igdbNamed{Name: "Sin Rol"}, Developer: false, Publisher: false},
	}

	developers, publishers := splitCompanies(involved)

	if len(developers) != 2 {
		t.Fatalf("developers = %+v, want 2 (Nintendo, Monolith Soft)", developers)
	}
	if developers[0].GetName() != "Nintendo" || developers[0].GetRole() != roleDeveloper {
		t.Errorf("developers[0] = {name=%q, role=%q}, want {Nintendo, %q}",
			developers[0].GetName(), developers[0].GetRole(), roleDeveloper)
	}
	if developers[1].GetName() != "Monolith Soft" {
		t.Errorf("developers[1].Name = %q, want %q", developers[1].GetName(), "Monolith Soft")
	}

	if len(publishers) != 2 {
		t.Fatalf("publishers = %+v, want 2 (Nintendo, Bandai Namco)", publishers)
	}
	if publishers[0].GetName() != "Nintendo" || publishers[0].GetRole() != rolePublisher {
		t.Errorf("publishers[0] = {name=%q, role=%q}, want {Nintendo, %q}",
			publishers[0].GetName(), publishers[0].GetRole(), rolePublisher)
	}
	if publishers[1].GetName() != "Bandai Namco" {
		t.Errorf("publishers[1].Name = %q, want %q", publishers[1].GetName(), "Bandai Namco")
	}

	devEmpty, pubEmpty := splitCompanies(nil)
	if devEmpty != nil || pubEmpty != nil {
		t.Errorf("splitCompanies(nil) = (%v, %v), want (nil, nil)", devEmpty, pubEmpty)
	}
}

func TestBuildIDAndSlugify(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name   string
		title  string
		igdbID int
		want   string
	}{
		{name: "simple", title: "Hollow Knight", igdbID: 26192, want: "hollow-knight-igdb-26192"},
		{name: "subtitulo", title: "Hollow Knight: Silksong", igdbID: 26192, want: "hollow-knight-silksong-igdb-26192"},
		{name: "acentos", title: "Pokémon Légends", igdbID: 1, want: "pokemon-legends-igdb-1"},
	}
	for _, testCase := range cases {
		if got := buildID(testCase.title, testCase.igdbID); got != testCase.want {
			t.Errorf("buildID(%q, %d) [%s] = %q, want %q",
				testCase.title, testCase.igdbID, testCase.name, got, testCase.want)
		}
	}

	if got := slugify("Pokémon Légends"); got != "pokemon-legends" {
		t.Errorf("slugify(%q) = %q, want %q", "Pokémon Légends", got, "pokemon-legends")
	}

	if got := slugify("ドラゴンクエスト"); got != fallbackSlug {
		t.Errorf("slugify(non-latin) = %q, want %q (fallback)", got, fallbackSlug)
	}

	gotID := buildID("ドラゴンクエスト", 99)
	if gotID != "game-igdb-99" {
		t.Errorf("buildID(non-latin) = %q, want %q", gotID, "game-igdb-99")
	}
	if strings.HasPrefix(gotID, "-") {
		t.Errorf("buildID(non-latin) = %q, must not start with a hyphen", gotID)
	}
}
