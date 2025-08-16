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

    if (requestSubmissionId) {
      const storedData = await new Promise<{ latest_submission_id?: number }>((resolve) => {
        chrome.storage.local.get('latest_submission_id', (data) => resolve(data as any));
      });

      const storedSubmissionId = storedData.latest_submission_id;

      if (storedSubmissionId && storedSubmissionId === requestSubmissionId) {
        console.log('✅ [GraphQL] Submission IDs match! Will do syncing logic');
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
