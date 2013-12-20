$(function () {
    var $bclist = $('#bclist');
    var socket = io.connect();
	
    // server disconnected
    socket.on('disconnect', function () {
        // reload page to exit
        window.location.href = reloadUrl;
    });
	
	$('#start2').show();
	var id = getQueryString("id");
	var fileId = getQueryString("fileId");
	var perId = getQueryString("perId");
	currentPage = getQueryString("currentPage");
	totalPage = getQueryString("totalPage");
	
	initAudience(socket, id, fileId, perId, '4:3');
});

