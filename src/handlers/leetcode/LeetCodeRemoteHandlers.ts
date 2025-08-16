// src/handlers/LeetCodeRemoteHandlers.ts

// This file contains the actual implementations of remote handlers
// that are executed in the service worker context.
// It should not contain any references to the 'window' object.

import { RemoteClass, RemoteMethod } from '../../internal/remoteDecorators';
import { graphQLQueryHandlers } from './graphqlQueries';

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
    try {
      const payload = JSON.parse(requestContext.payload);
      const operationName = payload.operationName;

      if (graphQLQueryHandlers.has(operationName)) {
        const handler = graphQLQueryHandlers.get(operationName);
        handler?.(requestContext, responseContext);
      } else {
        // console.log(`Skipping unhandled GraphQL query: ${operationName}`);
      }
    } catch (e) {
      console.error('Error handling GraphQL request:', e);
    }
  }
  }
