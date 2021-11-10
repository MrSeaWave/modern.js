import path from 'path';
import stdFs from 'fs';
import { promisify } from 'util';
import globby from 'globby';
import { isBinaryFileSync } from 'isbinaryfile';

type FSMethods =
  | 'readFile'
  | 'writeFile'
  | 'access'
  | 'mkdir'
  | 'stat'
  | 'unlink'
  | 'rmdir';
type FS = Pick<typeof stdFs, FSMethods | 'promises'>;

export interface AddFileParams {
  file: string; // new file path
  template?: string; // template content
  templateFile?: string; // template file path
  force?: boolean; // if file is exit, whether force to cover file
  data?: Record<string, string>; // template data
  disableHandlebarsRender?: boolean; // whether use handlebars render
}

export interface AddManyFilesParams {
  destination: string; // target dir
  templateFiles: string[] | (() => string[]); // templates files
  templateBase?: string; // template base path, targetPath = templateFile - base
  fileNameFunc?: (name: string) => string;
  data?: Record<string, string>; // template data
  disableHandlebarsRender?: boolean; // whether use handlebars render
}

export interface AppendFileParams {
  file: string;
  template?: string;
  templateFile?: string;
  separator?: string;
  data?: Record<string, string>;
}

const canEditDir = [
  'src',
  'api',
  'server',
  'config',
  'stories',
  'docs',
  'styles',
  'README.md',
];

export class FileOption {
  fs: FS;

  renderString: (template: string, data: Record<string, string>) => string;

  access: (path: stdFs.PathLike, mode?: number | undefined) => Promise<void>;

  stat: (path: stdFs.PathLike) => Promise<stdFs.Stats>;

  readFile: (
    path: stdFs.PathLike,
    encoding?: BufferEncoding,
  ) => // eslint-disable-next-line node/prefer-global/buffer
  Promise<string | Buffer>;

  writeFile: (
    path: stdFs.PathLike,
    // eslint-disable-next-line node/prefer-global/buffer
    data: string | Buffer,
    encoding?: BufferEncoding,
  ) => Promise<void>;

  mkdir: (
    path: stdFs.PathLike,
    options: stdFs.MakeDirectoryOptions & {
      recursive: true;
    },
  ) => Promise<string | undefined>;

  unlink: (path: stdFs.PathLike) => Promise<void>;

  rmDir: (
    dirName: string,
    options: { recursive: boolean; force: boolean },
  ) => Promise<void>;

  constructor(
    fs: FS,
    renderString: (template: string, data: Record<string, string>) => string,
  ) {
    this.fs = fs;
    this.stat = promisify(fs.stat);
    this.access = promisify(fs.access);
    this.readFile = promisify(fs.readFile);
    this.writeFile = promisify(fs.writeFile);
    this.mkdir = promisify(fs.mkdir);
    this.unlink = promisify(fs.unlink);
    this.rmDir = promisify(fs.rmdir);
    this.renderString = renderString;
  }

  async fileExists(filePath: string) {
    try {
      await this.access(filePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  isAbsoluteOrRelativeFileTo(relativePath: string) {
    const isFile = (file: string) =>
      stdFs.existsSync(file) && stdFs.lstatSync(file).isFile();
    return (fileName: string) =>
      isFile(fileName) || isFile(path.join(relativePath, fileName));
  }

  dropFileRootFolder(file: string) {
    const fileParts = path.normalize(file).split(path.sep);
    fileParts.shift();

    return fileParts.join(path.sep);
  }

  dropFileRootPath(file: string, rootPath?: string) {
    const fileRootPath = rootPath
      ? file.replace(rootPath, '')
      : this.dropFileRootFolder(file);
    return fileRootPath.startsWith(path.sep)
      ? fileRootPath
      : `${path.sep}${fileRootPath}`;
  }

  async addFile(
    config: AddFileParams,
    projectPath: string,
    modulePath: string,
  ) {
    const fileDestPath = path.join(projectPath, config.file);
    const relativePath = this.dropFileRootPath(fileDestPath, projectPath);

    const destExists = await this.fileExists(fileDestPath);
    if (destExists && !config.force) {
      throw Error(`File ${fileDestPath} already exists`);
    }
    if (
      destExists &&
      canEditDir.every(dir => !relativePath.startsWith(`${path.sep}${dir}`))
    ) {
      throw Error(`${fileDestPath} can not cover`);
    }
    await this.mkdir(path.dirname(fileDestPath), { recursive: true });
    const absTemplatePath = config.templateFile
      ? path.join(modulePath, config.templateFile)
      : null;
    if (
      absTemplatePath != null &&
      (isBinaryFileSync(absTemplatePath) || config.disableHandlebarsRender)
    ) {
      const rawTemplate = await this.readFile(absTemplatePath);
      await this.writeFile(fileDestPath, rawTemplate);
    } else {
      let { template } = config;
      if (absTemplatePath) {
        template = (await this.readFile(absTemplatePath, 'utf8')) as string;
      }
      await this.writeFile(
        fileDestPath,
        this.renderString(template!, config.data || {})!,
        'utf8',
      );
    }
  }

  async addManyFiles(
    config: AddManyFilesParams,
    projectPath: string,
    modulePath: string,
  ) {
    const dest = config.destination;
    if (typeof dest !== 'string' || dest.length === 0) {
      throw Error(`Invalid destination "${dest}"`);
    }
    if (typeof config.templateFiles === 'function') {
      config.templateFiles = config.templateFiles();
    }

    config.templateFiles = config.templateFiles.map(templateFile =>
      path.join(modulePath, templateFile),
    );

    config.templateBase = config.templateBase?.startsWith(path.sep)
      ? config.templateBase
      : `${path.sep}${config.templateBase || ''}`;

    const templateFiles = globby
      .sync(config.templateFiles, { braceExpansion: false })
      .map(filePath => this.dropFileRootPath(filePath, modulePath))
      .filter(filePath => filePath.startsWith(config.templateBase || ''))
      .filter(this.isAbsoluteOrRelativeFileTo(modulePath));

    const filesAdded = [];
    for (const templateFile of templateFiles) {
      const absTemplatePath = path.resolve(modulePath, templateFile);
      const targetFile = this.dropFileRootPath(
        templateFile,
        config.templateBase,
      );
      const fileCfg = {
        ...config,
        file: path.join(
          config.destination,
          config.fileNameFunc ? config.fileNameFunc(targetFile) : targetFile,
        ),
        templateFile: absTemplatePath,
        force: true,
      };
      const addedPath = await this.addFile(fileCfg, projectPath, modulePath);
      filesAdded.push(addedPath);
    }
  }

  async appendFile(
    config: AppendFileParams,
    projectPath: string,
    modulePath: string,
  ) {
    const fileDestPath = path.resolve(projectPath, config.file);

    const destExists = await this.fileExists(fileDestPath);
    if (!destExists) {
      throw Error(`File does not exist`);
    }
    await this.mkdir(path.dirname(fileDestPath), { recursive: true });
    const absTemplatePath = config.templateFile
      ? path.resolve(modulePath, config.templateFile)
      : null;
    let fileData = await this.readFile(fileDestPath, 'utf8');
    const { separator = '\n' } = config;
    let { template } = config;
    if (absTemplatePath) {
      template = (await this.readFile(absTemplatePath, 'utf8')) as string;
    }
    if (fileData.length > 0) {
      fileData += separator;
    }
    const stringToAppend =
      fileData + this.renderString(template!, config.data || {});
    await this.writeFile(fileDestPath, stringToAppend);
  }

  async deleteFile(fileName: string, root: string) {
    const file = path.join(root, fileName);
    if (await this.fileExists(file)) {
      await this.unlink(file);
    }
  }

  async deleteDir(dirName: string, root: string) {
    const dir = path.join(root, dirName);
    try {
      const stat = await this.stat(dir);
      if (stat.isDirectory()) {
        await this.rmDir(dir, {
          recursive: true,
          force: true,
        });
      }
    } catch (e) {
      /** nothing */
    }
  }
}
