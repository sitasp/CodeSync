// src/handlers/leetcode/graphqlQueries.ts

/**
 * Enum of all allowed GraphQL query operation names.
 */
export enum AllowedGraphQLQuery {
  learningContext = 'learningContext',
  submissionDetails = 'submissionDetails',
  questionDetail = 'questionDetail',
}

// A type definition for our handler functions
export type GraphQLHandler = (requestContext: any, responseContext: any) => void | Promise<void>;

// Handler for the 'submissionDetails' query
const handleSubmissionDetails: GraphQLHandler = async (requestContext, responseContext) => {
  console.log('✅ [GraphQL] Handling submissionDetails query.');

  try {
    const requestPayload = JSON.parse(requestContext.payload);
    const requestSubmissionId = requestPayload.variables?.submissionId;
    console.log('requestSubmissionId', requestSubmissionId);

    if (requestSubmissionId) {
      const storedData = await new Promise<{ latest_submission_id?: number, questionSlug?: string }>((resolve) => {
        chrome.storage.local.get(['latest_submission_id', 'questionSlug'], (data) => resolve(data as any));
      });

      const storedSubmissionId = storedData.latest_submission_id;
      const questionSlug = storedData.questionSlug;

      if (storedSubmissionId && storedSubmissionId === requestSubmissionId && questionSlug) {
        console.log('✅ [GraphQL] Submission IDs match! Will do syncing logic');
        const submissionDetails = responseContext.payload;
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'leetcode-submission',
              data: { submissionDetails, questionSlug },
            });
          }
        });
        // Clear the stored data after use
        chrome.storage.local.remove(['latest_submission_id', 'questionSlug']);
      } else {
        console.warn(`⚠️ [GraphQL] Submission IDs do not match or stored ID not found. requestSubmissionId: ${requestSubmissionId}, storedSubmissionId: ${storedSubmissionId}`);
      }
    }
  } catch (e) {
    console.error('Error processing submissionDetails request:', e);
  }

  console.log('📨 [GRAPH QL API] Remote Response:', responseContext);
};

// Handler for the 'learningContext' query
const handleLearningContext: GraphQLHandler = (requestContext, responseContext) => {
  console.log('✅ [GraphQL] Handling learningContext query.');
  console.log('🎯 [GRAPH QL API] Remote Request:', requestContext);
  console.log('📨 [GRAPH QL API] Remote Response:', responseContext);
};

// Handler for the 'questionDetail' query
const handleQuestionDetail: GraphQLHandler = (requestContext, responseContext) => {
  console.log('✅ [GraphQL] Handling questionDetail query.');
  console.log('🎯 [GRAPH QL API] Remote Request:', requestContext);
  console.log('📨 [GRAPH QL API] Remote Response:', responseContext);
};

/**
 * A map that associates each allowed GraphQL query with its handler function.
 */
export const graphQLQueryHandlers = new Map<AllowedGraphQLQuery, GraphQLHandler>([
  [AllowedGraphQLQuery.submissionDetails, handleSubmissionDetails],
  [AllowedGraphQLQuery.learningContext, handleLearningContext],
  [AllowedGraphQLQuery.questionDetail, handleQuestionDetail],
]);
