# Dating bot WebRTC patch

## PowerShell (dating_bot papkasida)

```powershell
cd C:\Users\User\PycharmProjects\Tracker\dating_bot
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/DilshodZokirov/bgalaxy-app/cursor/dating-webrtc-patch-5498/dating-bot-patch/dating-bot-webrtc.patch" -OutFile dating-bot-webrtc.patch
git checkout -b cursor/webrtc-video-call-5498
git apply --whitespace=nowarn dating-bot-webrtc.patch
git add -A
git commit -m "feat(webrtc): mustahkam audio/video qongiroq"
git push -u origin cursor/webrtc-video-call-5498
```
