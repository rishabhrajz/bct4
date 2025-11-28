// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolicyContract.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClaimContract
 * @dev Manages insurance claims with validation and payment flows
 */
contract ClaimContract is ReentrancyGuard, Ownable {
    enum ClaimStatus {
        Pending,
        UnderReview,
        Approved,
        Rejected,
        Paid
    }
    
    struct Claim {
        uint256 id;
        uint256 policyId;
        address patient;
        address provider;
        address providerWallet;
        uint256 amount;
        string medicalReportCid;
        string patientDid;
        string providerVcCid;
        ClaimStatus status;
        uint256 payoutAmount;
        string rejectionReason;
    }
    
    // State variables
    uint256 private claimCounter;
    mapping(uint256 => Claim) public claims;
    mapping(string => bool) public usedMedicalReports;
    
    PolicyContract public policyContract;
    address public insurerAddress;
    
    // Events
    event ClaimSubmitted(
        uint256 indexed claimId,
        address indexed provider,
        address indexed patient,
        uint256 amount
    );
    
    event ClaimStatusUpdated(
        uint256 indexed claimId,
        ClaimStatus newStatus
    );
    
    event ClaimRejected(
        uint256 indexed claimId,
        string reason
    );
    
    event ClaimPaid(
        uint256 indexed claimId,
        address indexed providerWallet,
        uint256 amount
    );
    
    event ClaimStatusChanged(
        uint256 indexed claimId,
        ClaimStatus oldStatus,
        ClaimStatus newStatus
    );
    
    /**
     * @dev Constructor sets the PolicyContract address
     */
    constructor(address _policyContract) Ownable(msg.sender) {
        require(_policyContract != address(0), "Invalid policy contract address");
        policyContract = PolicyContract(_policyContract);
        insurerAddress = msg.sender;
        claimCounter = 0;
    }
    
    modifier onlyInsurer() {
        require(msg.sender == insurerAddress, "Only insurer can call");
        _;
    }
    
    modifier onlyApprovedProvider() {
        // Allow insurer (backend) to submit on behalf of providers
        if (msg.sender != insurerAddress) {
            require(policyContract.isProviderApproved(msg.sender), "Provider not approved");
        }
        _;
    }
    
    /**
     * @dev Set insurer address
     */
    function setInsurerAddress(address _insurer) external onlyOwner {
        require(_insurer != address(0), "Invalid insurer address");
        insurerAddress = _insurer;
    }
    
    /**
     * @dev Submit a new claim (Provider submits medical report)
     */
    function submitClaim(
        uint256 policyId,
        address patient,
        address providerWallet,
        uint256 amount,
        string memory medicalReportCid,
        string memory patientDid,
        string memory providerVcCid
    ) external onlyApprovedProvider returns (uint256) {
        // Security: Prevent duplicate claims
        require(!usedMedicalReports[medicalReportCid], "Medical report already used");
        
        // Validate policy
        PolicyContract.Policy memory policy = policyContract.getPolicy(policyId);
        require(policy.id != 0, "Policy does not exist");
        require(policy.status == PolicyContract.PolicyStatus.Active, "Policy not active");
        require(policy.beneficiary == patient, "Patient must be policy beneficiary");
        
        // Security: Validate claim amount
        require(amount > 0 && amount <= policy.coverageAmount, "Claim exceeds coverage");
        
        // Security: Validate policy period
        require(
            block.timestamp >= policy.startEpoch && block.timestamp <= policy.endEpoch,
            "Policy expired or not started"
        );
        
        require(bytes(medicalReportCid).length > 0, "Medical report required");
        require(bytes(patientDid).length > 0, "Patient DID required");
        require(bytes(providerVcCid).length > 0, "Provider VC required");
        require(providerWallet != address(0), "Provider wallet required");
        
        // Mark medical report as used
        usedMedicalReports[medicalReportCid] = true;
        
        claimCounter++;
        uint256 claimId = claimCounter;
        
        claims[claimId] = Claim({
            id: claimId,
            policyId: policyId,
            patient: patient,
            provider: msg.sender,
            providerWallet: providerWallet,
            amount: amount,
            medicalReportCid: medicalReportCid,
            patientDid: patientDid,
            providerVcCid: providerVcCid,
            status: ClaimStatus.Pending,
            payoutAmount: 0,
            rejectionReason: ""
        });
        
        emit ClaimSubmitted(claimId, msg.sender, patient, amount);
        
        return claimId;
    }
    
    /**
     * @dev Set claim status to Under Review
     */
    function setClaimUnderReview(uint256 claimId) external onlyInsurer {
        require(claims[claimId].id != 0, "Claim does not exist");
        require(claims[claimId].status == ClaimStatus.Pending, "Claim not pending");
        
        claims[claimId].status = ClaimStatus.UnderReview;
        
        emit ClaimStatusUpdated(claimId, ClaimStatus.UnderReview);
    }
    
    /**
     * @dev Reject a claim
     */
    function rejectClaim(uint256 claimId, string memory reason) external onlyInsurer {
        require(claims[claimId].id != 0, "Claim does not exist");
        require(
            claims[claimId].status == ClaimStatus.Pending || 
            claims[claimId].status == ClaimStatus.UnderReview,
            "Cannot reject claim in current status"
        );
        
        claims[claimId].status = ClaimStatus.Rejected;
        claims[claimId].rejectionReason = reason;
        
        emit ClaimRejected(claimId, reason);
        emit ClaimStatusUpdated(claimId, ClaimStatus.Rejected);
    }
    
    /**
     * @dev Approve and pay claim (Security: nonReentrant)
     */
    function approveAndPayClaim(uint256 claimId, uint256 payoutAmount) 
        external 
        payable 
        onlyInsurer 
        nonReentrant 
    {
        require(claims[claimId].id != 0, "Claim does not exist");
        require(claims[claimId].status == ClaimStatus.UnderReview, "Claim not under review");
        require(msg.value == payoutAmount, "Incorrect payment amount");
        require(payoutAmount > 0, "Payout must be positive");
        
        // Security: Effects before interactions
        claims[claimId].status = ClaimStatus.Paid;
        claims[claimId].payoutAmount = payoutAmount;
        
        // Pay provider
        address providerWallet = claims[claimId].providerWallet;
        (bool success, ) = payable(providerWallet).call{value: msg.value}("");
        require(success, "Payment failed");
        
        emit ClaimPaid(claimId, providerWallet, payoutAmount);
        emit ClaimStatusUpdated(claimId, ClaimStatus.Paid);
    }
    
    /**
     * @dev Legacy updateClaimStatus function (for backward compatibility)
     */
    function updateClaimStatus(uint256 claimId, ClaimStatus newStatus) external {
        require(claims[claimId].id != 0, "Claim does not exist");
        
        ClaimStatus oldStatus = claims[claimId].status;
        require(oldStatus != newStatus, "Status unchanged");
        
        // Validate status transitions
        require(_isValidStatusTransition(oldStatus, newStatus), "Invalid status transition");
        
        claims[claimId].status = newStatus;
        
        emit ClaimStatusChanged(claimId, oldStatus, newStatus);
    }
    
    /**
     * @dev Get claim details
     */
    function getClaim(uint256 claimId) external view returns (Claim memory) {
        require(claims[claimId].id != 0, "Claim does not exist");
        return claims[claimId];
    }
    
    /**
     * @dev Get the current claim counter
     */
    function getClaimCount() external view returns (uint256) {
        return claimCounter;
    }
    
    /**
     * @dev Internal function to validate status transitions
     */
    function _isValidStatusTransition(
        ClaimStatus oldStatus,
        ClaimStatus newStatus
    ) internal pure returns (bool) {
        // Pending -> UnderReview, Rejected
        if (oldStatus == ClaimStatus.Pending) {
            return newStatus == ClaimStatus.UnderReview || newStatus == ClaimStatus.Rejected;
        }
        // UnderReview -> Approved, Rejected
        if (oldStatus == ClaimStatus.UnderReview) {
            return newStatus == ClaimStatus.Approved || newStatus == ClaimStatus.Rejected;
        }
        // Approved -> Paid
        if (oldStatus == ClaimStatus.Approved) {
            return newStatus == ClaimStatus.Paid;
        }
        // Rejected and Paid are terminal states
        return false;
    }
}
