import { Server as SocketIOServer, Socket } from 'socket.io';
import { DeviceService } from './device.service';
import { MediaFile, PlaybackControl, CastRequest } from '../types';
import { Template } from '../models/template';

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;
  private deviceSockets: Map<string, string> = new Map(); // deviceId -> socketId

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Device registration
      socket.on('device:register', async (deviceInfo) => {
        try {
          const device = await DeviceService.registerDevice({
            ...deviceInfo,
            socketId: socket.id
          });

          this.deviceSockets.set(device.deviceId, socket.id);
          socket.join(`device:${device.deviceId}`);

          console.log(`Device registered: ${device.deviceName} (${device.deviceId})`);

          // Broadcast updated device list
          this.broadcastDeviceList();

          socket.emit('device:registered', { success: true, device });
        } catch (error) {
          console.error('Error registering device:', error);
          socket.emit('error', 'Failed to register device');
        }
      });

      // Device heartbeat
      socket.on('device:stimulate', async (deviceId: string) => {
        await DeviceService.updateDeviceStatus(deviceId, 'online', socket.id);
        this.deviceSockets.set(deviceId, socket.id);
      });

      // Cast media
      socket.on('media:cast', async (castRequest: CastRequest) => {
        this.handleCastRequest(socket, castRequest);
      });

      // Cast template - NEW EVENT
      socket.on('template:cast', async (templateCastRequest: {
        templateId: string;
        deviceId: string;
        template: Template;
        options?: any;
      }) => {
        this.handleTemplateCastRequest(socket, templateCastRequest);
      });

      // Playback control
      socket.on('playback:control', (deviceId: string, control: PlaybackControl) => {
        this.sendPlaybackControl(deviceId, control);
      });

      // Device status update
      socket.on('device:status', async (deviceId: string, status: 'online' | 'offline' | 'busy') => {
        await DeviceService.updateDeviceStatus(deviceId, status);
        this.broadcastDeviceList();
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);

        // Find and update device status
        for (const [deviceId, socketId] of this.deviceSockets.entries()) {
          if (socketId === socket.id) {
            await DeviceService.updateDeviceStatus(deviceId, 'offline');
            this.deviceSockets.delete(deviceId);
            break;
          }
        }

        this.broadcastDeviceList();
      });
    });
  }

  private async handleCastRequest(socket: Socket, castRequest: CastRequest): Promise<void> {
    try {
      const device = await DeviceService.getDeviceById(castRequest.deviceId);
      if (!device || device.status !== 'online') {
        socket.emit('error', 'Device not available');
        return;
      }

      // Send cast command to target device
      this.io?.to(`device:${castRequest.deviceId}`).emit('media:play', {
        mediaId: castRequest.mediaId,
        options: castRequest.options
      });

      // Update device status
      await DeviceService.updateDeviceStatus(castRequest.deviceId, 'busy');
      this.broadcastDeviceList();

      socket.emit('cast:success', {
        deviceId: castRequest.deviceId,
        mediaId: castRequest.mediaId
      });
    } catch (error) {
      console.error('Error handling cast request:', error);
      socket.emit('error', 'Failed to cast media');
    }
  }

  // NEW METHOD: Handle template cast request
  private async handleTemplateCastRequest(
    socket: Socket,
    templateCastRequest: {
      templateId: string;
      deviceId: string;
      template: Template;
      options?: any;
    }
  ): Promise<void> {
    try {
      const device = await DeviceService.getDeviceById(templateCastRequest.deviceId);
      if (!device || device.status !== 'online') {
        socket.emit('error', 'Device not available');
        return;
      }

      // Send template cast command to target device
      this.io?.to(`device:${templateCastRequest.deviceId}`).emit('template:play', {
        templateId: templateCastRequest.templateId,
        template: templateCastRequest.template,
        options: templateCastRequest.options || {
          autoplay: true,
          volume: 50,
          loop: false
        }
      });

      // Update device status
      await DeviceService.updateDeviceStatus(templateCastRequest.deviceId, 'busy');
      this.broadcastDeviceList();

      socket.emit('template:cast:success', {
        deviceId: templateCastRequest.deviceId,
        templateId: templateCastRequest.templateId,
        templateName: templateCastRequest.template.name
      });
    } catch (error) {
      console.error('Error handling template cast request:', error);
      socket.emit('error', 'Failed to cast template');
    }
  }

  castToDevice(deviceId: string, mediaFile: MediaFile, options?: any): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    this.io.to(`device:${deviceId}`).emit('media:play', mediaFile, options);
    return true;
  }

  // NEW METHOD: Cast template to device
  castTemplateToDevice(deviceId: string, template: Template, options?: any): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    console.log(`Casting template ${template.name} to device ${deviceId}`);

    // Send template to device with all necessary data
    this.io.to(`device:${deviceId}`).emit('template:play', {
      templateId: template.id,
      template: template,
      options: {
        autoplay: true,
        volume: 50,
        loop: false,
        ...options
      }
    });

    // Also emit to dashboard for real-time updates
    this.io.emit('template:cast:success', {
      deviceId,
      templateId: template.id,
      templateName: template.name,
      mediaName: template.name,
      options: options
    });

    return true;
  }

  // castPlaylist(deviceId: string, playlistData: any): boolean {
  //   if (!this.io) return false;

  //   const socketId = this.deviceSockets.get(deviceId);
  //   if (!socketId) return false;

  //   this.io.to(`device:${deviceId}`).emit('playlist:play', playlistData);
  //   return true;
  // }

  castPlaylist(deviceId: string, playlistData: any): boolean {
    if (!this.io) {
      console.error('[SOCKET] IO not initialized');
      return false;
    }

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) {
      console.error(`[SOCKET] Device ${deviceId} not connected (no socket)`);
      return false;
    }

    console.log(`[SOCKET] Casting playlist "${playlistData.name}" to device ${deviceId}`);
    console.log(`[SOCKET] Socket ID: ${socketId}`);
    console.log(`[SOCKET] Playlist items count: ${playlistData.items.length}`);
    console.log(`[SOCKET] First item:`, playlistData.items[0]);

    // Send to specific device
    this.io.to(`device:${deviceId}`).emit('playlist:play', playlistData);

    console.log('[SOCKET] ✅ playlist:play event emitted to device');

    // Emit success to dashboard
    this.io.emit('playlist:cast:success', {
      deviceId,
      playlistId: playlistData.playlistId,
      playlistName: playlistData.name
    });

    return true;
  }


  sendPlaybackControl(deviceId: string, control: PlaybackControl): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    this.io.to(`device:${deviceId}`).emit('playback:command', control);
    return true;
  }

  // NEW METHOD: Broadcast template update
  broadcastTemplateUpdate(action: 'created' | 'updated' | 'deleted', template?: Template): void {
    if (!this.io) return;

    this.io.emit('template:updated', {
      action,
      template
    });
  }

  // NEW METHOD: Send template stop command
  stopTemplate(deviceId: string): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    this.io.to(`device:${deviceId}`).emit('template:stop');
    return true;
  }

  // NEW METHOD: Get connected devices count
  getConnectedDevicesCount(): number {
    return this.deviceSockets.size;
  }

  // NEW METHOD: Check if device is connected
  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId);
  }

  private async broadcastDeviceList(): Promise<void> {
    if (!this.io) return;

    const devices = await DeviceService.getAllDevices();
    this.io.emit('devices:updated', devices);
  }

  private startHeartbeat(): void {
    // Mark offline devices every minute
    setInterval(async () => {
      await DeviceService.markOfflineDevices();
      this.broadcastDeviceList();
    }, 60000);

    // Log connection statistics every 5 minutes
    setInterval(() => {
      console.log(`Socket connections: ${this.deviceSockets.size} devices connected`);
    }, 5 * 60000);
  }
}