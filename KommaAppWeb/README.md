# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Podaci o poslodavcu

Podaci se primarno čuvaju u SQL tablici `tvrtke` preko API ruta `/tvrtka`.

Vite env varijable služe kao početni fallback (ako zapis u tablici još ne postoji):

- `VITE_POSLODAVAC_NAZIV`
- `VITE_POSLODAVAC_ADRESA`
- `VITE_POSLODAVAC_POSTANSKI_BROJ`
- `VITE_POSLODAVAC_JE_HR` (`true`/`false`)
- `VITE_POSLODAVAC_OIB` (ako je `VITE_POSLODAVAC_JE_HR=true`)

Primjer vrijednosti je u datoteci `.env.example`.

U aplikaciji postoji meni **Postavke poslodavca** (admin/superadmin), koji sprema podatke direktno u bazu.
