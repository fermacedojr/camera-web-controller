const http = require('http');
const express = require('express')
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");

// config
const cameraPath = path.join(__dirname, '../static/camera');
const command = 'raspistill -vf -hf --exposure verylong -awb auto -w 1640 -h 922 -o'

const getFileListFrom = (path, callback) => {
  fs.readdir(path, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    callback(files);
  });
}


const app = express()

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


app.post('/take', function (req, res) {
  const filename = `${new Date().getTime()}.jpg`;
  const filePath = path.join(cameraPath, `${new Date().getTime()}.jpg`);
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