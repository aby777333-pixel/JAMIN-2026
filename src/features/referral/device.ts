import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Device fingerprint for referral attribution + fraud signals (§8, MOD08).
 * Privacy-light: a per-install random id (stable in SecureStore) plus coarse
 * OS/model/locale. Used by the DB fraud trigger for device-velocity scoring.
 */
type DeviceInfo = Record<string, string | number | null>;

const DEVICE_ID_KEY = 'jamin.device.id';
let cached: DeviceInfo | null = null;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function deviceId(): Promise<string> {
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = uuid();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export async function deviceInfo(): Promise<DeviceInfo> {
  if (cached) return cached;
  const id = await deviceId();
  let locale: string | null = null;
  try {
    locale = Localization.getLocales?.()[0]?.languageTag ?? null;
  } catch {
    locale = null;
  }
  cached = {
    id,
    os: Platform.OS,
    osVersion: String(Device.osVersion ?? Platform.Version ?? ''),
    brand: Device.brand ?? null,
    model: Device.modelName ?? null,
    appVersion: Constants.expoConfig?.version ?? null,
    locale,
  };
  return cached;
}
