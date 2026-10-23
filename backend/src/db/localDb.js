const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function generateId() {
  return crypto.randomBytes(12).toString("hex");
}

class QueryChain {
  constructor(items, isSingle = false) {
    this._items = items;
    this._isSingle = isSingle;
    this._sortField = null;
    this._sortOrder = -1;
    this._skip = 0;
    this._limit = null;
    this._populates = [];
    this._selectedFields = null;
  }

  sort(sortObj) {
    if (sortObj && typeof sortObj === "object") {
      const field = Object.keys(sortObj)[0];
      this._sortField = field;
      this._sortOrder = sortObj[field] === 1 || sortObj[field] === "asc" ? 1 : -1;
    }
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n);
    return this;
  }

  populate(field, selectStr = "") {
    this._populates.push({ field, selectStr });
    return this;
  }

  select(selectStr) {
    if (typeof selectStr === "string") {
      this._selectedFields = selectStr.split(/\s+/).filter(Boolean);
    }
    return this;
  }

  _execute(db) {
    let result = [...this._items];

    if (this._sortField) {
      result.sort((a, b) => {
        let valA = a[this._sortField];
        let valB = b[this._sortField];
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();
        if (valA < valB) return -1 * this._sortOrder;
        if (valA > valB) return 1 * this._sortOrder;
        return 0;
      });
    }

    if (this._skip > 0) {
      result = result.slice(this._skip);
    }

    if (this._limit !== null && this._limit !== undefined && this._limit >= 0) {
      result = result.slice(0, this._limit);
    }

    if (this._populates.length > 0) {
      result = result.map((item) => {
        const cloned = { ...item };
        for (const pop of this._populates) {
          if (pop.field === "product") {
            const prod = db.products.find((p) => String(p._id) === String(item.product));
            if (prod) {
              cloned.product = {
                _id: prod._id,
                sku: prod.sku,
                name: prod.name,
                category: prod.category,
                unit: prod.unit,
                price: prod.price,
                quantity: prod.quantity,
                status: prod.status,
              };
            }
          } else if (pop.field === "user") {
            const usr = db.users.find((u) => String(u._id) === String(item.user));
            if (usr) {
              cloned.user = {
                _id: usr._id,
                username: usr.username,
                name: usr.name,
                role: usr.role,
              };
            }
          }
        }
        return cloned;
      });
    }

    if (this._selectedFields) {
      const exclude = this._selectedFields.some((f) => f.startsWith("-"));
      result = result.map((item) => {
        const out = { ...item };
        if (exclude) {
          for (const f of this._selectedFields) {
            if (f.startsWith("-")) delete out[f.substring(1)];
          }
        } else {
          const filtered = { _id: item._id };
          for (const f of this._selectedFields) {
            if (item[f] !== undefined) filtered[f] = item[f];
          }
          return filtered;
        }
        return out;
      });
    }

    const wrapped = result.map((doc) => db.wrapDocument(doc));
    return this._isSingle ? (wrapped[0] || null) : wrapped;
  }

  then(resolve, reject) {
    try {
      const data = this._execute(LocalDb.instance);
      resolve(data);
    } catch (err) {
      reject(err);
    }
  }

  catch(reject) {
    return this.then(null, reject);
  }
}

class LocalDb {
  constructor() {
    this.users = [];
    this.products = [];
    this.transactions = [];
    LocalDb.instance = this;
    this.load();
  }

  load() {
    try {
      ensureDirectoryExists(DB_FILE);
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const data = JSON.parse(content);
        this.users = data.users || [];
        this.products = data.products || [];
        this.transactions = data.transactions || [];
        if (this.products.length === 0) {
          this.seed();
        }
      } else {
        this.seed();
      }
    } catch (err) {
      console.warn("Could not load local db file, seeding fresh:", err.message);
      this.seed();
    }
  }

  persist() {
    try {
      ensureDirectoryExists(DB_FILE);
      const data = {
        users: this.users,
        products: this.products,
        transactions: this.transactions,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist local db:", err);
    }
  }

  seed() {
    this.users = [
      {
        _id: "657000000000000000000001",
        _type: "User",
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        name: "Warehouse Admin",
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "657000000000000000000002",
        _type: "User",
        username: "operator",
        password: bcrypt.hashSync("operator123", 10),
        name: "Floor Operator",
        role: "operator",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sampleProducts = [
      {
        _id: "657100000000000000000001",
        _type: "Product",
        sku: "BISCUIT-001",
        name: "Parle-G Gold Biscuits (1kg Pack)",
        description: "Classic glucose biscuits pack, 1kg family pack",
        category: "Groceries",
        unit: "packs",
        price: 80,
        quantity: 10,
        lowStockThreshold: 5,
        status: "active",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "657100000000000000000002",
        _type: "Product",
        sku: "BISCUIT-002",
        name: "Britannia Bourbon Chocolate Biscuits",
        description: "Chocolate cream filled sandwich biscuits, 150g",
        category: "Groceries",
        unit: "packs",
        price: 35,
        quantity: 25,
        lowStockThreshold: 10,
        status: "active",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "657100000000000000000003",
        _type: "Product",
        sku: "TEA-101",
        name: "Tata Tea Premium Leaf (500g)",
        description: "Desh ki Chai strong blend leaf tea",
        category: "Beverages",
        unit: "packs",
        price: 210,
        quantity: 12,
        lowStockThreshold: 4,
        status: "active",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "657100000000000000000004",
        _type: "Product",
        sku: "MILK-201",
        name: "Amul Taaza Homogenised Milk (1L)",
        description: "Toned UHT treated long life milk carton",
        category: "Dairy",
        unit: "cartons",
        price: 54,
        quantity: 3,
        lowStockThreshold: 5,
        status: "active",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "657100000000000000000005",
        _type: "Product",
        sku: "CHOC-301",
        name: "Cadbury Dairy Milk Silk Chocolate (150g)",
        description: "Smooth milk chocolate bar",
        category: "Confectionery",
        unit: "bars",
        price: 95,
        quantity: 0,
        lowStockThreshold: 6,
        status: "active",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const prod of sampleProducts) {
      const payload = JSON.stringify({ id: prod._id, sku: prod.sku, name: prod.name });
      prod.qrCode = QRCode.toDataURL(payload, { width: 300, margin: 2 });
    }

    Promise.all(sampleProducts.map((p) => p.qrCode)).then((urls) => {
      sampleProducts.forEach((p, idx) => {
        p.qrCode = urls[idx];
      });

      this.products = sampleProducts;

      this.transactions = [
        {
          _id: "657200000000000000000001",
          _type: "Transaction",
          product: "657100000000000000000001",
          type: "inward",
          quantity: 10,
          previousQuantity: 0,
          newQuantity: 10,
          notes: "Initial inventory batch",
          user: "657000000000000000000001",
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          _id: "657200000000000000000002",
          _type: "Transaction",
          product: "657100000000000000000002",
          type: "inward",
          quantity: 30,
          previousQuantity: 0,
          newQuantity: 30,
          notes: "Supplier shipment #PO-4412",
          user: "657000000000000000000001",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          _id: "657200000000000000000003",
          _type: "Transaction",
          product: "657100000000000000000002",
          type: "outward",
          quantity: 5,
          previousQuantity: 30,
          newQuantity: 25,
          notes: "Retail counter dispatch",
          user: "657000000000000000000002",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: "657200000000000000000004",
          _type: "Transaction",
          product: "657100000000000000000004",
          type: "inward",
          quantity: 15,
          previousQuantity: 0,
          newQuantity: 15,
          notes: "Dairy supply morning delivery",
          user: "657000000000000000000001",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          _id: "657200000000000000000005",
          _type: "Transaction",
          product: "657100000000000000000004",
          type: "outward",
          quantity: 12,
          previousQuantity: 15,
          newQuantity: 3,
          notes: "Daily store distribution",
          user: "657000000000000000000002",
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ];

      this.persist();
    });
  }

  matchQuery(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const key of Object.keys(query)) {
      if (key === "$or" && Array.isArray(query.$or)) {
        const matchesAny = query.$or.some((subQuery) => this.matchQuery(doc, subQuery));
        if (!matchesAny) return false;
        continue;
      }

      if (key === "$expr") {
        continue;
      }

      const queryVal = query[key];
      const docVal = doc[key];

      if (queryVal instanceof RegExp) {
        if (!queryVal.test(String(docVal || ""))) return false;
      } else if (typeof queryVal === "object" && queryVal !== null) {
        if (queryVal.$ne !== undefined) {
          if (String(docVal) === String(queryVal.$ne)) return false;
        }
        if (queryVal.$in !== undefined && Array.isArray(queryVal.$in)) {
          if (!queryVal.$in.map(String).includes(String(docVal))) return false;
        }
        if (queryVal.$gt !== undefined) {
          if (!(Number(docVal) > Number(queryVal.$gt))) return false;
        }
        if (queryVal.$gte !== undefined) {
          const target = queryVal.$gte instanceof Date ? queryVal.$gte.getTime() : Number(queryVal.$gte);
          const current = docVal instanceof Date || typeof docVal === "string" ? new Date(docVal).getTime() : Number(docVal);
          if (!(current >= target)) return false;
        }
        if (queryVal.$lte !== undefined) {
          const target = queryVal.$lte instanceof Date ? queryVal.$lte.getTime() : Number(queryVal.$lte);
          const current = docVal instanceof Date || typeof docVal === "string" ? new Date(docVal).getTime() : Number(docVal);
          if (!(current <= target)) return false;
        }
      } else {
        if (String(docVal) !== String(queryVal)) return false;
      }
    }

    return true;
  }

  wrapDocument(doc) {
    if (!doc) return null;
    const db = this;

    const wrapped = {
      ...doc,
      toObject: function () {
        const copy = { ...this };
        delete copy.save;
        delete copy.toObject;
        delete copy.comparePassword;
        delete copy.populate;
        return copy;
      },
      save: async function () {
        this.updatedAt = new Date().toISOString();
        const idStr = String(this._id);
        const cleanCopy = { ...this };
        delete cleanCopy.save;
        delete cleanCopy.toObject;
        delete cleanCopy.comparePassword;
        delete cleanCopy.populate;

        if (this._type === "Product" || this.sku !== undefined) {
          cleanCopy._type = "Product";
          const idx = db.products.findIndex((p) => String(p._id) === idStr);
          if (idx >= 0) db.products[idx] = cleanCopy;
          else db.products.push(cleanCopy);
        } else if (this._type === "Transaction" || (this.previousQuantity !== undefined && this.newQuantity !== undefined)) {
          cleanCopy._type = "Transaction";
          const idx = db.transactions.findIndex((t) => String(t._id) === idStr);
          if (idx >= 0) db.transactions[idx] = cleanCopy;
          else db.transactions.push(cleanCopy);
        } else if (this._type === "User" || this.username !== undefined) {
          cleanCopy._type = "User";
          if (cleanCopy.password && !cleanCopy.password.startsWith("$2a$") && !cleanCopy.password.startsWith("$2b$")) {
            cleanCopy.password = await bcrypt.hash(cleanCopy.password, 10);
            this.password = cleanCopy.password;
          }
          const idx = db.users.findIndex((u) => String(u._id) === idStr);
          if (idx >= 0) db.users[idx] = cleanCopy;
          else db.users.push(cleanCopy);
        }
        db.persist();
        return this;
      },
      comparePassword: async function (candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      populate: async function (field, selectStr) {
        if (field === "product") {
          const prod = db.products.find((p) => String(p._id) === String(this.product));
          if (prod) {
            this.product = {
              _id: prod._id,
              sku: prod.sku,
              name: prod.name,
              category: prod.category,
              unit: prod.unit,
              price: prod.price,
              quantity: prod.quantity,
              status: prod.status,
            };
          }
        } else if (field === "user") {
          const usr = db.users.find((u) => String(u._id) === String(this.user));
          if (usr) {
            this.user = {
              _id: usr._id,
              username: usr.username,
              name: usr.name,
              role: usr.role,
            };
          }
        }
        return this;
      },
    };

    return wrapped;
  }

  createProductModel() {
    const db = this;
    function Product(data = {}) {
      this._id = data._id || generateId();
      this._type = "Product";
      this.sku = data.sku ? data.sku.toUpperCase().trim() : "";
      this.name = data.name ? data.name.trim() : "";
      this.description = data.description || "";
      this.category = data.category || "General";
      this.unit = data.unit || "units";
      this.price = Number(data.price) || 0;
      this.quantity = Number(data.quantity) || 0;
      this.lowStockThreshold = data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : 10;
      this.status = data.status || "active";
      this.deletedAt = data.deletedAt || null;
      this.deletedBy = data.deletedBy || null;
      this.qrCode = data.qrCode || "pending";
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
      return db.wrapDocument(this);
    }

    Product.find = (query = {}) => {
      const items = db.products.filter((p) => db.matchQuery(p, query));
      return new QueryChain(items, false);
    };

    Product.findById = (id) => {
      const item = db.products.find((p) => String(p._id) === String(id));
      return new QueryChain(item ? [item] : [], true);
    };

    Product.findOne = (query = {}) => {
      const item = db.products.find((p) => db.matchQuery(p, query));
      return new QueryChain(item ? [item] : [], true);
    };

    Product.countDocuments = async (query = {}) => {
      return db.products.filter((p) => db.matchQuery(p, query)).length;
    };

    Product.findByIdAndDelete = async (id) => {
      const idx = db.products.findIndex((p) => String(p._id) === String(id));
      if (idx >= 0) {
        const removed = db.products.splice(idx, 1)[0];
        db.persist();
        return db.wrapDocument(removed);
      }
      return null;
    };

    return Product;
  }

  createTransactionModel() {
    const db = this;
    function Transaction(data = {}) {
      this._id = data._id || generateId();
      this._type = "Transaction";
      this.product = data.product;
      this.type = data.type;
      this.quantity = Number(data.quantity);
      this.previousQuantity = Number(data.previousQuantity);
      this.newQuantity = Number(data.newQuantity);
      this.notes = data.notes || "";
      this.user = data.user;
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
      return db.wrapDocument(this);
    }

    Transaction.find = (query = {}) => {
      const items = db.transactions.filter((t) => db.matchQuery(t, query));
      return new QueryChain(items, false);
    };

    Transaction.findById = (id) => {
      const item = db.transactions.find((t) => String(t._id) === String(id));
      return new QueryChain(item ? [item] : [], true);
    };

    Transaction.countDocuments = async (query = {}) => {
      return db.transactions.filter((t) => db.matchQuery(t, query)).length;
    };

    Transaction.aggregate = async (pipeline = []) => {
      let result = [...db.transactions];
      for (const stage of pipeline) {
        if (stage.$match) {
          result = result.filter((t) => db.matchQuery(t, stage.$match));
        }
        if (stage.$group) {
          const groups = {};
          const groupKey = stage.$group._id === "$type" ? "type" : stage.$group._id;
          for (const item of result) {
            const key = item[groupKey] || "other";
            if (!groups[key]) {
              groups[key] = { _id: key, count: 0, totalQuantity: 0 };
            }
            groups[key].count += 1;
            groups[key].totalQuantity += item.quantity || 0;
          }
          result = Object.values(groups);
        }
      }
      return result;
    };

    return Transaction;
  }

  createUserModel() {
    const db = this;
    function User(data = {}) {
      this._id = data._id || generateId();
      this._type = "User";
      this.username = data.username ? data.username.toLowerCase().trim() : "";
      this.password = data.password || "";
      this.name = data.name || (this.username.charAt(0).toUpperCase() + this.username.slice(1));
      this.role = data.role || "operator";
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
      return db.wrapDocument(this);
    }

    User.find = (query = {}) => {
      const items = db.users.filter((u) => db.matchQuery(u, query));
      return new QueryChain(items, false);
    };

    User.findById = (id) => {
      const item = db.users.find((u) => String(u._id) === String(id));
      return new QueryChain(item ? [item] : [], true);
    };

    User.findOne = (query = {}) => {
      const item = db.users.find((u) => db.matchQuery(u, query));
      return new QueryChain(item ? [item] : [], true);
    };

    User.countDocuments = async (query = {}) => {
      return db.users.filter((u) => db.matchQuery(u, query)).length;
    };

    User.findByIdAndDelete = async (id) => {
      const idx = db.users.findIndex((u) => String(u._id) === String(id));
      if (idx >= 0) {
        const removed = db.users.splice(idx, 1)[0];
        db.persist();
        return db.wrapDocument(removed);
      }
      return null;
    };

    return User;
  }
}

const localDbInstance = new LocalDb();

module.exports = {
  localDbInstance,
  LocalProduct: localDbInstance.createProductModel(),
  LocalTransaction: localDbInstance.createTransactionModel(),
  LocalUser: localDbInstance.createUserModel(),
};