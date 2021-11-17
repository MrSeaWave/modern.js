import path from 'path';
import { getPackageVersion } from '@modern-js/generator-utils';
import { GeneratorContext, GeneratorCore } from '@modern-js/codesmith';
import { AppAPI } from '@modern-js/codesmith-api-app';
import { JsonAPI } from '@modern-js/codesmith-api-json';
import { i18n, CloudTypeSchema } from '@modern-js/generator-common';

const handleTemplateFile = async (
  context: GeneratorContext,
  generator: GeneratorCore,
  appApi: AppAPI,
) => {
  const jsonAPI = new JsonAPI(generator);

  const ans = await appApi.getInputBySchema(CloudTypeSchema, context.config);

  const appDir = context.materials.default.basePath;
  const { deployType } = ans;

  const updatePakcage = async (dep: string) => {
    const updateInfo = {
      [`devDependencies.${dep}`]: `^${await getPackageVersion(dep)}`,
    };

    await jsonAPI.update(
      context.materials.default.get(path.join(appDir, 'package.json')),
      {
        query: {},
        update: {
          $set: {
            ...updateInfo,
          },
        },
      },
    );
  };

  const pluginName = `@modern-js/plugin-${deployType as string}`;
  await updatePakcage(pluginName);
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

  generator.logger.debug(`start run @modern-js/cloud-deploy-generator`);
  generator.logger.debug(`context=${JSON.stringify(context)}`);
  generator.logger.debug(`context.data=${JSON.stringify(context.data)}`);

  await handleTemplateFile(context, generator, appApi);

  await appApi.runInstall();

  generator.logger.debug(`forge @modern-js/cloud-deploy-generator succeed `);
};
