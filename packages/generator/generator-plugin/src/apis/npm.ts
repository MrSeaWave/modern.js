import { GeneratorCore } from '@modern-js/codesmith';
import { NpmAPI } from '@modern-js/codesmith-api-npm';
import { getPackageVersion } from '@modern-js/generator-utils';

export interface PluginNpmMethod {
  npmInstall: (cwd?: string | undefined) => Promise<unknown>;
  yarnInstall: (cwd?: string | undefined) => Promise<unknown>;
  pnpmInstall: (cwd?: string | undefined) => Promise<unknown>;
}

export interface PluginNpmGetMethod {
  getPackageVersion: (
    packageName: string,
    registry?: string,
  ) => Promise<string>;
}
export class PluginNpmAPI {
  private readonly npmAPI: NpmAPI;

  constructor(generatorCore: GeneratorCore) {
    this.npmAPI = new NpmAPI(generatorCore);
  }

  private async getPackageVersion(packageName: string, registry?: string) {
    return getPackageVersion(packageName, registry);
  }

  get getMethod(): PluginNpmGetMethod {
    return {
      getPackageVersion: this.getPackageVersion.bind(this),
    };
  }

  get method(): PluginNpmMethod {
    return {
      npmInstall: this.npmAPI.npmInstall.bind(this.npmAPI),
      yarnInstall: this.npmAPI.yarnInstall.bind(this.npmAPI),
      pnpmInstall: this.npmAPI.pnpmInstall.bind(this.npmAPI),
    };
  }
}
