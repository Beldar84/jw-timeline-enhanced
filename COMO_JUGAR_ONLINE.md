# 🌐 Guía para Jugar Online - JW Timeline

## ✅ Mejoras Implementadas

### 1. 🔍 Zoom de Cartas Mejorado
**PROBLEMA RESUELTO:** Las cartas ya no se ven borrosas al hacer zoom.

**Cambios aplicados:**
- Optimización de renderizado de imágenes
- Uso de `object-contain` en lugar de `object-cover`
- Aceleración por GPU con `translateZ(0)`
- Anti-aliasing mejorado

**Pruébalo:**
1. Durante una partida, haz clic en cualquier carta
2. La carta se ampliará en alta calidad
3. Haz clic fuera de la carta para cerrar el zoom

---

## 🎮 Cómo Jugar Online

### ¿Qué es el Modo Online?

El modo online te permite jugar con amigos o familiares en tiempo real usando conexión P2P (peer-to-peer) sin necesidad de un servidor central.

**Características:**
- ✅ Conexión directa entre jugadores (P2P)
- ✅ Sin necesidad de registro o cuenta
- ✅ Códigos de sala cortos y fáciles (formato: JW-XXXX)
- ✅ Hasta 6 jugadores por partida
- ✅ Puedes añadir bots IA a la sala
- ✅ Sincronización en tiempo real

---

## 🚀 Instrucciones Paso a Paso

### **OPCIÓN A: Crear una Sala (Host)**

1. **Inicia el juego**
   - Abre el navegador y ve a `http://localhost:5173`
   - Desde el menú principal, haz clic en "🌐 Jugar online"

2. **Configura tu sala**
   - Ingresa tu nombre
   - Haz clic en "Crear Sala"
   - El juego generará un código único (ej: **JW-A3K9**)

3. **Comparte el código**
   - Copia el código de sala
   - Envíalo a tus amigos por WhatsApp, email, etc.
   - Los jugadores deben tener el juego abierto en su navegador

4. **Espera a los jugadores**
   - Verás la lista de jugadores que se unen
   - Opcionalmente puedes añadir bots IA
   - Cuando estés listo, haz clic en "Iniciar Partida"

---

### **OPCIÓN B: Unirse a una Sala (Cliente)**

1. **Inicia el juego**
   - Abre el navegador y ve a `http://localhost:5173`
   - Haz clic en "🌐 Jugar online"

2. **Únete a la sala**
   - Ingresa tu nombre
   - Ingresa el código de sala que te compartieron (ej: JW-A3K9)
   - Haz clic en "Unirse"

3. **Espera el inicio**
   - Verás la lista de jugadores en la sala
   - El host decidirá cuándo iniciar la partida

---

## 🎯 Durante la Partida Online

### Como Jugador Activo
- **Tu turno:** Verás un indicador visual
- **Coloca tu carta:** Haz clic en tu carta y luego en el espacio de la línea de tiempo
- **Espera:** El resultado se sincronizará automáticamente

### Como Espectador (No es tu turno)
- Observa las jugadas de los demás
- Mira la línea de tiempo crecer
- Planea tu próxima jugada

### Información Visible
- ✅ Nombre de cada jugador
- ✅ Cuántas cartas tiene cada uno
- ✅ De quién es el turno actual
- ✅ Mensajes del juego

---

## ⚙️ Configuración Técnica

### Requisitos

**Para el Host:**
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet estable
- El juego corriendo en `http://localhost:5173`

**Para los Clientes:**
- Lo mismo que el host
- El código de sala proporcionado por el host

### Puertos y Conexión

El juego usa **PeerJS** para las conexiones P2P:
- **Servidor de señalización:** PeerJS Cloud (gratuito)
- **Puerto local:** 5173 (Vite dev server)
- **No requiere:** abrir puertos en el router

### STUN Servers Configurados

El juego usa múltiples servidores STUN para garantizar conexión:
```
stun.l.google.com:19302
stun1.l.google.com:19302
stun2.l.google.com:19302
stun3.l.google.com:19302
stun4.l.google.com:19302
global.stun.twilio.com:3478
```

---

## 🐛 Solución de Problemas

### ❌ "No se pudo conectar con la sala"

**Causas posibles:**
1. Código de sala incorrecto
2. La sala ya no existe
3. Problemas de conexión

**Soluciones:**
- Verifica el código (distingue mayúsculas)
- Pide al host que cree una nueva sala
- Verifica tu conexión a internet
- Recarga la página (F5)

---

### ❌ "Tiempo de espera agotado"

**Causas:**
- Conexión lenta
- Firewall bloqueando WebRTC
- VPN interfiriendo

**Soluciones:**
- Desactiva VPN temporalmente
- Prueba con otro navegador
- Verifica configuración de firewall
- Intenta desde otra red (ej: datos móviles)

---

### ❌ "La partida se desconectó"

**Causas:**
- El host cerró el navegador
- Pérdida de conexión a internet
- El navegador se suspendió

**Soluciones:**
- El host debe mantener la pestaña abierta
- Todos deben tener conexión estable
- No minimices el navegador por mucho tiempo
- Recrea la sala si es necesario

---

### ❌ Los jugadores no se sincronizan

**Causas:**
- Lag de red
- Error en el código

**Soluciones:**
- Espera unos segundos
- Recarga la página
- Verifica consola del navegador (F12)

---

## 💡 Consejos para Mejor Experiencia

### Para el Host:
1. ✅ **Mantén la pestaña abierta** durante toda la partida
2. ✅ **No recargar la página** una vez iniciada la partida
3. ✅ **Buena conexión:** Usa conexión por cable si es posible
4. ✅ **Comparte el código claramente:** Mejor por mensaje de texto

### Para Todos los Jugadores:
1. ✅ **Conexión estable:** Wi-Fi fuerte o cable ethernet
2. ✅ **Navegador actualizado:** Última versión de Chrome/Firefox
3. ✅ **Cierra otras pestañas:** Para mejor rendimiento
4. ✅ **Buen navegador para WebRTC:** Chrome es el más confiable

### Comunicación:
1. 💬 **Usa otro canal:** WhatsApp, Discord, Zoom para hablar
2. 🎤 **Videollamada paralela:** Hace la experiencia más social
3. ⏱️ **Coordina tiempos:** Asegúrate de que todos estén listos

---

## 🔐 Privacidad y Seguridad

### ¿Es seguro?
✅ **SÍ** - La conexión es P2P (peer-to-peer)
- Los datos van directamente entre jugadores
- No pasan por un servidor central de almacenamiento
- Las salas son temporales y desaparecen al terminar

### ¿Qué datos se comparten?
- Nombre del jugador (el que ingresas)
- Estado del juego (cartas, turnos)
- ID de conexión temporal

### ¿Qué NO se comparte?
- ❌ Tu dirección IP no es visible para otros jugadores
- ❌ No se guarda historial de partidas online
- ❌ No se recopilan datos personales

---

## 📊 Limitaciones Actuales

1. **No hay persistencia:** Si alguien se desconecta, la partida se pierde
2. **Depende del host:** Si el host se va, la partida termina
3. **Sin chat integrado:** Usa WhatsApp/Discord paralelamente
4. **Sin replay:** No se graban las partidas
5. **Solo 6 jugadores máximo:** Limitación de diseño

---

## 🔮 Futuras Mejoras Sugeridas

- [ ] Reconexión automática si se cae la conexión
- [ ] Chat integrado en el juego
- [ ] Sistema de ranking online
- [ ] Historial de partidas online
- [ ] Espectadores que solo miran
- [ ] Torneos programados

---

## 📱 Jugar Online desde Dispositivos Móviles

**¿Funciona en móviles?**
✅ **SÍ**, pero con limitaciones:

**En el mismo Wi-Fi:**
1. El host inicia en su computadora
2. Los jugadores móviles se conectan a `http://IP-DEL-HOST:5173`
3. Ejemplo: `http://192.168.1.100:5173`

**Desde internet:**
- Requiere exponer el servidor Vite a internet (avanzado)
- Mejor opción: Todos en computadoras por ahora

---

## 🎓 Tutorial Rápido

### Primera Vez Jugando Online:

1. **Practica local primero**
   - Juega 1-2 partidas en modo local o vs IA
   - Familiarízate con las mecánicas

2. **Prueba con un amigo**
   - Coordina por teléfono/videollamada
   - Uno crea sala, otro se une
   - Prueben la conexión

3. **Organiza una partida**
   - Invita a 3-4 amigos
   - Comparte código por grupo de WhatsApp
   - ¡Diviértanse!

---

## 📞 ¿Necesitas Ayuda?

### Debugging:
1. Abre consola del navegador: **F12** o **Cmd+Option+I** (Mac)
2. Ve a la pestaña "Console"
3. Busca mensajes de error en rojo
4. Copia el error y búscalo o compártelo

### Comandos Útiles en Consola:
```javascript
// Ver estado de conexión PeerJS
console.log(peer)

// Ver estado del juego
console.log(gameService)

// Limpiar LocalStorage si hay problemas
localStorage.clear()
```

---

## ✅ Checklist Pre-Partida Online

**Antes de crear/unirse:**
- [ ] Navegador actualizado
- [ ] Conexión a internet estable
- [ ] `npm run dev` corriendo
- [ ] Código de sala listo (si te unes)
- [ ] Otros jugadores preparados
- [ ] Canal de comunicación abierto (WhatsApp/Discord)

**Durante la partida:**
- [ ] No cerrar pestaña
- [ ] No recargar página
- [ ] Mantener conexión estable
- [ ] Estar atento a tu turno

---

## 🎉 ¡Listo para Jugar!

El modo online de **JW Timeline** está completamente funcional y listo para usar.

**Disfruta jugando con amigos y familia mientras aprenden cronología bíblica juntos!** 📖✨

---

**Última actualización:** Enero 2026
**Versión:** Enhanced 2.0 con Zoom Mejorado
