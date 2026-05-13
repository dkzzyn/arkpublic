; Fragmento NSIS incluído pelo electron-builder (ver package.json build.nsis.include).
; preInit: evita falha ao desinstalar versão antiga quando processos ainda estão abertos.

!macro preInit
  ; /T mata arvore de processos; codigo 128 = processo inexistente (ignorar)
  ; --- ControleExped v1.2 (actual) ---
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM ControleExped.exe /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "ControleExped v1.2.exe" /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "Uninstall ControleExped v1.2.exe" /T' $R9
  ; --- Versões anteriores (migracao) ---
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM ControleExpdDesktop.exe /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM ControleExpd.exe /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "ControleExpd Desktop.exe" /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "Uninstall ControleExpd Desktop.exe" /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "Controle Expedicao.exe" /T' $R9
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM "Uninstall Controle Expedicao.exe" /T' $R9
  Sleep 1200
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "ControleExped v1.2"
  !define MUI_WELCOMEPAGE_TEXT "Este assistente instala ou atualiza o programa.$\r$\n$\r$\nIMPORTANTE: feche a aplicacao antes de Seguinte (incluindo o icone na bandeja). Se o instalador disser que falhou a desinstalacao da versao antiga, reinicie o PC ou execute como administrador o script scripts/windows-uninstall.cmd (no disco do projeto) e volte a correr este instalador.$\r$\n$\r$\nClique em Seguinte para continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend
