import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*']
  },
  {
    files: ['**/*.rules'],
    plugins: {
      'firebase-security': firebaseRulesPlugin
    },
    languageOptions: {
      parser: firebaseRulesPlugin.preprocessors['.rules'].parser
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules
    }
  }
];
