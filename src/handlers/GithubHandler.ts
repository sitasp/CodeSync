import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI } from '../constants';
import { QuestionDifficulty } from '../types/Question';
import { Submission } from '../types/Submission';

type DistributionType = {
  percentile: string;
  value: number;
};

const languagesToExtensions: Record<string, string> = {
  Python: '.py',
  Python3: '.py',
  'C++': '.cpp',
  C: '.c',
  Java: '.java',
  'C#': '.cs',
  JavaScript: '.js',
  Javascript: '.js',
  Ruby: '.rb',
  Swift: '.swift',
  Go: '.go',
  Kotlin: '.kt',
  Scala: '.scala',
  Rust: '.rs',
  PHP: '.php',
  TypeScript: '.ts',
  MySQL: '.sql',
  'MS SQL Server': '.sql',
  Oracle: '.sql',
  PostgreSQL: '.sql',
  'C++14': '.cpp',
  'C++17': '.cpp',
  'C++11': '.cpp',
  'C++98': '.cpp',
  'C++03': '.cpp',
  'C++20': '.cpp',
  'C++1z': '.cpp',
  'C++1y': '.cpp',
  'C++1x': '.cpp',
  'C++1a': '.cpp',
  CPP: '.cpp',
  Dart: '.dart',
  Elixir: '.ex',
};
interface GithubUser {
  id: number;
  avatar_url?: string | null;
  url: string;
  login: string;
  /* other user data can be added here, but not needed for now */
}
export default class GithubHandler {
  base_url: string = 'https://api.github.com';
  private client_secret: string | null = GITHUB_CLIENT_SECRET ?? '';
  private client_id: string | null = GITHUB_CLIENT_ID ?? '';
  private redirect_uri: string | null = GITHUB_REDIRECT_URI ?? '';
  private accessToken: string;
  private username: string;
  private repo: string;
  private github_leetsync_subdirectory: string;
  private provider_settings: {
    leetcode?: { enabled: boolean; subdirectory: string };
    hackerrank?: { enabled: boolean; subdirectory: string };
  } = {};

  constructor() {
    //inject QuestionHandler dependency
    //fetch github_access_token, github_username, github_leetsync_repo from storage
    //if any of them is not present, throw an error
    this.accessToken = '';
    this.username = '';
    this.repo = '';
    this.github_leetsync_subdirectory = '';

    chrome.storage.sync.get(
      ['github_leetsync_token', 'github_username', 'github_leetsync_repo', 'github_leetsync_subdirectory', 'provider_settings'],
      (result) => {
        if (!result.github_leetsync_token || !result.github_username || !result.github_leetsync_repo) {
          console.log('❌ GithubHandler: Missing Github Credentials');
        }
        this.accessToken = result['github_leetsync_token'];
        this.username = result['github_username'];
        this.repo = result['github_leetsync_repo'];
        this.github_leetsync_subdirectory = result['github_leetsync_subdirectory'];
        this.provider_settings = result['provider_settings'] || {};
      },
    );
  }
  async loadTokenFromStorage(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['github_leetsync_token'], (result) => {
        const token = result['github_leetsync_token'];
        if (!token) {
          console.log('No access token found.');
          chrome.storage.sync.clear();
          resolve('');
        }
        resolve(token);
      });
    });
  }
  async authorize(code: string): Promise<string | null> {
    const access_token = await this.fetchAccessToken(code);
    const user = await this.fetchGithubUser(access_token);
    if (!access_token || !user) return null;
    this.accessToken = access_token;
    this.username = user.login;
    return access_token;
  }
  async fetchGithubUser(token: string): Promise<GithubUser | null> {
    //validate the token
    const response = await fetch(`${this.base_url}/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `token ${token}`,
      },
    }).then((response) => response.json());

    if (!response || response.message === 'Bad credentials') {
      console.error('No access token found.');
      chrome.storage.sync.clear();
      return null;
    }

    //set access token in chrome storage
    chrome.storage.sync.set({
      github_leetsync_token: token,
      github_username: response.login,
    });
    return response;
  }
  async fetchAccessToken(code: string) {
    const token = await this.loadTokenFromStorage();

    if (token) return token;

    const tokenUrl = 'https://github.com/login/oauth/access_token';
    const body = {
      code,
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      client_secret: this.client_secret,
    };
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }).then((response) => response.json());

    if (!response || response.message === 'Bad credentials') {
      console.log('No access token found.');
      chrome.storage.sync.clear();
      return;
    }

    chrome.storage.sync.set({ github_leetsync_token: response.access_token }, () => {
      console.log('Saved github access token.');
    });
    return response.access_token;
  }
  async checkIfRepoExists(repo_name: string): Promise<boolean> {
    const trimmedRepoName = repo_name.replace('.git', '').trim();
    if (!trimmedRepoName) return false;
    //check if repo exists in github user's account
    const result = await fetch(`${this.base_url}/repos/${trimmedRepoName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `token ${await this.loadTokenFromStorage()}`,
      },
    })
      .then((x) => x.json())
      .catch((e) => console.error(e));
    if (result.message === 'Not Found' || result.message === 'Bad credentials') {
      return false;
    }
    return true;
  }
  public getProblemExtension(lang: string) {
    return languagesToExtensions[lang];
  }

  private getProviderSubdirectory(provider: 'leetcode' | 'hackerrank'): string {
    // If provider settings exist, use those
    if (this.provider_settings && this.provider_settings[provider]) {
      return this.provider_settings[provider]!.subdirectory;
    }

    // Fallback: For leetcode, use old subdirectory setting if available
    if (provider === 'leetcode' && this.github_leetsync_subdirectory) {
      return this.github_leetsync_subdirectory;
    }

    // Default: Use provider name
    return provider;
  }

  /* Submissions Methods */
  async fileExists(path: string, fileName: string): Promise<string | null> {
    //check if the file exists in the path using the github API
    const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${path}/${fileName}`;

    const uploadedFile = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then((x) => x.json())
      .catch((err) => console.log(err));

    if (uploadedFile.message === 'Not Found') {
      return null;
    }
    return uploadedFile.sha;
  }
  async upload(path: string, fileName: string, content: string, commitMessage: string, useDefaultSubmit: boolean) {
    let sha;
    if (useDefaultSubmit) {
      sha = await this.fileExists(path, fileName);
    }
    else {
      // append some random 4-5 digit uuid to filename
      const uuid = Math.floor(10000 * Math.random());
      fileName = `${uuid}_${fileName}`;
    }
    //create a new file with the content
    const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${path}/${fileName}`;
    const data = {
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(content))),
      sha, //if the file already exists, we need to pass the sha of the file otherwise it will be null
    };

    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((x) => x.json())
      .catch((err) => console.log(err));
  }
  getDifficultyColor(difficulty: QuestionDifficulty) {
    switch (difficulty) {
      case 'Easy':
        return 'brightgreen';
      case 'Medium':
        return 'orange';
      case 'Hard':
        return 'red';
    }
  }
  createDifficultyBadge(difficulty: QuestionDifficulty) {
    return `<img src='https://img.shields.io/badge/Difficulty-${difficulty}-${this.getDifficultyColor(
      difficulty,
    )}' alt='Difficulty: ${difficulty}' />`;
  }
  async createReadmeFile(
    path: string,
    content: string,
    message: string,
    problemSlug: string,
    questionTitle: string,
    difficulty: QuestionDifficulty,
  ) {
    //check if that file already exists
    //if it does, Update the file with the new content
    //if it doesn't, create a new file with the content
    const mdContent = `<h2><a href="https://leetcode.com/problems/${problemSlug}">${questionTitle}</a></h2> ${this.createDifficultyBadge(
      difficulty,
    )}<hr>${content}`;

    await this.upload(path, 'README.md', mdContent, message, true);
  }
  async createNotesFile(path: string, notes: string, message: string, questionTitle: string) {
    //check if that file already exists
    //if it does, Update the file with the new content
    //if it doesn't, create a new file with the content
    const mdContent = `<h2>${questionTitle} Notes</h2><hr>${notes}`;

    await this.upload(path, 'Notes.md', mdContent, message, true);
  }
  async createSolutionFile(
    path: string,
    code: string,
    problemName: string, //the code
    lang: string, //.py, .cpp, .java etc
    stats: {
      memory: number;
      memoryDisplay: string;
      memoryPercentile: number;
      runtime: number;
      runtimeDisplay: string;
      runtimePercentile: number;
    },
    useDefaultSubmit: boolean,
    provider: 'leetcode' | 'hackerrank' = 'leetcode',
  ) {
    //check if that file already exists
    //if it does, Update the file with the new content
    //if it doesn't, create a new file with the content
    const platformName = provider === 'leetcode' ? 'LeetCode' : 'HackerRank';
    const msg = `Time: ${stats.runtimeDisplay} (${stats.runtimePercentile.toFixed(2)}%) | Memory: ${
      stats.memoryDisplay
    } (${stats.memoryPercentile.toFixed(2)}%) - ${platformName} via CodeSync`;
    await this.upload(path, `${problemName}${lang}`, code, msg, useDefaultSubmit);
  }

  async submit(
    submission: Submission, //todo: define the submission type
    useDefaultSubmit: boolean,
    provider: 'leetcode' | 'hackerrank' = 'leetcode',
  ): Promise<boolean> {
    if (!this.accessToken || !this.username || !this.repo) return false;
    const {
      code,
      memory,
      memoryDisplay,
      memoryPercentile,
      runtime,
      runtimePercentile,
      runtimeDisplay,
      runtimeDistribution,
      lang,
      statusCode,
      question,
      notes,
    } = submission;

    if (statusCode !== 10) {
      //failed submission
      console.log('❌ Failed Attempt');
      return false;
    }
    //create a path for the files to be uploaded
    let basePath = `${question.questionFrontendId ?? question.questionId ?? 'unknown'}-${question.titleSlug}`;

    // Use provider-specific subdirectory
    const providerSubdirectory = this.getProviderSubdirectory(provider);
    if (providerSubdirectory) {
      basePath = `${providerSubdirectory}/${basePath}`;
    }

    const { title, titleSlug, content, difficulty, questionId } = question;

    const langExtension = this.getProblemExtension(lang.verboseName);

    if (!langExtension) {
      console.log('❌ Language not supported');
      return false;
    }
    await this.createReadmeFile(basePath, content, `Added README.md file for ${title}`, titleSlug, title, difficulty);
    if (notes && notes?.length) {
      await this.createNotesFile(basePath, notes, `Added Notes.md file for ${title}`, titleSlug);
    }

    await this.createSolutionFile(basePath, code, question.titleSlug, langExtension, {
      memory,
      memoryDisplay,
      memoryPercentile,
      runtime,
      runtimeDisplay,
      runtimePercentile,
    }, useDefaultSubmit, provider);

    const todayTimestamp = Date.now();

    chrome.storage.sync.set({
      lastSolved: { slug: titleSlug, timestamp: todayTimestamp },
    });

    //update the problems solved
    const { problemsSolved } = (await chrome.storage.sync.get('problemsSolved')) ?? { problemsSolved: [] }; //{slug: {...info}}

    chrome.storage.sync.set({
      problemsSolved: {
        ...problemsSolved,
        [titleSlug]: {
          question: {
            difficulty,
            questionId,
          },
          timestamp: todayTimestamp,
        },
      },
    });
    //create a new solution file with the code inside the folder
    return true;
  }
}
