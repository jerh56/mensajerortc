//var app = require('express').createServer()
//var io = require('socket.io').listen(app);

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//app.listen(8080);

// routing
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/indexUser.html');
});

app.get('/agent', function (req, res) {
  res.sendFile(__dirname + '/indexAgent.html');
});


app.get('/contacto', function(req, res){
  res.send('<h1>Contactos</h1> <p>Mi lista de contacto</p>');
 });

// usernames which are currently connected to the chat
var usernames = {};


var agentnames = new Array();
//var agentnames = {};
var currentroom ="";
// rooms which are currently available in chat
var rooms = {};

io.sockets.on('connection', function (socket) {
    
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
      if ((username != null)  && (username !="")){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
        currentroom ='room1'
        for (var agentname in agentnames){
          console.log(agentnames[agentname].nombre);
         if (agentnames[agentname].disponible === 0){
           currentroom = agentnames[agentname].nombre;
           agentnames[agentname].disponible = 1;
           break;
         }
        }

		socket.room = currentroom;
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join(currentroom);
		// echo to client they've connected
		socket.emit('updatechat', 'MENSAJERO RTC', 'Te esta atendiendo ' + currentroom);
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(currentroom).emit('updatechat', 'MENSAJERO RTC', username + ' se ha conectado a esta sala');
		socket.emit('updaterooms', rooms, currentroom);
		console.log('Se conecto el usuario: ' + username);
	 }
	});


// when the client emits 'addagent', this listens and executes
	socket.on('addagent', function(agentname){
	if ((agentname != null)  && (agentname!="")){
         // store the username in the socket session for this client
		socket.agentname = agentname;
		// store the room name in the socket session for this client
		socket.room = agentname;
		
		//disponible = 0 esta disponible
		if (agentnames.length == 0){
             agentnames[0] = ({"nombre":agentname, "disponible":0});
             // add the client's username to the global list
		     rooms[0] = agentname;
            
		}
		else{
            agentnames.push ({"nombre":agentname, "disponible":0});
            // add the client's username to the global list
		    rooms[agentname] = agentname; 
     
        }
        
		// send client to room 1
		socket.join(agentname);
		// echo to client they've connected
		socket.emit('updatechat', 'MENSAJERO RTC', 'AGENTE: ' + agentname);
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(agentname).emit('updatechat', 'MENSAJERO RTC', agentname + ' es el agente disponible en esta sala');
		socket.emit('updaterooms', rooms, agentname);
		console.log('Se conecto el agente: ' + agentname);
     }
    });


	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
		
	});


// when the client emits 'sendchatagent', this listens and executes
	socket.on('sendchatagent', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.agentname, data);
		
	});


	socket.on('switchRoom', function(newroom){
		// leave the current room (stored in session)
		socket.leave(socket.room);
		// join new room, received as function parameter
		socket.join(newroom);
		socket.emit('updatechat', 'MENSAJERO RTC', 'te has conectado a '+ newroom);
		// sent message to OLD room
		socket.broadcast.to(socket.room).emit('updatechat', 'MENSAJERO RTC', socket.username+' ha salido de la sala');
		// update socket session room title
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('updatechat', 'MENSAJERO RTC', socket.username+' se ha unido a esta sala');
		socket.emit('updaterooms', rooms, newroom);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		

        if (socket.username != undefined){
          // remove the username from global usernames list
		
		   delete usernames[socket.username];
          
		
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'MENSAJERO RTC', socket.username + ' se ha desconectado');
		socket.leave(socket.room);
		console.log('Se desconecto el usuario: ' + socket.username);
       }


       if (socket.agentname != undefined){
          // remove the username from global usernames list
		
		   //delete agentnames[socket.agentname];
		   for (var PosAgentName in agentnames){
           //PosAgentName guarda la posicion o index del elemento del arreglo
            if (agentnames[PosAgentName].nombre === socket.agentname){
               agentnames.splice(PosAgentName,1);
             break;
             }
           }

		   delete rooms[socket.agentname]; 		


		
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'MENSAJERO RTC', socket.agentname + ' se ha desconectado');
		socket.emit('updaterooms', rooms, socket.agentname);
		socket.leave(socket.room);
		console.log('Se desconecto el agente: ' + socket.agentname);
       }

	});
});

http.listen(8080, function(){
  console.log('Escuchando en  *:8080');
  console.log('MENSAJERO RTC 1.0');
});