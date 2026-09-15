#!/usr/bin/env python3
import os
import shutil
import urllib.request
import re
import sys

# Mapping of file ID to filename
IMAGES = [
    ("1EUoyEkkUIPh8CuyGuDjls4w8D657H7Xo", "20260914_162942.jpg"),
    ("1KuCp_91MRHPf5TeXRffjNQ7egL3vkX8S", "20260914_162947.jpg"),
    ("1e6UjHLtF16ij7AzN4QAx1p9Ra7p-ejmd", "20260914_162952.jpg"),
    ("16k3wneZYJSYw9zZtDRy1T4N5IyAwR5Ha", "20260914_163012.jpg"),
    ("1ifz57jo8rIlngIplOH709pLF5N7ouiIw", "20260914_163019.jpg"),
    ("1lRZTL-S-ukilMSHO8UxdrE532ffn2pk2", "20260914_163025.jpg"),
    ("1E5EL4QAxowQb32VuJnqudSKrAUQZQ9o5", "20260914_163033.jpg"),
    ("1yDmTtvp48PEeyYurPZAsS0JAqqUAxmnL", "20260914_163041.jpg"),
    ("119JKnZCukzPlUnnnbWkhhGYXkMG62OS8", "20260914_163050.jpg"),
    ("1o-dUufFUnPn-tTOtArzPfKHfzEM6h9Cn", "20260914_163108.jpg"),
    ("1iMzsTtw6MtSC-Oek4povJmcfbCeAd3Fb", "20260914_163123.jpg"),
    ("1H8PLQw8P7mnoSrZ9xqfg18SMtLHquQm6", "20260914_163130.jpg"),
    ("1FzsELxkIeI4EFNEWVsbWn9H9jck6Ao6B", "20260914_163143.jpg"),
    ("1-do9zyY3WXHfpyvV7b-mm8gGOssp2Did", "20260914_163155.jpg"),
    ("1ymiOu7BBu88D-6rmqUWzPn6EaFok-CX6", "20260914_163204.jpg"),
    ("1_EfD0ONbZsppILyWezGiLpCwdbWADLmn", "20260914_163209.jpg"),
    ("10olJbIhZlygT50cV9WEl8wvYnaF2lRrD", "20260914_163214.jpg"),
    ("1KBw0YX2vF3kYsMk-F1YpqGmIX89UBR1w", "20260914_163218.jpg"),
    ("14KkMcJruDmPPtg6P0CjqIBhoaN2LSbG1", "20260914_163231.jpg"),
    ("16vsYs8sc53vmzNIKODvut-CCT5e6-peM", "20260914_163237.jpg"),
    ("1bYWn6q_Af27z0nDIRlu0hARcgq41k0so", "20260914_163243.jpg"),
    ("1TxMzWE9VzZ-t2KKhJenwGrNKTvcYESwP", "20260914_163251.jpg"),
    ("1llivxR6TgvTBDTxaFSlK1onHmks1RIbl", "20260914_163257.jpg"),
    ("1krzhczI7HptpeyFxsz2VM2eyefk1QV1V", "20260914_163306.jpg"),
    ("1DNgwG8KqC-J3AWgfSBKZrrIwOm5Vj8Vq", "20260914_163313.jpg"),
    ("1SDLfdR9QeoVCQiRN0CU0ps92cNPqQlj-", "20260914_163319.jpg"),
    ("15t-C9SWBL5yRD5jwsW0s7PQFYcMHL4XM", "20260914_163325.jpg"),
    ("1MnScF6q-CpCPpb0KJ-P1YLFsM7JAloLg", "20260914_163328.jpg"),
    ("1On8dVFffZjxDUP3N_oSMBHnNKjAaRv3H", "20260914_163334.jpg"),
    ("1o7FnsTdxFlB3C4b6AT9RigA3f21B7SU5", "20260914_163340.jpg"),
    ("1Dh4Bmbe1bNiTfLcAR0fzaRZOQ3yGa8rE", "20260914_163343.jpg")
]

DEST_DIR_APP = "/home/felipe/Google Drive/projetos/ubatuba/AcervoVivo/public/images"
DEST_DIR_PB = "/home/felipe/Google Drive/projetos/ubatuba/Paz sem Voz/Paz Para Quem? Registros/F/2026-09-14/PB"

os.makedirs(DEST_DIR_APP, exist_ok=True)
os.makedirs(DEST_DIR_PB, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

print(f"Starting download of {len(IMAGES)} workshop images...")

success_count = 0
for idx, (file_id, filename) in enumerate(IMAGES, 1):
    dest_path_app = os.path.join(DEST_DIR_APP, filename)
    dest_path_pb = os.path.join(DEST_DIR_PB, filename)
    
    if os.path.exists(dest_path_app) and os.path.getsize(dest_path_app) > 10000:
        print(f"[{idx}/{len(IMAGES)}] {filename} already exists, skipping download.")
        if not os.path.exists(dest_path_pb):
            shutil.copy2(dest_path_app, dest_path_pb)
        success_count += 1
        continue
    
    # Try Googleusercontent direct link, or Google Drive uc export
    urls = [
        f"https://lh3.googleusercontent.com/d/{file_id}",
        f"https://drive.google.com/uc?export=download&id={file_id}"
    ]
    
    downloaded = False
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                if len(data) > 5000 and (data[:3] == b'\xff\xd8\xff' or b'JFIF' in data[:20] or b'Exif' in data[:20]):
                    with open(dest_path_app, "wb") as f:
                        f.write(data)
                    shutil.copy2(dest_path_app, dest_path_pb)
                    print(f"[{idx}/{len(IMAGES)}] Downloaded {filename} ({len(data)//1024} KB)")
                    downloaded = True
                    success_count += 1
                    break
        except Exception as e:
            pass
            
    if not downloaded:
        print(f"[{idx}/{len(IMAGES)}] Failed to download {filename} ({file_id})")

print(f"\nDone: {success_count}/{len(IMAGES)} images saved.")
