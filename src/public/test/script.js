// variables
var canvas1, ctx1;
var image;
var iMouseX, iMouseY = 1;
var bMouseDown = false;
var iZoomRadius = 100;
var iZoomPower = 2;

// drawing functions
function clear() { // clear canvas function
    ctx1.clearRect(0, 0, ctx1.canvas.width, ctx1.canvas.height);
}

function drawScene() { // main drawScene function
    clear(); // clear canvas
	
	
	
    if (bMouseDown) { // drawing zoom area
	
		
		
        ctx1.drawImage(image, 0 - iMouseX * (iZoomPower - 1), 0 - iMouseY * (iZoomPower - 1), ctx1.canvas.width * iZoomPower, ctx1.canvas.height * iZoomPower);
        ctx1.globalCompositeOperation = 'destination-atop';

        var oGrd = ctx1.createRadialGradient(iMouseX, iMouseY, 0, iMouseX, iMouseY, iZoomRadius);
        oGrd.addColorStop(0.8, "rgba(0, 0, 0, 1.0)");
        oGrd.addColorStop(1.0, "rgba(0, 0, 0, 0.1)");
        ctx1.fillStyle = oGrd;
        ctx1.beginPath();
        ctx1.arc(iMouseX, iMouseY, iZoomRadius, 0, Math.PI*2, true); 
        ctx1.closePath();
        ctx1.fill();
		
		// draw source image
		//ctx1.drawImage(image, 0, 0, ctx1.canvas.width, ctx1.canvas.height);
    }

    
}

$(function(){
    // loading source image
	image = new Image();
	image.onload = function () {
	}
	image.src =  meetURL + "2013/20130929143035_f30724507c682d0c/" + currentPage+".jpg";

    // creating canvas object
    canvas1 = document.getElementById('drawing');
    ctx1 = canvas1.getContext('2d');

    $('#drawing').mousemove(function(e) { // mouse move handler
        var canvasOffset = $(canvas1).offset();
        iMouseX = Math.floor(e.pageX - canvasOffset.left);
        iMouseY = Math.floor(e.pageY - canvasOffset.top);
    });

    $('#drawing').mousedown(function(e) { // binding mousedown event
        bMouseDown = true;
    });

    $('#drawing').mouseup(function(e) { // binding mouseup event
        //bMouseDown = false;
    });
	
	function touchmove1(e) { // mouse move handler
        var canvasOffset = $(canvas1).offset();
        iMouseX = Math.floor(e.pageX - canvasOffset.left);
        iMouseY = Math.floor(e.pageY - canvasOffset.top);
    }
	
	function drawing1(e) { // mouse move handler
        bMouseDown = true;
    }
	
	function touchend1(e) { // mouse move handler
         //bMouseDown = false;
    }
	
	$('#drawing')[0].addEventListener('touchstart', touchmove1);
    $('#drawing')[0].addEventListener('touchmove', drawing1);
    $('#drawing')[0].addEventListener('touchend', touchend1);
	
	$('#fd').click(function (e) {
		//$("#graphics").css("background-image","url('" + meetURL + pngFolder + "/" + "20131012171544_30f55cc58b7c450d/1.jpg" + "')");
		bMouseDown = false;
	});


    setInterval(drawScene, 30); // loop drawScene
});