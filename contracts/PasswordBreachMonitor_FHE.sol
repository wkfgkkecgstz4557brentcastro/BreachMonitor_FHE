// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PasswordBreachMonitor_FHE is SepoliaConfig {
    struct EncryptedPassword {
        uint256 userId;
        euint32 encryptedHashPart1;
        euint32 encryptedHashPart2;
        euint32 encryptedHashPart3;
        uint256 timestamp;
        address userAddress;
    }

    struct BreachRecord {
        euint32 encryptedHashPart1;
        euint32 encryptedHashPart2;
        euint32 encryptedHashPart3;
    }

    struct MatchResult {
        euint32 encryptedMatchScore;
        ebool encryptedIsBreached;
    }

    uint256 public userCount;
    mapping(uint256 => EncryptedPassword) public encryptedPasswords;
    mapping(uint256 => BreachRecord[]) public breachDatabase;
    mapping(uint256 => MatchResult[]) public matchResults;

    mapping(uint256 => uint256) private requestToUserId;
    
    event PasswordSubmitted(uint256 indexed userId, address indexed userAddress, uint256 timestamp);
    event BreachCheckCompleted(uint256 indexed userId, uint256 matchesFound);
    event PasswordDecrypted(uint256 indexed userId);

    function registerUser(address userAddress) public returns (uint256) {
        userCount += 1;
        return userCount;
    }

    function submitEncryptedPassword(
        euint32 encryptedHashPart1,
        euint32 encryptedHashPart2,
        euint32 encryptedHashPart3,
        address userAddress
    ) public {
        uint256 userId = registerUser(userAddress);
        
        encryptedPasswords[userId] = EncryptedPassword({
            userId: userId,
            encryptedHashPart1: encryptedHashPart1,
            encryptedHashPart2: encryptedHashPart2,
            encryptedHashPart3: encryptedHashPart3,
            timestamp: block.timestamp,
            userAddress: userAddress
        });

        checkAgainstBreachDatabase(userId);
        emit PasswordSubmitted(userId, userAddress, block.timestamp);
    }

    function addToBreachDatabase(
        euint32 encryptedHashPart1,
        euint32 encryptedHashPart2,
        euint32 encryptedHashPart3
    ) public {
        uint256 breachId = breachDatabase[0].length;
        breachDatabase[0].push(BreachRecord({
            encryptedHashPart1: encryptedHashPart1,
            encryptedHashPart2: encryptedHashPart2,
            encryptedHashPart3: encryptedHashPart3
        }));
    }

    function checkAgainstBreachDatabase(uint256 userId) private {
        EncryptedPassword storage password = encryptedPasswords[userId];
        BreachRecord[] storage breaches = breachDatabase[0];
        
        for (uint i = 0; i < breaches.length; i++) {
            ebool part1Match = FHE.eq(password.encryptedHashPart1, breaches[i].encryptedHashPart1);
            ebool part2Match = FHE.eq(password.encryptedHashPart2, breaches[i].encryptedHashPart2);
            ebool part3Match = FHE.eq(password.encryptedHashPart3, breaches[i].encryptedHashPart3);
            
            ebool fullMatch = FHE.and(FHE.and(part1Match, part2Match), part3Match);
            
            matchResults[userId].push(MatchResult({
                encryptedMatchScore: FHE.select(
                    fullMatch,
                    FHE.asEuint32(100),
                    FHE.asEuint32(0)
                ),
                encryptedIsBreached: fullMatch
            }));
        }

        emit BreachCheckCompleted(userId, breaches.length);
    }

    function requestPasswordDecryption(uint256 userId) public {
        require(msg.sender == encryptedPasswords[userId].userAddress, "Not password owner");
        
        EncryptedPassword storage password = encryptedPasswords[userId];
        
        bytes32[] memory ciphertexts = new bytes32[](3);
        ciphertexts[0] = FHE.toBytes32(password.encryptedHashPart1);
        ciphertexts[1] = FHE.toBytes32(password.encryptedHashPart2);
        ciphertexts[2] = FHE.toBytes32(password.encryptedHashPart3);
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptPassword.selector);
        requestToUserId[reqId] = userId;
    }

    function decryptPassword(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 userId = requestToUserId[requestId];
        require(userId != 0, "Invalid request");

        FHE.checkSignatures(requestId, cleartexts, proof);
        (uint32 part1, uint32 part2, uint32 part3) = abi.decode(cleartexts, (uint32, uint32, uint32));
        // Process decrypted password parts as needed

        emit PasswordDecrypted(userId);
    }

    function requestMatchResultsDecryption(uint256 userId) public {
        require(msg.sender == encryptedPasswords[userId].userAddress, "Not password owner");
        
        MatchResult[] storage results = matchResults[userId];
        bytes32[] memory ciphertexts = new bytes32[](results.length * 2);
        
        for (uint i = 0; i < results.length; i++) {
            ciphertexts[i*2] = FHE.toBytes32(results[i].encryptedMatchScore);
            ciphertexts[i*2+1] = FHE.toBytes32(results[i].encryptedIsBreached);
        }
        
        FHE.requestDecryption(ciphertexts, this.decryptMatchResults.selector);
    }

    function decryptMatchResults(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        FHE.checkSignatures(requestId, cleartexts, proof);
        // Process decrypted match results as needed
    }

    function getBreachCount() public view returns (uint256) {
        return breachDatabase[0].length;
    }
}