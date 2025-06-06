import type { ESLint } from 'eslint';
import type { Schema } from '../schema';

export const supportedFlatConfigNames = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];

async function resolveESLintClass(
  useFlatConfig = false,
): Promise<typeof ESLint> {
  try {
    // In eslint 8.57.0 (the final v8 version), a dedicated API was added for resolving the correct ESLint class.
    const eslint = await import('eslint');
    if (typeof (eslint as any).loadESLint === 'function') {
      return await (eslint as any).loadESLint({ useFlatConfig });
    }
    // If that API is not available (an older version of v8), we need to use the old way of resolving the ESLint class.
    if (!useFlatConfig) {
      return eslint.ESLint;
    }
    const { FlatESLint } = require('eslint/use-at-your-own-risk');
    return FlatESLint;
  } catch {
    throw new Error('Unable to find ESLint. Ensure ESLint is installed.');
  }
}

export async function resolveAndInstantiateESLint(
  eslintConfigPath: string | undefined,
  options: Schema,
  useFlatConfig = false,
) {
  if (options.stats && !useFlatConfig) {
    throw new Error('The --stats option requires ESLint Flat Config');
  }
  if (
    useFlatConfig &&
    eslintConfigPath &&
    !supportedFlatConfigNames.some((name) => eslintConfigPath.endsWith(name))
  ) {
    throw new Error(
      `When using the new Flat Config with ESLint, all configs must be named ${supportedFlatConfigNames.join(' or ')}, and .eslintrc files may not be used. See https://eslint.org/docs/latest/use/configure/configuration-files`,
    );
  }
  const ESLint = await resolveESLintClass(useFlatConfig);

  const eslintOptions: ESLint.Options = {
    fix: !!options.fix,
    cache: !!options.cache,
    cacheLocation: options.cacheLocation || undefined,
    cacheStrategy: options.cacheStrategy || undefined,
    /**
     * Default is `true` and if not overridden the eslint.lintFiles() method will throw an error
     * when no target files are found.
     *
     * We don't want ESLint to throw an error if a user has only just created
     * a project and therefore doesn't necessarily have matching files, for example.
     *
     * Also, the angular generator creates a lint pattern for `html` files, but there may
     * not be any html files in the project, so keeping it true would break linting every time
     */
    errorOnUnmatchedPattern: false,
  };

  if (useFlatConfig) {
    eslintOptions.stats = !!options.stats;
    if (typeof options.useEslintrc !== 'undefined') {
      throw new Error(
        'For Flat Config, the `useEslintrc` option is not applicable. See https://eslint.org/docs/latest/use/configure/configuration-files-new',
      );
    }
    if (options.resolvePluginsRelativeTo !== undefined) {
      throw new Error(
        'For Flat Config, ESLint removed `resolvePluginsRelativeTo` and so it is not supported as an option. See https://eslint.org/docs/latest/use/configure/configuration-files-new',
      );
    }
    if (options.ignorePath !== undefined) {
      throw new Error(
        'For Flat Config, ESLint removed `ignorePath` and so it is not supported as an option. See https://eslint.org/docs/latest/use/configure/configuration-files-new',
      );
    }
    if (options.reportUnusedDisableDirectives) {
      throw new Error(
        'For Flat Config, ESLint removed `reportUnusedDisableDirectives` and so it is not supported as an option. See https://eslint.org/docs/latest/use/configure/configuration-files-new',
      );
    }

    /**
     * Adapted from https://github.com/eslint/eslint/blob/50f03a119e6827c03b1d6c86d3aa1f4820b609e8/lib/cli.js#L144
     */
    if (typeof options.noConfigLookup !== 'undefined') {
      const configLookup = !options.noConfigLookup;
      let overrideConfigFile: string | undefined | boolean =
        typeof eslintConfigPath === 'string' ? eslintConfigPath : !configLookup;
      if (overrideConfigFile === false) {
        overrideConfigFile = undefined;
      }
      eslintOptions.overrideConfigFile = overrideConfigFile;
    } else {
      eslintOptions.overrideConfigFile = eslintConfigPath;
    }
  } else {
    eslintOptions.overrideConfigFile = eslintConfigPath;
    (eslintOptions as ESLint.LegacyOptions).rulePaths = options.rulesdir || [];
    (eslintOptions as ESLint.LegacyOptions).resolvePluginsRelativeTo =
      options.resolvePluginsRelativeTo || undefined;
    (eslintOptions as ESLint.LegacyOptions).ignorePath =
      options.ignorePath || undefined;
    /**
     * If "noEslintrc" is set to `true` (and therefore here "useEslintrc" will be `false`), then ESLint will not
     * merge the provided config with others it finds automatically.
     */
    (eslintOptions as ESLint.LegacyOptions).useEslintrc = !options.noEslintrc;
    (eslintOptions as ESLint.LegacyOptions).reportUnusedDisableDirectives =
      options.reportUnusedDisableDirectives || undefined;
  }

  const eslint = new ESLint(eslintOptions);

  return {
    ESLint,
    eslint,
  };
}
