# Peso Claro — Android / React Native

Aplicación de finanzas personales sin backend. Los datos se guardan localmente con AsyncStorage.

## Requisitos
- Node.js LTS
- npm
- Android Studio (si quieres compilar localmente)
- Cuenta gratuita de Expo (solo para compilar con EAS en la nube)

## 1. Instalar dependencias
Abre una terminal dentro de la carpeta del proyecto:

```bash
npm install
npx expo install --check
```

Si Expo indica que alguna dependencia no coincide con el SDK instalado, ejecuta:

```bash
npx expo install --fix
```

## 2. Probar en Android
Instala Expo Go en tu teléfono y ejecuta:

```bash
npx expo start
```

Escanea el QR desde Expo Go. Para compilar y ejecutar en un emulador/dispositivo con depuración USB:

```bash
npx expo run:android
```

## 3. Generar APK instalable
Inicia sesión en EAS:

```bash
npx eas-cli login
```

Configura el proyecto (la primera vez):

```bash
npx eas-cli build:configure
```

Genera el APK:

```bash
npx eas-cli build --platform android --profile preview
```

EAS mostrará un enlace para descargar el `.apk`. Descárgalo en Android y permite la instalación desde esa fuente cuando el sistema lo solicite.

## 4. Compilar localmente
Con Android Studio y el SDK configurados:

```bash
npx expo prebuild --platform android
npx expo run:android
```

Para crear un APK release local, después del prebuild:

```bash
cd android
./gradlew assembleRelease
```

En Windows usa:

```powershell
cd android
gradlew.bat assembleRelease
```

El APK se genera normalmente en `android/app/build/outputs/apk/release/`.

## Funciones incluidas
- Inicio con saldo disponible, ingresos, gastos y ahorro.
- Alta de ingresos y gastos con concepto, categoría, monto, moneda y fecha automática.
- Conversión de USD a MXN con tipo de cambio editable.
- Movimientos locales, filtros y eliminación.
- Meta de ahorro, progreso y aportaciones.
- Pagos y deudas con nombre, monto, moneda, fecha límite y estado (pendiente, vence hoy, vencido o pagado).
- Al marcar un pago como pagado, se crea automáticamente un gasto para actualizar el saldo.
- Presupuesto de comida y recetas económicas con costo estimado.
- Cuatro pestañas: Inicio, Movimientos, Presupuesto y Recetas.

## Notas importantes
- No hay backend, registro ni sincronización en la nube.
- Los datos permanecen en el dispositivo; desinstalar o borrar los datos de la app puede eliminarlos.
- El tipo de cambio es manual; no consulta cotizaciones en tiempo real.
- Las recetas muestran costos orientativos por preparación, no precios garantizados.
- La app inicia con saldo cero. Registra tus movimientos para calcular el saldo.
- El ahorro se descuenta del saldo disponible y se muestra por separado.
- Antes de publicar, cambia `android.package` por un identificador propio y prueba la app en tu dispositivo.
