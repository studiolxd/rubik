import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier/flat'

export default tseslint.config(
  // No analizar artefactos ni dependencias.
  { ignores: ['dist', 'node_modules'] },

  // Código de la app (React + TS, navegador).
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactRefresh.configs.vite],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Reglas clásicas de hooks (alto valor, sin falsos positivos).
      // Las nuevas reglas estilo React-Compiler de react-hooks v7 quedan
      // desactivadas de momento; se pueden adoptar más adelante usando
      // `reactHooks.configs.flat['recommended-latest']`.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Scripts y utilidades de Node (build, generación, verificación del motor).
  {
    files: ['scripts/**/*.{js,mjs}', '*.{js,mjs}', 'src/**/*.verify.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },

  // Desactiva las reglas de ESLint que chocarían con el formateo de Prettier.
  // Debe ir el último para tener prioridad.
  prettier,
)
