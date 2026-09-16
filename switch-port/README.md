# JW Timeline para Nintendo Switch

Port homebrew nativo de JW Timeline para Nintendo Switch 1. El resultado de la
compilación es `JW-Timeline.nro`, pensado para ejecutarse desde Homebrew Menu.

## Funciones incluidas

- El mazo completo de 112 cartas, igual que la versión web actual.
- Partidas locales para entre dos y seis jugadores.
- Partidas contra IA con cuatro dificultades.
- Modo estudio con fechas visibles y sin carta de penalización.
- Joy-Con, mando Pro y pantalla táctil.
- Interfaz 16:9 inspirada en la versión web: mesa oscura, paneles de pergamino,
  eje dorado, cartas con fecha independiente y mano en abanico.
- Teclado de Switch para cambiar los nombres.
- Sonidos generados localmente.
- Guardado automático después de cada jugada.
- Reanudación de partidas y estadísticas persistentes en la SD.

Los modos de juego comienzan directamente con el mazo completo. La pantalla de
selección de mazos permanece desactivada, igual que en la versión web.

El port es offline. Firebase, cuentas, amistades, marcadores en línea y partidas
por Internet no forman parte de esta primera versión nativa.

`design-preview.html` permite revisar en el navegador la composición del menú y
del tablero a 1280×720. Es una referencia visual del render nativo; la validación
definitiva debe hacerse en una Switch real.

## Compilar

### Con Docker

Docker debe estar iniciado:

```bash
./tools/build-with-docker.sh
```

El script utiliza la imagen oficial `devkitpro/devkita64`.

### Con devkitPro instalado

Se necesitan `switch-dev`, `switch-portlibs`, SDL2, SDL2_image y SDL2_ttf:

```bash
make
```

Para comprobar la lógica del juego sin el compilador de Switch:

```bash
make host-test
```

## Copiar a la SD

Después de compilar, copia estos archivos:

```text
/switch/JW-Timeline/JW-Timeline.nro
/switch/JW-Timeline/icon.jpg       (opcional)
```

Los recursos de cartas, fuente y metadatos ya están incluidos dentro del `.nro`.
Las partidas se guardan en:

```text
/switch/JW-Timeline/game.sav
/switch/JW-Timeline/stats.sav
```

## Controles

- Cruceta o cualquiera de los dos sticks: moverse por menús, cartas y
  posiciones. Los sticks tienen zona muerta y repetición progresiva.
- A: elegir o colocar.
- B: cancelar o volver.
- X: ampliar la carta seleccionada.
- Y: entrar en el modo de inspección del Timeline. Izquierda/derecha recorre
  sus cartas y A o X amplía la seleccionada.
- ZR: entrar en el modo de inspección del descarte. Izquierda/derecha recorre
  todas las cartas descartadas y A o X amplía la seleccionada.
- L/R: avanzar rápidamente por líneas temporales largas.
- +: pausa durante la partida; salir desde el menú principal.
- Pantalla táctil: selección directa de botones, cartas y posiciones. Al tocar
  una carta del Timeline o del descarte se amplía directamente.

## Datos compartidos

`tools/generate_card_data.mjs` genera `source/card_data.cpp` directamente desde
`../data/cards.ts`. Si cambian las cartas de la versión web, ejecuta:

```bash
node tools/generate_card_data.mjs
```
