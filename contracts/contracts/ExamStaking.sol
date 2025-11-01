// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import "./VerifierRegistry.sol";
import "./StudentRegistry.sol";

contract ExamStaking is Ownable, ReentrancyGuard, Pausable {
    VerifierRegistry public immutable verifierRegistry;
    StudentRegistry public immutable studentRegistry;

    struct Exam {
        address verifier;
        uint64 stakeDeadline;
        bool finalized;
        bool canceled;
        address[] candidates;
        mapping(address => uint256) totalOnCandidate;           
        uint256 totalStake;    
        mapping(address => mapping(address => uint256)) stakeOf; 
        mapping(address => bool) isWinner;                    
        mapping(address => bool) hasClaimed;                     
        uint16 feeBps;
        uint256 protocolFee;
        mapping(address => uint256) actualScores;               // Actual scores after grading
        mapping(address => uint256) predictedScores;            // Predicted scores before exam
    }

    struct AutoClaimConfig {
        bool enabled;
        uint256 lastClaimTime;
    }

    mapping(bytes32 => Exam) private exams; // examId → Exam
    mapping(address => AutoClaimConfig) public autoClaimSettings;
    mapping(address => bytes32[]) private userExams; // Track exams user participated in

    event ExamCreated(bytes32 indexed examId, address verifier, uint64 stakeDeadline, uint16 feeBps);
    event ExamCanceled(bytes32 indexed examId);
    event Staked(bytes32 indexed examId, address indexed staker, address indexed candidate, uint256 amount, uint256 predictedScore);
    event ExamFinalized(bytes32 indexed examId, address[] winners);
    event Claimed(bytes32 indexed examId, address indexed staker, uint256 payout);
    event FeesWithdrawn(bytes32 indexed examId, address indexed to, uint256 amount);
    event AutoClaimEnabled(address indexed user);
    event AutoClaimDisabled(address indexed user);
    event AutoClaimed(address indexed user, bytes32[] examIds, uint256 totalAmount, uint256 timestamp, string claimedVia);

    constructor(
        address _verifierRegistry,
        address _studentRegistry
    ) Ownable(msg.sender) {
        require(_verifierRegistry != address(0), "Invalid verifier registry");
        require(_studentRegistry != address(0), "Invalid student registry");

        verifierRegistry = VerifierRegistry(_verifierRegistry);
        studentRegistry = StudentRegistry(_studentRegistry);
    }

    /// @notice Allow contract to receive FLOW
    receive() external payable {
        // Allow contract to receive FLOW for any manual transfers
    }


    function createExam(
        bytes32 examId,
        address verifier,
        address[] calldata candidates,
        uint64 stakeDeadline,
        uint16 feeBps
    ) external onlyOwner {
        require(verifierRegistry.isVerifier(verifier), "Not authorized verifier");
        require(candidates.length > 0, "No candidates");
        require(feeBps <= 10_000, "feeBps > 100%");
        Exam storage e = exams[examId];
        require(e.verifier == address(0), "Exam exists");

        e.verifier = verifier;
        e.stakeDeadline = stakeDeadline;
        e.feeBps = feeBps;

        for (uint256 i = 0; i < candidates.length; i++) {
            require(studentRegistry.isRegistered(candidates[i]), "Invalid student");
            e.candidates.push(candidates[i]);
        }

        emit ExamCreated(examId, verifier, stakeDeadline, feeBps);
    }

    function cancelExam(bytes32 examId) external onlyOwner {
        Exam storage e = exams[examId];
        require(e.verifier != address(0), "Exam not found");
        require(!e.finalized, "Already finalized");
        require(!e.canceled, "Already canceled");
        e.canceled = true;
        emit ExamCanceled(examId);
    }

    /// @notice Refund stakes for a canceled exam
    function refund(bytes32 examId, address candidate) external nonReentrant {
        Exam storage e = exams[examId];
        require(e.canceled, "Exam not canceled");
        require(!e.hasClaimed[msg.sender], "Already refunded");
        
        uint256 stakeAmount = e.stakeOf[msg.sender][candidate];
        require(stakeAmount > 0, "No stake to refund");
        
        e.hasClaimed[msg.sender] = true;
        e.stakeOf[msg.sender][candidate] = 0;
        e.totalOnCandidate[candidate] -= stakeAmount;
        e.totalStake -= stakeAmount;
        
        (bool success, ) = payable(msg.sender).call{value: stakeAmount}("");
        require(success, "Transfer failed");
        emit Claimed(examId, msg.sender, stakeAmount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice withdraw protocol fees accumulated for a specific exam
    function withdrawFees(bytes32 examId, address to) external onlyOwner nonReentrant {
        require(to != address(0), "bad to");
        Exam storage e = exams[examId];
        uint256 amt = e.protocolFee;
        require(amt > 0, "no fees");
        e.protocolFee = 0;
        (bool success, ) = payable(to).call{value: amt}("");
        require(success, "Transfer failed");
        emit FeesWithdrawn(examId, to, amt);
    }


    function stake(bytes32 examId, address candidate, uint256 predictedScore)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Exam storage e = exams[examId];
        require(e.verifier != address(0), "Exam not found");
        require(!e.canceled && !e.finalized, "Exam closed");
        require(block.timestamp < e.stakeDeadline, "Staking closed");
        require(studentRegistry.isRegistered(msg.sender), "Not student");
        require(_isCandidate(e, candidate), "Invalid candidate");
        require(msg.value > 0, "Must send FLOW");
        require(predictedScore <= 100, "Invalid predicted score");

        // Store predicted score for the candidate (only if staking on themselves)
        if (msg.sender == candidate) {
            e.predictedScores[candidate] = predictedScore;
        }

        uint256 amount = msg.value;
        e.totalStake += amount;
        e.totalOnCandidate[candidate] += amount;
        e.stakeOf[msg.sender][candidate] += amount;

        // Track user participation for auto-compound
        _trackUserExam(msg.sender, examId);

        emit Staked(examId, msg.sender, candidate, amount, predictedScore);
    }

    /// @notice Finalize results manually (deprecated - use setStudentScores + distributeRewards instead)
    function finalizeExam(bytes32 examId, address[] calldata winners)
        external
        nonReentrant
    {
        Exam storage e = exams[examId];
        require(e.verifier != address(0), "Exam not found");
        require(msg.sender == e.verifier, "Not verifier");
        require(!e.finalized && !e.canceled, "Closed");
        require(block.timestamp >= e.stakeDeadline, "Too early");

        for (uint256 i = 0; i < winners.length; i++) {
            require(_isCandidate(e, winners[i]), "Bad winner");
            e.isWinner[winners[i]] = true;
        }

        e.finalized = true;
        emit ExamFinalized(examId, winners);
    }

    /// @notice Claim payout after finalization with proportional reward distribution
    function claim(bytes32 examId) external nonReentrant {
        Exam storage e = exams[examId];
        require(e.finalized, "Not finalized");
        require(!e.canceled, "Exam canceled");
        require(!e.hasClaimed[msg.sender], "Already claimed");

        e.hasClaimed[msg.sender] = true;

        uint256 userStake = _getTotalUserStake(e, msg.sender);
        require(userStake > 0, "No stake to claim");

        address[] memory winners = _getWinners(e);
        
        // If no winners, all stakes already sent to staked bank in distributeRewards
        if (winners.length == 0) {
            revert("No winners - stakes sent to staked bank");
        }
        
        // Check if user has any winning stakes (staked on winning candidates)
        uint256 userWinnerStake = _getUserWinnerStake(e, msg.sender);
        
        if (userWinnerStake == 0) {
            revert("User is not a winner");
        }

        // Calculate user's proportional reward
        (uint256 totalWinnerStake, uint256 totalLoserStake) = _calculateStakeTotals(e);
        
        uint256 finalAmount;
        if (totalLoserStake == 0) {
            // Everyone won - just return original stake
            finalAmount = userWinnerStake;
        } else {
            // Proportional distribution: finalAmount = winnerStake + reward_share
            uint256 rewardShare = (userWinnerStake * totalLoserStake) / totalWinnerStake;
            finalAmount = userWinnerStake + rewardShare;
        }

        (bool success, ) = payable(msg.sender).call{value: finalAmount}("");
        require(success, "Transfer failed");
        emit Claimed(examId, msg.sender, finalAmount);
    }

    /// @notice Get total stake amount for a user across all candidates in an exam
    function _getTotalUserStake(Exam storage e, address user) internal view returns (uint256 total) {
        for (uint256 i = 0; i < e.candidates.length; i++) {
            total += e.stakeOf[user][e.candidates[i]];
        }
    }

    /// @notice Set student scores and determine winners based on prediction accuracy
    function setStudentScores(bytes32 examId, address[] calldata students, uint256[] calldata scores) external {
        Exam storage e = exams[examId];
        require(verifierRegistry.isVerifier(msg.sender), "Not authorized verifier");
        require(!e.finalized, "Already finalized");
        require(students.length == scores.length, "Array length mismatch");
        
        // Set actual scores and determine winners based on prediction accuracy
        for (uint256 i = 0; i < students.length; i++) {
            e.actualScores[students[i]] = scores[i];
            uint256 predictedScore = e.predictedScores[students[i]];
            
            // Win condition: actual score >= predicted score
            if (scores[i] >= predictedScore) {
                e.isWinner[students[i]] = true;
            }
        }
    }

    /// @notice Distribute rewards using proportional redistribution logic
    function distributeRewards(bytes32 examId) external {
        Exam storage e = exams[examId];
        require(verifierRegistry.isVerifier(msg.sender), "Not authorized verifier");
        require(!e.finalized, "Already finalized");
        
        address[] memory winners = _getWinners(e);
        address stakedBank = 0x6D41680267986408E5e7c175Ee0622cA931859A4;
        
        // If nobody wins, send entire pool to staked bank
        if (winners.length == 0) {
            uint256 totalAmount = e.totalStake;
            if (totalAmount > 0) {
                (bool success, ) = payable(stakedBank).call{value: totalAmount}("");
                require(success, "Transfer failed");
            }
            e.finalized = true;
            emit ExamFinalized(examId, winners);
            return;
        }
        
        // Calculate protocol fee on total stake
        uint256 protocolFee = (e.totalStake * e.feeBps) / 10_000;
        e.protocolFee += protocolFee;
        
        // If everyone wins, no redistribution - winners can claim their original stakes
        if (winners.length == e.candidates.length) {
            e.finalized = true;
            emit ExamFinalized(examId, winners);
            return;
        }
        
        // Mixed results: Winners get proportional share of losers' stakes
        // The actual redistribution math is handled in the claim() function
        // Here we just finalize the exam to enable claiming
        e.finalized = true;
        emit ExamFinalized(examId, winners);
    }

    /// @notice Get student actual score for an exam
    function getStudentScore(bytes32 examId, address student) external view returns (uint256) {
        return exams[examId].actualScores[student];
    }
    
    /// @notice Get student predicted score for an exam
    function getPredictedScore(bytes32 examId, address student) external view returns (uint256) {
        return exams[examId].predictedScores[student];
    }

    /// @notice Check if staking is still open for an exam
    function isStakingOpen(bytes32 examId) external view returns (bool) {
        Exam storage e = exams[examId];
        return !e.finalized && !e.canceled && block.timestamp < e.stakeDeadline;
    }

    function getExam(
        bytes32 examId
    )
        external
        view
        returns (
            address verifier,
            uint64 stakeDeadline,
            bool finalized,
            bool canceled,
            uint16 feeBps,
            uint256 totalStake,
            uint256 protocolFee,
            address[] memory candidates
        )
    {
        Exam storage e = exams[examId];
        require(e.verifier != address(0), "Exam not found");
        verifier = e.verifier;
        stakeDeadline = e.stakeDeadline;
        finalized = e.finalized;
        canceled = e.canceled;
        feeBps = e.feeBps;
        totalStake = e.totalStake;
        protocolFee = e.protocolFee;
        candidates = e.candidates;
    }

    function totalOn(bytes32 examId, address candidate) external view returns (uint256) {
        Exam storage e = exams[examId];
        return e.totalOnCandidate[candidate];
    }

    function stakeOf(bytes32 examId, address staker, address candidate) external view returns (uint256) {
        Exam storage e = exams[examId];
        return e.stakeOf[staker][candidate];
    }

    function hasClaimed(bytes32 examId, address staker) external view returns (bool) {
        Exam storage e = exams[examId];
        return e.hasClaimed[staker];
    }

    function isWinner(bytes32 examId, address candidate) external view returns (bool) {
        Exam storage e = exams[examId];
        return e.isWinner[candidate];
    }


    function _isCandidate(Exam storage e, address cand) internal view returns (bool) {
        for (uint256 i = 0; i < e.candidates.length; i++) {
            if (e.candidates[i] == cand) return true;
        }
        return false;
    }

    function _winnerTotals(Exam storage e, address staker)
        internal
        view
        returns (uint256 winnersTotal, uint256 userOnWinners)
    {
        for (uint256 i = 0; i < e.candidates.length; i++) {
            address c = e.candidates[i];
            if (e.isWinner[c]) {
                winnersTotal += e.totalOnCandidate[c];
                userOnWinners += e.stakeOf[staker][c];
            }
        }
    }

    function _calculateStakeTotals(Exam storage e) internal view returns (uint256 winnersTotal, uint256 losersTotal) {
        for (uint256 i = 0; i < e.candidates.length; i++) {
            address c = e.candidates[i];
            if (e.isWinner[c]) {
                winnersTotal += e.totalOnCandidate[c];
            } else {
                losersTotal += e.totalOnCandidate[c];
            }
        }
    }
    
    function _getUserWinnerStake(Exam storage e, address user) internal view returns (uint256 userWinnerStake) {
        for (uint256 i = 0; i < e.candidates.length; i++) {
            address c = e.candidates[i];
            if (e.isWinner[c]) {
                userWinnerStake += e.stakeOf[user][c];
            }
        }
    }

    function _getWinners(Exam storage e) internal view returns (address[] memory) {
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < e.candidates.length; i++) {
            if (e.isWinner[e.candidates[i]]) {
                winnerCount++;
            }
        }
        
        address[] memory winners = new address[](winnerCount);
        uint256 index = 0;
        for (uint256 i = 0; i < e.candidates.length; i++) {
            if (e.isWinner[e.candidates[i]]) {
                winners[index] = e.candidates[i];
                index++;
            }
        }
        return winners;
    }

    // ========================================
    // HELPER FUNCTIONS - PENDING REWARDS
    // ========================================

    /// @notice Get total pending (unclaimed) rewards for a user across all exams
    /// @param user Address to check
    /// @return total Total pending rewards in wei
    function getPendingRewards(address user) public view returns (uint256 total) {
        bytes32[] memory examIds = userExams[user];
        
        for (uint256 i = 0; i < examIds.length; i++) {
            Exam storage e = exams[examIds[i]];
            
            // Only count finalized exams that user hasn't claimed
            if (!e.finalized || e.hasClaimed[user] || e.canceled) {
                continue;
            }
            
            // Check if user has winning stakes
            uint256 userWinnerStake = _getUserWinnerStake(e, user);
            if (userWinnerStake == 0) {
                continue;
            }
            
            // Calculate claimable amount
            (uint256 totalWinnerStake, uint256 totalLoserStake) = _calculateStakeTotals(e);
            
            uint256 finalAmount;
            if (totalLoserStake == 0) {
                finalAmount = userWinnerStake;
            } else {
                uint256 rewardShare = (userWinnerStake * totalLoserStake) / totalWinnerStake;
                finalAmount = userWinnerStake + rewardShare;
            }
            
            total += finalAmount;
        }
        
        return total;
    }

    /// @notice Internal function to track user participation in exams
    function _trackUserExam(address user, bytes32 examId) internal {
        // Check if already tracked
        bytes32[] storage userExamList = userExams[user];
        for (uint256 i = 0; i < userExamList.length; i++) {
            if (userExamList[i] == examId) {
                return; // Already tracked
            }
        }
        userExamList.push(examId);
    }

    // ========================================
    // AUTO-CLAIM FUNCTIONS (FORTE ACTIONS)
    // ========================================

    /// @notice Enable auto-claim for the caller (claims all winnings automatically via Forte)
    function enableAutoClaim() external {
        autoClaimSettings[msg.sender] = AutoClaimConfig({
            enabled: true,
            lastClaimTime: block.timestamp
        });
        
        emit AutoClaimEnabled(msg.sender);
    }

    /// @notice Disable auto-claim for the caller
    function disableAutoClaim() external {
        autoClaimSettings[msg.sender].enabled = false;
        emit AutoClaimDisabled(msg.sender);
    }

    /// @notice Check if user has auto-claim enabled and has pending claims
    /// @param user Address to check
    /// @return hasPending Whether user has pending claims to auto-claim
    function canAutoClaim(address user) public view returns (bool hasPending) {
        AutoClaimConfig memory config = autoClaimSettings[user];
        if (!config.enabled) return false;
        
        // Check if user has any unclaimed winnings
        uint256 pending = getPendingRewards(user);
        return pending > 0;
    }

    /// @notice Execute auto-claim for a user (called by Forte Actions or anyone)
    /// @param user Address to auto-claim for
    /// @dev This function can be called by anyone (Forte scheduler or keeper network)
    function executeAutoClaim(address user) external nonReentrant {
        require(autoClaimSettings[user].enabled, "Auto-claim not enabled");
        
        bytes32[] memory examIds = userExams[user];
        bytes32[] memory claimedExamIds = new bytes32[](examIds.length);
        uint256 claimedCount = 0;
        uint256 totalClaimed = 0;

        // Claim all available winnings
        for (uint256 i = 0; i < examIds.length; i++) {
            Exam storage e = exams[examIds[i]];
            
            // Skip if already claimed, not finalized, or canceled
            if (e.hasClaimed[user] || !e.finalized || e.canceled) {
                continue;
            }

            // Check if user has winning stakes
            uint256 userWinnerStake = _getUserWinnerStake(e, user);
            if (userWinnerStake == 0) {
                continue;
            }

            // Calculate claimable amount
            (uint256 totalWinnerStake, uint256 totalLoserStake) = _calculateStakeTotals(e);
            
            uint256 payout;
            if (totalLoserStake == 0) {
                // Everyone won - just return original stake
                payout = userWinnerStake;
            } else {
                // Normal case: distribute loser stakes proportionally among winners
                uint256 totalReward = totalLoserStake + totalWinnerStake - e.protocolFee;
                payout = (totalReward * userWinnerStake) / totalWinnerStake;
            }

            if (payout > 0) {
                e.hasClaimed[user] = true;
                totalClaimed += payout;
                claimedExamIds[claimedCount] = examIds[i];
                claimedCount++;

                emit Claimed(examIds[i], user, payout);
            }
        }

        require(totalClaimed > 0, "Nothing to claim");

        // Update last claim time
        autoClaimSettings[user].lastClaimTime = block.timestamp;

        // Transfer total claimed amount
        (bool success, ) = payable(user).call{value: totalClaimed}("");
        require(success, "Transfer failed");

        // Emit auto-claim event with "Claimed via Flow Forte" message
        bytes32[] memory finalClaimedIds = new bytes32[](claimedCount);
        for (uint256 i = 0; i < claimedCount; i++) {
            finalClaimedIds[i] = claimedExamIds[i];
        }
        
        emit AutoClaimed(user, finalClaimedIds, totalClaimed, block.timestamp, "Claimed via Flow Forte");
    }

    /// @notice Get auto-claim settings for a user
    /// @param user Address to check
    /// @return enabled Whether auto-claim is enabled
    /// @return lastClaimTime Timestamp of last auto-claim
    function getAutoClaimSettings(address user) external view returns (
        bool enabled,
        uint256 lastClaimTime
    ) {
        AutoClaimConfig memory config = autoClaimSettings[user];
        return (config.enabled, config.lastClaimTime);
    }

    /// @notice Get list of claimable exam IDs for a user
    /// @param user Address to check
    /// @return claimableExams Array of exam IDs that user can claim
    function getClaimableExams(address user) external view returns (bytes32[] memory claimableExams) {
        bytes32[] memory examIds = userExams[user];
        uint256 claimableCount = 0;

        // First pass: count claimable exams
        for (uint256 i = 0; i < examIds.length; i++) {
            Exam storage e = exams[examIds[i]];
            
            if (!e.hasClaimed[user] && e.finalized && !e.canceled) {
                uint256 userWinnerStake = _getUserWinnerStake(e, user);
                if (userWinnerStake > 0) {
                    claimableCount++;
                }
            }
        }

        // Second pass: populate array
        claimableExams = new bytes32[](claimableCount);
        uint256 index = 0;
        for (uint256 i = 0; i < examIds.length; i++) {
            Exam storage e = exams[examIds[i]];
            
            if (!e.hasClaimed[user] && e.finalized && !e.canceled) {
                uint256 userWinnerStake = _getUserWinnerStake(e, user);
                if (userWinnerStake > 0) {
                    claimableExams[index] = examIds[i];
                    index++;
                }
            }
        }

        return claimableExams;
    }
}

