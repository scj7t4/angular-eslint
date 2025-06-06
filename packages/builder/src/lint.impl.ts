import { createBuilder, type BuilderOutput } from '@angular-devkit/architect';
import type { ESLint } from 'eslint';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type { Schema } from './schema';
import {
  resolveAndInstantiateESLint,
  supportedFlatConfigNames,
} from './utils/eslint-utils';

export default createBuilder(
  async (options: Schema, context): Promise<BuilderOutput> => {
    try {
      const systemRoot = context.workspaceRoot;

      // eslint resolves files relative to the current working directory.
      // We want these paths to always be resolved relative to the workspace
      // root to be able to run the lint executor from any subfolder.
      process.chdir(systemRoot);

      const projectName = context.target?.project ?? '<???>';
      const printInfo = options.format && !options.silent;

      if (printInfo) {
        console.info(`\nLinting ${JSON.stringify(projectName)}...`);
      }

      const eslintConfigPath = options.eslintConfig
        ? resolve(systemRoot, options.eslintConfig)
        : undefined;

      options.cacheLocation = options.cacheLocation
        ? join(options.cacheLocation, projectName)
        : null;

      /**
       * Until ESLint v9 is released and the new so called flat config is the default
       * we only want to support it if the user has explicitly opted into it by converting
       * their root ESLint config to use a supported flat config file name.
       */
      const useFlatConfig = supportedFlatConfigNames.some((name) =>
        existsSync(join(systemRoot, name)),
      );
      const { eslint, ESLint } = await resolveAndInstantiateESLint(
        eslintConfigPath,
        options,
        useFlatConfig,
      );

      const version = ESLint?.version?.split('.');
      if (
        !version ||
        version.length < 2 ||
        Number(version[0]) < 7 ||
        (Number(version[0]) === 7 && Number(version[1]) < 6)
      ) {
        throw new Error('ESLint must be version 7.6 or higher.');
      }

      let lintResults: ESLint.LintResult[] = [];

      try {
        lintResults = await eslint.lintFiles(options.lintFilePatterns);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes(
            'You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser',
          )
        ) {
          let eslintConfigPathForError = `for ${projectName}`;
          const projectMetadata = await context.getProjectMetadata(projectName);
          if (projectMetadata?.root) {
            const { root } = projectMetadata;
            eslintConfigPathForError =
              resolveESLintConfigPath(root as string) ?? '';
          }

          console.error(`
Error: You have attempted to use a lint rule which requires the full TypeScript type-checker to be available, but you do not have \`parserOptions.project\` configured to point at your project tsconfig.json files in the relevant TypeScript file "overrides" block of your project ESLint config ${
            eslintConfigPath || eslintConfigPathForError
          }

For full guidance on how to resolve this issue, please see https://github.com/angular-eslint/angular-eslint/blob/main/docs/RULES_REQUIRING_TYPE_INFORMATION.md
`);

          return {
            success: false,
          };
        }
        // If some unexpected error, rethrow
        throw err;
      }

      if (lintResults.length === 0) {
        const ignoredPatterns = (
          await Promise.all(
            options.lintFilePatterns.map(async (pattern) =>
              (await eslint.isPathIgnored(pattern)) ? pattern : null,
            ),
          )
        )
          .filter((pattern) => !!pattern)
          .map((pattern) => `- '${pattern}'`);
        if (ignoredPatterns.length) {
          throw new Error(
            `All files matching the following patterns are ignored:\n${ignoredPatterns.join(
              '\n',
            )}\n\nPlease check your '.eslintignore' file.`,
          );
        }
        throw new Error(
          'Invalid lint configuration. Nothing to lint. Please check your lint target pattern(s).',
        );
      }

      // output fixes to disk, if applicable based on the options
      await ESLint.outputFixes(lintResults);

      const formatter = await eslint.loadFormatter(options.format);

      let totalErrors = 0;
      let totalWarnings = 0;

      const reportOnlyErrors = options.quiet;
      const maxWarnings = options.maxWarnings;

      /**
       * Depending on user configuration we may not want to report on all the
       * results, so we need to adjust them before formatting.
       */
      const finalLintResults: ESLint.LintResult[] = lintResults
        .map((result): ESLint.LintResult | null => {
          totalErrors += result.errorCount;
          totalWarnings += result.warningCount;

          if (result.errorCount || (result.warningCount && !reportOnlyErrors)) {
            if (reportOnlyErrors) {
              // Collect only errors (Linter.Severity === 2)
              result.messages = result.messages.filter(
                ({ severity }) => severity === 2,
              );
            }

            return result;
          }

          return null;
        })
        // Filter out the null values
        .filter(Boolean) as ESLint.LintResult[];

      const hasWarningsToPrint: boolean =
        totalWarnings > 0 && !reportOnlyErrors;
      const hasErrorsToPrint: boolean = totalErrors > 0;

      /**
       * It's important that we format all results together so that custom
       * formatters, such as checkstyle, can provide a valid output for the
       * whole project being linted.
       *
       * Additionally, apart from when outputting to a file, we want to always
       * log (even when no results) because different formatters handled the
       * "no results" case differently.
       */
      const formattedResults = await formatter.format(finalLintResults);

      if (options.outputFile) {
        const pathToOutputFile = join(systemRoot, options.outputFile);
        mkdirSync(dirname(pathToOutputFile), { recursive: true });
        writeFileSync(pathToOutputFile, formattedResults);
      } else {
        console.info(formattedResults);
      }

      if (hasWarningsToPrint && printInfo) {
        console.warn('Lint warnings found in the listed files.\n');
      }

      if (hasErrorsToPrint && printInfo) {
        console.error('Lint errors found in the listed files.\n');
      }

      if (
        (totalWarnings === 0 || reportOnlyErrors) &&
        totalErrors === 0 &&
        printInfo
      ) {
        console.info('All files pass linting.\n');
      }

      const tooManyWarnings = maxWarnings >= 0 && totalWarnings > maxWarnings;
      if (tooManyWarnings && printInfo) {
        console.error(
          `Found ${totalWarnings} warnings, which exceeds your configured limit (${options.maxWarnings}). Either increase your maxWarnings limit or fix some of the lint warnings.`,
        );
      }

      return {
        success: options.force || (totalErrors === 0 && !tooManyWarnings),
      };
    } catch (err) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = `Error when running ESLint: ${err.message}`;
      }
      return {
        success: false,
        error: String(errorMessage),
      };
    }
  },
);

function resolveESLintConfigPath(projectRoot: string): string | null {
  const rcPath = join(projectRoot, '.eslintrc.json');
  if (existsSync(rcPath)) {
    return rcPath;
  }
  const jsPath = join(projectRoot, 'eslint.config.js');
  if (existsSync(jsPath)) {
    return jsPath;
  }
  const mjsPath = join(projectRoot, 'eslint.config.mjs');
  if (existsSync(mjsPath)) {
    return mjsPath;
  }
  const cjsPath = join(projectRoot, 'eslint.config.cjs');
  if (existsSync(cjsPath)) {
    return cjsPath;
  }
  return null;
}
