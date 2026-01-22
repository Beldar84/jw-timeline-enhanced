# 🔙 Fix: Botones Volver + Tutorial Solo Desktop

## 🔴 Problemas Identificados

### 1. Sin Botón Volver en Setup Online
**Problema**: En la pantalla "Crear/Unirse Sala Online", no había forma de volver al menú sin recargar la página.

### 2. Sin Botón Volver en Sala de Espera
**Problema**: Una vez en la sala de espera online, tanto el anfitrión como los invitados quedaban atrapados sin poder salir.

### 3. Tutorial Automático en Móvil
**Problema**: El tutorial se cargaba automáticamente en móvil, ocupando toda la pantalla pequeña y siendo difícil de usar con gestos táctiles.

---

## ✅ Soluciones Implementadas

### 1. Botón Volver en OnlineSetup

**Archivo**: `components/OnlineSetup.tsx`

#### Props Actualizadas (líneas 5-8):
```typescript
interface OnlineSetupProps {
  onJoinLobby: (playerName: string, gameId?: string) => Promise<void>;
  onBack: () => void;  // ← Nueva prop
}
```

#### Handler Agregado (líneas 35-38):
```typescript
const handleBack = () => {
  soundService.playClick();
  onBack();
};
```

#### Botones Rediseñados (líneas 79-102):
```typescript
<div className="flex gap-3 w-full space-y-0 pb-2">
  <button
    onClick={handleBack}
    disabled={isLoading}
    className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gray-600 text-base md:text-lg font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
  >
    Volver
  </button>
  <button
    onClick={handleStart}
    disabled={!playerName.trim() || isLoading}
    className="flex-1 px-4 py-2.5 md:px-8 md:py-4 bg-purple-600 text-base md:text-xl font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105 flex justify-center items-center"
  >
    {/* ... spinner y texto ... */}
    {buttonText}
  </button>
</div>
```

**Características**:
- ✅ Dos botones lado a lado (flex)
- ✅ "Volver" a la izquierda (gris)
- ✅ "Crear/Unirse Sala" a la derecha (morado)
- ✅ Ambos deshabilitados durante carga
- ✅ Responsive (más compactos en móvil)

---

### 2. Botón Volver en OnlineLobby

**Archivo**: `components/OnlineLobby.tsx`

#### Props Actualizadas (líneas 6-11):
```typescript
interface OnlineLobbyProps {
  gameState: GameState;
  localPlayerId: string;
  onStartGame: (gameId: string) => void;
  onAddBot: (gameId: string) => void;
  onBack: () => void;  // ← Nueva prop
}
```

#### Handler Agregado (líneas 37-40):
```typescript
const handleBack = () => {
  soundService.playClick();
  onBack();
};
```

#### Para el Anfitrión (líneas 83-104):
```typescript
{isHost && (
  <div className="flex flex-col items-center w-full max-w-md space-y-3 md:space-y-4 pb-6">
    <button onClick={handleAddBotClick} ...>
      Añadir Jugador IA
    </button>
    <button onClick={handleStartGameClick} ...>
      Empezar Partida
    </button>
    <button
      onClick={handleBack}
      className="w-full px-4 py-2 md:px-6 md:py-2.5 bg-gray-600 text-sm md:text-base font-bold rounded-lg hover:bg-gray-700 transition"
    >
      Volver al Menú
    </button>
  </div>
)}
```

#### Para los Invitados (líneas 105-115):
```typescript
{!isHost && (
  <div className="flex flex-col items-center w-full max-w-md space-y-3 pb-6">
    <p className="text-yellow-100 text-sm md:text-base">
      Esperando a que el anfitrión inicie la partida...
    </p>
    <button
      onClick={handleBack}
      className="w-full px-4 py-2 md:px-6 md:py-2.5 bg-gray-600 text-sm md:text-base font-bold rounded-lg hover:bg-gray-700 transition"
    >
      Volver al Menú
    </button>
  </div>
)}
```

**Características**:
- ✅ Botón "Volver al Menú" para anfitrión (debajo de otros botones)
- ✅ Botón "Volver al Menú" para invitados (debajo del mensaje de espera)
- ✅ Envuelto en contenedor flex para mejor espaciado
- ✅ Responsive (más compacto en móvil)
- ✅ Desconecta automáticamente de la sala

---

### 3. Tutorial Solo en Desktop

**Archivo**: `App.tsx`

#### Detección de Móvil (líneas 86-90):
```typescript
// Show tutorial on first launch (only on desktop)
useEffect(() => {
  const isMobile = window.innerWidth < 768;
  if (shouldShowTutorial() && gamePhase === GamePhase.MENU && !isMobile) {
    setShowTutorial(true);
  }
}, []);
```

**Lógica**:
1. Detecta si es móvil: `window.innerWidth < 768` (breakpoint md de Tailwind)
2. Solo muestra tutorial si:
   - ✅ Es primera vez (`shouldShowTutorial()`)
   - ✅ Está en el menú (`gamePhase === GamePhase.MENU`)
   - ✅ **NO** es móvil (`!isMobile`)

**Resultado**:
- ✅ Desktop: Tutorial se muestra automáticamente (primera vez)
- ✅ Móvil: Tutorial NO se muestra automáticamente
- ✅ Móvil: Usuario puede activarlo manualmente desde el menú si quiere

---

### 4. Integración en App.tsx

#### Props Pasadas (líneas 474-485):
```typescript
case GamePhase.SETUP:
  if (gameMode === 'local') return <GameSetup onStartGame={handleStartLocalGame} />;
  if (gameMode === 'ai') return <AISetup onStartGame={handleStartAIGame} />;
  if (gameMode === 'online') return <OnlineSetup onJoinLobby={handleJoinLobby} onBack={handleRestart} />;
  return null;
case GamePhase.LOBBY:
  return onlineGameState && localPlayerId ? (
    <OnlineLobby
      gameState={onlineGameState}
      localPlayerId={localPlayerId}
      onStartGame={handleStartOnlineGame}
      onAddBot={handleAddBotOnline}
      onBack={handleRestart}  // ← Nueva prop
    />
  ) : <div>Cargando...</div>
```

**Función Reutilizada**:
- Tanto `OnlineSetup` como `OnlineLobby` usan `handleRestart()` para volver
- `handleRestart()` limpia todo el estado y vuelve al menú
- Desconecta de PeerJS automáticamente

---

## 🎯 Flujo de Usuario Mejorado

### Antes:
```
Menú → Jugar Online → [Setup]
                         ↓
                      [Lobby]
                         ↓
                    🚫 ATRAPADO
                    (solo recargando página)
```

### Ahora:
```
Menú → Jugar Online → [Setup]
  ↑                      ↓ ↑
  └────[Volver]─────────┘ │
                           │
                        [Lobby]
                           ↓ ↑
                           │ │
                      [Empezar]
                           │ │
                           └─┴─[Volver al Menú]
```

---

## 🎨 Diseño de Botones

### OnlineSetup (Crear/Unirse):
```
┌─────────────────────────────┐
│   [Tu nombre: _______]     │
│   [ID Partida: ______ ]    │
│                             │
│ [Volver] [Crear/Unirse]    │
│  (gris)      (morado)      │
└─────────────────────────────┘
```

### OnlineLobby (Anfitrión):
```
┌─────────────────────────────┐
│   ID: JW-1234  [Copiar]    │
│                             │
│   Jugadores: Juan, María   │
│                             │
│   [Añadir Jugador IA]      │
│   [Empezar Partida]        │
│   [Volver al Menú]         │
│      (gris)                 │
└─────────────────────────────┘
```

### OnlineLobby (Invitado):
```
┌─────────────────────────────┐
│   ID: JW-1234  [Copiar]    │
│                             │
│   Jugadores: Juan, María   │
│                             │
│   Esperando al anfitrión... │
│                             │
│   [Volver al Menú]         │
│      (gris)                 │
└─────────────────────────────┘
```

---

## 📝 Archivos Modificados

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `components/OnlineSetup.tsx` | • Prop `onBack`<br>• Handler `handleBack()`<br>• Botones en flex (Volver + Crear/Unirse) |
| 2 | `components/OnlineLobby.tsx` | • Prop `onBack`<br>• Handler `handleBack()`<br>• Botón "Volver al Menú" para anfitrión<br>• Botón "Volver al Menú" para invitado |
| 3 | `App.tsx` | • Props `onBack={handleRestart}` pasadas<br>• Tutorial solo desktop (`!isMobile`) |

---

## 🧪 Para Verificar

### Botón Volver en Setup Online:
1. [ ] Ve a "Jugar online"
2. [ ] Verifica que aparece botón "Volver" a la izquierda
3. [ ] Haz clic en "Volver"
4. [ ] Verifica que vuelves al menú principal
5. [ ] Sonido "click" al presionar

### Botón Volver en Lobby (Anfitrión):
1. [ ] Crea una sala online
2. [ ] Verifica que aparece botón "Volver al Menú" (debajo de otros botones)
3. [ ] Haz clic en "Volver al Menú"
4. [ ] Verifica que vuelves al menú
5. [ ] Verifica que la sala se cierra (otros jugadores desconectados)

### Botón Volver en Lobby (Invitado):
1. [ ] Únete a una sala existente
2. [ ] Verifica que aparece botón "Volver al Menú" (debajo del mensaje de espera)
3. [ ] Haz clic en "Volver al Menú"
4. [ ] Verifica que vuelves al menú
5. [ ] Verifica que te desconectas (anfitrión ve que saliste)

### Tutorial Solo Desktop:
1. [ ] Borra localStorage (o modo incógnito)
2. [ ] Abre en **móvil** (ancho < 768px)
3. [ ] Verifica que tutorial NO aparece automáticamente
4. [ ] Verifica que puedes abrirlo manualmente si quieres
5. [ ] Abre en **desktop** (ancho >= 768px)
6. [ ] Verifica que tutorial SÍ aparece automáticamente

---

## 💡 Detalles de Implementación

### Desconexión Limpia

Cuando se presiona "Volver" desde lobby, se llama a `handleRestart()` que:

1. Cambia fase a `GamePhase.MENU`
2. Resetea `gameMode` a `null`
3. Limpia `onlineGameState`
4. Limpia `localPlayerId`
5. **Llama a `gameService.disconnect()`**:
   - Cierra conexión PeerJS
   - Notifica a peers conectados
   - Limpia listeners

### Detección de Móvil

Usa `window.innerWidth < 768`:
- **768px** es el breakpoint `md:` de Tailwind
- Coincide con la definición de "móvil" en todo el CSS
- Consistente con otros componentes responsive

### Sonido Consistente

Todos los botones usan `soundService.playClick()`:
- Feedback auditivo consistente
- Mejora UX
- Misma experiencia que otros botones

---

## 🚀 Para Desplegar

```bash
git add components/OnlineSetup.tsx \
  components/OnlineLobby.tsx \
  App.tsx \
  FIX_BOTONES_VOLVER_Y_TUTORIAL.md

git commit -m "Add: botones Volver + tutorial solo desktop

BOTONES VOLVER:
- OnlineSetup: botones Volver/Crear lado a lado
- OnlineLobby: botón Volver al Menú (anfitrión e invitados)
- Desconexión limpia de PeerJS al volver
- Sonido click consistente

TUTORIAL:
- Detecta móvil con window.innerWidth < 768
- Tutorial NO se muestra automáticamente en móvil
- Tutorial SÍ se muestra automáticamente en desktop
- Usuario puede activarlo manualmente desde menú

UX:
- Usuario nunca queda atrapado
- Navegación clara y consistente
- Mejor experiencia en móvil (sin tutorial intrusivo)"

git push origin master
```

---

## 📊 Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Volver desde Setup Online | ❌ Solo recargando | ✅ Botón "Volver" |
| Volver desde Lobby (Anfitrión) | ❌ Solo recargando | ✅ Botón "Volver al Menú" |
| Volver desde Lobby (Invitado) | ❌ Atrapado | ✅ Botón "Volver al Menú" |
| Desconexión al volver | ❌ Manual | ✅ Automática y limpia |
| Tutorial en móvil | ❌ Automático e intrusivo | ✅ No aparece automáticamente |
| Tutorial en desktop | ✅ Automático (bueno) | ✅ Automático (mantiene) |
| Consistencia botones | ⚠️ Irregular | ✅ Consistente |

---

## 🎯 Resultado Final

### Navegación Online:
✅ **Completa** - Siempre puedes volver al menú
✅ **Segura** - Desconexión limpia automática
✅ **Intuitiva** - Botones claros y visibles
✅ **Consistente** - Mismo patrón en toda la app

### Tutorial:
✅ **Adaptativo** - Desktop vs móvil
✅ **No intrusivo** - Solo desktop automático
✅ **Accesible** - Siempre disponible en menú
✅ **Sensato** - Respeta las limitaciones táctiles

### Experiencia Usuario:
✅ **Control Total** - Nunca atrapado
✅ **Feedback Claro** - Sonidos y transiciones
✅ **Mobile-Friendly** - Sin tutorial que estorbe
✅ **Desktop-Optimized** - Tutorial útil cuando tiene sentido

---

**Fecha**: 22 de Enero 2026
**Versión**: Enhanced 3.2
**Estado**: ✅ LISTO PARA PRODUCCIÓN
**Impacto**: 🎯 UX Completa y Pulida
