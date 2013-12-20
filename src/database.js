exports.execQuery = function(client, sql, logger, callback) {
	client.query(sql, function selectCb(err, results, fields) {  
			if (err) {
				logger.error('sql error:' + sql + '');
				throw err;  
			}
			callback(results);
		}
	);
};

exports.execQueryArgs = function(client, sql, args, logger, callback) {
	client.query(sql, args, function selectCb(err, results, fields) {  
			if (err) {
				logger.error('sql error:' + sql + '');
				logger.error('args error:' + args + '');
				throw err;  
			}
			callback(results);
		}
	);
};