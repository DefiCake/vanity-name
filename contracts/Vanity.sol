// SPDX-License-Identifier: MIT

pragma solidity 0.8;

import '@openzeppelin/contracts/access/Ownable.sol';
import './StringUtils.sol';

contract Vanity is Ownable {
    using StringUtils for string;

    /// @dev: notice that the owner field is used for both reservation and registrations
    /// To actually derive ownership over a name, call ownerOf() function
    struct Record {
        address owner;
        uint256 lockedBalance;
        uint256 reservationTimestamp;
        uint256 registrationTimestamp;
    }

    uint256 internal constant precision = 1e18;

    uint256 internal feePerCharacter;
    uint256 internal reservationPeriodSeconds;
    uint256 internal secondsOfRegistrationPerGwei;

    mapping(bytes32 => Record) public records;
    mapping(address => uint256) public unlockedBalances;
    uint256 public collectedFees;

    /// @notice contract left without events on purpose
    constructor(uint256 _reservationPeriodSeconds, uint256 _secondsOfRegistrationPerGwei) {
        reservationPeriodSeconds = _reservationPeriodSeconds;
        secondsOfRegistrationPerGwei = _secondsOfRegistrationPerGwei;
    }

    /////////////////////////////////////////////////////////
    //  USER FUNCTIONS
    /////////////////////////////////////////////////////////

    function reserve(bytes32 hash) external payable {
        require(records[hash].registrationTimestamp < block.timestamp, 'Name already registered');
        require(records[hash].reservationTimestamp < block.timestamp, 'Name already reserved');

        address currentOwner = records[hash].owner;
        if (currentOwner != address(0)) _releaseLockedBalance(hash, currentOwner);

        records[hash].owner = msg.sender;
        records[hash].reservationTimestamp = block.timestamp + reservationPeriodSeconds;
    }

    function register(string calldata name) external payable {
        bytes32 hash = keccak256(abi.encodePacked(name));
        require(records[hash].owner == msg.sender, 'Name not reserved by the calling address');
        require(block.timestamp < records[hash].reservationTimestamp, 'Name already registered');
        require(block.timestamp >= records[hash].registrationTimestamp, 'Name cannot be registered twice');
        uint256 lockedValue = msg.value - (msg.value * feePerCharacter * name.strlen()) / precision;
        collectedFees += msg.value - lockedValue;

        records[hash].owner = msg.sender;
        records[hash].registrationTimestamp = block.timestamp + (lockedValue / (1 gwei)) * secondsOfRegistrationPerGwei;
        records[hash].lockedBalance = lockedValue;
    }

    function claimLockedBalance(bytes32 hash) external {
        require(records[hash].owner == msg.sender, 'Caller is not owner of this record');
        require(block.timestamp >= records[hash].registrationTimestamp, 'Registration is still on');

        _releaseLockedBalance(hash, msg.sender);
        records[hash].owner = address(0);
    }

    function withdrawBalance() external {
        (bool success, ) = payable(msg.sender).call{ value: unlockedBalances[msg.sender] }('');
        require(success);
    }

    /////////////////////////////////////////////////////////
    //  ADMIN FUNCTIONS
    /////////////////////////////////////////////////////////

    function setFeePerCharacter(uint256 _wei) external onlyOwner {
        feePerCharacter = _wei;
    }

    function setReservationPeriodSeconds(uint256 _period) external onlyOwner {
        reservationPeriodSeconds = _period;
    }

    function setSecondsOfRegistrationPerGwei(uint256 _secondsOfRegistrationPerGwei) external onlyOwner {
        secondsOfRegistrationPerGwei = _secondsOfRegistrationPerGwei;
    }

    function collectFees() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{ value: collectedFees }('');
        require(success);
    }

    /////////////////////////////////////////////////////////
    //  VIEW FUNCTIONS
    /////////////////////////////////////////////////////////

    function ownerOf(string calldata name) public view returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(name));

        if (records[hash].registrationTimestamp <= block.timestamp) return address(0);

        return records[hash].owner;
    }

    function getConfig()
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (feePerCharacter, reservationPeriodSeconds, secondsOfRegistrationPerGwei);
    }

    /////////////////////////////////////////////////////////
    //  INTERNAL FUNCTIONS
    /////////////////////////////////////////////////////////

    function _releaseLockedBalance(bytes32 hash, address to) internal {
        unlockedBalances[to] += records[hash].lockedBalance;
        records[hash].lockedBalance = 0;
    }
}
