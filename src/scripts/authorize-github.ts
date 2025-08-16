import GithubHandler from '../handlers/GithubHandler';

(async () => {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const referrer = url.searchParams.get('referrer');
    if (code && referrer === 'leetsync') {
      const authData = await GithubHandler.authorize(code);
      if (authData) {
        chrome.storage.sync.set({
          github_leetsync_token: authData.token,
          github_username: authData.user.login,
        }, () => {
          // close the tab after successful authorization
          chrome.tabs.getCurrent(function (tab) {
            if (tab?.id) {
              chrome.tabs.remove(tab.id);
            }
          });
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
})();
