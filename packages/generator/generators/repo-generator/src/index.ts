import path from 'path';
import { merge } from 'lodash';
import { GeneratorContext, GeneratorCore } from '@modern-js/codesmith';
import { AppAPI } from '@modern-js/codesmith-api-app';
import { GeneratorPlugin, PluginInfo } from '@modern-js/generator-plugin';
import {
  i18n,
  SolutionSchema,
  SolutionGenerator,
  Solution,
  SolutionDefualtConfig,
} from '@modern-js/generator-common';

const getGeneratorPath = (generator: string, distTag: string) => {
  if (process.env.CODESMITH_ENV === 'development') {
    return path.dirname(require.resolve(generator));
  } else if (distTag) {
    return `${generator}@${distTag}`;
  }
  return generator;
};

const mergeDefaultConfig = (context: GeneratorContext) => {
  const { solution } = context.config;

  if (solution) {
    merge(SolutionDefualtConfig[solution as Solution], context.config);
  }
};

const initialPlugin = async (
  context: GeneratorContext,
  generator: GeneratorCore,
) => {
  const { plugins } = context.config;
  if (plugins.length > 0) {
    const generatorPlugin = new GeneratorPlugin(
      generator.logger,
      generator.event,
    );

    await generatorPlugin.setup(plugins);
    return generatorPlugin.getInfo();
  }
  return [];
};

const handleTemplateFile = async (
  context: GeneratorContext,
  generator: GeneratorCore,
  appApi: AppAPI,
  plugins: PluginInfo[],
) => {
  const { solution } = await appApi.getInputBySchema(SolutionSchema, {
    ...context.config,
    plugins,
  });

  if (!solution) {
    generator.logger.error('solution is not valid ');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  const plugin = plugins.find(p => p.key === solution);

  if (!plugin && !SolutionGenerator[solution as Solution]) {
    generator.logger.error('solution is not valid ');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  if (plugin) {
    merge(context.config, plugin.inputConfig[plugin.key]);
    for (const schema of plugin.questions) {
      const pluginResult = await appApi.getInputBySchema(
        schema,
        context.config,
        undefined,
        plugin.inputDefaultValue,
      );
      merge(context.data, pluginResult);
    }
  }

  await appApi.runSubGenerator(
    getGeneratorPath(
      SolutionGenerator[
        plugin ? (plugin.base as Solution) : (solution as Solution)
      ],
      context.config.distTag,
    ),
    undefined,
    {
      ...context.config,
      hasPlugin: Boolean(plugin),
      inputDefaultValue: plugin?.inputDefaultValue,
      gitCommitMessage:
        plugin?.commitMessage || context.config.gitCommitMessage,
    },
  );
};

export default async (context: GeneratorContext, generator: GeneratorCore) => {
  const appApi = new AppAPI(context, generator);

  const { locale } = context.config;
  i18n.changeLanguage({ locale });
  appApi.i18n.changeLanguage({ locale });

  if (!(await appApi.checkEnvironment())) {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  generator.logger.debug(`start run @modern-js/repo-generator`);
  generator.logger.debug(`context=${JSON.stringify(context)}`);
  generator.logger.debug(`context.data=${JSON.stringify(context.data)}`);

  mergeDefaultConfig(context);

  const plugins = await initialPlugin(context, generator);

  try {
    await handleTemplateFile(context, generator, appApi, plugins);
  } catch (e) {
    generator.logger.error(e);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  generator.logger.debug(`forge @modern-js/repo-generator succeed `);
};
