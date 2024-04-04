import {CloudUtilsApi, CloudUtilsUser} from './CloudUtilsApi'
import {DiscoveryApi, FetchApi} from '@backstage/core-plugin-api'

export class CloudUtilsClient implements CloudUtilsApi {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;

  constructor({
    discoveryApi,
    fetchApi,
  }: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
  }) {
    this.discoveryApi = discoveryApi;
    this.fetchApi = fetchApi;
  }

  private async callApi<T>(
    path: string,
    query: { [key in string]: any },
  ): Promise<T | undefined> {
    const apiUrl = `${await this.discoveryApi.getBaseUrl('proxy')}/cloudUtils`;
    const response = await this.fetchApi.fetch(
      `${apiUrl}/${path}?${new URLSearchParams(query).toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.status === 200) {
      return (await response.json()) as T;
    }
    throw new Error(
      `CloudUtils API call failed: ${response.status}:${response.statusText}`,
    );
  }

  async getUserLookup(
    email: string | undefined,
  ): Promise<CloudUtilsUser | undefined> {
    if (!email) {
      throw new Error('Email is required');
    }

    return this.callApi('userLookup', {
      usr: email,
      json: true
    });
  }
}
