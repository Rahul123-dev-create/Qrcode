const mongoos = require("mongoose");
const { LocalProduct, LocalTransaction, LocalUser, localDbInstance } = require("./localDb");

let isMongoConnected = false;

let MongooseProduct = null;
let MongooseTransaction = null;
let MongooseUser = null;

try{
    MongooseProduct = require("../models/Product");
    MongooseTransaction=require("..models/Transaction");
    MongooseUser = require("../models/User");
}catch(e){
    //Models loaded on demand
}
async function connectDb(uri){
    if(process.env.USE_LOCAL_DB == "true" || !uri || uri.trim() === ""){
        console.log("ℹ️ Running in Standalone Embedded Database Mode (Persistent JSON datastore).");
        isMongoConnected =false;
        return false;
    }
    try{
        console.log("⏳ Attempting to connect to MongoDB...");
        await Promise.race([
            mongoose.connect(uri,{
                serverSelectionTimeoutMS: 2000,
                socketTimeoutMS:5000,
            }),
            new Promise((_, reject) =>
                setTimeout(() =>reject (new Error("Connect timeout")), 2500)
            ),
        ]);

        isMongoConnected = true;
        console.log("✅ MongoDB Connecetd succesfully");
        return true;
    }catch(err){
        console.warn(`⚠️ MongoDB connection unavailable (${err.message}).`);
        console.log("🚀 Fallingback to local Embedded Database (persistent at backend/data/db.json).");
        isMongoConnected = false;
        return false;
    }
}
function getDatabaseStatus(){
    return{
        type: isMongoConnected ? "MongoDB Atlas" : "Embedded Local Database",
        isConnected: true,
        storage: isMongoConnected ? "Remote Cluster": "backend/data/db.json",
    };
}

function createModelProxy(getName, getLocal, getMongoose){
    function ModelProxy(data){
        if(isMongoConnected && getMongoose()){
            const M =getMongoose();
            return new M(data);
        }
        const L =getLocal();
        return new L(data);
    }

    return new Proxy(ModelProxy, {
        get(target, prop){
            if(prop in target) return target[prop];
            const activeModel = isMongoConnected && getMongoose() ? getMongoose() :getLocal();
            const val = activeModel[prop];
            if(typeof val ==="function"){
                return val.bind(activeModel);
            }
            return val;
        },
    });
}

const Product = createModelProxy(
    ()=> "Product",
    ()=> LocalProduct,
    ()=> MongooseProduct || require("../models/Product")
);

const Transaction = createModelProxy(
    () => "Transaction",
    () => LocalTransaction,
    () => MongooseTransaction || require("../models/Transaction")
);

const User = createModelProxy(
    () => "User",
    () => LocalUser,
    () => MongooseUser || require("../models/User")
);

module.exports = {
    connectDb,
    getDatabaseStatus,
    Product,
    Transaction,
    User,
    localDbInstance,
};
