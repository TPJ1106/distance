const express = require('express');
const cors = require('cors'); // cors 패키지 불러오기
const { exec } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const { hostname } = require('os');
const app = express();
const port = process.env.PORT || 3000;
const fetch = require('node-fetch');
const { PythonShell } = require('python-shell');
app.use(express.json());
const distancesensor = require('./distancesensor'); // distancesensor.js

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
// 객체의 색상 범위 설정 (HSV 값)
const lowerColor = new cv.Vec3(0, 100, 100);
const upperColor = new cv.Vec3(10, 255, 255);

// 검출하려는 객체의 실제 크기 설정 (미터 단위)
const realSize = 0.1;


// 이미지 촬영 및 처리 엔드포인트
app.post('/captureAndProcess', upload.single('image'), async (req, res) => {
  if (isCapturing) {
    return res.status(400).json({ message: '이미 촬영 중입니다.' });
  }

  try {
    isCapturing = true;
     // 십자선 위치 받아오기
     const crosshairPosition = req.body.crosshairPosition;

     // 유효성 검사
     if (crosshairPosition == null || typeof crosshairPosition !== 'object' ||
     crosshairPosition.x == null || typeof crosshairPosition.x !== 'number' ||
     crosshairPosition.y == null || typeof crosshairPosition.y !== 'number') {
     return res.status(400).json({ message: 'Invalid data provided.' });
   }

    // 타임스탬프를 사용하여 이미지 파일 이름 생성
    const timestamp = Date.now();
    const fileName = `./Tests2/input2/${timestamp}.jpg`;
    
    // Calculate the focal length.
    const focalLength = calculateFocalLength(pixelHeight, distanceToObject, realHeight);
 
    // 이미지 데이터를 파일로 저장
    fs.writeFileSync(fileName, req.file.buffer);

    const objects = distancesensor.detectObjects(image, lowerColor, upperColor);

    for (let obj of objects) {
      const pixelSize = obj.width; // 객체의 너비를 픽셀 단위로 측정
      const pixelHeight = obj.height; // 객체의 높이를 픽셀 단위로 측정
      const distanceValue = distancesensor.calculateDistance(pixelSize, realSize, focalLength);
      const height = distancesensor.calculateHeight(pixelHeight, distanceValue, focalLength);
      console.log("거리:", distanceValue, "m", "높이:", height, "m");
    }

    
    // distance.py 실행 및 .txt 파일 생성
    const distanceCommand = `python ../ai/distance.py ${fileName}`;
    exec(distanceCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error('distance.py 실행 오류:', error);
        isCapturing = false;
        return res.status(500).json({ message: '거리 인식 중 오류 발생' });
      }
      // 파이썬 스크립트 결과에서 깊이값 추출
      const depth = parseFloat(stdout);
      console.log('깊이:', depth)

      // 센서에서 얻은 거리 정보를 가져옵니다.
      const sensorDistance = distancesensor.getDistance();

      // 이미지 분석 결과와 센서 결과를 비교하여 오차를 계산합니다.
      const error = depth - sensorDistance;

      // 오차를 보정하여 깊이 정보를 업데이트합니다.
      const correctedDepth = depth - error;

      isCapturing = false;
      
      // 여기에서 클라이언트로 결과 전송
      res.json({ depth: correctedDepth })
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
    // 비즈니스 로직 수행

    // 클라이언트에 응답
    res.json({ message: '데이터를 성공적으로 가져옴' });
  } catch (error) {
    // 에러 핸들링

    // 에러 응답
    res.status(500).json({ error: '서버 오류' });
  }
});

app.listen(port, hostname, () => {
  console.log(`서버가 포트 ${hostname}:${port}에서 실행 중입니다.`);
});
