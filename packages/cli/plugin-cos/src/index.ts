import path from 'path';
import { fs, logger } from '@modern-js/utils';
import {
  createPlugin,
  useAppContext,
  useResolvedConfigContext,
} from '@modern-js/core';
import COS from 'cos-nodejs-sdk-v5';
import walk from 'walk';
import inquirer from 'inquirer';
import mime from 'mime-types';

type DeployConfig = {
  cos: {
    // the directory which to upload to OSS under dist
    uploadDir: string;
    // the prefixes uploaded to OSS
    prefix: string;
  };
};

const cacheDir = '.modern-cos';

export default createPlugin(() => ({
  validateSchema() {
    return {
      target: 'deploy.cos',
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
    logger.info('Uploading resource to COS...');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { appDirectory, distDirectory } = useAppContext();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const userConfig = useResolvedConfigContext();
    const { cos } = userConfig.deploy as DeployConfig;
    const { uploadDir = 'static', prefix = '' } = cos || {};

    const { secrectId, secretKey, bucket, region } = await getCosInfo(
      appDirectory,
    );

    const cosClient = new COS({
      SecretId: secrectId,
      SecretKey: secretKey,
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
      return new Promise((resolve, reject) => {
        cosClient.uploadFile(
          {
            Bucket: bucket,
            Region: region,
            Key: path.join(prefix, uploadPath),
            ContentType:
              mime.contentType(path.basename(uploadPath)) ||
              'text/plain; charset=utf-8',
            ContentDisposition: 'inline',
            FilePath: filepath,
            onFileFinish() {
              logger.info(`Upload ${uploadPath} success`);
            },
          },
          (err, data) => {
            if (err) {
              return reject(err);
            }
            return resolve(data);
          },
        );
      });
    });

    await Promise.all(uploadPromise);
    logger.info('Upload files to COS success');
  },
}));

const getCosInfo = async (pwd: string) => {
  const cachePath = path.join(pwd, `node_modules/.cache/${cacheDir}/cos.json`);
  const cacheExist = fs.existsSync(cachePath);
  const cacheInfo = cacheExist ? fs.readJSONSync(cachePath) : {};

  const question = [
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
      name: 'region',
      message: 'Region',
      type: 'input',
      default: cacheInfo.region,
      validate(ans: string) {
        return Boolean(ans);
      },
    },
  ];

  if (!cacheInfo.secretKey) {
    question.unshift({
      name: 'secretKey',
      message: 'Secret Key',
      type: 'input',
      default: undefined,
      validate(ans: string) {
        return Boolean(ans);
      },
    });
  }

  if (!cacheInfo.secrectId) {
    question.unshift({
      name: 'secrectId',
      message: 'Secret Id',
      type: 'input',
      default: undefined,
      validate(ans: string) {
        return Boolean(ans);
      },
    });
  }

  const { secrectId, secretKey, bucket, region } = await inquirer.prompt(
    question,
  );

  if (secrectId) {
    cacheInfo.secrectId = secrectId;
  }
  if (secretKey) {
    cacheInfo.secretKey = secretKey;
  }
  cacheInfo.bucket = bucket;
  cacheInfo.region = region;
  if (!cacheExist) {
    fs.createFileSync(cachePath);
  }
  fs.writeJSONSync(cachePath, cacheInfo);
  return cacheInfo;
};
