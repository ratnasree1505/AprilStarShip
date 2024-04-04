declare global {
  interface Window {
    gtag: Function;
    FS: {
      identify: Function;
    };
  }
}
export {};