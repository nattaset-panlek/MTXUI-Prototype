@echo off
rem Copy only the files the prototype runs on (index.html + mtx\) into mtxworkingstation.
rem Served there at /prototypes/controller-flow/ . This does NOT commit or push:
rem check the result, get it reviewed, then commit + push in mtxworkingstation yourself.
setlocal
set "SRC=%~dp0"
set "DEST=C:\Personal\mtxworkingstation\prototypes\controller-flow"

if not exist "C:\Personal\mtxworkingstation\" (
  echo mtxworkingstation not found at C:\Personal\mtxworkingstation
  pause & exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"

rem mtx\ is mirrored: files deleted here are deleted there too
rem *.zip skipped: the gen image-round zips are over the 25 MiB Cloudflare limit (their images go unzipped)
robocopy "%SRC%mtx" "%DEST%\mtx" /MIR /XF *.zip /NFL /NDL /NJH /NP
if errorlevel 8 (echo Copy of mtx failed & pause & exit /b 1)

copy /Y "%SRC%index.html" "%DEST%\index.html" >nul
if errorlevel 1 (echo Copy of index.html failed & pause & exit /b 1)

echo.
echo Done: %DEST%
echo Next: review, then commit + push in C:\Personal\mtxworkingstation
pause
