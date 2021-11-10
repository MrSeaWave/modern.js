import { Schema } from '@modern-js/easy-form-core';
import {
  Language,
  LanguageSchema,
  PackageManager,
  PackageManagerSchema,
  PackageNameSchema,
  PackagePathSchema,
  Solution,
  SolutionText,
} from '@/common';
import { i18n, localeKeys } from '@/locale';

const SolutionKeySchema: Schema = {
  key: 'solutionKey',
  type: ['string'],
  label: () => i18n.t(localeKeys.plugin.solutionKey.self),
  validate: (value: string) => {
    if (!value) {
      return {
        success: false,
        message: i18n.t(localeKeys.plugin.solutionKey.no_empty),
      };
    }
    return {
      success: true,
    };
  },
};

const SolutionNameSchema: Schema = {
  key: 'solutionName',
  type: ['string'],
  label: () => i18n.t(localeKeys.plugin.solutionName.self),
  state: {
    value: {
      effectedByFields: ['solutionKey'],
      action: (data: Record<string, any>) => `${data.solutionKey || ''}`,
    },
  },
  validate: (value: string) => {
    if (!value) {
      return {
        success: false,
        message: i18n.t(localeKeys.plugin.solutionName.no_empty),
      };
    }
    return {
      success: true,
    };
  },
};

const BaseSolutionSchema: Schema = {
  key: 'baseSolution',
  type: ['string'],
  mutualExclusion: true,
  label: () => i18n.t(localeKeys.plugin.baseSolution),
  items: Object.values(Solution).map(solution => ({
    key: solution,
    label: SolutionText[solution],
  })),
};
const GeneratorPluginSchemaMap = {
  packageName: PackageNameSchema,
  packagePath: PackagePathSchema,
  solutionKey: SolutionKeySchema,
  solutionName: SolutionNameSchema,
  baseSolution: BaseSolutionSchema,
  PackageManager: PackageManagerSchema,
  language: LanguageSchema,
};

export const GeneratorPluginSchema: Schema = {
  key: 'generator-plugin-generator',
  isObject: true,
  items: Object.values(GeneratorPluginSchemaMap),
};

export const GeneratorPluginDefaultConfig = {
  packageManager: PackageManager.Pnpm,
  language: Language.TS,
  baseSolution: Solution.MWA,
};
