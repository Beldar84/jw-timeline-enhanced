#!/bin/bash

# Script para descargar todas las imágenes del juego JW Timeline
# Ejecutar desde la carpeta raíz del proyecto

echo "🎮 JW Timeline - Descargador de Imágenes"
echo "========================================"
echo ""

# Crear carpeta para imágenes
mkdir -p public/images/cards
mkdir -p public/images

echo "📁 Carpetas creadas"
echo ""

# Arrays con todas las URLs
declare -a CARD_URLS=(
    "https://i.postimg.cc/dkGHH03k/JW-Timeline-1.png"
    "https://i.postimg.cc/rRchvLRQ/JW-Timeline-2.png"
    "https://i.postimg.cc/T5GkZX50/JW-Timeline-3.png"
    "https://i.postimg.cc/8fHyGnLn/JW-Timeline-4.png"
    "https://i.postimg.cc/JHqT8djf/JW-Timeline-5.png"
    "https://i.postimg.cc/NLcBg91F/JW-Timeline-6.png"
    "https://i.postimg.cc/Z0S4TBrr/JW-Timeline-7.png"
    "https://i.postimg.cc/HjgdpcQN/JW-Timeline-8.png"
    "https://i.postimg.cc/8smDspH4/JW-Timeline-9.png"
    "https://i.postimg.cc/Yjzkjr3y/JW-Timeline-10.png"
    # ... (continúa con todas las 112 URLs)
)

echo "📥 Descargando imágenes de cartas..."
for i in "${!CARD_URLS[@]}"; do
    card_num=$((i + 1))
    url="${CARD_URLS[$i]}"
    output="public/images/cards/card-$card_num.png"

    if curl -sL "$url" -o "$output"; then
        echo "✓ Carta $card_num descargada"
    else
        echo "✗ Error descargando carta $card_num"
    fi

    # Pequeña pausa para no sobrecargar el servidor
    sleep 0.3
done

# Descargar logo y reverso
echo ""
echo "📥 Descargando imágenes adicionales..."
curl -sL "https://i.postimg.cc/XY2cmTSG/JW-Timeline.png" -o "public/images/card-back.png"
echo "✓ Reverso de carta descargado"

curl -sL "https://i.postimg.cc/xjZN5gRX/JW-Timeline-logo.png" -o "public/images/logo.png"
echo "✓ Logo descargado"

echo ""
echo "✅ ¡Descarga completada!"
echo "📊 Total de archivos: $(ls -1 public/images/cards/ | wc -l) cartas"
echo ""
echo "⚠️  IMPORTANTE: Ahora debes ejecutar update-card-paths.sh para actualizar las rutas"
