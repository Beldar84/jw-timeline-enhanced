#!/bin/bash

# Script para buscar y copiar el logo y reverso
# Ejecutar desde: ~/Documents/jw-timeline-enhanced

echo "🔍 Buscando JW-Timeline.png y JW-Timeline-logo.png..."
echo ""

# Buscar JW-Timeline.png (reverso)
REVERSO=$(find . -name "JW-Timeline.png" -type f 2>/dev/null | head -1)
if [ -n "$REVERSO" ]; then
    echo "✓ Encontrado reverso en: $REVERSO"
    cp "$REVERSO" "public/images/card-back.png"
    echo "  → Copiado a: public/images/card-back.png"
else
    echo "✗ No se encontró JW-Timeline.png"
    echo "  Por favor, cópialo manualmente a: public/images/card-back.png"
fi

echo ""

# Buscar JW-Timeline-logo.png (logo)
LOGO=$(find . -name "JW-Timeline-logo.png" -type f 2>/dev/null | head -1)
if [ -n "$LOGO" ]; then
    echo "✓ Encontrado logo en: $LOGO"
    cp "$LOGO" "public/images/logo.png"
    echo "  → Copiado a: public/images/logo.png"
else
    echo "✗ No se encontró JW-Timeline-logo.png"
    echo "  Por favor, cópialo manualmente a: public/images/logo.png"
fi

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📂 Verifica los archivos:"
ls -lh public/images/ | grep -E "card-back|logo"
