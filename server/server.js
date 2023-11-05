const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const { hostname } = require('os');
const app = express();
const port = process.env.PORT || 3000;
const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');
const sensor = require('../sensor');  // sensor.js 파일 불러오기
const { spawn } = require('child_process');

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS 설정
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 모든 도메인에서 접근을 허용 (*), 필요에 따라 특정 도메인을 명시할 수 있습니다.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let isCapturing = false;

global.fetch = require('cross-fetch');
// unction to calculate focal length 거리측정
function calculateFocalLength(pixelHeight, distanceToObject, realHeight) {
  return (pixelHeight * distanceToObject) / realHeight;
}

// Route for receiving sensor data
app.post('/sensorData', upload.array(), (req, res) => {
  const gyroscopeData = JSON.parse(req.body.gyroscope);
  const magnetometerData = JSON.parse(req.body.magnetometer);
  const accelerometerData = JSON.parse(req.body.accelerometer);
  // Do something with sensor data...
  res.sendStatus(200);
});

// Route for receiving distance data
app.post('/distance', (req, res) => {
  const distanceData = req.body.distance;
  // Do something with distance data...
  res.sendStatus(200);
});

// Route for calculating and processing distance
app.get('/captureAndProcess', (req, res) => {
  const distancePy = spawn('python', ['distancesensor.py']);
  distancePy.stdout.on('data', (data) => {
    const distanceData = JSON.parse(data.toString());
    res.send(distanceData);
  });
});

// Python 스크립트를 실행하는 함수
function runScript(inputImage, x, y) {
  return new Promise((resolve, reject) => {
    let options = {
      mode: 'text',
      pythonOptions: ['-u'], // unbuffered, 실시간 출력을 허용
      args: [inputImage, x, y]  // 파이썬 스크립트에 전달할 인수
    };

    PythonShell.run('distance.py', options, function (err, result) {
      if (err) reject(err);
      // 결과는 리스트 형태로 반환되며, 마지막 값이 우리가 필요한 깊이 값입니다.
      resolve(result[result.length - 1]);
    });
  });
}

// 이미지 촬영 및 처리 엔드포인트
app.post('/captureAndProcess', upload.single('image'), async (req, res) => {
  if (isCapturing) {
    return res.status(400).json({ message: '이미 촬영 중입니다.' });
  }

  try {
    isCapturing = true;

    const crosshairPosition = req.body.crosshairPosition;
    const x = req.body.x;
    const y = req.body.y;

    if (crosshairPosition == null || typeof crosshairPosition !== 'object' ||
    crosshairPosition.x == null || typeof crosshairPosition.x !== 'number' ||
    crosshairPosition.y == null || typeof crosshairPosition.y !== 'number') {
      return res.status(400).json({ message: 'Invalid data provided.' });
    }

    const timestamp = Date.now();
    const fileName = `./Tests2/input2/${timestamp}.jpg`;

    fs.writeFileSync(fileName, req.file.buffer);

    let options = {
      mode: 'text',
      pythonOptions: ['-u'],
      args: [fileName]
    };

    PythonShell.run('distancesensor.py', options, function(err, result) {
      if (err) {
        console.error('distancesensor.py 실행 오류:', err);
        isCapturing = false;
        return res.status(500).json({ message: '거리 및 높이 측정 중 오류 발생' });
      }

      const distanceAndHeight = JSON.parse(result[result.length - 1]);
      console.log('거리:', distanceAndHeight.distance, '높이:', distanceAndHeight.height);

      const sensorDistance = sensor.calculateDistance(distanceAndHeight.distance);
      console.log('센서 거리:', sensorDistance);

      let distanceOptions = {
        mode: 'text',
        pythonOptions: ['-u'],
        args: [fileName, x, y, sensorDistance]
      };

      PythonShell.run('distance.py', distanceOptions, function(err, result) {
        if (err) {
          console.error('distance.py 실행 오류:', err);
          isCapturing = false;
          return res.status(500).json({ message: '깊이 추정 중 오류 발생' });
        }

        const depth = parseFloat(result[result.length - 1]);
        console.log('깊이:', depth);

        const correctedDepth = depth - (distanceAndHeight.distance - sensorDistance);
        console.log('보정된 깊이:', correctedDepth);

        isCapturing = false;

        res.json({ depth: correctedDepth });
      });
    });
  } catch (error) {
    console.error('캡처 및 처리 오류:', error);
    isCapturing = false;
    res.status(500).json({ message: '캡처 및 처리 중 오류 발생' });
  }
});

//식품 인식
app.post('/saveCameraImage', upload.single('image'), async (req, res) => {
  try {
    const path = require('path');

    // 이미지를 저장할 디렉토리 설정
    const uploadDirectory = path.join(__dirname, 'Tests', 'input');

    // 이미지 파일 이름 생성
    const timestamp = Date.now();
    const fileName = `${timestamp}.jpg`;

    // 전체 파일 경로 생성
    const filePath = path.join(uploadDirectory, fileName);

    // 이미지를 filePath에 저장
    fs.writeFileSync(filePath, req.file.buffer);


    console.log('파일이 성공적으로 저장되었습니다.');

    // testFrom3.py 실행
    const scriptPath = path.join(__dirname, 'testFrom3.py');
    const testFrom3Command = `python ${scriptPath} ${fileName}`;
    exec(testFrom3Command, async (error, stdout, stderr) => {
      if (error) {
        console.error('testFrom3.py 실행 오류:', error);
        return res.status(500).json({ message: 'testFrom3.py 실행 중 오류 발생' });
      }

      const path = require('path'); // path 모듈 불러오기

      const testResultFileName = `${timestamp}.txt`;
      const testResultFilePath = path.join(__dirname, 'Tests', 'output', testResultFileName);

      // 텍스트 파일의 내용을 읽음
      const result_text = fs.readFileSync(testResultFilePath, 'utf-8');

      // 결과 파일 삭제
      fs.unlinkSync(testResultFilePath);

      // 여기에서 클라이언트로 결과 전송
      res.json({ testResultText: result_text });
    });
  } catch (error) {
    console.error('이미지 저장 및 처리 오류:', error);
    res.status(500).json({ message: '이미지 저장 및 처리 중 오류 발생' });
  }
});

app.get('/', (req, res) => {
  try {
    res.json({ message: '데이터를 성공적으로 가져옴' });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
});

app.listen(port, hostname, () => {
  console.log(`서버가 포트 ${hostname}:${port}에서 실행 중입니다.`);
});
