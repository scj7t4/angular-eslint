jest.mock('eslint', () => ({
  ESLint: jest.fn(),
}));

jest.mock('eslint/use-at-your-own-risk', () => ({
  FlatESLint: jest.fn(),
}));

import { ESLint } from 'eslint';
import { FlatESLint } from 'eslint/use-at-your-own-risk';
import { resolveAndInstantiateESLint } from './eslint-utils';

describe('eslint-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the ESLint instance with the proper parameters', async () => {
    await resolveAndInstantiateESLint('./.eslintrc.json', {
      fix: true,
      cache: true,
      cacheLocation: '/root/cache',
      cacheStrategy: 'content',
    } as any);

    expect(ESLint).toHaveBeenCalledWith({
      overrideConfigFile: './.eslintrc.json',
      fix: true,
      cache: true,
      cacheLocation: '/root/cache',
      cacheStrategy: 'content',
      ignorePath: undefined,
      useEslintrc: true,
      errorOnUnmatchedPattern: false,
      rulePaths: [],
    });
  });

  it('should create the ESLint instance with the proper parameters', async () => {
    await resolveAndInstantiateESLint(undefined, {
      fix: true,
      cache: true,
      cacheLocation: '/root/cache',
      cacheStrategy: 'content',
    } as any);

    expect(ESLint).toHaveBeenCalledWith({
      overrideConfigFile: undefined,
      fix: true,
      cache: true,
      cacheLocation: '/root/cache',
      cacheStrategy: 'content',
      ignorePath: undefined,
      useEslintrc: true,
      errorOnUnmatchedPattern: false,
      rulePaths: [],
    });
  });

  describe('noEslintrc', () => {
    it('should create the ESLint instance with "useEslintrc" set to false', async () => {
      await resolveAndInstantiateESLint(undefined, {
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        noEslintrc: true,
      } as any);

      expect(ESLint).toHaveBeenCalledWith({
        overrideConfigFile: undefined,
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        ignorePath: undefined,
        useEslintrc: false,
        errorOnUnmatchedPattern: false,
        rulePaths: [],
      });
    });
  });

  describe('rulesdir', () => {
    it('should create the ESLint instance with "rulePaths" set to the given value for rulesdir', async () => {
      const extraRuleDirectories = ['./some-rules', '../some-more-rules'];
      await resolveAndInstantiateESLint(undefined, {
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        rulesdir: extraRuleDirectories,
      } as any);

      expect(ESLint).toHaveBeenCalledWith({
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        ignorePath: undefined,
        useEslintrc: true,
        errorOnUnmatchedPattern: false,
        rulePaths: extraRuleDirectories,
      });
    });
  });

  describe('resolvePluginsRelativeTo', () => {
    it('should create the ESLint instance with "resolvePluginsRelativeTo" set to the given value for resolvePluginsRelativeTo', async () => {
      await resolveAndInstantiateESLint(undefined, {
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        resolvePluginsRelativeTo: './some-path',
      } as any);

      expect(ESLint).toHaveBeenCalledWith({
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        ignorePath: undefined,
        useEslintrc: true,
        errorOnUnmatchedPattern: false,
        rulePaths: [],
        resolvePluginsRelativeTo: './some-path',
      });
    });
  });

  describe('reportUnusedDisableDirectives', () => {
    it('should create the ESLint instance with "reportUnusedDisableDirectives" set to the given value for reportUnusedDisableDirectives', async () => {
      await resolveAndInstantiateESLint(undefined, {
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        reportUnusedDisableDirectives: 'warn',
      } as any);

      expect(ESLint).toHaveBeenCalledWith({
        fix: true,
        cache: true,
        cacheLocation: '/root/cache',
        cacheStrategy: 'content',
        ignorePath: undefined,
        useEslintrc: true,
        errorOnUnmatchedPattern: false,
        rulePaths: [],
        reportUnusedDisableDirectives: 'warn',
      });
    });
  });

  describe('ESLint Flat Config', () => {
    it('should not throw if an eslint.config.js file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.js', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should not throw if an eslint.config.mjs file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.mjs', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should not throw if an eslint.config.cjs file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.cjs', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should not throw if an eslint.config.ts file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.ts', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should not throw if an eslint.config.mts file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.mts', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should not throw if an eslint.config.cts file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./eslint.config.cts', {} as any, true),
      ).resolves.not.toThrow();
    });

    it('should throw if an eslintrc file is used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint('./.eslintrc.json', {} as any, true),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"When using the new Flat Config with ESLint, all configs must be named eslint.config.js or eslint.config.mjs or eslint.config.cjs or eslint.config.ts or eslint.config.mts or eslint.config.cts, and .eslintrc files may not be used. See https://eslint.org/docs/latest/use/configure/configuration-files"`,
      );
    });

    it('should throw if invalid options are used with ESLint Flat Config', async () => {
      await expect(
        resolveAndInstantiateESLint(
          undefined,
          {
            useEslintrc: false,
          } as any,
          true,
        ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"For Flat Config, the \`useEslintrc\` option is not applicable. See https://eslint.org/docs/latest/use/configure/configuration-files-new"`,
      );

      await expect(
        resolveAndInstantiateESLint(
          undefined,
          {
            resolvePluginsRelativeTo: './some-path',
          } as any,
          true,
        ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"For Flat Config, ESLint removed \`resolvePluginsRelativeTo\` and so it is not supported as an option. See https://eslint.org/docs/latest/use/configure/configuration-files-new"`,
      );

      await expect(
        resolveAndInstantiateESLint(
          undefined,
          {
            ignorePath: './some-path',
          } as any,
          true,
        ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"For Flat Config, ESLint removed \`ignorePath\` and so it is not supported as an option. See https://eslint.org/docs/latest/use/configure/configuration-files-new"`,
      );
    });
  });

  describe('stats option', () => {
    it('should create the ESLint instance with "stats" set to true when using flat config', async () => {
      await resolveAndInstantiateESLint(
        './eslint.config.js',
        {
          stats: true,
        } as any,
        true,
      );
      expect(FlatESLint).toHaveBeenCalledWith({
        cache: false,
        cacheLocation: undefined,
        cacheStrategy: undefined,
        errorOnUnmatchedPattern: false,
        fix: false,
        overrideConfigFile: './eslint.config.js',
        stats: true,
      });
    });

    it('should throw when "stats" is used with eslintrc config', async () => {
      await expect(
        resolveAndInstantiateESLint(
          './.eslintrc.json',
          { stats: true } as any,
          false,
        ),
      ).rejects.toThrow('The --stats option requires ESLint Flat Config');
    });
  });
});
