import { Server as SocketIOServer, Socket } from 'socket.io';
import { DeviceService } from './device.service';
import { MediaFile, PlaybackControl, CastRequest } from '../types';

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

          console.log(`Device registered: ${device.name} (${device.deviceId})`);

          // Broadcast updated device list
          this.broadcastDeviceList();

          socket.emit('device:registered', { success: true, device });
        } catch (error) {
          console.error('Error registering device:', error);
          socket.emit('error', 'Failed to register device');
        }
      });

      // Device heartbeat
      socket.on('device:heartbeat', async (deviceId: string) => {
        await DeviceService.updateDeviceStatus(deviceId, 'online', socket.id);
        this.deviceSockets.set(deviceId, socket.id);
      });

      // Cast media
      socket.on('media:cast', async (castRequest: CastRequest) => {
        this.handleCastRequest(socket, castRequest);
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

      socket.emit('cast:success', { deviceId: castRequest.deviceId });
    } catch (error) {
      console.error('Error handling cast request:', error);
      socket.emit('error', 'Failed to cast media');
    }
  }

  // castToDevice(deviceId: string, mediaFile: MediaFile, options?: any): boolean {
  //   if (!this.io) return false;

  //   const socketId = this.deviceSockets.get(deviceId);
  //   if (!socketId) return false;

  //   this.io.to(`device:${deviceId}`).emit('media:play', mediaFile, options);
  //   return true;
  // }
  castToDevice(deviceId: string, mediaFile: MediaFile, options?: any): boolean {
    console.log('🔌 SocketManager.castToDevice called');
    console.log('Target device:', deviceId);
    console.log('Media file:', mediaFile.name);
    console.log('Options:', options);

    if (!this.io) {
      console.log('❌ WebSocket server not initialized');
      return false;
    }

    const socketId = this.deviceSockets.get(deviceId);
    console.log('Device socket ID:', socketId);

    if (!socketId) {
      console.log('❌ Device socket not found in deviceSockets map');
      console.log('Available devices:', Array.from(this.deviceSockets.keys()));
      return false;
    }

    try {
      console.log('📡 Sending cast command to device...');
      this.io.to(`device:${deviceId}`).emit('media:play', mediaFile, options);
      console.log('✅ Cast command sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending cast command:', error);
      return false;
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.deviceSockets.keys());
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId);
  }

  sendPlaybackControl(deviceId: string, control: PlaybackControl): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    this.io.to(`device:${deviceId}`).emit('playback:command', control);
    return true;
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
  }
}