export interface ScreenResolution {
  width: number;
  height: number;
}
export interface Device {
  serialNumber: string;
  deviceId: string;
  deviceOS: string;
  deviceName: string;
  ipAddress: string;
  instanceId: string;
  macAddress: string;
  modelName: string;
  uniqueId: string;
  port: number;
  screenResolution: ScreenResolution;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
  currentMedia?: MediaFile;
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

export interface Template {
  id: string;
  name: string;
  type: 'split-horizontal' | 'quad' | 'fullscreen';
  images: { [key: number]: MediaFile };
  width: number;
  height: number;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateRequest {
  name: string;
  type: 'split-horizontal' | 'quad' | 'fullscreen';
  images: { [key: number]: MediaFile };
  width: number;
  height: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  type?: 'split-horizontal' | 'quad' | 'fullscreen';
  images?: { [key: number]: MediaFile };
  width?: number;
  height?: number;
}

export interface TemplateCastRequest {
  templateId: string;
  deviceId: string;
  options?: {
    autoplay?: boolean;
    loop?: boolean;
    volume?: number;
    startTime?: number;
    duration?: number;
    transition?: {
      type: 'fade' | 'slide' | 'none';
      duration: number;
    };
  };
}

export interface TemplateStats {
  total: number;
  byType: {
    'split-horizontal': number;
    'quad': number;
    'fullscreen': number;
  };
  recentCount: number;
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

export interface TemplatePlaybackControl extends PlaybackControl {
  templateId?: string;
  slotIndex?: number;
}

export interface PlaylistItem {
  mediaId: string;
  duration: number;
  transition: 'fade' | 'slide' | 'none';
  media?: MediaFile;
}

export interface Playlist {
  id: string;
  playlistId?: string;
  name: string;
  items: PlaylistItem[];
  loop: boolean;
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaylistRequest {
  name: string;
  items: Array<{
    mediaId: string;
    duration: number;
    transition?: 'fade' | 'slide' | 'none';
  }>;
  loop: boolean;
}

export interface PlaylistCastRequest {
  playlistId: string;
  deviceId: string;
  options?: {
    autoplay?: boolean;
    volume?: number;
  };
}

export interface SocketEvents {
  // Client to Server
  'device:register': (deviceInfo: Partial<Device>) => void;
  'device:stimulate': (deviceId: string) => void;
  'media:cast': (castRequest: CastRequest) => void;
  'template:cast': (templateCastRequest: TemplateCastRequest) => void;
  'playlist:cast': (playlistCastRequest: PlaylistCastRequest) => void;
  'playback:control': (deviceId: string, control: PlaybackControl | TemplatePlaybackControl) => void;
  'device:status': (deviceId: string, status: Device['status']) => void;

  // Server to Client
  'devices:updated': (devices: Device[]) => void;
  'media:play': (mediaFile: MediaFile, options?: any) => void;
  'template:play': (template: Template, options?: any) => void;
  'template:stop': () => void;
  'playlist:play': (playlistData: Playlist & { items: Array<PlaylistItem & { media: MediaFile }> }, options?: any) => void;
  'playlist:stop': () => void;
  'playback:command': (control: PlaybackControl | TemplatePlaybackControl) => void;
  'device:disconnect': (deviceId: string) => void;
  'template:updated': (data: { action: 'created' | 'updated' | 'deleted'; template?: Template }) => void;
  'template:cast:success': (data: { deviceId: string; templateId: string; templateName: string }) => void;
  'playlist:updated': (data: { action: 'created' | 'updated' | 'deleted'; playlist?: Playlist }) => void;
  'playlist:cast:success': (data: { deviceId: string; playlistId: string; playlistName: string }) => void;
  'error': (message: string) => void;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TemplateValidation {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface DeviceCapabilities {
  video: boolean;
  audio: boolean;
  image: boolean;
  template: boolean;
  maxResolution?: {
    width: number;
    height: number;
  };
  supportedFormats?: string[];
  templateTypes?: Array<'split-horizontal' | 'quad' | 'fullscreen'>;
}

export interface TemplateSlot {
  index: number;
  media?: MediaFile;
  isEmpty: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TemplateLayout {
  type: 'split-horizontal' | 'quad' | 'fullscreen';
  slots: TemplateSlot[];
  dimensions: {
    width: number;
    height: number;
  };
}

export interface CastStatus {
  deviceId: string;
  mediaId?: string;
  templateId?: string;
  status: 'playing' | 'paused' | 'stopped' | 'loading';
  currentTime?: number;
  duration?: number;
  volume?: number;
  error?: string;
}

export interface PlaylistStats {
  total: number;
  totalDuration: number;
  averageItemCount: number;
  mostUsedTransition: 'fade' | 'slide' | 'none';
}

export interface SystemStats {
  devices: {
    total: number;
    online: number;
    offline: number;
    busy: number;
  };
  media: {
    total: number;
    totalSize: number;
    byType: {
      video: number;
      audio: number;
      image: number;
      document: number;
      presentation: number;
    };
  };
  templates: TemplateStats;
  playlists: PlaylistStats; // เพิ่มใหม่
  casts: {
    active: number;
    totalToday: number;
    totalThisWeek: number;
  };
}