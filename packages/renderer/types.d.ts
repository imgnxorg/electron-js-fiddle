declare global {
  interface Window {
    api?: {
      send: (channel: string, ...args: any[]) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}
