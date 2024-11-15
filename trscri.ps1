param (
    [string]$fileName  # The name of the file to transfer
)

# Variables
$localFile = "..\$fileName"  # Path to the local file
$remoteUser = "ubuntu"      # Your remote username
$remoteHost = "51.91.56.10"  # Your VPS IP address
$remotePath = "/var/www/img/" # Remote path

# Check if the file exists
if (Test-Path $fileName) {
    # Use SCP to transfer the file
    $command = "scp `"$fileName`" $remoteUser@${remoteHost}:`"$remotePath`""
    
    # Output the command for debugging
    Write-Host "Executing command: $command"

    # Execute the command
    Invoke-Expression $command
} else {
    Write-Host "The specified file does not exist: $localFile"
}
