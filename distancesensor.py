import cv2
import numpy as np
import json
import sys

# 이미지에서 객체를 검출하는 함수
def detect_objects(image_path, lower_color, upper_color):
    image = cv2.imread(image_path)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    lower_color = np.array(lower_color, dtype=np.uint8)
    upper_color = np.array(upper_color, dtype=np.uint8)
    
    mask = cv2.inRange(hsv, lower_color, upper_color)
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    # 검출된 객체의 위치와 크기 반환
    rects = [cv2.boundingRect(contour) for contour in contours]
    return rects

# 핀홀 카메라 모델을 이용하여 거리를 측정하는 함수
def calculate_distance(pixel_size, real_size, focal_length):
    distance = (real_size * focal_length) / pixel_size
    return distance

# 핀홀 카메라 모델을 이용하여 높이를 측정하는 함수
def calculate_height(pixel_height, distance, focal_length):
    real_height = (pixel_height * distance) / focal_length
    return real_height

# sys.argv[1]은 전달된 첫 번째 인자를 가리킵니다. 이를 image_path로 사용합니다.
image_path = sys.argv[1]

# 여기서 lower_color와 upper_color는 검출하려는 객체의 색상 범위를 나타내는 값입니다.
# 적절한 값을 설정해줘야 합니다.
lower_color = [0, 100, 100]
upper_color = [10, 255, 255]

# 실제 크기와 초점 거리는 적절한 값을 설정해줘야 합니다.
real_size = 0.1
focal_length = 500

# 이미지에서 객체를 검출
rects = detect_objects(image_path, lower_color, upper_color)

# 검출된 각 객체에 대해 거리와 높이를 계산
for rect in rects:
    pixel_size = rect[2]  # rect[2]는 객체의 너비를 가리킵니다.
    pixel_height = rect[3]  # rect[3]는 객체의 높이를 가리킵니다.
    distance = calculate_distance(pixel_size, real_size, focal_length)
    height = calculate_height(pixel_height, distance, focal_length)
    
    # 결과를 JSON 형태로 출력
    result = {
      'distance': distance,
      'height': height
    }
    print(json.dumps(result))
