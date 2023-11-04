import torch
from PIL import Image
from torchvision.transforms import Compose, ToTensor, Resize
from depth_decoder import DepthDecoder
from resnet_encoder import ResnetEncoder
from layers import *

def load_model():
    model_path = "mono+stereo_640x192.pth"
    encoder = ResnetEncoder(18, False)
    depth_decoder = DepthDecoder(num_ch_enc=encoder.num_ch_enc, scales=range(4))

    loaded_dict_enc = torch.load(model_path, map_location='cpu')

    feed_height = loaded_dict_enc['height']
    feed_width = loaded_dict_enc['width']
    filtered_dict_enc = {k: v for k, v in loaded_dict_enc.items() if k in encoder.state_dict()}
    encoder.load_state_dict(filtered_dict_enc)
    depth_decoder.load_state_dict(torch.load(model_path, map_location='cpu'))

    encoder.eval()
    depth_decoder.eval()

    return encoder, depth_decoder, feed_height, feed_width

encoder, depth_decoder, feed_height, feed_width, device = load_model()

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

    # Check if the object is within 1m
    if depth_at_crosshair <= 1.0:
        # If the object is within 1m, vibrate the device
        print("진동 발생")  # TODO: 실제 장치에서는 진동을 발생시키는 코드로 대체

    return depth_at_crosshair

if __name__ == "__main__":
   import sys
   image_path = sys.argv[1]
   x = int(sys.argv[2])
   y = int(sys.argv[3])
   depth = estimate_depth(image_path, x, y)
   print(depth)
