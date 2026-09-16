#include "persistence.hpp"

#include <algorithm>
#include <cstdio>
#include <fstream>
#include <string>

#ifdef __SWITCH__
#include <switch.h>
#endif

namespace jwtl {
namespace {

void commitStorage() {
#ifdef __SWITCH__
    fsdevCommitDevice("sdmc");
#endif
}

}  // namespace

double PersistentStats::accuracy() const {
    if (totalCardsPlaced <= 0) {
        return 0.0;
    }
    return static_cast<double>(correctPlacements) * 100.0
        / static_cast<double>(totalCardsPlaced);
}

bool loadStatsFile(const std::string& path, PersistentStats& stats) {
    std::ifstream input(path);
    std::string header;
    PersistentStats loaded;
    if (!(input >> header) || header != "JWTL_STATS_V1") {
        return false;
    }
    if (!(
        input
        >> loaded.gamesPlayed
        >> loaded.gamesWon
        >> loaded.gamesLost
        >> loaded.totalCardsPlaced
        >> loaded.correctPlacements
        >> loaded.incorrectPlacements
        >> loaded.longestWinStreak
        >> loaded.currentWinStreak
        >> loaded.fastestWinSeconds
        >> loaded.totalPlaySeconds
    )) {
        return false;
    }

    if (
        loaded.gamesPlayed < 0
        || loaded.gamesWon < 0
        || loaded.gamesLost < 0
        || loaded.gamesWon + loaded.gamesLost != loaded.gamesPlayed
        || loaded.totalCardsPlaced < 0
        || loaded.correctPlacements < 0
        || loaded.incorrectPlacements < 0
        || loaded.correctPlacements + loaded.incorrectPlacements != loaded.totalCardsPlaced
        || loaded.longestWinStreak < 0
        || loaded.currentWinStreak < 0
        || loaded.fastestWinSeconds < -1
        || loaded.totalPlaySeconds < 0
    ) {
        return false;
    }

    stats = loaded;
    return true;
}

bool saveStatsFile(const std::string& path, const PersistentStats& stats) {
    const std::string temporaryPath = path + ".tmp";
    std::ofstream output(temporaryPath, std::ios::trunc);
    if (!output) {
        return false;
    }
    output
        << "JWTL_STATS_V1\n"
        << stats.gamesPlayed << ' '
        << stats.gamesWon << ' '
        << stats.gamesLost << ' '
        << stats.totalCardsPlaced << ' '
        << stats.correctPlacements << ' '
        << stats.incorrectPlacements << ' '
        << stats.longestWinStreak << ' '
        << stats.currentWinStreak << ' '
        << stats.fastestWinSeconds << ' '
        << stats.totalPlaySeconds << '\n';
    output.close();
    if (!output) {
        std::remove(temporaryPath.c_str());
        return false;
    }
    std::remove(path.c_str());
    if (std::rename(temporaryPath.c_str(), path.c_str()) != 0) {
        std::remove(temporaryPath.c_str());
        return false;
    }
    commitStorage();
    return true;
}

void recordCompletedGame(PersistentStats& stats, const Game& game, std::int64_t endedAtUnix) {
    if (game.isStudyMode() || !game.isGameOver()) {
        return;
    }

    const bool playerWon = game.winnerIndex() == 0;
    ++stats.gamesPlayed;
    if (playerWon) {
        ++stats.gamesWon;
        ++stats.currentWinStreak;
        stats.longestWinStreak = std::max(stats.longestWinStreak, stats.currentWinStreak);
    } else {
        ++stats.gamesLost;
        stats.currentWinStreak = 0;
    }

    stats.totalCardsPlaced += game.sessionPlacements();
    stats.correctPlacements += game.sessionCorrect();
    stats.incorrectPlacements += game.sessionIncorrect();

    const std::int64_t duration = std::max<std::int64_t>(0, endedAtUnix - game.sessionStartUnix());
    stats.totalPlaySeconds += duration;
    if (playerWon && (stats.fastestWinSeconds < 0 || duration < stats.fastestWinSeconds)) {
        stats.fastestWinSeconds = duration;
    }
}

bool loadGameFile(const std::string& path, Game& game) {
    std::ifstream input(path);
    return input && game.load(input);
}

bool saveGameFile(const std::string& path, const Game& game) {
    const std::string temporaryPath = path + ".tmp";
    std::ofstream output(temporaryPath, std::ios::trunc);
    if (!output || !game.save(output)) {
        std::remove(temporaryPath.c_str());
        return false;
    }
    output.close();
    if (!output) {
        std::remove(temporaryPath.c_str());
        return false;
    }
    std::remove(path.c_str());
    if (std::rename(temporaryPath.c_str(), path.c_str()) != 0) {
        std::remove(temporaryPath.c_str());
        return false;
    }
    commitStorage();
    return true;
}

bool deleteGameFile(const std::string& path) {
    if (!fileExists(path)) {
        return true;
    }
    if (std::remove(path.c_str()) != 0) {
        return false;
    }
    commitStorage();
    return true;
}

bool fileExists(const std::string& path) {
    std::ifstream input(path);
    return static_cast<bool>(input);
}

}  // namespace jwtl
