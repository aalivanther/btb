package main

import "testing"

func TestCategoryFor(t *testing.T) {
	cases := []struct {
		name string
		want string
	}{
		{"Official Trailer", "trailer"},
		{"Launch Trailer", "trailer"},
		{"Teaser", "trailer"},
		{"Reveal", "trailer"},
		{"Gameplay Walkthrough", "gameplay"},
		{"15 minutes of gameplay", "gameplay"},
		{"Developer Diary #1", "dev_diary"},
		{"Behind the Scenes", "dev_diary"},
		{"Developer Commentary", "dev_diary"},
		{"Story", "otro"},
		{"", "otro"},
		{"Developer Gameplay", "dev_diary"},
	}
	for _, tc := range cases {
		if got := categoryFor(tc.name); got != tc.want {
			t.Errorf("categoryFor(%q) = %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestSortTrailerFirst(t *testing.T) {
	videos := []Video{
		{Key: "a", Name: "Gameplay", Category: "gameplay"},
		{Key: "b", Name: "Dev Diary", Category: "dev_diary"},
		{Key: "c", Name: "Official Trailer", Category: "trailer"},
		{Key: "d", Name: "Teaser", Category: "trailer"},
	}
	sortTrailerFirst(videos)
	want := []string{"c", "a", "b", "d"}
	for i, key := range want {
		if videos[i].Key != key {
			t.Errorf("posición %d = %q, want %q (orden=%v)", i, videos[i].Key, key, keysOf(videos))
		}
	}

	noTrailer := []Video{
		{Key: "x", Name: "Gameplay", Category: "gameplay"},
		{Key: "y", Name: "Dev Diary", Category: "dev_diary"},
	}
	sortTrailerFirst(noTrailer)
	if noTrailer[0].Key != "x" || noTrailer[1].Key != "y" {
		t.Errorf("sin tráiler el orden cambió: %v", keysOf(noTrailer))
	}
}

func keysOf(videos []Video) []string {
	keys := make([]string, len(videos))
	for i, v := range videos {
		keys[i] = v.Key
	}
	return keys
}
