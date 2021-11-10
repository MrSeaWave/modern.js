import { GeneratorCore } from '@modern-js/codesmith';
import { GitAPI } from '@modern-js/codesmith-api-git';

export interface PluginGitMethod {
  isInGitRepo: (dirPath?: string) => Promise<boolean>;
  initGitRepo: (cwd?: string, force?: boolean) => Promise<void>;
  gitAddAndCommit: (commitMessage: string, cwd?: string) => Promise<void>;
}
export class PluginGitAPI {
  private readonly gitAPI: GitAPI;

  constructor(generatorCore: GeneratorCore) {
    this.gitAPI = new GitAPI(generatorCore);
  }

  get method(): PluginGitMethod {
    return {
      isInGitRepo: this.gitAPI.isInGitRepo.bind(this.gitAPI),
      initGitRepo: this.gitAPI.initGitRepo.bind(this.gitAPI),
      gitAddAndCommit: this.gitAPI.addAndCommit.bind(this.gitAPI),
    };
  }
}
