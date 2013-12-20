function initHost(socket, opts) {
    var id, cacheDir;
    var files = {},
        ratio = opts.ratio;
    canvas = {
		graphics: [],
    	history: [],
		drawing: null
    };
    video = {
		fileid: null,
		status: null,
		position: null
    };
    slide = {
		slideid: null,
		step: null,
		slides: {}
    };

    var PENCIL_COLORS = [
            '#ff0000', '#22b14c', '#80ffff',
            '#ff7f27', '#0000ff', '#919091',
            '#ffff00', '#a349a4', '#000000'
        ],
        HIGHLIGHTER_COLORS = [
            'rgba(254, 254, 129, .4)', 'rgba(92, 250, 152, .2)', 
            'rgba(59, 232, 244, .2)', 'rgba(254, 170, 249, .2)'
        ],
        THICKNESSES = [
            0.007, 0.009, 0.012, 0.015, 0.02
        ],
        SUPPORT_VIDEO = ['.mp4'],
        SUPPORT_SLIDE_ARCHIVE = ['.zip'];
	
    // elements;
    initElements();

    // size
    var canvasSpacing = 10,
        maxButtonSize = 80,
        buttonSpacing = 0.6,
        refWidth = 1000;
    var origWidth, origHeight;
    // ratio
    ratio = ratio.split(':');
    ratio = parseInt(ratio[0]) / parseInt(ratio[1]);
	
    var isMark = 0; //是否签名文件
    var hostOrMark = 0; //当前操作是批注还是签名
    var nowDraw = false;
	var clear = 0;
	var clearPNG = 0;
    var nowPngUrl;
    totalPage = opts.totalPage;	

    // on window resize event
    var offsetX, offsetY;
	
	socket.emit('getPicWidthHeight', opts.fileId);
	socket.on('getPicWidthHeightReturn', function (widthArray, heightArray) {
		width = widthArray[0];
		height = heightArray[0];
		setSize();
	});
	
    setSize = function () {
        var top, bottom, left, right;
        top = bottom = left = right = canvasSpacing;
        // get current size
        origWidth = window.innerWidth;
        origHeight = window.innerHeight;
		
		if(hostOrMark == 0) {
			offsetX = document.getElementById("start2").offsetLeft + 148;
			offsetY = 17;
		} else if(hostOrMark == 1) {
			offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
			offsetY = 17 + 100;
		}
		
		if (width < 868) {
			width = 868;
		}
		if (height < 690) {
			height = 690;
		}
        function setPos(e) {
            e.width = width;
            e.height = height;
            e.style.width = width + 'px';
            e.style.height = height + 'px';
			//e.style.left = offsetX + 'px';
			//e.style.top = offsetY + 'px';
        }
		setPos($drawing);
        setPos($graphics);
		
		$$snail = $('#snail');
		$snail = $$snail[0];
        setPos($snail);
		
		$$pic = $('#pic');
		$pic = $$pic[0];
        setPos($pic);
        // redraw
        redrawGraphics();
        redrawDrawing();
    };
	
	aaa = function() {
		if(hostOrMark == 0) {
			offsetX = document.getElementById("start2").offsetLeft + 148;
			offsetY = 17;
		} else if(hostOrMark == 1) {
			offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
			offsetY = 17 + 100;
		}
		offsetX = offsetX - document.getElementById("canvas").scrollLeft - document.body.scrollLeft;
		offsetY = offsetY - document.getElementById("canvas").scrollTop - document.body.scrollTop;
	}
	window.onscroll = function() {
		if(hostOrMark == 0) {
			offsetX = document.getElementById("start2").offsetLeft + 148;
			offsetY = 17;
		} else if(hostOrMark == 1) {
			offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
			offsetY = 17 + 100;
		}
		offsetX = offsetX - document.getElementById("canvas").scrollLeft - document.body.scrollLeft;
		offsetY = offsetY - document.getElementById("canvas").scrollTop - document.body.scrollTop;
	}
    
    var tool, color, thickness;
    var brushStyle = {};
	brushStyle.color = '#ff0000';
	brushStyle.thickness = '0.005';
	
    /* Tools */
    
    function initDrawing() {
        canvas.graphics = [];
        canvas.history = [];
        redrawGraphics();
    }

    function enableDrawing() {
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		//$('#lastPage').css({backgroundPosition:-206});
        $$canvas.css('pointer-events', 'auto');
    }
	
    $('#undo').click(function () {
        var graphics = canvas.graphics;
        if (graphics.length > 0) {
            var graph = graphics.pop();
            canvas.history.push(graph);
            $('#redo').css({backgroundPosition:0});
            if (graphics.length == 0) {
                //$('#undo').css({backgroundPosition:-224});
            }
            else if (graphics[graphics.length - 1].type === 'clear') {
                
            }
            else if (graph.type === 'clear') {
                
            }
			
			if( clear == 1 && nowPngUrl != null) {
				clear = 0;
				$("#drawing").css("background-image","url('" + nowPngUrl + "')");
				socket.emit('draw clear png' , 'white');
			}
            redrawGraphics();
            socket.emit('draw undo');
        }
    });
	
    $('#redo').click(function () {
        var history = canvas.history;
        if (history.length > 0) {
            var graph = history.pop();
            canvas.graphics.push(graph);
			$('#undo').css({backgroundPosition:0});
            if (history.length == 0) {
				//$('#redo').css({backgroundPosition:-224});
			}
			
            if (graph.type === 'path')
                drawPath(ctxGraphics, graph);
			else if (graph.type === 'pathhost')
                drawPath(ctxGraphics, graph);
			else if (graph.type === 'pathaudience')
                drawPath(ctxGraphics, graph);
            else if (graph.type === 'clear')
                redrawGraphics();
			
            socket.emit('draw redo');
        }
    });
	
    $('#clear').click(function () {
		if( nowPngUrl != null) {
			socket.emit('draw clear png' , '1');
			$("#drawing").css("background-image","url('')");
		}
		clear = 1;
        canvas.graphics.push({type: 'clear'});
        canvas.history = [];
        redrawGraphics();
        socket.emit('draw clear');
    });
	

    /* Drawing */
	
    function getPoint(e) {
        var x, y;
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        }
        else {
            x = e.clientX;
            y = e.clientY;
        }
		
        x -= offsetX; x /= width;
		y -= offsetY; y /= height;
        
        return {x: x, y: y};
    }
	
    function startDrawing(e) {
        e.preventDefault();
		
        var p = getPoint(e);
        if (typeof e.button === 'number' && e.button !== 0)
            return;
		if(nowDraw == true || drawing.type == 'path' ) {
			return;
		}
		nowDraw = true;
        canvas.drawing = {
            type: 'path',
            color: brushStyle.color,
            width: brushStyle.thickness,
            points: [p]
        };
		
        socket.emit('draw path', p.x, p.y, brushStyle.color, brushStyle.thickness);
    }
	
    function drawing(e) {
        e.preventDefault();
        var drawing = canvas.drawing;
        if (!drawing || drawing.type !== 'path')
            return;
		
        var p = getPoint(e);
        drawing.points.push(p);
        socket.emit('draw path add', p.x, p.y);
        redrawDrawing();
    }

    function endDrawing(e) {
        e.preventDefault();
		
        var drawing = canvas.drawing;
        if (!drawing || ( drawing.type !== 'path' && drawing.type !== 'pathaudience') )
            return;
		nowDraw = false;
		if(drawing.type == 'pathaudience') {
		
		} else {
			if (!e.touches)
            drawing.points.push(getPoint(e));
			
			var length = drawing.points.length;
			var lastPoint = drawing.points[length - 1];
			canvas.graphics.push(drawing);
			canvas.history = [];
			
			//$('#undo').css({backgroundPosition:0});
			//$('#redo').css({backgroundPosition:-224});
			//$('#clear').css({backgroundPosition:0});
			
			drawPath(ctxGraphics, drawing);
			socket.emit('draw path end', lastPoint.x, lastPoint.y);
			canvas.drawing = null;
			redrawDrawing();
		}
        
    }
	
	socket.on('draw path audience return', function (x, y, color, width, id) {
		if(opts.id == id) {
			nowDraw = true;
			canvas.drawing = {
				type: 'pathaudience',
				color: color,
				width: width,
				points: [{x: x, y: y}]
			};
		}
    });
    socket.on('draw path add audience return', function (x, y, id) {
		if(opts.id == id) {
			var drawing = canvas.drawing;
			if (drawing && drawing.type === 'pathaudience') {
				drawing.points.push({x: x, y: y});
				// redraw
				redrawDrawing();
			}
		}
    });
    socket.on('draw path end audience return', function (x, y, id) {
		if(opts.id == id) {
			var drawing = canvas.drawing;
			if (drawing && drawing.type === 'pathaudience') {
				drawing.points.push({x: x, y: y});
				canvas.graphics.push(drawing);
				drawPath(ctxGraphics, drawing);
				canvas.drawing = null;
				canvas.history = [];
				redrawDrawing();
				nowDraw = false;
			}
		} 
    });
	
	socket.on('draw clear audience return', function (id) {
		if(opts.id == id) {
			canvas.graphics.push({type: 'clear'});
			redrawGraphics();
			$("#drawing").css("background-image","url('')");
			clear = 1;
		}
    });
	socket.on('draw undo audience return', function (id) {
		if(opts.id == id) {
			if (canvas.graphics.length > 0) {
				canvas.history.push(canvas.graphics.pop(id));
				redrawGraphics();
			}
			if( clear == 1 && nowPngUrl != null) {
				clear = 0;
				$("#drawing").css("background-image","url('" + nowPngUrl + "')");
				socket.emit('draw clear png' , 'white');
			}
		}
    });
	socket.on('draw redo audience return', function (id) {
		if(opts.id == id) {
			if (canvas.history.length > 0) {
				var graph = canvas.history.pop();
				canvas.graphics.push(graph);
				if (graph.type === 'path')
					drawPath(ctxGraphics, graph);
				else if (graph.type === 'pathhost')
					drawPath(ctxGraphics, graph);
				else if (graph.type === 'pathaudience')
					drawPath(ctxGraphics, graph);
				else if (graph.type === 'clear')
					redrawGraphics();
			}
		}
    });
	
	
	socket.on('lastPage audience return', function (backid) {
		if(opts.id == backid) {
			currentPage--;
			$("#graphics").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
			$("#pic").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
			socket.emit('getLastPNG', opts.fileId, opts.perId, currentPage);
			socket.once('getLastPNGReturn', function (meetArray) {
				if(meetArray.length>0) {
					var url = meetArray[0];
					url = url.replace("\\", "/");
					url = url.replace("\\", "/");
					nowPngUrl = meetURL + pngFolder + "/" + url;
					$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
				} else {
					$("#drawing").css("background-image","url('')");
				}
			});
			
			$('#startAnnotation').show();
			$('#mark').hide();
			if( clear == 1) {
				clear = 0;
				socket.emit('draw clear png' , 'while');
			}
					
			canvas.graphics.push({type: 'clear'});
			canvas.graphics = [];
			canvas.history = [];
			redrawGraphics();
		}
    });
	socket.on('nextPage audience return', function (backid) {
		if(opts.id == backid) {
			currentPage++;
			$("#graphics").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
			$("#pic").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
			socket.emit('getNextPNG', opts.fileId, opts.perId, currentPage);
			socket.once('getNextPNGReturn', function (meetArray) {
				if(meetArray.length>0) {
					var url = meetArray[0];
					url = url.replace("\\", "/");
					url = url.replace("\\", "/");
					nowPngUrl = meetURL + pngFolder + "/" + url;
					$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
				} else {
					$("#drawing").css("background-image","url('')");
				}
			});
			
			if(currentPage == totalPage && isMark == 1) {
				$('#mark').show();
				$('#startAnnotation').hide();
			}
			if( clear == 1) {
				clear = 0;
				socket.emit('draw clear png' , 'while');
			}
			canvas.graphics.push({type: 'clear'});
			canvas.graphics = [];
			canvas.history = [];
			redrawGraphics();
		}
    });
	
	socket.on('draw clear audience mark return', function (id) {
		if(opts.id == id) {
			canvas.graphics.push({type: 'clear'});
			redrawGraphics();
		}
    });
	
    $drawing.addEventListener('mousedown', startDrawing);
    $drawing.addEventListener('mousemove', drawing);
    $drawing.addEventListener('mouseup', endDrawing);
    $drawing.addEventListener('touchstart', startDrawing);
    $drawing.addEventListener('touchmove', drawing);
    $drawing.addEventListener('touchend', endDrawing);
	
    
    /* Main process */
	
    socket.once('ready', function (_id) {
        id = _id;
        cacheDir = CACHE_DIR + '/' + id;
        
        $$canvas.show();
        // switch button status
        initDrawing();
        enableDrawing();
		
        mode = 'white';
        socket.emit('mode white');
    });
    socket.on('files found', function (files_) {
        var ids = Object.keys(files_);
        for (var i = 0; i < ids.length; ++i) {
            var fileId = ids[i];
            files[fileId] = files_[fileId];
        }
    });
    socket.emit('create', opts);
	
	var meetId = getQueryString("meetId");
	socket.emit('getPerName', opts.perId);
	socket.once('getPerNameReturn', function (nameArray) {
		var perName = nameArray[0];
		$("#user").html(perName);
	});
	
	socket.emit('getPIC', opts.fileId);
	socket.once('getPICReturn', function (docPiceArray) {
		var url = docPiceArray[0];
		url = url.replace("\\", "/");
		url = url.replace("\\", "/");
		urlGrap = url.split("/");
		$("#graphics").css("background-image","url('" + meetURL + url + "')");
		$("#pic").css("background-image","url('" + meetURL + url + "')");
		//document.getElementById("graphics").style.backgroundSize="753px 687px";
	});
	
	socket.emit('getPNG', opts.fileId, opts.perId, currentPage);
	socket.once('getPNGReturn', function (meetArray) {
		if(meetArray.length>0) {
			var url = meetArray[0];
			url = url.replace("\\", "/");
			url = url.replace("\\", "/");
			nowPngUrl = meetURL + pngFolder + "/" + url;
			$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
		}
	});
	
	socket.emit('isOrMark', opts.fileId);
	socket.once('isOrMarkReturn', function (docPiceArray) {
		var isornot = docPiceArray[0];
		if(isornot == 1) {
			isMark = 1;
		}
	});
	
	/* Palette */
	$('#red').click(function (e) {
		brushStyle.color = '#ff0000';
	});
	
	$('#green').click(function (e) {
		brushStyle.color = '#22b147';
	});
	
	$('#blue').click(function (e) {
		brushStyle.color = '#0000ff';
	});
	
	/* Thickness */
	$('#oneNumber').click(function (e) {
		brushStyle.thickness = '0.003';
	});
	
	$('#twoNumber').click(function (e) {
		brushStyle.thickness = '0.004';
	});
	
	$('#threeNumber').click(function (e) {
		brushStyle.thickness = '0.005';
	});
	
	$('#lastPage').click(function (e) {

		currentPage--;
		var temp = currentPage+1;
		
		$.ajax({
			url: "/saveImage" + "?id=" + opts.id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId + "&clear=" + clear,
					type: "post",
					dataType:"jsonp",
					success: function(result){
						if( clear == 1) {
							socket.emit('draw clear png' , 'while');
						}
						clear = 0;
					}
				});
			}
		});
		
		
		if(currentPage<=0) {
			currentPage++;
			return;
		}
		
		$('#startAnnotation').show();
		$('#mark').hide();
		
		// changge nextPage css
		//$('#nextPage').css({backgroundPosition:0});
		if(currentPage==1) {
			// change lastPage css
			//$('#lastPage').css({backgroundPosition:-206});
		}
		
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		
		$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		$("#pic").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		
		socket.emit('getLastPNG', opts.fileId, opts.perId, currentPage);
		socket.once('getLastPNGReturn', function (meetArray) {
			if(meetArray.length>0) {
				var url = meetArray[0];
				url = url.replace("\\", "/");
				url = url.replace("\\", "/");
				nowPngUrl = meetURL + pngFolder + "/" + url;
				$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
			} else {
				$("#drawing").css("background-image","url('')");
			}
		});
		
		
		canvas.graphics.push({type: 'clear'});
        canvas.history = [];
        
        redrawGraphics();
        socket.emit('lastPage');
		socket.emit('draw clear');
    });
	
	$('#nextPage').click(function (e) {
		
		currentPage++;
		var temp = currentPage-1;
	
		$.ajax({
			url: "/saveImage" + "?id=" + opts.id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId + "&clear=" + clear,
					type: "post",
					dataType:"jsonp",
					success: function(result){
						if( clear == 1) {
							socket.emit('draw clear png' , 'while');
						}
						clear = 0;
					}
				});
			}
		});
			
		if(temp>=totalPage) {
			currentPage--;
			return;
		}
		
		if(currentPage == totalPage && isMark == 1) {
			$('#mark').show();
			$('#startAnnotation').hide();
		}
		
		// change lastPage css
		//$('#lastPage').css({backgroundPosition:0});
		if(currentPage>=totalPage) {
			// changge nextPage css
			//$('#nextPage').css({backgroundPosition:-206});
		}
		
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		
		socket.emit('getNextPNG', opts.fileId, opts.perId, currentPage);
		socket.once('getNextPNGReturn', function (meetArray) {
			if(meetArray.length>0) {
				var url = meetArray[0];
				url = url.replace("\\", "/");
				url = url.replace("\\", "/");
				nowPngUrl = meetURL + pngFolder + "/" + url;
				$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
			} else {
				$("#drawing").css("background-image","url('')");
			}
		});
		
		$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')");
		$("#pic").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		
		canvas.graphics.push({type: 'clear'});
		canvas.graphics = [];
        canvas.history = [];

        redrawGraphics();
        socket.emit('nextPage');
		socket.emit('draw clear');
    });
	
	
	
	$('#syncnoqz').click(function (e) {
		
		$.ajax({
			url: meetURL + "composite/insertMeetID_compositeAction.action?fileID=" + opts.fileId + '&perID=' + opts.perId + '&master=1',
			type: "post",
			success: function(result){
				
			}
		});
		
		$.ajax({
			url: meetURL + "composite/insertCurrPage_compositeAction.action?currentPage=" + currentPage,
			type: "post",
			success: function(result){
				
			}
		});
		
		$.ajax({
			url: meetURL + "composite/insertTotalPage_compositeAction.action?currentPage=" + totalPage,
			type: "post",
			success: function(result){
				
			}
		});
		
		socket.emit('syncnoqz', opts.fileId, opts.id, opts.perId, currentPage, totalPage);
	});
	
	$('#sync').click(function (e) {
		
		$.ajax({
			url: meetURL + "composite/insertMeetID_compositeAction.action?fileID=" + opts.fileId + '&perID=' + opts.perId + '&master=1',
			type: "post",
			success: function(result){
				
			}
		});
		
		$.ajax({
			url: meetURL + "composite/insertCurrPage_compositeAction.action?currentPage=" + currentPage,
			type: "post",
			success: function(result){
				
			}
		});
		
		$.ajax({
			url: meetURL + "composite/insertTotalPage_compositeAction.action?currentPage=" + totalPage,
			type: "post",
			success: function(result){
				
			}
		});
		
		socket.emit('sync', opts.fileId, opts.id, opts.perId, currentPage, totalPage);
	});
	
	$('#endsync').click(function (e) {
		$.ajax({
			url: meetURL + "composite/endMeet_compositeAction.action",
			type: "post",
			success: function(result){
				
			}
		});
	
		socket.emit('disDKLJ');
		window.location.href = reloadUrl;
	});
	
	$('#saveMark').click(function (e) {
		var temp = currentPage;
		$.ajax({
			url: "/saveImage" + "?id=" + opts.id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/mark_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId,
					type: "post",
					dataType:"jsonp",
					success: function(result){
						//alert(result[0].success);
						socket.emit('getPIC', opts.fileId);
						socket.once('getPICReturn', function (docPiceArray) {
							var url = docPiceArray[temp-1];
							url = url.replace("\\", "/");
							url = url.replace("\\", "/");

							$("#graphics").css("background-image","url('" + meetURL + url + "')");
						});
						socket.emit('getLastPNG', opts.fileId, opts.perId, currentPage);
						socket.once('getLastPNGReturn', function (meetArray) {
							if(meetArray.length>0) {
								var url = meetArray[0];
								url = url.replace("\\", "/");
								url = url.replace("\\", "/");
								nowPngUrl = meetURL + pngFolder + "/" + url;
								$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
							} else {
								$("#drawing").css("background-image","url('')");
							}
						});
					}
				});
				
				$('#snail').show();
				$('#syncnoqz').show();
				$('#sync').show();
				
				$('#pic').hide();
				$('#saveMark').hide();
				
				$('#mark').css({backgroundPosition:0});
				
				hostOrMark = 0;
				markSign = 0
				function setHostPos(e) {
					e.width = width;
					e.height = height;
					e.style.width = width + 'px';
					e.style.height = height + 'px';
					e.style.left = 0 + 'px';
					e.style.top = 0 + 'px';
				}
				if(hostOrMark == 0) {
					offsetX = document.getElementById("start2").offsetLeft + 148;
					offsetY = 17;
				} else if(hostOrMark == 1) {
					offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
					offsetY = 17 + 100;
				}
				setHostPos($drawing);
				setHostPos($graphics);
				
				canvas.graphics.push({type: 'clear'});
				canvas.graphics = [];
				canvas.history = [];
				redrawGraphics();
				socket.emit('draw clear mark');
				
			}
		});
	});
	
	// Cover
	var snailSign = 0;
	$('#startAnnotation').click(function (e) {
		if(snailSign==0) {
			$('#snail').hide();
			$('#startAnnotation').css({backgroundPosition:-220});
			snailSign++;
		} else {
			$('#snail').show();
			$('#startAnnotation').css({backgroundPosition:0});
			snailSign--;
		}
	});
	
	$('#pic').hide();
	$('#mark').hide();
	$('#saveMark').hide();
	
	var markSign = 0;
	$('#mark').click(function (e) {
		if(markSign==0) {
			$('#snail').hide();
			$('#syncnoqz').hide();
			$('#sync').hide();
			
			$('#pic').show();
			$('#saveMark').show();
			
			$('#mark').css({backgroundPosition:-220});
			markSign++;
			
			hostOrMark = 1;
			function setMarkPos(e) {
				e.width = 500;
				e.height = 300;
				e.style.width = 500 + 'px';
				e.style.height = 300 + 'px';
				e.style.left = 150 + 'px';
				e.style.top = 100 + 'px';
			}
			if(hostOrMark == 0) {
				offsetX = document.getElementById("start2").offsetLeft + 148;
				offsetY = 17;
			} else if(hostOrMark == 1) {
				offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
				offsetY = 17 + 100;
			}
			setMarkPos($drawing);
			setMarkPos($graphics);
			$("#drawing").css("background-image","url('')");
			$("#graphics").css("background-image","url('')");
		} else {
			$('#snail').show();
			$('#syncnoqz').show();
			$('#sync').show();
			
			$('#pic').hide();
			$('#saveMark').hide();
			
			$('#mark').css({backgroundPosition:0});
			markSign--;
			
			hostOrMark = 0;
			function setHostPos(e) {
				e.width = width;
				e.height = height;
				e.style.width = width + 'px';
				e.style.height = height + 'px';
				e.style.left = 0 + 'px';
				e.style.top = 0 + 'px';
			}
			if(hostOrMark == 0) {
				offsetX = document.getElementById("start2").offsetLeft + 148;
				offsetY = 17;
			} else if(hostOrMark == 1) {
				offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
				offsetY = 17 + 100;
			}
			setHostPos($drawing);
			setHostPos($graphics);
			
			socket.emit('getPIC', opts.fileId);
			socket.once('getPICReturn', function (docPiceArray) {
				var url = docPiceArray[currentPage-1];
				url = url.replace("\\", "/");
				url = url.replace("\\", "/");
				urlGrap = url.split("/");
				$("#graphics").css("background-image","url('" + meetURL + url + "')");
			});
			socket.emit('getLastPNG', opts.fileId, opts.perId, currentPage);
			socket.once('getLastPNGReturn', function (meetArray) {
				if(meetArray.length>0) {
					var url = meetArray[0];
					url = url.replace("\\", "/");
					url = url.replace("\\", "/");
					$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
				} else {
					$("#drawing").css("background-image","url('')");
				}
			});
			
		}
	});
}
