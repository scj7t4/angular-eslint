# Configuring `angular-eslint` for use in ESLint's default flat config format

In version 9 of ESLint, they changed their default configuration format to the so called "flat config" style using exclusively a `eslint.config.js` file as the only way of configuring a project: https://eslint.org/blog/2024/04/eslint-v9.0.0-released/

**If you are still using ESLint v8, or continuing to use the eslintrc config format, do not use this guide, you should reference these docs instead: [CONFIGURING_ESLINTRC.md](./CONFIGURING_ESLINTRC.md).**

If you are using ESLint v9 or later with flat config, then the following guidance is for you.

It should be used in conjunction with the official ESLint documentation on eslintrc, which can be found here: https://eslint.org/docs/latest/use/configure/

---

<br>

## Notes on ESLint Configuration

These days with flat config, ESLint has first class support for different types of files being configured differently (different rules and parsers). We can leverage this for Angular projects, because they:

- use **TypeScript files** for source code
- use a **custom/extended form of HTML** for templates (be they inline or external HTML files)

The thing is: **ESLint understands neither of these things out of the box.**

Fortunately, however, ESLint has clearly defined points of extensibility that we can leverage to make this all work.

> For detailed information about ESLint plugins, parsers etc. please review the official ESLint eslintrc config documentation: https://eslint.org/docs/latest/use/configure/

**The key principle of our configuration required for Angular projects is that we need to run different blocks of configuration for different file types/extensions**. In other words, we don't want the same rules to apply on TypeScript files that we do on HTML/inline-templates.

Therefore, our flat config will contain two entries, one for TS, one for HTML. We could provide these two entries directly in an exported array, but `typescript-eslint` provides an awesome typed utility function which makes writing our flat configs a lot nicer, so we will instead require the function and pass in multiple objects for our configuration.

## Configuring ESLint for Inline Templates

One of the features of angular-eslint is its ability to lint **inline templates** within your Angular components. This is made possible through ESLint's processor API, which allows us to extract inline template content from your TypeScript component files and apply HTML template rules to them.

### How it works

When you use inline templates in your Angular components (using the `template` property instead of `templateUrl`), angular-eslint can automatically extract these templates and treat them as if they were separate HTML files. This means all your Angular template rules will work seamlessly on both external template files AND inline templates.

The magic happens through the `angular.processInlineTemplates` processor, which:

1. Scans your TypeScript component files for inline templates
2. Extracts the template content
3. Applies your HTML configuration rules to the extracted templates
4. Reports any linting issues with proper line and column mapping back to your original TypeScript file

For more details on how ESLint processors work behind the scenes, see the [ESLint Custom Processors documentation](https://eslint.org/docs/latest/extend/custom-processors).

### Configuration example

The key is to add the `processor: angular.processInlineTemplates` to your TypeScript configuration block:

**Workspace root level eslint.config.js**

```js
// @ts-check

// Allows us to bring in the recommended core rules from eslint itself
const eslint = require('@eslint/js');

// Allows us to use the typed utility for our config, and to bring in the recommended rules for TypeScript projects from typescript-eslint
const tseslint = require('typescript-eslint');

// Allows us to bring in the recommended rules for Angular projects from angular-eslint
const angular = require('angular-eslint');

// Export our config array, which is composed together thanks to the typed utility function from typescript-eslint
module.exports = tseslint.config(
  {
    // Everything in this config object targets our TypeScript files (Components, Directives, Pipes etc)
    files: ['**/*.ts'],
    extends: [
      // Apply the recommended core rules
      eslint.configs.recommended,
      // Apply the recommended TypeScript rules
      ...tseslint.configs.recommended,
      // Optionally apply stylistic rules from typescript-eslint that improve code consistency
      ...tseslint.configs.stylistic,
      // Apply the recommended Angular rules
      ...angular.configs.tsRecommended,
    ],
    // IMPORTANT: Set the custom processor to enable inline template linting
    // This allows your inline Component templates to be extracted and linted with the same
    // rules as your external .html template files
    processor: angular.processInlineTemplates,
    // Override specific rules for TypeScript files (these will take priority over the extended configs above)
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // Everything in this config object targets our HTML files (both external template files,
    // AND inline templates thanks to the processor set in the TypeScript config above)
    files: ['**/*.html'],
    extends: [
      // Apply the recommended Angular template rules
      ...angular.configs.templateRecommended,
      // Apply the Angular template rules which focus on accessibility of our apps
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
```

If you decided to add one or more additional projects to your workspace, the schematics will automatically generate a project level `eslint.config.js` file for you. This will extend from the root level config and allow you to override or add additional rules specific to that project.

**Project level eslint.config.js**

```js
// @ts-check

// Allows us to use the typed utility for our config
const tseslint = require('typescript-eslint');

// Require our workspace root level config and extend from it
const rootConfig = require('../../eslint.config.js');

module.exports = tseslint.config(
  // Apply the root config first
  ...rootConfig,
  {
    // Any project level overrides or additional rules for TypeScript files can go here
    // (we don't need to extend from any typescript-eslint or angular-eslint configs because
    // we already applied the rootConfig above which has them)
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'lib', // different to our root config, which was "app"
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'lib', // different to our root config, which was "app"
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // Any project level overrides or additional rules for HTML files can go here
    // (applies to both external template files AND inline templates)
    // (we don't need to extend from any angular-eslint configs because
    // we already applied the rootConfig above which has them)
    files: ['**/*.html'],
    rules: {},
  },
);
```

By setting up our config in this way, we have complete control over what rules etc apply to what file types and our separate concerns remain clearer and easier to maintain. The schematics provided by angular-eslint will already configure your project in this way.

## Notes for `eslint-plugin-prettier` users

Prettier is an awesome code formatter which can be used entirely independently of linting.

Some folks, however, like to apply prettier by using it inside of ESLint, using `eslint-plugin-prettier`. If this applies to you then you will want to read this section on how to apply it correctly for HTML templates. Make sure you read and fully understand the information above on the importance of `"overrides"` before reading this section.

If you choose to use `eslint-plugin-prettier`, **please ensure that you are using version 5.1.0 or later**, and apply the following configuration to ESLint and prettier:

**.prettierrc**

```json
{
  "overrides": [
    {
      "files": "*.html",
      "options": {
        "parser": "angular"
      }
    }
  ]
}
```

Project level **eslint.config.js**

```js
// @ts-check

// Allows us to use the typed utility for our config
const tseslint = require('typescript-eslint');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

// Require our workspace root level config and extend from it
const rootConfig = require('../../eslint.config.js');

module.exports = tseslint.config([
  // Apply the root config first
  ...rootConfig,
  {
    // Any project level overrides or additional rules for TypeScript files can go here
    // (we don't need to extend from any typescript-eslint or angular-eslint configs because
    // we already applied the rootConfig above which has them)
    files: ['**/*.ts'],
    extends: [prettierRecommended], // here we inherit from the recommended setup from eslint-plugin-prettier for TS
    rules: {},
  },
  {
    // Any project level overrides or additional rules for HTML files can go here
    // (applies to both external template files AND inline templates)
    // (we don't need to extend from any angular-eslint configs because
    // we already applied the rootConfig above which has them)
    files: ['**/*.html'],
    extends: [prettierRecommended], // here we inherit from the recommended setup from eslint-plugin-prettier for HTML
    rules: {},
  },
]);
```

With this setup, you have covered the following scenarios:

- ESLint + prettier together work on Components with external templates (and all other source TS files)
- ESLint + prettier together work on the external template HTML files themselves
- ESLint + prettier together work on Components with inline templates

## Premade configs provided by this project

We have several premade configs within this project which you can extend from (and indeed the configs generated by our schematics do just that). For more information about the configs, check out the README here:

https://github.com/angular-eslint/angular-eslint/blob/main/packages/angular-eslint/src/configs/README.md
