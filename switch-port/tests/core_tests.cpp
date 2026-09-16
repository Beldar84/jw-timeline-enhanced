#include "game.hpp"
#include "persistence.hpp"

#include <cassert>
#include <cstdio>
#include <iostream>
#include <sstream>

namespace {

std::pair<int, int> findMove(const jwtl::Game& game, bool shouldBeCorrect) {
    const auto& player = game.players()[game.currentPlayerIndex()];
    for (const int cardId : player.hand) {
        for (int slot = 0; slot <= static_cast<int>(game.timeline().size()); ++slot) {
            if (jwtl::Game::canPlaceCard(cardId, game.timeline(), slot) == shouldBeCorrect) {
                return {cardId, slot};
            }
        }
    }
    return {0, -1};
}

void testDecks() {
    assert(jwtl::allCards().size() == 112);
    assert(jwtl::cardIdsForDeck("complete").size() == 112);
    assert(!jwtl::cardIdsForDeck("jesus").empty());
    assert(jwtl::cardIdsForDeck("missing").empty());
    assert(jwtl::findCard(1)->year == -14000000000LL);
}

void testStartAndCorrectPlacement() {
    jwtl::Game game;
    assert(game.start(jwtl::GameMode::Ai, "complete", 2, jwtl::AIDifficulty::Normal, 42));
    assert(game.players().size() == 2);
    assert(game.players()[0].hand.size() == 4);
    assert(game.players()[1].isAI);
    assert(game.timeline().size() == 1);

    const auto move = findMove(game, true);
    assert(move.first != 0);
    const auto result = game.placeCard(move.first, move.second);
    assert(result.valid);
    assert(result.correct);
    assert(game.players()[0].hand.size() == 3);
    assert(game.timeline().size() == 2);
    assert(game.currentPlayerIndex() == 1);
}

void testPenaltyDraw() {
    jwtl::Game game;
    assert(game.start(jwtl::GameMode::Ai, "complete", 2, jwtl::AIDifficulty::Normal, 7));
    const auto move = findMove(game, false);
    assert(move.first != 0);
    const auto result = game.placeCard(move.first, move.second);
    assert(result.valid);
    assert(!result.correct);
    assert(result.replacementCardId != 0);
    assert(game.players()[0].hand.size() == 4);
    assert(game.sessionIncorrect() == 1);
}

void testStudyModeNoPenalty() {
    jwtl::Game game;
    assert(game.start(jwtl::GameMode::Study, "complete", 2, jwtl::AIDifficulty::Easy, 11));
    const auto move = findMove(game, false);
    assert(move.first != 0);
    const auto result = game.placeCard(move.first, move.second);
    assert(result.valid);
    assert(!result.correct);
    assert(result.replacementCardId == 0);
    assert(game.players()[0].hand.size() == 3);
    assert(game.sessionPlacements() == 0);
}

void testExpertAiChoosesValidMove() {
    jwtl::Game game;
    assert(game.start(jwtl::GameMode::Ai, "complete", 2, jwtl::AIDifficulty::Expert, 99));
    const auto humanMove = findMove(game, true);
    assert(humanMove.first != 0);
    assert(game.placeCard(humanMove.first, humanMove.second).correct);
    const auto aiMove = game.chooseAiMove();
    assert(aiMove.has_value());
    assert(jwtl::Game::canPlaceCard(aiMove->cardId, game.timeline(), aiMove->timelineIndex));
}

void testSaveRoundTrip() {
    jwtl::Game original;
    assert(original.start(jwtl::GameMode::Local, "kings", 4, jwtl::AIDifficulty::Normal, 1234));
    const auto move = findMove(original, true);
    assert(move.first != 0);
    original.placeCard(move.first, move.second);

    std::stringstream stream;
    assert(original.save(stream));

    jwtl::Game restored;
    assert(restored.load(stream));
    assert(restored.mode() == original.mode());
    assert(restored.deckId() == original.deckId());
    assert(restored.currentPlayerIndex() == original.currentPlayerIndex());
    assert(restored.timeline() == original.timeline());
    assert(restored.drawPile() == original.drawPile());
    assert(restored.discardPile() == original.discardPile());
    assert(restored.players().size() == original.players().size());
    for (std::size_t index = 0; index < original.players().size(); ++index) {
        assert(restored.players()[index].name == original.players()[index].name);
        assert(restored.players()[index].hand == original.players()[index].hand);
    }
}

void testPersistentFiles() {
    const std::string statsPath = "/tmp/jwtl-switch-stats-test.sav";
    const std::string gamePath = "/tmp/jwtl-switch-game-test.sav";
    std::remove(statsPath.c_str());
    std::remove(gamePath.c_str());

    jwtl::PersistentStats stats;
    stats.gamesPlayed = 2;
    stats.gamesWon = 1;
    stats.gamesLost = 1;
    stats.totalCardsPlaced = 10;
    stats.correctPlacements = 8;
    stats.incorrectPlacements = 2;
    stats.fastestWinSeconds = 90;
    assert(jwtl::saveStatsFile(statsPath, stats));

    jwtl::PersistentStats restoredStats;
    assert(jwtl::loadStatsFile(statsPath, restoredStats));
    assert(restoredStats.gamesPlayed == 2);
    assert(restoredStats.accuracy() == 80.0);

    jwtl::Game original;
    assert(original.start(jwtl::GameMode::Ai, "complete", 2, jwtl::AIDifficulty::Hard, 808));
    assert(jwtl::saveGameFile(gamePath, original));
    assert(jwtl::fileExists(gamePath));

    jwtl::Game restoredGame;
    assert(jwtl::loadGameFile(gamePath, restoredGame));
    assert(restoredGame.timeline() == original.timeline());
    assert(jwtl::deleteGameFile(gamePath));
    assert(!jwtl::fileExists(gamePath));
    std::remove(statsPath.c_str());
}

}  // namespace

int main() {
    testDecks();
    testStartAndCorrectPlacement();
    testPenaltyDraw();
    testStudyModeNoPenalty();
    testExpertAiChoosesValidMove();
    testSaveRoundTrip();
    testPersistentFiles();
    std::cout << "JW Timeline Switch core tests: OK\n";
    return 0;
}
