// main client code is here
var chara = [{}];
var canvas = [{}];
var i = 0;
var CAN_SIZE = 340;

// キャンバスと削除ボタン削除イベント
function canvas_del(canid, delbtnid, i) {
    console.log(canid)
    console.log(delbtnid)
    console.log(i)
    chara[0][i].cancelAnimation();
    delete chara[0][i];
    delete canvas[0][i];
    // Live2D.deleteBuffer(i); //if sth not working then need to handle it, i.e. transform socketID into array max length:4294967296 
    document.getElementById('can').removeChild(document.getElementById(canid));
    document.getElementById('can').removeChild(document.getElementById(delbtnid));
}

// キャンバスボタン押下イベント
function newCanvas(socketID){
    console.log(socketID)
    // キャンバス
    var ele = document.createElement('canvas');
    ele.style.cssText = `
        width: 384px; 
        height: 512px;
    `;

    ele.id = "glcanvas" + socketID;
    document.getElementById('can').appendChild(ele);
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
    console.log(chara[0])
}



// streaming stuff - client side
const socket = io("http://localhost:3000")
let localClientList = []        // temp of list of id of connected sockets 
let localDataList = []          // list of avatar data
let localDisplayAvatars = []    // list of id of connected sockets
// data ready to broadcast for rendering
// renderDataObj: headZ, headY, headX, leftEyeOpenRatio, rightEyeOpenRatio, eyeDirX, eyeDirY, mouthOpen, mouthForm
console.log(renderDataObj)
const socketButt = document.getElementById('sendMsgIO')
socketButt.addEventListener('click', e=>{
    console.log('i am '+socket.id)
})
// update the client list on conenct and disconnect
socket.on('newConnect', (clientList)=>{
    localClientList = clientList
    console.log('received '+localClientList)
    console.log(socket.id)
    // render all other avatars not in display
    let difference = localDisplayAvatars
        .filter(x => !localClientList.includes(x))
        .concat(localClientList.filter(x => !localDisplayAvatars.includes(x)));
    for (const missingAvatar in difference){
        localDisplayAvatars.push(difference[missingAvatar])
        newCanvas(difference[missingAvatar].toString())
    }
});
socket.on('someoneDisconnect', (clientList)=>{
    localClientList = clientList
    // remove extra avatars
    let difference = localDisplayAvatars
        .filter(x => !localClientList.includes(x))
        .concat(localClientList.filter(x => !localDisplayAvatars.includes(x)));
    console.log(difference)
    for (const extraAvatar in difference){
        console.log(difference[extraAvatar])
        localDisplayAvatars.splice(localDisplayAvatars.indexOf(difference[extraAvatar]), 1);
        canvas_del("glcanvas" + difference[extraAvatar], "delbtn" + difference[extraAvatar], difference[extraAvatar])
    }
});
// send out self-avatar data on server request
socket.on('gatherAvatarData', ()=>{
    if (renderDataObj.data.headZ!=undefined){ //check if data initialzied or not
        renderDataObj.aspect.socketOwner = socket.id 
        // console.log(renderDataObj)
        socket.emit('returnedAvatarData', renderDataObj)
    }
});
// get manipulated datalist back from server for rendering
socket.on('usefulAvatarData', (dataList)=>{
    localDataList = dataList
    for (const count in dataList){
        chara[0][dataList[count].aspect.socketOwner].renderDataObj=dataList[count]
    }
    
});


