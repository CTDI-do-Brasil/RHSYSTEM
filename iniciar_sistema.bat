@echo off
title Controle de Funcionarios Temporarios (CFT)
cd /d "%~dp0"

echo ===================================================================
echo     SISTEMA DE CONTROLE DE FUNCIONARIOS TEMPORARIOS (CFT)
echo ===================================================================
echo.
echo [1/2] Iniciando o servidor da aplicacao e integracao MinIO...
start "CFT Server" /min node server.js

echo [2/2] Abrindo aplicacao no navegador (http://localhost:3000)...
timeout /t 2 >nul
start "" "http://localhost:3000"

echo.
echo ===================================================================
echo  Sistema iniciado com sucesso em http://localhost:3000!
echo  Voce ja pode utilizar o sistema com suporte completo a anexos MinIO.
echo  (Para encerrar o servidor, feche esta janela ou o processo Node)
echo ===================================================================
echo.
pause
