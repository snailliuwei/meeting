/* Constants */

var HTTP_PORT = 8089;
var TIME_BASE = (new Date()).getTime();
var DEFAULT_WIDTH = 1024,
    DEFAULT_HEIGHT = 768;
var PUBLIC_DIR = __dirname + '/public',
    CACHE_DIR = PUBLIC_DIR + '/cache';
var HEADER_PREFIX = 'webapp.white-';


/* Modules */

var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    path = require('path'),
    events = require('events'),
    crypto = require('crypto'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    express = require('express'),
    socketio = require('socket.io'),
    child_process = require('child_process'),
	mysql = require('mysql');
	
var parseRange = require('range-parser');

var StreamCache = require('./stream-cache.js'),
	logger = require('./logger'),
	dbop = require('./database');

/* Initialize */

// Initialize express app
var app = express(),
    server = http.createServer(app);
app.use(express.logger('dev'));
app.use(express.static(PUBLIC_DIR));
app.post('/upload/:id/:fileid', uploadFile);
app.post('/saveImage', saveImage);
app.get('/file/:id/:fileid/:filename?', downloadFile);
server.listen(HTTP_PORT);

// Initialize socket.io
var io = socketio.listen(server, {
    'log level': 1,
    //'browser client minification': true,
    'browser client etag': true,
    'browser client gzip': true
});
io.sockets.on('connection', handleSocket);

/* Database connect */

var db_config = {
	host: 'localhost',
	port : 3306,
    user: 'root',
    password: '',
    database: 'meeting'
};

var client;
function handleDisconnect() {
	client = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.
	client.connect(function(err) {              // The server is either down
		if(err) {                                     // or restarting (takes a while sometimes).
		  console.log('error when connecting to db:', err);
		  setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
	  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
	client.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
			handleDisconnect();                         // lost due to either server restart, or a
		} else {                                      // connnection idle timeout (the wait_timeout
		  throw err;                                  // server variable configures this)
		}
	});
}

handleDisconnect();

/* Status variables */

var broadcasts = {};
var bcNumber = 0,
    audNumber = 0;
var Network_Connections = 0;

/* Socket handler */

function listBroadcasts() {
    return mapObject(broadcasts, filterBroadcastInfo);
}

function handleSocket(socket) {
	
	Network_Connections++;
	
	var args = [{currentAuth: Network_Connections},{id: 1}];
	dbop.execQueryArgs(client, "update t_meet_auth set ? where ?", args, logger, function(results){  
		logger.info('socketid为[' + socket.id + ']接入app，当前连接数:' + Network_Connections);
	});
	
	socket.on('disconnect', function(){
		Network_Connections--;
		dbop.execQuery(client, "UPDATE t_meet_auth set currentAuth = '" + Network_Connections + "' where id = 1", logger, function(results){  
			logger.info('socketid为[' + socket.id + ']断开app，当前连接数:' + Network_Connections);
		});
	});
	 
	// Publish broadcast Whiteboard
    //socket.emit('list', listBroadcasts());
	
	// Get Per Name
	socket.on('getPerName', function (perID) {
		dbop.execQuery(client, "SELECT * FROM t_meet_contacts t where t.per_id='" + perID + "'", logger, function(results){  
			var nameArray = new Array();
			nameArray[0] = results[0].PER_NAME;
			logger.info('perID:' + perID + "的中文名为" + nameArray[0]);
			socket.emit('getPerNameReturn', nameArray);
		});
    });
	
	// Get Pic Width Height
	socket.on('getPicWidthHeight', function (fileId) {
		dbop.execQuery(client, "SELECT * FROM t_meet_doc_pic t where t.doc_id='" + fileId +"'" + " order by t.doc_page ", logger, function(results){  
			var widthArray = new Array();
			var heightArray = new Array();
			for(var i=0;i<results.length;i++) {
				widthArray[0] = results[0].ATTR1;
				heightArray[0] = results[0].ATTR2;
				logger.info('fileId:' + fileId + "的长宽为" + widthArray[0] + "---" + heightArray[0]);
			}
			socket.emit('getPicWidthHeightReturn', widthArray, heightArray);
		});
    });
	
	// Get Pic Background
	socket.on('getPIC', function (id) {
		dbop.execQuery(client, "SELECT * FROM t_meet_doc_pic t where t.doc_id='" + id +"'" + " order by t.doc_page ", logger, function(results){  
			var picArray = new Array();
			for(var i=0;i<results.length;i++) {
				picArray[i] = results[i].PIC_PATH;
			}
			socket.emit('getPICReturn', picArray);
		});
    });
	
	// Get PNG background
	socket.on('getPNG', function (fileId, perId, currentPage) {
		dbop.execQuery(client, "SELECT * FROM t_meet_doc_note t where t.note_doc_id='" + fileId +"'" + " and t.note_user='" + perId + "' and t.note_no = '" + currentPage + "'" + " order by t.note_no ", logger, function(results){  
			var pngArray = new Array();
			for(var i=0;i<results.length;i++) {
				pngArray[i] = results[i].NOTE_PICPATH;
			}
			socket.emit('getPNGReturn', pngArray); 
		});
    });
	
	socket.on('isOrMark', function (fileId) {
		dbop.execQuery(client, "SELECT * FROM t_meet_document t where t.doc_id='" + fileId + "'", logger, function(results){  
			var markArray = new Array();
			for(var i=0;i<results.length;i++) {
				markArray[0] = results[0].DOC_SIGNIN;
			}
			socket.emit('isOrMarkReturn', markArray); 
		});
    });
	
	// Get LastPNG background
	socket.on('getLastPNG', function (fileId, perId, currentPage) {
		dbop.execQuery(client, "SELECT * FROM t_meet_doc_note t where t.note_doc_id='" + fileId +"'" + " and t.note_no = '" + currentPage + "'"
				+ " and t.note_user='" + perId + "'", logger, function(results){  
			var lastPNGArray = new Array();
			for(var i=0;i<results.length;i++) {
				lastPNGArray[0] = results[0].NOTE_PICPATH;
			}
			socket.emit('getLastPNGReturn', lastPNGArray); 
		});
    });
	
	// Get NextPNG background
	socket.on('getNextPNG', function (fileId, perId, currentPage) {
		dbop.execQuery(client, "SELECT * FROM t_meet_doc_note t where t.NOTE_DOC_ID='" + fileId +"'" + " and t.NOTE_NO= '" + currentPage + "'"
			+ " and t.note_user='" + perId + "'", logger, function(results){  
			var nextPNGArray = new Array();
			for(var i=0;i<results.length;i++) {
				nextPNGArray[0] = results[0].NOTE_PICPATH;
			}
			socket.emit('getNextPNGReturn', nextPNGArray); 
		});
    });
	
	// Synchronous
	socket.on('sync', function (fileId, id, perId, currentPage, totalPage) {
		logger.info('强制同步id:' + id + '---[currentPage:' + currentPage + ']');
		socket.broadcast.emit('syncReturn', fileId, id, perId, currentPage, totalPage);
    });
	
	socket.on('syncnoqz', function (fileId, id, perId, currentPage, totalPage) {
		dbop.execQuery(client, "SELECT * FROM t_meet_contacts t where t.per_id='" + perId + "'", logger, function(results){  
			var perName;
			for(var i=0;i<results.length;i++) {
				perName = results[i].PER_NAME;
			}
			logger.info('请求同步id:' + id + '---[currentPage:' + currentPage + ']');
			socket.broadcast.emit('syncnoqzReturn', fileId, id, perId, currentPage, totalPage, perName);
		});
    });
	
	socket.on('sendmessage', function (ids, content) {
		socket.broadcast.emit('sendmessageReturn', ids, content);
    });
	
    socket.once('create', function (opts) {
        bcNumber += 1;
		
        // Generate and store id
        var id = opts.id;
        id = typeof id == 'string' ? id.replace(/[^\w\.-]+/, '') : null;
        if (!id || broadcasts[id])
            id = timeString() + '-' + (bcNumber % 36).toString(36);
        socket.set('id', id, function () {
            handleHost(socket, id, opts);
        });
        
        // Remove other listeners
        socket.removeAllListeners('join');
    });
	
    socket.once('join', function (id) {
        var audId = audNumber += 1;
        socket.set('aud id', audId, function () {
            handleAudience(socket, audId, id);
        });

        // Remove other listeners
        socket.removeAllListeners('create');
    });

    socket.on('debug', function (info) {
        console.log('debug', info);
    });
	
}

function handleHost(socket, id, opts) {
	
    // Initialize broadcast
    var broadcast = broadcasts[id] = {
        // Basic information
        title: opts.fileId,
        desc: opts.perId,
        time: new Date(),
        ratio: opts.ratio,
        // Sockets
        host: socket,
        audience: {},
        // Files
        files: {},
        // Status
        mode: 'white',
        canvas: {
            graphics: [],
            history: [],
            drawing: null,
        },
        video: {
            fileid: null,
            status: null,
            position: null,
            lastupdate: null,
        },
        slide: {
            slideid: null,
            step: null,
            slides: {},
        }
    };

    // Status variables
    var files = broadcast.files,
        canvas = broadcast.canvas,
        video = broadcast.video,
        slide = broadcast.slide,
        slides = slide.slides;

    // Create cache directory
    var cacheDir = CACHE_DIR + '/' + id;
    mkdirp(cacheDir, function (err) {
        fs.readdir(cacheDir, function (err, files_) {
            var existsFiles = {};
            for (var i = 0; i < files_.length; ++i) {
                var filename = files_[i],
                    fileLoc = cacheDir + '/' + filename,
                    extname = path.extname(filename),
                    fileId = timeString() + '-' + md5(filename);
                if (filename.charAt(0) === '.')
                    continue;
                if (/^\.\w+$/.test(extname))
                    fileId += extname;
                var newLoc = cacheDir + '/file-' + fileId;
                existsFiles[fileId] = files[fileId] = {
                    filename: filename,
                    finished: true,
                    length: fs.statSync(fileLoc).size,
                    location: newLoc
                };
                fs.symlink(fileLoc, newLoc);
            }
            socket.emit('files found', existsFiles);
        });
    });

    // Broadcast
    function broadcastEvents(evt, args) {
        // convert args to array
        args = args ? Array.prototype.slice.call(args) : [];
        //console.log(evt, args);
        args.unshift(evt);
        var audience = broadcast.audience;
        for (var audId in audience)
            audience[audId].emit.apply(audience[audId], args);
    }
    socket.onEvent = function (evt, func) {
        socket.on(evt, function () {
            // If func return true, broadcast it
            if (func.apply(this, arguments))
                broadcastEvents(evt, arguments);
        });
    };

    // Initialize socket for host
    
    // File upload
    socket.onEvent('file', function (filename) {
        filename = path.basename(filename);
        var fileId = timeString() + '-' + md5(filename),
            extname = path.extname(filename);
        if (/^\.\w+$/.test(extname))
            fileId += extname;
        var secret = randomString();
        files[fileId] = {
            filename: filename,
            secret: secret,
            finished: false,
            location: cacheDir + '/file-' + fileId,
            startEvent: new events.EventEmitter
        };
        socket.emit('file ready', fileId, secret);
        return false;
    });

    /*
    socket.onEvent('file cancel', function (fileId) {
        var fileInfo = files[fileId];
        var location = fileInfo.location;

        fs.unlink(location + '.part');
        fs.unlink(location);
        delete files[fileId];
        return false;
    });
    */

    // Draw path
    socket.onEvent('draw path', function (x, y, color, width) {
        canvas.drawing = {
            type: 'path',
            color: color,
            width: width,
            points: [{x: x, y: y}]
        };
        return true;
    });
    socket.onEvent('draw path add', function (x, y) {
        var drawing = canvas.drawing;
        if (drawing && drawing.type === 'path') {
            drawing.points.push({x: x, y: y});
            return true;
        }
        return false;
    });
    socket.onEvent('draw path end', function (x, y) {
        var drawing = canvas.drawing;
        if (drawing && drawing.type === 'path') {
            drawing.points.push({x: x, y: y});
            canvas.graphics.push(drawing);
            canvas.drawing = null;
            canvas.history = [];
            return true;
        }
        return false;
    });
    // Draw text
    // TODO
    // Draw image
    // TODO
    // Drawing control
	socket.onEvent('lastPage', function () {
        return true;
    });
	socket.onEvent('nextPage', function () {
        return true;
    });
	
	socket.onEvent('draw clear mark', function () {
        return true;
    });
	socket.onEvent('draw clear png', function (id) {
        broadcast.mode = id;
        return true;
    });
	socket.onEvent('draw clear', function () {
        canvas.graphics.push({type: 'clear'});
        return true;
    });
    socket.onEvent('draw undo', function () {
        if (canvas.graphics.length > 0) {
            canvas.history.push(canvas.graphics.pop());
            return true;
        }
        return false;
    });
    socket.onEvent('draw redo', function () {
        if (canvas.history.length > 0) {
            canvas.graphics.push(canvas.history.pop());
            return true;
        }
        return false;
    });

    // White mode
    socket.onEvent('mode white', function () {
        broadcast.mode = 'white';
        canvas.graphics = [];
        canvas.history = [];
        return true;
    });

    // Video mode
    socket.onEvent('mode video', function (fileid) {
        broadcast.mode = 'video';
        video.fileid = fileid;
        video.status = 'paused';
        video.position = 0;
        return true;
    });
    socket.onEvent('video play', function (pos) {
        video.status = 'playing';
        video.position = pos;
        video.lastupdate = now();
        return true;
    });
    socket.onEvent('video pause', function (pos) {
        video.status = 'paused';
        video.position = pos;
        return true;
    });
    socket.onEvent('video seek', function (pos) {
        video.position = pos;
        video.lastupdate = now();
        return true;
    });

    // Slide mode
    socket.onEvent('slide prepare', function (fileid) {
        var file = files[fileid];
        var slideid = fileid;
        if (slides[slideid]) {
            if (slides[slideid].ready)
                slideReady();
        }
        else if (file) {
            if (!file.finished)
                file.stream.on('finish', processSlide);
            else
                processSlide();
        }
        function slideReady() {
            slides[slideid].ready = true;
            socket.emit('slide ready', slideid);
        }
        function slideFail(err) {
            socket.emit('slide fail', slideid, err);
        }
        function processSlide() {
            slides[slideid] = {ready: false, step: null};
            var slideDir = cacheDir + '/slide-' + slideid;
            child_process.execFile(__dirname + '/extract_slide.py',
                    [file.location, slideDir],
                    function (error, stdout, stderr) {
                        if (error)
                            slideFail('extract: ' + stdout.trim());
                        else
                            slideReady();
                    });
        }
        return false;
    });
    socket.onEvent('mode slide', function (slideid) {
        if (!slides[slideid] || !slides[slideid].ready)
            return false;
        
        // set current slide
        if (slide.slideid)
            slides[slideid] = slide.step;
        slide.slideid = slideid;
        slide.step = null;

        // clean canvas
        broadcast.mode = 'slide';
        canvas.graphics = [];
        canvas.history = [];
        canvas.drawing = null;
        
        return true;
    });
    socket.onEvent('slide step', function (step, pagechanged) {
        slide.step = step;
        if (pagechanged) {
            canvas.graphics = [];
            canvas.history = [];
            canvas.drawing = null;
        }
        return true;
    });
	
	socket.on('disDKLJ', function () {
        delete broadcast.host;
        console.log('broadcast ' + id + ' finished');
        broadcastEvents('host disconnected');

        var cleanCount = 0;
        function increase() {
            cleanCount += 1;
        }
        function decrease() {
            cleanCount -= 1;
            if (!cleanCount)
                fs.rmdir(cacheDir);
        }
        increase();
        // clean up cache files
        var ids = Object.keys(files);
        for (var i = 0; i < ids.length; ++i) {
            var fileId = ids[i],
                file = files[fileId];
            if (!file.finished)
                continue;
            increase();
            fs.unlink(file.location, decrease);
        }
        // clean up extracted slides
        ids = Object.keys(slides);
        for (var i = 0; i < ids.length; ++i) {
            increase();
            rimraf(cacheDir + '/slide-' + ids[i], decrease);
        }
        decrease();

        delete broadcasts[id];
        socket.broadcast.emit('list', listBroadcasts());
		socket.broadcast.emit('disDKLJReturn');
    });
	
    // Disconnect
    socket.on('disconnect', function () {
        delete broadcast.host;
        console.log('broadcast ' + id + ' finished');
        broadcastEvents('host disconnected');

        var cleanCount = 0;
        function increase() {
            cleanCount += 1;
        }
        function decrease() {
            cleanCount -= 1;
            if (!cleanCount)
                fs.rmdir(cacheDir);
        }
        increase();
        // clean up cache files
        var ids = Object.keys(files);
        for (var i = 0; i < ids.length; ++i) {
            var fileId = ids[i],
                file = files[fileId];
            if (!file.finished)
                continue;
            increase();
            fs.unlink(file.location, decrease);
        }
        // clean up extracted slides
        ids = Object.keys(slides);
        for (var i = 0; i < ids.length; ++i) {
            increase();
            rimraf(cacheDir + '/slide-' + ids[i], decrease);
        }
        decrease();

        delete broadcasts[id];
        socket.broadcast.emit('list', listBroadcasts());
    });

    // Audience change
    broadcast.addAudience = function (audId, audSocket) {
        broadcast.audience[audId] = audSocket;
        socket.emit('audience changed', Object.keys(broadcast.audience));
    };
    broadcast.removeAudience = function (audId) {
        delete broadcast.audience[audId];
        socket.emit('audience changed', Object.keys(broadcast.audience));
    };

    // Broadcast ready
    console.log('broadcast ' + id + ' ready');
    socket.emit('ready', id);
    socket.broadcast.emit('list', listBroadcasts());
//	socket.broadcast.emit('say', opts.id);
//	console.log('say');
}

function handleAudience(socket, audId, id) {
    var broadcast = broadcasts[id];
	
	if (!broadcast) {
        socket.emit('broadcast notfound');
		logger.info('broadcast notfound:' + id);
        return;
    }
	
	// Status variables
    var files = broadcast.files,
        canvas = broadcast.canvas,
        video = broadcast.video,
        slide = broadcast.slide,
        slides = slide.slides;
		
    

    broadcast.addAudience(audId, socket);
    socket.on('disconnect', function () {
        if (broadcast.host)
            broadcast.removeAudience(audId);
        console.log('audience ' + audId + ' left ' + id);
    });
    
    console.log('audience ' + audId + ' joined ' + id);
    socket.emit('initialize', (function() {
        var video = broadcast.video;
        var slide = broadcast.slide;
        var data = {
            mode: broadcast.mode,
            canvas: broadcast.canvas,
            video: {
                fileid: video.fileid,
                status: video.status,
                position: video.position + 
                    (video.status === 'playing' ?
                     (now() - video.lastupdate) / 1000 : 0)
            },
            slide: {
                slideid: slide.slideid,
                step: slide.step
            }
        };
        return data;
    })());
	
	socket.on('draw path audience', function (x, y, color, width, id) {
        socket.broadcast.emit('draw path audience return', x, y, color, width, id);
		canvas.drawing = {
            type: 'path',
            color: color,
            width: width,
            points: [{x: x, y: y}]
        };
        return true;
    });
    socket.on('draw path add audience', function (x, y, id) {
		socket.broadcast.emit('draw path add audience return', x, y, id);
        var drawing = canvas.drawing;
        if (drawing && drawing.type === 'path') {
            drawing.points.push({x: x, y: y});
            return true;
        }
        return false;
    });
    socket.on('draw path end audience', function (x, y, id) {
        socket.broadcast.emit('draw path end audience return', x, y, id);
		var drawing = canvas.drawing;
        if (drawing && drawing.type === 'path') {
            drawing.points.push({x: x, y: y});
            canvas.graphics.push(drawing);
            canvas.drawing = null;
            canvas.history = [];
            return true;
        }
        return false;
    });
	
	socket.on('draw clear audience', function (id) {
		socket.broadcast.emit('draw clear audience return',id);
        canvas.graphics.push({type: 'clear'});
        return true;
    });
	socket.on('draw undo audience', function (id) {
		socket.broadcast.emit('draw undo audience return', id);
        if (canvas.graphics.length > 0) {
            canvas.history.push(canvas.graphics.pop());
            return true;
        }
        return false;
    });
    socket.on('draw redo audience', function (id) {
		socket.broadcast.emit('draw redo audience return', id);
        if (canvas.history.length > 0) {
            canvas.graphics.push(canvas.history.pop());
            return true;
        }
        return false;
    });
	
	socket.on('lastPage audience', function (id) {
		socket.broadcast.emit('lastPage audience return', id);
    });
	socket.on('nextPage audience', function (id) {
		socket.broadcast.emit('nextPage audience return', id);
    });
	
	socket.on('draw clear audience mark', function (id) {
		socket.broadcast.emit('draw clear audience mark return',id);
        canvas.graphics.push({type: 'clear'});
        return true;
    });
}

/* HTTP handlers */

function uploadFile(req, res) {
    // Vaild parameters
    var broadcast = broadcasts[req.params.id];
    if (!broadcast)
        return res.send(404);
    var fileId = req.params.fileid,
        fileInfo = broadcast.files[fileId];
    if (!fileInfo)
        return res.send(404);
    var secret = req.headers[HEADER_PREFIX + 'secret'];
    if (secret !== fileInfo.secret)
        return res.send(403);
    if (fileInfo.finished || fileInfo.stream)
        return res.send(409);

    // Create stream cache
    var partFile = fileInfo.location + '.part';
    fileInfo.length = req.headers['content-length'];
    if (fileInfo.length === undefined)
        return res.send(411);
    var stream = fileInfo.stream = new StreamCache(req, partFile);
    stream.on('finish', function () {
        fs.rename(partFile, fileInfo.location, function () {
            fileInfo.finished = true;
            delete fileInfo.stream;
            res.end();
        });
    });

    // notify others uploading started
    fileInfo.startEvent.emit('started');
    broadcast.host.emit('upload start', fileId);
    delete fileInfo.startEvent;
}

function downloadFile(req, res) {
    // Vaild parameters
    var broadcast = broadcasts[req.params.id];
    if (!broadcast)
        return res.send(404);
    var fileInfo = broadcast.files[req.params.fileid];
    if (!fileInfo)
        return res.send(404);
    
    // Start downloading
    if (fileInfo.finished) {
        res.download(fileInfo.location, fileInfo.filename);
    }
    else if (fileInfo.length === undefined) {
        fileInfo.startEvent.on('started', function () {
            downloadFile(req, res);
        });
    }
    else {
        var length = fileInfo.length;
        var ranges = req.headers.range;
        var opts = {};
        var offset;
        
        // Check ranges
        res.setHeader('Accept-Ranges', 'bytes');
        if (ranges)
            ranges = parseRange(length, ranges);
        if (!ranges) {
            res.statusCode = 200;
        }
        else if (ranges == -1) {
            res.setHeader('Content-Range', 'bytes */' + stat.size);
            return res.send(416);
        }
        else if (ranges != -2) {
            opts.start = ranges[0].start;
            opts.end = ranges[0].end;
            if (opts.end > length - 1)
                opts.end = length - 1;
            length = opts.end - opts.start + 1;
            res.statusCode = 206;
            res.setHeader('Content-Range',
                    'bytes ' + opts.start + '-' + opts.end +
                    '/' + fileInfo.length);
        }
        
        // Check method
        if (req.method === 'HEAD')
            return res.end();
        
        // Send file
        res.setHeader('Content-Length', length);
        var stream = fileInfo.stream.createNewStream(opts);
        req.on('close', function () { stream.destroy(); });
        stream.pipe(res);
    }
}

/* Misc functions */

function filterBroadcastInfo(broadcast) {
    return {
        title: broadcast.title,
        desc: broadcast.desc,
        ratio: broadcast.ratio,
        time: broadcast.time,
        audience: Object.keys(broadcast.audience).length
    };
}

function now() {
    return (new Date()).getTime();
}

function timeString() {
    return (now() - TIME_BASE).toString(36);
}

function randomString() {
    return Math.random().toString(36).substring(2);
}

function mapObject(obj, func) {
    var ret = {};
    for (var k in obj)
        if (obj.hasOwnProperty(k))
            ret[k] = func(obj[k]);
    return ret;
}

function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function saveImage(req, res){
	//var id = req.params.id;
	//var fileId = req.params.fileid
	//console.log("id = " + id + "--fileId="+fileId);
	var id = req.query.id;	
	
	var postData = "";
    req.setEncoding("utf8");
    req.addListener("data", function(postDataChunk) {
		postData += postDataChunk;
	//	console.log("Received POST data chunk '"+ postDataChunk + "'.");
    });

    req.addListener("end", function() {
		saveImageToServer(res,postData,id);
    });
}

/* Save palette (not including slate background) */
function saveImageToServer(res,postData,id) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    var fs = require('fs');
    var base64Data = postData.replace(/^data:image\/\w+;base64,/, "");
    var dataBuffer = new Buffer(base64Data, 'base64');
	console.log("Request handler 'upload' was called.");
	//console.log(__dirname);
    fs.writeFile(__dirname + "/image/" + id + ".png", dataBuffer, function(err) {
	});
    res.end();
}
