/**
 * @fileoverview Defines the RequestContext class for holding API request details.
 */

/**
 * Defines the shape of the raw request object for type safety in the constructor.
 */
interface RawRequest {
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  path?: string;
  method?: string;
}

export default class RequestContext {
  // Public properties with their explicit types
  public headers: Record<string, string>;
  public payload: any;
  public queryParams: Record<string, string>;
  public path: string;
  public method: string;
  public urlParams: Record<string, string>;

  /**
   * @param {RawRequest} request - The raw request object.
   * @param {Record<string, string>} urlParams - The parameters extracted from the URL path.
   */
  constructor(request: RawRequest, urlParams: Record<string, string> = {}) {
    this.headers = request.headers || {};
    this.payload = request.body || {};
    this.queryParams = request.queryParams || {};
    this.path = request.path || '';
    this.method = request.method || 'INVALID';
    this.urlParams = urlParams;
  }

  /**
   * Returns a string representation of the request.
   * @returns {string}
   */
  public toString(): string {
    return `Request [${this.method} ${this.path}]`;
  }

  /**
   * A utility to safely get a header value.
   * @param {string} name - The name of the header (case-insensitive).
   * @returns {string | undefined}
   */
  public getHeader(name: string): string | undefined {
    const lowerCaseName = name.toLowerCase();
    const headerKey = Object.keys(this.headers).find(key => key.toLowerCase() === lowerCaseName);
    return headerKey ? this.headers[headerKey] : undefined;
  }
}
