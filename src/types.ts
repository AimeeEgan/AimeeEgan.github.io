export type WifiOption = {
  id: string;
  ssid: string;
  isGenuine?: boolean; // only backend should trust this field; frontend treats as unknown
  hint?: string; // hint to show in portal
  portalStyle?: 'clean' | 'suspicious';
};
