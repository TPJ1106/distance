import tensorflow as tf
import os

# 모델 불러오기
model_path = 'Saves\model.h5'
model = tf.keras.models.load_model(model_path)

# 주어진 이미지 파일에 대해 분류 결과를 얻어 .txt 파일로 저장하는 함수
def classify_and_save(model, image_path, output_txt_path):
    img = tf.keras.preprocessing.image.load_img(image_path, target_size=(150, 150))
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)  # 모델이 예상하는 입력 형태로 조정
    prediction = model.predict(img_array)
    predicted_class_index = prediction.argmax(axis=-1)[0]
    
    # 라벨을 직접 지정 (10개 클래스에 대해 수정됨)
    labels = {
        0: "꼬깔콘", 
        1: "꿀꽈배기", 
        2: "신라면", 
        3: "안성탕면", 
        4: "오감자",
        5: "진라면매운맛",
        6: "짜파게티",
        7: "콘칲",
        8: "팔도비빔면",
        9: "포카칩"
    }
    predicted_class_label = labels[predicted_class_index]

    with open(output_txt_path, 'w') as f:
        f.write(predicted_class_label)

# 지정한 폴더 내의 모든 이미지에 대해 분류 실행
image_folder_path = './Tests/input'
output_folder_path = './Tests/output'

if not os.path.exists(output_folder_path):
    os.makedirs(output_folder_path)

for img_file in os.listdir(image_folder_path):
    if img_file.endswith(('.png', '.jpg', '.jpeg')):
        img_path = os.path.join(image_folder_path, img_file)
        output_txt_path = os.path.join(output_folder_path, os.path.splitext(img_file)[0] + '.txt')
        classify_and_save(model, img_path, output_txt_path)
