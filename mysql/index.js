const mysql = require('mysql2');

// 创建连接
const connection = mysql.createConnection({
    host: 'localhost', // 数据库主机地址
    user: 'root',      // 数据库用户名
    password: '123456',  // 数据库密码
    database: 'decider', // 数据库名称
    authPlugin: 'mysql_native_password'
});

// 连接到数据库
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as ID ' + connection.threadId);
});

// 导出数据库连接，以便其他文件使用
module.exports = connection;

// // 结束连接
// connection.end((err) => {
//   if (err) {
//     console.error('Error ending connection: ' + err.stack);
//     return;
//   }
//   console.log('Connection ended.');
// });
