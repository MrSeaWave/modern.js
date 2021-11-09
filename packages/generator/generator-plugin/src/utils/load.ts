import path from 'path';
import {
  downloadPackage,
  getPackageInfo,
  ILogger,
  nodeRequire,
} from '@modern-js/codesmith';
import { requireModuleWithVm } from './vm';
import { PluginContext } from '@/context';

const getPluginFromLocalPath = (localPath: string) => {
  const modelPath = localPath;
  const pkgInfo = nodeRequire(`${modelPath}/package.json`);
  const pluginName = pkgInfo.name;
  const pluginVersion = pkgInfo.version;
  return {
    name: pluginName,
    version: pluginVersion,
    model: requireModuleWithVm(modelPath),
    modelPath,
    context: new PluginContext(),
  };
};

const loadLocalPlugin = (plugin: string, logger: ILogger) => {
  if (!path.isAbsolute(plugin)) {
    return Promise.reject(new Error('only support absolute local path'));
  }
  logger.debug('[loadPlugin] plugin is local package');
  return Promise.resolve(getPluginFromLocalPath(plugin));
};

const loadRemotePlugin = async (
  plugin: string,
  logger: ILogger,
  registry?: string,
) => {
  logger.debug('[loadPlugin] plugin is remote package');
  const { name, version } = getPackageInfo(plugin);
  const localPath = await downloadPackage(name, version, {
    registryUrl: registry,
    install: true,
  });
  return Promise.resolve(getPluginFromLocalPath(localPath));
};

export const loadPlugin = async (
  plugin: string,
  logger: ILogger,
  registry?: string,
) => {
  if (path.isAbsolute(plugin)) {
    return loadLocalPlugin(plugin, logger);
  }
  return loadRemotePlugin(plugin, logger, registry);
};
