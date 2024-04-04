import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { useEffect, useState } from 'react';

/**
 * Get logged-in user id
 */

export function useUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const identityApi = useApi(identityApiRef);

  useEffect(() => {
    async function fetchUserId() {
      const picture = (await identityApi.getProfileInfo()).picture;

      // Photo URL format: https://avatars2.githubusercontent.com/u/USERID?v=4
      const id = picture?.match(/u\/(.*)\?/);

      if (id) {
        setUserId(id[1]);
      }
    }

    fetchUserId();
  }, [identityApi]);

  return userId;
}