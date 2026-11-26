#!/usr/bin/env python3
"""
Image → textured 3D (GLB) with Microsoft TRELLIS.2 (MIT), through its free Hugging Face Space (ZeroGPU).

  HF_TOKEN=<your free read token> python3 tools/recon3d/reconstruct_trellis2.py <photo.png> <out.glb> [--seed 0]

- One photo per run. For asymmetric bikes run it twice: a 3/4 view of the LEFT side and a 3/4 view of the RIGHT
  side, then fuse them with assemble.py --sides left,right.
- ZeroGPU quota is per Hugging Face account (free accounts: a few minutes per day). From a shared cloud IP the call
  may fall back to the anonymous quota ("0s left"); then run this script from your own computer, or use the Space in
  a browser while signed in (https://huggingface.co/spaces/microsoft/TRELLIS.2) and download the GLB.
- Hunyuan3D-2/2.1 is NOT used: its licence excludes the EU, the UK and South Korea.
"""
import argparse, os, shutil, time
from gradio_client import Client, handle_file

ap = argparse.ArgumentParser()
ap.add_argument("photo"); ap.add_argument("out"); ap.add_argument("--seed", type=int, default=0)
ap.add_argument("--resolution", default="1536", choices=["512", "1024", "1536"])
o = ap.parse_args()
client = Client("microsoft/TRELLIS.2", token=os.environ.get("HF_TOKEN"), verbose=False)
t = time.time()
client.predict(api_name="/start_session")
pre = client.predict(handle_file(o.photo), api_name="/preprocess_image")
client.predict(handle_file(pre), o.seed, o.resolution, api_name="/image_to_3d")
glb, download = client.predict(400000, 4096, api_name="/extract_glb")
shutil.copy(download or glb, o.out)
print(f"{o.out} ({os.path.getsize(o.out) / 1e6:.1f} Mo) in {time.time() - t:.0f} s")
