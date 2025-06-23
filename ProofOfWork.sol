// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title SepoMiner Proof-of-Work with On-chain Rewards
/// @notice Users submit a nonce that, when hashed with the last hash, meets the difficulty target.
///         If correct, they earn a configurable Sepolia ETH reward (contract must be pre-funded).
contract ProofOfWork is Ownable, ReentrancyGuard {
    using Address for address payable;

    uint256 public difficulty;
    bytes32 public lastHash;
    uint256 public rewardAmount = 0.0005 ether;

    event WorkSubmitted(address indexed miner, uint256 nonce, bytes32 hash, uint256 reward);
    event DifficultyChanged(uint256 oldDifficulty, uint256 newDifficulty);
    event RewardAmountChanged(uint256 oldAmount, uint256 newAmount);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    constructor(uint256 _initialDifficulty) {
        _setDifficulty(_initialDifficulty);
        lastHash = keccak256(abi.encodePacked(block.timestamp, msg.sender));
    }

    /// @notice Submit a nonce for PoW. If valid, emits WorkSubmitted and pays out reward.
    function submitWork(uint256 _nonce) external nonReentrant {
        bytes32 hash = keccak256(abi.encodePacked(lastHash, msg.sender, _nonce));
        require(uint256(hash) < type(uint256).max / difficulty, "ProofOfWork: invalid nonce");

        lastHash = hash;

        require(address(this).balance >= rewardAmount, "ProofOfWork: insufficient funds");
        payable(msg.sender).sendValue(rewardAmount);

        emit WorkSubmitted(msg.sender, _nonce, hash, rewardAmount);
    }

    /// @notice Owner can adjust the difficulty
    function setDifficulty(uint256 _newDifficulty) external onlyOwner {
        _setDifficulty(_newDifficulty);
    }

    /// @notice Owner can adjust the per-mine reward
    function setRewardAmount(uint256 _newReward) external onlyOwner {
        require(_newReward > 0, "ProofOfWork: reward must be > 0");
        uint256 old = rewardAmount;
        rewardAmount = _newReward;
        emit RewardAmountChanged(old, _newReward);
    }

    /// @notice Allows the contract to receive ETH for rewards
    receive() external payable {}

    /// @notice Emergency withdrawal by owner
    function emergencyWithdraw(address payable _to, uint256 _amount)
        external
        onlyOwner
        nonReentrant
    {
        require(_amount <= address(this).balance, "ProofOfWork: exceeds balance");
        _to.sendValue(_amount);
        emit EmergencyWithdrawal(_to, _amount);
    }

    /// @dev Internal helper to set difficulty
    function _setDifficulty(uint256 _diff) internal {
        require(_diff > 0, "ProofOfWork: difficulty > 0");
        uint256 old = difficulty;
        difficulty = _diff;
        emit DifficultyChanged(old, _diff);
    }
}
