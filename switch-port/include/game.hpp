#pragma once

#include "card_data.hpp"

#include <cstdint>
#include <iosfwd>
#include <optional>
#include <random>
#include <string>
#include <vector>

namespace jwtl {

enum class GameMode : int {
    Local = 0,
    Ai = 1,
    Study = 2,
};

enum class AIDifficulty : int {
    Easy = 0,
    Normal = 1,
    Hard = 2,
    Expert = 3,
};

struct Player {
    std::string name;
    std::vector<int> hand;
    bool isAI = false;
};

struct AiMove {
    int cardId = 0;
    int timelineIndex = 0;
};

struct PlacementResult {
    bool valid = false;
    bool correct = false;
    bool gameOver = false;
    int playerIndex = -1;
    int cardId = 0;
    int timelineIndex = -1;
    int replacementCardId = 0;
    int nextPlayerIndex = -1;
};

class Game {
public:
    bool start(
        GameMode mode,
        const std::string& deckId,
        int localPlayerCount,
        AIDifficulty difficulty,
        std::uint32_t seed
    );

    static bool canPlaceCard(int cardId, const std::vector<int>& timeline, int timelineIndex);

    PlacementResult placeCard(int cardId, int timelineIndex);
    std::optional<AiMove> chooseAiMove();
    PlacementResult playAiTurn();
    bool setPlayerName(int playerIndex, const std::string& name);

    bool save(std::ostream& output) const;
    bool load(std::istream& input);

    GameMode mode() const { return mode_; }
    AIDifficulty difficulty() const { return difficulty_; }
    const std::string& deckId() const { return deckId_; }
    const std::vector<Player>& players() const { return players_; }
    const std::vector<int>& timeline() const { return timeline_; }
    const std::vector<int>& drawPile() const { return drawPile_; }
    const std::vector<int>& discardPile() const { return discardPile_; }
    int currentPlayerIndex() const { return currentPlayerIndex_; }
    int winnerIndex() const { return winnerIndex_; }
    bool isGameOver() const { return winnerIndex_ >= 0; }
    bool isStudyMode() const { return mode_ == GameMode::Study; }

    int sessionPlacements() const { return sessionPlacements_; }
    int sessionCorrect() const { return sessionCorrect_; }
    int sessionIncorrect() const { return sessionIncorrect_; }
    std::int64_t sessionStartUnix() const { return sessionStartUnix_; }

private:
    bool validateLoadedState() const;
    void shuffle(std::vector<int>& values);
    int drawReplacementCard();
    double aiErrorRate() const;

    GameMode mode_ = GameMode::Ai;
    AIDifficulty difficulty_ = AIDifficulty::Normal;
    std::string deckId_ = "complete";
    std::vector<Player> players_;
    std::vector<int> timeline_;
    std::vector<int> drawPile_;
    std::vector<int> discardPile_;
    int currentPlayerIndex_ = 0;
    int winnerIndex_ = -1;
    int sessionPlacements_ = 0;
    int sessionCorrect_ = 0;
    int sessionIncorrect_ = 0;
    std::int64_t sessionStartUnix_ = 0;
    std::mt19937 rng_{};
};

}  // namespace jwtl
