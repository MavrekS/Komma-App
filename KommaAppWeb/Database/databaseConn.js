const sql = require("mssql/msnodesqlv8");

const config = {
  server: "localhost",
  database: "KommaDB",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to SQL Server:", config);
    return pool;
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err);
    throw err;
  });

module.exports = { sql, poolPromise };
