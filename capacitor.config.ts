
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c12bff117a7b4ceaa47e69d7e73aff15',
  appName: 'streamlyzer-48',
  webDir: 'dist',
  server: {
    url: 'https://c12bff11-7a7b-4cea-a47e-69d7e73aff15.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    buildOptions: {
      minSdkVersion: 21, // For Android TV support
      targetSdkVersion: 33,
    }
  }
};

export default config;
