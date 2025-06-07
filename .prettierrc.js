/** @type {import("prettier").Config} */
module.exports = {
  // Core formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  
  // Indentation and line breaks
  tabWidth: 2,
  useTabs: false,
  printWidth: 120,
  
  // JavaScript/TypeScript specific
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  
  // File type overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        singleQuote: false, // JSON requires double quotes
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 120,
        proseWrap: 'preserve',
      },
    },
    {
      files: '*.ts',
      options: {
        parser: 'typescript',
      },
    },
  ],
}; 