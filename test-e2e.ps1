$ErrorActionPreference = "Stop"

$apiUrl = "https://jguzyqqsw9.execute-api.us-east-1.amazonaws.com/prod"

Write-Host ""
Write-Host "============================================="
Write-Host " PURCHASE APPROVAL - E2E TEST"
Write-Host "============================================="
Write-Host ""

# ============================================================
# 1. CREATE PURCHASE REQUEST
# ============================================================

Write-Host "[1/7] Creating purchase request..."

$body = @{
    title = "Compra E2E"
    description = "Prueba end-to-end de la plataforma"
    amount = 4500000
    requesterName = "Diego Uribe"
    requesterEmail = "diego@example.com"
    approvers = @(
        @{
            name = "Carlos Ramirez"
            email = "carlos@example.com"
            role = "MANAGER"
        }
        @{
            name = "Laura Gomez"
            email = "laura@example.com"
            role = "FINANCE"
        }
        @{
            name = "Andres Martinez"
            email = "andres@example.com"
            role = "DIRECTOR"
        }
    )
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/purchase-requests" `
    -ContentType "application/json" `
    -Body $body

$requestId = $response.request.id

Write-Host "      Request: $requestId"

if ($response.approvers.Count -ne 3) {
    throw "Expected exactly 3 approvers"
}

Write-Host "      Approvers: 3"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 2. GET FIRST APPROVER
# ============================================================

Write-Host "[2/7] Getting approval details..."

$token1 = $response.approvers[0].token
$otp1 = $response.approvers[0].otp

$approval = Invoke-RestMethod `
    -Method GET `
    -Uri "$apiUrl/approvals/$token1"

if ($approval.approver.status -ne "PENDING") {
    throw "Approver should be PENDING"
}

Write-Host "      Approver: $($approval.approver.name)"
Write-Host "      Role: $($approval.approver.role)"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 3. VALIDATE OTP
# ============================================================

Write-Host "[3/7] Validating OTP..."

$otpBody = @{
    otp = $otp1
} | ConvertTo-Json

$otpResult = Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token1/otp" `
    -ContentType "application/json" `
    -Body $otpBody

if ($otpResult.approverId -ne $approval.approver.id) {
    throw "OTP validation returned unexpected approver"
}

Write-Host "      OTP verified"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 4. APPROVE FIRST
# ============================================================

Write-Host "[4/7] Approving first approver..."

$decisionBody = @{
    decision = "APPROVED"
} | ConvertTo-Json

$decision1 = Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token1/decision" `
    -ContentType "application/json" `
    -Body $decisionBody

if ($decision1.status -ne "SIGNED") {
    throw "First approver should be SIGNED"
}

if ($decision1.purchaseRequestStatus -ne "PENDING") {
    throw "Purchase request should remain PENDING"
}

Write-Host "      Approver status: $($decision1.status)"
Write-Host "      Request status: $($decision1.purchaseRequestStatus)"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 5. APPROVE SECOND
# ============================================================

Write-Host "[5/7] Approving second approver..."

$token2 = $response.approvers[1].token
$otp2 = $response.approvers[1].otp

$otpBody2 = @{
    otp = $otp2
} | ConvertTo-Json

Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token2/otp" `
    -ContentType "application/json" `
    -Body $otpBody2 | Out-Null

$decision2 = Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token2/decision" `
    -ContentType "application/json" `
    -Body $decisionBody

if ($decision2.status -ne "SIGNED") {
    throw "Second approver should be SIGNED"
}

if ($decision2.purchaseRequestStatus -ne "PENDING") {
    throw "Purchase request should remain PENDING"
}

Write-Host "      Approver status: $($decision2.status)"
Write-Host "      Request status: $($decision2.purchaseRequestStatus)"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 6. APPROVE THIRD
# ============================================================

Write-Host "[6/7] Approving third approver..."

$token3 = $response.approvers[2].token
$otp3 = $response.approvers[2].otp

$otpBody3 = @{
    otp = $otp3
} | ConvertTo-Json

Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token3/otp" `
    -ContentType "application/json" `
    -Body $otpBody3 | Out-Null

$decision3 = Invoke-RestMethod `
    -Method POST `
    -Uri "$apiUrl/approvals/$token3/decision" `
    -ContentType "application/json" `
    -Body $decisionBody

if ($decision3.status -ne "SIGNED") {
    throw "Third approver should be SIGNED"
}

if ($decision3.purchaseRequestStatus -ne "COMPLETED") {
    throw "Purchase request should be COMPLETED"
}

Write-Host "      Approver status: $($decision3.status)"
Write-Host "      Request status: $($decision3.purchaseRequestStatus)"
Write-Host "      PASS"
Write-Host ""

# ============================================================
# 7. VERIFY FINAL STATE
# ============================================================

Write-Host "[7/7] Verifying final state..."

$finalApproval = Invoke-RestMethod `
    -Method GET `
    -Uri "$apiUrl/approvals/$token3"

if ($finalApproval.request.status -ne "COMPLETED") {
    throw "Final request status is not COMPLETED"
}

Write-Host "      Request: $($finalApproval.request.id)"
Write-Host "      Final status: $($finalApproval.request.status)"
Write-Host "      PASS"
Write-Host ""

Write-Host "============================================="
Write-Host " E2E TEST PASSED"
Write-Host "============================================="
Write-Host ""
