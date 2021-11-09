import EventEmitter from 'events';
import path from 'path';
import { noop } from 'lodash';
import semver from 'semver';
import { Logger, GeneratorCore, ILogger } from '@modern-js/codesmith';
import { Solution, InputConfigVersionMap } from '@modern-js/generator-common';
import { Schema } from '@modern-js/easy-form-core';
import { FileApi } from '@/apis';
import { PluginContextMethod, PluginContext } from '@/context';
import { loadPlugin } from '@/utils';

interface Plugin {
  name?: string;
  version?: string;
  isLocal?: boolean;
  model?: ((ctx: PluginContextMethod, logger: ILogger) => void) | null;
  modelPath: string;
  context: PluginContext;
}

export interface PluginInfo {
  key: string;
  name: string;
  base: string;
  inputConfig: Record<string, unknown>;
  inputDefaultValue: Record<string, unknown>;
  questions: Schema[];
  commitMessage: string;
}

export class GeneratorPlugin {
  private readonly logger: ILogger;

  private readonly event?: EventEmitter;

  private pluginMap: Record<string, Plugin> = {};

  constructor(logger?: ILogger, event?: EventEmitter) {
    this.logger = logger || new Logger();
    this.event = event;

    if (event) {
      event.on('forged', this.handleForged.bind(this));
    }
  }

  public async setup(plugins: string[], registry?: string) {
    await this.loadPlugins(plugins, registry);
    this.prepare();
  }

  public getInfo() {
    return Object.keys(this.pluginMap).map(plugin => {
      const { context } = this.pluginMap[plugin];
      return {
        ...context.solution,
        inputConfig: this.getInputConfig(context),
        inputDefaultValue: context.inputDefaultValue,
        questions: context.questions,
        commitMessage: context.gitCommitMessage,
      };
    });
  }

  /**
   * After base generator run succes, triger handleForged function to handle generator plugin
   * @param generatorName current base generator. when create project, maybe run many generator, need to handle correct generator
   * @param basePath current project root path
   * @param inputData current use input, include generator input and generator plugin input
   * @param projectPath subproject path
   * @param generatorCore generator core
   */
  // eslint-disable-next-line max-params
  public async handleForged(
    generatorName: string,
    basePath: string,
    inputData: Record<string, any>,
    projectPath: string,
    generatorCore: GeneratorCore,
  ) {
    const { projectType } = inputData;
    const pluginFileApi = new FileApi(path.join(basePath, projectPath));
    if (generatorName === Solution.Monorepo) {
      // get plugin base generator, if monorepo, run plugin; or not add plugin to new command
    } else {
      // run plugin
    }
    noop(generatorCore);
    noop(projectType);
    noop(pluginFileApi);
  }

  private async loadPlugins(plugins: string[], registry?: string) {
    await Promise.all(
      plugins.map(async plugin => {
        this.pluginMap[plugin] = await loadPlugin(
          plugin,
          this.logger,
          registry,
        );
      }),
    );
  }

  private prepare() {
    Object.keys(this.pluginMap).forEach(name => {
      const plugin = this.pluginMap[name];
      if (plugin.model) {
        plugin.model(plugin.context.context, this.logger);
        delete this.pluginMap[name];
        this.pluginMap[plugin.context.solution.key] = plugin;
      }
    });
  }

  private getInputConfig(context: PluginContext) {
    // eslint-disable-next-line prefer-const
    let { inputConfig, apiVersion } = context;
    Object.keys(InputConfigVersionMap).forEach(version => {
      if (semver.lt(apiVersion, version)) {
        inputConfig = {
          ...(InputConfigVersionMap[version] || {}),
          ...inputConfig,
        };
      }
    });
    return inputConfig;
  }
}
