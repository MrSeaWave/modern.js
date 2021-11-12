import path from 'path';
import os from 'os';
import cp from 'child_process';
import { fs, getPackageManager, logger } from '@modern-js/utils';
import { createPlugin, useAppContext } from '@modern-js/core';
import AliyunConfig from '@alicloud/fun/lib/commands/config';
import { dump } from 'js-yaml';
import { entry, spec } from './generator';

export default createPlugin(() => ({
  // eslint-disable-next-line max-statements
  async afterDeploy() {
    console.info('');
    logger.info('Deploying application to Aliyun FC...');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { appDirectory, distDirectory } = useAppContext();

    // create upload dir
    const publishDir = path.join(os.tmpdir(), '.modern-tencent-serverless');
    if (!fs.existsSync(publishDir)) {
      logger.info(`Creating a tmp upload directory: ${publishDir}`);
      fs.mkdir(publishDir);
    } else {
      logger.info(
        `The tmp upload directory is already exist, empty: ${publishDir}`,
      );
      fs.emptyDirSync(publishDir);
    }

    // // create template.yml
    logger.info('Creating template.yml');
    const pkgPath = path.join(appDirectory, 'package.json');
    const { name, dependencies } = fs.readJSONSync(pkgPath);
    const jsonspec = spec({
      serviceName: `${name}-service`,
      funcName: `${name}-fun`,
    });
    const yamlStr = dump(jsonspec);
    fs.writeFileSync(path.join(publishDir, 'template.yml'), yamlStr);

    // app.js
    logger.info('Creating index.js');
    const passedConfig = {
      output: {
        path: 'dist',
      },
    };
    const appEntry = entry({ config: passedConfig });
    fs.writeFileSync(path.join(publishDir, 'index.js'), appEntry);

    // package.json
    logger.info('Creating new package.json');
    const requiredDependencies = {
      ...dependencies,
      '@webserverless/fc-express': '^1',
      '@modern-js/server': '1.1.1-canary.3',
      express: '^4',
    };
    const pkg = {
      dependencies: requiredDependencies,
    };
    fs.writeJSONSync(path.join(publishDir, 'package.json'), pkg, {
      spaces: 2,
    });

    // copy files
    logger.info('Copy file from dist directory');
    fs.copySync(distDirectory, path.join(publishDir, 'dist'));

    // install deps
    const manager = getPackageManager(appDirectory);
    logger.info(`Install dependencies in publish dir, use ${manager}`);

    cp.execSync(`${manager} install`, {
      cwd: publishDir,
    });

    // deploy alicloud
    const profPath = path.join(os.homedir(), '.fcli/config.yaml');
    const isExists = fs.existsSync(profPath);
    if (!isExists) {
      await AliyunConfig();
    }

    logger.info(`deploying to Aliyun`);
    const deployBin = path.join(__dirname, './deploy.js');
    cp.execSync(`node ${deployBin} deploy`, {
      cwd: publishDir,
      stdio: 'inherit',
    });
  },
}));
