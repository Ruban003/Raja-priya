Set WshShell = CreateObject("WScript.Shell")

' --- CONFIGURATION (Your Folder Path) ---
projectPath = "C:\Users\Ruban\Desktop\Glam\Rajapriya-main"

' 1. Start the Server (Hidden in Background)
' The '0' at the end means HIDE WINDOW.
WshShell.Run "cmd /c cd /d """ & projectPath & "\backend"" && node server.js", 0, False

' 2. Wait 3 Seconds for engine to start
WScript.Sleep 3000

' 3. Open the Admin Login Page
WshShell.Run """" & projectPath & "\admin\admin.html"""

Set WshShell = Nothing