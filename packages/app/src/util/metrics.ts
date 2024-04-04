const setGtag = (parameters: any) => {
  if (window.gtag) {
    window.gtag('set', parameters);
  }
};

export const setMetricsUserId = (userId: string) => {
  setGtag({ user_id: userId });
};