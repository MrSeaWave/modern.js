import { GeneratorCore } from '@modern-js/codesmith';
import { GitAPI } from '@modern-js/codesmith-api-git';

export interface PluginGitMethod {
  isInGitRepo: (dirPath?: string) => Promise<boolean>;
  initGitRepo: (cwd?: string, force?: boolean) => Promise<void>;
  gitAddAndCommit: (commitMessage: string, cwd?: string) => Promise<void>;
}
export class PluginGitAPI {
  private readonly gitApi: GitAPI;

  constructor(generatorCore: GeneratorCore) {
    this.gitApi = new GitAPI(generatorCore);
  }

  get method(): PluginGitMethod {
    return {
      isInGitRepo: this.gitApi.isInGitRepo.bind(this.gitApi),
      initGitRepo: this.gitApi.initGitRepo.bind(this.gitApi),
      gitAddAndCommit: this.gitApi.addAndCommit.bind(this.gitApi),
    };
  }
}
