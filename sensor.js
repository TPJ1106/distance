import { Gyroscope, Magnetometer, Accelerometer } from 'expo-sensors';
import { vec3 } from 'gl-matrix';
const axios = require('axios');

let gyroscopeData = null;
let magnetometerData = null;
let accelerometerData = null;
let measuredDistance; // 센서에서 직접 측정한 거리 정보
let correctedDistance; // 조정된 거리 정보

Gyroscope.setUpdateInterval(1000);
Magnetometer.setUpdateInterval(1000);
Accelerometer.setUpdateInterval(1000);

Gyroscope.addListener((result) => {
  gyroscopeData = {
    x: parseFloat(result.x.toFixed(1)),
    y: parseFloat(result.y.toFixed(1)),
    z: parseFloat(result.z.toFixed(1))
  };
});

Magnetometer.addListener((result) => {
  magnetometerData = {
    x: parseFloat(result.x.toFixed(1)),
    y: parseFloat(result.y.toFixed(1)),
    z: parseFloat(result.z.toFixed(1))
  };
});

Accelerometer.addListener((result) => {
  accelerometerData = {
    x: parseFloat(result.x.toFixed(1)),
    y: parseFloat(result.y.toFixed(1)),
    z: parseFloat(result.z.toFixed(1))
  };
});

const getGyroscopeData = () => gyroscopeData;
const getMagnetometerData = () => magnetometerData;
const getAccelerometerData = () => accelerometerData;

function getRotationMatrix(accelerometerData, magnetometerData) {
  const g = [accelerometerData.x, accelerometerData.y, accelerometerData.z];
  const m = [magnetometerData.x, magnetometerData.y, magnetometerData.z];

  const normG = vec3.length(g);
  const normM = vec3.length(m);

  // Normalize accelerometer and magnetometer data
  const gNorm = vec3.scale(vec3.create(), g, 1 / normG);
  const mNorm = vec3.scale(vec3.create(), m, 1 / normM);

  const east = vec3.cross(vec3.create(), gNorm, mNorm);
  const north = vec3.cross(vec3.create(), east, gNorm);

  // Create rotation matrix
  const rMat = [...east, ...gNorm, ...north];

  return rMat;
}

function getOrientation(rotationMatrix) {
  const [ex, ey, ez, gx, gy, gz, mx, my, mz] = rotationMatrix;

  const pitch = Math.atan2(gx, Math.sqrt(gy * gy + gz * gz));
  const roll = Math.atan2(-gy, gz);
  const azimuth = Math.atan2(-mx, my);

  return { pitch, roll, azimuth };
}

// 센서 데이터를 서버로 전송하는 함수
async function sendSensorData() {
  const gyroscopeData = getGyroscopeData();
  const magnetometerData = getMagnetometerData();
  const accelerometerData = getAccelerometerData();

  const data = new FormData();
  data.append('gyroscope', JSON.stringify(gyroscopeData));
  data.append('magnetometer', JSON.stringify(magnetometerData));
  data.append('accelerometer', JSON.stringify(accelerometerData));

  try {
    const response = await axios.post('http://172.30.1.15:3000/sensorData', data);
    console.log('Sensor data sent:', response.status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 거리 데이터를 서버로 전송하는 함수
function sendDistanceData(distanceData) {
  axios.post('http://172.30.1.15:3000', {
    distance: distanceData,
  })
  .then((response) => {
    const depth = response.data.depth;
    // 여기에서 깊이 정보를 사용하여 거리 측정의 오차를 줄입니다.
    correctDistance(depth);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

let previousTime = Date.now();
let velocity = [0, 0, 0];
let position = [0, 0, 0];

// 센서 데이터를 바탕으로 거리를 계산하는 함수
async function calculateDistance() {
  try {
    const response = await axios.get('http://172.30.1.15:3000');
    const distanceData = response.data;
    // 서버에서 받아온 거리 데이터를 반환합니다.
    return distanceData;
  } catch (error) {
    console.error('Error:', error);
  }
}

// 거리를 계산하고 서버에 전송하는 함수
function measureAndSendDistance() {
  measuredDistance = calculateDistance();
  sendDistanceData(measuredDistance);
}

// 거리 측정의 오차를 줄이는 함수
function correctDistance(depth) {
  const error = measuredDistance - depth; // 오차 계산
  correctedDistance = measuredDistance - error; // 오차를 조정하여 거리 정보 업데이트
}

// 각도 제한 및 보정 로직 추가
function checkPitchLimitAndCorrect(pitch) {
  // pitch 값을 degree로 변환합니다.
  const pitchInDegrees = pitch * (180 / Math.PI);

  // pitch 값이 120도를 초과하거나 -120도를 미만일 때 경고 메시지를 출력합니다.
  if (pitchInDegrees > 120 || pitchInDegrees < -120) {  
    console.warn('경고: 카메라가 바닥을 향하고 있지 않습니다. 거리 측정의 정확성을 위해 카메라의 각도를 조정해주세요.');
  }

  // pitch 값에 따라 결과값 보정
  if (Math.abs(pitchInDegrees) < 10) {  
    pitch *= (1 - Math.abs(pitchInDegrees) / 120);  
  }

  return pitch;
}

export { getGyroscopeData, getMagnetometerData, getAccelerometerData, getRotationMatrix, getOrientation, checkPitchLimitAndCorrect };
