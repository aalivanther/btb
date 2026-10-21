package rarity

import "testing"

func TestDeriveBoundaries(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		critic float64
		want   Tier
	}{
		{name: "8.5 es el corte exacto de legendary", critic: 8.5, want: TierLegendary},
		{name: "8.49 cae justo por debajo, sigue epic", critic: 8.49, want: TierEpic},

		{name: "7.5 es el corte exacto de epic", critic: 7.5, want: TierEpic},
		{name: "7.49 cae justo por debajo, sigue rare", critic: 7.49, want: TierRare},

		{name: "6.5 es el corte exacto de rare", critic: 6.5, want: TierRare},
		{name: "6.49 cae justo por debajo, sigue common", critic: 6.49, want: TierCommon},

		{name: "0 (sin nota de crítica) es common", critic: 0, want: TierCommon},
		{name: "10 (máximo) es legendary", critic: 10, want: TierLegendary},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			got := Derive(testCase.critic)
			if got != testCase.want {
				t.Errorf("Derive(%v) = %q, want %q", testCase.critic, got, testCase.want)
			}
		})
	}
}

func TestDeriveThresholdConstants(t *testing.T) {
	t.Parallel()

	if ThresholdLegendary != 8.5 {
		t.Errorf("ThresholdLegendary = %v, want 8.5", ThresholdLegendary)
	}
	if ThresholdEpic != 7.5 {
		t.Errorf("ThresholdEpic = %v, want 7.5", ThresholdEpic)
	}
	if ThresholdRare != 6.5 {
		t.Errorf("ThresholdRare = %v, want 6.5", ThresholdRare)
	}
}

func TestDeriveTypicalGameScores(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		critic float64
		want   Tier
	}{
		{name: "9.3 (juego aclamado) es legendary", critic: 9.3, want: TierLegendary},
		{name: "8.0 (muy bien recibido) es epic", critic: 8.0, want: TierEpic},
		{name: "7.0 (notable) es rare", critic: 7.0, want: TierRare},
		{name: "5.5 (crítica tibia) es common", critic: 5.5, want: TierCommon},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			got := Derive(testCase.critic)
			if got != testCase.want {
				t.Errorf("Derive(%v) = %q, want %q", testCase.critic, got, testCase.want)
			}
		})
	}
}
