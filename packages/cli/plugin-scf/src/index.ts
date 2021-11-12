import path from 'path';
import os from 'os';
import cp from 'child_process';
import { fs, getPackageManager, logger } from '@modern-js/utils';
import { createPlugin, useAppContext } from '@modern-js/core';
import { dump } from 'js-yaml';
import inquirer from 'inquirer';
import { entry, spec } from './generator';

const tmpDir = '.modern-tencent-serverless';

export default createPlugin(() => ({
  // eslint-disable-next-line max-statements
  async afterDeploy() {
    console.info('');
    logger.info('Deploying application to Aliyun FC...');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { appDirectory, distDirectory } = useAppContext();
    const cacheEnv = path.join(
      appDirectory,
      `node_modules/.cache/${tmpDir}/.env`,
    );
    const publishDir = path.join(os.tmpdir(), tmpDir);
    const generatedEnv = path.join(publishDir, '.env');
    let env = '';

    // create upload dir
    if (!fs.existsSync(publishDir)) {
      logger.info(`Creating a tmp upload directory: ${publishDir}`);
      fs.mkdir(publishDir);
    } else {
      // use upload dir's .env file first
      if (fs.existsSync(generatedEnv)) {
        env = fs.readFileSync(generatedEnv, 'utf-8');
      }

      logger.info(
        `The tmp upload directory is already exist, empty: ${publishDir}`,
      );
      fs.emptyDirSync(publishDir);
    }

    // find env in cache if not exist
    if (!env && fs.existsSync(cacheEnv)) {
      env = fs.readFileSync(cacheEnv, 'utf-8');
    }

    // create template.yml
    const { region } = await getCacheInfo(appDirectory);

    logger.info('Creating serverless.yml');
    const pkgPath = path.join(appDirectory, 'package.json');
    const { name, dependencies } = fs.readJSONSync(pkgPath);
    const jsonspec = spec({
      serviceName: `${name}-app`,
      funcName: `${name}-fun`,
      region,
    });
    const yamlStr = dump(jsonspec);
    fs.writeFileSync(path.join(publishDir, 'serverless.yml'), yamlStr);

    // app.js
    logger.info('Creating app.js');
    const passedConfig = {
      output: {
        path: 'dist',
      },
    };
    const appEntry = entry({ config: passedConfig });
    fs.writeFileSync(path.join(publishDir, 'app.js'), appEntry);

    // package.json
    logger.info('Creating new package.json');
    const requiredDependencies = {
      ...dependencies,
      '@modern-js/server': '1.1.1-canary.3',
    };
    const pkg = {
      dependencies: requiredDependencies,
      private: true,
    };
    fs.writeJSONSync(path.join(publishDir, 'package.json'), pkg, {
      spaces: 2,
    });

    // copy files
    logger.info('Copy file from dist directory');
    fs.copySync(distDirectory, path.join(publishDir, 'dist'));

    // install deps
    let manager = getPackageManager(appDirectory);
    if (manager === 'pnpm') {
      manager = 'npm';
    }
    logger.info(`Install dependencies in publish dir, use ${manager}`);

    cp.execSync(
      `${manager} install ${manager === 'npm' ? '--loglevel error' : ''}`,
      {
        cwd: publishDir,
      },
    );

    // create .env file
    if (env) {
      fs.writeFileSync(generatedEnv, env);
    }

    // deploy tencent cloud
    const deployBin = path.join(__dirname, './deploy.js');
    cp.execSync(`node ${deployBin} deploy`, {
      cwd: publishDir,
      stdio: 'inherit',
    });

    // record/update the generated .env file
    if (fs.existsSync(generatedEnv)) {
      if (!fs.existsSync(cacheEnv)) {
        fs.createFileSync(cacheEnv);
      }
      fs.copyFileSync(generatedEnv, cacheEnv);
    }
  },
}));

const getCacheInfo = async (pwd: string) => {
  const cachePath = path.join(pwd, `node_modules/.cache/${tmpDir}/cos.json`);
  const cacheExist = fs.existsSync(cachePath);
  const cacheInfo = cacheExist ? fs.readJSONSync(cachePath) : {};

  const question = [
    {
      name: 'region',
      message: 'Region',
      type: 'input',
      default: cacheInfo.region || 'ap-guangzhou',
      validate(ans: string) {
        return Boolean(ans);
      },
    },
  ];

  const { region } = await inquirer.prompt(question);
  cacheInfo.region = region;
  if (!cacheExist) {
    fs.createFileSync(cachePath);
  }
  fs.writeJSONSync(cachePath, cacheInfo);
  return cacheInfo;
};
