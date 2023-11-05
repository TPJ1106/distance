const axios = require('axios');
const { exec } = require('child_process');

let distanceData = {
  measuredDistance: null,
  correctedDistance: null
};

// distancesensor.py를 실행하고 결과를 받는 함수
function getDistanceData(callback) {
  exec('python3 distancesensor.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error);
    } else {
      // Python 스크립트의 출력을 JSON으로 파싱
      const data = JSON.parse(stdout);
      distanceData.measuredDistance = data.distance; // distanceData 객체의 measuredDistance 속성에 할당
      correctDistance(depth); // 거리 보정 함수 호출
      callback(data);
    }
  });
}


function measureAndSendDistance(gyroscopeData, magnetometerData, accelerometerData, callback) {
  // 센서 데이터를 이용하여 거리 데이터를 계산하는 코드를 여기에 작성합니다.
  const imageFilePath = calculateImageFilePath(gyroscopeData, magnetometerData, accelerometerData);
  getDistanceData((distanceData) => {
    sendDistanceData(distanceData.correctedDistance); // correctedDistance 속성 사용
    callback(distanceData);
  });
}

function correctDistance(depth) {
  const error = distanceData.measuredDistance - depth; // 오차 계산
  distanceData.correctedDistance = distanceData.measuredDistance - error; // 오차를 조정하여 거리 정보 업데이트
}

async function sendDistanceData(correctedDistance) {
  try {
    const response = await axios.post('http://172.30.1.15:3000/distance', {
      distance: correctedDistance,
    });

    // 서버가 응답한 데이터를 response.data로 접근할 수 있습니다.
    const responseData = response.data;

    // 원격 서버에서 반환한 거리 데이터
    const remoteDistance = responseData.distance;

    // 로컬에서 측정한 거리와 원격 서버에서 반환한 거리 간의 차이 계산
    const error = correctedDistance - remoteDistance;

    // 오차를 보정하여 거리 정보 업데이트
    correctedDistance -= error;

    console.log('서버 응답:', responseData);
    console.log('오차 보정 후 거리:', correctedDistance);

    // 처리 로직을 추가할 수 있습니다.
  } catch (error) {
    console.error('Error:', error);
    // 에러 발생 시 에러를 처리하는 코드를 추가할 수 있습니다.
  }
}

module.exports = {
  measureAndSendDistance,
  correctDistance
};
