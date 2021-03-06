var CACHE_DIR = '/cache';
var HEADER_PREFIX = 'webapp.white-';

// state variables
var mode, canvas, video, slide;

// size
var width, height;

// elements
var $$canvas, $$drawing, $$graphics, $$video, $$slide, $$slideWrapper;
var $canvas, $drawing, $graphics, $video, $slide, $slideWrapper;
var ctxGraphics, ctxDrawing;
var slideControl;
var urlGrap, urlDraw;
var totalPage, currentPage = 1;
var meetURL = "http://192.168.3.51:8080/meet/"; 
var nodeURL = "http://192.168.3.51:8089/";
var pngFolder = "2013"; 
var reloadUrl = meetURL + "frontLoginAction/skipMain_frontLoginAction.action";

function initElements() {
    $$canvas = $('#canvas');
    $$drawing = $('#drawing');
    $$graphics = $('#graphics');
    $$video = $('#video');
    $$slideWrapper = $('#slide_wrapper');
    $$slide = $('#slide');
    $canvas = $$canvas[0];
    $drawing = $$drawing[0];
    $graphics = $$graphics[0];
    $video = $$video[0];
    $slideWrapper = $$slideWrapper[0];
    $slide = $$slide[0];
    ctxGraphics = $graphics.getContext('2d');
    ctxDrawing = $drawing.getContext('2d');
}

// drawing functions
function redrawGraphics() {
    var ctx = ctxGraphics;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    for (var i = canvas.graphics.length - 1; i >= 0; --i) {
        var graph = canvas.graphics[i];
        if (graph.type === 'clear')
            break;
        else if (graph.type === 'path')
            drawPath(ctx, graph);
		else if (graph.type === 'pathhost')
            drawPath(ctx, graph);
		else if (graph.type === 'pathaudience')
            drawPath(ctx, graph);
    }
    ctx.restore();
	
	//$("#tulip").attr("src","3.jpg");
	//alert($("#tulip").attr("src"));
	//var img=document.getElementById("tulip");
	//ctx.drawImage(img,0,0);
}
function redrawDrawing() {
    ctxDrawing.clearRect(0, 0, width, height);
    if (!canvas.drawing)
        return;
    drawPath(ctxDrawing, canvas.drawing);
}
function drawPath(ctx, graph) {
    var path = graph.points;
    if (path.length <= 1)
        return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = graph.width * width;
    ctx.strokeStyle = graph.color;

    ctx.beginPath();
    // move to the first point
    ctx.moveTo(path[0].x * width, path[0].y * height);

    for (i = 1; i < path.length - 2; i ++)
    {
        var xc = (path[i].x + path[i + 1].x) / 2 * width;
        var yc = (path[i].y + path[i + 1].y) / 2 * height;
        ctx.quadraticCurveTo(path[i].x * width, path[i].y * height, xc, yc);
    }
    // curve through the last two path
    if (path.length >= 2) {
       
    }
    ctx.stroke();

    ctx.restore();
}

function humanReadablizeSize(size) {
    if (size < 1024)
        return size + ' B';
    if (size < 1024 * 1024)
        return Math.round(size / 1024).toFixed(2) + ' KB';
    if (size < 1024 * 1024 * 1024)
        return Math.round(size / 1024 / 1024).toFixed(2) + ' MB';
    return Math.round(size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function getFilePath(id, fileId) {
    return '/file/' + id + '/' + fileId;
}

function cleanWhite() { 
	$$canvas.hide(); 
}

function cleanVideo() {
    $$video.hide().empty()
           .attr('src', '').removeAttr('src');
}
function cleanSlide() {
    $$slideWrapper.hide();
    $$slide.attr('src', 'about:blank');
}

function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) 
		return unescape(r[2]); 
	return null;
}