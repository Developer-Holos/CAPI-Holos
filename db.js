const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres:dFpPIGdQpZnPYDrxJOsNuKfgoVgDAVYG@maglev.proxy.rlwy.net:37391/railway",
  ssl: {
    rejectUnauthorized: false,
  },
});


module.exports = pool;
