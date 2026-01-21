# 🖥️ Mejora: Timeline Más Grande en Desktop

## 🎯 Objetivo

Hacer que la zona central del juego (Timeline con las cartas en juego) se vea más grande en PC/Desktop para mejor visualización, sin afectar la versión móvil que ya se ve perfecta.

## ✅ Cambios Aplicados

### 1. Cartas del Timeline Más Grandes

**Antes (Desktop)**:
- Ancho: 260px
- Alto: 380px

**Después (Desktop)**:
- Ancho: 307px (+18%)
- Alto: 450px (+18%)

**Móvil**: Sin cambios (150px × 219px)

**Archivo modificado**: `components/Card.tsx` (líneas 54-59)

---

### 2. Slots de Colocación Más Grandes

Los espacios donde colocas las cartas (con el ícono +) también son más grandes:

**Antes (Desktop)**:
- Ancho: 24px (w-24)
- Alto: 380px

**Después (Desktop)**:
- Ancho: 32px (w-32, +33%)
- Alto: 450px (+18%)

**Móvil**: Sin cambios (w-16)

**Archivo modificado**: `components/Timeline.tsx` (líneas 23-27)

---

### 3. Contenedor del Timeline con Más Espacio

**Padding aumentado en desktop**:
- De `p-4` (16px) → `p-6` (24px)

**Altura mínima garantizada**:
- Móvil: `min-h-[200px]`
- Desktop: `min-h-[350px]`

**Archivo modificado**: `components/GameBoard.tsx` (línea 155)

---

## 📊 Comparación Visual

### Móvil (sin cambios)
```
Carta: 150px × 219px
Slot:  64px (w-16)
```

### Desktop (mejorado)
```
Antes:
Carta: 260px × 380px
Slot:  96px (w-24)

Después:
Carta: 307px × 450px  ⬆️ +18%
Slot:  128px (w-32)   ⬆️ +33%
```

---

## 🎨 Resultado Esperado

### En Desktop/PC:
✅ Cartas del timeline ~18% más grandes
✅ Mejor legibilidad de las imágenes
✅ Más espacio visual para la zona de juego principal
✅ Slots de colocación más visibles

### En Móvil:
✅ Sin cambios - mantiene tamaño optimizado
✅ Sigue viéndose perfecto como antes

---

## 📝 Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `components/Card.tsx` | 54-59 | Tamaño desktop: 307×450px |
| `components/Timeline.tsx` | 23-27 | Slots: w-32, h-450px |
| `components/GameBoard.tsx` | 155 | Padding y min-height |

---

## 🚀 Para Subir

Estos cambios deben subirse junto con las correcciones anteriores:

```bash
git add components/Card.tsx components/Timeline.tsx components/GameBoard.tsx MEJORA_TIMELINE_DESKTOP.md

git commit -m "Mejora: Timeline más grande en desktop

- Cartas 18% más grandes en PC (307×450px)
- Slots de colocación más anchos (w-32)
- Más padding y espacio para el timeline
- Sin cambios en móvil"

git push origin master
```

---

## ✅ Checklist de Verificación

### En Desktop/PC
1. [ ] Las cartas del timeline se ven más grandes
2. [ ] Los slots de colocación (+) son más anchos
3. [ ] El timeline tiene más espacio vertical
4. [ ] La zona central es más prominente

### En Móvil
1. [ ] Todo sigue igual que antes
2. [ ] Las cartas mantienen 150px × 219px
3. [ ] El scroll funciona correctamente
4. [ ] No hay cambios visuales

---

## 💡 Notas Técnicas

### Proporción de Aspecto
Las cartas mantienen la proporción 2:3 aproximadamente:
- Móvil: 150:219 = 1:1.46
- Desktop: 307:450 = 1:1.47

### Breakpoint MD
Tailwind CSS usa `md:` para pantallas ≥768px de ancho, por lo que:
- Tablets en portrait: tamaño móvil
- Tablets en landscape: tamaño desktop
- Laptops/Desktop: tamaño desktop aumentado

---

**Fecha**: 21 de Enero 2026
**Versión**: Enhanced 2.6
**Estado**: ✅ Listo para deploy
