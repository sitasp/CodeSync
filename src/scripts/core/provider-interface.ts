// Provider Interface - Defines the contract that all coding platform providers must implement
// This ensures consistent behavior across different platforms (LeetCode, HackerRank, etc.)

export interface ProviderConfig {
  name: string;
  domain: string;
  urlPatterns: string[];
}

export interface ProblemData {
  problemId: string;
  title?: string;
  slug?: string;
  difficulty?: string;
  [key: string]: any;
}

export interface SubmissionData {
  code: string;
  language: string;
  status: string;
  timestamp: number;
  problem: ProblemData;
  performance?: {
    runtime?: string;
    memory?: string;
    runtimePercentile?: number;
    memoryPercentile?: number;
  };
  [key: string]: any;
}

export interface InterceptedRequest {
  url: string;
  method: string;
  source: 'fetch' | 'xhr';
  data: any;
  timestamp: number;
}

export interface InterceptedResponse {
  url: string;
  data: any;
  source: 'fetch' | 'xhr';
  timestamp: number;
}

export abstract class Provider {
  abstract config: ProviderConfig;
  
  /**
   * Check if this provider should handle the given URL
   */
  abstract matchUrl(url: string): boolean;
  
  /**
   * Extract problem identifier from current page URL
   */
  abstract extractProblemId(): string | null;
  
  /**
   * Check if the intercepted response contains submission data
   */
  abstract isSubmissionData(response: InterceptedResponse): boolean;
  
  /**
   * Parse the response data into standardized submission format
   */
  abstract parseSubmissionData(response: InterceptedResponse): SubmissionData | null;
  
  /**
   * Check if this response should be processed (e.g., API calls we care about)
   */
  abstract shouldProcessResponse(response: InterceptedResponse): boolean;
  
  /**
   * Get provider-specific debug information
   */
  getDebugInfo(): any {
    return {
      name: this.config.name,
      domain: this.config.domain,
      currentUrl: window.location.href,
      problemId: this.extractProblemId()
    };
  }
}

export enum MessageType {
  API_RESPONSE = 'API_RESPONSE',
  SUBMISSION_DATA = 'SUBMISSION_DATA',
  DEBUG_INFO = 'DEBUG_INFO'
}

export interface ProviderMessage {
  type: MessageType;
  provider: string;
  data: any;
  timestamp: number;
  metadata?: any;
}