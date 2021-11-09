import { Schema } from '@modern-js/easy-form-core';
import { i18n, localeKeys } from '../locale';

export enum Solution {
  MWA = 'mwa',
  Module = 'module',
  Monorepo = 'monorepo',
}

export enum SubSolution {
  MWA = 'mwa',
  MWATest = 'mwa_test',
  Module = 'module',
  InnerModule = 'inner_module',
}

export const SolutionText: Record<Solution, () => string> = {
  [Solution.MWA]: () => i18n.t(localeKeys.solution.mwa),
  [Solution.Module]: () => i18n.t(localeKeys.solution.module),
  [Solution.Monorepo]: () => i18n.t(localeKeys.solution.monorepo),
};

export const SubSolutionText: Record<SubSolution, () => string> = {
  [SubSolution.MWA]: () => i18n.t(localeKeys.sub_solution.mwa),
  [SubSolution.MWATest]: () => i18n.t(localeKeys.sub_solution.mwa_test),
  [SubSolution.Module]: () => i18n.t(localeKeys.sub_solution.module),
  [SubSolution.InnerModule]: () => i18n.t(localeKeys.sub_solution.inner_module),
};

export const SolutionSchema: Schema = {
  key: 'solution_schema',
  isObject: true,
  items: [
    {
      key: 'solution',
      label: () => i18n.t(localeKeys.solution.self),
      type: ['string'],
      mutualExclusion: true,
      items: (
        _data: Record<string, any>,
        extra: {
          plugins?: Array<{ key: string; name: string }>;
          solutions?: string[];
        } = {},
      ) => {
        const { plugins = [], solutions } = extra;
        if (solutions) {
          return solutions
            .map(solution => {
              const plugin = plugins.find(p => p.key === solution);
              if (plugin) {
                return {
                  key: plugin.key,
                  label: plugin.name,
                };
              }
              if (Object.values(Solution).includes(solution as Solution)) {
                return {
                  key: solution,
                  label: SolutionText[solution as Solution],
                };
              }
              return null;
            })
            .filter(solution => Boolean(solution)) as Schema[];
        }
        return [
          ...plugins.map(plugin => ({
            key: plugin.key,
            label: plugin.name,
          })),
          ...Object.values(Solution).map(solution => ({
            key: solution,
            label: SolutionText[solution],
          })),
        ];
      },
    },
  ],
};

export const SubSolutionSchema: Schema = {
  key: 'sub_solution_schema',
  isObject: true,
  items: [
    {
      key: 'solution',
      label: () => i18n.t(localeKeys.sub_solution.self),
      type: ['string'],
      mutualExclusion: true,
      items: (
        _data: Record<string, any>,
        extra: {
          plugins?: Array<{ key: string; name: string }>;
          solutions?: string[];
        } = {},
      ) => {
        const { plugins = [], solutions } = extra;
        if (solutions) {
          return solutions
            .map(solution => {
              const plugin = plugins.find(p => p.key === solution);
              if (plugin) {
                return {
                  key: plugin.key,
                  label: plugin.name,
                };
              }
              if (
                Object.values(SubSolution).includes(solution as SubSolution)
              ) {
                return {
                  key: solution,
                  label: SubSolutionText[solution as SubSolution],
                };
              }
              return null;
            })
            .filter(solution => Boolean(solution)) as Schema[];
        }
        return [
          ...plugins.map(plugin => ({
            key: plugin.key,
            label: plugin.name,
          })),
          ...Object.values(SubSolution).map(solution => ({
            key: solution,
            label: SubSolutionText[solution],
          })),
        ];
      },
    },
  ],
};

export const BaseGenerator = '@modern-js/base-generator';

export const SolutionGenerator: Record<Solution, string> = {
  [Solution.MWA]: '@modern-js/mwa-generator',
  [Solution.Module]: '@modern-js/module-generator',
  [Solution.Monorepo]: '@modern-js/monorepo-generator',
};

export const SubSolutionGenerator: Record<SubSolution, string> = {
  [SubSolution.MWA]: '@modern-js/mwa-generator',
  [SubSolution.MWATest]: '@modern-js/mwa-generator',
  [SubSolution.Module]: '@modern-js/module-generator',
  [SubSolution.InnerModule]: '@modern-js/module-generator',
};

export const ChangesetGenerator = '@modern-js/changeset-generator';
export const DependenceGenerator = '@modern-js/dependence-generator';
export const EntryGenerator = '@modern-js/entry-generator';
export const ElectronGenerator = '@modern-js/electron-generator';
