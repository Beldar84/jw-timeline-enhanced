#include "game.hpp"

#include <algorithm>
#include <ctime>
#include <iomanip>
#include <istream>
#include <ostream>
#include <set>
#include <string>

namespace jwtl {
namespace {

bool readLabel(std::istream& input, const char* expected) {
    std::string label;
    return static_cast<bool>(input >> label) && label == expected;
}

bool validCardId(int cardId) {
    return findCard(cardId) != nullptr;
}

}  // namespace

bool Game::start(
    GameMode mode,
    const std::string& deckId,
    int localPlayerCount,
    AIDifficulty difficulty,
    std::uint32_t seed
) {
    mode_ = mode;
    difficulty_ = difficulty;
    deckId_ = deckId;
    rng_.seed(seed);
    winnerIndex_ = -1;
    currentPlayerIndex_ = 0;
    sessionPlacements_ = 0;
    sessionCorrect_ = 0;
    sessionIncorrect_ = 0;
    sessionStartUnix_ = static_cast<std::int64_t>(std::time(nullptr));
    players_.clear();
    timeline_.clear();
    drawPile_.clear();
    discardPile_.clear();

    const auto ids = cardIdsForDeck(deckId);
    if (ids.empty()) {
        return false;
    }
    drawPile_ = ids;
    shuffle(drawPile_);

    const int playerCount = mode == GameMode::Local
        ? std::max(2, std::min(6, localPlayerCount))
        : 2;
    if (static_cast<int>(drawPile_.size()) <= playerCount) {
        return false;
    }

    players_.reserve(playerCount);
    for (int index = 0; index < playerCount; ++index) {
        Player player;
        player.name = mode == GameMode::Local
            ? "Jugador " + std::to_string(index + 1)
            : (index == 0 ? (mode == GameMode::Study ? "Estudiante" : "Jugador") : "David");
        player.isAI = mode != GameMode::Local && index > 0;
        players_.push_back(std::move(player));
    }

    timeline_.push_back(drawPile_.back());
    drawPile_.pop_back();

    const int initialHandSize = std::min(
        4,
        static_cast<int>(drawPile_.size()) / playerCount
    );
    if (initialHandSize <= 0) {
        return false;
    }

    for (int round = 0; round < initialHandSize; ++round) {
        for (auto& player : players_) {
            player.hand.push_back(drawPile_.back());
            drawPile_.pop_back();
        }
    }
    return true;
}

bool Game::canPlaceCard(int cardId, const std::vector<int>& timeline, int timelineIndex) {
    if (timelineIndex < 0 || timelineIndex > static_cast<int>(timeline.size())) {
        return false;
    }

    const Card* card = findCard(cardId);
    if (!card) {
        return false;
    }

    const Card* previous = timelineIndex > 0 ? findCard(timeline[timelineIndex - 1]) : nullptr;
    const Card* next = timelineIndex < static_cast<int>(timeline.size())
        ? findCard(timeline[timelineIndex])
        : nullptr;
    if ((timelineIndex > 0 && !previous) || (timelineIndex < static_cast<int>(timeline.size()) && !next)) {
        return false;
    }

    const bool afterPrevious = !previous || card->year >= previous->year;
    const bool beforeNext = !next || card->year <= next->year;
    return afterPrevious && beforeNext;
}

PlacementResult Game::placeCard(int cardId, int timelineIndex) {
    PlacementResult result;
    if (
        winnerIndex_ >= 0
        || currentPlayerIndex_ < 0
        || currentPlayerIndex_ >= static_cast<int>(players_.size())
        || timelineIndex < 0
        || timelineIndex > static_cast<int>(timeline_.size())
    ) {
        return result;
    }

    Player& player = players_[currentPlayerIndex_];
    const auto cardIt = std::find(player.hand.begin(), player.hand.end(), cardId);
    if (cardIt == player.hand.end()) {
        return result;
    }

    result.valid = true;
    result.playerIndex = currentPlayerIndex_;
    result.cardId = cardId;
    result.timelineIndex = timelineIndex;
    result.correct = canPlaceCard(cardId, timeline_, timelineIndex);

    if (currentPlayerIndex_ == 0 && !isStudyMode()) {
        ++sessionPlacements_;
        if (result.correct) {
            ++sessionCorrect_;
        } else {
            ++sessionIncorrect_;
        }
    }

    player.hand.erase(cardIt);
    if (result.correct) {
        timeline_.insert(timeline_.begin() + timelineIndex, cardId);
    } else {
        discardPile_.push_back(cardId);
        if (!isStudyMode()) {
            result.replacementCardId = drawReplacementCard();
            if (result.replacementCardId != 0) {
                player.hand.push_back(result.replacementCardId);
            } else {
                player.hand.push_back(cardId);
                discardPile_.erase(
                    std::remove(discardPile_.begin(), discardPile_.end(), cardId),
                    discardPile_.end()
                );
            }
        }
    }

    if (player.hand.empty()) {
        winnerIndex_ = currentPlayerIndex_;
        result.gameOver = true;
        result.nextPlayerIndex = currentPlayerIndex_;
        return result;
    }

    currentPlayerIndex_ = (currentPlayerIndex_ + 1) % static_cast<int>(players_.size());
    result.nextPlayerIndex = currentPlayerIndex_;
    return result;
}

std::optional<AiMove> Game::chooseAiMove() {
    if (
        winnerIndex_ >= 0
        || currentPlayerIndex_ < 0
        || currentPlayerIndex_ >= static_cast<int>(players_.size())
        || !players_[currentPlayerIndex_].isAI
        || players_[currentPlayerIndex_].hand.empty()
    ) {
        return std::nullopt;
    }

    const Player& player = players_[currentPlayerIndex_];
    std::vector<AiMove> validMoves;
    for (const int cardId : player.hand) {
        for (int timelineIndex = 0; timelineIndex <= static_cast<int>(timeline_.size()); ++timelineIndex) {
            if (canPlaceCard(cardId, timeline_, timelineIndex)) {
                validMoves.push_back({cardId, timelineIndex});
            }
        }
    }

    std::uniform_real_distribution<double> chance(0.0, 1.0);
    if (!validMoves.empty() && chance(rng_) >= aiErrorRate()) {
        std::uniform_int_distribution<std::size_t> validMoveIndex(0, validMoves.size() - 1);
        return validMoves[validMoveIndex(rng_)];
    }

    std::uniform_int_distribution<std::size_t> handIndex(0, player.hand.size() - 1);
    std::uniform_int_distribution<int> slotIndex(0, static_cast<int>(timeline_.size()));
    return AiMove{player.hand[handIndex(rng_)], slotIndex(rng_)};
}

PlacementResult Game::playAiTurn() {
    const auto move = chooseAiMove();
    if (!move) {
        return {};
    }
    return placeCard(move->cardId, move->timelineIndex);
}

bool Game::setPlayerName(int playerIndex, const std::string& name) {
    if (
        playerIndex < 0
        || playerIndex >= static_cast<int>(players_.size())
        || name.empty()
        || name.size() > 48
    ) {
        return false;
    }
    players_[playerIndex].name = name;
    return true;
}

bool Game::save(std::ostream& output) const {
    if (!output) {
        return false;
    }

    output << "JWTL_GAME_V1\n";
    output << "mode " << static_cast<int>(mode_) << '\n';
    output << "difficulty " << static_cast<int>(difficulty_) << '\n';
    output << "deck " << std::quoted(deckId_) << '\n';
    output << "current " << currentPlayerIndex_ << '\n';
    output << "winner " << winnerIndex_ << '\n';
    output << "session " << sessionPlacements_ << ' ' << sessionCorrect_ << ' '
           << sessionIncorrect_ << ' ' << sessionStartUnix_ << '\n';

    const auto writeIds = [&output](const char* label, const std::vector<int>& ids) {
        output << label << ' ' << ids.size();
        for (const int id : ids) {
            output << ' ' << id;
        }
        output << '\n';
    };
    writeIds("timeline", timeline_);
    writeIds("draw", drawPile_);
    writeIds("discard", discardPile_);

    output << "players " << players_.size() << '\n';
    for (const auto& player : players_) {
        output << "player " << (player.isAI ? 1 : 0) << ' ' << std::quoted(player.name)
               << ' ' << player.hand.size();
        for (const int id : player.hand) {
            output << ' ' << id;
        }
        output << '\n';
    }
    output << "rng " << rng_ << '\n';
    output << "end\n";
    return static_cast<bool>(output);
}

bool Game::load(std::istream& input) {
    std::string header;
    if (!(input >> header) || header != "JWTL_GAME_V1") {
        return false;
    }

    int modeValue = 0;
    int difficultyValue = 0;
    if (!readLabel(input, "mode") || !(input >> modeValue)) return false;
    if (!readLabel(input, "difficulty") || !(input >> difficultyValue)) return false;
    if (!readLabel(input, "deck") || !(input >> std::quoted(deckId_))) return false;
    if (!readLabel(input, "current") || !(input >> currentPlayerIndex_)) return false;
    if (!readLabel(input, "winner") || !(input >> winnerIndex_)) return false;
    if (
        !readLabel(input, "session")
        || !(input >> sessionPlacements_ >> sessionCorrect_ >> sessionIncorrect_ >> sessionStartUnix_)
    ) {
        return false;
    }

    mode_ = static_cast<GameMode>(modeValue);
    difficulty_ = static_cast<AIDifficulty>(difficultyValue);

    const auto readIds = [&input](const char* label, std::vector<int>& ids) {
        std::size_t count = 0;
        if (!readLabel(input, label) || !(input >> count) || count > allCards().size()) {
            return false;
        }
        ids.clear();
        ids.reserve(count);
        for (std::size_t index = 0; index < count; ++index) {
            int id = 0;
            if (!(input >> id)) {
                return false;
            }
            ids.push_back(id);
        }
        return true;
    };
    if (!readIds("timeline", timeline_)) return false;
    if (!readIds("draw", drawPile_)) return false;
    if (!readIds("discard", discardPile_)) return false;

    std::size_t playerCount = 0;
    if (!readLabel(input, "players") || !(input >> playerCount) || playerCount < 2 || playerCount > 6) {
        return false;
    }
    players_.clear();
    players_.reserve(playerCount);
    for (std::size_t index = 0; index < playerCount; ++index) {
        int aiValue = 0;
        std::size_t handCount = 0;
        Player player;
        if (
            !readLabel(input, "player")
            || !(input >> aiValue >> std::quoted(player.name) >> handCount)
            || handCount > allCards().size()
        ) {
            return false;
        }
        player.isAI = aiValue != 0;
        player.hand.reserve(handCount);
        for (std::size_t cardIndex = 0; cardIndex < handCount; ++cardIndex) {
            int id = 0;
            if (!(input >> id)) {
                return false;
            }
            player.hand.push_back(id);
        }
        players_.push_back(std::move(player));
    }

    if (!readLabel(input, "rng") || !(input >> rng_)) return false;
    if (!readLabel(input, "end")) return false;
    return validateLoadedState();
}

bool Game::validateLoadedState() const {
    const int modeValue = static_cast<int>(mode_);
    const int difficultyValue = static_cast<int>(difficulty_);
    if (modeValue < 0 || modeValue > 2 || difficultyValue < 0 || difficultyValue > 3) {
        return false;
    }
    if (
        players_.size() < 2
        || players_.size() > 6
        || currentPlayerIndex_ < 0
        || currentPlayerIndex_ >= static_cast<int>(players_.size())
        || winnerIndex_ < -1
        || winnerIndex_ >= static_cast<int>(players_.size())
        || timeline_.empty()
        || sessionPlacements_ < 0
        || sessionCorrect_ < 0
        || sessionIncorrect_ < 0
    ) {
        return false;
    }

    std::set<int> seen;
    const auto acceptIds = [&seen](const std::vector<int>& ids) {
        for (const int id : ids) {
            if (!validCardId(id) || !seen.insert(id).second) {
                return false;
            }
        }
        return true;
    };
    if (!acceptIds(timeline_) || !acceptIds(drawPile_) || !acceptIds(discardPile_)) {
        return false;
    }
    for (const auto& player : players_) {
        if (player.name.empty() || !acceptIds(player.hand)) {
            return false;
        }
    }

    for (std::size_t index = 1; index < timeline_.size(); ++index) {
        const Card* previous = findCard(timeline_[index - 1]);
        const Card* current = findCard(timeline_[index]);
        if (!previous || !current || previous->year > current->year) {
            return false;
        }
    }
    return !cardIdsForDeck(deckId_).empty();
}

void Game::shuffle(std::vector<int>& values) {
    std::shuffle(values.begin(), values.end(), rng_);
}

int Game::drawReplacementCard() {
    if (drawPile_.empty()) {
        if (discardPile_.empty()) {
            return 0;
        }
        drawPile_ = discardPile_;
        discardPile_.clear();
        shuffle(drawPile_);
    }
    const int cardId = drawPile_.back();
    drawPile_.pop_back();
    return cardId;
}

double Game::aiErrorRate() const {
    switch (difficulty_) {
        case AIDifficulty::Easy: return 0.50;
        case AIDifficulty::Normal: return 0.30;
        case AIDifficulty::Hard: return 0.10;
        case AIDifficulty::Expert: return 0.0;
    }
    return 0.30;
}

}  // namespace jwtl
