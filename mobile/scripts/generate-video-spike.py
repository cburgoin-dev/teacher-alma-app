"""Original deterministic 25s silent MPEG-4 Part 2 fixture. Requires Python + OpenCV + numpy.
Run from any directory. No downloads, source footage, or production media.
"""
from pathlib import Path
import cv2
import numpy as np

dest = Path(__file__).resolve().parents[1] / 'assets' / 'video-spike'
dest.mkdir(exist_ok=True)
candidate = dest / 'segments.pending.mp4'
writer = cv2.VideoWriter(str(candidate), cv2.VideoWriter_fourcc(*'mp4v'), 10, (640, 360))
assert writer.isOpened()
labels = ['Intro', 'Parte 1', 'Parte 2', 'Parte 3', 'Final']
colors = [(110, 60, 20), (40, 100, 20), (90, 40, 100), (30, 90, 150), (100, 80, 40)]
for frame in range(250):
    segment = frame // 50
    image = np.full((360, 640, 3), colors[segment], dtype=np.uint8)
    cv2.putText(image, labels[segment], (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (255, 255, 255), 3)
    cv2.putText(image, f'{frame / 10:04.1f} / 25.0 s', (50, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.rectangle(image, (50, 280), (50 + int(frame / 249 * 540), 300), (255, 255, 255), -1)
    if frame == 0:
        cv2.imwrite(str(dest / 'poster.png'), image)
    writer.write(image)
writer.release()
capture = cv2.VideoCapture(str(candidate))
assert capture.isOpened() and capture.get(cv2.CAP_PROP_FRAME_COUNT) == 250
assert capture.get(cv2.CAP_PROP_FPS) == 10
decoded = 0
while capture.read()[0]:
    decoded += 1
assert decoded == 250
capture.release()
candidate.replace(dest / 'segments.mp4')
print('Generated and decoded 250 frames, 640x360, 10fps, 25s; MPEG-4 Part 2, silent.')
