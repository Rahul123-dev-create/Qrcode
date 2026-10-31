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
  // Make sure the embedded datastore has finished seeding before we serve traffic,
  // so the very first request never observes an un-seeded (empty) store.
  await localDbInstance.ready;

  if (process.env.USE_LOCAL_DB === "true" || !uri || String(uri).trim() === "") {
    console.log("ℹ️ Running in Standalone Embedded Database Mode (Persistent JSON datastore).");
    isMongoConnected = false;
    return false;
  }

  try {
    console.log("⏳ Attempting to connect to MongoDB...");
    mongoose.set("strictQuery", false);
    await Promise.race([
      mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 5000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connect timeout")), 2500)
      ),
    ]);

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
