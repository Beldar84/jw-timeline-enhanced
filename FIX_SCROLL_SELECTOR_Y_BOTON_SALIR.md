# 🔧 Fix: Scroll en Selector de Mazos + Botón Salir

## 📱 Problemas Identificados

### 1. Scroll Insuficiente en Selector de Mazos (Móvil)
En móvil, al elegir un mazo para jugar, no se puede hacer scroll suficiente para ver los botones de "Aceptar" o "Volver" que están en la parte inferior.

### 2. Falta de Opción para Salir del Juego
No había forma de salir de una partida en curso, especialmente problemático en partidas online donde los demás jugadores deberían ser notificados.

---

## ✅ Soluciones Aplicadas

### 1. Scroll Mejorado en DeckSelector

**Archivo**: `components/DeckSelector.tsx` (línea 41)

**Cambio**:
```typescript
// Antes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-[60vh] overflow-y-auto p-2">

// Después
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-[60vh] overflow-y-auto p-2 pb-8">
```

**Resultado**:
- Se agregó `pb-8` (32px de padding inferior)
- Ahora el grid tiene suficiente espacio para hacer scroll
- Los botones "Volver" y "Continuar" son completamente visibles
- El usuario puede hacer scroll hasta ver todo el contenido

---

### 2. Botón de Salir Implementado

#### GameBoard.tsx

**Cambios aplicados**:

1. **Nueva prop** (líneas 11-27):
```typescript
interface GameBoardProps {
  // ... props existentes
  onExitGame?: () => void;
}
```

2. **Handler de salida** (líneas 94-107):
```typescript
const handleExitClick = () => {
  soundService.playClick();
  if (onExitGame) {
    const confirmExit = window.confirm(
      gameMode === 'online'
        ? "¿Estás seguro de que quieres salir? Los demás jugadores serán notificados."
        : "¿Estás seguro de que quieres salir de la partida?"
    );
    if (confirmExit) {
      onExitGame();
    }
  }
};
```

3. **Botón en la UI** (líneas 119-128):
```typescript
<div className="space-y-1 md:space-y-2 flex flex-col h-full w-full overflow-y-auto overflow-x-hidden pb-8 md:pb-4 relative">
  {/* Exit Button */}
  {onExitGame && (
    <button
      onClick={handleExitClick}
      className="absolute top-2 right-2 md:top-4 md:right-4 z-20 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg"
    >
      ✕ Salir
    </button>
  )}
```

**Características del botón**:
- ✅ Posicionado en esquina superior derecha
- ✅ Color rojo para indicar acción destructiva
- ✅ Confirmación antes de salir
- ✅ Mensaje diferente para online vs local/IA
- ✅ Responsive (tamaño ajustado móvil/desktop)
- ✅ z-index alto para estar siempre visible
- ✅ Efecto hover para mejor feedback

#### App.tsx

**Función de manejo** (líneas 412-419):
```typescript
const handleExitGame = () => {
  // Si es online, desconectar y notificar a otros jugadores
  if (gameMode === 'online' && onlineGameState) {
    gameService.disconnect();
  }
  // Volver al menú
  handleRestart();
};
```

**Integración** (líneas 488-524):
```typescript
// Partida online
<GameBoard
  // ... props existentes
  onExitGame={handleExitGame}
/>

// Partida local/IA
<GameBoard
  // ... props existentes
  onExitGame={handleExitGame}
/>
```

**Funcionalidad**:
1. Muestra diálogo de confirmación
2. En partidas **online**: llama a `gameService.disconnect()` que notifica a otros jugadores
3. En partidas **local/IA**: simplemente vuelve al menú
4. Limpia todo el estado del juego
5. Desconecta de PeerJS si aplica
6. Regresa al menú principal

---

## 🎯 Resultado Esperado

### Selector de Mazos (Móvil):
1. ✅ Puedes hacer scroll completamente hacia abajo
2. ✅ Los botones "Volver" y "Continuar" son completamente visibles
3. ✅ Se agregó 32px de espacio adicional

### Botón Salir:
1. ✅ Visible en todas las partidas (esquina superior derecha)
2. ✅ Pide confirmación antes de salir
3. ✅ En partidas online: desconecta y notifica a otros jugadores
4. ✅ En partidas local/IA: sale limpiamente al menú
5. ✅ Responsive para móvil y desktop

---

## 📝 Archivos Modificados

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `components/DeckSelector.tsx` | 41 | Agregado `pb-8` para scroll completo |
| `components/GameBoard.tsx` | 11-27 | Nueva prop `onExitGame` |
| `components/GameBoard.tsx` | 94-107 | Handler `handleExitClick` con confirmación |
| `components/GameBoard.tsx` | 119-128 | Botón de salir en la UI |
| `App.tsx` | 412-419 | Función `handleExitGame` |
| `App.tsx` | 488-524 | Integración de prop en ambos modos |

---

## 🧪 Para Verificar

### Selector de Mazos:
1. [ ] Abre el juego en móvil
2. [ ] Ve a "Jugar en local" o "Jugar contra IA"
3. [ ] En el selector de mazos, intenta hacer scroll hacia abajo
4. [ ] Verifica que puedes ver completamente los botones "Volver" y "Continuar"

### Botón Salir:
1. [ ] Inicia una partida (local, IA u online)
2. [ ] Verifica que aparece el botón "✕ Salir" en la esquina superior derecha
3. [ ] Haz clic en "Salir"
4. [ ] Verifica que aparece el diálogo de confirmación
5. [ ] Confirma la salida
6. [ ] Verifica que vuelves al menú principal

### Partida Online:
1. [ ] Crea una partida online con otro jugador
2. [ ] Haz clic en "Salir"
3. [ ] Confirma la salida
4. [ ] El otro jugador debería recibir notificación de desconexión
5. [ ] Deberías volver al menú principal

---

## 🚀 Para Subir

```bash
git add components/DeckSelector.tsx components/GameBoard.tsx App.tsx FIX_SCROLL_SELECTOR_Y_BOTON_SALIR.md

git commit -m "Fix: scroll en selector de mazos + botón salir

- Agregar pb-8 a grid de mazos para scroll completo
- Implementar botón Salir en esquina superior derecha
- Confirmación antes de salir
- Desconexión automática en partidas online
- Notificación a otros jugadores al salir
- Mensajes diferenciados online vs local/IA"

git push origin master
```

---

## 💡 Detalles Técnicos

### Confirmación de Salida
Utiliza `window.confirm()` nativo del navegador:
- Simple y directo
- No requiere componente adicional
- Funciona en todos los navegadores
- Bloquea interacción hasta respuesta

### Notificación Online
El `gameService.disconnect()`:
- Cierra la conexión PeerJS
- Envía señal de desconexión a peers
- Los otros jugadores ven que el jugador salió
- La partida puede continuar o terminar según lógica del servidor

### Limpieza de Estado
El `handleRestart()` limpia:
- `gamePhase` → vuelve a MENU
- `gameMode` → null
- `onlineGameState` → null
- `localPlayerId` → null
- Desconecta PeerJS
- Recarga estadísticas

---

**Fecha**: 21 de Enero 2026
**Versión**: Enhanced 2.8
**Estado**: ✅ Listo para deploy
