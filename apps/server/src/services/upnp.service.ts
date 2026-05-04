export interface UpnpDevice {
  name: string;
  location: string;
}

export interface UpnpService {
  discover(): Promise<UpnpDevice[]>;
  play(deviceLocation: string, audioUrl: string): Promise<void>;
}

export class MockUpnpService implements UpnpService {
  async discover(): Promise<UpnpDevice[]> {
    return [];
  }

  async play(_deviceLocation: string, _audioUrl: string): Promise<void> {
    // mock: no-op
  }
}
