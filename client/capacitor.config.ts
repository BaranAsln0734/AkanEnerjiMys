import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akanenerji.app',
  appName: 'AkanEnerji',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
