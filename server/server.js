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

// background file upload usage
const upload = require('express-fileupload')
const fs = require('fs');

// for socket io identification
let roomDataListCollection = {}     // a wrapper of dataList in different rooms
                                    //e.g  {'room1': 'dataList', 'room2': 'dataList1', 'room3': 'dataList2'}
// let dataList = []                   //e.g. [ {{data: ...}, {aspect: ...}}, {{data: ...}, {aspect: ...}} ,...]
// self defined data to link user name and socket id
var name_id_list_server = []        //e.g. [{name: "henry", socketid: "12345"},...]
// specialzied for peerjs
let roomSocketList = {}             // e.g. 
                                    // { 
                                    //   roomid1:   [ { peerid: 123, socketid: 987, name: 'john' }, { peerid: 321, socketid: 876, name: 'david' } ],
                                    //   roomid2:   [ { peerid: 456, socketid: 789, name: 'dead' }, { peerid: 654, socketid: 678, name: 'henry' } ] 
                                    // }

// peerjs video call
app.use("/peerjs", peerServer);
// for register usage
app.use(bodyParser.json());
app.use(cookieParser());
// background file upload usage
app.use(upload())
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

// extract filen name without its type
function removeType(filenameWithType){
    let temparr = filenameWithType.split('.')
    temparr.pop()
    return temparr.join('.')
}

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
    if (username === undefined) username='but please login first'
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
    if (username === undefined) username='but please login first'
    res.render('forums',{ username: username})
});
app.get('/posts/:category', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    if (username === undefined) username='but please login first'
    res.render('posts',{ username: username})
});
app.get('/setting', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    if (username === undefined) username='but please login first'
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
        res.json({status: 'Account created successfully!'})
    }catch(error){
        if (error.code === 11000){ //duplicated key
            // return res.json({status: 'error', error: 'Username already in use'})
            return res.json({status: 'Username already in use'})
        }
        throw error
    }
})

// handles file upload (for avatar background)
app.post('/setBackgroundImage', (req, res)=>{
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    if (id===undefined || username===undefined){
        res.json({status: 'please login first!'})
    } else{
        if (req.files){
            let file = req.files.file
            let filename = id + '.' + file.name.split('.')[file.name.split('.').length-1]
            // remove duplicated file for same user, regardless of any time
            let backgroundFiles = fs.readdirSync('../backgroundImages/');
            backgroundFiles.forEach( (bg,key) =>{
                if (removeType(bg) == id){
                    fs.unlinkSync('../backgroundImages/'+bg)
                }
            })
            // add to system
            file.mv('../backgroundImages/'+filename)
            res.json({status: 'upload success!'})
        } else{
            res.json({status: 'please select a file first'})
        }
    }
})

app.post('/getBackgroundImage', (req, res)=>{
    const cookies = req.cookies;
    let id = cookies.id
    if (id!==undefined){
        let filename ="";
        let backgroundFiles = fs.readdirSync('../backgroundImages/');
        backgroundFiles.forEach( (bg,key) =>{
            if (removeType(bg) == id){
                filename = bg
            }
        })
        if (filename!=""){
            res.cookie('background', 'backgroundImages/'+filename, {httpOnly: true})
            res.json({status: 'backgroundImages/'+filename})
        } else {
            res.json({status: 'not found pic'})
        }
    }
})
// pulbic resource getter
app.get('/backgroundImages/:filename', (req, res)=>{
    res.sendFile(req.params.filename, { root: '../backgroundImages/' })
})
app.get('/csspublicresource/:filename', (req, res)=>{
    res.sendFile(req.params.filename, { root: '../csspublicresource/' })
})
io.on('connection', (socket) => {
    // get the name of user
    io.to(socket.id).emit('tellMeYourName');
    socket.on('myNameis', (username, roomId)=>{
        socket.join(roomId);
        name_id_list_server.push({
            name: username,
            socketid: socket.id,
            roomId: roomId
        })
        // amend the name_id_list_server to suit the room before sending to the room
        room_suit_name_id_list_server = name_id_list_server.filter(user => user.roomId==roomId);
        io.to(roomId).emit('newSocketConnect', room_suit_name_id_list_server);
        console.log('>>> ['+socket.id+'] connected ---> name_id_list_server: ',name_id_list_server)
        console.log(`acutal name_id_list_server to room ${roomId}: `,room_suit_name_id_list_server)
    })
    socket.on("disconnect", (reason) => {
        let roomId;
        // remove it from name list
        for (const i in name_id_list_server){
            if (name_id_list_server[i].socketid==socket.id){
                roomId = name_id_list_server[i].roomId  // identify the room id for further work
                name_id_list_server.splice(i, 1);
            }
        }
        // remove the user from dataList
        if (roomDataListCollection[roomId]!=undefined){
            for (count in roomDataListCollection[roomId]){
                if (roomDataListCollection[roomId][count].aspect.socketOwner == socket.id){
                    roomDataListCollection[roomId].splice(count, 1);
                }
            }
        }
        console.log('roomDataListCollection after disconnection:', roomDataListCollection)
        // amend the name_id_list_server to suit the room before sending to the room
        room_suit_name_id_list_server = name_id_list_server.filter(user => user.roomId==roomId);
        io.to(roomId).emit('socketDisconnected', room_suit_name_id_list_server);
        console.log('<<< ['+socket.id+'] diconnect ---> name_id_list_server: ',name_id_list_server)
    })

    // exchange avatar data
    setInterval(() => {
        io.emit('gatherAvatarData');
    }, 10);
    // manipulate asynchronous data reuturned from clients
    socket.on('returnedAvatarData', (userData, roomId) => {
        // if a room never have any connections, init the room's datalist
        if (roomDataListCollection[roomId]==undefined || roomDataListCollection[roomId].length == 0){
            roomDataListCollection[roomId]=[]
        }
        let initData = true     // true if a user is never added to the room's datalist
        // overwrite data respectively
        for (const serverData in roomDataListCollection[roomId]) {
            if (userData.aspect.socketOwner == roomDataListCollection[roomId][serverData].aspect.socketOwner){
                roomDataListCollection[roomId][serverData] = userData
                initData = false
            }
        }
        // in case the data is not initialized
        if (initData){
            roomDataListCollection[roomId].push(userData)
        }
        // console.log("roomDataListCollection:", roomDataListCollection)
        // console.log("sent out avatar:", roomDataListCollection[roomId])
        io.to(roomId).emit('usefulAvatarData', roomDataListCollection[roomId]);
    });

    // peerjs video call stuff
    socket.on("join-room", (roomId, userId, userName) => {
        console.log(`joined room: ${roomId}, ${userId}, ${userName}`)
        socket.join(roomId);
        io.to(roomId).emit("user-connected", userId);
    
        // room states
        if (roomSocketList[roomId]==undefined){
          roomSocketList[roomId] = [{ peerid: userId, socketid: socket.id, name: userName }]
        }
        else{
          roomSocketList[roomId].push({ peerid: userId, socketid: socket.id, name: userName })
        }
    
        console.log('peer object list:', roomSocketList)
    
        // chat room server side
        socket.on('send-chat-message', message => {
            io.to(roomId).emit('chat-message', { message: message, from: socket.id})
        })
        // socket.on("message", (message) => {
        //   io.to(roomId).emit("createMessage", message, userName);
        // });
    });
    socket.on('connection-request', (roomID, userID)=>{
        io.to(roomID).emit("user-connected", userID, socket.id);
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
        // name_id_list_server handled in disconenct part for roomid issues
        // tell all user the new roomSocketList[roomID], peerID (of the disconencted person)
        io.to(roomID).emit("user-disconnected", peerID)
    })
});

HTTPserver.listen(3000, () => {
    console.log('listening on *:3000');
});
  