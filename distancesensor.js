const cv = require('opencv4nodejs');

// 이미지에서 객체를 검출하는 함수
exports.detectObjects = function(image, lowerColor, upperColor) {
  // 이미지를 HSV 색공간으로 변환
  const hsv = image.cvtColor(cv.COLOR_BGR2HSV);
  // 색상 범위에 해당하는 마스크 생성
  const mask = hsv.inRange(lowerColor, upperColor);
  // 마스크를 이용하여 객체 검출
  const contours = mask.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
  // 검출된 객체의 위치와 크기 반환
  const rects = contours.map(contour => contour.boundingRect());
  return rects;
}

// 핀홀 카메라 모델을 이용하여 거리를 측정하는 함수
exports.calculateDistance = function(pixelSize, realSize, focalLength) {
    const distance = (realSize * focalLength) / pixelSize;
    return distance;
  }
  
  // 핀홀 카메라 모델을 이용하여 높이를 측정하는 함수
  exports.calculateHeight = function(pixelHeight, distance, focalLength) {
    const realHeight = (pixelHeight * distance) / focalLength;
    return realHeight;
  }