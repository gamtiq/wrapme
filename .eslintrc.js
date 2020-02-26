module.exports = {
    root: true,
    parserOptions: {
        project: './tsconfig.eslint.json'
    },
    extends: [
        'guard/typescript-ext',
        'guard/no-prettier'
    ]
};
