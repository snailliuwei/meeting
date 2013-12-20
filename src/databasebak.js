/**
 * 数据库模块
 */
var options = {
	'host': 'localhost',
	'port': 3306,
	'user': 'root',
	'password': '',
	'database': 'meeting',
	'connectionLimit': 20,
	'supportBigNumbers': true,
	'bigNumberStrings': true
};

var mysql = require('mysql');
var pool = mysql.createPool(options);

/**
 * 释放数据库连接
 */
exports.release = function(connection) {
	connection.end(function(error) {
		console.log('Connection closed');
	});
};

/**
 * 执行查询
 */

exports.execQuery = function(sql ,args) {
	pool.getConnection(function(error, connection) {
		if(error) {
			console.log('DB-获取数据库连接异常！');
			throw error;
		}
		
		// 执行查询
		if(!args) {
			var query = connection.query(sql, function(error, results) {
				console.log('执行SQL1:' + sql);
				if(error) {
					console.log('DB-执行查询语句异常！' + sql);
					throw error;
				}
				connection.release();
			});

		} else {
			var query = connection.query(sql, args, function(error, results) {
				console.log('执行SQL2:' + sql);
				if(error) {
					console.log('DB-执行查询语句异常！' + sql);
					throw error;
				}
				connection.release();
			});

		}
		

	});
};

exports.execQueryCallback = function(options, callback) {
	pool.getConnection(function(error, connection) {
		if(error) {
			console.log('DB-获取数据库连接异常！');
			throw error;
		}

		/*
		 * connection.query('USE ' + config.db, function(error, results) { if(error) { console.log('DB-选择数据库异常！'); connection.end(); throw error; } });
		 */

		// 查询参数
		var sql = options['sql'];
		var args = options['args'];
		var handler = options['handler'];

		// 执行查询
		if(!args) {
			var query = connection.query(sql, function(error, results) {
				if(error) {
					console.log('DB-执行查询语句异常！');
					throw error;
				}

				// 处理结果
				//handler(results);
				//在执行完查询以后，结果集被存放在results中,你可以使用console.log(results)打印出来看看
				console.log('1^^^^^^^' + query.sql);
				if(results.length > 0) {
					console.log(results);
					callback(results);  
				}
			});

		} else {
			var query = connection.query(sql, args, function(error, results) {
				if(error) {
					console.log('DB-执行查询语句异常！');
					throw error;
				}
				//在执行完查询以后，结果集被存放在results中,你可以使用console.log(results)打印出来看看
				console.log('2^^^^^8^' + query.sql);
				console.log('2^^^^^^^' + results.length);
				if(results.length > 0) {
					console.log(results);
					callback(results);  
				}
			});

		}

		// 返回连接池
		connection.release(function(error) {
			if(error) {
				console.log('DB-关闭数据库连接异常！');
				throw error;
			}
		});

	});
};


