# Teacher Alma — mobile scaffold

Base Expo + React Native + TypeScript y React Navigation. Solo contiene placeholders; no implementa los diseños finales, autenticación, datos de cursos ni otras funcionalidades.

## Ejecutar

Desde `mobile/`:

```sh
npm ci
npm run typecheck
npm start
```

Abrir en Expo Go compatible con SDK 57 o usar `npm run android` con un dispositivo/emulador disponible. `npm run ios` requiere macOS para el simulador; desde Windows puede usarse un iPhone con Expo Go. No se añadieron dependencias de web.

## Organización

```text
App.tsx
index.ts
src/
  components/PlaceholderScreen.tsx
  navigation/RootNavigator.tsx
  navigation/types.ts
  features/
    home/screens/
    courses/navigation/
    courses/screens/
    progress/screens/
    profile/screens/
  services/api/client.ts
```

Las tabs son Inicio, Cursos, Progreso y Perfil. Cursos contiene un native stack tipado: `Courses -> CourseDetail -> Roadmap`. Los botones permiten recorrer los placeholders y volver; no representan acciones de inicio de curso ni de progreso. No se usan IDs ni datos ficticios de cursos.

## API preparada, todavía sin consumo

`apiRequest<T>(path, options)` utiliza `fetch` y conserva `status`, `code` y `message` de los errores HTTP. Acepta las opciones estándar, incluido `signal` para cancelación. No almacena tokens ni agrega autenticación o reintentos automáticos.

Copiar `.env.example` a `.env` y configurar `EXPO_PUBLIC_API_URL` cuando comience la integración. No hay URL de producción predeterminada; las pantallas funcionan sin esta variable porque no hacen solicitudes. En un teléfono, localhost corresponde al teléfono: la URL de desarrollo debe ser accesible desde el dispositivo.

Las variables `EXPO_PUBLIC_*` son públicas y quedan incluidas en la aplicación. No colocar contraseñas, tokens ni la configuración del backend en ellas.

## Alcance

Los assets y el aviso de licencia incluidos proceden de la plantilla oficial de Expo; no son la identidad visual definitiva de Teacher Alma. No se seleccionaron librerías de estado, caché, autenticación ni UI. Backend, Prisma y migraciones permanecen fuera de esta tarea.

## Verificación del scaffold

- TypeScript: `npm run typecheck`, sin errores.
- Compatibilidad de dependencias: `npx expo install --check`, correcta.
- Expo/Metro: `npx expo start --host lan --port 8081`; servidor y bundle Android comprobados.
- Expo Go en Android API 34: tabs Inicio, Cursos, Progreso y Perfil; recorrido Courses → Course Detail → Roadmap → Cursos comprobado mediante interacción con el emulador.
- iOS no se probó en este entorno Windows.

El emulador necesitó un arranque en frío tras avisos de Android de sistema sin respuesta. En este equipo `--localhost` vinculó Metro solo a IPv6; `--host lan` permitió conectar Expo Go usando el reenvío de puerto de ADB.

La instalación reportó diez vulnerabilidades moderadas transitivas de Expo, sin altas ni críticas. No se aplicaron correcciones forzadas que cambiasen las versiones compatibles del SDK.
