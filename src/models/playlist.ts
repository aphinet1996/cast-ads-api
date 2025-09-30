import mongoose, { Schema, Document } from 'mongoose';

export interface PlaylistItem {
  mediaId: string;
  duration: number;
  transition: 'fade' | 'slide' | 'none';
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  loop: boolean;
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PlaylistDocument extends Document {
  playlistId: string;
  name: string;
  items: PlaylistItem[];
  loop: boolean;
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

const playlistItemSchema = new Schema<PlaylistItem>({
  mediaId: { 
    type: String, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 1,
    max: 300
  },
  transition: { 
    type: String, 
    enum: ['fade', 'slide', 'none'], 
    default: 'fade' 
  }
}, { _id: false });

const playlistSchema = new Schema<PlaylistDocument>({
  playlistId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 255
  },
  items: {
    type: [playlistItemSchema],
    validate: {
      validator: (items: PlaylistItem[]) => items.length > 0,
      message: 'Playlist must have at least one item'
    }
  },
  loop: { 
    type: Boolean, 
    default: true 
  },
  totalDuration: { 
    type: Number, 
    required: true,
    min: 1
  }
}, {
  timestamps: true,
  collection: 'playlists'
});

playlistSchema.index({ name: 1 });
playlistSchema.index({ createdAt: -1 });

export const PlaylistModel = mongoose.model<PlaylistDocument>('Playlist', playlistSchema);