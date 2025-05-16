import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/testme';

// Define the cache interface
interface MongooseConnection {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

// Use a simple object instead of global
const globalCache: { mongooseConnection?: MongooseConnection } = {};

if (!globalCache.mongooseConnection) {
  globalCache.mongooseConnection = { conn: null, promise: null };
}

async function dbConnect() {
  if (globalCache.mongooseConnection?.conn) {
    return globalCache.mongooseConnection.conn;
  }

  if (!globalCache.mongooseConnection?.promise) {
    const opts = {
      bufferCommands: false,
    };

    globalCache.mongooseConnection!.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Connected to MongoDB');
        globalCache.mongooseConnection!.conn = mongoose.connection;
        return mongoose.connection;
      })
      .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        throw error;
      });
  }

  try {
    const connection = await globalCache.mongooseConnection!.promise;
    return connection;
  } catch (error) {
    throw error;
  }
}

export default dbConnect; 