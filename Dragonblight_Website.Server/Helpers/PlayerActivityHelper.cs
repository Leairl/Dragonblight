
using ArgentPonyWarcraftClient;

namespace Dragonblight_Website.Server.Helpers;

public static class PlayerActivityHelper
    {
        public static PlayerActivity NewPlayerActivity(PvpLeaderboardEntry oldPlayer, PvpLeaderboardEntry newPlayer, string specName)
        {
            var OldPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
            {
                Character = oldPlayer.Character,
                Faction = oldPlayer.Faction,
                Rank = oldPlayer.Rank,
                Rating = oldPlayer.Rating,
                SeasonMatchStatistics = oldPlayer.SeasonMatchStatistics,
                Tier = oldPlayer.Tier,
                Time = DateTime.Now.Subtract(TimeSpan.FromHours(3))
            };
            var NewPvpLeaderboardEntryandTime = new PvpLeaderboardEntryandTime
            {
                Character = newPlayer.Character,
                Faction = newPlayer.Faction,
                Rank = newPlayer.Rank,
                Rating = newPlayer.Rating,
                SeasonMatchStatistics = newPlayer.SeasonMatchStatistics,
                Tier = newPlayer.Tier,
                Time = DateTime.Now
            };
            var newPlayerActivity = new PlayerActivity
            {
                OldPlayer = OldPvpLeaderboardEntryandTime,
                NewPlayer = NewPvpLeaderboardEntryandTime,
                Spec = specName
            };
            return newPlayerActivity;
        }
    }