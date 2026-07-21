import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cvspower.app',
  appName: 'CVSPower',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
