// The main client script to communicate with server
var chara = [{}];
var canvas = [{}];
var i = 0;
var CAN_SIZE = 1020; // pixel and resolution of avatar

// name_id_list: a list to link user name and socket id
var name_id_list = []; //e.g. [{name: "henry", socketid: "12345"},...]
const socket = io("fyp21075s1.cs.hku.hk:8443");

/** 
 * get the modelDef (for model object) when given name of a model
 * 
 * @param {string} modelDefName    puppet variable.
 * @return {object} model definition of the given name
*/
async function getModelObj(modelDefName){
  let returnTemp
  const renderResult = await fetch('/getModelByName', {
      method: 'POST',
      headers: {
        'Content-type' : 'application/json'
      },
      body: JSON.stringify({
         modelDefName
      })
  }).then((res) => res.json()).then(modelResult=>{
    returnTemp =  modelResult
  })
  return returnTemp
}

/** 
 * get the modelDef save in my cookie
 * 
 * @return {object} name of model definition saved in my cookie
*/
async function getMyModelCookie(){
  let returnTemp
  const renderResult = await fetch('/getMyModelCookie', {
      method: 'POST',
      headers: {
        'Content-type' : 'application/json'
      }
  }).then((res) => res.json()).then(modelCookieResult=>{
    returnTemp =  modelCookieResult.modelDefName
  })
  return returnTemp
}

// キャンバスと削除ボタン削除イベント
/** 
 * delete an avatar canvas window
 * 
 * @param {number} canid    puppet variable.
 * @param {number} delbtnid puppet variable.
 * @param {string} i        The socket id of the canvas.
*/
function canvas_del(canid, delbtnid, i) {
  chara[0][i].cancelAnimation();
  delete chara[0][i];
  delete canvas[0][i];
  // remove the userArea regarding to the socket id
  const userArea = document.getElementsByClassName("userArea-"+i);
  while(userArea.length > 0){
    userArea[0].parentNode.removeChild(userArea[0]);
  }
  adjustmonitor(name_id_list.length)
}

// キャンバスボタン押下イベント
/** 
 * create an avatar canvas window
 * 
 * @param {string}  socketID  socket id of canvas
 * @param {string}  modelName name of the model definition
*/
function newCanvas(socketID, modelName) {
  // キャンバス
  var ele = document.createElement("canvas");
  ele.style.cssText = `
        width: 370.38px; 
        height: 512px;
    `;
  ele.id = "glcanvas" + socketID;
  let namediv = document.createElement("div");
  namediv.id = "namediv-" + "glcanvas" + socketID;
  // set the user name according to name_id_list
  let userArea = document.createElement('div');
  userArea.className = 'userArea-'+socketID
  userArea.appendChild(ele);
  userArea.appendChild(namediv); //name of the avatar
  document.getElementById("can").appendChild(userArea)
  // Canvasを取得する
  canvas[0][socketID] = document.getElementById(ele.id);
  canvas[0][socketID].width = canvas[0][socketID].height = CAN_SIZE;
  // Live2D生成
  // get modelDef of the required model to init Live2D
  getModelObj(modelName).then(modelObjResult=>{
    fetchAvatarTypeComplete = true
    chara[0][socketID] = new Simple(canvas[0][socketID], ele.id, socketID, modelObjResult)
    adjustmonitor(name_id_list.length)
  })
}

/** 
 * maintain server name id list and local name id list by finding missing avatars in name_id_list from name_id_list_server
 * 
 * @param {array}   name_id_list          user name and socket id pair in local 
 * @param {array}   name_id_list_server   user name and socket id pair in server
 * @param {string}  name                  puppet variable, always be "name"
 * @param {string}  socketid              puppet variable, always be "socketid"
 * @return list of sockets in server, but not in local
*/
function compareArraysWithAttributeMissing(name_id_list, name_id_list_server, name, socketid){
  const isSameUser = (name_id_list, name_id_list_server) => name_id_list[name] == name_id_list_server[name] && name_id_list[socketid] == name_id_list_server[socketid];
  // Get items that only occur in the left array,
  // using the compareFunction to determine equality.
  const onlyInLeft = (left, right, compareFunction) => 
  left.filter(leftValue =>
    !right.some(rightValue => 
      compareFunction(leftValue, rightValue)));
  const onlyInB = onlyInLeft(name_id_list_server, name_id_list, isSameUser);
  return(onlyInB);
}

/** 
 * maintain server name id list and local name id list by finding redundant avatars found in name_id_list
 * 
 * @param {array}   name_id_list          user name and socket id pair in local 
 * @param {array}   name_id_list_server   user name and socket id pair in server
 * @param {string}  name                  puppet variable, always be "name"
 * @param {string}  socketid              puppet variable, always be "socketid"
 * @return list of sockets in local, but not in server
*/
function compareArraysWithAttributeExtra(name_id_list, name_id_list_server, name, socketid){
  const isSameUser = (name_id_list, name_id_list_server) => name_id_list[name] == name_id_list_server[name] && name_id_list[socketid] == name_id_list_server[socketid];
  // Get items that only occur in the left array,
  // using the compareFunction to determine equality.
  const onlyInLeft = (left, right, compareFunction) => 
  left.filter(leftValue =>
    !right.some(rightValue => 
      compareFunction(leftValue, rightValue)));
  const onlyInA = onlyInLeft(name_id_list, name_id_list_server, isSameUser);
  return(onlyInA);
}

/** 
 * adjust canvas size according to number of participants
 * 
 * @param {number}  pptNo number of participants (in a room) 
*/
function adjustmonitor(pptNo){
  if (window.matchMedia("(max-width: 1360px)").matches){
    for (let sockets in chara[0]){
      let tempCanvasID = chara[0][sockets].canvasId
      document.getElementById(tempCanvasID).style.width = '160px';
      document.getElementById(tempCanvasID).style.height = '221.1px';
    }
    return
  }
  let setWidth;
  let setHeight;
  if (pptNo <= 2){
    setWidth= 370.38;
    setHeight= 512;
  }
  if (pptNo == 3){
    setWidth= 177.23;
    setHeight= 245;
  }
  if (pptNo > 3){
    setWidth= 177.23;
    setHeight= 245;
  }
  for (let sockets in chara[0]){
    let tempCanvasID = chara[0][sockets].canvasId
    document.getElementById(tempCanvasID).style.width = setWidth+'px';
    document.getElementById(tempCanvasID).style.height = setHeight+'px';
  }
  if ((pptNo >= 3) && (pptNo <= 5)){
    document.querySelector("div[class^='userArea-']:first-child > canvas[id^='glcanvas']").style.width = "370.38px";
    document.querySelector("div[class^='userArea-']:first-child > canvas[id^='glcanvas']").style.height = "512px";
  }
  if (pptNo<=8 && pptNo>=3){
    document.querySelector("#can").style.flexDirection = "column";
    document.querySelector("#can").style.alignItems = "center";
    document.querySelector("#can").style.justifyContent = "center";
  } else {
    document.querySelector("#can").style.flexDirection = "row";
  }
}

/** 
 * adjust canvas size in responsive case
 * 
 * @param {number}  x listener of window size 
*/
function myFunction(x) {
  if (x.matches) { // If media query matches
    let chatrm = document.querySelector('.text-chat-room');
    let topic = document.querySelector('.topic');
    let showing = true;
    topic.addEventListener('click', e=>{
      if (showing){
        document.querySelector('.showmsg').style.height= "400px"
        document.querySelector('.chatWrap').style.display= "flex"
        chatrm.style.height= "auto"
      } else {
        document.querySelector('.showmsg').style.height= "0px"
        document.querySelector('.chatWrap').style.display= "none"
        chatrm.style.height= "0px"
      }
      showing = !showing
    })
    let canvaslist = document.querySelectorAll("canvas[id^='glcanvas']")
    for (let i=0; i<canvaslist.length; i++){
      canvaslist[i].style.width = '160px';
      canvaslist[i].style.height = '221.1px';
      document.querySelector('#can').style.flexDirection= "row" 
    } 
  }
}
var x = window.matchMedia("(max-width: 1360px)")
myFunction(x) // Call listener function at run time
x.addEventListener("change", ()=>{
  myFunction(x) // Attach listener function on state changes
})
var y = window.matchMedia("(min-width: 1360px)")
y.addEventListener("change",()=>{
  adjustmonitor(name_id_list.length)
})

// streaming - client side
let localDataList = []; // list of avatar data including model object
let handShakeComplete = false; // start gathering avatar data only after username synchronized in name_id_list and name_id_list_server 
let fetchAvatarTypeComplete = false; // start gathering avatar data only after fetching avatar modelDef
let selfBackgroundImageCanvas = getBGimage();
// get the background image from cookie
async function getBGimage(){
  const result = await fetch('/getBackgroundImage', {
      method: 'POST',
      headers: {
          'Content-type' : 'application/json'
      }
  }).then((res) => res.json()).then((result)=>{
    selfBackgroundImageCanvas = result.status
  })
}
// data structure to broadcast for rendering - renderDataObj
// renderDataObj: headZ, headY, headX, leftEyeOpenRatio, rightEyeOpenRatio, eyeDirX, eyeDirY, mouthOpen, mouthForm, socketOwner, background

// handshake
socket.on("tellMeYourName", () => {
  getMyModelCookie().then(desiredAvatar=>{
    socket.emit("myNameis", username, ROOM_ID, desiredAvatar);
  })
});
// handle new connections and disconnections
socket.on('newSocketConnect', name_id_list_server=>{
  // render all other missing avatars
  let difference = compareArraysWithAttributeMissing(name_id_list,name_id_list_server, "name","socketid")
  for (const missingAvatar in difference) {
    name_id_list.push(difference[missingAvatar]);
    // add all missing avatars to window
    if (document.getElementById('glcanvas'+difference[missingAvatar].socketid.toString())==undefined){
      newCanvas(difference[missingAvatar].socketid.toString(),difference[missingAvatar].avatarName.toString());
      let divtag = document.getElementById(
        "namediv-" + "glcanvas" + difference[missingAvatar].socketid      // add missing names to corresponding divs
      );
      divtag.textContent = difference[missingAvatar].name;
      handShakeComplete = true; // set to true for first time connector only
    }
  }
  // remove extra canvas from previous socket.io reconnections
  difference = compareArraysWithAttributeExtra(name_id_list,name_id_list_server, "name","socketid")
  for (const extraAvatar in difference) {
    name_id_list.splice(
      name_id_list.indexOf(difference[extraAvatar]),
      1
    );
    canvas_del(
      "glcanvas" + difference[extraAvatar].socketid,
      "delbtn" + difference[extraAvatar].socketid,
      difference[extraAvatar].socketid
    );
  }
})
socket.on('socketDisconnected', name_id_list_server=>{
  // remove redundant avatars
  let difference = compareArraysWithAttributeExtra(name_id_list,name_id_list_server, "name","socketid")
  for (const extraAvatar in difference) {
    name_id_list.splice(
      name_id_list.indexOf(difference[extraAvatar]),
      1
    );
    canvas_del(
      "glcanvas" + difference[extraAvatar].socketid,
      "delbtn" + difference[extraAvatar].socketid,
      difference[extraAvatar].socketid
    );
  }
})

// send out my avatar data on server request
socket.on("gatherAvatarData", () => {
  if (renderDataObj.data.headZ != undefined && socket.id!= undefined && selfBackgroundImageCanvas!=undefined) {
    renderDataObj.aspect.socketOwner = socket.id;
    renderDataObj.aspect.background = selfBackgroundImageCanvas;
    socket.emit("returnedAvatarData", renderDataObj, ROOM_ID);
  }
});
// get manipulated datalist back from server for rendering avatars in canvas
socket.on("usefulAvatarData", (dataList) => {
  if (handShakeComplete && fetchAvatarTypeComplete){
    localDataList = dataList;
    for (const count in dataList) {
      if (chara[0][dataList[count].aspect.socketOwner]){
        chara[0][dataList[count].aspect.socketOwner].renderDataObj =
          dataList[count];
      }
    }
  }
});

// text chatroom
let sendButton = document.getElementById("sendButton"); // the button to send message
let msgBox = document.getElementById("message-input");  // the message text input field
let showmsg = document.getElementsByClassName("showmsg")[0];
function sendMessageHandler(message) {
  msgBox.value = "";
  if (message.charAt(message.length - 1) == "\n") {
    message = message.substring(0, message.length - 1);
  }
  if(message.length!=0)
  socket.emit("send-chat-message", message);
}
msgBox.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessageHandler(msgBox.value);
  }
});
sendButton.addEventListener("click", function (event) {
  sendMessageHandler(msgBox.value);
});

socket.on("chat-message", (message_from) => {
  let msgOut = document.createElement("div");
  if (message_from.from == socket.id) {
    // I sent out a message
    msgOut.className = "mymsg"; //set the color
    msgOut.textContent = message_from.message;
    showmsg.appendChild(msgOut);
  } else {
    // someone else sent out a message
    msgOut.className = "msg"; //set the color
    msgOut.textContent = message_from.message;
    // show the name of sender
    let wrapMsg = document.createElement("div");
    wrapMsg.className = "wrapMsg";
    for (const usernamei in name_id_list) {
      if (message_from.from == name_id_list[usernamei].socketid) {
        wrapMsg.textContent = name_id_list[usernamei].name;
      }
    }
    wrapMsg.appendChild(msgOut);
    showmsg.appendChild(wrapMsg);
  }
});

// peer js audio communication part
var mypeerID;
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {}

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "8443",
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: false,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      video.className = call.peer
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
      peers[call.peer] = call
    });

    socket.on("user-connected", (userId) => {
      if (userId!=mypeerID){
        connectToNewUser(userId, stream);
      }
    });
    socket.emit('connection-request', ROOM_ID, mypeerID)
    socket.on('user-disconnected', (peerID) => {
      if (peers[peerID]) peers[peerID].close()
      Array.prototype.forEach.call(document.getElementsByClassName(peerID), delvidFrames=>{
        delvidFrames.remove();
        delete peers[peerID]
      })
    })

  });

// sending our audio stream to the user with id = userId
const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  video.className = userId
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove()
  })
  peers[userId] = call
};

peer.on("open", (id) => {
  mypeerID = id
  myVideo.className = mypeerID
  socket.emit("join-room", ROOM_ID, id, username);
});

const addVideoStream = (video, stream) => {
  if (document.getElementsByClassName(video.className).length==0){
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
      videoGrid.append(video);
    });
  }
};

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
muteButton.innerHTML = `<i class="fas fa-microphone"></i>`;
inviteButton.innerHTML = `<i class="fas fa-user-plus"></i>`;

muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});
