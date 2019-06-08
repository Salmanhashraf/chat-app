const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app); //creates http server this line of code is done anyway behind the scenes with express
const io = socketio(server); //initializing socket.io
//socket io expects to be called with the raw http server but when express creates it behind the scene we don't have access to the server which is why we had to create it ourselves  

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public');

//let count = 0;


app.use(express.static(publicDirectoryPath)); //all static files are found in public folder

/*io.on('connection', (socket) => { //this function looks for the specific event "connection" and a callback function is called upon connection
    console.log('New Websocket connection')

    socket.emit('countUpdated', count) //use socket object to send an event from the server with socket.emit. Socket is an object that allows us to communicate with the server and client. The second arg is available to the client side. In this case count is available in chat.js
     //socket.emit takes in an event, in this case a custom event that we created called countUpdated 

     socket.on('increment', () => { //server listening for increment event 
         count++;
         //socket.emit('countUpdated', count); //emitting updated count from server back to the client
         io.emit('countUpdated', count); //io.emit sends the data to all users on the app automatically without having to refresh
     });
}); */

io.on('connection', (socket) => {
    console.log('New Websocket connection');


    socket.on('join', (options, callback) => {
        const {error, user} = addUser({ id: socket.id, ...options}); //... breaks down everything held in options obj in this case the user and the room 

        if (error) {
            return callback(error);
        }
        socket.join(user.room); //socket.join only available on server and allows us to join the room specified

        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined the chat!`)); //This send a message to everyone but the socket that just joined
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });//.to() allows only to emit to a socket within a certain room

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter(); //npm module for filtering profanity 
        if(filter.isProfane(message)) { //checking message to see if its profane
            return callback('Profanity is not allowed'); //if so return this error
        }
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback(); //acknowledgement of message sent from client
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on('disconnect', () => { //whenever user disconnects we use socket.on with the disconnect event created by socket.io. We don't have to emit anything from the client side for disconnect because it is a built in event and socket.io handles these type of events on its own.
        const user = removeUser(socket.id); //removing user from array when disconnecting

        if(user) { //we do this because a user with invalid credentials could have left the join page and in that case we don't have to send the message below
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the chat!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });

});

server.listen(port, () => { //passed app to server which is why we do server.listen
    console.log('Server has started on port 3000');
})