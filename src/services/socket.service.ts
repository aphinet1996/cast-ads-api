import { Server as SocketIOServer, Socket } from 'socket.io';
import { DeviceService } from './device.service';
import { PlaybackControl } from '../types';

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;
  private deviceSockets: Map<string, string> = new Map();
  private registeredDevices: Set<string> = new Set();

  private lastCommands: Map<string, { action: string; timestamp: number }> = new Map();
  private readonly COMMAND_DEBOUNCE_MS = 1000; // 1 วินาที


  private lastCastEvents: Map<string, { mediaId: string; timestamp: number }> = new Map();
  private readonly CAST_DEBOUNCE_MS = 2000; // ป้องกัน duplicate cast ภายใน 2 วินาที

  // ✅ Single debounce timer for all broadcast operations
  private deviceUpdateTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 1000; // 300ms debounce

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupEventHandlers();
    this.startStimulate();
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`[SOCKET] Connected: ${socket.id}`);

      // Device registration
      socket.on('device:register', async (deviceInfo) => {
        try {
          // ✅ Check if already registered with same socket
          if (this.registeredDevices.has(deviceInfo.deviceId)) {
            const existingSocketId = this.deviceSockets.get(deviceInfo.deviceId);
            if (existingSocketId === socket.id) {
              console.log(`[SOCKET] Device ${deviceInfo.deviceId} already registered, skipping`);
              return;
            }
            if (existingSocketId && existingSocketId !== socket.id) {
              console.log(`[SOCKET] Device ${deviceInfo.deviceId} switching socket`);
              this.deviceSockets.delete(deviceInfo.deviceId);
            }
          }

          const device = await DeviceService.registerDevice({
            ...deviceInfo,
            socketId: socket.id
          });

          this.deviceSockets.set(device.deviceId, socket.id);
          this.registeredDevices.add(device.deviceId);
          socket.join(`device:${device.deviceId}`);

          console.log(`[SOCKET] Device registered: ${device.deviceName}`);

          // ✅ Use debounced broadcast
          this.broadcastDeviceListDebounced();

          socket.emit('device:register', { success: true, device });
        } catch (error) {
          console.error('[SOCKET] Registration error:', error);
          socket.emit('error', 'Failed to register device');
        }
      });

      // Device stimulate
      socket.on('device:stimulate', async (deviceId: string) => {
        await DeviceService.updateDeviceStatus(deviceId, 'online', socket.id);
        this.deviceSockets.set(deviceId, socket.id);
      });

      // Playback control
      socket.on('playback:control', (deviceId: string, control: PlaybackControl) => {
        this.sendPlaybackControl(deviceId, control);
      });

      // Device status update
      socket.on('device:status', async (deviceId: string, status: 'online' | 'offline' | 'busy') => {
        await DeviceService.updateDeviceStatus(deviceId, status);
        // ✅ Use debounced broadcast to prevent spam
        this.broadcastDeviceListDebounced();
      });

      // Handle disconnection
      // socket.on('disconnect', async () => {
      //   console.log(`[SOCKET] Disconnected: ${socket.id}`);

      //   for (const [deviceId, socketId] of this.deviceSockets.entries()) {
      //     if (socketId === socket.id) {
      //       // Give time to reconnect before marking offline
      //       setTimeout(async () => {
      //         if (!this.deviceSockets.has(deviceId) || this.deviceSockets.get(deviceId) === socket.id) {
      //           await DeviceService.updateDeviceStatus(deviceId, 'offline');
      //           this.deviceSockets.delete(deviceId);
      //           this.registeredDevices.delete(deviceId);
      //           this.broadcastDeviceListDebounced();
      //         }
      //       }, 5000);
      //       break;
      //     }
      //   }
      // });
      socket.on('disconnect', async () => {
        console.log(`[SOCKET] Disconnected: ${socket.id}`);

        for (const [deviceId, socketId] of this.deviceSockets.entries()) {
          if (socketId === socket.id) {
            // ✅ Clear last cast tracking
            this.clearLastCast(deviceId);

            // Give time to reconnect before marking offline
            setTimeout(async () => {
              if (!this.deviceSockets.has(deviceId) || this.deviceSockets.get(deviceId) === socket.id) {
                await DeviceService.updateDeviceStatus(deviceId, 'offline');
                this.deviceSockets.delete(deviceId);
                this.registeredDevices.delete(deviceId);
                this.broadcastDeviceListDebounced();
              }
            }, 5000);
            break;
          }
        }
      });
    });
  }

  private broadcastDeviceListDebounced(): void {
    if (this.deviceUpdateTimer) {
      clearTimeout(this.deviceUpdateTimer);
    }

    console.log('[SOCKET] Broadcast triggered by: register')

    this.deviceUpdateTimer = setTimeout(async () => {
      if (!this.io) return;

      const devices = await DeviceService.getAllDevices();
      this.io.emit('devices:updated', devices);
      console.log('[SOCKET] 📡 Broadcasted device update (debounced)');
    }, this.DEBOUNCE_MS);
  }

  // Playlist cast
  castPlaylist(deviceId: string, playlistData: any): boolean {
    if (!this.io) {
      console.error('[SOCKET] IO not initialized');
      return false;
    }

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) {
      console.error(`[SOCKET] Device ${deviceId} not connected`);
      return false;
    }

    console.log(`[SOCKET] Casting playlist "${playlistData.name}" to device ${deviceId}`);

    this.io.to(`device:${deviceId}`).emit('playlist:play', playlistData);

    // Emit success
    this.io.emit('playlist:cast:success', {
      deviceId,
      playlistId: playlistData.playlistId,
      playlistName: playlistData.name
    });

    return true;
  }

  // Playback control
  // async sendPlaybackControl(deviceId: string, control: PlaybackControl): Promise<boolean> {
  //   if (!this.io) return false;

  //   const socketId = this.deviceSockets.get(deviceId);
  //   if (!socketId) return false;

  //   try {
  //     // If stop, clear in DB
  //     if (control.action === 'stop') {
  //       await DeviceService.clearDeviceCurrentMedia(deviceId, true);
  //       this.broadcastDeviceListDebounced();
  //     }

  //     this.io.to(`device:${deviceId}`).emit('playback:command', control);
  //     return true;
  //   } catch (error) {
  //     console.error('[SOCKET] Playback control error:', error);
  //     return false;
  //   }
  // }

  async sendPlaybackControl(deviceId: string, control: PlaybackControl): Promise<boolean> {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) return false;

    try {
      // ✅ ป้องกัน duplicate commands
      const lastCommand = this.lastCommands.get(deviceId);
      const now = Date.now();

      if (lastCommand) {
        const timeSinceLastCommand = now - lastCommand.timestamp;
        const isSameAction = lastCommand.action === control.action;

        if (isSameAction && timeSinceLastCommand < this.COMMAND_DEBOUNCE_MS) {
          console.log(`[SOCKET] ⚠️ Duplicate ${control.action} command detected for ${deviceId}, skipping`);
          return true;
        }
      }

      // บันทึก command ล่าสุด
      this.lastCommands.set(deviceId, {
        action: control.action,
        timestamp: now
      });

      // If stop, clear in DB and clear last cast
      if (control.action === 'stop') {
        await DeviceService.clearDeviceCurrentMedia(deviceId, true);
        this.clearLastCast(deviceId);
        this.broadcastDeviceListDebounced();
      }

      this.io.to(`device:${deviceId}`).emit('playback:command', control);
      console.log(`[SOCKET] 🎮 Sent ${control.action} command to ${deviceId}`);
      return true;
    } catch (error) {
      console.error('[SOCKET] Playback control error:', error);
      return false;
    }
  }

  // Get connected devices count
  getConnectedDevicesCount(): number {
    return this.deviceSockets.size;
  }

  // Check if device is connected
  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId);
  }

  // Broadcast generic event
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  // ✅ Periodic maintenance
  private startStimulate(): void {
    // Mark offline devices every minute
    setInterval(async () => {
      await DeviceService.markOfflineDevices();
      // ✅ Use debounced broadcast to prevent spam
      this.broadcastDeviceListDebounced();
    }, 60000);

    // Log statistics
    setInterval(() => {
      console.log(`[SOCKET] Connected devices: ${this.deviceSockets.size}`);
    }, 5 * 60000);
  }

  // // ✅ Send event directly to device (used by REST API)
  // emitToDevice(deviceId: string, event: string, data: any): boolean {
  //   if (!this.io) return false;

  //   const socketId = this.deviceSockets.get(deviceId);
  //   if (!socketId) {
  //     console.error(`[SOCKET] Device ${deviceId} not connected`);
  //     return false;
  //   }

  //   // ✅ Send ONCE
  //   this.io.to(`device:${deviceId}`).emit(event, data);
  //   console.log(`[SOCKET] ✅ Emitted ${event} to device ${deviceId}`);
  //   return true;
  // }

  emitToDevice(deviceId: string, event: string, data: any): boolean {
    if (!this.io) return false;

    const socketId = this.deviceSockets.get(deviceId);
    if (!socketId) {
      console.error(`[SOCKET] Device ${deviceId} not connected`);
      return false;
    }

    // ✅ ป้องกัน duplicate media:play events
    if (event === 'media:play') {
      const lastCast = this.lastCastEvents.get(deviceId);
      const now = Date.now();
      const mediaId = data.mediaId || data.mediaFile?.mediaId;

      if (lastCast) {
        const timeSinceLastCast = now - lastCast.timestamp;
        const isSameMedia = lastCast.mediaId === mediaId;

        // ถ้าเป็น media เดิมและยังไม่ถึง 2 วินาที ให้ skip
        if (isSameMedia && timeSinceLastCast < this.CAST_DEBOUNCE_MS) {
          console.log(`[SOCKET] ⚠️ Duplicate media:play detected for ${deviceId}, skipping`);
          return true; // Return true เพื่อไม่ให้ API error
        }
      }

      // บันทึก cast event ล่าสุด
      this.lastCastEvents.set(deviceId, {
        mediaId,
        timestamp: now
      });

      console.log(`[SOCKET] ✅ Emitting media:play to ${deviceId} (mediaId: ${mediaId})`);
    }

    // ส่ง event ไปยัง device
    this.io.to(`device:${deviceId}`).emit(event, data);
    console.log(`[SOCKET] 📤 Emitted ${event} to device ${deviceId}`);
    return true;
  }

  clearLastCast(deviceId: string): void {
    this.lastCastEvents.delete(deviceId);
    console.log(`[SOCKET] 🧹 Cleared last cast for device ${deviceId}`);
  }

  // ✅ Public method for manual broadcast (used by REST API)
  async broadcastDeviceUpdate(): Promise<void> {
    this.broadcastDeviceListDebounced();
  }

  // ✅ DEPRECATED: Remove duplicate castToDevice method
  // This is now handled by REST API + emitToDevice()
  /*
  async castToDevice(deviceId: string, mediaFile: MediaFile, options?: any): Promise<boolean> {
    // ❌ This method creates duplicate emissions
    // Use REST API endpoint instead
  }
  */
}