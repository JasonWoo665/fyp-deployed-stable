// main client code is here
var chara = [];
var canvas = [];
var i = 0;
var CAN_SIZE = 340;

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
    var delbtn = document.createElement('button');
    delbtn.id = "delbtn" + socketID;
    console.log(ele.id)
    console.log(delbtn.id)
    console.log(socketID)
    delbtn.addEventListener('click', ()=>{
        canvas_del(ele.id,delbtn.id,socketID)
    })
    // try{
    //     delbtn.setAttribute("onclick","canvas_del(" + (ele.id).toString() + "," + (delbtn.id).toString() + "," + socketID.toString() + ")");
    // } catch (e){
    //     console.log(e)
    // }
    delbtn.innerHTML = "キャンバス削除";
    document.getElementById('can').appendChild(delbtn);
    // Canvasを取得する
    canvas[socketID] = document.getElementById(ele.id);
    canvas[socketID].width = canvas[socketID].height = CAN_SIZE;
    // Live2D生成
    chara[socketID] = new Simple(canvas[socketID], ele.id, socketID);
}

// キャンバスと削除ボタン削除イベント
function canvas_del(canid, delbtnid, i) {
    console.log('delte')
    chara[i].cancelAnimation();
    delete chara[i];
    delete canvas[i];
     Live2D.deleteBuffer(i);
    document.getElementById('can').removeChild(canid);
    document.getElementById('can').removeChild(delbtnid);
}

// キャンバスボタン押下イベント
function button_click(){
    // キャンバス
    var ele = document.createElement('canvas');
    ele.style.cssText = `
        width: 384px; 
        height: 512px;
    `;

    ele.id = "glcanvas" + i;
    document.getElementById('can').appendChild(ele);
    // 削除ボタン
    var delbtn = document.createElement('button');
    delbtn.id = "delbtn" + i;
    console.log(ele.id,delbtn.id,i)
    delbtn.setAttribute("onclick","canvas_del(" + ele.id + "," + delbtn.id + "," + i + ")");
    delbtn.innerHTML = "キャンバス削除";
    document.getElementById('can').appendChild(delbtn);
    // Canvasを取得する
    canvas[i] = document.getElementById(ele.id);
    canvas[i].width = canvas[i].height = CAN_SIZE;
    // Live2D生成
    chara[i] = new Simple(canvas[i], ele.id, i);
    i++;
}



function live2d_dispose(){
    var charanm = chara.length;
    for(var i = 0; i < charanm; i++){
        if(typeof chara[i] != "undefined"){
            var glcanvas = document.getElementById("glcanvas" + i);
            var dlbtn = document.getElementById("delbtn" + i);
            canvas_del(glcanvas, dlbtn, i);            
        }
    }
    chara = [];
    canvas = [];
    Live2D.dispose();
}

// streaming stuff - client side
const socket = io("http://localhost:3000")
let localClientList = []
let localDataList = []
let localDisplayAvatars = []
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
    // remove all other avatars disconencted
    let difference = localDisplayAvatars
        .filter(x => !localClientList.includes(x))
        .concat(localClientList.filter(x => !localDisplayAvatars.includes(x)));
    for (const extraAvatar in difference){
        localDisplayAvatars.splice(localDisplayAvatars.indexOf(difference[extraAvatar]), 1);
        canvas_del("glcanvas" + extraAvatar,"delbtn" + extraAvatar,extraAvatar)
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
    console.log(localDataList)
});


