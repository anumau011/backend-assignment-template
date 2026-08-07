const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

async function setupTestDb() {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      checkMD5: false,
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function teardownTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = {
  clearTestDb,
  setupTestDb,
  teardownTestDb,
};
