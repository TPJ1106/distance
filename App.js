import React, { useRef, useState, useEffect } from 'react';
import { View,Text,TouchableOpacity,StyleSheet, StatusBar,TouchableWithoutFeedback,} from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import { MaterialIcons } from '@expo/vector-icons';
import { getGyroscopeData,getMagnetometerData,getAccelerometerData, getRotationMatrix, getOrientation,} from './sensor.js';
import { AppRegistry } from 'react-native';

export default function App() {
  const cameraRef = useRef(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [serverResponse, setServerResponse] = useState(''); // 서버 응답을 저장하는 상태 변수
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [isButtonsDisabled, setIsButtonsDisabled] = useState(false);
  const [hasPlayedFirstTime, setHasPlayedFirstTime] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const captureInterval = 300;  //0.3초
  let captureTimer = null;
  let isSpeaking = false;
  const [distanceResult, setDistanceResult] = useState('');
  const SERVER_ADDRESS = `http://172.30.1.15:3000`;  

  // 어플 첫 실행 시 음성 가이드 메시지
  const firstText = [
    '어플의 사용법을 알려드리겠습니다.\n다음 설명을 듣고싶으시면 화면을 터치해주세요.',
    '어플의 첫 실행 화면은 카메라 화면입니다.',
    '휴대폰을 사용자가 가려고 하는 방향으로 비추면 어플이 장애물과의 거리를 인식하여 음성으로 알려줍니다.',
    '화면 중앙 하단에는 카메라 촬영 버튼이 있습니다.\n이 버튼은 식품을 촬영하는 버튼으로, 과자나 라면을 촬영하면 어떤 식품인지 알려줍니다.',
    '식품을 촬영하면 촬영한 식품을 인식하여 어떤 식품인지 텍스트와 음성으로 알려준 뒤 3초 후에 이전 화면으로 돌아갑니다.',
    '촬영 시 휴대폰을 30도 가량 아래를 향하게 해주세요.',
    '화면 우측 상단에는 도움말 버튼이 있습니다. 어플의 사용법을 듣고싶으시면 우측 상단의 버튼을 눌러주세요.',
    '어플 사용법 설명이 다 끝났습니다.\n어플의 사용법을 다시 듣고싶으시다면 우측 상단의 도움말 버튼을 눌러주세요.',
    '카메라 화면으로 돌아갑니다.'
  ];

  // 도움말 메시지
  const helpText = [
    '도움말 버튼을 누르셨습니다.\n다음 설명을 듣고싶으시면 화면을 터치해주세요.',
    '어플의 첫 실행 화면은 카메라 화면입니다.',
    '휴대폰을 사용자가 가려고 하는 방향으로 비추면 어플이 장애물과의 거리를 인식하여 음성으로 알려줍니다.',
    '화면 중앙 하단에는 카메라 촬영 버튼이 있습니다.\n이 버튼은 식품을 촬영하는 버튼으로, 과자나 라면을 촬영하면 어떤 식품인지 알려줍니다.',
    '식품을 촬영하면 촬영한 식품을 인식하여 어떤 식품인지 텍스트와 음성으로 알려준 뒤 3초 후에 이전 화면으로 돌아갑니다.',
    '촬영 시 휴대폰을 30도 가량 아래를 향하게 해주세요.',
    '화면 우측 상단에는 도움말 버튼이 있습니다. 어플의 사용법을 듣고싶으시면 우측 상단의 버튼을 눌러주세요.',
    '어플 사용법 설명이 다 끝났습니다.\n어플의 사용법을 다시 듣고싶으시다면 다시 우측 상단의 도움말 버튼을 눌러주세요.',
    '카메라 화면으로 돌아갑니다.'
  ];

  // 어플 첫 실행 시 음성 재생
  const speakTextAndDisplayOverlay = async (text) => {
    setIsButtonsDisabled(true);

    try {
      await Speech.stop();
      setSpeechText(text);
      await Speech.speak(text);
    } catch (error) {
      console.error(error);
    } finally {
      setIsButtonsDisabled(false);
    }
    setIsOverlayVisible(true);
  };

  const handleOverlayPress = async () => {
    if (isOverlayVisible) {
      if (!hasPlayedFirstTime) {
        setHasPlayedFirstTime(true);
        setSpeechIndex(speechIndex + 1);
        return;
      }

      if (speechIndex < firstText.length - 1) {
        const textToSpeak = firstText[speechIndex + 1];
        setSpeechText(textToSpeak);
      
        try {
          await Speech.stop();
          await Speech.speak(textToSpeak);
        } catch (error) {
          console.error(error);
        }
      
        setIsOverlayVisible(true);
      
        if (textToSpeak.includes('카메라 화면으로 돌아갑니다.')) {
          setTimeout(() => setIsOverlayVisible(false), 3000);
        }
        
        setSpeechIndex(speechIndex + 1);
      } else {
        setIsOverlayVisible(false);
        setSpeechIndex(0);
      }
    }
  };

  const speakHelpTextAndDisplayOverlay = async (index) => {
    setIsButtonsDisabled(true);

    try {
      await Speech.stop();
      await Speech.speak(helpText[index]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsButtonsDisabled(false);
    }

    setIsOverlayVisible(true);
    setSpeechText(helpText[index]);
  };

  const handleHelpButtonPress = async () => {
    if (!isOverlayVisible) {
      setIsOverlayVisible(true);
      setSpeechIndex(0);
      speakHelpTextAndDisplayOverlay(0);
    }
  };
/*
  // 자동 촬영
  const startAutoCapture = () => {
    captureTimer = setInterval(() => {
      if (!isOverlayVisible && !isSpeaking) {
        captureAndProcessImage();
      }
    }, captureInterval);
  };

  const stopAutoCapture = () => {
    clearInterval(captureTimer);
  };
 */ 
  // 촬영 후 서버 전송 결과 음성 출력
  const captureAndProcessImage = async () => {
    try {
      const response = await fetch(`${SERVER_ADDRESS}/captureAndProcess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: JSON.stringify({}),
      });

      if (response.status === 200) {
        const data = await response.json();
        // data에 예측 및 결과 텍스트가 포함됩니다.
        const { depth } = data; // 깊이 정보를 추출합니다.
      

        setDistanceResult(`깊이: ${depth}m`); // 거리 정보를 상태 변수에 저장
      // 여기서 음성으로 결과를 출력할 수 있습니다.
       // await Speech.speak(`깊이: ${depth}m`);
      } else {
        console.error('이미지 처리 오류:', response.statusText);
      }
    } catch (error) {
      console.error('이미지 처리 오류:', error);
    }
  };

  // 서버 응답 팝업 열기
  const openServerResponsePopup = () => {
    if (serverResponse) {
      playPopupMessage(); // 팝업 텍스트를 음성으로 재생
    }
  };

  const playPopupMessage = async () => {
    try {
      await Speech.stop(); // 현재 음성 재생 중인 경우 중지
      await Speech.speak(serverResponse); // 팝업에 표시된 텍스트를 음성으로 재생
    } catch (error) {
      console.error('음성 재생 오류:', error);
    }
  
    // 3초 후에 팝업을 자동으로 닫습니다.
    setTimeout(() => {
      setServerResponse(''); // 서버 응답을 초기화하여 팝업 내용을 지웁니다.
      setIsOverlayVisible(false); // 팝업을 닫습니다.
    }, 3000); // 3초 후에 실행
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');

      if (!hasPlayedFirstTime) {
        setIsOverlayVisible(true);
        setIsButtonsDisabled(true);
        try {
          await Speech.stop();
          speakTextAndDisplayOverlay(firstText[0]);
        } catch (error) {
          console.error(error);
        } finally {
          setIsButtonsDisabled(false);
          setHasPlayedFirstTime(true);
        }
      }
    })();
  }, [hasPlayedFirstTime]);
  
  // useEffect를 사용하여 컴포넌트가 마운트되었을 때 setInterval을 설정합니다.
  useEffect(() => {
    // setInterval 함수를 사용해 captureAndProcessImage 함수를 0.3초마다 실행합니다.
    captureTimer = setInterval(() => {
      if (!isOverlayVisible && !isSpeaking) {
        captureAndProcessImage();
      }
    }, captureInterval);
    
    // 컴포넌트가 언마운트될 때 인터벌을 정리합니다.
    return () => {
      clearInterval(captureTimer);
    };
  }, []);
  
/*
  // 어플 실행 시 항상 자동 촬영 시작
  useEffect(() => {
    startAutoCapture();
  }, []);

  // 음성 재생 중 또는 카메라 버튼 누를 때만 자동 촬영 중지
  useEffect(() => {
    if (isSpeaking || isButtonsDisabled) {
      stopAutoCapture();
    } else {
      startAutoCapture();
    }
  }, [isSpeaking, isButtonsDisabled]);
*/
  // 서버
  useEffect(() => {
    openServerResponsePopup();
  }, [serverResponse]);

// 이미지를 서버로 전송
const uploadImageToServer = async () => {
  if (!cameraPermission || isButtonsDisabled) {
    console.log('카메라 액세스 권한이 필요하거나 버튼이 비활성화되었습니다.');
    return;
  }

  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync();

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg', // 이미지 유형에 따라 수정하세요.
        name: 'photo.jpg',
      });

      const response = await fetch(`${SERVER_ADDRESS}/saveCameraImage`, {
        method: 'POST',
        body: formData, // 이미지를 FormData로 설정
        headers: {
        'Content-Type': 'multipart/form-data', // 멀티파트 폼 데이터로 설정
      },
    });

      if (response.status === 200) {
        const data = await response.json();
        await Speech.stop();
        await Speech.speak(data.testResultText);
        setServerResponse(data.testResultText);
        setIsOverlayVisible(true);
      } else {
        console.error('서버 오류:', response.statusText);
        setServerResponse('서버로 이미지를 업로드하지 못했습니다.');
        setIsOverlayVisible(true);
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      setServerResponse('식품을 인식할 수 없습니다.\n다시 촬영해 주세요.');
      setIsOverlayVisible(true);
    }
  }
};
/*
// 센서데이터
useEffect(() => {
  const intervalId = setInterval(() => {
    const accelerometerData = getAccelerometerData();
    const magnetometerData = getMagnetometerData();
    // 필요에 따라 gyroscopeData도 가져올 수 있습니다.
    const gyroscopeData = getGyroscopeData();
    const rotationMatrix = getRotationMatrix(accelerometerData, magnetometerData);
    const orientation = getOrientation(rotationMatrix);
    console.log(accelerometerData);  // 가속도계 데이터 출력
    console.log(gyroscopeData);  // 자이로스코프 데이터 출력
    console.log(magnetometerData);  // 자기장 센서 데이터 출력

    // 센서 데이터를 사용하여 거리 측정 등의 작업을 수행합니다.
    // 이 부분은 제공하신 GitHub 링크의 로직에 따라 작성하시면 됩니다.
  }, 1000); // 1초마다 센서 데이터를 가져옵니다.

  return () => {
    clearInterval(intervalId); // 컴포넌트가 언마운트될 때 인터벌을 정리합니다.
  };
}, []);
*/
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {cameraPermission === null ? (
        <Text>카메라 액세스 권한 요청 중...</Text>
      ) : cameraPermission === false ? (
        <Text>카메라 액세스 권한이 거부되었습니다. 권한을 부여해 주세요.</Text>
      ) : (
        <TouchableWithoutFeedback onPress={handleOverlayPress}>
          <View style={styles.cameraContainer}>
            {/* 도움말 버튼 */}
            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleHelpButtonPress}
              disabled={isButtonsDisabled}
            >
              <MaterialIcons name="help" size={70} color="#AE7FFF" />
            </TouchableOpacity>
            {isOverlayVisible && (
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>{speechText}</Text>
              </View>
            )}
            <View style={{position: "absolute", bottom:10, left:10}}>
            <Text style={{color:"white"}}>{distanceResult}</Text>
            </View>

            {/* 서버 응답 팝업 */}
            {serverResponse !== '' && (
              <View style={styles.serverResponsePopup}>
                <Text style={styles.serverResponseText}>{serverResponse}</Text>
              </View>
            )}

            <Camera style={styles.camera} ref={cameraRef} />

            {/* 카메라 버튼 */}
            <TouchableOpacity
              style={[styles.circularButton]}
              onPress={uploadImageToServer}
              disabled={isButtonsDisabled}
            >
              <MaterialIcons name="photo-camera" size={70} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  helpButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'yellow',
    padding: 15,
    borderRadius: 30,
    zIndex: 2,
  },
  circularButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingVertical: 20,
    paddingHorizontal: 130,
    backgroundColor: 'blue',
    padding: 45,
    borderRadius: 30,
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  distanceInfo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    zIndex: 4,
  },
  distanceText: {
    color: 'black',
    fontSize: 20,
    textAlign: 'center',
  },

  // 서버 응답 팝업
  serverResponsePopup: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    zIndex: 4,
    elevation: 5, // Android에서 그림자 효과 주기
  },
  serverResponseText: {
    fontSize: 20,
    textAlign: 'center',
  },
});

AppRegistry.registerComponent('NewGP', () => App);