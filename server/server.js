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
// set view engine to pug
app.set("view engine", "pug")
app.set("views", "../")

app.get('/', (req, res) => {
    // res.sendFile('simple.html', { root: '../' })
    res.render('index',{ title: 'Chat room '+req.id})
    console.dir("coming id: ",req.id)
});
app.get('/register', (req, res) => {
    res.render('register',{ title: 'Register for '+req.id})
});
app.get('/login', (req, res) => {
    res.render('login',{ title: 'login for '+req.id})
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

        return res.json({status: 'ok', data: token})
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
    }, 1000);
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
        console.log(message)
        io.emit('chat-message', { message: message, from: socket.id})
    })
    // end of chat room server side
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
  