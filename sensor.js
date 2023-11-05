import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gyroscope, Magnetometer, Accelerometer } from 'expo-sensors';
import axios from 'axios';

export default function App() {
  const [gyroscopeData, setGyroscopeData] = useState(null);
  const [magnetometerData, setMagnetometerData] = useState(null);
  const [accelerometerData, setAccelerometerData] = useState(null);

  useEffect(() => {
    Gyroscope.setUpdateInterval(1000);
    Magnetometer.setUpdateInterval(1000);
    Accelerometer.setUpdateInterval(1000);

    Gyroscope.addListener((result) => {
      const pitch = parseFloat(result.y.toFixed(1));
      const correctedPitch = checkPitchLimitAndCorrect(pitch); 
      setGyroscopeData({
        x: parseFloat(result.x.toFixed(1)),
        y: correctedPitch, 
        z: parseFloat(result.z.toFixed(1)),
      });
    });
    
    Magnetometer.addListener((result) => {
      setMagnetometerData({
        x: parseFloat(result.x.toFixed(1)),
        y: parseFloat(result.y.toFixed(1)),
        z: parseFloat(result.z.toFixed(1)),
      });
    });

    Accelerometer.addListener((result) => {
      setAccelerometerData({
        x: parseFloat(result.x.toFixed(1)),
        y: parseFloat(result.y.toFixed(1)),
        z: parseFloat(result.z.toFixed(1)),
      });
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      sendSensorData();
    }, 1000);
    return () => clearInterval(interval);
  }, [gyroscopeData, magnetometerData, accelerometerData]);

  async function sendSensorData() {
    const data = {
      gyroscope: gyroscopeData,
      magnetometer: magnetometerData,
      accelerometer: accelerometerData,
    };

    try {
      const response = await axios.post('http://172.30.1.15:3000/sensorData', data);
      console.log('Sensor data sent:', response.status);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <View>
      <Text>Gyroscope: {JSON.stringify(gyroscopeData)}</Text>
      <Text>Magnetometer: {JSON.stringify(magnetometerData)}</Text>
      <Text>Accelerometer: {JSON.stringify(accelerometerData)}</Text>
    </View>
  );
  

  // 각도 제한 및 보정 로직 추가
  function checkPitchLimitAndCorrect(pitch) {
    // pitch 값을 degree로 변환합니다.
    const pitchInDegrees = pitch * (180 / Math.PI);

    // pitch 값이 120도를 초과하거나 -120도를 미만일 때 제한 값을 적용합니다.
    if (pitchInDegrees > 120) {
      console.warn('경고: 카메라가 바닥을 향하고 있지 않습니다. 거리 측정의 정확성을 위해 카메라의 각도를 조정해주세요.');
      pitch = 120 * (Math.PI / 180);  // 각도 제한 적용
    } else if (pitchInDegrees < -120) {
      console.warn('경고: 카메라가 바닥을 향하고 있지 않습니다. 거리 측정의 정확성을 위해 카메라의 각도를 조정해주세요.');
      pitch = -120 * (Math.PI / 180);  // 각도 제한 적용
    }

    // pitch 값에 따라 결과값 보정
    else if (Math.abs(pitchInDegrees) < 10) {  
      pitch *= (1 - Math.abs(pitchInDegrees) / 120);  
    }

    return pitch;
  }
}