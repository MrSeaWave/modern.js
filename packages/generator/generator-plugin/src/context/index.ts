import { Schema } from '@modern-js/easy-form-core';
import { PluginNpmMethod, PluginNpmGetMethod } from '@/apis/npm';
import { PluginGitMethod } from '@/apis/git';
import { PluginFileMethod } from '@/apis/file';

type BaseSolution = 'mwa' | 'module' | 'monorepo';

export interface SolutionInfo {
  key: string;
  name: string;
  base: BaseSolution;
}

export enum LifeCycle {
  OnForged = 'onForged',
  OnPluginForged = 'onPluginForged',
}

export type ForgedApi = PluginFileMethod & { npm: PluginNpmGetMethod };

type ForgedFunc = (api: ForgedApi, inputData: Record<string, unknown>) => void;

export type PluginForgedApi = {
  npm: PluginNpmMethod;
  git: PluginGitMethod;
};

type PluginForgedFunc = (
  api: PluginForgedApi,
  inputData: Record<string, unknown>,
) => Promise<void>;

export interface PluginContextMethod {
  setSolutionInfo: (params: SolutionInfo) => void;
  setApiVersion: (apiVersion: string) => void;
  setInputConfig: (inputData: Record<string, unknown>) => void;
  setInputDefaultValue: (inputDefaultValue: Record<string, unknown>) => void;
  setGitCommitMessage: (message: string) => void;
  addInput: (schema: Schema) => void;
  onForged: (func: ForgedFunc) => void;
  onPluginForged: (func: PluginForgedFunc) => void;
}

export class PluginContext {
  apiVersion: string = '1.0.0';

  solution: SolutionInfo = {
    name: '',
    key: '',
    base: 'mwa',
  };

  inputConfig: Record<string, unknown> = {};

  inputDefaultValue: Record<string, unknown> = {};

  questions: Schema[] = [];

  gitCommitMessage: string = '';

  lifeCycleFuncMap: Record<LifeCycle, unknown> = {
    [LifeCycle.OnForged]: () => {
      /* empty */
    },
    [LifeCycle.OnPluginForged]: () => {
      /* empty */
    },
  };

  get context(): PluginContextMethod {
    return {
      setApiVersion: this.setApiVersion.bind(this),
      setSolutionInfo: this.setSolutionInfo.bind(this),
      setInputConfig: this.setInputConfig.bind(this),
      setInputDefaultValue: this.setInputDefaultValue.bind(this),
      setGitCommitMessage: this.setGitCommitMessage.bind(this),
      addInput: this.addInput.bind(this),
      onForged: this.onForged.bind(this),
      onPluginForged: this.onPluginForged.bind(this),
    };
  }

  private setApiVersion(apiVersion: string) {
    this.apiVersion = apiVersion;
  }

  private setSolutionInfo(solution: SolutionInfo) {
    this.solution = solution;
  }

  private setInputConfig(inputConfig: Record<string, unknown>) {
    this.inputConfig = inputConfig;
  }

  private setInputDefaultValue(inputDefaultValue: Record<string, unknown>) {
    this.inputDefaultValue = inputDefaultValue;
  }

  private setGitCommitMessage(message: string) {
    this.gitCommitMessage = message;
  }

  private addInput(schema: Schema) {
    if (!schema.isObject) {
      this.questions.push({
        key: `plugin_schema_${Math.random()}`,
        isObject: true,
        items: [schema],
      });
    } else {
      this.questions.push(schema);
    }
  }

  private onForged(func: ForgedFunc) {
    this.lifeCycleFuncMap[LifeCycle.OnForged] = func;
  }

  private onPluginForged(func: PluginForgedFunc) {
    this.lifeCycleFuncMap[LifeCycle.OnPluginForged] = func;
  }
}
