import path from 'path';
import os from 'os';
import { fs, logger } from '@modern-js/utils';
import {
  createPlugin,
  useAppContext,
  useResolvedConfigContext,
} from '@modern-js/core';
import AliyunConfig from '@alicloud/fun/lib/commands/config';
import { load } from 'js-yaml';
import OSS from 'ali-oss';
import walk from 'walk';
import inquirer from 'inquirer';

type AliYunConfigYaml = {
  access_key_id: string;
  access_key_secret: string;
};

type DeployConfig = {
  oss: {
    // the directory which to upload to OSS under dist
    uploadDir: string;
    // the prefixes uploaded to OSS
    prefix: string;
  };
};

const cacheDir = '.modern-oss';

export default createPlugin(async () => ({
  validateSchema() {
    return {
      target: 'deploy.oss',
      schema: {
        type: 'object',
        patternProperties: {
          uploadDir: {
            type: 'string',
          },
          prefix: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    };
  },
  async beforeDeploy() {
    console.info('');
    logger.info('Uploading resource to OSS...');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { appDirectory, distDirectory } = useAppContext();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const userConfig = useResolvedConfigContext();
    const { oss } = userConfig.deploy as DeployConfig;
    const { uploadDir = 'static', prefix = '' } = oss || {};

    const profPath = path.join(os.homedir(), '.fcli/config.yaml');
    const isExists = fs.existsSync(profPath);
    if (!isExists) {
      await AliyunConfig();
    }

    const { bucket, endpoint } = await getBucketInfo(appDirectory);

    const config = fs.readFileSync(profPath, 'utf-8');
    const { access_key_id: accessKeyId, access_key_secret: accessKeySecret } =
      load(config) as AliYunConfigYaml;

    const ossClient = new OSS({
      accessKeyId,
      accessKeySecret,
      bucket,
      endpoint,
    });

    const uploadRoot = path.join(distDirectory, uploadDir);
    const fl: string[] = [];
    walk.walkSync(uploadRoot, {
      listeners: {
        file: (root, stats, next) => {
          fl.push(path.join(root, stats.name));
          next();
        },
      },
    });

    const uploadPromise = fl.map(filepath => {
      const uploadPath = path.relative(distDirectory, filepath);
      return (
        ossClient
          .put(path.join(prefix, uploadPath), filepath)
          // eslint-disable-next-line promise/prefer-await-to-then
          .then(() => {
            logger.info(`Upload ${uploadPath} success`);
          })
      );
    });

    await Promise.all(uploadPromise);
    logger.info('Upload files to OSS success');
  },
}));

const getBucketInfo = async (pwd: string) => {
  const cachePath = path.join(
    pwd,
    `node_modules/.cache/${cacheDir}/bucket.json`,
  );
  const cacheExist = fs.existsSync(cachePath);
  const cacheInfo = cacheExist ? fs.readJSONSync(cachePath) : {};

  const { bucket, endpoint } = await inquirer.prompt([
    {
      name: 'bucket',
      message: 'Bucket Name',
      type: 'input',
      default: cacheInfo.bucket,
      validate(ans: string) {
        return Boolean(ans);
      },
    },
    {
      name: 'endpoint',
      message: 'Endpoint',
      type: 'input',
      default: cacheInfo.endpoint,
      validate(ans: string) {
        return Boolean(ans);
      },
    },
  ]);

  cacheInfo.bucket = bucket;
  cacheInfo.endpoint = endpoint;
  if (!cacheExist) {
    fs.createFileSync(cachePath);
  }
  fs.writeJSONSync(cachePath, cacheInfo);
  return cacheInfo;
};
