module.exports = {
    env: {
        es6: true,
        node: true
    },
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended' // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    parserOptions: {
        ext: ['.ts'],
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module' // Allows for the use of imports
    },
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/camelcase': 0,
        '@typescript-eslint/interface-name-prefix': 0,
        '@typescript-eslint/explicit-member-accessibility': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }]
    }
};
