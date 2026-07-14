export default [
  {
    ignores: ["node_modules/**", "public/js/vendor/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        document: "readonly",
        window: "readonly",
        alert: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        localStorage: "readonly",
        Event: "readonly",
        URL: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: "warn",
    },
  },
];
