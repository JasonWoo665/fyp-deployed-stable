// streaming stuff - server side
const express = require('express');
var cors = require('cors');
const app = express();
app.use(cors())
const http = require('http');
const HTTPserver = http.createServer(app);
const io = require('socket.io')(HTTPserver, {
    cors: {
        origin : "*",
    },
})
// for register usage
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser');
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(HTTPserver, {
    debug: true,
});
const mongoose = require('mongoose')
const User = require('../model/user')
mongoose.connect('mongodb+srv://jasonwoo665:jackyxd0211@local-api-register.jcjb1.mongodb.net/local-api-register?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
// for login usage
const jwt = require('jsonwebtoken')
const JWT_SECRET = '32pvutywoh#cgiwao(&%^$U#Y@;qrfhoq3pfo72 39fj,gp90tu004yb445jdqadpso||alsavmvkljoetw[qpavmknhug'

// for socket io identification
let clientList = []                 //e.g. [ socketid1, socketid2,...]
let dataList = []                   //e.g. [ {{data: ...}, {aspect: ...}}, {{data: ...}, {aspect: ...}} ,...]
// self defined data to link user name and socket id
var name_id_list_server = []        //e.g. [{name: "henry", socketid: "12345"},...]
// specialzied for peerjs
let roomSocketList = {}   // e.g. 
                          // { 
                          //   roomid1:   [ { peerid: 123, socketid: 987, name: 'john' }, { peerid: 321, socketid: 876, name: 'david' } ],
                          //   roomid2:   [ { peerid: 456, socketid: 789, name: 'dead' }, { peerid: 654, socketid: 678, name: 'henry' } ] 
                          // }

// peerjs video call
app.use("/peerjs", peerServer);
// for register usage
app.use(bodyParser.json());
app.use(cookieParser());
// set paths
app.use("/src", express.static('../src/'));
app.use("/indexScript", express.static('../indexScript/'));
app.use("/locateFile", express.static('../locateFile/'));
app.use("/assets", express.static('../assets/'));
app.use("/userMain", express.static('../'));
app.use("/posts", express.static('../'));
app.use("/styles", express.static('../'));
// set view engine to pug
app.set("view engine", "pug")
app.set("views", "../")

app.post('/api/createCookie', (req, res)=>{
    let username = req.body.username;
    let id = req.body.customID;
    res.cookie('username', username, {httpOnly: true})
    res.cookie('id', id, {httpOnly: true})
    return res.json({status: 'ok'})
})

// app.get('/readcookies', (req, res)=>{
//     const cookies = req.cookies;
//     console.log(cookies)
//     res.json(cookies)
// })

app.get('/userMain/:topic', (req, res) => {
    // res.sendFile('simple.html', { root: '../' })
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    res.render('index',{ title: req.params.topic+' discussion room ', username: username, ROOM_ID: req.params.topic})
});

app.get('/register', (req, res) => {
    res.render('register',{ loginUrl: 'login'})
});
app.get('/login', (req, res) => {
    res.render('login',{ registerUrl: 'register', mainAPIUrl: '/api/createCookie', mainUrl: 'forums'})
});
app.get('/forums', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    res.render('forums',{ username: username})
});
app.get('/posts/:category', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    res.render('posts',{ username: username})
});
app.get('/setting', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    res.render('setting',{ username: username})
});

// handles login stuff
app.post('/api/login', async (req, res)=>{
    const {username, password} = req.body
    console.log(username, password)
    const user =  await User.findOne({ username }).lean()
    if (!user){
        return res.json({status: 'error', error: 'Invalid username/password'})
    }
    if (await bcrypt.compare(password, user.password)){ 
        const token = jwt.sign({
            id: user._id, 
            username: user.username
        }, JWT_SECRET)
        return res.json({status: 'ok', data: token, username: user.username})
    }
    res.json({status: 'error', error: 'Invalid username/password'})
    // res.json({status: 'ok', data: `${username} : ${password}`})
})

// handles register stuff
app.post('/api/register', async (req, res)=>{
    const {username, password: plainTextPassword} = req.body
    const password = await bcrypt.hash(plainTextPassword,10)
    try{
        const response = await User.create({
            username,
            password
        })
        res.json({status: 'ok'})
        console.log('User created successfully:', response)
    }catch(error){
        if (error.code === 11000){ //duplicated key
            return res.json({status: 'error', error: 'Username already in use'})
        }
        throw error
    }

})

io.on('connection', (socket) => {
    // socket.on("join-room", (roomId, userId, userName) => {
    // get the name of user
    io.to(socket.id).emit('tellMeYourName');
    socket.on('myNameis', (username)=>{
        name_id_list_server.push({
            name: username,
            socketid: socket.id
        })
        console.log('socket server name list:', name_id_list_server)
        // broadcast it
        io.emit('newNameList', name_id_list_server);
    })
    // update the user list when new user connects
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
        // also remove it from name list
        for (const i in name_id_list_server){
            if (name_id_list_server[i].socketid==socket.id){
                name_id_list_server.splice(i, 1);
            }
        }
        console.log('socket server name list:', name_id_list_server)
        // tell everyone the user left
        socket.broadcast.emit('newNameList', name_id_list_server);
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

    // chat room server side
    socket.on('send-chat-message', message => {
        console.log(message)
        io.emit('chat-message', { message: message, from: socket.id})
    })

    // peerjs video call stuff
    socket.on("join-room", (roomId, userId, userName) => {
        console.log(`joined room: ${roomId}, ${userId}, ${userName}`)
        socket.join(roomId);
        io.to(roomId).emit("user-connected", userId, socket.id);
    
        // room states
        if (roomSocketList[roomId]==undefined){
          roomSocketList[roomId] = [{ peerid: userId, socketid: socket.id, name: userName }]
        }
        else{
          roomSocketList[roomId].push({ peerid: userId, socketid: socket.id, name: userName })
        }
    
        console.log('peer object list:', roomSocketList)
    
        socket.on("message", (message) => {
          io.to(roomId).emit("createMessage", message, userName);
        });
    });
    socket.on('connection-request', (roomID, userID)=>{
        io.to(roomID).emit("user-connected", userID);
    })
    socket.on("disconnecting", (reason)=>{
        // socket.rooms structure: { socketid: socketid, roomid: roomid} , defined by socketio
        let roomID, peerID
        for (let x of socket.rooms){
          if (x!=socket.id) roomID=x
        }
        // remove the user form list, also remove the room if no user left in the room
        if (roomSocketList[roomID]!=undefined){
          for (user in roomSocketList[roomID]){
            if (roomSocketList[roomID][user].socketid == socket.id){
              peerID = roomSocketList[roomID][user].peerid
              delete roomSocketList[roomID][user]
            }
          }
        }
        console.log('someone left')
        console.log(roomSocketList)
        // tell all user the new roomSocketList[roomID], peerID (of the disconencted person)
        io.to(roomID).emit("user-disconnected", peerID)
    })
});

HTTPserver.listen(3000, () => {
    console.log('listening on *:3000');
});
  