const mongoose = require("mongoose");
const { LocalProduct, LocalTransaction, LocalUser, localDbInstance } = require("./localDb");

let isMongoConnected = false;

const mongooseModels = {};

/**
 * Lazily loads and caches a Mongoose model definition.
 * Kept lazy so the app can boot in embedded mode even if a model file has issues.
 */
function loadMongooseModel(modelKey, modulePath) {
  if (!mongooseModels[modelKey]) {
    mongooseModels[modelKey] = require(modulePath);
  }
  return mongooseModels[modelKey];
}

async function connectDb(uri) {
  if (process.env.USE_LOCAL_DB === "true" || !uri || uri.trim() === "") {
    console.log("ℹ️ Running in Standalone Embedded Database Mode (Persistent JSON datastore).");
    isMongoConnected = false;
    return false;
  }

  try {
    console.log("⏳ Attempting to connect to MongoDB...");
    // Allow up to 10 seconds for the cloud SSL/TLS handshake
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    isMongoConnected = true;
    console.log("✅ MongoDB connected successfully");
    return true;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection unavailable (${err.message}).`);
    console.log("🚀 Falling back to Local Embedded Database (persistent at backend/data/db.json).");
    isMongoConnected = false;
    return false;
  }
}

function getDatabaseStatus() {
  return {
    type: isMongoConnected ? "MongoDB Atlas" : "Embedded Local Database",
    isConnected: true,
    storage: isMongoConnected ? "Remote Cluster" : "backend/data/db.json",
  };
}

/**
 * Uniform query proxy: resolves to the active Mongoose model when MongoDB is
 * connected, otherwise transparently proxies to the embedded local model.
 */
function createModelProxy(getLocal, getMongoose) {
  function ModelProxy(data) {
    if (isMongoConnected) {
      const MongooseModel = getMongoose();
      return new MongooseModel(data);
    }
    const LocalModel = getLocal();
    return new LocalModel(data);
  }

  return new Proxy(ModelProxy, {
    get(target, prop) {
      if (prop in target) return target[prop];
      const activeModel = isMongoConnected ? getMongoose() : getLocal();
      const value = activeModel[prop];
      if (typeof value === "function") {
        return value.bind(activeModel);
      }
      return value;
    },
  });
}

const Product = createModelProxy(
  () => LocalProduct,
  () => loadMongooseModel("Product", "../models/Product")
);

const Transaction = createModelProxy(
  () => LocalTransaction,
  () => loadMongooseModel("Transaction", "../models/Transaction")
);

const User = createModelProxy(
  () => LocalUser,
  () => loadMongooseModel("User", "../models/User")
);

module.exports = {
  connectDb,
  getDatabaseStatus,
  Product,
  Transaction,
  User,
  localDbInstance,
};
