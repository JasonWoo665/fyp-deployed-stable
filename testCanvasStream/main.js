// main canvas
const canvasElement = document.getElementById('testingCanvas');
const canvasCtx = canvasElement.getContext('2d');
// second canvas
const canvasElement2 = document.getElementById('secondCanvas');
const secondCanvas = canvasElement2.getContext('2d');

var rgb=[0,0,0]
var addition = [0,0,0]
var addVect = [1,-1,1]
var helloPos = [0,0]
var helloPosVect = [4,4]
rgb[0] = Math.random()*255
rgb[1] = Math.random()*255
rgb[2] = Math.random()*255

var editImg = new Image()
editImg.src = './texture_00.png'
var mousePos = [0,0]
var mousePosLast = [0,0]
// let scaleX = canvasElement.width / window.innerWidth;
// let scaleY = canvasElement.height / window.innerHeight;
let windowLeftUpX = 0 // canvas displacement from (0,0)
let windowLeftUpY = 0
let drawing = false

// mouse
document.onmousemove = function(event){
    mousePos = [event.offsetX-windowLeftUpX, event.offsetY-windowLeftUpY];
}
document.addEventListener('mousedown',(event)=>{
    drawing = true;
})
document.addEventListener('mouseup',(event)=>{
    drawing = false;
})
//buttons
let download = document.getElementById("download")
download.addEventListener('click', ()=>{
    Canvas2Image.saveAsPNG(canvasElement, canvasElement.width, canvasElement.height, 'wellplayed')
})

// secondCanvas.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;  
// secondCanvas.fillRect(0,0,canvasElement.width,canvasElement.height)

function callback(){
    addition[0] = Math.random()*2
    addition[1] = Math.random()*2
    addition[2] = Math.random()*2
    addVect[0] = (rgb[0]>=255||rgb[0]<=0)?addVect[0]*-1:addVect[0]
    addVect[1] = (rgb[0]>=255||rgb[0]<=0)?addVect[1]*-1:addVect[1]
    addVect[2] = (rgb[0]>=255||rgb[0]<=0)?addVect[2]*-1:addVect[2]
    rgb[0] = rgb[0]+addition[0]*addVect[0]
    rgb[1] = rgb[1]+addition[1]*addVect[1]
    rgb[2] = rgb[2]+addition[2]*addVect[2]
    // background fill
    canvasCtx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;  
    canvasCtx.fillRect(0,0,canvasElement.width,canvasElement.height)
    
    // word 'hello world'
    canvasCtx.fillStyle = `rgb(${255-rgb[0]}, ${255-rgb[1]}, ${255-rgb[2]})`;  
    canvasCtx.font = `80px sans-serif`;  
    helloPos[0] = helloPos[0]+helloPosVect[0]
    helloPos[1] = helloPos[1]+helloPosVect[1]
    helloPosVect[0] = helloPos[0]+400>=canvasElement.width||helloPos[0]<=0?helloPosVect[0]*-1:helloPosVect[0]
    helloPosVect[1] = helloPos[1]>=canvasElement.height||helloPos[1]<=0?helloPosVect[1]*-1:helloPosVect[1]
    canvasCtx.fillText("Hello World!", helloPos[0], helloPos[1]);

    // transparent test
    canvasCtx.fillStyle = 'rgba( 50,50,50,0)';  
    canvasCtx.fillRect(canvasElement.width-100,canvasElement.height-140, 100, 140)
    
    // second canvas
    if (mousePosLast[0]==0 && mousePosLast[1]==0){
        mousePosLast = [mousePos[0],mousePos[1]]
    }
    if (drawing){
        console.log(mousePos[0],mousePos[1])
        secondCanvas.beginPath()
        secondCanvas.moveTo(mousePosLast[0],mousePosLast[1])
        secondCanvas.lineTo(mousePos[0],mousePos[1])
        secondCanvas.stroke()
    }
    mousePosLast = [mousePos[0],mousePos[1]]
    window.requestAnimationFrame(callback);
}

editImg.onload =()=>{
    secondCanvas.fillStyle = 'lightGrey'
    secondCanvas.fillRect(0,0,canvasElement2.width, canvasElement2.height)
    secondCanvas.drawImage(editImg,0,0)
}
window.requestAnimationFrame(callback);
