@echo off
REM Quick build script for OpenClaw with Pairing API (Windows)

echo 🐳 Building OpenClaw with Pairing API...
echo.

set /p REGISTRY="Enter your registry (e.g., ghcr.io/username or dockerhub-username): "

if "%REGISTRY%"=="" (
  echo ❌ Registry cannot be empty
  exit /b 1
)

set IMAGE_NAME=%REGISTRY%/openclaw-with-api:latest

echo 📦 Building image: %IMAGE_NAME%
docker build -f Dockerfile.openclaw -t %IMAGE_NAME% .

if %ERRORLEVEL% NEQ 0 (
  echo ❌ Build failed
  exit /b 1
)

echo.
echo ✅ Build complete!
echo.
echo Next steps:
echo 1. Push image: docker push %IMAGE_NAME%
echo 2. Update .env: OPENCLAW_IMAGE="%IMAGE_NAME%"
echo 3. Deploy to Railway
echo.
echo Or test locally:
echo docker run -p 18789:18789 -p 18800:18800 %IMAGE_NAME%
echo.
pause
