// A script used to handle landmark coordinates returned from facemesh
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

// the object used to control the motion of live2D models
var headZ, headY, headX, leftEyeOpenRatio, rightEyeOpenRatio, eyeDirX, eyeDirY, mouthOpen, mouthForm;
var renderDataObj = {
  data:{
    headZ: headZ, 
    headY: headY, 
    headX: headX, 
    leftEyeOpenRatio: leftEyeOpenRatio,
    rightEyeOpenRatio: rightEyeOpenRatio, 
    eyeDirX: eyeDirX, 
    eyeDirY: eyeDirY, 
    mouthOpen: mouthOpen, 
    mouthForm: mouthForm, 
  }, 
  aspect: {
    socketOwner: null,
    background: null
  }
};

let eyeOpenThreshold =0.5

// calculate the motions of facial features
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                     {color: '#C0C0C070', lineWidth: 1});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
    }
    let headBot = [results.multiFaceLandmarks[0][152].x ,results.multiFaceLandmarks[0][152].y , results.multiFaceLandmarks[0][152].z]
    let headTop = [results.multiFaceLandmarks[0][10].x ,results.multiFaceLandmarks[0][10].y , results.multiFaceLandmarks[0][10].z]
    let headLeft = [results.multiFaceLandmarks[0][234].x ,results.multiFaceLandmarks[0][234].y , results.multiFaceLandmarks[0][234].z]
    let headRight = [results.multiFaceLandmarks[0][454].x ,results.multiFaceLandmarks[0][454].y , results.multiFaceLandmarks[0][454].z]
    let eyeLeftLipTop = [results.multiFaceLandmarks[0][159].x ,results.multiFaceLandmarks[0][159].y , results.multiFaceLandmarks[0][159].z]
    let eyeLeftLipBot = [results.multiFaceLandmarks[0][145].x ,results.multiFaceLandmarks[0][145].y , results.multiFaceLandmarks[0][145].z]
    let eyeRightLipTop = [results.multiFaceLandmarks[0][386].x ,results.multiFaceLandmarks[0][386].y , results.multiFaceLandmarks[0][386].z]
    let eyeRightLipBot = [results.multiFaceLandmarks[0][374].x ,results.multiFaceLandmarks[0][374].y , results.multiFaceLandmarks[0][374].z]
    let leftIris = [[results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[0][0]].x ,results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[0][0]].y , results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[0][0]].z],[results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[1][0]].x ,results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[1][0]].y , results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[1][0]].z],[results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[2][0]].x ,results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[2][0]].y , results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[2][0]].z],[results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[3][0]].x ,results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[3][0]].y , results.multiFaceLandmarks[0][FACEMESH_RIGHT_IRIS[3][0]].z]]
    let rightIris = [[results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[0][0]].x ,results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[0][0]].y , results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[0][0]].z],[results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[1][0]].x ,results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[1][0]].y , results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[1][0]].z],[results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[2][0]].x ,results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[2][0]].y , results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[2][0]].z],[results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[3][0]].x ,results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[3][0]].y , results.multiFaceLandmarks[0][FACEMESH_LEFT_IRIS[3][0]].z]]
    let mouthTop = [results.multiFaceLandmarks[0][13].x ,results.multiFaceLandmarks[0][13].y , results.multiFaceLandmarks[0][13].z]
    let mouthBot = [results.multiFaceLandmarks[0][14].x ,results.multiFaceLandmarks[0][14].y , results.multiFaceLandmarks[0][14].z]
    let mouthLeft = [results.multiFaceLandmarks[0][78].x ,results.multiFaceLandmarks[0][78].y , results.multiFaceLandmarks[0][78].z]
    let mouthRight = [results.multiFaceLandmarks[0][308].x ,results.multiFaceLandmarks[0][308].y , results.multiFaceLandmarks[0][308].z]
    
    // head-y orientation
    let headAngleY = Math.atan((headBot[1]-headTop[1])/headBot[2]/2)
    if (headAngleY<0)
        headY = Math.cos(headAngleY)*-1
    else
        headY = Math.cos(headAngleY)
    headY = headY*180/Math.PI*-2
    // head-z orientation
    let headAngleZ = Math.atan((headBot[1]-headTop[1])/(headTop[0]-headBot[0]))
    if ((headTop[0]-headBot[0])<0)
        headZ = Math.cos(headAngleZ)*-1
    else
        headZ = Math.cos(headAngleZ)
    headZ = headZ*180/Math.PI*2
    // head-x orientation
    headX = Math.sin(headRight[2]-headLeft[2])*180/Math.PI*3

    // eyes open and close
    leftEyeOpenRatio = Math.tan((eyeLeftLipBot[1]- eyeLeftLipTop[1])/(leftIris[3][1]-leftIris[1][1]))
    leftEyeOpenRatio = leftEyeOpenRatio*leftEyeOpenRatio
    rightEyeOpenRatio = Math.tan((eyeRightLipBot[1]- eyeRightLipTop[1])/(rightIris[3][1]-rightIris[1][1]))
    rightEyeOpenRatio = rightEyeOpenRatio*rightEyeOpenRatio
    // adjust detection of eyes open and close when head is tilted
    eyeOpenThreshold = ((headZ|| headY|| headX)>10)||((headZ|| headY|| headX)<-10)?0.3:0.5
    rightEyeOpenRatio = rightEyeOpenRatio>eyeOpenThreshold?1:rightEyeOpenRatio
    leftEyeOpenRatio = leftEyeOpenRatio>eyeOpenThreshold?1:leftEyeOpenRatio

    // eyeball location
    let leftIrisCenter = [(leftIris[0][0]+leftIris[1][0]+leftIris[2][0]+leftIris[3][0])/4, (leftIris[0][1]+leftIris[1][1]+leftIris[2][1]+leftIris[3][1])/4]
    let rightIrisCenter = [(rightIris[0][0]+rightIris[1][0]+rightIris[2][0]+rightIris[3][0])/4, (rightIris[0][1]+rightIris[1][1]+rightIris[2][1]+rightIris[3][1])/4]
    let leftEyeHorizon = [[results.multiFaceLandmarks[0][33].x, results.multiFaceLandmarks[0][33].y], [results.multiFaceLandmarks[0][133].x, results.multiFaceLandmarks[0][133].y]]
    let rightEyeHorizon = [[results.multiFaceLandmarks[0][362].x, results.multiFaceLandmarks[0][362].y], [results.multiFaceLandmarks[0][263].x, results.multiFaceLandmarks[0][263].y]]
    let leftHorizonRatio = Math.abs((leftEyeHorizon[1][0]-leftIrisCenter[0])/(leftEyeHorizon[1][0]-leftEyeHorizon[0][0]))
    let rightHorizonRatio = Math.abs((rightEyeHorizon[1][0]-rightIrisCenter[0])/(rightEyeHorizon[1][0]-rightEyeHorizon[0][0]))
    eyeDirX = (leftHorizonRatio+rightHorizonRatio)/2
    eyeDirX = Math.tan(eyeDirX*4-2)*-1.3
    let leftVertRatio = Math.abs((eyeLeftLipBot[1]-leftIrisCenter[1])/(eyeLeftLipBot[1]-eyeLeftLipTop[1]))
    let rightVertRatio = Math.abs((eyeRightLipBot[1]-rightIrisCenter[1])/(eyeRightLipBot[1]-eyeRightLipTop[1]))
    eyeDirY = (leftVertRatio+rightVertRatio)/2

    // mouth location
    mouthOpen = Math.abs((mouthBot[1]-mouthTop[1])/(rightIris[3][1]-rightIris[1][1])) //using right eye as comparison
    // smile or not
    mouthForm = twoPtDist(mouthTop,mouthBot)/twoPtDist(mouthLeft,mouthRight)
    mouthForm = Math.tan(mouthForm*-2+0.7)
    
    // output object for streaming
    renderDataObj = {
      data:{
        headZ: headZ, 
        headY: headY, 
        headX: headX, 
        leftEyeOpenRatio: leftEyeOpenRatio,
        rightEyeOpenRatio: rightEyeOpenRatio, 
        eyeDirX: eyeDirX, 
        eyeDirY: eyeDirY, 
        mouthOpen: mouthOpen, 
        mouthForm: mouthForm, 
      }, 
      aspect: {
        socketOwner: null,
        background: null
      }
    };

  }
  canvasCtx.restore();
}

function twoPtDist(a,b){
  return Math.sqrt((b[1]-a[1])*(b[1]-a[1])+(b[0]-a[0])*(b[0]-a[0]))
}

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `./locateFile/${file}`;
  // return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});
faceMesh.setOptions({
  selfieMode: true,
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();