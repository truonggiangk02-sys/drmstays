@echo off
rem Runs deploy-production.ps1 without changing PowerShell's script policy. Flags pass through (-D1Id, -Migrate, -SkipPull, -Install).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-production.ps1" %*
