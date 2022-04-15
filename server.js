// The main server side code
const express = require('express');
var cors = require('cors');
const app = express();
app.use(cors())
const http = require('https');
const fs = require('fs');
require('dotenv').config()

// https certificate
const options = {
	key: fs.readFileSync('/etc/letsencrypt/live/fyp21075s1.cs.hku.hk/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/fyp21075s1.cs.hku.hk/fullchain.pem')
};
app.listen(8080, console.log("Server running"));
const HTTPSserver = http.createServer(options, app);
const io = require('socket.io')(HTTPSserver, {
    cors: {
        origin : "*",
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true
})

// for user registration
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser');
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(HTTPSserver, {
    debug: true,
});
const mongoose = require('mongoose')
const User = require('./model/user')
mongoose.connect(process.env.MONGO_CONNECT, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
// for user login
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET

// for background file upload
const upload = require('express-fileupload')

// for socket io identification in different room
let roomDataListCollection = {}     // a wrapper of dataList in different rooms
                                    //e.g  {'room1': 'dataList', 'room2': 'dataList1', 'room3': 'dataList2'}
// let dataList = []                //e.g. [ {{data: ...}, {aspect: ...}}, {{data: ...}, {aspect: ...}} ,...]
// to link user name and socket id
var name_id_list_server = []        //e.g. [{name: "henry", socketid: "12345"},...]
// for peer js
let roomSocketList = {}             // e.g. 
                                    // { 
                                    //   roomid1:   [ { peerid: 123, socketid: 987, name: 'john' }, { peerid: 321, socketid: 876, name: 'david' } ],
                                    //   roomid2:   [ { peerid: 456, socketid: 789, name: 'dead' }, { peerid: 654, socketid: 678, name: 'henry' } ] 
                                    // }

// middlewares
app.use("/peerjs", peerServer);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(upload())
// set paths
app.use("/src", express.static('./src/'));
app.use("/indexScript", express.static('./indexScript/'));
app.use("/locateFile", express.static('./locateFile/'));
app.use("/assets", express.static('./assets/'));
app.use("/userMain", express.static('./'));
app.use("/posts", express.static('./'));
app.use("/styles", express.static('./'));
// set view engine to pug
app.set("view engine", "pug")
app.set("views", "./")

/** 
 * extract filen name without its type
 * 
 * @param {string} filenameWithType    a file name with its type
 * @return {string} a file name with its type at the end
*/
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
app.get('/logout', (req, res) => {
    res.clearCookie('id');
    res.clearCookie('username');
    res.redirect('/login');
});
app.get('/login', (req, res) => {
    res.render('login',{ registerUrl: 'register', mainAPIUrl: '/api/createCookie', mainUrl: 'forums'})
});
app.get('/forums', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    if (username === undefined || id === undefined) username='but please login first'
    res.render('forums',{ username: username})
});
app.get('/setting', (req, res) => {
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    if (username === undefined) username='but please login first'
    res.render('setting',{ username: username})
});

// handles login verification
app.post('/api/login', async (req, res)=>{
    const {username, password} = req.body
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
})

// handles registers
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
            // one user can have only one background file in server
            let backgroundFiles = fs.readdirSync('./backgroundImages/');
            backgroundFiles.forEach( (bg,key) =>{
                if (removeType(bg) == id){
                    fs.unlinkSync('./backgroundImages/'+bg)
                }
            })
            file.mv('./backgroundImages/'+filename)
            res.json({status: 'upload success!'})
        } else{
            res.json({status: 'please select a file first'})
        }
    }
})
app.post('/setModel', (req, res)=>{
    const cookies = req.cookies;
    let username = cookies.username
    let id = cookies.id
    const {modelDefName} = req.body
    if (id===undefined || username===undefined){
        res.json({status: 'please login first!'})
    } else{
        res.cookie('modelDefName', modelDefName, {httpOnly: true})
        res.json({status: 'select success!'})
    }
})

// return the avatar name stored in cookie
// return 'haru if no cookie set'
app.post('/getMyModelCookie', (req, res)=>{
    const cookies = req.cookies;
    let modelDefName = cookies.modelDefName
    if (modelDefName===undefined){
        res.json({modelDefName: 'haru'})
    } else{
        res.json({modelDefName: modelDefName})
    }
})

app.post('/getBackgroundImage', (req, res)=>{
    const cookies = req.cookies;
    let id = cookies.id
    if (id!==undefined){
        let filename ="";
        let backgroundFiles = fs.readdirSync('./backgroundImages/');
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
    }else{
        res.json({status: 'please login first!'})
    }
})
app.post('/getModelByName', (req, res)=>{
    const {modelDefName} = req.body
    let modelDef ={};
    let foundModel = false;
    let assetsFiles = fs.readdirSync('./assets/');
    assetsFiles.forEach( (asset,key) =>{
        if (asset == modelDefName){
            foundModel = true;
            const dir = `./assets/${modelDefName}/${modelDefName}.1024/`;
            fs.readdir(dir, (err, files) => {
                texturesList = []
                for (let i=0; i<files.length; i++){
                    texturesList[i] = `assets/${modelDefName}/${modelDefName}.1024/${files[i]}`
                }
                // forge the modelDef
                modelDef = {
                    "type":"Live2D Model Setting",
                    "name":`${modelDefName}`,
                    "model":`assets/${modelDefName}/${modelDefName}.moc`,
                    "textures": texturesList
                };
                res.json(modelDef)  // will return empty if modelDef not found
            });
        }
    })
})
// pulbic resource getters
app.get('/backgroundImages/:filename', (req, res)=>{
    res.sendFile(req.params.filename, { root: './backgroundImages/' })
})
app.get('/csspublicresource/:filename', (req, res)=>{
    res.sendFile(req.params.filename, { root: './csspublicresource/' })
})

// socket io server-client connections
io.on('connection', (socket) => {
    // get the name of user
    io.to(socket.id).emit('tellMeYourName');
    socket.on('myNameis', (username, roomId, desiredAvatar)=>{
        socket.join(roomId);
        name_id_list_server.push({
            name: username,
            socketid: socket.id,
            roomId: roomId,
            avatarName: desiredAvatar
        })
        // remove sockets with duplicated username (prevent reconnection bug)
        for (let user in name_id_list_server){
            for (let compareUser in name_id_list_server){
                if (name_id_list_server[user].name == name_id_list_server[compareUser].name && name_id_list_server[user].socketid != name_id_list_server[compareUser].socketid){
                    name_id_list_server.splice(user, 1);
                }
            }
        }

        // filter the name_id_list_server list to return only name id pairs in the room
        room_suit_name_id_list_server = name_id_list_server.filter(user => user.roomId==roomId);
        io.to(roomId).emit('newSocketConnect', room_suit_name_id_list_server);
        console.log('>>> ['+socket.id+'] connected ---> name_id_list_server: ',name_id_list_server)
    })
    socket.on("disconnect", (reason) => {
        let roomId;
        // remove it from name_id_list_server
        for (const i in name_id_list_server){
            if (name_id_list_server[i].socketid==socket.id){
                roomId = name_id_list_server[i].roomId
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
        // filter the name_id_list_server list to return only name id pairs in the room
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
        // in case the room is not initialized in server side
        if (roomDataListCollection[roomId]==undefined || roomDataListCollection[roomId].length == 0){
            roomDataListCollection[roomId]=[]
        }
        let initData = true     // true if a user is never added to the room's datalist
        for (const serverData in roomDataListCollection[roomId]) {
            if (userData.aspect.socketOwner == roomDataListCollection[roomId][serverData].aspect.socketOwner){
                roomDataListCollection[roomId][serverData] = userData
                initData = false
            }
        }
        // in case the user data is not initialized in server side
        if (initData){
            roomDataListCollection[roomId].push(userData)
        }
        io.to(roomId).emit('usefulAvatarData', roomDataListCollection[roomId]);
    });

    // peerjs audio call
    socket.on("join-room", (roomId, userId, userName) => {
        socket.join(roomId);
        io.to(roomId).emit("user-connected", userId);
    
        // in case the room is not initialized in server side
        if (roomSocketList[roomId]==undefined){
          roomSocketList[roomId] = [{ peerid: userId, socketid: socket.id, name: userName }]
        }
        else{
          roomSocketList[roomId].push({ peerid: userId, socketid: socket.id, name: userName })
        }
    
        // chat room
        socket.on('send-chat-message', message => {
            io.to(roomId).emit('chat-message', { message: message, from: socket.id})
        })
    });
    // handles connection and disconnections of socket io
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
        io.to(roomID).emit("user-disconnected", peerID)
    })
});

HTTPSserver.listen(8443, () => {
    console.log('listening on *:8443');
});
  