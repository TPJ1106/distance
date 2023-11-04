import torch
from PIL import Image
from torchvision.transforms import Compose, ToTensor, Resize
from depth_decoder import DepthDecoder
from resnet_encoder import ResnetEncoder
import requests
from PIL import Image

def load_model():
    # load pre-trained model weights
    model_path = "../mono+stereo_640x192.pth"  # TODO: replace with your model path

    # Initialize encoder and decodera
    encoder = ResnetEncoder(18, False)
    depth_decoder = DepthDecoder(num_ch_enc=encoder.num_ch_enc, scales=range(4))

    # Load model parameters
    loaded_dict_enc = torch.load(model_path, map_location='cpu')

    # Extract the height and width of image that this model was trained with
    feed_height = loaded_dict_enc['height']
    feed_width = loaded_dict_enc['width']
    filtered_dict_enc = {k: v for k, v in loaded_dict_enc.items() if k in encoder.state_dict()}
    encoder.load_state_dict(filtered_dict_enc)
    depth_decoder.load_state_dict(torch.load(model_path, map_location='cpu'))

    encoder.eval()
    depth_decoder.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    return encoder, depth_decoder, feed_height, feed_width, device

encoder, depth_decoder, feed_height, feed_width = load_model()

def preprocess_image(image):
    original_width, original_height = image.size

    preprocess = Compose([
        Resize((feed_height, feed_width)),
        ToTensor()
    ])
    return preprocess(image).unsqueeze(0), original_width, original_height


def postprocess_disparity(disp, original_height, original_width):
    disp_resized = torch.nn.functional.interpolate(disp, (original_height, original_width), mode="bilinear", align_corners=False)
    return disp_resized.squeeze().cpu().detach().numpy()


def estimate_depth(image_path, x, y):
    # Load the image and pre-process
    image = Image.open(image_path).convert('RGB')
    input_image, original_width, original_height = preprocess_image(image)

    # Load model and device
    encoder, depth_decoder, feed_height, feed_width, device = load_model()
    input_image = input_image.to(device)

    # Predict depth
    with torch.no_grad():
        features = encoder(input_image)
        outputs = depth_decoder(features)
  
    disp = outputs[("disp", 0)]
  
    # Post-process disparity
    disp_resized_np = postprocess_disparity(disp, original_height, original_width)

    # Extract depth at crosshair position
    depth_at_crosshair = disp_resized_np[y][x]   # 해당 위치의 깊이 추출
    # Save distance result to text file
    with open(f"{image_path.split('.')[0]}_distance.txt", "w") as file:
        file.write(str(disp_resized_np))

    # Send depth to server
    server_url = "http://172.30.1.15:3000"
    payload = {"depth": depth_at_crosshair}
    response = requests.post(server_url, json=payload)
    if response.status_code == 200:
        print("깊이 값 전송 성공")
    else:
        print("깊이 값 전송 실패")

    # Return depth at crosshair
    return depth_at_crosshair   # 깊이 반환
# Define device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if __name__ == "__main__":
   import sys
   image_path = sys.argv[1]
   x = int(sys.argv[2])
   y = int(sys.argv[3])
   depth = estimate_depth(image_path, x, y)
   print(depth)