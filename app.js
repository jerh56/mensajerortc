//var app = require('express').createServer()
//var io = require('socket.io').listen(app);

// Logica de atenci'on

// usuario se conecta al chat
// se busca al agente que lo va a atender funcion selectuser()
//  selectuser regresa el id del agente
// se busca el room en el que atendera el agente funcion selectroom()
// selectroom regresa el id del room
//  se enlaza usuario y agente en el room disponible 

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);



var pg = require('pg');

// la BD se debe crear antes de ejecutar este script
var connectionString = process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/mensajero';

var client = new pg.Client(connectionString);
client.connect();




//app.listen(8080);

// routing
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/indexUser.html');
});

app.get('/agent', function (req, res) {
  res.sendFile(__dirname + '/indexAgent.html');
});


app.get('/roomscript.js', function (req, res) {
  res.sendFile(__dirname + '/roomscript.js');
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

      socket.posRoom ='';	  	
      if ((username != null)  && (username !="")){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
        currentroom ='En espera'
        for (var agentname in agentnames){
          console.log(agentnames[agentname].nombre);
         

         if (agentnames[agentname].cantidad < 3 ){

           agentnames[agentname].cantidad = agentnames[agentname].cantidad + 1;
           socket.posRoom = ("0" + agentnames[agentname].cantidad).slice(-2);
           currentroom = agentnames[agentname].nombre + socket.posRoom;
           break;
         }
         

        }
        console.log(currentroom);
        socket.isuser = true;
		socket.room = currentroom;
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join(currentroom);
		
		
        // eco al room del agente
		socket.broadcast.to(agentnames[agentname].nombre).emit('newuser', 'MENSAJERO RTC',username, currentroom, socket.posRoom);


		// echo to client they've connected
		//socket.emit('updatechat', 'MENSAJERO RTC', 'Te esta atendiendo ' + currentroom);
		
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(currentroom).emit('updatechat', 'MENSAJERO RTC', username + ' se ha conectado a ' + currentroom, '');
		socket.emit('updaterooms', rooms, currentroom);
		console.log('Se conecto el usuario: ' + username);

		var query = client.query("INSERT INTO msjsolicitudes(usuario,mensaje,fechahora) VALUES ($1,$2,CURRENT_TIMESTAMP)", [username,'se conecto el usuario'], function(err, result) {
          console.log(result);
         })

	 }
	});

  

// when the client emits 'addagent', this listens and executes
	socket.on('addagent', function(agentname){
	if ((agentname != null)  && (agentname!="")){
         // store the username in the socket session for this client
		
        socket.isuser = false;
		socket.agentname = agentname;
		// store the room name in the socket session for this client
		socket.room = agentname;
		
		//cantidad = 0 esta cantidad
		if (agentnames.length == 0){
             agentnames[0] = ({"nombre":agentname, "cantidad":0});
             // add the client's username to the global list
		     rooms[0] = agentname;
            
		}
		else{
            agentnames.push ({"nombre":agentname, "cantidad":0});
            // add the client's username to the global list
		    rooms[agentname] = agentname; 
     
        }
        
        // Obtener numero de rooms que puede atender el agente

		// send client to room por default
		socket.join(agentname);
		//socket.join(agentname+'02');
		// echo to client they've connected
		socket.emit('updatechat', 'MENSAJERO RTC', 'AGENTE: ' + agentname,'');
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(agentname).emit('updatechat', 'MENSAJERO RTC', agentname + ' es el agente disponible en esta sala', '');
		socket.emit('updaterooms', rooms, agentname);
		console.log('Se conecto el agente: ' + agentname);
     }
    });


// Este evento sucede cuando un nuevo usuario se conecto y lo va a atender un agente
	socket.on('addagentroom', function(roomname,agentname,username,pos){
		if ((roomname != null)  && (roomname!="")){
	         // store the username in the socket session for this client
			
	       
			//socket.agentname = agentname;
			
			
	        // Obtener numero de rooms que puede atender el agente

			// send client to room por default
			socket.join(roomname);
			//socket.join(agentname+'02');
			// echo to client they've connected
			socket.emit('updatechat', 'MENSAJERO RTC', 'AGENTE: ' + roomname, pos);
			// echo to room 1 that a person has connected to their room:
			socket.broadcast.to(roomname).emit('updatechat', 'MENSAJERO RTC', 'Sala: ' + roomname, pos);
			io.sockets.in(roomname).emit('updatechat', 'MENSAJERO RTC', 'Se conecto el usuario ' + username , pos);
			socket.emit('updaterooms', rooms, roomname);
			console.log('Se conecto el agente: ' + agentname);
	     }
    });



	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data,socket.posRoom);
		console.log(socket.username);
		console.log(socket.room);
	});


// when the client emits 'sendchatagent', this listens and executes
	socket.on('sendchatagent', function (data, username,pos) {
		// we tell the client to execute 'updatechat' with 2 parameters
	io.sockets.in(username).emit('updatechat', socket.agentname, data,pos);
	console.log(socket.room);
	console.log(socket.agentname);
	console.log(data);
	console.log(username);
	
       // io.sockets.in(socket.agentname + '02' ).emit('updatechat', socket.agentname, data);

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

		// preguntar si es usuario para avisar al agente que se desconecto

		if (socket.isuser === true){
			io.sockets.in(socket.room).emit('updatechat', 'MENSAJERO RTC', "Se desconecto el usuario " + socket.username, socket.posRoom);
			console.log("Se desconecto el usuario " + socket.username)
		}
		else{
			io.sockets.in(socket.room).emit('updatechat', 'MENSAJERO RTC', "Se desconecto el agente " + socket.agentname, socket.posRoom);
	        console.log("Se desconecto el agente " + socket.agentname)
			
		}
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
		
		// falta modificar esta linea
		socket.leave(socket.room);
		console.log('Se desconecto el agente: ' + socket.agentname);
		console.log(socket.room);
       }

	});
});

http.listen(8080, function(){
  console.log('Escuchando en  *:8080');
  console.log('MENSAJERO RTC 1.0');
});