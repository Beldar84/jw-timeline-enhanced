# 🚀 Inicio Rápido - JW Timeline Mejorado

## ⚡ 3 Pasos para Empezar

### 1️⃣ Instalar
```bash
cd jw-timeline-enhanced
npm install
```

### 2️⃣ Configurar (opcional)
Si quieres usar la API de Gemini, edita `.env.local`:
```
GEMINI_API_KEY=tu_clave_aqui
```

### 3️⃣ Ejecutar
```bash
npm run dev
```

¡Listo! Abre http://localhost:5173 en tu navegador.

---

## 📝 Archivos Nuevos vs Archivos Modificados

### ✨ ARCHIVOS NUEVOS (añadir a tu proyecto)

#### Servicios (`services/`):
- ✅ `statsService.ts` - Sistema de estadísticas y logros
- ✅ `deckService.ts` - Gestión de mazos temáticos

#### Componentes (`components/`):
- ✅ `DeckSelector.tsx` - Selector visual de mazos
- ✅ `StatsPanel.tsx` - Panel completo de estadísticas
- ✅ `Tutorial.tsx` - Tutorial interactivo paso a paso
- ✅ `AchievementNotification.tsx` - Notificaciones de logros
- ✅ `MainMenuEnhanced.tsx` - Menú principal mejorado
- ✅ `AnimationLayerEnhanced.tsx` - Animaciones elaboradas

### 🔄 ARCHIVO MODIFICADO (reemplazar)

- ✅ `App.tsx` - Versión mejorada con todas las integraciones

### 📚 ARCHIVOS DE DOCUMENTACIÓN

- 📖 `MEJORAS_Y_INSTALACION.md` - Guía detallada de instalación
- 📖 `README_ENHANCED.md` - README completo actualizado
- 📖 `RESUMEN_VISUAL.md` - Comparación visual de mejoras
- 📖 `INICIO_RAPIDO.md` - Este archivo

---

## 🔧 Integración Rápida

### Opción A: Proyecto Nuevo
1. Copia toda la carpeta `jw-timeline-enhanced`
2. `npm install`
3. `npm run dev`

### Opción B: Proyecto Existente
1. Copia los **archivos nuevos** a tu proyecto:
   ```bash
   # Servicios
   cp services/statsService.ts tu-proyecto/services/
   cp services/deckService.ts tu-proyecto/services/

   # Componentes
   cp components/DeckSelector.tsx tu-proyecto/components/
   cp components/StatsPanel.tsx tu-proyecto/components/
   cp components/Tutorial.tsx tu-proyecto/components/
   cp components/AchievementNotification.tsx tu-proyecto/components/
   cp components/MainMenuEnhanced.tsx tu-proyecto/components/
   cp components/AnimationLayerEnhanced.tsx tu-proyecto/components/
   ```

2. **IMPORTANTE:** Haz backup de tu `App.tsx` actual:
   ```bash
   cp tu-proyecto/App.tsx tu-proyecto/App.tsx.backup
   ```

3. Reemplaza `App.tsx`:
   ```bash
   cp App.tsx tu-proyecto/App.tsx
   ```

4. Verifica que todo funcione:
   ```bash
   cd tu-proyecto
   npm run dev
   ```

---

## ✅ Checklist de Verificación

Después de instalar, verifica que:

- [ ] El menú principal muestra botones de "📊 Estadísticas" y "🎓 Tutorial"
- [ ] Al elegir un modo (Local o IA), aparece el selector de mazos
- [ ] El tutorial se muestra automáticamente la primera vez
- [ ] Las animaciones tienen efecto de arco y partículas
- [ ] Las estadísticas se guardan después de cada partida
- [ ] Los logros se desbloquean y aparecen notificaciones

---

## 🎮 Primeros Pasos

### Para Probar las Nuevas Características:

1. **Tutorial:**
   - Haz clic en "🎓 Tutorial" desde el menú principal
   - Navega por los 9 pasos

2. **Mazos:**
   - Selecciona "Jugar contra IA"
   - Elige un mazo (recomendado: "Vida de Jesús" - fácil)
   - Juega una partida

3. **Estadísticas:**
   - Juega 2-3 partidas
   - Haz clic en "📊 Estadísticas"
   - Explora las 3 pestañas

4. **Logros:**
   - Gana tu primera partida → 🏆 Primera Victoria
   - Intenta ganar sin errores → ⭐ Juego Perfecto
   - Ve tus logros en Estadísticas > Logros

---

## 🆘 Solución de Problemas Rápidos

### ❌ Error: "Module not found"
```bash
# Reinstala dependencias
rm -rf node_modules
npm install
```

### ❌ Las estadísticas no se guardan
- Verifica que LocalStorage esté habilitado en tu navegador
- Abre la consola (F12) y busca errores
- Prueba en modo incógnito

### ❌ El tutorial no aparece
- Borra el flag: en consola del navegador ejecuta:
```javascript
localStorage.removeItem('jw_timeline_tutorial_completed')
```
- Recarga la página

### ❌ Animaciones lentas
- Las animaciones son para 60fps
- Cierra otras pestañas del navegador
- Reduce la calidad gráfica si es necesario

### ❌ Error de importación
Verifica que todos los imports en `App.tsx` sean correctos:
```typescript
import MainMenuEnhanced from './components/MainMenuEnhanced';
import AnimationLayerEnhanced from './components/AnimationLayerEnhanced';
import { statsService } from './services/statsService';
import { deckService } from './services/deckService';
// ... etc
```

---

## 📊 Estructura de Archivos

```
jw-timeline-enhanced/
├── 📄 App.tsx                          ← REEMPLAZAR
├── 📁 components/
│   ├── ✨ DeckSelector.tsx            ← NUEVO
│   ├── ✨ StatsPanel.tsx              ← NUEVO
│   ├── ✨ Tutorial.tsx                ← NUEVO
│   ├── ✨ AchievementNotification.tsx ← NUEVO
│   ├── ✨ MainMenuEnhanced.tsx        ← NUEVO
│   ├── ✨ AnimationLayerEnhanced.tsx  ← NUEVO
│   └── ... (archivos existentes)
├── 📁 services/
│   ├── ✨ statsService.ts             ← NUEVO
│   ├── ✨ deckService.ts              ← NUEVO
│   └── ... (archivos existentes)
└── 📁 data/
    └── cards.ts (sin cambios)
```

---

## 🎯 Características Principales

### 1. Sistema de Estadísticas
- **Ubicación:** Menú Principal → 📊 Estadísticas
- **Datos rastreados:** Victorias, derrotas, precisión, rachas, tiempos
- **Persistencia:** LocalStorage (automático)

### 2. Mazos Temáticos (9 mazos)
- **Ubicación:** Después de elegir modo Local/IA
- **Mazos:** Completa, Antiguo/Nuevo Testamento, Patriarcas, Reyes, Jesús, Iglesia, Creación, Exilio
- **Dificultades:** Fácil (⭐), Medio (⭐⭐), Difícil (⭐⭐⭐)

### 3. Tutorial Interactivo
- **Ubicación:** Menú Principal → 🎓 Tutorial (o automático primera vez)
- **Pasos:** 9 pasos con consejos
- **Navegación:** Siguiente/Anterior, puede saltarse

### 4. Sistema de Logros (11 logros)
- **Ubicación:** Estadísticas → Pestaña Logros
- **Notificaciones:** Aparecen automáticamente al desbloquear
- **Ejemplos:** Primera Victoria, Juego Perfecto, Rachas, Precisión

### 5. Animaciones Mejoradas
- **Movimiento en arco:** Cartas viajan con trayectoria curva
- **Partículas:** Brillos al colocar correctamente
- **Rotación/Escala:** Efectos dinámicos
- **Automático:** Sin configuración necesaria

---

## 💡 Consejos de Uso

### Para Desarrolladores
1. Revisa `statsService.ts` para entender el sistema de logros
2. Edita `deckService.ts` para añadir más mazos
3. Los estilos usan Tailwind CSS (utility classes)
4. Las animaciones usan CSS transitions + requestAnimationFrame

### Para Jugadores
1. Empieza con mazos fáciles (⭐) como "Vida de Jesús"
2. Revisa tus estadísticas regularmente
3. Intenta desbloquear todos los logros
4. Usa el tutorial si es tu primera vez

---

## 🎉 ¡Listo para Jugar!

Tu JW Timeline mejorado está listo. Disfruta:
- ✅ 9 mazos temáticos
- ✅ Sistema de estadísticas completo
- ✅ 11 logros desbloqueables
- ✅ Tutorial interactivo
- ✅ Animaciones elaboradas

### Enlaces Útiles
- 📖 Guía completa: `MEJORAS_Y_INSTALACION.md`
- 📖 README: `README_ENHANCED.md`
- 📖 Comparación visual: `RESUMEN_VISUAL.md`

---

## 📞 ¿Necesitas Ayuda?

1. Revisa `MEJORAS_Y_INSTALACION.md` para detalles completos
2. Verifica la consola del navegador (F12) para errores
3. Asegúrate de que todos los archivos nuevos estén copiados
4. Confirma que `App.tsx` fue reemplazado correctamente

**¡Diviértete aprendiendo cronología bíblica!** 🎮📖✨
