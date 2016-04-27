var pg = require('pg');

// la BD se debe crear antes de ejecutar este script
var connectionString = process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/todo';

var client = new pg.Client(connectionString);
client.connect();
var query = client.query('CREATE TABLE items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
query.on('end', function() { client.end(); });