# CodeSync Chrome Extension

CodeSync is a Chrome extension that enables you to sync your LeetCode/HackerRank problem submissions with a selected GitHub repository. With this extension, you can easily track your coding progress and share your solutions with others on GitHub.

## Table of Contents

- [How it Works](#how-it-works)
- [Installation](#installation)
- [Get Started](#get-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## How it Works

CodeSync utilizes the LeetCode API to fetch your submission data and the GitHub API to create a new file or update an existing one in your selected repository.

## Installation

To install CodeSync, follow these steps [OUTDATED]:

1. Download the latest release of the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/CodeSync-leetcode-synchro/ppkbejeolfcbaomanmbpjdbkfcjfhjnd?hl=en&authuser=0).
2. Install the extension by clicking the "Add to Chrome" button.
3. Once the installation is complete, click on the extension icon in your Chrome toolbar to configure it.

## Build

To Build & install by yourself, follow these steps.

1. Build the extension by yourself
   a. `npm install`
   b. `npm run build`
2. Load the generated build file to your chrome/edge browser using 'Load Unpacked Extension'.

## Get Started

To configure CodeSync, follow these steps:

1. Click on the extension icon in your Chrome toolbar.
2. In the popup window, Give Access via Github.
3. Login Via LeetCode (Optional and might be automatically skipped if already logged in)
4. Select the repository you want to sync your submissions to.
5. Start solving some problems

## Usage

To use CodeSync, follow these steps:

1. Solve a problem on LeetCode and submit your solution.
2. CodeSync will create a new file or update an existing one in your selected repository automatically.
3. Go and check the submission on your github repository

## Support

If you encounter any issues or have any suggestions for improving CodeSync, please feel free to [open an issue](https://github.com/3ba2ii/leet-sync/issues) on the GitHub repository.

## Contributing

Contributions are welcome! If you want to contribute to the project, please follow the [contributing guidelines](CONTRIBUTING.md).

## Tribute

I want to thank the original creators of [LeetSync](https://github.com/LeetSync/LeetSync). This repo is inspired and derived from there.

## License

CodeSync is licensed under the [MIT License](LICENSE).
