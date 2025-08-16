// src/handlers/LeetCodeRemoteHandlers.ts

// This file contains the actual implementations of remote handlers
// that are executed in the service worker context.
// It should not contain any references to the 'window' object.

import { RemoteClass, RemoteMethod } from '../../internal/remoteDecorators';

@RemoteClass('LeetCodeApiHandlers')
export class LeetCodeRemoteHandlers {
  @RemoteMethod()
  async onSubmissionSubmit({ requestContext, responseContext }: any) {
    console.log('✅ [Service Worker] remote onSubmissionSubmit handler executed.');
    console.log('🎯 [SUBMIT API] Remote Request:', requestContext);
    console.log('📨 [SUBMIT API] Remote Response:', responseContext);
  }

  @RemoteMethod()
  async onGraphQL({ requestContext, responseContext }: any) {
    console.log('✅ [Service Worker] remote onGraphQL handler executed.');
    console.log('🎯 [GRAPH QL API] Remote Request:', requestContext);
    console.log('📨 [GRAPH QL API] Remote Response:', responseContext);
  }
}
