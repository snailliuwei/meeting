$(function () {
	var socket = io.connect();
	
	var fileId = getQueryString("fileId");
	var perId = getQueryString("perId");
	totalPage = getQueryString("totalPage");
	
	$('#start2').show();
	
	var hostorwatch = getQueryString("test");
	if(hostorwatch == '1') {
		var opts = {
			fileId: fileId,
			id: fileId+perId,
			perId: perId,
			ratio: '16:10',
			totalPage:totalPage
		};
		initHost(socket, opts);
	} else {
		
	}
	
    // server disconnected
    socket.on('disconnect', function () {
        // reload page to exit
        window.location.reload();
    });
});