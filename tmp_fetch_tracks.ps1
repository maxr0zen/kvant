$ErrorActionPreference='Stop'
try {
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/auth/login/' -Body (ConvertTo-Json @{username='student1'; password='student123'}) -ContentType 'application/json'
  Write-Output "TOKEN: $($login.token)"
  $tracks = Invoke-RestMethod -Uri 'http://localhost:8000/api/tracks/' -Headers @{ Authorization = "Bearer $($login.token)" } -Method Get
  Write-Output "TRACKS:`n" 
  $tracks | ConvertTo-Json -Depth 5
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
}
