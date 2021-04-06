const mysql = require('mysql')

const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'lk_pdd'
});

conn.connect();

module.exports = conn