function initAudience(socket, id, fileId, perId, ratio) {
    var cacheDir = CACHE_DIR + '/' + id;
	
	// elements;
    initElements();
	var nowDraw = false;
	var nowPngUrl;
	var isMark = 0; //是否签名文件
	var hostOrMark = 0; //批注还是签名
	var clear = 0;
	
	var offsetX, offsetY;
    var tool, color, thickness;
    var brushStyle = {};
	brushStyle.color = '#ff0000';
	brushStyle.thickness = '0.005';
	
    // initialize audience
    socket.once('initialize', function (data) {
		mode = data.mode;
        canvas = data.canvas;
		
        // initialize mode
        $$canvas.show();
		redrawGraphics();
    });
	
	socket.once('broadcast notfound', function (data) {
		window.location.href = reloadUrl;
    });
	
	// resize event
    setSize = function () {
        if (!canvas)
            return;
        // custom canvases size
		if(hostOrMark == 0) {
			offsetX = document.getElementById("start2").offsetLeft + 148;
			offsetY = 17;
		} else if(hostOrMark == 1) {
			offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
			offsetY = 17 + 100;
		}
        function setPos(e) {
            e.width = width;
            e.height = height;
            e.style.width = width + 'px';
            e.style.height = height + 'px';
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
	
    var files = {},
        ratio = '16:10';
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
	
	socket.emit('getPicWidthHeight', fileId);
	socket.once('getPicWidthHeightReturn', function (widthArray, heightArray) {
		width = widthArray[0];
		height = heightArray[0];
		setSize();
	});
    	
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
	
	// White mode
    socket.on('mode white', function () {
        mode = 'white';
        
        // clean
        canvas.graphics = [];
        canvas.history = [];
        redrawGraphics();
        redrawDrawing();
        // display
        $$canvas.show();
       
    });
	
    /* Events */
	
	var meetId = getQueryString("meetId");
	socket.emit('getPerName', perId);
	socket.once('getPerNameReturn', function (nameArray) {
		var perName = nameArray[0];
		$("#user").html(perName);
	});
	
	socket.emit('getPIC', fileId);
	socket.once('getPICReturn', function (docPiceArray) {
		var url = docPiceArray[currentPage-1];
		
		url = url.replace("\\", "/");
		url = url.replace("\\", "/");
		
		urlGrap = url.split("/");
		$("#graphics").css("background-image","url('" + meetURL + url + "')");
		$("#pic").css("background-image","url('" + meetURL + url + "')");
	});
	
	socket.emit('getNextPNG', fileId, perId, currentPage);
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
		if(mode == '1') {
			clear = 1;
			$("#drawing").css("background-image","url('')");
		}
	});
	
	socket.emit('isOrMark', fileId);
	socket.once('isOrMarkReturn', function (docPiceArray) {
		var isornot = docPiceArray[0];
		if(isornot == 1) {
			isMark = 1;
		}
		if(currentPage == totalPage && isMark == 1) {
			$('#mark').show();
			$('#startAnnotation').hide();
		}
	});
	
    function startDrawing(e) {
		e.preventDefault();
        var p = getPoint(e);
        if (typeof e.button === 'number' && e.button !== 0)
            return;
		if(nowDraw == true || drawing.type == 'path' || drawing.type == 'pathhost' || drawing.type == 'pathaudience') {
			return;
		}
		nowDraw = true;
        canvas.drawing = {
            type: 'path',
            color: brushStyle.color,
            width: brushStyle.thickness,
            points: [p]
        };
        socket.emit('draw path audience', p.x, p.y, brushStyle.color, brushStyle.thickness, id);
    }

    function drawing(e) {
        e.preventDefault();
        var drawing = canvas.drawing;
        if (!drawing || drawing.type !== 'path')
            return;
        var p = getPoint(e);
        drawing.points.push(p);
        socket.emit('draw path add audience', p.x, p.y, id);
        redrawDrawing();
    }

    function endDrawing(e) {
        e.preventDefault();
		
        var drawing = canvas.drawing;
        if (!drawing ||  (drawing.type !== 'path' && drawing.type !== 'pathhost' && drawing.type !== 'pathaudience'))
            return;
		nowDraw = false;
		if(drawing.type == 'pathhost' || drawing.type == 'pathaudience') {
		
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
			socket.emit('draw path end audience', lastPoint.x, lastPoint.y , id);
			canvas.drawing = null;
			redrawDrawing();
		}
        
    }
	
    // draw path from host
    socket.on('draw path', function (x, y, color, width) {
		nowDraw = true;
        canvas.drawing = {
            type: 'pathhost',
            color: color,
            width: width,
            points: [{x: x, y: y}]
        };
    });
    socket.on('draw path add', function (x, y) {
        var drawing = canvas.drawing;
        if (drawing && drawing.type === 'pathhost') {
            drawing.points.push({x: x, y: y});
            // redraw
            redrawDrawing();
        }
    });
    socket.on('draw path end', function (x, y) {
        var drawing = canvas.drawing;
        if (drawing && drawing.type === 'pathhost') {
            drawing.points.push({x: x, y: y});
            canvas.graphics.push(drawing);
            drawPath(ctxGraphics, drawing);
            canvas.drawing = null;
            canvas.history = [];
            redrawDrawing();
			nowDraw = false;
        }
    });
	
	// draw sync from app
	socket.on('draw path audience return', function (x, y, color, width ,backid) {
		if(id == backid) {
			nowDraw = true;
			canvas.drawing = {
				type: 'pathaudience',
				color: color,
				width: width,
				points: [{x: x, y: y}]
			};
		}  
    });
    socket.on('draw path add audience return', function (x, y, backid) {
		if(id == backid) {
			var drawing = canvas.drawing;
			if (drawing && drawing.type === 'pathaudience') {
				drawing.points.push({x: x, y: y});
				// redraw
				redrawDrawing();
			}
		}
    });
    socket.on('draw path end audience return', function (x, y , backid) {
		if(id == backid) {	
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
	
    // drawing control
    socket.on('draw clear', function () {
		$("#drawing").css("background-image","url('')");
		clear = 1;
        canvas.graphics.push({type: 'clear'});
        redrawGraphics();
    });
    socket.on('draw undo', function () {
        if (canvas.graphics.length > 0) {
            canvas.history.push(canvas.graphics.pop());
            redrawGraphics();
        }
		if( clear == 1 && nowPngUrl != null) {
			clear = 0;
			$("#drawing").css("background-image","url('" + nowPngUrl + "')");
		}
    });
    socket.on('draw redo', function () {
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
    });
	
	// drawing control from app
	socket.on('draw clear audience return', function (backid) {
		if(id == backid) {
			$("#drawing").css("background-image","url('')");
			clear = 1;
			canvas.graphics.push({type: 'clear'});
			redrawGraphics();
		}
    });
	socket.on('draw undo audience return', function (backid) {
		if(id == backid) {
			if (canvas.graphics.length > 0) {
				canvas.history.push(canvas.graphics.pop());
				redrawGraphics();
			}
			if( clear == 1 && nowPngUrl != null) {
				clear = 0;
				$("#drawing").css("background-image","url('" + nowPngUrl + "')");
			}
		}
    });
	socket.on('draw redo audience return', function (backid) {
		if(id == backid) {
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
	
	// Change page
	socket.on('lastPage', function () {
		currentPage--;
		$("#graphics").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
		$("#pic").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
		socket.emit('getLastPNG', fileId, perId, currentPage);
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
		clear = 0;
        canvas.graphics.push({type: 'clear'});
		canvas.graphics = [];
		canvas.history = [];
        redrawGraphics();
    });
	socket.on('nextPage', function () {
		currentPage++;
		$("#graphics").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
		$("#pic").css("background-image","url('" + meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage + ".jpg" + "')");
		socket.emit('getNextPNG', fileId, perId, currentPage);
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
		clear = 0;
        canvas.graphics.push({type: 'clear'});
		canvas.graphics = [];
		canvas.history = [];
        redrawGraphics();
    });
	
	// Change page from app
	socket.on('lastPage audience return', function (backid) {
		if(id == backid) {
			currentPage--;
			$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')");
			$("#pic").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')");
			socket.emit('getLastPNG', fileId, perId, currentPage);
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
			clear = 0;
			canvas.graphics.push({type: 'clear'});
			canvas.graphics = [];
			canvas.history = [];
			redrawGraphics();
		}
    });
	socket.on('nextPage audience return', function (backid) {
		if(id == backid) {
			currentPage++;
			$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')");
			$("#pic").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')");
			socket.emit('getNextPNG', fileId, perId, currentPage);
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
			clear = 0;
			canvas.graphics.push({type: 'clear'});
			canvas.graphics = [];
			canvas.history = [];
			redrawGraphics();
		}
    });

	socket.on('draw clear mark', function () {
        canvas.graphics.push({type: 'clear'});
        redrawGraphics();
    });
	
	socket.on('draw clear audience mark return', function (backid) {
		if(id == backid) {
			canvas.graphics.push({type: 'clear'});
			redrawGraphics();
		}
    });
	
    // Host disconnected
    socket.on('host disconnected', function () {
        // reload page to exit
        window.location.href = reloadUrl;
    });

    // start joining
    socket.emit('join', id);
	
	
	
	initDrawing();
    enableDrawing();
	
	$drawing.addEventListener('mousedown', startDrawing);
    $drawing.addEventListener('mousemove', drawing);
    $drawing.addEventListener('mouseup', endDrawing);
    $drawing.addEventListener('touchstart', startDrawing);
    $drawing.addEventListener('touchmove', drawing);
    $drawing.addEventListener('touchend', endDrawing);
	
	
	// click event
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
			}
			
            redrawGraphics();
			socket.emit('draw undo audience', id);
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
			
            socket.emit('draw redo audience', id);
        }
    });
	
	$('#clear').click(function () {
		if( nowPngUrl != null) {
			clear = 1;
			$("#drawing").css("background-image","url('')");
		}
		clear = 1;
        canvas.graphics.push({type: 'clear'});
        canvas.history = [];
        redrawGraphics();
        socket.emit('draw clear audience', id);
    });
	
	$('#red').click(function (e) {
		brushStyle.color = '#ff0000';
	});
	
	$('#green').click(function (e) {
		brushStyle.color = '#22b147';
	});
	
	$('#blue').click(function (e) {
		brushStyle.color = '#0000ff';
	});
	
	$('#oneNumber').click(function (e) {
		brushStyle.thickness = '0.003';
	});
	
	$('#twoNumber').click(function (e) {
		brushStyle.thickness = '0.004';
	});
	
	$('#threeNumber').click(function (e) {
		brushStyle.thickness = '0.005';
	});
	
	$('#endsync').click(function (e) {
		window.location.href = reloadUrl;
	});
	
	$('#saveMark').click(function (e) {
		var temp = currentPage;
		$.ajax({
			url: "/saveImage" + "?id=" + id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/mark_compositeAction.action?noteDocId=" + fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + perId,
					type: "post",
					dataType:"jsonp",
					success: function(result){
						
						socket.emit('getPIC', fileId);
						socket.once('getPICReturn', function (docPiceArray) {
							var url = docPiceArray[temp-1];
							url = url.replace("\\", "/");
							url = url.replace("\\", "/");

							$("#graphics").css("background-image","url('" + meetURL + url + "')");
						});
						socket.emit('getLastPNG', fileId, perId, currentPage);
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
				canvas.history = [];
				redrawGraphics();
				socket.emit('draw clear audience mark', id);
				
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
	
	
	var markSign = 0;
	$('#mark').click(function (e) {
		if(markSign==0) {
			$('#snail').hide();
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
			
			socket.emit('getPIC', fileId);
			socket.on('getPICReturn', function (docPiceArray) {
				var url = docPiceArray[currentPage-1];
				url = url.replace("\\", "/");
				url = url.replace("\\", "/");
				urlGrap = url.split("/");
				$("#graphics").css("background-image","url('" + meetURL + url + "')");
			});
			socket.emit('getLastPNG', fileId, perId, currentPage);
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
	
	
	$('#lastPage').click(function (e) {

		currentPage--;
		var temp = currentPage+1;
		
		$.ajax({
			url: "/saveImage" + "?id=" + id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + fileId + "&noteNo=" + temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + perId + "&clear=" + clear,
					type: "post",
					dataType:"jsonp",
					success: function(result){
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
		$('#nextPage').css({backgroundPosition:0});
		if(currentPage==1) {
			// change lastPage css
			//$('#lastPage').css({backgroundPosition:-206});
		}
		
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		
		$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		$("#pic").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		
		socket.emit('getLastPNG', fileId, perId, currentPage);
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
        socket.emit('lastPage audience', id);
		socket.emit('draw clear');
    });
	
	$('#nextPage').click(function (e) {
		
		currentPage++;
		var temp = currentPage-1;
		
		$.ajax({
			url: "/saveImage" + "?id=" + id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + fileId + "&noteNo=" + temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + perId + "&clear=" + clear,
					type: "post",
					dataType:"jsonp",
					success: function(result){
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
		
		socket.emit('getNextPNG', fileId, perId, currentPage);
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
        socket.emit('nextPage audience', id);
		socket.emit('draw clear');
    });
	
	
	$('#pic').hide();
	$('#mark').hide();
	$('#saveMark').hide();
	$('#syncnoqz').hide();
	$('#sync').hide();
}
