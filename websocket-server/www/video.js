/**
 *  HTML5 Webcam Barcode Reader with Dynamsoft Barcode Reader SDK.
 *  Support PC & Mobile.
 */
var videoElement = document.querySelector('video');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var videoSelect = document.querySelector('select#videoSource');
var videoOption = document.getElementById('videoOption');
var buttonGo = document.getElementById('go');
var barcode_result = document.getElementById('dbr');
var isConnected = false;
var isPaused = false;
var intervalId = 0;
var videoWidth = 640, videoHeight = 480;
var _error;
var ws;

// add button event
buttonGo.onclick = function() {
  window.clearInterval(intervalId);
  console.log("clean id: " + intervalId);

  canvas.style.display = 'none';

  isPaused = false;
  scanBarcode();
  buttonGo.disabled = true;
};

init();

function ConnectToWebsocket(){
    ws = new WebSocket("wss://"+location.host);
    ws.onopen = function() {
      isConnected = true;
      alert("Connected");
      ws.send("Hi");
    };

    ws.onmessage = function (evt) {
      if (isPaused) {
        return;
      }

      var result = evt.data;
      barcode_result.textContent = result;
      // display barcode result
      if (result.indexOf("No barcode") == -1) {
        isPaused = true;
        window.clearInterval(intervalId);
        console.log("Get result, clean id: " + intervalId);
        buttonGo.disabled = false;
        canvas.style.display  = 'block';
      }
    };

    ws.onclose = function() {
      isConnected = false;
      alert("Closed");
    };

    ws.onerror = function(event) {
      alert("Error");
    };

}

function onError(err){
  console.log(err);
}

async function init(){
  const stream = await navigator.mediaDevices.getUserMedia({ video: true});
  await loadCameraSourceList();
  ConnectToWebsocket();
}

async function loadCameraSourceList(){
  console.log("loadlist");
  var videoSelect = document.getElementById("videoSource");
  videoSelect.innerHTML="";
  var devices = await navigator.mediaDevices.enumerateDevices();
  for (var i=0;i<devices.length;i++){
    var device = devices[i];
    if (device.kind=="videoinput"){
      var option = new Option(device.label,device.deviceId);
      videoSelect.add(option);
    }
  }
  videoSelect.onchange = startCamera;
  startCamera();
}

// stackoverflow: http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata/5100158
function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

function startCamera() {
  var selectedSource;
  if (document.getElementById("videoSource").selectedOptions.length>0){
    selectedSource = document.getElementById("videoSource").selectedOptions[0].value;
  }
  if (!!selectedSource){
    var constraints = {
      video: {
        height:480,
        width: 640,
        deviceId: selectedSource
      }
    };
  }else{
    var constraints = {
      video: {
        height:480,
        width: 640
      }
    };
  }
  console.log(selectedSource);
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
      try {
        videoElement.srcObject = mediaStream;
      } 
      catch (error) {
        videoElement.src = window.URL.createObjectURL(mediaStream);
      }
      videoElement.play();
    })
    .catch(function(error) {
        console.log(error.name + ": " + error.message);
    });
  }
  else {
     alert("Unsupported");
     console.log("getUserMedia not supported");
  }
}

// scan barcode
function scanBarcode() {
  intervalId = window.setInterval(function() {
    if (!isConnected || isPaused) {
        return;
    }

    var data = null, newblob = null;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
    // convert canvas to base64
    data = canvas.toDataURL('image/png', 1.0);
    // convert base64 to binary
    newblob = dataURItoBlob(data);
    ws.send(newblob);

  }, 1000);
  console.log("create id: " + intervalId);
}
