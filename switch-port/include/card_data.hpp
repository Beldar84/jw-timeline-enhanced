#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace jwtl {

struct Card {
    int id = 0;
    std::string name;
    std::int64_t year = 0;
    std::string bibleRef;
};

struct DeckDefinition {
    std::string id;
    std::string name;
    std::string description;
};

const std::vector<Card>& allCards();
const Card* findCard(int id);
const std::vector<DeckDefinition>& deckDefinitions();
std::vector<int> cardIdsForDeck(const std::string& deckId);

}  // namespace jwtl
