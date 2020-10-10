const http = require('http');
const express = require('express')
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");
var raspividStream = require('raspivid-stream');

// config
const cameraPath = path.join(__dirname, '../static/camera');
const command = 'raspistill -ag 0 -co 30 -sa 15 -sh 20  -ifx denoise -rot 90 -awb auto -o'

const getFileListFrom = (path, callback) => {
  fs.readdir(path, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    callback(files);
  });
}

const getFilename  = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  const yyyy = today.getFullYear();
  const hh = String(today.getHours()).padStart(2, '0');
  const min = String(today.getMinutes()).padStart(2, '0');
  const ms = String(today.getMilliseconds()).padStart(3, '0');

  return `image_${yyyy}_${mm}_${dd}-${hh}:${min}:${ms}.jpg`;
}

const app = express()
const expressWs = require('express-ws')(app);

// Static files and photos
app.use(express.static('static'))

const port = 3000;

const template = (content, viewName= '') => ` 
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="/css/styles.css">
  <title>Camera</title>
</head>
<body class="${viewName}">
  <form action="/take" method="post" class="camera-button">
    <button type="submit" id="take-photo">Take photo</button>
  </form>
${content}
<script async defer src="js/main.js"></script>
</body>
<html>
`;


app.get('/', function (req, res) {
  res.redirect(302, '/photos');
})

app.get('/photos', function (req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  getFileListFrom(cameraPath, (files) => {
    res.end(template(`<ul class="photo-list">${
      files.map(file=>`
        <li>
          <a href="/camera/${file}"/>
            ${files.length < 20 ? `<img src="/camera/${file}" width="150px">` : ''}
            ${file}
          </a></li>`).join('\n')
    }</ul>`
      
    ));
  })
})

app.get('/photos/:id', function (req, res) {
  var id = req.params.id;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  getFileListFrom(cameraPath, (files) => {
    res.end(template(JSON.stringify(files)));
  })
})


app.ws('/video-stream', (ws, req) => {
  console.log('Client connected');

  ws.send(JSON.stringify({
    action: 'init',
    width: '960',
    height: '540'
  }));

  var videoStream = raspividStream({ rotation: 90 });

  videoStream.on('data', (data) => {
      ws.send(data, { binary: true }, (error) => { if (error) console.error(error); });
  });

  ws.on('close', () => {
      console.log('Client left');
      videoStream.removeAllListeners('data');
  });
});

app.get('/stream', function(req, res){
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <html>
      <body>
          <script type="text/javascript" src="https://rawgit.com/131/h264-live-player/master/vendor/dist/http-live-player.js"></script>
          <script>
              var canvas = document.createElement("canvas");
              document.body.appendChild(canvas);

              var wsavc = new WSAvcPlayer(canvas, "webgl");

              var protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
              // wsavc.connect(protocol + '//' + window.location.host + '/video-stream');
              wsavc.connect('ws://raspberrypi.local:3000/video-stream');
          </script>
      </body>
    </html>
  `);
})

app.post('/take', function (req, res) {
  const filename = getFilename();
  const filePath = path.join(cameraPath, `${filename}`);
  const fullCommand = `${command} ${filePath}`

  exec(fullCommand, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);

    res.redirect(302, `/camera/${filename}`)
});

})

app.listen(port)
console.log(`Listening on port ${port}`)