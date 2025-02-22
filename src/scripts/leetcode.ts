//this script should only run in leetcode/problems/*.com pages  (i.e. the problem page)

import { LeetCodeHandler, GithubHandler } from '../handlers';
import { Submission } from '../types/Submission';
import { sleep } from '../utils';

const leetcode = new LeetCodeHandler();
const github = new GithubHandler();

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  if (request && request.type === 'get-submission') {
    const questionSlug = request?.data?.questionSlug;

    if (!questionSlug) return;

    let retries = 0;
    let submission = await leetcode.getSubmission(questionSlug);
    while (!submission && retries < 3) {
      retries++;
      await sleep(retries * 1000);
      submission = await leetcode.getSubmission(questionSlug);
    }
    if (!submission) return;
    //validate submission's timestamp, if its was submitted more than 1 minute ago, then its an old submission and we should ignore it
    const now = new Date();
    const submissionDate = new Date(submission.timestamp * 1000);
    const diff = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diff / 1000 / 60);

    if (diffInMinutes > 1) return;

    // Versioning Logic
    let enableVersioning = false;
    let fileExists = false;
    let versioningFileName = '';
    let versioningCommitMessage = '';

    chrome.storage.sync.get(['enableVersioning'], async (result) => {
      enableVersioning = result.enableVersioning || false;

      if (enableVersioning) {
        const filePath = github.createSolutionFile(
          'path', // this path does not matter for fileExists
          submission.code,
          submission.question.titleSlug,
          submission.lang.name,
          {
            memory: submission.memory,
            memoryDisplay: submission.memoryDisplay,
            memoryPercentile: submission.memoryPercentile,
            runtime: submission.runtime,
            runtimeDisplay: submission.runtimeDisplay,
            runtimePercentile: submission.runtimePercentile,
          },
        );
        fileExists = (await github.fileExists(filePath.path, filePath.fileName)) !== null;

        if (fileExists) {
          // Send message to content script to show the popup
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'show-versioning-popup',
              data: {
                isOpen: true,
                problemTitle: submission.question.title,
              },
            });
          });
        }
      }

      // The following functions are now handled in the content script
      // const onOverride = async () => { ... };
      // const onCreateNew = async (fileName: string, summary: string) => { ... };

      if (!enableVersioning || !fileExists) {
        const isPushed = await github.submit(submission);
        if (isPushed) {
          chrome.runtime.sendMessage({ type: 'set-fire-icon' });
        }
      }
    });
  }
});
