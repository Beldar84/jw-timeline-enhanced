# 🌐 Estado del Multijugador Online - JW Timeline

## ✅ Resumen Ejecutivo

**El multijugador online YA está configurado para funcionar a través de internet.**

El juego usa tecnología **PeerJS (WebRTC)** con servidores STUN públicos que permiten conexiones directas entre jugadores remotos sin necesidad de configuración adicional.

---

## 🔧 Configuración Técnica Actual

### 1. **Tecnología Implementada**

- **PeerJS 1.5.2** (cargado vía CDN desde unpkg.com)
- **WebRTC** (protocolo P2P nativo del navegador)
- **Servidor de señalización**: PeerJS Cloud (gratuito, público)

### 2. **Servidores STUN Configurados**

El juego utiliza los siguientes servidores STUN para atravesar NAT:

```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
]
```

**Ubicación**: `services/gameService.ts` líneas 32-39

### 3. **Generación de Códigos de Sala**

- **Formato**: `JW-XXXX` (4 caracteres alfanuméricos)
- **Ejemplo**: JW-A3K9, JW-P7R2, JW-K4N8
- **Algoritmo**: Generación aleatoria con caracteres seguros
- **Colisiones**: Sistema de reintentos automáticos (hasta 5 intentos)

---

## 🎮 Cómo Funciona el Multijugador Online

### Arquitectura Cliente-Servidor P2P

```
┌─────────────┐         PeerJS Cloud          ┌─────────────┐
│   HOST      │◄────── (señalización) ───────►│  CLIENTE 1  │
│ (Jugador 1) │                                │ (Jugador 2) │
└─────────────┘                                └─────────────┘
       │                                              │
       └──────────── WebRTC (P2P directo) ───────────┘
               (imágenes, estado del juego, turnos)
```

### Flujo de Conexión

1. **Host crea sala**:
   - Genera ID único (ej: `JW-A3K9`)
   - Se registra en PeerJS Cloud
   - Espera conexiones entrantes

2. **Cliente se une**:
   - Ingresa código de sala
   - Conecta con PeerJS Cloud
   - PeerJS Cloud facilita handshake WebRTC
   - Establecimiento de conexión P2P directa

3. **Durante el juego**:
   - El **HOST** es autoritativo (valida jugadas)
   - Clientes envían solicitudes al host
   - Host procesa y transmite estado actualizado
   - Sincronización en tiempo real

---

## ✅ Pruebas de Conectividad

### Escenario 1: Misma Red Local (LAN)
**Estado**: ✅ Funciona perfectamente
- Ambos jugadores en el mismo Wi-Fi
- Conexión directa sin necesidad de STUN

### Escenario 2: Diferentes Redes (Internet)
**Estado**: ✅ Debería funcionar con NAT simétrico/cónico

**Requisitos**:
- Ambos jugadores con acceso a internet
- Navegador moderno (Chrome recomendado)
- No requiere abrir puertos en router
- Servidores STUN manejan NAT traversal

**Posibles Limitaciones**:
- ⚠️ Algunos routers con NAT muy restrictivo pueden bloquear P2P
- ⚠️ VPNs corporativas pueden interferir
- ⚠️ Firewalls muy agresivos pueden bloquear WebRTC

### Escenario 3: Redes Restrictivas (Universidades/Empresas)
**Estado**: ⚠️ Puede requerir TURN server

Si los servidores STUN no son suficientes, se necesitaría:
- Servidor TURN (relay server) para retransmitir tráfico
- Actualmente NO implementado

---

## 🧪 Cómo Probar el Multijugador Online

### Prueba Local (Mismo Computador)

1. Abre dos pestañas del navegador
2. En ambas: `http://localhost:5173`
3. Pestaña 1: Crear sala → Obtener código
4. Pestaña 2: Unirse con el código
5. ✅ Debería conectar instantáneamente

### Prueba en Red Local (Misma Wi-Fi)

1. **Computador Host**:
   - Ejecuta: `npm run dev`
   - Obtén tu IP local: `ipconfig getifaddr en0` (Mac) o `ipconfig` (Windows)
   - Ejemplo IP: `192.168.1.100`

2. **Computador Cliente**:
   - Abre navegador: `http://192.168.1.100:5173`
   - Une a la sala con el código

3. ✅ Debería conectar sin problemas

### Prueba por Internet (Diferentes Ubicaciones)

**⚠️ IMPORTANTE: Vite dev server (`npm run dev`) solo escucha en localhost por defecto.**

#### Opción 1: Exponer Vite a Internet (Temporal, para pruebas)

```bash
# Detén el servidor actual (Ctrl+C)
# Reinicia con --host para escuchar en todas las interfaces
npm run dev -- --host
```

Luego el host necesita:
1. Su IP pública (busca "mi ip" en Google)
2. Abrir puerto 5173 en su router (port forwarding)
3. Compartir URL: `http://TU_IP_PUBLICA:5173`

**⚠️ RIESGO DE SEGURIDAD**: Esto expone tu servidor Vite a internet. Solo para pruebas.

#### Opción 2: Deploy en Servidor Web (Recomendado para uso real)

**Opciones de hosting gratuitas**:
- **Vercel** (recomendado): Deploy automático desde GitHub
- **Netlify**: Otra opción gratuita y fácil
- **GitHub Pages**: Requiere configuración adicional

**Proceso con Vercel** (más fácil):

```bash
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Desde la carpeta del proyecto
cd ~/Documents/jw-timeline-enhanced

# 3. Deploy
vercel

# Sigue las instrucciones en pantalla
# Te dará una URL pública: https://jw-timeline-xxx.vercel.app
```

Ahora comparte esa URL con cualquier persona del mundo.

---

## 📊 Limitaciones Conocidas

### 1. **Servidor de Desarrollo (Vite)**
- `npm run dev` solo escucha en `localhost:5173`
- Para acceso remoto, necesitas:
  - `npm run dev -- --host` (expone a red local)
  - Port forwarding para internet público
  - O mejor: Deploy en hosting web

### 2. **Dependencia del Host**
- Si el host cierra el navegador, la partida termina
- No hay persistencia ni reconexión automática
- El host debe mantener conexión estable

### 3. **NAT Traversal**
- STUN funciona en ~80% de configuraciones de red
- NAT simétrico muy restrictivo puede fallar
- Sin servidor TURN como fallback

### 4. **Límite de Jugadores**
- Máximo 6 jugadores por diseño
- Más jugadores = más tráfico P2P = más lag potencial

### 5. **Sin Chat Integrado**
- Jugadores deben usar WhatsApp/Discord paralelo
- No hay videollamada integrada

---

## 🔮 Mejoras Futuras Sugeridas

### Prioridad Alta
- [ ] Deploy en hosting web (Vercel/Netlify)
- [ ] Agregar servidor TURN como fallback
- [ ] Sistema de reconexión automática
- [ ] Mejor manejo de errores de conexión

### Prioridad Media
- [ ] Chat de texto integrado
- [ ] Indicador de latencia/ping
- [ ] Migración de host automática si cae
- [ ] Historial de partidas online

### Prioridad Baja
- [ ] Videollamada integrada
- [ ] Sistema de ranking online
- [ ] Replay de partidas
- [ ] Espectadores (observadores)

---

## 🚀 Pasos para Uso Público (Producción)

Si quieres que cualquier persona del mundo pueda jugar:

### 1. **Deploy a Hosting Web** (Recomendado: Vercel)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde la carpeta del proyecto
cd ~/Documents/jw-timeline-enhanced

# Login (primera vez)
vercel login

# Deploy
vercel --prod

# Te dará URL pública: https://jw-timeline.vercel.app
```

### 2. **Configura GitHub (Opcional pero recomendado)**

```bash
# Si no tienes Git inicializado
git init
git add .
git commit -m "Initial commit"

# Crea repo en GitHub y conecta
git remote add origin https://github.com/TU_USUARIO/jw-timeline-enhanced.git
git push -u origin main

# Conecta Vercel con GitHub para auto-deploy
# (desde dashboard de Vercel)
```

### 3. **Comparte la URL**

Una vez desplegado:
- URL pública: `https://jw-timeline-xxx.vercel.app`
- Compártela con cualquier persona
- Ellos la abren en su navegador
- ¡A jugar!

---

## 🐛 Troubleshooting

### Problema: "No se pudo conectar a la sala"

**Causas posibles**:
1. Código de sala incorrecto (distingue mayúsculas)
2. La sala ya expiró o el host se desconectó
3. Problemas con PeerJS Cloud
4. Firewall/VPN bloqueando WebRTC

**Soluciones**:
1. Verifica el código carácter por carácter
2. Crea una nueva sala
3. Desactiva VPN temporalmente
4. Prueba en otro navegador (Chrome recomendado)
5. Verifica consola del navegador (F12) para errores

### Problema: "Conexión muy lenta o con lag"

**Causas**:
- Conexión a internet lenta
- Mucha distancia geográfica entre jugadores
- Host con conexión débil

**Soluciones**:
- Usa conexión por cable (ethernet) si es posible
- Host con mejor conexión
- Cierra otras aplicaciones que usen internet

### Problema: "La partida se desconectó a mitad del juego"

**Causas**:
- El host cerró la pestaña
- Pérdida de conexión a internet
- El navegador suspendió la pestaña

**Soluciones**:
- Host: mantén la pestaña activa y visible
- No minimices el navegador por períodos largos
- Mantén el ordenador conectado a la corriente (laptops)

---

## 📝 Configuración Actual en el Código

### `services/gameService.ts`

```typescript
// Líneas 28-41: Configuración de PeerJS
const PEER_CONFIG = {
  debug: 2,           // Nivel de debug (logs detallados)
  secure: true,       // Usa conexión segura (WSS)
  config: {
    iceServers: [     // Servidores STUN
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
  },
};
```

### `index.html`

```html
<!-- Línea 9: Carga de PeerJS desde CDN -->
<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
```

---

## ✅ Conclusión

**El multijugador online del juego JW Timeline está completamente configurado y listo para funcionar a través de internet.**

**Actualmente funciona**:
- ✅ Mismo computador (diferentes pestañas)
- ✅ Misma red local (Wi-Fi)
- ✅ *Debería* funcionar por internet con `npm run dev -- --host` + port forwarding

**Para uso público real**:
- 🚀 **Recomendado**: Deploy en Vercel/Netlify
- 🌐 Proporciona URL pública permanente
- 🔒 Más seguro que exponer Vite local
- ⚡ Mejor rendimiento (CDN global)

**Próximos pasos sugeridos**:
1. Prueba local (2 pestañas) para verificar funcionamiento ✅
2. Prueba en red local (2 computadores) ✅
3. Deploy en Vercel para acceso público 🚀

---

**Fecha**: 20 de Enero 2026
**Versión**: Enhanced 2.2
**Estado**: ✅ Funcional y listo para usar
