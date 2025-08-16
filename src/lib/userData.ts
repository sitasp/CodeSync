import { UserGlobalData } from '../types';

export const getUserData = async (): Promise<Partial<UserGlobalData>> => {
  let userData: Partial<UserGlobalData> = {};

  await chrome.storage.sync
    .get([
      'github_leetsync_token',
      'github_username',
      'github_leetsync_repo',
      'github_leetsync_subdirectory',
    ])
    .then((result) => {
      userData = {
        github_leetsync_token: result.github_leetsync_token,
        github_username: result.github_username,
        github_leetsync_repo: result.github_leetsync_repo,
        github_leetsync_subdirectory: result.github_leetsync_subdirectory,
      };
    });

  return userData;
};

export const setUserData = async (
  userData: Partial<UserGlobalData>
): Promise<void> => {
  await chrome.storage.sync.set(userData);
};

export const updateProblemsSolved = async (problemsSolved: any) => {
  const { problemsSolved: currentProblemsSolved } = (await chrome.storage.sync.get(
    'problemsSolved'
  )) ?? { problemsSolved: {} };

  await chrome.storage.sync.set({
    problemsSolved: {
      ...currentProblemsSolved,
      ...problemsSolved,
    },
  });
};
