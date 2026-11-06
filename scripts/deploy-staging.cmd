@echo off
rem Runs deploy-staging.ps1 without needing to change PowerShell's script policy. Extra flags pass through (-SkipPull, -Install).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-staging.ps1" %*
