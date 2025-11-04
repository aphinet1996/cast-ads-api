// import mongoose from 'mongoose';

// export const connectDatabase = async (): Promise<void> => {
//     try {
//         const mongoUri = process.env.MONGODB_URI!;
//         await mongoose.connect(mongoUri);
//         console.log('Connected to MongoDB');
//     } catch (error) {
//         console.error('MongoDB connection error:', error);
//         process.exit(1);
//     }
// };

// import mongoose from 'mongoose';

// export const connectDatabase = async (): Promise<void> => {
//     try {
//         const mongoUri = process.env.MONGODB_URI;

//         if (!mongoUri) {
//             throw new Error('MONGODB_URI is not defined in environment variables');
//         }

//         console.log('Connecting to MongoDB...');

//         await mongoose.connect(mongoUri, {
//             // MongoDB connection options
//             maxPoolSize: 10,
//             serverSelectionTimeoutMS: 5000,
//             socketTimeoutMS: 45000,
//         });

//         console.log('✅ Connected to MongoDB successfully');

//     } catch (error) {
//         console.error('❌ MongoDB connection error:', error);
//         process.exit(1);
//     }
// };

// // เพิ่ม connection events
// mongoose.connection.on('error', (err) => {
//     console.error('MongoDB connection error:', err);
// });

// mongoose.connection.on('disconnected', () => {
//     console.log('MongoDB disconnected');
// });

// mongoose.connection.on('reconnected', () => {
//     console.log('MongoDB reconnected');
// });

import mongoose from 'mongoose';

const mongooseOptions: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        console.log('Connecting to MongoDB...');

        const connection = await mongoose.connect(mongoUri, mongooseOptions);

        console.log('Connected to MongoDB successfully');

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.info('MongoDB reconnected');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            process.exit(0);
        });

        return connection;

    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // process.exit(1);
        throw error;
    }
};

export const closeDB = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        console.info('MongoDB connection closed');
    } catch (error: any) {
        console.error(`Error closing MongoDB connection: ${error.message}`);
        throw error;
    }
};

export default mongoose;