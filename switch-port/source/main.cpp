#include "card_data.hpp"
#include "game.hpp"
#include "persistence.hpp"

#include <SDL.h>
#include <SDL_image.h>
#include <SDL_ttf.h>
#include <switch.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <map>
#include <string>
#include <sys/stat.h>
#include <unordered_map>
#include <utility>
#include <vector>

namespace {

constexpr int kScreenWidth = 1280;
constexpr int kScreenHeight = 720;
constexpr const char* kBodyFontPath = "romfs:/switch/EBGaramond.ttf";
constexpr const char* kItalicFontPath = "romfs:/switch/EBGaramond-Italic.ttf";
constexpr const char* kDisplayFontPath = "romfs:/switch/Cinzel.ttf";
constexpr const char* kSaveDirectory = "sdmc:/switch/JW-Timeline";
constexpr const char* kGameSavePath = "sdmc:/switch/JW-Timeline/game.sav";
constexpr const char* kStatsSavePath = "sdmc:/switch/JW-Timeline/stats.sav";
constexpr double kPi = 3.14159265358979323846;

constexpr SDL_Color kBackground{23, 16, 8, 255};
constexpr SDL_Color kPanel{31, 22, 13, 245};
constexpr SDL_Color kPanelLight{242, 232, 213, 255};
constexpr SDL_Color kParchmentBottom{227, 213, 184, 255};
constexpr SDL_Color kInk{43, 32, 19, 255};
constexpr SDL_Color kGold{201, 162, 39, 255};
constexpr SDL_Color kGoldBright{229, 201, 106, 255};
constexpr SDL_Color kGoldSoft{168, 133, 60, 255};
constexpr SDL_Color kCream{242, 232, 213, 255};
constexpr SDL_Color kMuted{201, 184, 145, 255};
constexpr SDL_Color kGreen{71, 178, 113, 255};
constexpr SDL_Color kRed{210, 76, 73, 255};
constexpr SDL_Color kBlack{0, 0, 0, 255};

enum class FontFace {
    Body = 0,
    Italic = 1,
    Display = 2,
};

enum class Screen {
    Menu,
    Decks,
    Setup,
    Game,
    PassTurn,
    Pause,
    Stats,
    GameOver,
};

enum class MenuAction {
    Continue,
    Ai,
    Local,
    Study,
    Stats,
    Exit,
};

enum class InspectionArea {
    None,
    Timeline,
    Discard,
};

enum class HitKind {
    Menu,
    Deck,
    SetupName,
    SetupDifficulty,
    SetupCountMinus,
    SetupCountPlus,
    SetupStart,
    HandCard,
    TimelineCard,
    DiscardCard,
    TimelineSlot,
    PauseButton,
    PauseItem,
    GameOverItem,
    Back,
};

struct MenuEntry {
    std::string label;
    MenuAction action;
};

struct HitTarget {
    SDL_Rect rect{};
    HitKind kind = HitKind::Back;
    int value = 0;
};

struct TextureInfo {
    SDL_Texture* texture = nullptr;
    int width = 0;
    int height = 0;
    std::uint64_t lastUse = 0;
};

bool contains(const SDL_Rect& rect, int x, int y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

std::string formatYear(std::int64_t year) {
    if (year == -14000000000LL) {
        return "14.000 M a.e.c.";
    }
    const std::int64_t absolute = year < 0 ? -year : year;
    return std::to_string(absolute) + (year < 0 ? " a.e.c." : " e.c.");
}

std::string formatDuration(std::int64_t totalSeconds) {
    const std::int64_t minutes = totalSeconds / 60;
    const std::int64_t seconds = totalSeconds % 60;
    char buffer[32];
    std::snprintf(buffer, sizeof(buffer), "%lld:%02lld",
        static_cast<long long>(minutes),
        static_cast<long long>(seconds));
    return buffer;
}

std::string cardImagePath(int cardId, bool revealYear) {
    return "romfs:/images/cards/JW Timeline " + std::to_string(cardId)
        + (revealYear ? "rev.png" : ".png");
}

std::string shorten(const std::string& value, std::size_t maximum) {
    if (value.size() <= maximum) {
        return value;
    }
    if (maximum <= 3) {
        return value.substr(0, maximum);
    }
    return value.substr(0, maximum - 3) + "...";
}

SDL_Color blend(SDL_Color from, SDL_Color to, double amount) {
    const double clamped = std::max(0.0, std::min(1.0, amount));
    const auto channel = [clamped](Uint8 start, Uint8 end) {
        return static_cast<Uint8>(
            std::round(static_cast<double>(start)
                + (static_cast<double>(end) - static_cast<double>(start)) * clamped)
        );
    };
    return SDL_Color{
        channel(from.r, to.r),
        channel(from.g, to.g),
        channel(from.b, to.b),
        channel(from.a, to.a),
    };
}

class AudioSynth {
public:
    bool initialize() {
        SDL_AudioSpec desired{};
        desired.freq = 48000;
        desired.format = AUDIO_S16SYS;
        desired.channels = 2;
        desired.samples = 1024;
        device_ = SDL_OpenAudioDevice(nullptr, 0, &desired, &actual_, 0);
        if (device_ == 0) {
            return false;
        }
        SDL_PauseAudioDevice(device_, 0);
        return true;
    }

    void click() { tone(520.0, 45, 0.16); }
    void correct() {
        tone(660.0, 95, 0.20);
        tone(880.0, 125, 0.18);
    }
    void incorrect() { tone(180.0, 210, 0.20); }

    void shutdown() {
        if (device_ != 0) {
            SDL_CloseAudioDevice(device_);
            device_ = 0;
        }
    }

private:
    void tone(double frequency, int milliseconds, double volume) {
        if (device_ == 0 || actual_.format != AUDIO_S16SYS || actual_.channels != 2) {
            return;
        }
        const int frames = actual_.freq * milliseconds / 1000;
        std::vector<std::int16_t> samples(static_cast<std::size_t>(frames) * 2);
        for (int frame = 0; frame < frames; ++frame) {
            const double position = static_cast<double>(frame) / static_cast<double>(frames);
            const double envelope = std::min(1.0, position * 14.0) * (1.0 - position);
            const double phase = 2.0 * kPi * frequency * frame / actual_.freq;
            const auto sample = static_cast<std::int16_t>(
                std::sin(phase) * envelope * volume * 32767.0
            );
            samples[static_cast<std::size_t>(frame) * 2] = sample;
            samples[static_cast<std::size_t>(frame) * 2 + 1] = sample;
        }
        if (SDL_GetQueuedAudioSize(device_) > static_cast<Uint32>(actual_.freq * 4)) {
            SDL_ClearQueuedAudio(device_);
        }
        SDL_QueueAudio(device_, samples.data(), samples.size() * sizeof(std::int16_t));
    }

    SDL_AudioDeviceID device_ = 0;
    SDL_AudioSpec actual_{};
};

class App {
public:
    bool initialize();
    void run();
    void shutdown();

private:
    TTF_Font* font(int size, FontFace face = FontFace::Body);
    TextureInfo* image(const std::string& path);
    TextureInfo* textTexture(
        const std::string& text,
        int size,
        SDL_Color color,
        int wrapWidth = 0,
        FontFace face = FontFace::Body
    );
    void clearTextCache();
    void trimImageCache();
    bool createBackgroundTexture();

    void drawBackground();
    void drawText(
        const std::string& text,
        int size,
        SDL_Color color,
        int x,
        int y,
        int align = 0,
        int wrapWidth = 0,
        FontFace face = FontFace::Body
    );
    void drawPanel(const SDL_Rect& rect, SDL_Color fill, SDL_Color border);
    void drawParchmentPanel(const SDL_Rect& rect);
    void drawCircle(
        int centerX,
        int centerY,
        int radius,
        SDL_Color color,
        bool filled = false,
        bool dashed = false
    );
    void drawGoldenAxis(int x, int y, int width);
    void drawButton(
        const SDL_Rect& rect,
        const std::string& label,
        bool selected,
        bool disabled = false
    );
    void drawParchmentButton(
        const SDL_Rect& rect,
        const std::string& label,
        bool selected,
        bool disabled = false
    );
    void drawImage(const std::string& path, const SDL_Rect& rect, Uint8 alpha = 255);
    void drawImageRotated(
        const std::string& path,
        const SDL_Rect& rect,
        double angle,
        Uint8 alpha = 255
    );
    void drawCard(int cardId, const SDL_Rect& rect, bool revealYear, bool selected, bool faceDown = false);
    void drawCardRotated(
        int cardId,
        const SDL_Rect& rect,
        bool revealYear,
        double angle,
        bool faceDown = false
    );
    void drawFooter(const std::string& text);

    void render();
    void renderMenu();
    void renderDecks();
    void renderSetup();
    void renderGame();
    void renderPassTurn();
    void renderPause();
    void renderStats();
    void renderGameOver();
    void renderFeedback();
    void renderZoom();

    u64 stickNavigationButtons();
    void handleButtons(u64 down);
    void handleTouch(int x, int y);
    void activateHit(const HitTarget& hit);
    void activateMenu();
    void selectDeck();
    void activateSetup();
    void editName(int playerIndex);
    void startConfiguredGame();
    void resumeSavedGame();
    void resetGameSelection();
    void attemptPlacement();
    void processPlacement(const jwtl::PlacementResult& result);
    void updateTimedState();
    void finishCompletedGame();
    void scheduleAiIfNeeded();
    void returnToMenu();
    void beginRematch();

    std::vector<MenuEntry> menuEntries() const;
    int setupLastFocus() const;

    SDL_Window* window_ = nullptr;
    SDL_Renderer* renderer_ = nullptr;
    SDL_Texture* backgroundTexture_ = nullptr;
    std::map<int, TTF_Font*> fonts_;
    std::unordered_map<std::string, TextureInfo> images_;
    std::unordered_map<std::string, TextureInfo> texts_;
    std::uint64_t textureClock_ = 0;
    AudioSynth audio_;

    bool running_ = true;
    bool romfsReady_ = false;
    bool sdMounted_ = false;
    PadState pad_{};
    u64 stickDirection_ = 0;
    std::uint32_t stickRepeatAt_ = 0;
    int previousTouchCount_ = 0;
    std::vector<HitTarget> hits_;

    Screen screen_ = Screen::Menu;
    Screen screenBeforePause_ = Screen::Game;
    int menuIndex_ = 0;
    int deckIndex_ = 0;
    int setupFocus_ = 0;
    int setupPlayerCount_ = 2;
    int setupDifficulty_ = static_cast<int>(jwtl::AIDifficulty::Normal);
    jwtl::GameMode pendingMode_ = jwtl::GameMode::Ai;
    std::vector<std::string> setupNames_{
        "Jugador 1", "Jugador 2", "Jugador 3",
        "Jugador 4", "Jugador 5", "Jugador 6"
    };

    jwtl::Game game_;
    jwtl::PersistentStats stats_;
    bool hasSavedGame_ = false;
    bool resultRecorded_ = false;
    int selectedHandIndex_ = 0;
    int selectedTimelineSlot_ = 0;
    bool selectingTimeline_ = false;
    InspectionArea inspectionArea_ = InspectionArea::None;
    int inspectionIndex_ = 0;
    int zoomCardId_ = 0;
    bool zoomRevealYear_ = false;
    int timelineCenter_ = 0;
    std::uint32_t feedbackUntil_ = 0;
    std::uint32_t aiTurnDue_ = 0;
    jwtl::PlacementResult lastPlacement_{};
};

bool App::initialize() {
    romfsReady_ = R_SUCCEEDED(romfsInit());
    if (!romfsReady_) {
        return false;
    }

    // libnx mounts sdmc automatically before main(). Re-mounting it here can
    // fail even though the device is already available.
    sdMounted_ = fsdevGetDeviceFileSystem("sdmc") != nullptr;
    if (sdMounted_) {
        mkdir("sdmc:/switch", 0777);
        mkdir(kSaveDirectory, 0777);
        jwtl::loadStatsFile(kStatsSavePath, stats_);
        hasSavedGame_ = jwtl::fileExists(kGameSavePath);
    }

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_TIMER) != 0) {
        return false;
    }
    if ((IMG_Init(IMG_INIT_PNG | IMG_INIT_JPG) & IMG_INIT_PNG) == 0 || TTF_Init() != 0) {
        return false;
    }

    window_ = SDL_CreateWindow(
        "JW Timeline",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        kScreenWidth,
        kScreenHeight,
        SDL_WINDOW_SHOWN
    );
    renderer_ = SDL_CreateRenderer(
        window_,
        -1,
        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
    );
    if (
        !window_
        || !renderer_
        || !font(24, FontFace::Body)
        || !font(24, FontFace::Italic)
        || !font(24, FontFace::Display)
        || !createBackgroundTexture()
    ) {
        return false;
    }
    SDL_SetRenderDrawBlendMode(renderer_, SDL_BLENDMODE_BLEND);
    audio_.initialize();

    padConfigureInput(1, HidNpadStyleSet_NpadStandard);
    padInitializeDefault(&pad_);
    hidInitializeTouchScreen();
    return true;
}

void App::run() {
    while (running_ && appletMainLoop()) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running_ = false;
            }
        }

        padUpdate(&pad_);
        handleButtons(padGetButtonsDown(&pad_) | stickNavigationButtons());

        HidTouchScreenState touchState{};
        if (hidGetTouchScreenStates(&touchState, 1)) {
            const int currentTouchCount = touchState.count;
            if (currentTouchCount > 0 && previousTouchCount_ == 0) {
                handleTouch(touchState.touches[0].x, touchState.touches[0].y);
            }
            previousTouchCount_ = currentTouchCount;
        }

        updateTimedState();
        render();
        SDL_RenderPresent(renderer_);
    }
}

void App::shutdown() {
    if (
        sdMounted_
        && (screen_ == Screen::Game || screen_ == Screen::PassTurn || screen_ == Screen::Pause)
        && !game_.isGameOver()
    ) {
        jwtl::saveGameFile(kGameSavePath, game_);
    }

    audio_.shutdown();
    for (auto& entry : texts_) {
        SDL_DestroyTexture(entry.second.texture);
    }
    texts_.clear();
    for (auto& entry : images_) {
        SDL_DestroyTexture(entry.second.texture);
    }
    images_.clear();
    for (auto& entry : fonts_) {
        TTF_CloseFont(entry.second);
    }
    fonts_.clear();
    if (backgroundTexture_) SDL_DestroyTexture(backgroundTexture_);
    if (renderer_) SDL_DestroyRenderer(renderer_);
    if (window_) SDL_DestroyWindow(window_);
    TTF_Quit();
    IMG_Quit();
    SDL_Quit();
    if (romfsReady_) romfsExit();
}

TTF_Font* App::font(int size, FontFace face) {
    const int key = (static_cast<int>(face) << 16) | size;
    const auto existing = fonts_.find(key);
    if (existing != fonts_.end()) {
        return existing->second;
    }
    const char* path = kBodyFontPath;
    if (face == FontFace::Italic) path = kItalicFontPath;
    if (face == FontFace::Display) path = kDisplayFontPath;
    TTF_Font* loaded = TTF_OpenFont(path, size);
    if (loaded) {
        fonts_[key] = loaded;
    }
    return loaded;
}

TextureInfo* App::image(const std::string& path) {
    auto existing = images_.find(path);
    if (existing != images_.end()) {
        existing->second.lastUse = ++textureClock_;
        return &existing->second;
    }

    SDL_Surface* surface = IMG_Load(path.c_str());
    if (!surface) {
        return nullptr;
    }
    TextureInfo info;
    info.texture = SDL_CreateTextureFromSurface(renderer_, surface);
    info.width = surface->w;
    info.height = surface->h;
    info.lastUse = ++textureClock_;
    SDL_FreeSurface(surface);
    if (!info.texture) {
        return nullptr;
    }
    auto inserted = images_.emplace(path, info);
    trimImageCache();
    return &inserted.first->second;
}

TextureInfo* App::textTexture(
    const std::string& value,
    int size,
    SDL_Color color,
    int wrapWidth,
    FontFace face
) {
    const std::string key = value + '\x1f' + std::to_string(size) + ':'
        + std::to_string(color.r) + ':' + std::to_string(color.g) + ':'
        + std::to_string(color.b) + ':' + std::to_string(wrapWidth) + ':'
        + std::to_string(static_cast<int>(face));
    auto existing = texts_.find(key);
    if (existing != texts_.end()) {
        existing->second.lastUse = ++textureClock_;
        return &existing->second;
    }

    TTF_Font* selectedFont = font(size, face);
    if (!selectedFont) {
        return nullptr;
    }
    SDL_Surface* surface = wrapWidth > 0
        ? TTF_RenderUTF8_Blended_Wrapped(selectedFont, value.c_str(), color, wrapWidth)
        : TTF_RenderUTF8_Blended(selectedFont, value.c_str(), color);
    if (!surface) {
        return nullptr;
    }
    TextureInfo info;
    info.texture = SDL_CreateTextureFromSurface(renderer_, surface);
    info.width = surface->w;
    info.height = surface->h;
    info.lastUse = ++textureClock_;
    SDL_FreeSurface(surface);
    if (!info.texture) {
        return nullptr;
    }
    if (texts_.size() > 420) {
        clearTextCache();
    }
    auto inserted = texts_.emplace(key, info);
    return &inserted.first->second;
}

void App::clearTextCache() {
    for (auto& entry : texts_) {
        SDL_DestroyTexture(entry.second.texture);
    }
    texts_.clear();
}

void App::trimImageCache() {
    while (images_.size() > 28) {
        auto oldest = images_.end();
        for (auto iterator = images_.begin(); iterator != images_.end(); ++iterator) {
            if (oldest == images_.end() || iterator->second.lastUse < oldest->second.lastUse) {
                oldest = iterator;
            }
        }
        if (oldest == images_.end()) {
            return;
        }
        SDL_DestroyTexture(oldest->second.texture);
        images_.erase(oldest);
    }
}

bool App::createBackgroundTexture() {
    SDL_Surface* surface = SDL_CreateRGBSurfaceWithFormat(
        0,
        kScreenWidth,
        kScreenHeight,
        32,
        SDL_PIXELFORMAT_RGBA32
    );
    if (!surface) {
        return false;
    }

    const SDL_Color center{46, 33, 19, 255};
    const SDL_Color middle{28, 20, 9, 255};
    const SDL_Color edge{16, 10, 5, 255};
    auto* pixels = static_cast<Uint32*>(surface->pixels);
    const int pitch = surface->pitch / static_cast<int>(sizeof(Uint32));
    for (int y = 0; y < kScreenHeight; ++y) {
        for (int x = 0; x < kScreenWidth; ++x) {
            const double dx = (static_cast<double>(x) - kScreenWidth * 0.5)
                / (kScreenWidth * 0.80);
            const double dy = (static_cast<double>(y) - kScreenHeight * 0.15)
                / (kScreenHeight * 0.55);
            const double distance = std::min(1.0, std::sqrt(dx * dx + dy * dy));
            const SDL_Color color = distance < 0.55
                ? blend(center, middle, distance / 0.55)
                : blend(middle, edge, (distance - 0.55) / 0.45);
            pixels[y * pitch + x] = SDL_MapRGBA(
                surface->format,
                color.r,
                color.g,
                color.b,
                color.a
            );
        }
    }

    backgroundTexture_ = SDL_CreateTextureFromSurface(renderer_, surface);
    SDL_FreeSurface(surface);
    return backgroundTexture_ != nullptr;
}

void App::drawBackground() {
    if (backgroundTexture_) {
        SDL_RenderCopy(renderer_, backgroundTexture_, nullptr, nullptr);
    } else {
        SDL_SetRenderDrawColor(renderer_, kBackground.r, kBackground.g, kBackground.b, 255);
        SDL_RenderClear(renderer_);
    }

    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 42);
    const SDL_Rect topRule{0, 0, kScreenWidth, 2};
    const SDL_Rect bottomRule{0, kScreenHeight - 2, kScreenWidth, 2};
    SDL_RenderFillRect(renderer_, &topRule);
    SDL_RenderFillRect(renderer_, &bottomRule);
}

void App::drawText(
    const std::string& value,
    int size,
    SDL_Color color,
    int x,
    int y,
    int align,
    int wrapWidth,
    FontFace face
) {
    TextureInfo* texture = textTexture(value, size, color, wrapWidth, face);
    if (!texture) {
        return;
    }
    SDL_Rect destination{x, y, texture->width, texture->height};
    if (align == 1) destination.x -= destination.w / 2;
    if (align == 2) destination.x -= destination.w;
    SDL_RenderCopy(renderer_, texture->texture, nullptr, &destination);
}

void App::drawPanel(const SDL_Rect& rect, SDL_Color fill, SDL_Color border) {
    SDL_SetRenderDrawColor(renderer_, fill.r, fill.g, fill.b, fill.a);
    SDL_RenderFillRect(renderer_, &rect);
    SDL_SetRenderDrawColor(renderer_, border.r, border.g, border.b, border.a);
    SDL_RenderDrawRect(renderer_, &rect);
}

void App::drawParchmentPanel(const SDL_Rect& rect) {
    SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 72);
    const SDL_Rect shadow{rect.x + 12, rect.y + 16, rect.w, rect.h};
    SDL_RenderFillRect(renderer_, &shadow);

    for (int line = 0; line < rect.h; ++line) {
        const SDL_Color color = blend(
            kPanelLight,
            kParchmentBottom,
            static_cast<double>(line) / std::max(1, rect.h - 1)
        );
        SDL_SetRenderDrawColor(renderer_, color.r, color.g, color.b, color.a);
        SDL_RenderDrawLine(
            renderer_,
            rect.x,
            rect.y + line,
            rect.x + rect.w - 1,
            rect.y + line
        );
    }

    SDL_SetRenderDrawColor(renderer_, 120, 94, 48, 110);
    SDL_RenderDrawRect(renderer_, &rect);
    const SDL_Rect inner{rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10};
    SDL_SetRenderDrawColor(renderer_, 242, 232, 213, 235);
    SDL_RenderDrawRect(renderer_, &inner);
    const SDL_Rect innerRule{rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16};
    SDL_SetRenderDrawColor(renderer_, 120, 94, 48, 62);
    SDL_RenderDrawRect(renderer_, &innerRule);
}

void App::drawCircle(
    int centerX,
    int centerY,
    int radius,
    SDL_Color color,
    bool filled,
    bool dashed
) {
    SDL_SetRenderDrawColor(renderer_, color.r, color.g, color.b, color.a);
    if (filled) {
        for (int y = -radius; y <= radius; ++y) {
            const int halfWidth = static_cast<int>(
                std::sqrt(static_cast<double>(radius * radius - y * y))
            );
            SDL_RenderDrawLine(
                renderer_,
                centerX - halfWidth,
                centerY + y,
                centerX + halfWidth,
                centerY + y
            );
        }
        return;
    }

    constexpr int segments = 144;
    for (int segment = 0; segment < segments; ++segment) {
        if (dashed && (segment / 6) % 2 == 1) {
            continue;
        }
        const double angle = 2.0 * kPi * segment / segments;
        const int x = centerX + static_cast<int>(std::round(std::cos(angle) * radius));
        const int y = centerY + static_cast<int>(std::round(std::sin(angle) * radius));
        SDL_RenderDrawPoint(renderer_, x, y);
        SDL_RenderDrawPoint(renderer_, x + 1, y);
    }
}

void App::drawGoldenAxis(int x, int y, int width) {
    constexpr int segments = 24;
    for (int segment = 0; segment < segments; ++segment) {
        const double edgeDistance = std::min(
            static_cast<double>(segment) / (segments / 2),
            static_cast<double>(segments - segment - 1) / (segments / 2)
        );
        const Uint8 alpha = static_cast<Uint8>(35 + 120 * std::max(0.0, edgeDistance));
        SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, alpha);
        const int start = x + width * segment / segments;
        const int end = x + width * (segment + 1) / segments;
        SDL_RenderDrawLine(renderer_, start, y, end, y);
        SDL_RenderDrawLine(renderer_, start, y + 1, end, y + 1);
    }
}

void App::drawButton(
    const SDL_Rect& rect,
    const std::string& label,
    bool selected,
    bool disabled
) {
    const SDL_Color fill = selected
        ? SDL_Color{201, 162, 39, 225}
        : SDL_Color{54, 40, 25, 235};
    drawPanel(rect, fill, selected ? kCream : kGoldSoft);
    drawText(
        label,
        19,
        disabled ? kMuted : (selected ? kInk : kCream),
        rect.x + rect.w / 2,
        rect.y + (rect.h - 28) / 2,
        1,
        0,
        FontFace::Display
    );
}

void App::drawParchmentButton(
    const SDL_Rect& rect,
    const std::string& label,
    bool selected,
    bool disabled
) {
    const SDL_Color fill = selected
        ? SDL_Color{201, 162, 39, 52}
        : SDL_Color{255, 255, 255, 42};
    const SDL_Color border = selected
        ? kGoldSoft
        : SDL_Color{120, 94, 48, 88};
    drawPanel(rect, fill, border);
    if (selected) {
        SDL_SetRenderDrawColor(renderer_, kGoldSoft.r, kGoldSoft.g, kGoldSoft.b, 255);
        const SDL_Rect accent{rect.x, rect.y, 4, rect.h};
        SDL_RenderFillRect(renderer_, &accent);
    }
    drawText(
        label,
        18,
        disabled ? SDL_Color{164, 146, 111, 255} : kInk,
        rect.x + rect.w / 2,
        rect.y + (rect.h - 23) / 2,
        1,
        0,
        FontFace::Display
    );
}

void App::drawImage(const std::string& path, const SDL_Rect& rect, Uint8 alpha) {
    TextureInfo* texture = image(path);
    if (!texture) {
        return;
    }
    SDL_SetTextureAlphaMod(texture->texture, alpha);
    SDL_RenderCopy(renderer_, texture->texture, nullptr, &rect);
    SDL_SetTextureAlphaMod(texture->texture, 255);
}

void App::drawImageRotated(
    const std::string& path,
    const SDL_Rect& rect,
    double angle,
    Uint8 alpha
) {
    TextureInfo* texture = image(path);
    if (!texture) {
        return;
    }
    SDL_SetTextureAlphaMod(texture->texture, alpha);
    SDL_RenderCopyEx(renderer_, texture->texture, nullptr, &rect, angle, nullptr, SDL_FLIP_NONE);
    SDL_SetTextureAlphaMod(texture->texture, 255);
}

void App::drawCard(
    int cardId,
    const SDL_Rect& rect,
    bool revealYear,
    bool selected,
    bool faceDown
) {
    const std::string path = faceDown
        ? "romfs:/images/card-back.png"
        : cardImagePath(cardId, revealYear);
    SDL_SetRenderDrawColor(renderer_, 0, 0, 0, selected ? 135 : 82);
    const SDL_Rect shadow{rect.x + 7, rect.y + 10, rect.w, rect.h};
    SDL_RenderFillRect(renderer_, &shadow);
    drawImage(path, rect);
    SDL_SetRenderDrawColor(
        renderer_,
        selected ? kGoldBright.r : 99,
        selected ? kGoldBright.g : 78,
        selected ? kGoldBright.b : 44,
        255
    );
    SDL_RenderDrawRect(renderer_, &rect);
    if (selected) {
        const double pulse = (std::sin(SDL_GetTicks() / 210.0) + 1.0) * 0.5;
        SDL_SetRenderDrawColor(
            renderer_,
            kGoldBright.r,
            kGoldBright.g,
            kGoldBright.b,
            static_cast<Uint8>(105 + pulse * 95)
        );
        SDL_Rect outer{rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6};
        SDL_RenderDrawRect(renderer_, &outer);
        SDL_Rect glow{rect.x - 7, rect.y - 7, rect.w + 14, rect.h + 14};
        SDL_RenderDrawRect(renderer_, &glow);
    }
}

void App::drawCardRotated(
    int cardId,
    const SDL_Rect& rect,
    bool revealYear,
    double angle,
    bool faceDown
) {
    const std::string path = faceDown
        ? "romfs:/images/card-back.png"
        : cardImagePath(cardId, revealYear);
    drawImageRotated(path, rect, angle);
}

void App::drawFooter(const std::string& value) {
    SDL_SetRenderDrawColor(renderer_, 4, 3, 2, 205);
    const SDL_Rect footer{0, 684, kScreenWidth, 36};
    SDL_RenderFillRect(renderer_, &footer);
    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 55);
    SDL_RenderDrawLine(renderer_, 0, 684, kScreenWidth, 684);
    drawText(value, 16, kMuted, kScreenWidth / 2, 690, 1);
}

void App::render() {
    hits_.clear();
    drawBackground();
    switch (screen_) {
        case Screen::Menu: renderMenu(); break;
        case Screen::Decks: renderDecks(); break;
        case Screen::Setup: renderSetup(); break;
        case Screen::Game: renderGame(); break;
        case Screen::PassTurn: renderPassTurn(); break;
        case Screen::Pause: renderPause(); break;
        case Screen::Stats: renderStats(); break;
        case Screen::GameOver: renderGameOver(); break;
    }
    if (zoomCardId_ != 0) {
        renderZoom();
    } else if (feedbackUntil_ != 0) {
        renderFeedback();
    }
}

std::vector<MenuEntry> App::menuEntries() const {
    std::vector<MenuEntry> entries;
    if (hasSavedGame_) entries.push_back({"CONTINUAR PARTIDA", MenuAction::Continue});
    entries.push_back({"JUGAR CONTRA LA IA", MenuAction::Ai});
    entries.push_back({"PARTIDA LOCAL", MenuAction::Local});
    entries.push_back({"MODO ESTUDIO", MenuAction::Study});
    entries.push_back({"ESTADISTICAS", MenuAction::Stats});
    entries.push_back({"SALIR", MenuAction::Exit});
    return entries;
}

void App::renderMenu() {
    drawImage("romfs:/images/logo.png", SDL_Rect{150, 105, 280, 280});
    drawText("JW TIMELINE", 38, kCream, 290, 418, 1, 0, FontFace::Display);
    drawText(
        "Cronología bíblica · un juego de cartas",
        24,
        kMuted,
        290,
        472,
        1,
        0,
        FontFace::Italic
    );
    drawGoldenAxis(92, 532, 396);
    drawCircle(290, 533, 5, kGold, true);

    const SDL_Rect panel{572, 58, 636, 590};
    drawParchmentPanel(panel);
    drawText("ELIGE TU PARTIDA", 25, kInk, panel.x + 38, panel.y + 32, 0, 0, FontFace::Display);
    drawText(
        "El mazo completo de 112 cartas",
        20,
        SDL_Color{124, 101, 61, 255},
        panel.x + 40,
        panel.y + 72,
        0,
        0,
        FontFace::Italic
    );

    const auto entries = menuEntries();
    constexpr int rowHeight = 72;
    int y = panel.y + 118;
    for (std::size_t index = 0; index < entries.size(); ++index) {
        const SDL_Rect rect{panel.x + 24, y, panel.w - 48, rowHeight};
        const bool selected = menuIndex_ == static_cast<int>(index);
        if (selected) {
            SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 34);
            SDL_RenderFillRect(renderer_, &rect);
            SDL_SetRenderDrawColor(renderer_, kGoldSoft.r, kGoldSoft.g, kGoldSoft.b, 255);
            const SDL_Rect accent{rect.x, rect.y + 8, 4, rect.h - 16};
            SDL_RenderFillRect(renderer_, &accent);
        }

        std::string description;
        switch (entries[index].action) {
            case MenuAction::Continue: description = "Retoma la última partida guardada"; break;
            case MenuAction::Ai: description = "Cuatro niveles de dificultad"; break;
            case MenuAction::Local: description = "De 2 a 6 jugadores en esta consola"; break;
            case MenuAction::Study: description = "Fechas visibles y sin penalización"; break;
            case MenuAction::Stats: description = "Progreso y precisión en esta Switch"; break;
            case MenuAction::Exit: description = "Cerrar JW Timeline"; break;
        }
        drawText(
            entries[index].label,
            18,
            selected ? SDL_Color{92, 68, 29, 255} : kInk,
            rect.x + 24,
            rect.y + 13,
            0,
            0,
            FontFace::Display
        );
        drawText(
            description,
            18,
            SDL_Color{126, 104, 67, 255},
            rect.x + 24,
            rect.y + 42,
            0,
            0,
            FontFace::Body
        );
        drawText(
            selected ? "›" : "·",
            selected ? 34 : 24,
            selected ? kGoldSoft : SDL_Color{169, 148, 105, 255},
            rect.x + rect.w - 26,
            rect.y + 17,
            1,
            0,
            FontFace::Body
        );
        if (index + 1 < entries.size()) {
            SDL_SetRenderDrawColor(renderer_, 120, 94, 48, 47);
            SDL_RenderDrawLine(
                renderer_,
                rect.x + 18,
                rect.y + rect.h - 1,
                rect.x + rect.w - 18,
                rect.y + rect.h - 1
            );
        }
        hits_.push_back({rect, HitKind::Menu, static_cast<int>(index)});
        y += rowHeight;
    }
    drawFooter("↑/↓ Elegir     A Confirmar     + Salir");
}

void App::renderDecks() {
    drawText("ELIGE UN MAZO", 36, kCream, kScreenWidth / 2, 28, 1);
    drawText("Las cartas y reglas coinciden con la version web", 19, kMuted, kScreenWidth / 2, 76, 1);

    const auto& decks = jwtl::deckDefinitions();
    for (std::size_t index = 0; index < decks.size(); ++index) {
        const int column = static_cast<int>(index) % 3;
        const int row = static_cast<int>(index) / 3;
        const SDL_Rect rect{72 + column * 396, 122 + row * 166, 348, 134};
        const bool selected = deckIndex_ == static_cast<int>(index);
        drawPanel(
            rect,
            selected ? SDL_Color{201, 162, 39, 218} : kPanel,
            selected ? kCream : kGoldSoft
        );
        drawText(decks[index].name, 24, selected ? kInk : kCream, rect.x + 18, rect.y + 18);
        drawText(
            decks[index].description,
            18,
            selected ? SDL_Color{79, 60, 31, 255} : kMuted,
            rect.x + 18,
            rect.y + 58,
            0,
            rect.w - 36
        );
        const auto count = jwtl::cardIdsForDeck(decks[index].id).size();
        drawText(std::to_string(count) + " cartas", 17, selected ? kInk : kGoldSoft, rect.x + 18, rect.y + 105);
        hits_.push_back({rect, HitKind::Deck, static_cast<int>(index)});
    }
    drawFooter("Cruceta Elegir    A Continuar    B Volver");
}

int App::setupLastFocus() const {
    return pendingMode_ == jwtl::GameMode::Local ? setupPlayerCount_ + 1 : 2;
}

void App::renderSetup() {
    drawImage("romfs:/images/logo.png", SDL_Rect{28, 18, 70, 70});
    drawText(
        pendingMode_ == jwtl::GameMode::Local
            ? "CONFIGURAR PARTIDA LOCAL"
            : "JUGAR CONTRA LA IA",
        28,
        kCream,
        122,
        30,
        0,
        0,
        FontFace::Display
    );
    drawText(
        pendingMode_ == jwtl::GameMode::Local
            ? "Comparte la consola y juega por turnos"
            : "Elige tu rival y comienza la partida",
        21,
        kMuted,
        124,
        64,
        0,
        0,
        FontFace::Italic
    );
    const SDL_Rect panel{160, 104, 960, 532};
    drawParchmentPanel(panel);

    if (pendingMode_ == jwtl::GameMode::Local) {
        drawText("NÚMERO DE JUGADORES", 18, kInk, 220, 140, 0, 0, FontFace::Display);
        const SDL_Rect minus{656, 128, 58, 48};
        const SDL_Rect plus{806, 128, 58, 48};
        drawParchmentButton(minus, "−", setupFocus_ == 0);
        drawParchmentButton(plus, "+", setupFocus_ == 0);
        drawText(
            std::to_string(setupPlayerCount_),
            32,
            SDL_Color{92, 68, 29, 255},
            760,
            134,
            1,
            0,
            FontFace::Display
        );
        hits_.push_back({minus, HitKind::SetupCountMinus, 0});
        hits_.push_back({plus, HitKind::SetupCountPlus, 0});

        SDL_SetRenderDrawColor(renderer_, 120, 94, 48, 47);
        SDL_RenderDrawLine(renderer_, 220, 198, 1060, 198);
        drawText("NOMBRES", 18, kInk, 220, 218, 0, 0, FontFace::Display);
        for (int index = 0; index < setupPlayerCount_; ++index) {
            const int column = index % 2;
            const int row = index / 2;
            const SDL_Rect rect{220 + column * 440, 258 + row * 72, 400, 54};
            drawParchmentButton(rect, setupNames_[index], setupFocus_ == index + 1);
            hits_.push_back({rect, HitKind::SetupName, index});
        }
        const SDL_Rect start{420, 548, 440, 58};
        drawParchmentButton(start, "EMPEZAR PARTIDA", setupFocus_ == setupLastFocus());
        hits_.push_back({start, HitKind::SetupStart, 0});
        drawFooter("↑/↓ Mover     ←/→ Cambiar cantidad     A Editar/Empezar     B Volver");
        return;
    }

    drawText("TU NOMBRE", 18, kInk, 232, 150, 0, 0, FontFace::Display);
    const SDL_Rect nameRect{520, 132, 500, 56};
    drawParchmentButton(nameRect, setupNames_[0], setupFocus_ == 0);
    hits_.push_back({nameRect, HitKind::SetupName, 0});

    SDL_SetRenderDrawColor(renderer_, 120, 94, 48, 47);
    SDL_RenderDrawLine(renderer_, 220, 218, 1060, 218);
    drawText("DIFICULTAD DE LA IA", 18, kInk, 220, 246, 0, 0, FontFace::Display);
    const std::vector<std::string> difficulties{"FACIL", "NORMAL", "DIFICIL", "EXPERTO"};
    for (int index = 0; index < 4; ++index) {
        const SDL_Rect rect{220 + index * 210, 286, 190, 62};
        drawParchmentButton(rect, difficulties[index], setupDifficulty_ == index);
        if (setupFocus_ == 1 && setupDifficulty_ == index) {
            SDL_Rect focus{rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6};
            SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 210);
            SDL_RenderDrawRect(renderer_, &focus);
        }
        hits_.push_back({rect, HitKind::SetupDifficulty, index});
    }
    const std::vector<std::string> descriptions{
        "La IA se equivoca el 50% de las veces",
        "La IA se equivoca el 30% de las veces",
        "La IA se equivoca el 10% de las veces",
        "La IA siempre elige una posición válida"
    };
    drawText(
        descriptions[setupDifficulty_],
        21,
        SDL_Color{126, 104, 67, 255},
        kScreenWidth / 2,
        382,
        1,
        0,
        FontFace::Italic
    );

    const SDL_Rect start{420, 526, 440, 62};
    drawParchmentButton(start, "EMPEZAR PARTIDA", setupFocus_ == 2);
    hits_.push_back({start, HitKind::SetupStart, 0});
    drawFooter("↑/↓ Mover     ←/→ Dificultad     A Editar/Empezar     B Volver");
}

void App::renderGame() {
    if (game_.players().empty()) {
        returnToMenu();
        return;
    }
    const auto& current = game_.players()[game_.currentPlayerIndex()];

    // Cabecera compacta: conserva el lenguaje visual de la web sin gastar
    // la mitad de la pantalla panorámica.
    drawImage("romfs:/images/logo.png", SDL_Rect{22, 12, 72, 72});
    const auto& players = game_.players();
    const int playerCount = static_cast<int>(players.size());
    const int chipWidth = std::min(146, std::max(108, 850 / std::max(1, playerCount)));
    int chipX = 112;
    for (int index = 0; index < playerCount; ++index) {
        const bool active = index == game_.currentPlayerIndex();
        const SDL_Rect chip{chipX, 14, chipWidth, 36};
        drawPanel(
            chip,
            active ? SDL_Color{201, 162, 39, 45} : SDL_Color{20, 14, 8, 145},
            active ? kGoldSoft : SDL_Color{120, 94, 48, 92}
        );
        drawText(
            shorten(players[index].name, 12) + " · " + std::to_string(players[index].hand.size()),
            14,
            active ? kGoldBright : kMuted,
            chip.x + chip.w / 2,
            chip.y + 9,
            1,
            0,
            FontFace::Display
        );
        chipX += chipWidth + 8;
    }
    drawText(
        "Es el turno de " + current.name + ".",
        21,
        kCream,
        114,
        55,
        0,
        0,
        FontFace::Italic
    );
    if (game_.isStudyMode()) {
        drawText(
            "MODO ESTUDIO · FECHAS VISIBLES",
            13,
            kGoldBright,
            1116,
            59,
            2,
            0,
            FontFace::Display
        );
    }
    const SDL_Rect pauseButton{1144, 18, 108, 44};
    drawButton(pauseButton, "PAUSA", false);
    hits_.push_back({pauseButton, HitKind::PauseButton, 0});
    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 55);
    SDL_RenderDrawLine(renderer_, 18, 92, kScreenWidth - 18, 92);

    const auto& timeline = game_.timeline();
    constexpr int maxVisible = 5;
    const int timelineSize = static_cast<int>(timeline.size());
    const int center = timelineSize == 0
        ? 0
        : std::max(0, std::min(timelineSize - 1, timelineCenter_));
    const int maximumFirst = std::max(0, static_cast<int>(timeline.size()) - maxVisible);
    const int first = std::max(0, std::min(maximumFirst, center - maxVisible / 2));
    const int last = std::min(static_cast<int>(timeline.size()), first + maxVisible);
    const int visibleCards = last - first;
    constexpr int cardWidth = 132;
    constexpr int cardHeight = 200;
    constexpr int slotWidth = 54;
    const int totalWidth = visibleCards * cardWidth + (visibleCards + 1) * slotWidth;
    int x = (kScreenWidth - totalWidth) / 2;
    const int startX = x;
    constexpr int timelineY = 104;
    constexpr int axisY = timelineY + cardHeight / 2;

    drawGoldenAxis(startX - 18, axisY, totalWidth + 36);

    // Mazo y descarte flanquean el eje, igual que en la mesa web.
    const SDL_Rect deckRect{24, 126, 112, 168};
    drawCardRotated(0, SDL_Rect{deckRect.x + 5, deckRect.y - 5, deckRect.w, deckRect.h}, false, -2.3, true);
    drawCardRotated(0, SDL_Rect{deckRect.x + 2, deckRect.y - 2, deckRect.w, deckRect.h}, false, -1.1, true);
    drawCard(0, deckRect, false, false, true);
    drawText(
        "MAZO · " + std::to_string(game_.drawPile().size()),
        15,
        kMuted,
        deckRect.x + deckRect.w / 2,
        303,
        1,
        0,
        FontFace::Display
    );

    const SDL_Rect discardRect{1144, 126, 112, 168};
    if (game_.discardPile().empty()) {
        SDL_SetRenderDrawColor(renderer_, kGoldSoft.r, kGoldSoft.g, kGoldSoft.b, 120);
        SDL_RenderDrawRect(renderer_, &discardRect);
        SDL_Rect discardInner{
            discardRect.x + 4,
            discardRect.y + 4,
            discardRect.w - 8,
            discardRect.h - 8
        };
        SDL_RenderDrawRect(renderer_, &discardInner);
        drawText(
            "Vacío",
            21,
            kMuted,
            discardRect.x + discardRect.w / 2,
            discardRect.y + 70,
            1,
            0,
            FontFace::Italic
        );
    } else {
        const int discardSize = static_cast<int>(game_.discardPile().size());
        const int discardIndex = inspectionArea_ == InspectionArea::Discard
            ? std::max(0, std::min(discardSize - 1, inspectionIndex_))
            : discardSize - 1;
        const int discardCardId = game_.discardPile()[discardIndex];
        drawCard(
            discardCardId,
            discardRect,
            false,
            inspectionArea_ == InspectionArea::Discard
        );
        hits_.push_back({discardRect, HitKind::DiscardCard, discardCardId});
    }
    const std::string discardLabel = inspectionArea_ == InspectionArea::Discard
        ? "DESCARTE · " + std::to_string(inspectionIndex_ + 1)
            + "/" + std::to_string(game_.discardPile().size())
        : "DESCARTE · " + std::to_string(game_.discardPile().size());
    drawText(
        discardLabel,
        14,
        inspectionArea_ == InspectionArea::Discard ? kGoldBright : kMuted,
        discardRect.x + discardRect.w / 2,
        303,
        1,
        0,
        FontFace::Display
    );

    for (int slot = first; slot <= last; ++slot) {
        const bool selected = selectingTimeline_ && selectedTimelineSlot_ == slot;
        const int slotCenterX = x + slotWidth / 2;
        if (selected) {
            drawCircle(slotCenterX, axisY, 34, SDL_Color{201, 162, 39, 38}, true);
            drawCircle(slotCenterX, axisY, 30, kGoldBright, false);
        }
        drawCircle(slotCenterX, axisY, 25, SDL_Color{18, 12, 6, 235}, true);
        drawCircle(
            slotCenterX,
            axisY,
            25,
            selected ? kGoldBright : SDL_Color{201, 162, 39, 180},
            false,
            !selected
        );
        SDL_SetRenderDrawColor(
            renderer_,
            selected ? kCream.r : kGold.r,
            selected ? kCream.g : kGold.g,
            selected ? kCream.b : kGold.b,
            255
        );
        SDL_RenderDrawLine(renderer_, slotCenterX, axisY - 10, slotCenterX, axisY + 10);
        SDL_RenderDrawLine(renderer_, slotCenterX - 10, axisY, slotCenterX + 10, axisY);
        if (slot == 0) {
            drawText(
                "ANTES",
                12,
                kGoldBright,
                slotCenterX,
                axisY - 49,
                1,
                0,
                FontFace::Display
            );
        } else if (slot == timelineSize) {
            drawText(
                "DESPUÉS",
                12,
                kGoldBright,
                slotCenterX,
                axisY - 49,
                1,
                0,
                FontFace::Display
            );
        }
        hits_.push_back({SDL_Rect{x, timelineY, slotWidth, cardHeight}, HitKind::TimelineSlot, slot});
        x += slotWidth;
        if (slot < last) {
            const SDL_Rect cardRect{x, timelineY, cardWidth, cardHeight};
            const bool inspected = inspectionArea_ == InspectionArea::Timeline
                && inspectionIndex_ == slot;
            drawCard(timeline[slot], cardRect, false, inspected);
            hits_.push_back({cardRect, HitKind::TimelineCard, timeline[slot]});
            const jwtl::Card* card = jwtl::findCard(timeline[slot]);
            if (card) {
                const SDL_Rect yearRect{x - 3, timelineY + cardHeight + 7, cardWidth + 6, 30};
                drawPanel(
                    yearRect,
                    SDL_Color{201, 162, 39, 28},
                    SDL_Color{201, 162, 39, 120}
                );
                drawText(
                    formatYear(card->year),
                    14,
                    kGoldBright,
                    yearRect.x + yearRect.w / 2,
                    yearRect.y + 7,
                    1,
                    0,
                    FontFace::Display
                );
            }
            x += cardWidth;
        }
    }

    if (first > 0) {
        drawText(
            "‹ " + std::to_string(first),
            22,
            kMuted,
            startX - 16,
            axisY - 14,
            2,
            0,
            FontFace::Body
        );
    }
    if (last < static_cast<int>(timeline.size())) {
        drawText(
            std::to_string(timeline.size() - last) + " ›",
            22,
            kMuted,
            startX + totalWidth + 16,
            axisY - 14,
            0,
            0,
            FontFace::Body
        );
    }

    const int handCount = static_cast<int>(current.hand.size());
    const bool inspectingTimeline = inspectionArea_ == InspectionArea::Timeline;
    const bool inspectingDiscard = inspectionArea_ == InspectionArea::Discard;
    const bool showingStatus = selectingTimeline_ || inspectingTimeline || inspectingDiscard;
    const SDL_Rect handTitle{
        showingStatus ? 400 : 480,
        354,
        showingStatus ? 480 : 320,
        38
    };
    std::string handStatus = "Tu mano · " + std::to_string(handCount)
        + (handCount == 1 ? " carta" : " cartas");
    if (selectingTimeline_) {
        handStatus = "Selecciona un + en la línea de tiempo";
    } else if (inspectingTimeline) {
        handStatus = "Timeline · carta " + std::to_string(inspectionIndex_ + 1)
            + " de " + std::to_string(timeline.size());
    } else if (inspectingDiscard) {
        handStatus = "Descarte · carta " + std::to_string(inspectionIndex_ + 1)
            + " de " + std::to_string(game_.discardPile().size());
    }
    drawPanel(
        handTitle,
        SDL_Color{16, 11, 6, 190},
        showingStatus
            ? SDL_Color{229, 201, 106, 170}
            : SDL_Color{168, 133, 60, 95}
    );
    drawText(
        handStatus,
        showingStatus ? 21 : 22,
        showingStatus ? kGoldBright : kMuted,
        handTitle.x + handTitle.w / 2,
        handTitle.y + 7,
        1,
        0,
        FontFace::Italic
    );

    constexpr int handWidth = 148;
    constexpr int handHeight = 224;
    const int handStep = handCount <= 4 ? 116 : std::max(84, 620 / std::max(1, handCount - 1));
    const int totalHandWidth = handCount == 0
        ? 0
        : handWidth + std::max(0, handCount - 1) * handStep;
    const int handStartX = (kScreenWidth - totalHandWidth) / 2;
    constexpr int handBottom = 657;

    // Primero se pintan las cartas no seleccionadas; la activa queda encima,
    // como en el abanico táctil de la web.
    for (int index = 0; index < handCount; ++index) {
        if (
            !current.isAI
            && inspectionArea_ == InspectionArea::None
            && selectedHandIndex_ == index
        ) {
            continue;
        }
        const double offset = index - (handCount - 1) * 0.5;
        const double angle = std::max(-11.0, std::min(11.0, offset * 5.2));
        const int yOffset = static_cast<int>(std::round(std::abs(offset) * 8.0));
        const SDL_Rect rect{
            handStartX + index * handStep,
            handBottom - handHeight + yOffset,
            handWidth,
            handHeight
        };
        drawCardRotated(
            current.hand[index],
            rect,
            game_.isStudyMode(),
            angle,
            current.isAI
        );
        if (!current.isAI) {
            hits_.push_back({rect, HitKind::HandCard, index});
        }
    }

    if (current.isAI) {
        drawText(
            current.name + " está pensando...",
            23,
            kGoldBright,
            kScreenWidth / 2,
            632,
            1,
            0,
            FontFace::Italic
        );
    } else if (
        inspectionArea_ == InspectionArea::None
        && selectedHandIndex_ < handCount
    ) {
        constexpr int selectedWidth = 176;
        constexpr int selectedHeight = 266;
        const int baseCenterX = handStartX + selectedHandIndex_ * handStep + handWidth / 2;
        const SDL_Rect selectedRect{
            baseCenterX - selectedWidth / 2,
            handBottom - selectedHeight,
            selectedWidth,
            selectedHeight
        };
        drawCard(
            current.hand[selectedHandIndex_],
            selectedRect,
            game_.isStudyMode(),
            true
        );
        hits_.push_back({selectedRect, HitKind::HandCard, selectedHandIndex_});
    }
    if (inspectionArea_ != InspectionArea::None) {
        drawFooter("←/→ Carta    L/R Salto    A/X Ampliar    Y Timeline    ZR Descarte    B Volver");
    } else {
        drawFooter(
            selectingTimeline_
                ? "←/→ Posición     L/R Salto     A Colocar     B Cancelar     + Pausa"
                : "←/→ Mano    A Colocar    X Ampliar    Y Timeline    ZR Descarte    + Pausa"
        );
    }
}

void App::renderPassTurn() {
    const auto& current = game_.players()[game_.currentPlayerIndex()];
    drawImage("romfs:/images/logo.png", SDL_Rect{30, 20, 72, 72});
    const SDL_Rect panel{330, 132, 620, 438};
    drawPanel(panel, SDL_Color{27, 19, 11, 248}, kGoldSoft);
    const SDL_Rect inner{panel.x + 7, panel.y + 7, panel.w - 14, panel.h - 14};
    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 50);
    SDL_RenderDrawRect(renderer_, &inner);
    drawText("CAMBIO DE TURNO", 29, kGoldBright, kScreenWidth / 2, 178, 1, 0, FontFace::Display);
    drawGoldenAxis(470, 237, 340);
    drawCircle(kScreenWidth / 2, 238, 5, kGold, true);
    drawText("Entrega la consola a", 24, kMuted, kScreenWidth / 2, 270, 1, 0, FontFace::Italic);
    drawText(current.name, 43, kCream, kScreenWidth / 2, 320, 1, 0, FontFace::Display);
    const SDL_Rect button{440, 430, 400, 62};
    drawButton(button, "A · MOSTRAR MI MANO", true);
    hits_.push_back({button, HitKind::PauseItem, 3});
    drawFooter("A Continuar     + Pausa");
}

void App::renderPause() {
    SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 180);
    const SDL_Rect overlay{0, 0, kScreenWidth, kScreenHeight};
    SDL_RenderFillRect(renderer_, &overlay);
    const SDL_Rect panel{370, 126, 540, 440};
    drawPanel(panel, SDL_Color{27, 19, 11, 250}, kGoldSoft);
    const SDL_Rect inner{panel.x + 7, panel.y + 7, panel.w - 14, panel.h - 14};
    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 50);
    SDL_RenderDrawRect(renderer_, &inner);
    drawText("PAUSA", 34, kCream, kScreenWidth / 2, 176, 1, 0, FontFace::Display);
    drawText(
        "La partida está guardada",
        21,
        kMuted,
        kScreenWidth / 2,
        225,
        1,
        0,
        FontFace::Italic
    );
    const std::vector<std::string> labels{"CONTINUAR", "GUARDAR Y VOLVER AL MENU"};
    for (int index = 0; index < 2; ++index) {
        const SDL_Rect rect{435, 294 + index * 86, 410, 62};
        drawButton(rect, labels[index], menuIndex_ == index);
        hits_.push_back({rect, HitKind::PauseItem, index});
    }
    drawFooter("↑/↓ Mover     A Elegir     B Continuar");
}

void App::renderStats() {
    drawImage("romfs:/images/logo.png", SDL_Rect{28, 18, 70, 70});
    drawText(
        "ESTADÍSTICAS EN ESTA SWITCH",
        29,
        kCream,
        122,
        30,
        0,
        0,
        FontFace::Display
    );
    drawText("Tu progreso sin conexión", 21, kMuted, 124, 64, 0, 0, FontFace::Italic);
    const SDL_Rect panel{190, 108, 900, 510};
    drawParchmentPanel(panel);

    const std::vector<std::pair<std::string, std::string>> rows{
        {"Partidas jugadas", std::to_string(stats_.gamesPlayed)},
        {"Victorias", std::to_string(stats_.gamesWon)},
        {"Derrotas", std::to_string(stats_.gamesLost)},
        {"Precision", std::to_string(static_cast<int>(std::round(stats_.accuracy()))) + "%"},
        {"Mejor racha", std::to_string(stats_.longestWinStreak)},
        {"Tiempo total", formatDuration(stats_.totalPlaySeconds)},
        {"Victoria mas rapida", stats_.fastestWinSeconds < 0 ? "—" : formatDuration(stats_.fastestWinSeconds)},
    };
    for (std::size_t index = 0; index < rows.size(); ++index) {
        const int y = 138 + static_cast<int>(index) * 57;
        drawText(rows[index].first, 21, SDL_Color{92, 75, 46, 255}, 250, y);
        drawText(rows[index].second, 20, kInk, 1030, y + 2, 2, 0, FontFace::Display);
        SDL_SetRenderDrawColor(renderer_, kGoldSoft.r, kGoldSoft.g, kGoldSoft.b, 70);
        SDL_RenderDrawLine(renderer_, 250, y + 40, 1030, y + 40);
    }
    const SDL_Rect back{470, 552, 340, 50};
    drawParchmentButton(back, "VOLVER", true);
    hits_.push_back({back, HitKind::Back, 0});
    drawFooter("A/B Volver");
}

void App::renderGameOver() {
    const auto& winner = game_.players()[game_.winnerIndex()];
    drawImage("romfs:/images/logo.png", SDL_Rect{96, 178, 270, 270});
    drawText(
        game_.isStudyMode() ? "SESIÓN COMPLETADA" : "PARTIDA TERMINADA",
        30,
        kGoldBright,
        760,
        104,
        1,
        0,
        FontFace::Display
    );
    const SDL_Rect panel{470, 154, 580, 430};
    drawParchmentPanel(panel);
    drawText("GANADOR", 16, SDL_Color{126, 104, 67, 255}, 760, 196, 1, 0, FontFace::Display);
    drawText(winner.name, 42, kInk, 760, 230, 1, 0, FontFace::Display);
    drawGoldenAxis(596, 300, 328);
    drawCircle(760, 301, 5, kGold, true);
    drawText(
        std::to_string(game_.timeline().size()) + " cartas en la linea temporal",
        22,
        SDL_Color{126, 104, 67, 255},
        760,
        329,
        1,
        0,
        FontFace::Italic
    );

    const std::vector<std::string> labels{"REVANCHA", "VOLVER AL MENU"};
    for (int index = 0; index < 2; ++index) {
        const SDL_Rect rect{570, 402 + index * 72, 380, 54};
        drawParchmentButton(rect, labels[index], menuIndex_ == index);
        hits_.push_back({rect, HitKind::GameOverItem, index});
    }
    drawFooter("↑/↓ Mover     A Elegir");
}

void App::renderFeedback() {
    SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 165);
    const SDL_Rect overlay{0, 0, kScreenWidth, kScreenHeight};
    SDL_RenderFillRect(renderer_, &overlay);
    const SDL_Color color = lastPlacement_.correct ? kGreen : kRed;
    const SDL_Rect panel{300, 178, 680, 350};
    drawPanel(panel, SDL_Color{24, 17, 10, 250}, color);
    const SDL_Rect inner{panel.x + 8, panel.y + 8, panel.w - 16, panel.h - 16};
    SDL_SetRenderDrawColor(renderer_, color.r, color.g, color.b, 55);
    SDL_RenderDrawRect(renderer_, &inner);
    drawCard(
        lastPlacement_.cardId,
        SDL_Rect{338, 222, 150, 227},
        true,
        false
    );
    drawText(
        lastPlacement_.correct ? "¡CORRECTO!" : "POSICIÓN INCORRECTA",
        31,
        color,
        540,
        228,
        0,
        0,
        FontFace::Display
    );
    const jwtl::Card* card = jwtl::findCard(lastPlacement_.cardId);
    if (card) {
        drawText(
            card->name,
            24,
            kCream,
            540,
            292,
            0,
            390,
            FontFace::Display
        );
        drawText(
            formatYear(card->year) + " · " + card->bibleRef,
            21,
            kMuted,
            540,
            375,
            0,
            390,
            FontFace::Italic
        );
        if (!lastPlacement_.correct && lastPlacement_.replacementCardId != 0) {
            drawText(
                "Se ha añadido una carta nueva a la mano.",
                19,
                kGoldBright,
                540,
                430,
                0,
                390,
                FontFace::Italic
            );
        }
    }
}

void App::renderZoom() {
    SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 172);
    const SDL_Rect overlay{0, 0, kScreenWidth, kScreenHeight};
    SDL_RenderFillRect(renderer_, &overlay);
    const SDL_Rect panel{348, 68, 584, 574};
    drawPanel(panel, SDL_Color{25, 18, 10, 248}, SDL_Color{201, 162, 39, 150});
    const SDL_Rect inner{panel.x + 7, panel.y + 7, panel.w - 14, panel.h - 14};
    SDL_SetRenderDrawColor(renderer_, kGold.r, kGold.g, kGold.b, 45);
    SDL_RenderDrawRect(renderer_, &inner);
    drawText(
        "CARTA AMPLIADA",
        17,
        kGoldBright,
        kScreenWidth / 2,
        92,
        1,
        0,
        FontFace::Display
    );
    const SDL_Rect card{505, 128, 270, 408};
    drawCard(zoomCardId_, card, zoomRevealYear_, true);
    if (zoomRevealYear_) {
        const jwtl::Card* zoomed = jwtl::findCard(zoomCardId_);
        if (zoomed) {
            const SDL_Rect year{532, 551, 216, 36};
            drawPanel(year, SDL_Color{201, 162, 39, 32}, SDL_Color{201, 162, 39, 130});
            drawText(
                formatYear(zoomed->year),
                16,
                kGoldBright,
                year.x + year.w / 2,
                year.y + 9,
                1,
                0,
                FontFace::Display
            );
        }
    }
    drawText(
        "B o X para cerrar · también puedes tocar fuera",
        18,
        kMuted,
        kScreenWidth / 2,
        608,
        1,
        0,
        FontFace::Italic
    );
}

u64 App::stickNavigationButtons() {
    const HidAnalogStickState left = padGetStickPos(&pad_, 0);
    const HidAnalogStickState right = padGetStickPos(&pad_, 1);
    const auto magnitudeSquared = [](const HidAnalogStickState& stick) {
        return static_cast<std::int64_t>(stick.x) * stick.x
            + static_cast<std::int64_t>(stick.y) * stick.y;
    };
    const HidAnalogStickState stick = magnitudeSquared(left) >= magnitudeSquared(right)
        ? left
        : right;

    constexpr int deadZone = 0x4200;
    const int absoluteX = std::abs(stick.x);
    const int absoluteY = std::abs(stick.y);
    u64 direction = 0;
    if (std::max(absoluteX, absoluteY) >= deadZone) {
        // Una sola dirección por paso evita dobles saltos al mover el stick
        // ligeramente en diagonal.
        if (absoluteX > absoluteY) {
            direction = stick.x < 0 ? HidNpadButton_Left : HidNpadButton_Right;
        } else {
            direction = stick.y < 0 ? HidNpadButton_Down : HidNpadButton_Up;
        }
    }

    const std::uint32_t now = SDL_GetTicks();
    if (direction == 0) {
        stickDirection_ = 0;
        stickRepeatAt_ = 0;
        return 0;
    }
    if (direction != stickDirection_) {
        stickDirection_ = direction;
        stickRepeatAt_ = now + 300;
        return direction;
    }
    if (
        stickRepeatAt_ != 0
        && static_cast<std::int32_t>(now - stickRepeatAt_) >= 0
    ) {
        stickRepeatAt_ = now + 115;
        return direction;
    }
    return 0;
}

void App::handleButtons(u64 down) {
    if (zoomCardId_ != 0) {
        if (down & (HidNpadButton_B | HidNpadButton_X)) {
            zoomCardId_ = 0;
            zoomRevealYear_ = false;
            audio_.click();
        }
        return;
    }
    if (feedbackUntil_ != 0) {
        return;
    }

    if (down & HidNpadButton_Plus) {
        if (screen_ == Screen::Menu) {
            running_ = false;
        } else if (
            screen_ == Screen::Game
            || screen_ == Screen::PassTurn
            || screen_ == Screen::Pause
        ) {
            if (screen_ == Screen::Pause) {
                screen_ = screenBeforePause_;
            } else {
                screenBeforePause_ = screen_;
                screen_ = Screen::Pause;
                menuIndex_ = 0;
            }
            audio_.click();
        }
        return;
    }

    switch (screen_) {
        case Screen::Menu: {
            const int count = static_cast<int>(menuEntries().size());
            if (down & HidNpadButton_Up) menuIndex_ = (menuIndex_ + count - 1) % count;
            if (down & HidNpadButton_Down) menuIndex_ = (menuIndex_ + 1) % count;
            if (down & HidNpadButton_A) activateMenu();
            break;
        }
        case Screen::Decks: {
            if (down & HidNpadButton_Left) deckIndex_ = std::max(0, deckIndex_ - 1);
            if (down & HidNpadButton_Right) deckIndex_ = std::min(8, deckIndex_ + 1);
            if (down & HidNpadButton_Up) deckIndex_ = std::max(0, deckIndex_ - 3);
            if (down & HidNpadButton_Down) deckIndex_ = std::min(8, deckIndex_ + 3);
            if (down & HidNpadButton_A) selectDeck();
            if (down & HidNpadButton_B) returnToMenu();
            break;
        }
        case Screen::Setup: {
            const int last = setupLastFocus();
            if (down & HidNpadButton_Up) setupFocus_ = (setupFocus_ + last) % (last + 1);
            if (down & HidNpadButton_Down) setupFocus_ = (setupFocus_ + 1) % (last + 1);
            if (down & HidNpadButton_Left) {
                if (pendingMode_ == jwtl::GameMode::Local && setupFocus_ == 0) {
                    setupPlayerCount_ = std::max(2, setupPlayerCount_ - 1);
                } else if (pendingMode_ != jwtl::GameMode::Local && setupFocus_ == 1) {
                    setupDifficulty_ = (setupDifficulty_ + 3) % 4;
                }
            }
            if (down & HidNpadButton_Right) {
                if (pendingMode_ == jwtl::GameMode::Local && setupFocus_ == 0) {
                    setupPlayerCount_ = std::min(6, setupPlayerCount_ + 1);
                } else if (pendingMode_ != jwtl::GameMode::Local && setupFocus_ == 1) {
                    setupDifficulty_ = (setupDifficulty_ + 1) % 4;
                }
            }
            setupFocus_ = std::min(setupFocus_, setupLastFocus());
            if (down & HidNpadButton_A) activateSetup();
            if (down & HidNpadButton_B) returnToMenu();
            break;
        }
        case Screen::Game: {
            const auto& timeline = game_.timeline();
            const auto& discard = game_.discardPile();
            if (down & HidNpadButton_Y) {
                if (!timeline.empty()) {
                    if (inspectionArea_ == InspectionArea::Timeline) {
                        inspectionArea_ = InspectionArea::None;
                    } else {
                        inspectionArea_ = InspectionArea::Timeline;
                        inspectionIndex_ = std::max(
                            0,
                            std::min(static_cast<int>(timeline.size()) - 1, timelineCenter_)
                        );
                        timelineCenter_ = inspectionIndex_;
                    }
                    selectingTimeline_ = false;
                    audio_.click();
                }
                break;
            }
            if (down & HidNpadButton_ZR) {
                if (!discard.empty()) {
                    if (inspectionArea_ == InspectionArea::Discard) {
                        inspectionArea_ = InspectionArea::None;
                    } else {
                        inspectionArea_ = InspectionArea::Discard;
                        inspectionIndex_ = static_cast<int>(discard.size()) - 1;
                    }
                    selectingTimeline_ = false;
                    audio_.click();
                }
                break;
            }
            if (inspectionArea_ != InspectionArea::None) {
                const int cardCount = inspectionArea_ == InspectionArea::Timeline
                    ? static_cast<int>(timeline.size())
                    : static_cast<int>(discard.size());
                if (cardCount <= 0) {
                    inspectionArea_ = InspectionArea::None;
                    break;
                }
                if (down & HidNpadButton_Left) {
                    inspectionIndex_ = std::max(0, inspectionIndex_ - 1);
                }
                if (down & HidNpadButton_Right) {
                    inspectionIndex_ = std::min(cardCount - 1, inspectionIndex_ + 1);
                }
                if (down & HidNpadButton_L) {
                    inspectionIndex_ = std::max(0, inspectionIndex_ - 5);
                }
                if (down & HidNpadButton_R) {
                    inspectionIndex_ = std::min(cardCount - 1, inspectionIndex_ + 5);
                }
                if (inspectionArea_ == InspectionArea::Timeline) {
                    timelineCenter_ = inspectionIndex_;
                }
                if (down & (HidNpadButton_A | HidNpadButton_X)) {
                    zoomCardId_ = inspectionArea_ == InspectionArea::Timeline
                        ? timeline[inspectionIndex_]
                        : discard[inspectionIndex_];
                    zoomRevealYear_ = true;
                    audio_.click();
                }
                if (down & HidNpadButton_B) {
                    inspectionArea_ = InspectionArea::None;
                    audio_.click();
                }
                break;
            }
            if (game_.players()[game_.currentPlayerIndex()].isAI) break;
            const int handCount = static_cast<int>(game_.players()[game_.currentPlayerIndex()].hand.size());
            if (!selectingTimeline_) {
                if (down & HidNpadButton_Left) selectedHandIndex_ = std::max(0, selectedHandIndex_ - 1);
                if (down & HidNpadButton_Right) selectedHandIndex_ = std::min(handCount - 1, selectedHandIndex_ + 1);
                if (down & HidNpadButton_A) selectingTimeline_ = true;
                if ((down & HidNpadButton_X) && selectedHandIndex_ < handCount) {
                    zoomCardId_ = game_.players()[game_.currentPlayerIndex()].hand[selectedHandIndex_];
                    zoomRevealYear_ = game_.isStudyMode();
                }
            } else {
                const int maxSlot = static_cast<int>(game_.timeline().size());
                if (down & HidNpadButton_Left) selectedTimelineSlot_ = std::max(0, selectedTimelineSlot_ - 1);
                if (down & HidNpadButton_Right) selectedTimelineSlot_ = std::min(maxSlot, selectedTimelineSlot_ + 1);
                if (down & HidNpadButton_L) selectedTimelineSlot_ = std::max(0, selectedTimelineSlot_ - 5);
                if (down & HidNpadButton_R) selectedTimelineSlot_ = std::min(maxSlot, selectedTimelineSlot_ + 5);
                timelineCenter_ = std::min(std::max(0, maxSlot - 1), selectedTimelineSlot_);
                if (down & HidNpadButton_A) attemptPlacement();
                if (down & HidNpadButton_B) selectingTimeline_ = false;
            }
            break;
        }
        case Screen::PassTurn:
            if (down & HidNpadButton_A) {
                screen_ = Screen::Game;
                resetGameSelection();
                audio_.click();
            }
            break;
        case Screen::Pause:
            if (down & HidNpadButton_Up) menuIndex_ = (menuIndex_ + 1) % 2;
            if (down & HidNpadButton_Down) menuIndex_ = (menuIndex_ + 1) % 2;
            if (down & HidNpadButton_A) {
                activateHit({{}, HitKind::PauseItem, menuIndex_});
            }
            if (down & HidNpadButton_B) screen_ = screenBeforePause_;
            break;
        case Screen::Stats:
            if (down & (HidNpadButton_A | HidNpadButton_B)) returnToMenu();
            break;
        case Screen::GameOver:
            if (down & HidNpadButton_Up) menuIndex_ = (menuIndex_ + 1) % 2;
            if (down & HidNpadButton_Down) menuIndex_ = (menuIndex_ + 1) % 2;
            if (down & HidNpadButton_A) activateHit({{}, HitKind::GameOverItem, menuIndex_});
            break;
    }
}

void App::handleTouch(int x, int y) {
    if (zoomCardId_ != 0) {
        zoomCardId_ = 0;
        zoomRevealYear_ = false;
        return;
    }
    if (feedbackUntil_ != 0) {
        return;
    }
    for (auto iterator = hits_.rbegin(); iterator != hits_.rend(); ++iterator) {
        if (contains(iterator->rect, x, y)) {
            activateHit(*iterator);
            return;
        }
    }
}

void App::activateHit(const HitTarget& hit) {
    audio_.click();
    switch (hit.kind) {
        case HitKind::Menu:
            menuIndex_ = hit.value;
            activateMenu();
            break;
        case HitKind::Deck:
            deckIndex_ = hit.value;
            selectDeck();
            break;
        case HitKind::SetupName:
            setupFocus_ = pendingMode_ == jwtl::GameMode::Local ? hit.value + 1 : 0;
            editName(hit.value);
            break;
        case HitKind::SetupDifficulty:
            setupFocus_ = 1;
            setupDifficulty_ = hit.value;
            break;
        case HitKind::SetupCountMinus:
            setupFocus_ = 0;
            setupPlayerCount_ = std::max(2, setupPlayerCount_ - 1);
            break;
        case HitKind::SetupCountPlus:
            setupFocus_ = 0;
            setupPlayerCount_ = std::min(6, setupPlayerCount_ + 1);
            break;
        case HitKind::SetupStart:
            setupFocus_ = setupLastFocus();
            startConfiguredGame();
            break;
        case HitKind::HandCard:
            selectedHandIndex_ = hit.value;
            selectingTimeline_ = false;
            inspectionArea_ = InspectionArea::None;
            break;
        case HitKind::TimelineCard:
            zoomCardId_ = hit.value;
            zoomRevealYear_ = true;
            break;
        case HitKind::DiscardCard:
            zoomCardId_ = hit.value;
            zoomRevealYear_ = true;
            break;
        case HitKind::TimelineSlot:
            selectedTimelineSlot_ = hit.value;
            selectingTimeline_ = true;
            inspectionArea_ = InspectionArea::None;
            timelineCenter_ = std::max(0, hit.value - 1);
            attemptPlacement();
            break;
        case HitKind::PauseButton:
            screenBeforePause_ = screen_;
            screen_ = Screen::Pause;
            menuIndex_ = 0;
            break;
        case HitKind::PauseItem:
            if (hit.value == 0) {
                screen_ = screenBeforePause_;
            } else if (hit.value == 1) {
                if (sdMounted_) jwtl::saveGameFile(kGameSavePath, game_);
                hasSavedGame_ = sdMounted_ && jwtl::fileExists(kGameSavePath);
                returnToMenu();
            } else if (hit.value == 3) {
                screen_ = Screen::Game;
                resetGameSelection();
            }
            break;
        case HitKind::GameOverItem:
            if (hit.value == 0) beginRematch();
            else returnToMenu();
            break;
        case HitKind::Back:
            returnToMenu();
            break;
    }
}

void App::activateMenu() {
    const auto entries = menuEntries();
    if (menuIndex_ < 0 || menuIndex_ >= static_cast<int>(entries.size())) {
        return;
    }
    audio_.click();
    switch (entries[menuIndex_].action) {
        case MenuAction::Continue:
            resumeSavedGame();
            break;
        case MenuAction::Ai:
            pendingMode_ = jwtl::GameMode::Ai;
            deckIndex_ = 0;
            setupFocus_ = 0;
            screen_ = Screen::Setup;
            break;
        case MenuAction::Local:
            pendingMode_ = jwtl::GameMode::Local;
            deckIndex_ = 0;
            setupFocus_ = 0;
            screen_ = Screen::Setup;
            break;
        case MenuAction::Study:
            pendingMode_ = jwtl::GameMode::Study;
            deckIndex_ = 0;
            setupDifficulty_ = static_cast<int>(jwtl::AIDifficulty::Easy);
            startConfiguredGame();
            break;
        case MenuAction::Stats:
            screen_ = Screen::Stats;
            break;
        case MenuAction::Exit:
            running_ = false;
            break;
    }
}

void App::selectDeck() {
    audio_.click();
    if (pendingMode_ == jwtl::GameMode::Study) {
        setupDifficulty_ = static_cast<int>(jwtl::AIDifficulty::Easy);
        startConfiguredGame();
        return;
    }
    setupFocus_ = 0;
    screen_ = Screen::Setup;
}

void App::activateSetup() {
    audio_.click();
    if (pendingMode_ == jwtl::GameMode::Local) {
        if (setupFocus_ == 0) return;
        if (setupFocus_ <= setupPlayerCount_) {
            editName(setupFocus_ - 1);
            return;
        }
    } else {
        if (setupFocus_ == 0) {
            editName(0);
            return;
        }
        if (setupFocus_ == 1) return;
    }
    startConfiguredGame();
}

void App::editName(int playerIndex) {
    if (playerIndex < 0 || playerIndex >= static_cast<int>(setupNames_.size())) {
        return;
    }
    SwkbdConfig keyboard;
    if (R_FAILED(swkbdCreate(&keyboard, 0))) {
        return;
    }
    swkbdConfigMakePresetUserName(&keyboard);
    swkbdConfigSetHeaderText(&keyboard, "Nombre del jugador");
    swkbdConfigSetGuideText(&keyboard, "Escribe un nombre");
    swkbdConfigSetOkButtonText(&keyboard, "Aceptar");
    swkbdConfigSetStringLenMax(&keyboard, 20);
    swkbdConfigSetInitialText(&keyboard, setupNames_[playerIndex].c_str());
    char output[64]{};
    const Result result = swkbdShow(&keyboard, output, sizeof(output));
    swkbdClose(&keyboard);
    if (R_SUCCEEDED(result) && output[0] != '\0') {
        setupNames_[playerIndex] = output;
        clearTextCache();
    }
}

void App::startConfiguredGame() {
    const auto& decks = jwtl::deckDefinitions();
    if (deckIndex_ < 0 || deckIndex_ >= static_cast<int>(decks.size())) {
        return;
    }
    const auto seed = static_cast<std::uint32_t>(std::time(nullptr))
        ^ static_cast<std::uint32_t>(SDL_GetTicks());
    if (!game_.start(
        pendingMode_,
        decks[deckIndex_].id,
        setupPlayerCount_,
        static_cast<jwtl::AIDifficulty>(setupDifficulty_),
        seed
    )) {
        return;
    }
    const int nameCount = pendingMode_ == jwtl::GameMode::Local ? setupPlayerCount_ : 1;
    for (int index = 0; index < nameCount; ++index) {
        game_.setPlayerName(index, setupNames_[index]);
    }
    resultRecorded_ = false;
    feedbackUntil_ = 0;
    aiTurnDue_ = 0;
    resetGameSelection();
    screen_ = Screen::Game;
    if (sdMounted_) {
        jwtl::saveGameFile(kGameSavePath, game_);
        hasSavedGame_ = true;
    }
}

void App::resumeSavedGame() {
    jwtl::Game loaded;
    if (!sdMounted_ || !jwtl::loadGameFile(kGameSavePath, loaded)) {
        jwtl::deleteGameFile(kGameSavePath);
        hasSavedGame_ = false;
        menuIndex_ = 0;
        return;
    }
    game_ = std::move(loaded);
    resultRecorded_ = false;
    resetGameSelection();
    if (game_.isGameOver()) {
        finishCompletedGame();
        return;
    }
    screen_ = game_.mode() == jwtl::GameMode::Local ? Screen::PassTurn : Screen::Game;
    scheduleAiIfNeeded();
}

void App::resetGameSelection() {
    selectedHandIndex_ = 0;
    selectedTimelineSlot_ = 0;
    selectingTimeline_ = false;
    inspectionArea_ = InspectionArea::None;
    inspectionIndex_ = 0;
    zoomCardId_ = 0;
    zoomRevealYear_ = false;
    timelineCenter_ = std::max(0, static_cast<int>(game_.timeline().size()) - 1);
}

void App::attemptPlacement() {
    if (
        screen_ != Screen::Game
        || feedbackUntil_ != 0
        || game_.players()[game_.currentPlayerIndex()].isAI
    ) {
        return;
    }
    const auto& hand = game_.players()[game_.currentPlayerIndex()].hand;
    if (selectedHandIndex_ < 0 || selectedHandIndex_ >= static_cast<int>(hand.size())) {
        return;
    }
    const int cardId = hand[selectedHandIndex_];
    processPlacement(game_.placeCard(cardId, selectedTimelineSlot_));
}

void App::processPlacement(const jwtl::PlacementResult& result) {
    if (!result.valid) {
        return;
    }
    lastPlacement_ = result;
    feedbackUntil_ = SDL_GetTicks() + 1250;
    aiTurnDue_ = 0;
    timelineCenter_ = std::max(0, result.timelineIndex);
    selectingTimeline_ = false;
    selectedHandIndex_ = 0;
    if (result.correct) audio_.correct();
    else audio_.incorrect();
    if (sdMounted_) jwtl::saveGameFile(kGameSavePath, game_);
}

void App::updateTimedState() {
    const std::uint32_t now = SDL_GetTicks();
    if (feedbackUntil_ != 0 && static_cast<std::int32_t>(now - feedbackUntil_) >= 0) {
        feedbackUntil_ = 0;
        if (lastPlacement_.gameOver || game_.isGameOver()) {
            finishCompletedGame();
        } else if (game_.mode() == jwtl::GameMode::Local) {
            screen_ = Screen::PassTurn;
        } else {
            screen_ = Screen::Game;
            resetGameSelection();
            scheduleAiIfNeeded();
        }
    }

    if (
        screen_ == Screen::Game
        && feedbackUntil_ == 0
        && aiTurnDue_ != 0
        && static_cast<std::int32_t>(now - aiTurnDue_) >= 0
    ) {
        aiTurnDue_ = 0;
        processPlacement(game_.playAiTurn());
    }
}

void App::finishCompletedGame() {
    if (!resultRecorded_) {
        jwtl::recordCompletedGame(stats_, game_, static_cast<std::int64_t>(std::time(nullptr)));
        if (sdMounted_) {
            jwtl::saveStatsFile(kStatsSavePath, stats_);
            jwtl::deleteGameFile(kGameSavePath);
        }
        resultRecorded_ = true;
    }
    hasSavedGame_ = false;
    feedbackUntil_ = 0;
    aiTurnDue_ = 0;
    menuIndex_ = 0;
    screen_ = Screen::GameOver;
}

void App::scheduleAiIfNeeded() {
    if (
        screen_ == Screen::Game
        && !game_.isGameOver()
        && game_.players()[game_.currentPlayerIndex()].isAI
    ) {
        aiTurnDue_ = SDL_GetTicks() + 900;
    }
}

void App::returnToMenu() {
    feedbackUntil_ = 0;
    aiTurnDue_ = 0;
    inspectionArea_ = InspectionArea::None;
    inspectionIndex_ = 0;
    zoomCardId_ = 0;
    zoomRevealYear_ = false;
    screen_ = Screen::Menu;
    hasSavedGame_ = sdMounted_ && jwtl::fileExists(kGameSavePath);
    menuIndex_ = 0;
}

void App::beginRematch() {
    const jwtl::GameMode mode = game_.mode();
    const jwtl::AIDifficulty difficulty = game_.difficulty();
    const std::string deckId = game_.deckId();
    const int playerCount = static_cast<int>(game_.players().size());
    std::vector<std::string> names;
    for (const auto& player : game_.players()) {
        names.push_back(player.name);
    }
    const auto seed = static_cast<std::uint32_t>(std::time(nullptr))
        ^ static_cast<std::uint32_t>(SDL_GetTicks());
    if (!game_.start(mode, deckId, playerCount, difficulty, seed)) {
        returnToMenu();
        return;
    }
    for (int index = 0; index < static_cast<int>(names.size()); ++index) {
        game_.setPlayerName(index, names[index]);
    }
    resultRecorded_ = false;
    resetGameSelection();
    screen_ = Screen::Game;
    if (sdMounted_) {
        jwtl::saveGameFile(kGameSavePath, game_);
        hasSavedGame_ = true;
    }
}

}  // namespace

int main(int, char**) {
    App app;
    if (!app.initialize()) {
        app.shutdown();
        return 1;
    }
    app.run();
    app.shutdown();
    return 0;
}
