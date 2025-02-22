import React from 'react';
import ReactDOM from 'react-dom';
import VersioningPopup from '../components/VersioningPopup';

// Function to inject the VersioningPopup into the page
const injectVersioningPopup = (
  isOpen: boolean,
  onClose: () => void,
  onOverride: () => void,
  onCreateNew: (fileName: string, summary: string) => void,
) => {
  // Create a container for the popup
  const popupContainer = document.createElement('div');
  popupContainer.id = 'leetsync-versioning-popup-container';
  document.body.appendChild(popupContainer);

  // Render the VersioningPopup component
  ReactDOM.render(
    React.createElement(VersioningPopup, {
      isOpen: isOpen,
      onClose: onClose,
      onOverride: onOverride,
      onCreateNew: onCreateNew,
    }),
    popupContainer,
  );
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'show-versioning-popup') {
    const { isOpen, problemTitle } = message.data;

    // Implement onOverride function
    const onOverride = () => {
      // Send message to background script to override the file
      chrome.runtime.sendMessage({ type: 'override-file' });
      // Remove the popup from the DOM
      const popupContainer = document.getElementById('leetsync-versioning-popup-container');
      if (popupContainer) {
        document.body.removeChild(popupContainer);
      }
    };

    // Implement onCreateNew function
    const onCreateNew = (fileName: string, summary: string) => {
      // Send message to background script to create a new version
      chrome.runtime.sendMessage({ type: 'create-new-version', data: { fileName, summary } });
      // Remove the popup from the DOM
      const popupContainer = document.getElementById('leetsync-versioning-popup-container');
      if (popupContainer) {
        document.body.removeChild(popupContainer);
      }
    };

    // Implement onClose function
    const onClose = () => {
      // Send message to background script to close the popup
      chrome.runtime.sendMessage({ type: 'close-popup' });
      // Remove the popup from the DOM
      const popupContainer = document.getElementById('leetsync-versioning-popup-container');
      if (popupContainer) {
        document.body.removeChild(popupContainer);
      }
    };

    // Inject the VersioningPopup into the page
    injectVersioningPopup(isOpen, onClose, onOverride, onCreateNew);
  }
});
