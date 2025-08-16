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
export type GraphQLHandler = (requestContext: any, responseContext: any) => void;

// Handler for the 'submissionDetails' query
const handleSubmissionDetails: GraphQLHandler = (requestContext, responseContext) => {
  console.log('✅ [GraphQL] Handling submissionDetails query.');
  console.log('🎯 [GRAPH QL API] Remote Request:', requestContext);
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
