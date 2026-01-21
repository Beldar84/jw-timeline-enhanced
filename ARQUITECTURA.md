# 🏗️ Arquitectura del Sistema - JW Timeline Mejorado

## 📐 Diagrama General

```
┌─────────────────────────────────────────────────────────┐
│                      APP.TSX (ROOT)                     │
│                  Estado Global del Juego                │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        v                 v
┌───────────────┐  ┌─────────────────┐
│   UI LAYER    │  │  SERVICES LAYER │
│  (Components) │  │   (Business)    │
└───────────────┘  └─────────────────┘
```

## 🧩 Capas de la Aplicación

### 1️⃣ Capa de Servicios (Business Logic)

```
services/
├── statsService.ts       → Estadísticas y logros
│   ├── loadStats()
│   ├── saveStats()
│   ├── startSession()
│   ├── recordPlacement()
│   ├── endSession()
│   └── checkAchievements()
│
├── deckService.ts        → Gestión de mazos
│   ├── getAllDecks()
│   ├── getDeckById()
│   ├── shuffleDeck()
│   └── getColorClasses()
│
├── gameService.ts        → Lógica multijugador P2P
│   ├── createGame()
│   ├── joinGame()
│   ├── placeCard()
│   └── playAITurn()
│
└── soundService.ts       → Efectos de sonido
    ├── playClick()
    ├── playCorrect()
    ├── playIncorrect()
    └── playWin()
```

### 2️⃣ Capa de Componentes (UI)

```
components/
├── 🎯 PANTALLAS PRINCIPALES
│   ├── MainMenuEnhanced.tsx         → Menú con stats y tutorial
│   ├── DeckSelector.tsx             → Selector de mazos
│   ├── GameBoard.tsx                → Tablero de juego
│   └── GameOver.tsx                 → Pantalla final
│
├── 📊 FEATURES NUEVAS
│   ├── StatsPanel.tsx               → Panel de estadísticas
│   ├── Tutorial.tsx                 → Tutorial interactivo
│   └── AchievementNotification.tsx  → Notificaciones de logros
│
├── 💫 ANIMACIONES
│   ├── AnimationLayerEnhanced.tsx   → Animaciones mejoradas
│   └── FeedbackMessage.tsx          → Feedback visual
│
└── 🎮 COMPONENTES DE JUEGO
    ├── GameSetup.tsx                → Configuración partida
    ├── PlayerHand.tsx               → Mano del jugador
    ├── Timeline.tsx                 → Línea de tiempo
    ├── Card.tsx                     → Carta individual
    └── ... (otros componentes)
```

## 🔄 Flujo de Datos

### Flujo de una Partida Completa

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIO                                                    │
│    User clicks "Jugar contra IA"                            │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 2. SELECCIÓN DE MAZO                                        │
│    deckService.getAllDecks() → Muestra 9 mazos             │
│    User selecciona "Vida de Jesús"                         │
│    selectedDeckId = "jesus"                                 │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 3. CONFIGURACIÓN                                            │
│    GameSetup → User ingresa nombres                         │
│    startGame(playerNames, withAI=true)                      │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 4. INICIO DE SESIÓN                                         │
│    statsService.startSession("jesus")                       │
│    - Marca timestamp de inicio                              │
│    - Inicializa contadores                                  │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 5. JUEGO                                                    │
│    ┌─ User coloca carta ─────────────────────────┐         │
│    │  handleAttemptPlaceCard()                   │         │
│    │  ├─ Valida posición (isCorrect?)            │         │
│    │  ├─ AnimationLayerEnhanced (con arco)       │         │
│    │  ├─ statsService.recordPlacement(isCorrect) │         │
│    │  └─ handlePlacementResult()                 │         │
│    └─────────────────────────────────────────────┘         │
│                                                              │
│    ┌─ IA coloca carta ──────────────────────────┐         │
│    │  decideAIMove()                             │         │
│    │  ├─ Calcula mejores movimientos             │         │
│    │  ├─ 30% probabilidad de error               │         │
│    │  ├─ AnimationLayerEnhanced                  │         │
│    │  └─ handlePlacementResult()                 │         │
│    └─────────────────────────────────────────────┘         │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 6. FIN DE PARTIDA                                           │
│    Un jugador se queda sin cartas                           │
│    setWinner(player)                                        │
│    setGamePhase(GAME_OVER)                                  │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 7. ACTUALIZACIÓN DE STATS                                  │
│    statsService.endSession(playerWon)                       │
│    ├─ Calcula duración de partida                          │
│    ├─ Actualiza gamesPlayed, gamesWon, etc.                │
│    ├─ Actualiza estadísticas del mazo                      │
│    ├─ checkAchievements()                                  │
│    │   ├─ ¿Primera victoria? → Unlock 🏆                   │
│    │   ├─ ¿Sin errores? → Unlock ⭐                        │
│    │   ├─ ¿< 5 min? → Unlock ⚡                            │
│    │   └─ ¿Racha 3+? → Unlock 🔥                           │
│    └─ saveStats() → LocalStorage                           │
└──────────┬──────────────────────────────────────────────────┘
           │
           v
┌─────────────────────────────────────────────────────────────┐
│ 8. NOTIFICACIÓN DE LOGROS                                  │
│    Si hay logro nuevo:                                      │
│    setNewAchievement(achievement)                           │
│    → AchievementNotification aparece                        │
│    → Auto-cierra después de 5 segundos                     │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Sistema de Estado

### Estado Principal en App.tsx

```typescript
// Estados del juego
gamePhase: GamePhase              // MENU | SETUP | PLAYING | GAME_OVER
gameMode: 'local' | 'ai' | 'online'
selectedDeckId: string            // ID del mazo seleccionado

// Estados de jugadores y partida
players: Player[]
currentPlayerIndex: number
timeline: Card[]
deck: Card[]
discardPile: Card[]
winner: Player | null

// Estados de UI
showDeckSelector: boolean
showStats: boolean
showTutorial: boolean
newAchievement: Achievement | null

// Estados de animación
animation: AnimationInfo | null
hidingCardId: number | null
feedback: 'correct' | 'incorrect' | null
```

## 📊 Persistencia de Datos

### LocalStorage Schema

```javascript
// Key: "jw_timeline_stats"
{
  gamesPlayed: number,
  gamesWon: number,
  gamesLost: number,
  totalCardsPlaced: number,
  correctPlacements: number,
  incorrectPlacements: number,
  longestWinStreak: number,
  currentWinStreak: number,
  fastestWin: number | null,
  averageGameDuration: number,
  totalPlayTime: number,
  achievements: [
    {
      id: string,
      name: string,
      description: string,
      unlockedAt: number | null,
      icon: string
    }
  ],
  deckStats: {
    [deckId: string]: {
      gamesPlayed: number,
      gamesWon: number,
      cardsPlaced: number,
      correctPlacements: number
    }
  }
}

// Key: "jw_timeline_tutorial_completed"
"true" | null
```

## 🎯 Sistema de Logros

### Lógica de Detección

```
checkAchievements(stats, session)
│
├─ ¿gamesWon === 1?
│  └─ → Unlock "Primera Victoria" 🏆
│
├─ ¿session.incorrectPlacements === 0 && playerWon?
│  └─ → Unlock "Juego Perfecto" ⭐
│
├─ ¿duration < 300s && playerWon?
│  └─ → Unlock "Rayo Veloz" ⚡
│
├─ ¿currentWinStreak >= 3?
│  └─ → Unlock "Racha de 3" 🔥
│
├─ ¿currentWinStreak >= 5?
│  └─ → Unlock "Racha de 5" 💥
│
├─ ¿currentWinStreak >= 10?
│  └─ → Unlock "Imparable" 👑
│
├─ ¿gamesPlayed >= 50?
│  └─ → Unlock "Veterano" 🎖️
│
├─ ¿gamesPlayed >= 100?
│  └─ → Unlock "Maestro" 🏅
│
├─ ¿accuracy >= 80%?
│  └─ → Unlock "Precisión 80%" 🎯
│
└─ ¿accuracy >= 90%?
   └─ → Unlock "Precisión 90%" 💎
```

## 💫 Sistema de Animaciones

### Flujo de Animación Mejorada

```
AnimationLayerEnhanced
│
├─ Tipo: "placement" (colocación)
│  ├─ Fase 1: Carta sube hacia arriba (arco)
│  │   - duration: 300ms
│  │   - transform: translate + rotate(5deg) + scale(1.1)
│  │
│  ├─ Fase 2: Carta baja a destino
│  │   - duration: 300ms
│  │   - transform: translate + rotate(0) + scale(1)
│  │
│  └─ Fase 3: Partículas explotan
│      - 8 partículas
│      - direcciones: 360° / 8 = 45° cada una
│      - animation: sparkle 600ms
│
├─ Tipo: "draw" (robar)
│  └─ Animación directa con bounce
│      - duration: 400ms
│      - easing: cubic-bezier(0.34, 1.56, 0.64, 1)
│
└─ Tipo: "discard" (descartar)
   └─ Animación directa con fade
       - duration: 600ms
       - opacity: 0.7
```

## 🎨 Sistema de Mazos

### Estructura de Mazo

```typescript
interface Deck {
  id: string              // "complete", "old_testament", etc.
  name: string            // "Biblia Completa"
  description: string     // "Todos los eventos..."
  icon: string            // "📖"
  cards: Card[]           // Array de cartas filtradas
  difficulty: 'easy' | 'medium' | 'hard'
  color: string           // "purple", "amber", etc.
}
```

### Filtrado de Cartas por Mazo

```
deckService.initializeDecks()
│
├─ "complete" → CARD_DATA (todas las 112 cartas)
│
├─ "old_testament" → filter(year < 0)
│
├─ "new_testament" → filter(year >= 0)
│
├─ "patriarchs" → filter(year < -1593 && year >= -4026)
│
├─ "kings" → filter(year >= -1117 && year < -539)
│
├─ "jesus" → filter(year >= -2 && year <= 33)
│
├─ "early_church" → filter(year > 33 && year <= 100)
│
├─ "creation" → filter(year <= -2370 && year >= -14B)
│
└─ "exile" → filter(year >= -625 && year <= -406)
```

## 🔐 Seguridad y Validación

### Validaciones Implementadas

```
1. Colocación de Cartas
   ├─ Verificar que sea el turno del jugador
   ├─ Verificar que la carta esté en la mano
   ├─ Verificar lógica de posición (prevCard < card < nextCard)
   └─ Prevenir clicks durante animaciones

2. Estadísticas
   ├─ Validar formato antes de guardar
   ├─ Manejar errores de LocalStorage
   ├─ Mergear achievements al cargar
   └─ Prevenir corruption de datos

3. Multijugador Online
   ├─ Validar que sea el turno correcto
   ├─ Verificar propiedad de carta
   ├─ Solo el host ejecuta lógica
   └─ Clientes reciben actualizaciones
```

## 📱 Responsive Design

### Breakpoints

```css
Mobile:  < 768px
  - Stack vertical
  - Botones más grandes
  - Padding reducido
  - Fuentes más pequeñas

Tablet:  768px - 1024px
  - Grid 2 columnas
  - Tamaño medio
  - Padding medio

Desktop: > 1024px
  - Grid 3 columnas
  - Tamaño completo
  - Padding amplio
```

## 🚀 Optimizaciones de Rendimiento

### Estrategias Implementadas

```
1. React Optimizations
   ├─ useMemo para cálculos costosos
   │   - currentPlayer computation
   │   - localPlayer computation
   │
   ├─ useCallback para funciones estables
   │   - handleNextTurn
   │   - handlePlacementResult
   │
   └─ Conditional rendering
       - Componentes solo cuando necesario

2. Animation Optimizations
   ├─ requestAnimationFrame para fluidez
   ├─ CSS transitions (GPU accelerated)
   ├─ Cleanup en useEffect
   └─ Evitar re-renders durante animaciones

3. Storage Optimizations
   ├─ Batch updates de stats
   ├─ Solo guardar al final de partida
   ├─ Evitar escrituras innecesarias
   └─ Comprimir datos si crece mucho
```

## 🔄 Ciclo de Vida de Componentes

### App.tsx Lifecycle

```
Mount
  ├─ Cargar stats de LocalStorage
  ├─ Verificar si mostrar tutorial
  ├─ Inicializar servicios
  └─ Renderizar menú principal

User Interaction
  ├─ onSelectMode → Mostrar selector de mazos
  ├─ onDeckSelected → Ir a setup
  ├─ onStartGame → Iniciar sesión stats
  ├─ Durante juego → Actualizar estados
  └─ onGameOver → Finalizar sesión stats

Unmount
  └─ Cleanup de listeners
```

## 🧪 Testing Recomendado

### Test Cases Sugeridos

```
1. Estadísticas
   ✓ Guardar y cargar correctamente
   ✓ Calcular accuracy correctamente
   ✓ Desbloquear logros según condiciones
   ✓ Resetear sin errores

2. Mazos
   ✓ Filtrar cartas correctamente
   ✓ Devolver colores correctos
   ✓ Shuffle funciona

3. Animaciones
   ✓ Completar sin errores
   ✓ Callback ejecutado al final
   ✓ Partículas renderizan

4. Tutorial
   ✓ Mostrar primera vez
   ✓ No mostrar si completado
   ✓ Navegación funciona
```

---

## 📚 Referencias Técnicas

### Dependencias Clave

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "typescript": "~5.8.2",
  "vite": "^6.2.0"
}
```

### Tipos TypeScript

Ver `types.ts` para:
- `Card` - Estructura de carta
- `Player` - Estructura de jugador
- `GameState` - Estado del juego
- `GamePhase` - Fases del juego

### Utilidades

- `shuffleArray<T>()` - Fisher-Yates shuffle
- `statsService.formatTime()` - Formato MM:SS
- `deckService.getColorClasses()` - Colores Tailwind

---

Esta arquitectura proporciona una base sólida, escalable y mantenible para JW Timeline. 🎮✨
