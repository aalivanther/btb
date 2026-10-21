package rarity

type Tier string

const (
	TierLegendary Tier = "legendary"
	TierEpic Tier = "epic"
	TierRare Tier = "rare"
	TierCommon Tier = "common"
)

const (
	ThresholdLegendary float64 = 8.5
	ThresholdEpic float64 = 7.5
	ThresholdRare float64 = 6.5
)

func Derive(critic float64) Tier {
	switch {
	case critic >= ThresholdLegendary:
		return TierLegendary
	case critic >= ThresholdEpic:
		return TierEpic
	case critic >= ThresholdRare:
		return TierRare
	default:
		return TierCommon
	}
}
