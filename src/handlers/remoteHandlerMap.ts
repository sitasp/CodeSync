// src/handlers/remoteHandlerMap.ts

import { LeetCodeRemoteHandlers } from './LeetCodeRemoteHandlers';

// Instantiate the remote handlers class
const leetcodeRemoteHandlers = new LeetCodeRemoteHandlers();

// Map handler IDs to their implementations
export const handlers: { [key: string]: (contexts: any) => void } = {
  'LeetCodeApiHandlers:onSubmissionSubmit': leetcodeRemoteHandlers.onSubmissionSubmit.bind(leetcodeRemoteHandlers),
};
