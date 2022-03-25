// main client code is here
var chara = [{}];
var canvas = [{}];
var i = 0;
var CAN_SIZE = 340;

// self defined data to link user name and socket id
var name_id_list = []; //e.g. [{name: "henry", socketid: "12345"},...]
const socket = io("http://127.0.0.1:3000/");

// キャンバスと削除ボタン削除イベント
function canvas_del(canid, delbtnid, i) {
  console.log(canid);
  console.log(delbtnid);
  console.log(i);
  chara[0][i].cancelAnimation();
  delete chara[0][i];
  delete canvas[0][i];
  // Live2D.deleteBuffer(i); //if sth not working then need to handle it, i.e. transform socketID into array max length:4294967296
  document
    .getElementById("can")
    .removeChild(document.getElementById("namediv-" + canid));
  document.getElementById("can").removeChild(document.getElementById(canid));
  //document.getElementById("can").removeChild(document.getElementById(delbtnid));
}

// キャンバスボタン押下イベント
function newCanvas(socketID) {
  console.log(socketID);
  // キャンバス
  var ele = document.createElement("canvas");
  ele.style.cssText = `
        width: 384px; 
        height: 512px;
    `;

  ele.id = "glcanvas" + socketID;
  let namediv = document.createElement("div");
  namediv.id = "namediv-" + "glcanvas" + socketID;
  // set the user name according to username-socketid list
  document.getElementById("can").appendChild(namediv); //name of the avatar
  document.getElementById("can").appendChild(ele);
  // 削除ボタン
  // var delbtn = document.createElement('button');
  // delbtn.id = "delbtn" + socketID;
  // delbtn.addEventListener('click', ()=>{
  //     canvas_del(ele.id,delbtn.id,socketID)
  // })
  // delbtn.innerHTML = "キャンバス削除";
  // document.getElementById('can').appendChild(delbtn);
  // Canvasを取得する
  canvas[0][socketID] = document.getElementById(ele.id);
  canvas[0][socketID].width = canvas[0][socketID].height = CAN_SIZE;
  // Live2D生成
  chara[0][socketID] = new Simple(canvas[0][socketID], ele.id, socketID);
  console.log(chara[0]);
}

// streaming stuff - client side
let localClientList = []; // temp of list of id of connected sockets
let localDataList = []; // list of avatar data
let localDisplayAvatars = []; // list of id of connected sockets
let selfBackgroundImageCanvas = "https://wallpapercave.com/dwp2x/wp4785026.jpg";
// data ready to broadcast for rendering
// renderDataObj: headZ, headY, headX, leftEyeOpenRatio, rightEyeOpenRatio, eyeDirX, eyeDirY, mouthOpen, mouthForm
// update the client list on conenct and disconnect
socket.on("tellMeYourName", () => {
  console.log("telling name as " + username);
  socket.emit("myNameis", username);
});
socket.on("newNameList", (name_id_list_server) => {
  name_id_list = name_id_list_server;
  // add the user name to the div tag
  for (const usernamei in name_id_list) {
    let divtag = document.getElementById(
      "namediv-" + "glcanvas" + name_id_list[usernamei].socketid
    );
    divtag.textContent = name_id_list[usernamei].name;
  }
  console.log("updated name list: ", name_id_list);
});

// handle new connections and disconnections
socket.on("newConnect", (clientList) => {
  localClientList = clientList;
  console.log("received " + localClientList);
  console.log(socket.id);
  // render all other avatars not in display
  let difference = localDisplayAvatars
    .filter((x) => !localClientList.includes(x))
    .concat(localClientList.filter((x) => !localDisplayAvatars.includes(x)));
  for (const missingAvatar in difference) {
    localDisplayAvatars.push(difference[missingAvatar]);
    newCanvas(difference[missingAvatar].toString());
  }
});
socket.on("someoneDisconnect", (clientList) => {
  localClientList = clientList;
  // remove extra avatars
  let difference = localDisplayAvatars
    .filter((x) => !localClientList.includes(x))
    .concat(localClientList.filter((x) => !localDisplayAvatars.includes(x)));
  for (const extraAvatar in difference) {
    console.log(difference[extraAvatar]);
    localDisplayAvatars.splice(
      localDisplayAvatars.indexOf(difference[extraAvatar]),
      1
    );
    canvas_del(
      "glcanvas" + difference[extraAvatar],
      "delbtn" + difference[extraAvatar],
      difference[extraAvatar]
    );
  }
});
// send out self-avatar data on server request
socket.on("gatherAvatarData", () => {
  if (renderDataObj.data.headZ != undefined) {
    //check if data initialzied or not
    renderDataObj.aspect.socketOwner = socket.id;
    renderDataObj.aspect.background = selfBackgroundImageCanvas; // also provide background info
    socket.emit("returnedAvatarData", renderDataObj);
  }
});
// get manipulated datalist back from server for rendering
socket.on("usefulAvatarData", (dataList) => {
  localDataList = dataList;
  for (const count in dataList) {
    chara[0][dataList[count].aspect.socketOwner].renderDataObj =
      dataList[count];
  }
});

// text chat function
let sendButton = document.getElementById("sendButton"); // the button to send message
let msgBox = document.getElementById("message-input"); // the message text input field
let showmsg = document.getElementsByClassName("showmsg")[0];

function sendMessageHandler(message) {
  msgBox.value = "";
  if (message.charAt(message.length - 1) == "\n") {
    message = message.substring(0, message.length - 1);
  }
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
  // search name from the socket id
  let msgOut = document.createElement("div"); // message container
  if (message_from.from == socket.id) {
    // I sent out
    msgOut.className = "mymsg"; //set the color
    msgOut.textContent = message_from.message;
    showmsg.appendChild(msgOut);
  } else {
    // someone else sent out
    msgOut.className = "msg"; //set the color
    msgOut.textContent = message_from.message;
    let wrapMsg = document.createElement("div"); // a wrapper to show the message sender
    wrapMsg.className = "wrapMsg"; //set the color
    for (const usernamei in name_id_list) {
      if (message_from.from == name_id_list[usernamei].socketid) {
        wrapMsg.textContent = name_id_list[usernamei].name;
      }
    }
    wrapMsg.appendChild(msgOut);
    showmsg.appendChild(wrapMsg);
  }
});

// background setting stuff
let setBackground = document.getElementById("setBackground");
setBackground.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    let message = setBackground.value;
    if (message.charAt(message.length - 1) == "\n") {
      message = message.substring(0, message.length - 1);
    }
    selfBackgroundImageCanvas = message;
    setBackground.value = "";
  }
});


// peer js audio part
var mypeerID;
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const peers = {}

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3000",
});

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      console.log("received call:",call.peer)
      call.answer(stream);
      const video = document.createElement("video");
      video.className = call.peer
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
        console.log("responsed to call and added stream")
      });
      peers[call.peer] = call
    });

    socket.on("user-connected", (userId) => {
      if (userId!=mypeerID){
        console.log("connectToNewUser(",userId,")")
        connectToNewUser(userId, stream);
      }
    });
    socket.emit('connection-request', ROOM_ID, mypeerID)
    socket.on('user-disconnected', (peerID) => {
      console.log("peer disconnect: ",peerID)
      if (peers[peerID]) peers[peerID].close()
      Array.prototype.forEach.call(document.getElementsByClassName(peerID), delvidFrames=>{
        delvidFrames.remove();
        delete peers[peerID]
      })      
    })

  });

// sending our `stream` to the user with `userId`
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
  console.log('i applied for join room with ',ROOM_ID, id, username)
  mypeerID = id
  myVideo.className = mypeerID
  socket.emit("join-room", ROOM_ID, id, username);
});

const addVideoStream = (video, stream) => {
  console.log('adding vid with classname:',video.className)
  if (document.getElementsByClassName(video.className).length==0){
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
      videoGrid.append(video);
    });
    console.log('addvid with id:', video.className,'success')
  }else{
    console.log('duplicated class name:',video.className)
  }
};

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
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

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});
