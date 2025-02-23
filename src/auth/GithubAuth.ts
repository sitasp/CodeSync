import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '../constants';

export interface IGithubAuthStrategy {
  fetchToken(params: { code?: string; personalToken?: string }): Promise<string>;
  validateToken(token: string): Promise<boolean>;
}

export class OAuthGithubAuth implements IGithubAuthStrategy {
  async fetchToken({ code }: { code?: string }): Promise<string> {
    if (!code) {
      throw new Error('Code is required for OAuth authentication');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || 'Failed to fetch token');
    }

    return data.access_token;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export class PersonalAccessTokenAuth implements IGithubAuthStrategy {
  async fetchToken({ personalToken }: { personalToken?: string }): Promise<string> {
    if (!personalToken) {
      throw new Error('Personal access token is required');
    }

    const isValid = await this.validateToken(personalToken);
    if (!isValid) {
      throw new Error('Invalid personal access token');
    }

    return personalToken;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export class GithubAuthFactory {
  static createAuthStrategy(type: 'oauth' | 'personal_token'): IGithubAuthStrategy {
    switch (type) {
      case 'oauth':
        return new OAuthGithubAuth();
      case 'personal_token':
        return new PersonalAccessTokenAuth();
      default:
        throw new Error('Invalid authentication type');
    }
  }
}
