export interface Config {
  /**
   * dynatrace config
   * @visibility frontend
   */
  dynatrace?: {
    /**
     * base url for links
     * @visibility frontend
     */
    baseUrl: string;
    /**
     * url for user lookup
     * @visibility frontend
     */
    // userLookupUrl: string;
  };
}
