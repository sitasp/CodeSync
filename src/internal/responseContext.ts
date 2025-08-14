/**
 * @fileoverview Defines the ResponseContext class for holding API response details.
 */

/**
 * Defines the shape of the raw response object for type safety in the constructor.
 */
interface RawResponse {
    headers?: Record<string, string>;
    body?: any;
    statusCode?: number;
}

export default class ResponseContext {
    // Public properties with their explicit types
    public headers: Record<string, string>;
    public payload: any;
    public statusCode: number;

    /**
     * @param {RawResponse} response - The raw response object.
     */
    constructor(response: RawResponse) {
        this.headers = response.headers || {};
        this.payload = response.body || {};
        this.statusCode = response.statusCode || 0;
    }

    /**
     * Returns a string representation of the response.
     * @returns {string}
     */
    public toString(): string {
        return `Response [${this.statusCode}]`;
    }

    /**
     * Checks if the response was successful (status code 200-299).
     * @returns {boolean}
     */
    public isSuccess(): boolean {
        return this.statusCode >= 200 && this.statusCode < 300;
    }
}
