export interface Device {
    deviceId: string;
    name: string;
    ip: string;
    port: number;
    status: 'online' | 'offline' | 'busy';
    lastSeen: Date;
    currentMedia?: MediaFile;
    capabilities: string[];
    socketId?: string;
  }
  
  export interface MediaFile {
    mediaId: string;
    name: string;
    originalName: string;
    path: string;
    url: string;
    type: 'video' | 'audio' | 'image' | 'document' | 'presentation';
    mimeType: string;
    size: number;
    duration?: number;
    thumbnail?: string;
    metadata: {
      width?: number;
      height?: number;
      bitrate?: number;
      codec?: string;
    };
    uploadedAt: Date;
  }
  
  export interface CastRequest {
    deviceId: string;
    mediaId: string;
    options?: {
      autoplay?: boolean;
      loop?: boolean;
      volume?: number;
      startTime?: number;
    };
  }
  
  export interface PlaybackControl {
    action: 'play' | 'pause' | 'stop' | 'seek' | 'volume';
    value?: number;
  }
  
  export interface SocketEvents {
    // Client to Server
    'device:register': (deviceInfo: Partial<Device>) => void;
    'device:heartbeat': (deviceId: string) => void;
    'media:cast': (castRequest: CastRequest) => void;
    'playback:control': (deviceId: string, control: PlaybackControl) => void;
    'device:status': (deviceId: string, status: Device['status']) => void;
    
    // Server to Client
    'devices:updated': (devices: Device[]) => void;
    'media:play': (mediaFile: MediaFile, options?: any) => void;
    'playback:command': (control: PlaybackControl) => void;
    'device:disconnect': (deviceId: string) => void;
    'error': (message: string) => void;
  }