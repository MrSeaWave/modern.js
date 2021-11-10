// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
import path from 'path';
import fs from 'fs';
import { ufs } from 'unionfs';
import { Volume } from 'memfs';
import { cloneDeep, isString, merge } from 'lodash';
import { mergeConfig } from '@modern-js/core';
import {
  FileOption,
  AddFileParams,
  AddManyFilesParams,
  AppendFileParams,
} from './fileOption';
import { HandlebarsAPI, SetHelperFun, SetPartialFun } from './handlebars';

type SetModernJSONConfigParams = Record<string, unknown>; // package modernConfig

// type SetModernConfigParams = Record<string, unknown>; // modern.config.js

enum FileAction {
  Add = 'add',
  AddMany = 'add_many',
  Append = 'append',
  RmFile = 'rm_file',
  RmDir = 'rm_dir',
}
type FileActionOption = (
  | AddFileParams
  | AddManyFilesParams
  | AppendFileParams
) & { type: FileAction };

export interface PluginFileMethod {
  setModernJSONConfig: (params: SetModernJSONConfigParams) => void;
  // setModernConfig: (params: SetModernConfigParams) => void;
  addPkgField: (field: Record<string, any>) => void;
  removePkgField: (field: string | string[]) => void;
  addScripts: (params: Record<string, string>) => void;
  setScripts: (params: Record<string, string>) => void;
  deleteScripts: (scripts: string[]) => void;
  addDevDependencies: (params: Record<string, string>) => void;
  addPeerDependencies: (params: Record<string, string>) => void;
  addDependencies: (params: Record<string, string>) => void;
  setEslintConfigExtends: (params: string[]) => void;
  addEslintIgnore: (params: string[]) => void;
  setTsConfigExtends: (params: string) => void;
  setTsConfigInclude: (params: string[]) => void;
  addTsConfigField: (field: Record<string, any>) => void;
  addVsCodeExtendions: (params: string[]) => void;
  deleteVsCodeExtendions: (params: string[]) => void;
  addFile: (params: AddFileParams) => void;
  addManyFiles: (params: AddManyFilesParams) => void;
  appendFile: (params: AppendFileParams) => void;
  fileExists: (path: string) => boolean;
  readdir: (dirName: string) => string[];
  rmFile: (path: string) => void;
  rmDir: (dirName: string) => void;
  handlebars: {
    setHelp: SetHelperFun;
    setPartial: SetPartialFun;
  };
}
export class PluginFileApi {
  newScript?: string;

  private readonly projectPath: string;

  private readonly handlebarApi: HandlebarsAPI = new HandlebarsAPI();

  private setModernJSONConfigParams?: SetModernJSONConfigParams;

  // private setModernConfigParams?: SetModernConfigParams;

  private readonly pkgFieldToAdd: Record<string, string> = {};

  private pkgFieldToRemove: string[] = [];

  private readonly scripts: Record<string, string> = {};

  private readonly coverScripts: Record<string, string> = {};

  private removeScripts: string[] = [];

  private readonly devDependencies: Record<string, string> = {};

  private readonly dependencies: Record<string, string> = {};

  private readonly peerDependencies: Record<string, string> = {};

  private eslintConfigExtends: string[] = [];

  private eslintIgnore: string[] = [];

  private tsConfigExtends: string = '';

  private tsConfigInclude?: string[];

  private readonly tsConfigToAdd: Record<string, string> = {};

  private vsCodeExtensions: string[] = [];

  private removeVscodeExtensions: string[] = [];

  private readonly fileActions: FileActionOption[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  get method(): PluginFileMethod {
    return {
      setModernJSONConfig: this.setModernJSONConfig.bind(this),
      // setModernConfig: this.setModernConfig.bind(this),
      addPkgField: this.addPkgField.bind(this),
      removePkgField: this.removePkgField.bind(this),
      addScripts: this.addScripts.bind(this),
      setScripts: this.setScripts.bind(this),
      deleteScripts: this.deleteScripts.bind(this),
      addDevDependencies: this.addDevDependencies.bind(this),
      addPeerDependencies: this.addPeerDependencies.bind(this),
      addDependencies: this.addDependencies.bind(this),
      setEslintConfigExtends: this.setEslintConfigExtends.bind(this),
      addEslintIgnore: this.addEslintIgnore.bind(this),
      setTsConfigExtends: this.setTsConfigExtends.bind(this),
      setTsConfigInclude: this.setTsConfigInclude.bind(this),
      addTsConfigField: this.addTsConfigField.bind(this),
      addVsCodeExtendions: this.addVsCodeExtendions.bind(this),
      deleteVsCodeExtendions: this.deleteVscodeExtendions.bind(this),
      addFile: this.addFile.bind(this),
      addManyFiles: this.addManyFiles.bind(this),
      appendFile: this.appendFile.bind(this),
      fileExists: this.fileExists.bind(this),
      readdir: this.readdir.bind(this),
      rmFile: this.rmFile.bind(this),
      rmDir: this.rmDir.bind(this),
      handlebars: {
        setHelp: this.handlebarApi.setHelper,
        setPartial: this.handlebarApi.setPartial,
      },
    };
  }

  public setNewScript(newScript: string) {
    this.newScript = newScript;
  }

  public async getNewScript(root: string) {
    const pkgPath = path.resolve(root, 'package.json');
    const fileOption = new FileOption(fs, this.handlebarApi.renderString);
    const pkgInfo = (await fileOption.fileExists(pkgPath))
      ? JSON.parse((await fileOption.readFile(pkgPath, 'utf8')) as string)
      : {};
    return (pkgInfo.scripts || {}).new || 'modern new';
  }

  // 统一处理注册execute函数
  // eslint-disable-next-line max-statements
  public async execute(root: string, modulePath: string, real: boolean) {
    let fileOption = new FileOption(fs, this.handlebarApi.renderString);
    if (!real) {
      const vol = Volume.fromJSON({});
      ufs.use(fs).use(vol as any);
      fileOption = new FileOption(ufs, this.handlebarApi.renderString);
      fileOption.mkdir(root, { recursive: true });
    }
    const pkgPath = path.resolve(root, 'package.json');
    const pkgInfo = (await fileOption.fileExists(pkgPath))
      ? JSON.parse((await fileOption.readFile(pkgPath, 'utf8')) as string)
      : {};
    const mergeModernJSONConfig = () => {
      const modernConfig = pkgInfo.modernConfig || {};
      if (this.setModernJSONConfigParams) {
        pkgInfo.modernConfig = mergeConfig([
          this.setModernJSONConfigParams,
          modernConfig,
        ]);
      }
    };

    const handleScripts = () => {
      const scripts = pkgInfo.scripts || {};
      if (this.newScript) {
        scripts.new = this.newScript;
      }
      const newScripts = merge(this.scripts, scripts, this.coverScripts);
      const targetScripts: Record<string, string> = {};
      Object.keys(newScripts)
        .filter(script => !this.removeScripts.includes(script))
        .forEach(script => {
          targetScripts[script] = newScripts[script];
        });
      pkgInfo.scripts = targetScripts;
    };

    const addDependencies = () => {
      const dependencies = pkgInfo.dependencies || {};
      const newDependencies = merge(dependencies, this.dependencies);
      if (Object.keys(newDependencies).length > 0) {
        pkgInfo.dependencies = newDependencies;
      }
    };

    const addDevDependencies = () => {
      const devDependencies = pkgInfo.devDependencies || {};
      const newDevDependencies = merge(devDependencies, this.devDependencies);
      if (Object.keys(newDevDependencies).length > 0) {
        pkgInfo.devDependencies = newDevDependencies;
      }
    };

    const addPeerDependencies = () => {
      const peerDependencies = pkgInfo.peerDependencies || {};
      const newPeerDependencies = merge(
        peerDependencies,
        this.peerDependencies,
      );
      if (Object.keys(newPeerDependencies).length > 0) {
        pkgInfo.peerDependencies = newPeerDependencies;
      }
    };

    const setEslintConfigExtends = () => {
      if (this.eslintConfigExtends.length > 0) {
        if (!pkgInfo.eslintConfig) {
          pkgInfo.eslintConfig = {};
        }
        pkgInfo.eslintConfig.extends = this.eslintConfigExtends;
      }
    };

    const setEslintIgnore = () => {
      if (this.eslintIgnore.length > 0) {
        if (!pkgInfo.eslintIgnore) {
          pkgInfo.eslintIgnore = [];
        }
        pkgInfo.eslintIgnore = [...pkgInfo.eslintIgnore, ...this.eslintIgnore];
      }
    };

    const addAndRemovePkgField = () => {
      const NotAllowedOptionFields = [
        'name',
        'version',
        'scripts',
        'engines',
        'husky',
        'commitlint',
        'lint-staged',
        'eslintConfig',
        'workspaces',
        'dependencies',
        'devDependencies',
        'peerDependencies',
      ]; // 不允许操作字段
      Object.keys(this.pkgFieldToAdd)
        .filter(key => !NotAllowedOptionFields.includes(key))
        .forEach(key => {
          pkgInfo[key] = this.pkgFieldToAdd[key];
        });
      this.pkgFieldToRemove
        .filter(key => !NotAllowedOptionFields.includes(key))
        .forEach(key => {
          pkgInfo[key] = undefined;
        });
    };

    const updatePackage = async () => {
      const isExit = await fileOption.fileExists(pkgPath);
      if (isExit) {
        mergeModernJSONConfig();
        handleScripts();
        addDependencies();
        addDevDependencies();
        addPeerDependencies();
        setEslintConfigExtends();
        setEslintIgnore();
        addAndRemovePkgField();
        await fileOption.writeFile(pkgPath, JSON.stringify(pkgInfo, null, 2));
      }
    };

    // const mergeModernConfig = async () => {
    //   if (this.setModernConfigParams) {
    //     const configPath = path.resolve(root, 'modern.config.js');
    //     const content = mergeConfig([this.setModernConfigParams]);
    //     await fileOption.writeFile(configPath, stringify(content));
    //   }
    // };

    const updateTsconfig = async () => {
      const tsConfigPath = path.resolve(root, 'tsconfig.json');
      const tsConfigInfo = (await fileOption.fileExists(tsConfigPath))
        ? JSON.parse(
            (await fileOption.readFile(tsConfigPath, 'utf8')) as string,
          )
        : {};
      if (this.tsConfigExtends) {
        tsConfigInfo.extends = this.tsConfigExtends;
      }
      if (this.tsConfigInclude) {
        tsConfigInfo.include = this.tsConfigInclude;
      }
      if (this.tsConfigToAdd) {
        Object.keys(this.tsConfigToAdd).forEach(field => {
          tsConfigInfo[field] = this.tsConfigToAdd[field];
        });
      }
      await fileOption.writeFile(
        tsConfigPath,
        JSON.stringify(tsConfigInfo, null, 2),
      );
    };

    const updateVscodeExtensions = async () => {
      const extensionsPath = path.resolve(root, '.vscode', 'extensions.json');
      if (!(await fileOption.fileExists(extensionsPath))) {
        return;
      }
      const extensionsInfo = JSON.parse(
        (await fileOption.readFile(extensionsPath, 'utf8')) as string,
      );
      extensionsInfo.recommendations = [
        ...(extensionsInfo.recommendations || []),
        ...this.vsCodeExtensions,
      ].filter(extension => !this.removeVscodeExtensions.includes(extension));
      await fileOption.writeFile(
        extensionsPath,
        JSON.stringify(extensionsInfo, null, 2),
      );
    };

    // package.json
    await updatePackage();

    // // modern.config.js
    // await mergeModernConfig();

    // tsconfig.json
    await updateTsconfig();

    // .vscode/extensions
    await updateVscodeExtensions();

    const templatePath = path.join(modulePath, 'templates');
    // 模板文件
    return Promise.all(
      this.fileActions.map(async action => {
        const actionClone = cloneDeep(action);
        switch (action.type) {
          case FileAction.Add:
            return fileOption.addFile(
              actionClone as AddFileParams,
              root,
              templatePath,
            );
          case FileAction.AddMany:
            return fileOption.addManyFiles(
              actionClone as AddManyFilesParams,
              root,
              templatePath,
            );
          case FileAction.Append:
            return fileOption.appendFile(
              actionClone as AppendFileParams,
              root,
              templatePath,
            );
          case FileAction.RmFile:
            return fileOption.deleteFile(
              (actionClone as { file: string }).file,
              root,
            );
          case FileAction.RmDir:
            return fileOption.deleteDir(
              (actionClone as { file: string }).file,
              root,
            );
          default:
            return Promise.resolve();
        }
      }),
    );
  }

  private setModernJSONConfig(
    setModernJSONConfigParams: SetModernJSONConfigParams,
  ) {
    this.setModernJSONConfigParams = setModernJSONConfigParams;
  }

  // private setModernConfig(setModernConfigParams: SetModernConfigParams) {
  //   this.setModernConfigParams = setModernConfigParams;
  // }

  private addPkgField(field: Record<string, any>) {
    merge(this.pkgFieldToAdd, field);
  }

  private removePkgField(field: string | string[]) {
    if (isString(field)) {
      this.pkgFieldToRemove.push(field);
    } else {
      this.pkgFieldToRemove = [...this.pkgFieldToRemove, ...field];
    }
  }

  private addScripts(scripts: Record<string, string>) {
    merge(this.scripts, scripts);
  }

  private setScripts(scripts: Record<string, string>) {
    merge(this.coverScripts, scripts);
  }

  private deleteScripts(scripts: string[]) {
    this.removeScripts = [...this.removeScripts, ...scripts];
  }

  private addDevDependencies(devDependencies: Record<string, string>) {
    merge(this.devDependencies, devDependencies);
  }

  private addDependencies(dependencies: Record<string, string>) {
    merge(this.dependencies, dependencies);
  }

  private addPeerDependencies(dependencies: Record<string, string>) {
    merge(this.peerDependencies, dependencies);
  }

  private setEslintConfigExtends(params: string[]) {
    this.eslintConfigExtends = [...this.eslintConfigExtends, ...params];
  }

  private addEslintIgnore(params: string[]) {
    this.eslintIgnore = [...this.eslintIgnore, ...params];
  }

  private setTsConfigExtends(params: string) {
    this.tsConfigExtends = params;
  }

  private setTsConfigInclude(params: string[]) {
    this.tsConfigInclude = params;
  }

  private addTsConfigField(field: Record<string, any>) {
    merge(this.tsConfigToAdd, field);
  }

  private addVsCodeExtendions(params: string[]) {
    this.vsCodeExtensions = [...this.vsCodeExtensions, ...params];
  }

  private deleteVscodeExtendions(params: string[]) {
    this.removeVscodeExtensions = [...this.removeVscodeExtensions, ...params];
  }

  private addFile(params: AddFileParams) {
    this.fileActions.push({
      type: FileAction.Add,
      ...params,
    });
  }

  private addManyFiles(params: AddManyFilesParams) {
    this.fileActions.push({
      type: FileAction.AddMany,
      ...params,
    });
  }

  private appendFile(params: AppendFileParams) {
    this.fileActions.push({
      type: FileAction.Append,
      ...params,
    });
  }

  private fileExists(filePath: string) {
    return fs.existsSync(path.join(this.projectPath, filePath));
  }

  private readdir(dirName: string) {
    return fs.readdirSync(path.join(this.projectPath, dirName));
  }

  private rmFile(filePath: string) {
    // 不允许删除文件
    const DisabledDeleteFields = [
      '.idea',
      '.vscode',
      '.editorconfig',
      '.gitignore',
      '.npmrc',
      '.yarnrc',
      'package.json',
      'modern.config.js ',
    ];
    if (DisabledDeleteFields.includes(filePath)) {
      return;
    }
    this.fileActions.push({
      type: FileAction.RmFile,
      file: filePath,
    });
  }

  private rmDir(dirName: string) {
    this.fileActions.push({
      type: FileAction.RmDir,
      file: dirName,
    });
  }
}
