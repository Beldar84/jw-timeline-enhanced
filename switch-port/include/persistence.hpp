#pragma once

#include "game.hpp"

#include <cstdint>
#include <string>

namespace jwtl {

struct PersistentStats {
    int gamesPlayed = 0;
    int gamesWon = 0;
    int gamesLost = 0;
    int totalCardsPlaced = 0;
    int correctPlacements = 0;
    int incorrectPlacements = 0;
    int longestWinStreak = 0;
    int currentWinStreak = 0;
    std::int64_t fastestWinSeconds = -1;
    std::int64_t totalPlaySeconds = 0;

    double accuracy() const;
};

bool loadStatsFile(const std::string& path, PersistentStats& stats);
bool saveStatsFile(const std::string& path, const PersistentStats& stats);
void recordCompletedGame(PersistentStats& stats, const Game& game, std::int64_t endedAtUnix);

bool loadGameFile(const std::string& path, Game& game);
bool saveGameFile(const std::string& path, const Game& game);
bool deleteGameFile(const std::string& path);
bool fileExists(const std::string& path);

}  // namespace jwtl
