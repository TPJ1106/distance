const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const { hostname } = require('os');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

//클라이언트에서 전송한 파일 서버에 업로드
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Python 스크립트를 실행하는 함수
function runScript(inputImage, x, y) {
  let options = {
    mode: 'text',
    pythonOptions: ['-u'], // unbuffered, 실시간 출력을 허용
    args: [inputImage, x, y]
  };

  let pyShell = new PythonShell('your_python_script.py', options);

  pyShell.on('message', function (message) {
    // 실시간으로 Python 스크립트의 출력을 받아옵니다.
    console.log(message);
  });

  pyShell.end(function (err, code, signal) {
    if (err) throw err;
    console.log('The exit code was: ' + code);
    console.log('The exit signal was: ' + signal);
    console.log('finished');
  });
}

// /distance 엔드포인트
app.post('/distance', (req, res) => {
  const { inputImage, x, y } = req.body;

  runScript(inputImage, x, y);
  res.sendStatus(200);
});

//식품 인식
app.post('/saveCameraImage', upload.single('image'), async (req, res) => {
  try {
    const path = require('path');

    //이미지를 저장할 디렉토리 설정
    const uploadDirectory = path.join(__dirname, 'Tests', 'input');

    //이미지 파일 이름 생성
    const timestamp = Date.now();
    const fileName = `${timestamp}.jpg`;

    //전체 파일 경로 생성
    const filePath = path.join(uploadDirectory, fileName);

    //이미지를 filePath에 저장
    fs.writeFileSync(filePath, req.file.buffer);

    console.log('파일이 성공적으로 저장되었습니다.');

    //testFrom3.py 실행
    const scriptPath = path.join(__dirname, 'testFrom3.py');
    const testFrom3Command = `python ${scriptPath} ${fileName}`;
    exec(testFrom3Command, async (error, stdout, stderr) => {
      if (error) {
        console.error('testFrom3.py 실행 오류:', error);
        return res.status(500).json({ message: 'testFrom3.py 실행 중 오류 발생' });
      }

      const path = require('path');

      //텍스트 파일 저장
      const testResultFileName = `${timestamp}.txt`;
      const testResultFilePath = path.join(__dirname, 'Tests', 'output', testResultFileName);

      //텍스트 파일의 내용을 읽음
      const result_text = fs.readFileSync(testResultFilePath, 'utf-8');

      //결과 파일 삭제
      //fs.unlinkSync(testResultFilePath);

      //문자 인코딩 설정
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(result_text);
    });
  } catch (error) {
    console.error('이미지 저장 및 처리 오류:', error);
    res.status(500).json({ message: '이미지 저장 및 처리 중 오류 발생' });
  }
});

app.get('/', (req, res) => {
  try {
    // 클라이언트에 응답
    res.json({ message: '데이터를 가져오기 성공' });
  } catch (error) {
    // 에러 응답
    res.status(500).json({ error: '서버 오류' });
  }
});

app.listen(port, hostname, () => {
  console.log(`서버가 포트 ${hostname}:${port}에서 실행 중입니다.`);
});