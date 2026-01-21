# 🚀 Guía Completa para Deploy en Vercel

## 📋 Estado Actual

✅ Proyecto preparado con `vercel.json`
✅ Git inicializado y commit creado
✅ Repositorio GitHub creado: https://github.com/Beldar84/jw-timeline-enhanced
⏳ Pendiente: Subir código a GitHub y desplegar

---

## 🎯 Opción 1: GitHub Desktop (MÁS FÁCIL - RECOMENDADO)

### Paso 1: Instalar GitHub Desktop
1. Ve a https://desktop.github.com/
2. Descarga para Mac
3. Instala la aplicación
4. Inicia sesión con tu cuenta de GitHub

### Paso 2: Agregar tu Repositorio Local
1. Abre GitHub Desktop
2. Menú: **File → Add Local Repository**
3. Selecciona la carpeta: `/Users/beldar/Documents/jw-timeline-enhanced`
4. Haz clic en **Add Repository**

### Paso 3: Publicar a GitHub
1. Verás el botón **"Publish repository"** arriba a la derecha
2. Haz clic en él
3. Configuración:
   - **Name**: `jw-timeline-enhanced` (ya debería estar)
   - **Description**: "JW Timeline - Biblical chronology game"
   - **Keep this code private**: ❌ Desmarca esto (para usar Vercel gratis)
4. Haz clic en **"Publish Repository"**
5. Espera a que termine (verás progreso abajo)

### Paso 4: Verificar en GitHub
1. Ve a https://github.com/Beldar84/jw-timeline-enhanced
2. Refresca la página
3. Deberías ver todos tus archivos

### Paso 5: Conectar Vercel
1. Ve a https://vercel.com
2. Haz clic en **"Sign Up"** o **"Log In"**
3. Selecciona **"Continue with GitHub"**
4. Autoriza a Vercel
5. En el dashboard, haz clic en **"Add New... → Project"**
6. Busca tu repo: `jw-timeline-enhanced`
7. Haz clic en **"Import"**
8. Configuración del proyecto:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (ya detectado)
   - **Output Directory**: `dist` (ya detectado)
   - **Install Command**: `npm install` (ya detectado)
9. Haz clic en **"Deploy"**
10. Espera 2-3 minutos
11. ¡Listo! Vercel te dará una URL como: `https://jw-timeline-enhanced.vercel.app`

---

## 🎯 Opción 2: GitHub CLI (Terminal)

Si prefieres la terminal y tienes GitHub CLI instalado:

### Instalar GitHub CLI (si no lo tienes)
```bash
brew install gh
```

### Autenticar
```bash
gh auth login
```

### Crear y subir repositorio
```bash
cd ~/Documents/jw-timeline-enhanced

# Verificar que el remoto esté configurado
git remote -v

# Autenticar con GitHub CLI
gh auth login

# Hacer push
gh repo view --web  # Esto abrirá el repo en el navegador
git push -u origin master
```

---

## 🎯 Opción 3: Subir Archivos Manualmente (Última Opción)

**⚠️ Solo si las otras opciones no funcionan**

### Método A: Arrastrar y Soltar
1. Ve a https://github.com/Beldar84/jw-timeline-enhanced
2. Haz clic en **"uploading an existing file"**
3. Arrastra TODAS las carpetas y archivos (excepto `node_modules` y `.git`)
4. Escribe un mensaje: "Initial commit"
5. Haz clic en **"Commit changes"**

**Nota**: Este método puede ser lento con muchas imágenes.

### Método B: Usar la Web para Clonar y Push
Si tienes una cuenta de hosting o servidor temporal:
1. Sube el proyecto a un servidor donde tengas git acceso
2. Haz push desde ahí

---

## 🔧 Solución de Problemas

### Error: "Received HTTP code 403 from proxy"
**Causa**: Restricciones de red/firewall
**Solución**: Usa GitHub Desktop (Opción 1)

### Error: "Unable to create lock file"
**Causa**: Proceso Git bloqueado
**Solución**:
```bash
cd ~/Documents/jw-timeline-enhanced
rm -f .git/*.lock .git/refs/heads/*.lock
git status  # Verificar que funcione
```

### Error: "Repository not found"
**Causa**: URL incorrecta o permisos
**Solución**:
```bash
git remote remove origin
git remote add origin https://github.com/Beldar84/jw-timeline-enhanced.git
git remote -v  # Verificar
```

---

## 📊 Checklist de Deploy

### Pre-Deploy
- [x] Proyecto con Git inicializado
- [x] Commit creado con todos los archivos
- [x] Archivo `vercel.json` creado
- [x] Repositorio GitHub creado
- [ ] Código subido a GitHub
- [ ] Vercel conectado con GitHub

### Post-Deploy
- [ ] URL de producción obtenida
- [ ] Juego funciona en producción
- [ ] Multijugador online probado
- [ ] Imágenes cargan correctamente
- [ ] Sin errores en consola del navegador

---

## 🌐 Configuración Final en Vercel

Una vez que el código esté en GitHub y hayas importado el proyecto en Vercel:

### Variables de Entorno (No necesarias por ahora)
Tu proyecto no requiere variables de entorno por el momento.

### Dominios Personalizados (Opcional)
Si quieres un dominio personalizado:
1. Ve a tu proyecto en Vercel
2. Sección **"Settings" → "Domains"**
3. Agrega tu dominio
4. Sigue las instrucciones de configuración DNS

### Configuración de Build
Vercel detectará automáticamente:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Si necesitas cambiar algo:
1. Ve a **Settings → General**
2. Sección **"Build & Development Settings"**

---

## 🎉 Después del Deploy

### URL de Producción
Vercel te dará tres URLs:
1. **Production**: `https://jw-timeline-enhanced.vercel.app` (la principal)
2. **Preview**: Una por cada commit
3. **Development**: Para testing local

### Compartir tu Juego
Comparte la URL de producción con quien quieras:
```
https://jw-timeline-enhanced.vercel.app
```

### Auto-Deploy
Cada vez que hagas push a GitHub:
1. Vercel detectará los cambios automáticamente
2. Construirá y desplegará la nueva versión
3. La URL se mantendrá igual
4. Todo el proceso toma 2-3 minutos

---

## 📱 Probar el Juego Online

### Desde Computadora
1. Abre: `https://jw-timeline-enhanced.vercel.app`
2. Haz clic en "🌐 Jugar online"
3. Crea una sala
4. Comparte el código JW-XXXX

### Desde Móvil
1. Abre el mismo URL en el móvil
2. Únete con el código
3. ¡Juega!

### Probar con Amigos
1. Comparte la URL
2. Uno crea sala
3. Otros se unen con el código
4. ¡A jugar desde cualquier parte del mundo!

---

## 🔄 Actualizaciones Futuras

### Hacer Cambios
1. Edita archivos en tu computadora
2. Commit en GitHub Desktop:
   - Escribe mensaje de commit
   - Haz clic en "Commit to main"
3. Push: Haz clic en "Push origin"
4. Vercel despliega automáticamente

### Rollback (Volver a Versión Anterior)
Si algo sale mal:
1. Ve a tu proyecto en Vercel
2. Sección **"Deployments"**
3. Encuentra el deploy anterior que funcionaba
4. Haz clic en los **"..."** → **"Promote to Production"**

---

## 💡 Tips Finales

### Rendimiento
- ✅ Todas las imágenes ya están locales (rápido)
- ✅ Vercel usa CDN global (muy rápido)
- ✅ Build optimizado con Vite

### Costos
- ✅ **100% GRATIS** con Vercel Hobby plan
- Incluye:
  - Hosting ilimitado
  - Ancho de banda generoso
  - SSL automático
  - Auto-deploy desde GitHub

### Límites del Plan Gratis
- 100 GB de ancho de banda/mes (suficiente para miles de jugadores)
- 100 horas de build/mes
- Deploy ilimitados

---

## 📞 Soporte

### Vercel
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

### GitHub
- Docs: https://docs.github.com
- Support: https://support.github.com

---

## ✅ Resumen de Pasos

1. **Instalar GitHub Desktop**
2. **Agregar repositorio local**
3. **Publish a GitHub**
4. **Ir a vercel.com**
5. **Sign up con GitHub**
6. **Import jw-timeline-enhanced**
7. **Deploy**
8. **¡Compartir URL!**

**Tiempo estimado**: 10-15 minutos

---

**¡Buena suerte con tu deploy!** 🚀📖✨
