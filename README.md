# JW Timeline Enhanced

Juego de cronología bíblica en React con partidas locales, contra IA, en tiempo real y por turnos.

## Desarrollo

Requisitos: Node.js 22 y npm.

```bash
npm ci
npm run dev
```

La aplicación se abre en `http://localhost:3000`.

## Comprobaciones

```bash
npm run typecheck
npm test
npm run build
npm ci --prefix functions
npm --prefix functions run build
npm --prefix functions test
```

Las pruebas de reglas requieren Java 21 o posterior:

```bash
npm run test:rules
```

El flujo de GitHub Actions ejecuta estas comprobaciones en cada `push` a `master` y en cada pull request.

## Firebase

Las jugadas online, amistades, invitaciones, marcadores e historial competitivo se validan mediante Cloud Functions. Las manos se guardan en documentos legibles solo por su propietario y el mazo queda reservado al servidor. Los clientes solo pueden escribir su progreso privado, partidas locales y el latido de presencia de su propio jugador.

Para publicar el backend y las reglas en el proyecto configurado:

```bash
npx firebase-tools@15.23.0 deploy \
  --project jwtimeline-d2eb1 \
  --only functions,firestore:rules,firestore:indexes
```

El despliegue de Functions y la tarea programada de caducidad puede requerir que el proyecto de Firebase tenga habilitado el plan de facturación correspondiente.
