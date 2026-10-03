const mongoose = require('mongoose');
const { createAdapter } = require('@socket.io/mongo-adapter');

const configuredServers = new WeakSet();

const configureRealtimeAdapter = async (io) => {
  if (configuredServers.has(io)) return;
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB must be connected before configuring real-time events.');

  const collection = database.collection('socket.io-adapter-events');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
  io.adapter(createAdapter(collection, { addCreatedAtField: true }));
  configuredServers.add(io);
};

module.exports = { configureRealtimeAdapter };
