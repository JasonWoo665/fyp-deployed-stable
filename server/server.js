// streaming stuff - server side
const express = require('express');
var cors = require('cors');
const app = express();
app.use(cors())
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin : "*",
    },
})

let clientList = [] 
let dataList = []
const users = {} // just for chat room server side, may merge with clientList later for simplicity

app.use("/src", express.static('../src/'));
app.use("/indexScript", express.static('../indexScript/'));
app.use("/locateFile", express.static('../locateFile/'));
app.use("/assets", express.static('../assets/'));
// set view engine to pug
app.set("view engine", "pug")
app.set("views", "../")

app.get('/', (req, res) => {
    // res.sendFile('simple.html', { root: '../' })
    res.render('index',{ title: 'Chat room '+req.id})
});

io.on('connection', (socket) => {
    // update the user list when new usesr connects
    if (!clientList.includes(socket.id)){
        clientList.push(socket.id)
        io.emit('newConnect', clientList);
        console.log('<<<>>> broadcasted:'+clientList)
    }
    console.log('>>> ['+socket.id+'] connected ---> '+clientList)

    // handle socket disconnect case
    socket.on("disconnect", (reason) => {
        // remove the user from clientList and dataList
        if (clientList.includes(socket.id)){
            clientList.splice(clientList.indexOf(socket.id), 1);
            // also remove it from dataList
            for (const count in dataList){
                if (dataList[count].aspect.socketOwner == socket.id){
                    dataList.splice(count, 1);
                }
            }
        }
        // tell everyone the user left
        socket.broadcast.emit('someoneDisconnect', clientList);
        console.log('<<< ['+socket.id+'] diconnect ---> '+clientList)
    });
    // exchange avatar data
    setInterval(() => {
        io.emit('gatherAvatarData');
    }, 10);
    // manipulate asynchronous data reuturned from clients
    socket.on('returnedAvatarData', (userData) => {
        let initData = true
        // overwrite data respectively
        for (const serverData in dataList) {
            if (userData.aspect.socketOwner == dataList[serverData].aspect.socketOwner){
                dataList[serverData] = userData
                initData = false
            }
        }
        // remove the data if the user is no longer in the chatrm

        // in case the data is not initialized
        if (initData){
            dataList.push(userData)
        }
        io.emit('usefulAvatarData', dataList);
    });

    // start of chat room server side
    socket.on('send-chat-message', message => {
        socket.broadcast.emit('chat-message', { message: message, from: socket.id})
    })
    socket.on('disconnect', () => {
        socket.broadcast.emit('user-disconnected', users[socket.id])
        delete users[socket.id]
    })
    // end of chat room server side
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
  