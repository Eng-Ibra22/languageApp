# SomSpeak

Standalone React, Express, and SQLite language-learning app.

## Local development

Copy `.env.example` to `.env.local` and set a development `JWT_SECRET`. Start the API and Vite frontend in separate terminals:

```sh
npm run server
npm run dev
```

The API seeds eight beginner lessons and three achievements automatically. In development, password-reset links are printed by the API server.

## Production

Set every required value in `.env.example`, including a long random `JWT_SECRET`, persistent `DATABASE_PATH`, `APP_URL`, and your public `ALLOWED_ORIGINS`. Configure `RESET_EMAIL_WEBHOOK_URL` with a transactional-email adapter and `TRANSLATION_API_URL` with a LibreTranslate-compatible provider. The frontend deliberately does not contain any provider secrets.

Build and validate with:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The included Dockerfile builds the frontend and serves it from Express in production. Mount persistent storage at the path used by `DATABASE_PATH`; otherwise user data will be lost on a container restart.
