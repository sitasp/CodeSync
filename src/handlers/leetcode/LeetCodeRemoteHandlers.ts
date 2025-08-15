// src/handlers/LeetCodeRemoteHandlers.ts

// This file contains the actual implementations of remote handlers
// that are executed in the service worker context.
// It should not contain any references to the 'window' object.

import { RemoteClass, RemoteMethod } from '../../internal/remoteDecorators';

@RemoteClass()
export class LeetCodeRemoteHandlers {
  @RemoteMethod()
  async onSubmissionSubmit({ requestContext, responseContext }: any) {
    console.log('✅ [Service Worker] remote onSubmissionSubmit handler executed.');
    console.log('🎯 [SUBMIT API] Remote Request:', requestContext);
    console.log('📨 [SUBMIT API] Remote Response:', responseContext);
    // TODO: Add actual logic here to save this data or sync it to GitHub.
  }
}
