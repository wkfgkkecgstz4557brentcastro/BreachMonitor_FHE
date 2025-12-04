# BreachMonitor_FHE

**BreachMonitor_FHE** is a privacy-preserving browser extension designed to detect password breaches **without ever revealing the user’s credentials**. By leveraging **Fully Homomorphic Encryption (FHE)**, the extension allows encrypted password hashes to be securely matched against an encrypted breach database — ensuring that neither the server nor the extension ever sees the user’s password or its hash in plaintext.

---

## Overview

Every year, billions of passwords are leaked through data breaches, putting users’ accounts and personal information at risk. Traditional breach-checking services rely on either:

- Sending partial password hashes to centralized servers, or  
- Maintaining local breach datasets for offline checking  

Both methods carry privacy and security risks. In the first, partial hashes can still be traced or correlated; in the second, users must constantly download large datasets.

**BreachMonitor_FHE** reimagines this process by performing **real-time encrypted breach detection** directly in the browser — powered entirely by **FHE computation**.

---

## Motivation

Most password checkers work by comparing a user’s password hash to known breach datasets. But even a hashed password reveals partial patterns that can be exploited. Users must choose between:

- Privacy: keeping passwords hidden, or  
- Security: verifying against known breaches  

With **FHE**, we no longer have to choose.  
The system performs breach checks **on encrypted hashes**, ensuring total privacy while still offering up-to-date breach alerts.

This approach eliminates the need for any trust in the server or the extension provider — the computation itself is mathematically confidential.

---

## Key Features

### 1. Encrypted Hash Comparison
- Uses Fully Homomorphic Encryption to perform equality checks between encrypted password hashes and encrypted breach datasets.  
- No entity ever accesses plaintext passwords, hashes, or breach entries.  
- All computations happen on ciphertexts in the FHE domain.  

### 2. Real-Time Breach Detection
- Instant analysis during password input or account creation.  
- Secure query execution against a continuously updated encrypted dataset.  
- Results are returned as encrypted responses and decrypted locally on the user’s device.  

### 3. User Privacy by Design
- Passwords are encrypted before they ever leave the browser.  
- No raw identifiers, telemetry, or user data are stored.  
- Anonymous breach-checking: the server cannot associate queries with user identities.  

### 4. Local Key Management
- FHE keys are generated and stored locally within the browser.  
- Users control their own encryption context — no central authority handles decryption.  

### 5. Visual Alerts and Recommendations
- Real-time notifications when a password is found in the encrypted breach index.  
- Contextual guidance for users to strengthen their credentials or rotate compromised passwords.  

---

## Why FHE Matters

In conventional systems, even hashed data comparisons require at least one party to access or partially reveal information.  
FHE solves this by enabling computations on **encrypted data directly** — so that:

- The **client encrypts the password hash**,  
- The **server holds an encrypted breach dataset**, and  
- The **comparison occurs homomorphically** — no decryption during processing.  

This ensures:
- **Zero data exposure** for users and servers alike  
- **Mathematical confidentiality** enforced by cryptography, not trust  
- **Compliance readiness** with emerging privacy regulations  

By bringing FHE to consumer browsers, BreachMonitor_FHE demonstrates how advanced encryption can enhance usability and trust in everyday digital security tools.

---

## Architecture

### High-Level Components

1. **Browser Extension**
   - Captures user-entered passwords or hashes securely  
   - Encrypts password hashes using FHE public keys  
   - Handles local decryption of homomorphic results  
   - Displays non-intrusive breach alerts  

2. **Encrypted Breach Server**
   - Hosts a breach database encrypted under FHE context  
   - Receives encrypted password hashes from the client  
   - Performs homomorphic equality checks and returns encrypted responses  

3. **FHE Computation Layer**
   - Implements homomorphic equality circuits optimized for hash comparison  
   - Supports modular batching and ciphertext packing for performance  
   - Ensures zero plaintext processing throughout the pipeline  

4. **Key Management**
   - Users hold private FHE keys locally in secure storage  
   - Public keys are distributed for encryption of queries  
   - Server never gains access to private keys or decrypted values  

---

## Workflow

1. **Password Entry**  
   User types a password in a website login or signup field.  

2. **Client-Side Encryption**  
   The extension computes a password hash, encrypts it using the local FHE public key, and sends it to the encrypted breach server.  

3. **Encrypted Comparison**  
   The server compares the encrypted hash to its encrypted breach database homomorphically — without decrypting any data.  

4. **Encrypted Result Return**  
   The server sends back an encrypted “match/no match” flag.  

5. **Local Decryption & Alert**  
   The browser extension decrypts the flag and notifies the user if the password is compromised — without revealing any sensitive information.  

---

## Technical Highlights

### Homomorphic Hash Matching
- Implemented with polynomial ring-based encryption schemes supporting equality operations.  
- Uses optimized ciphertext packing to enable batch comparison against thousands of entries simultaneously.  

### Performance Optimization
- Lightweight encryption parameters adapted for client-side execution.  
- Incremental dataset loading and local caching of encrypted segments.  
- Multi-threaded equality testing for improved response time.  

### Cross-Browser Support
- Compatible with Chromium, Firefox, and Edge architectures.  
- Integrates seamlessly into native password fields without disrupting UX.  

---

## Security Design

- **Zero Knowledge of Passwords**:  
  The system ensures that no plaintext password or hash ever leaves the browser.  

- **Encrypted Dataset Hosting**:  
  Even the breach database is encrypted, preventing data leaks even in case of server compromise.  

- **Homomorphic Computation Logs**:  
  Each computation is verifiable and reproducible without exposing input data.  

- **Tamper-Resistant Key Store**:  
  Private keys are stored using browser-native secure storage APIs.  

- **No Network Identifiers**:  
  Queries are anonymized, and no identifying metadata is transmitted.  

---

## Privacy Advantages

| Traditional Checkers | BreachMonitor_FHE |
|----------------------|-------------------|
| Partial hash exposure | Full encryption end-to-end |
| Server can link queries | Server learns nothing |
| Requires user trust | Trust replaced by cryptography |
| Potential correlation leaks | Zero-knowledge matching |

BreachMonitor_FHE achieves **absolute confidentiality** — even against the breach service itself.

---

## Roadmap

1. **Phase 1 – Prototype Validation**  
   - FHE equality check circuits for hashed data  
   - Local key management proof-of-concept  

2. **Phase 2 – Browser Integration**  
   - Extension APIs for password field interception and secure processing  
   - UI/UX for real-time breach alerts  

3. **Phase 3 – Dataset Scaling**  
   - Sharded encrypted breach indexes  
   - Batch encrypted search optimization  

4. **Phase 4 – Post-Quantum Readiness**  
   - Integration of quantum-safe encryption schemes for long-term resilience  

5. **Phase 5 – Offline Mode**  
   - Optional encrypted local cache for rapid checking during offline sessions  

---

## Ethical Impact

By protecting password integrity without exposing data, this project advances the broader goal of **user sovereignty over digital identity**.  
It prevents the paradox where checking for breaches introduces new privacy risks.  
Instead, users gain the ability to **verify their own security privately**, through cryptography they control.

---

## Conclusion

**BreachMonitor_FHE** represents a new generation of password breach detection — one that merges **security and privacy** instead of compromising one for the other.  
Through **Fully Homomorphic Encryption**, it delivers the power of real-time breach monitoring with the assurance of complete confidentiality.

In a world where trust can no longer be assumed, BreachMonitor_FHE ensures that your password privacy remains mathematically unbreakable — even during a breach check itself.
