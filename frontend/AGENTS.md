# Frontend — Rosana Frutos Secos

React + Vite + Tailwind CSS project imported from Figma Make into the local monorepo.

## Development Server

Start with `pnpm dev` after installing dependencies. The default port is 8443.
Check for an existing server before starting another one; do not assume one is running.

- Local URL: `http://localhost:8443`; administration: `/backoffice`
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/backoffice/` - Administrative catalog, category, image and stock screens
- `src/lib/api.ts` and `src/lib/backoffice-api.ts` - Shared requests and administrative API contracts
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

## Backoffice conventions

- Use existing tokens and accessible controls of at least 44 px; no separate UI framework.
- API default `/api/v1`; Vite proxies `/api`, `/media` and `/static` to Django on 127.0.0.1:8000. Local Swagger UI: `/api/docs/swagger/`.
- Preserve the proxy client-IP header and local-only API checks until authentication is implemented.
- Never use sample/fallback products in administrative screens or simulate successful writes locally.
- SKU/price/stock belong to a fixed-weight variant. Convert kg to whole grams; stock quantities count packages.
- Reserved stock is read-only. Existing physical stock changes only through an adjustment with reason/history.
- Keep decimal API prices as strings in editors. Do not send reserved or existing physical stock when saving metadata.
- Gallery supports multiple files/URLs, descriptions, credits and cover/order. New uploads save with the product; existing gallery actions save immediately.
- Refer to `../docs/backoffice.md` and `../docs/context.md` for current scope. Orders/authentication are not part of stage 1.
- Validate with `node node_modules/typescript/bin/tsc --noEmit` and `pnpm build`.
