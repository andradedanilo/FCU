import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'dist-electron/**', 'dist-roster/**', 'dist-roster-electron/**', 'release/**', 'node_modules/**', 'work/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);
