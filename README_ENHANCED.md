# JW Timeline - Versión Mejorada 🎮📖

<div align="center">
<img width="600" alt="JW Timeline Logo" src="https://i.postimg.cc/xjZN5gRX/JW-Timeline-logo.png" />

Un juego educativo interactivo para aprender cronología bíblica

[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Private-red)]()

</div>

## 🌟 Características Principales

### 🎯 Modos de Juego
- **🏠 Local Multijugador:** Juega con amigos en el mismo dispositivo
- **🤖 Contra IA:** Practica contra oponentes controlados por computadora
- **🌐 Online:** Compite con jugadores de todo el mundo en tiempo real

### 📚 Mazos Temáticos (NUEVO)
Elige entre 9 mazos diferentes con distintos niveles de dificultad:

| Mazo | Cartas | Dificultad | Tema |
|------|--------|------------|------|
| 📖 Biblia Completa | 112 | ⭐⭐⭐ | Todos los eventos |
| ⛰️ Antiguo Testamento | ~80 | ⭐⭐ | Antes de Cristo |
| ✝️ Nuevo Testamento | ~32 | ⭐ | Vida de Jesús y apóstoles |
| 👴 Los Patriarcas | ~30 | ⭐⭐ | Adán hasta Moisés |
| 👑 Reyes y Profetas | ~30 | ⭐⭐ | Reino de Israel |
| 🕊️ Vida de Jesús | ~20 | ⭐ | Ministerio de Jesús |
| ⛪ Iglesia Primitiva | ~12 | ⭐ | Primeros cristianos |
| 🌍 Creación y Diluvio | ~16 | ⭐⭐⭐ | Primeros días |
| 🏛️ Exilio y Regreso | ~15 | ⭐⭐ | Babilonia |

### 📊 Sistema de Estadísticas (NUEVO)
Rastrea tu progreso con estadísticas detalladas:
- **Partidas:** jugadas, ganadas, perdidas
- **Precisión:** porcentaje de aciertos global
- **Rachas:** racha actual y máxima
- **Tiempos:** victoria más rápida, tiempo promedio
- **Por mazo:** estadísticas específicas de cada mazo

### 🏆 Sistema de Logros (NUEVO)
Desbloquea 11 logros especiales:
- 🏆 Primera Victoria
- ⭐ Juego Perfecto
- ⚡ Rayo Veloz
- 🔥 Rachas de 3, 5 y 10 victorias
- 🎖️ Veterano
- 🏅 Maestro
- 🎯 Precisión 80% y 90%
- 🗺️ Explorador

### 🎓 Tutorial Interactivo (NUEVO)
- Tutorial de 9 pasos para nuevos jugadores
- Explicación clara de las reglas
- Consejos útiles en cada paso
- Puede saltarse o verse en cualquier momento

### 💫 Animaciones Elaboradas (MEJORADO)
- Movimientos en arco para cartas
- Efectos de partículas al acertar
- Rotación y escala dinámicas
- Transiciones suaves y fluidas
- Diferentes animaciones según el contexto

## 🎮 Cómo Jugar

### Objetivo
Ser el primer jugador en colocar correctamente todas tus cartas en la línea de tiempo cronológica.

### Reglas Básicas
1. Cada jugador recibe 4 cartas al inicio
2. En tu turno, coloca una carta en la línea de tiempo
3. Si aciertas, la carta se queda y pasas turno
4. Si fallas, la carta va al descarte y robas una nueva
5. El primer jugador sin cartas gana

### Mecánica de Colocación
- Observa las fechas de los eventos adyacentes
- Coloca tu carta entre dos eventos o al inicio/final
- Piensa bien: ¡solo tienes una oportunidad!

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 18 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clona o descarga el proyecto**
```bash
git clone https://github.com/tuusuario/JWTimeline.git
cd JWTimeline
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura la API de Gemini**
Edita el archivo `.env.local` y añade tu clave API:
```
GEMINI_API_KEY=tu_clave_api_aqui
```

4. **Ejecuta en desarrollo**
```bash
npm run dev
```

5. **Compila para producción**
```bash
npm run build
npm run preview
```

## 📁 Estructura del Proyecto

```
jw-timeline/
├── components/           # Componentes React
│   ├── AnimationLayerEnhanced.tsx
│   ├── AchievementNotification.tsx
│   ├── DeckSelector.tsx
│   ├── StatsPanel.tsx
│   ├── Tutorial.tsx
│   ├── MainMenuEnhanced.tsx
│   ├── GameBoard.tsx
│   ├── Card.tsx
│   └── ...
├── services/            # Lógica de negocio
│   ├── statsService.ts      # Sistema de estadísticas
│   ├── deckService.ts       # Gestión de mazos
│   ├── gameService.ts       # Lógica del juego online
│   └── soundService.ts      # Gestión de sonidos
├── data/                # Datos estáticos
│   └── cards.ts         # 112 eventos bíblicos
├── types.ts             # Tipos TypeScript
├── App.tsx              # Componente principal
└── index.tsx            # Punto de entrada
```

## 🎨 Tecnologías Utilizadas

- **Frontend:** React 19.2 + TypeScript
- **Build Tool:** Vite 6.2
- **Estilos:** Tailwind CSS (utility classes)
- **Conexión P2P:** PeerJS (multijugador online)
- **Persistencia:** LocalStorage (estadísticas)
- **IA:** Gemini API (opcional)

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para producción
npm run preview  # Vista previa de producción
```

### Añadir Nuevos Mazos

Edita `services/deckService.ts` y añade un nuevo mazo:

```typescript
this.decks.push({
  id: 'mi_mazo',
  name: 'Mi Mazo Personalizado',
  description: 'Descripción del mazo',
  icon: '🎯',
  cards: tusCartas,
  difficulty: 'medium',
  color: 'blue',
});
```

### Añadir Nuevos Logros

Edita `services/statsService.ts` en el array de `DEFAULT_STATS.achievements`:

```typescript
{
  id: 'mi_logro',
  name: 'Mi Logro',
  description: 'Descripción del logro',
  unlockedAt: null,
  icon: '🎖️'
}
```

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)

## 🌐 Multijugador Online

### Características
- Conexión P2P sin servidor central
- Códigos de sala cortos (JW-XXXX)
- Sincronización en tiempo real
- Bots añadibles en sala
- Hasta 6 jugadores

### Uso
1. Crea una sala y comparte el código
2. Los jugadores se unen con el código
3. El host inicia la partida
4. ¡A jugar!

## 💾 Datos y Privacidad

- Todas las estadísticas se guardan localmente
- No se recopila información personal
- Las partidas online son temporales
- Puedes resetear tus datos en cualquier momento

## 🐛 Problemas Conocidos

- Las partidas online requieren buena conexión
- LocalStorage limitado a ~5MB (suficiente para stats)
- Safari puede tener problemas con PeerJS

## 🤝 Contribuir

Este es un proyecto educativo. Si quieres contribuir:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📜 Licencia

Proyecto privado para uso educativo.

## 🙏 Créditos

- **Diseño y Desarrollo:** Tu equipo
- **Eventos Bíblicos:** Basado en cronología JW
- **Imágenes:** Proporcionadas por el proyecto
- **Inspiración:** Timeline (juego de cartas original)

## 📞 Soporte

Para problemas o preguntas:
- Abre un Issue en GitHub
- Revisa la documentación en `MEJORAS_Y_INSTALACION.md`
- Consulta la consola del navegador para errores

## 🎉 ¡Gracias por Jugar!

Esperamos que disfrutes aprendiendo cronología bíblica con JW Timeline.

---

**Versión Mejorada** - Enero 2026
Con ❤️ para la comunidad educativa
