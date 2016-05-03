$('#datasend1').click( function() {
			var message = $('#data1').val();
			$('#data1').val('');
			$('#data1').focus(); // manda el enfoque al input
			// tell server to execute 'sendchat' and send along one parameter
			socket.emit('sendchatagent', message, socket.localusername + '01', '1');
		});

		// when the client hits ENTER on their keyboard
		$('#data1').keypress(function(e) {
			if(e.which == 13) {
				$(this).blur();
				$('#datasend1').focus().click();
			}
		});