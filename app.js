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
var uuid = require('uuid4');
 



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

app.get('/css/style.css', function (req, res) {
  res.sendFile(__dirname + '/css/style.css');
  console.log(' sending /css/style.css');
});

app.post('/login', function (req, res) {

  // TODO: validate the actual user user
  //var profile = {
  //  first_name: 'John',
  //  last_name: 'Doe',
  //  email: 'john@doe.com',
  //  id: 123
  //};

  // we are sending the profile in the token
  //var token = jwt.sign(profile, jwtSecret, { expiresInMinutes: 60*5 });

  res.json({token: '123456'});
});

// usernames which are currently connected to the chat
var usernames = {};

var userlist = new Array();
var agentnames = new Array();
//var agentnames = {};
var currentroom ="";
// rooms which are currently available in chat
var rooms = {};

//Cada ciertos milisegundos ejecuta esta funcion para buscar agentes disponibles
setInterval(function(){
  console.log('test');
  
  var agentroom = '0';
  var posRoom = 0;

  if (userlist.length > 0){
	  for (var agentname in agentnames){
	          //console.log(agentnames[agentname].nombre);
	         if (agentnames[agentname].cantidad < 3 ){

	           agentnames[agentname].cantidad = agentnames[agentname].cantidad + 1;
	           console.log(agentnames[agentname].cantidad);
	           posRoom = ("0" + agentnames[agentname].cantidad).slice(-2);
	           agentroom = agentnames[agentname].idroom;
	           var waitforagent = false;
	           var username ='';
	           for (var posusername in userlist){
		   
			        console.log(userlist[posusername].nombre);
			        console.log(userlist[posusername].idroom);
			        username = userlist[posusername].nombre;
			        currentroom = userlist[posusername].idroom;
			        io.sockets.in(currentroom).emit('updatechat', 'MENSAJERO RTC', 'Hay agente disponible ');
		            
                    io.sockets.in(agentroom).emit('newuser', 'MENSAJERO RTC',username, currentroom, posRoom);
		            
			             // eco al room del agente
					//socket.broadcast.to(agentroom).emit('newuser', 'MENSAJERO RTC',username, currentroom, socket.posRoom);


					// echo to client they've connected
					//io.sockets.in(currentroom).emit('updatechat', 'MENSAJERO RTC', 'Te esta atendiendo ' + currentroom);
					//io.sockets.in(socket.room).emit('updatechat', socket.username, data,socket.posRoom, socket.room);
		            //console.log(socket.username);
		             

					io.sockets.in(currentroom).emit('updatechat', 'MENSAJERO RTC','Te esta atendiendo ' + agentnames[agentname].nombre, posRoom,currentroom);
		           

					// echo to room 1 that a person has connected to their room
					//io.sockets.broadcast.to(agentroom).emit('updatechat', 'MENSAJERO RTC', username + ' se ha conectado a ' + currentroom, '');
					//io.sockets.emit('updaterooms', rooms, agentroom);
					//console.log('Se conecto el usuario: ' + username);

					var query = client.query("INSERT INTO msjsolicitudes(usuario,mensaje,fechahora) VALUES ($1,$2,CURRENT_TIMESTAMP)", [username,'se conecto el usuario'], function(err, result) {
			          console.log(result);
			         })

	                //delete userlist[username]; 
	                console.log(userlist);
		            userlist.splice(posusername,1);
		            console.log(userlist);
		            break;
	  		   }    

	           break;
	         }
	     }
   }   
			
}, 3000); 

io.sockets.on('connection', function (socket) {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;
    console.log(socket.id);
    console.log(clientIp);
	// when the client emits 'adduser', this listens and executes



	socket.on('adduser', function(username){
      // cuando un usuario se conecta se produce este evento
      socket.posRoom ='';	  	
      if ((username != null)  && (username !="")){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
        //se genera un identificador para el room
        var waitforagent = true;
        var idroom = uuid();
        // Se toma el identificador como id del room
        currentroom = idroom;
        agentroom = '0';
        //Se busca al agente disponible de los agentes conectados
        for (var agentname in agentnames){
          //console.log(agentnames[agentname].nombre);
         if (agentnames[agentname].cantidad < 3 ){

           agentnames[agentname].cantidad = agentnames[agentname].cantidad + 1;
           console.log(agentnames[agentname].cantidad);

           socket.posRoom = ("0" + agentnames[agentname].cantidad).slice(-2);
           agentroom = agentnames[agentname].idroom;
           waitforagent = false;
           break;
         }
         

        }
        // Sino encontro agente disponible se manda a la lista de espera.
        if (waitforagent){
	        //Se agrega a la lista de usuario para que 
			if (userlist.length == 0){
	             userlist[0] = ({"nombre":username, "idroom":currentroom});
	             // add the client's username to the wait list
			}
			else{
	            userlist.push ({"nombre":username, "idroom":currentroom});
	            // add the client's username to the wait list
	            console.log(userlist);
			}

			socket.isuser = true;
			socket.room = currentroom;
			// add the client's username to the global list
			usernames[username] = username;
			// send client to room 1
			socket.join(currentroom);
            socket.emit('updatechat', 'MENSAJERO RTC', 'Todos nuestros agentes estan ocupados, por favor espere');
		

        }
        else{
	        console.log(currentroom);
	        // Si es usuario asigna un valor verdadero al flag
	        socket.isuser = true;
			socket.room = currentroom;
			// add the client's username to the global list
			usernames[username] = username;
			// send client to room 1
			socket.join(currentroom);
			
			
	        // eco al room del agente
			//socket.broadcast.to(agentna).emit('newuser', 'MENSAJERO RTC',username, currentroom, socket.posRoom);

	         // eco al room del agente
			socket.broadcast.to(agentroom).emit('newuser', 'MENSAJERO RTC',username, currentroom, socket.posRoom);


			// echo to client they've connected
			//El evento updatechat envia usuario que emite, Datos, Posicion (se descontinuara), ID del room (solo en caso de que el mensaje vaya para un usuario y no un agente)
			socket.emit('updatechat', 'MENSAJERO RTC', 'Te esta atendiendo ' + currentroom, socket.posRoom, currentroom);
			
			// echo to room 1 that a person has connected to their room
			socket.broadcast.to(agentroom).emit('updatechat', 'MENSAJERO RTC', username + ' se ha conectado a ' + currentroom, '');
			socket.emit('updaterooms', rooms, agentroom);
			console.log('Se conecto el usuario: ' + username);

			var query = client.query("INSERT INTO msjsolicitudes(usuario,mensaje,fechahora) VALUES ($1,$2,CURRENT_TIMESTAMP)", [username,'se conecto el usuario'], function(err, result) {
	          console.log(result);
	         })

        }
      }
	});

  

// when the client emits 'addagent', this listens and executes
	socket.on('addagent', function(agentname){
	if ((agentname != null)  && (agentname!="")){
         // store the username in the socket session for this client
		
        socket.isuser = false;
		socket.agentname = agentname;
		// store the room name in the socket session for this client
		var idroom = uuid();
        // Se toma el identificador como id del room
        currentroom = idroom;

		socket.room = idroom;
		
		//cantidad = 0 esta cantidad
		if (agentnames.length == 0){
             agentnames[0] = ({"nombre":agentname, "cantidad":0, "idroom":idroom});
             // add the client's username to the global list
		     rooms[0] = agentname;
            
		}
		else{
            agentnames.push ({"nombre":agentname, "cantidad":0, "idroom":idroom});
            // add the client's username to the global list
		    rooms[agentname] = agentname; 
     
        }
        
        // Obtener numero de rooms que puede atender el agente

		// send client to room por default
		socket.join(idroom);
		//socket.join(agentname+'02');
		// echo to client they've connected
		socket.emit('updatechat', 'MENSAJERO RTC', 'AGENTE: ' + agentname,'');
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(idroom).emit('updatechat', 'MENSAJERO RTC', agentname + ' es el agente disponible en esta sala', '');
	    socket.emit('updaterooms', rooms, agentname);
		socket.emit('conectedagent',idroom);
		console.log('Se conecto el agente: ' + agentname);
     }
    });


// Este evento sucede cuando un nuevo usuario se conecto y lo va a atender un agente
	socket.on('addagentroom', function(idroom,agentname,username,pos){
		if ((idroom != null)  && (idroom!="")){
	         // store the username in the socket session for this client
			
	       
			//socket.agentname = agentname;
			
			
	        // Obtener numero de rooms que puede atender el agente
            
			// send client to room por default
			socket.join(idroom);
			//socket.join(agentname+'02');
			// echo to client they've connected
			socket.emit('updatechat', 'MENSAJERO RTC', 'Bienvenido: ' + agentname, pos, idroom);
			// echo to room 1 that a person has connected to their room:
			socket.broadcast.to(idroom).emit('updatechat', 'MENSAJERO RTC', 'Sala: ' + idroom, pos, idroom);
			
			io.sockets.in(idroom).emit('updatechat', 'MENSAJERO RTC', 'Se conecto el usuario ' + username , pos, idroom);
			socket.emit('updaterooms', rooms, idroom);
			console.log('Se conecto el agente: ' + agentname);
	     }
    });



	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data,socket.posRoom, socket.room);
		console.log(socket.username);
		console.log(socket.room);
	});


// Cuando el agente emite un mensaje sendchatagent
	socket.on('sendchatagent', function (data,roomname,pos) {
		// we tell the client to execute 'updatechat' with 2 parameters
	
    //enviar a id del room
	io.sockets.in(roomname).emit('updatechat', socket.agentname, data,pos);
	console.log(socket.room);
	console.log(socket.agentname);
	console.log(data);
	
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
		   //for (var PosAgentName in agentnames){
           //PosAgentName guarda la posicion o index del elemento del arreglo
           // if (agentnames[PosAgentName].nombre === socket.agentname){
           //    agentnames.splice(PosAgentName,1);
           //  break;
           //  }
          // }

		   delete rooms[socket.agentname]; 	
		   for (var agentname in agentnames){
              //console.log(agentnames[agentname].nombre);
              if (agentnames[agentname].idroom === socket.room ){
				console.log("se elimino al agente " + agentnames[agentname].nombre)
	            delete agentnames[agentname];
                
	            break;
              }
           }	


		
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