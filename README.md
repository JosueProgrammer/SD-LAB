# SD LAB

PLataforma de streaming con chat interactivo y control de usuarios

## Descripción

El proyecto ghostream es una plataforma de streaming desarrollada con el objetivo de ofrecer una experiencia completa para los usuarios que deseen transmitir contenido en vivo. Con una combinación de tecnologías como LiveKit, Next.js, Clerck, Prisma y Vercel, nuestra plataforma proporciona una solución robusta y escalable para la gestión de usuarios, interacción en tiempo real a través de un chat interactivo, y la capacidad de gestionar y bloquear usuarios según sea necesario.

## Características Principales

- **Gestión de Usuarios:** Permite a los usuarios registrarse, iniciar sesión y gestionar su cuenta.
- **Chat Interactivo:** Facilita la comunicación en tiempo real entre los usuarios que participan en la transmisión.
- **Bloqueo de Usuarios:** Ofrece la capacidad de bloquear usuarios problemáticos para mantener un entorno seguro y positivo.

## Tecnologías Utilizadas

- [LiveKit](https://livekit.io/): Breve descripción de LiveKit.
- [Next.js](https://nextjs.org/): Breve descripción de Next.js.
- [Clerck](https://clerk.com/): Breve descripción de Clerck.
- [Prisma](https://www.prisma.io/): Breve descripción de Prisma.
- [Vercel](https://vercel.com): Breve descripción de Vercel.

## Instalación

1. Clona este repositorio: `git clone https://github.com/ghostdev21/next-streaming-ghost`
2. Instala las dependencias: `pnpm install`
3. Configura las variables de entorno.
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
CLERK_WEBHOOK_SECRET


# This was inserted by `prisma init`:
# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL

LIVEKIT_API_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
NEXT_PUBLIC_LIVEKIT_WS_URL
UPLOADTHING_SECRET
UPLOADTHING_APP_ID
```


## Contribución

Si deseas contribuir a este proyecto, sigue los siguientes pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama: `git checkout -b feature/nueva-caracteristica`.
3. Haz tus cambios y commitea: `git commit -am 'Agrega una nueva característica'`.
4. Sube tus cambios: `git push origin feature/nueva-caracteristica`.
5. Abre un Pull Request.