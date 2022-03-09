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
// for register usage
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('../model/user')
const bcrypt = require('bcrypt')
mongoose.connect('mongodb://localhost:27017/local-api-register', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
// for login usage
const jwt = require('jsonwebtoken')
const JWT_SECRET = '32pvutywoh#cgiwao(&%^$U#Y@;qrfhoq3pfo72 39fj,gp90tu004yb445jdqadpso||alsavmvkljoetw[qpavmknhug'

// for socket io identification
let clientList = [] 
let dataList = []
const users = {} // just for chat room server side, may merge with clientList later for simplicity

// for register usage
app.use(bodyParser.json());
// set paths
app.use("/src", express.static('../src/'));
app.use("/indexScript", express.static('../indexScript/'));
app.use("/locateFile", express.static('../locateFile/'));
app.use("/assets", express.static('../assets/'));
app.use("/userMain", express.static('../'));
// set view engine to pug
app.set("view engine", "pug")
app.set("views", "../")

let JWTidList = []

app.post('/api/userMain', (req, res)=>{
    let username = req.body.username;
    let id = req.body.customID;

    return res.json({status: 'ok', id: id, username: username})
})

app.get('/userMain/:id', (req, res) => {
    // res.sendFile('simple.html', { root: '../' })
    for (IDloop in JWTidList){
        if (JWTidList[IDloop].id == req.params.id){
            res.render('index',{ title: 'Chat room ', username: JWTidList[IDloop].username})
        }
    }
});

app.get('/register', (req, res) => {
    res.render('register',{ loginUrl: 'login'})
});
app.get('/login', (req, res) => {
    res.render('login',{ registerUrl: 'register', mainAPIUrl: '/api/userMain', mainUrl: 'userMain'})
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
        JWTidList.push({
            id: user._id,
            username: username
        });
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

// self defined data to link user name and socket id
var name_id_list_server = [] //e.g. [{name: "henry", socketid: "12345"},...]

io.on('connection', (socket) => {
    // get the name of user
    io.to(socket.id).emit('tellMeYourName');
    socket.on('myNameis', (username)=>{
        name_id_list_server.push({
            name: username,
            socketid: socket.id
        })
        console.log('server name list:', name_id_list_server)
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
        console.log('server name list:', name_id_list_server)
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
    
    // audio part
    io.to(socket.id).emit('tellMeYourStream');
    socket.on('myStreamis', stream => {
        io.emit('newStreamTag', stream)
    })
    
    // end of chat room server side
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
  