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
	
	var nowDraw = false;
	
    // elements;
	initElements();
	totalPage = opts.totalPage;
	
    // size
    var canvasSpacing = 10,
        maxButtonSize = 80,
        buttonSpacing = 0.6,
        refWidth = 1000;
    var origWidth, origHeight;
    // ratio
    ratio = ratio.split(':');
    ratio = parseInt(ratio[0]) / parseInt(ratio[1]);
	
	
    function setTransform($$elem, transform) {
        $$elem.css('-webkit-transform', transform);
        $$elem.css('-moz-transform', transform);
        $$elem.css('-o-transform', transform);
        $$elem.css('transform', transform);
    }

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
        /*width = origWidth;
        height = origHeight;
        if (width == 0 || height == 0)
            return;
		
        // compute canvas size
        var curRatio = width / height;
        if (curRatio > ratio)
            width = height * ratio;
        else if (curRatio < ratio)
            height = width / ratio;*/
        // resize canvases
        offsetX = left+ (origWidth - left - right - width) / 2;
        offsetY = top + (origHeight - top - bottom - height) / 2;
		
		offsetX = document.getElementById("start2").offsetLeft + 148 + 150;
		offsetY = 17 + 100;
		if (width < 868) {
			width = 868;
		}
        function setPos(e) {
            e.width = width;
            e.height = height;
            e.style.width = width + 'px';
            e.style.height = height + 'px';
           // e.style.left = offsetX + 'px';
           // e.style.top = offsetY + 'px';
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
    
	
    var tool, color, thickness;
    var brushStyle = {};
	brushStyle.color = '#ff0000';
	brushStyle.thickness = '0.007';
	
    /* Tools */
    
    function initDrawing() {
        canvas.graphics = [];
        canvas.history = [];
        redrawGraphics();
    }

    function enableDrawing() {
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		$('#lastPage').css({backgroundPosition:-206});
        $$canvas.css('pointer-events', 'auto');
    }

    function disableDrawing() {
        $$canvas.css('pointer-events', 'none');
    }

    $('#enable_drawing').click(function () {
        var $$t = $(this);
        if ($$t.hasClass('current')) {
            disableDrawing();
            $$t.removeClass('current');
        }
        else {
            enableDrawing();
            $$t.addClass('current');
        }
    });

    function setCurrentTool(elem) {
        $('#drawing_tools>button').removeClass('current');
        $(elem).addClass('current');
    }

    $('#pencil').click(function () {
        if (tool === 'pencil')
            return;
        // set current
        setCurrentTool(this);
        tool = 'pencil';
        // init palette & show chooser
        
        $$palette.empty().attr('class', '')
                 .addClass('pencil-color');
        for (var i = 0; i < PENCIL_COLORS.length; ++i) {
            var $color = $('<color>')[0];
            $color.dataset.color = PENCIL_COLORS[i];
            $color.style.backgroundColor = PENCIL_COLORS[i];
            $$palette.append($color);
        }
        
        // set brush style
        $('color').eq(0).click();
        $('thickness').eq(0).click();
    });
	
    $('#eraser').click(function () {
        if (tool == 'eraser')
            return;
        // set current
        setCurrentTool(this);
        tool = 'eraser';
        // hide color & init chooser
        $('#color').hide();
        $('#thickness').show();
        // set brush style
        brushStyle.color = '#ffffff';
        $('thickness').eq(-1).click();
    });

    $('#highlighter').click(function () {
        if (tool == 'highlighter')
            return;
        // set current
        setCurrentTool(this);
        tool = 'highlighter';
        // init palette & show chooser
        $('#color').show();
        $$palette.empty().attr('class', '')
                 .addClass('highlighter-color');
        for (var i = 0; i < HIGHLIGHTER_COLORS.length; ++i) {
            var $color = $('<color>')[0];
            $color.dataset.color = HIGHLIGHTER_COLORS[i];
            $color.style.backgroundColor = HIGHLIGHTER_COLORS[i];
            $$palette.append($color);
        }
        $('#thickness').show();
        // set brush style
        $('color').eq(0).click();
        $('thickness').eq(-1).click();
    });

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
        canvas.graphics.push({type: 'clear'});
        canvas.history = [];
        redrawGraphics();
        socket.emit('draw clear');
    });

    
    $('#saveImage').click(function () {
		$.ajax({
			url: "/saveImage",
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				console.log("result="+result);
			}
		});
	});

    /* Drawing */
	
	aaa = function() {
		offsetX = document.getElementById("start2").offsetLeft + 148  + 150;
		offsetY = 17 + 100;
		offsetX = offsetX - document.getElementById("canvas").scrollLeft - document.body.scrollLeft;
		offsetY = offsetY - document.getElementById("canvas").scrollTop - document.body.scrollTop;
	}
	window.onscroll = function() {
		offsetX = document.getElementById("start2").offsetLeft + 148  + 150;
		offsetY = 17 + 100;
		offsetX = offsetX - document.getElementById("canvas").scrollLeft - document.body.scrollLeft;
		offsetY = offsetY - document.getElementById("canvas").scrollTop - document.body.scrollTop;
	}

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
		if(nowDraw == true ) {
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
        if (!drawing || drawing.type !== 'path')
            return;
        if (!e.touches)
            drawing.points.push(getPoint(e));
		nowDraw = false;
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
			nowDraw = false;
			var drawing = canvas.drawing;
			if (drawing && drawing.type === 'pathaudience') {
				drawing.points.push({x: x, y: y});
				canvas.graphics.push(drawing);
				drawPath(ctxGraphics, drawing);
				canvas.drawing = null;
				canvas.history = [];
				redrawDrawing();
			}
		} 
    });
	
	socket.on('draw clear audience return', function (id) {
		if(opts.id == id) {
			canvas.graphics.push({type: 'clear'});
			redrawGraphics();
		}
    });
	socket.on('draw undo audience return', function (id) {
		if(opts.id == id) {
			if (canvas.graphics.length > 0) {
				canvas.history.push(canvas.graphics.pop(id));
				redrawGraphics();
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
	socket.on('getPerNameReturn', function (nameArray) {
		var perName = nameArray[0];
		$("#user").html(perName);
	});
	
	socket.emit('getPIC', opts.fileId);
	socket.on('getPICReturn', function (docPiceArray) {
		var url = docPiceArray[0];
		url = url.replace("\\", "/");
		url = url.replace("\\", "/");
		urlGrap = url.split("/");
		$("#graphics").css("background-image","url('" + meetURL + url + "')");
		$("#pic").css("background-image","url('" + meetURL + url + "')");
		//document.getElementById("graphics").style.backgroundSize="753px 687px";
	});
	
	socket.emit('getPNG', opts.fileId, opts.perId);
	socket.on('getPNGReturn', function (meetArray) {
		if(meetArray.length>0) {
			var url = meetArray[0];
			url = url.replace("\\", "/");
			url = url.replace("\\", "/");
			$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
		}
	});
	
	socket.on('total Page', function (totalPage) {
		$('#totalPage').val(totalPage) ;
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
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId,
					type: "post",
					success: function(result){
				
					}
				});
			}
		});
		
		
		if(currentPage<=0) {
			currentPage++;
			return;
		}
		
		// changge nextPage css
		$('#nextPage').css({backgroundPosition:0});
		if(currentPage==1) {
			// change lastPage css
			$('#lastPage').css({backgroundPosition:-206});
		}
		
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		
		$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		
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
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId,
					type: "post",
					success: function(result){
				
					}
				});
			}
		});
			
		if(temp>=totalPage) {
			currentPage--;
			return;
		}
		
		$.ajax({
			url: meetURL + "composite/insertCurrPage_compositeAction.action?currentPage=" + currentPage,
			type: "post",
			success: function(result){
				
			}
		});
		
		// change lastPage css
		$('#lastPage').css({backgroundPosition:0});
		if(currentPage>=totalPage) {
			// changge nextPage css
			$('#nextPage').css({backgroundPosition:-206});
		}
		
		//$('#undo').css({backgroundPosition:-224});
		//$('#redo').css({backgroundPosition:-224});
		
		socket.emit('getNextPNG', opts.fileId, opts.perId, currentPage);
		socket.once('getNextPNGReturn', function (meetArray) {
			if(meetArray.length>0) {
				var url = meetArray[0];
				url = url.replace("\\", "/");
				url = url.replace("\\", "/");
				$("#drawing").css("background-image","url('" + meetURL + pngFolder + "/" + url + "')");
			} else {
				$("#drawing").css("background-image","url('')");
			}
		});
		
		$("#graphics").css("background-image","url('"+ meetURL + urlGrap[0] + "/" + urlGrap[1] + "/" + currentPage+".jpg"+"')"); 
		
		canvas.graphics.push({type: 'clear'});
		canvas.graphics = [];
        canvas.history = [];
       
	   
	   
        redrawGraphics();
        socket.emit('nextPage');
		socket.emit('draw clear');
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
		brushStyle.thickness = '0.005';
	});
	
	$('#threeNumber').click(function (e) {
		brushStyle.thickness = '0.007';
	});
	
	$('#save').click(function (e) {
		var temp = currentPage;
		$.ajax({
			url: "/saveImage" + "?id=" + opts.id,
			data: $('#graphics')[0].toDataURL("image/png"),
			type: "post",
			success: function(result){
				$.ajax({
					url: meetURL + "composite/test_compositeAction.action?noteDocId=" + opts.fileId + "&noteNo=" +  temp + "&notePicPath=" + urlGrap[1] + "&noteUser=" + opts.perId,
					type: "post",
					success: function(result){
					
					}
				});
				
				function setPos(e) {
					e.width = width;
					e.height = height;
					e.style.width = width + 'px';
					e.style.height = height + 'px';
					e.style.left = 0 + 'px';
					e.style.top = 0 + 'px';
				}
				setPos($drawing);
				setPos($graphics);
				$$snail = $('#snail');
				$snail = $$snail[0];
				setPos($snail);
				socket.emit('getPIC', opts.fileId);
				socket.on('getPICReturn', function (docPiceArray) {
					var url = docPiceArray[temp-1];
					url = url.replace("\\", "/");
					url = url.replace("\\", "/");
					urlGrap = url.split("/");
					$("#graphics").css("background-image","url('" + meetURL + url + "')");
				});
				alert(currentPage);
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
		
		
	});
	
	$('#cancel').click(function (e) {
		
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
	
	$('#pic').hide();
	var snailT = 0;
	$('#startAnnotation').click(function (e) {
		if(snailT==0) {
			$('#snail').hide();
			$('#pic').show();
			$('#startAnnotation').css({backgroundPosition:-220});
			snailT++;
			
			function setPos(e) {
				e.width = 500;
				e.height = 300;
				e.style.width = 500 + 'px';
				e.style.height = 300 + 'px';
			    e.style.left = 150 + 'px';
			    e.style.top = 100 + 'px';
			}
			setPos($drawing);
			setPos($graphics);
			$("#drawing").css("background-image","url('')");
			$("#graphics").css("background-image","url('')");
		} else {
			$('#snail').show();
			$('#startAnnotation').css({backgroundPosition:0});
			snailT--;
		}
	});
}
