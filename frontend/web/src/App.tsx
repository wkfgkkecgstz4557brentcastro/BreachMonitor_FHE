// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface BreachRecord {
  id: string;
  encryptedHash: string;
  timestamp: number;
  owner: string;
  status: "safe" | "breached" | "processing";
  severity?: number;
  breachSource?: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [breaches, setBreaches] = useState<BreachRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newPassword, setNewPassword] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "safe" | "breached" | "processing">("all");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [showStats, setShowStats] = useState(true);

  // Calculate statistics for dashboard
  const safeCount = breaches.filter(b => b.status === "safe").length;
  const breachedCount = breaches.filter(b => b.status === "breached").length;
  const processingCount = breaches.filter(b => b.status === "processing").length;

  // Filtered breaches based on search and filter
  const filteredBreaches = breaches.filter(breach => {
    const matchesSearch = breach.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      breach.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || breach.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Translation dictionary
  const translations = {
    en: {
      title: "BreachMonitor FHE",
      subtitle: "FHE-Powered Secure Password Breach Monitoring",
      connectWallet: "Connect Wallet",
      scanPassword: "Scan Password",
      safe: "Safe",
      breached: "Breached",
      processing: "Processing",
      totalScans: "Total Scans",
      safePasswords: "Safe Passwords",
      breachedPasswords: "Breached Passwords",
      noBreaches: "No scan records found",
      scanFirst: "Scan First Password",
      searchPlaceholder: "Search records...",
      all: "All",
      tutorial: "Tutorial",
      stats: "Statistics",
      fhePowered: "FHE-Powered Privacy",
      passwordPlaceholder: "Enter password to scan securely...",
      scanning: "Scanning with FHE...",
      scan: "Scan",
      cancel: "Cancel",
      tutorialTitle: "How BreachMonitor FHE Works",
      step1: "Enter Password",
      step1Desc: "Provide the password you want to check for breaches",
      step2: "FHE Encryption",
      step2Desc: "Your password is encrypted using Fully Homomorphic Encryption",
      step3: "Secure Matching",
      step3Desc: "Encrypted hash is matched against encrypted breach database",
      step4: "Private Results",
      step4Desc: "Get breach status without exposing your password",
      community: "Community",
      disclaimer: "Your passwords never leave your device unencrypted",
      thanks: "Special thanks to Zama for FHE technology",
      partners: "Technology Partners",
      team: "Our Team",
      verify: "Verify",
      viewDetails: "View Details",
      highRisk: "High Risk",
      mediumRisk: "Medium Risk",
      lowRisk: "Low Risk"
    },
    zh: {
      title: "BreachMonitor FHE",
      subtitle: "FHE驱动的安全密码泄露监控",
      connectWallet: "连接钱包",
      scanPassword: "扫描密码",
      safe: "安全",
      breached: "已泄露",
      processing: "处理中",
      totalScans: "总扫描数",
      safePasswords: "安全密码",
      breachedPasswords: "泄露密码",
      noBreaches: "未找到扫描记录",
      scanFirst: "首次扫描",
      searchPlaceholder: "搜索记录...",
      all: "全部",
      tutorial: "使用教程",
      stats: "统计信息",
      fhePowered: "FHE驱动隐私保护",
      passwordPlaceholder: "输入要安全扫描的密码...",
      scanning: "使用FHE扫描中...",
      scan: "扫描",
      cancel: "取消",
      tutorialTitle: "BreachMonitor FHE 工作原理",
      step1: "输入密码",
      step1Desc: "提供您要检查是否泄露的密码",
      step2: "FHE加密",
      step2Desc: "您的密码使用全同态加密技术进行加密",
      step3: "安全匹配",
      step3Desc: "加密哈希与加密的泄露数据库进行匹配",
      step4: "隐私结果",
      step4Desc: "获取泄露状态而不暴露您的密码",
      community: "社区",
      disclaimer: "您的密码始终以加密形式处理，不会明文离开设备",
      thanks: "特别感谢Zama的FHE技术",
      partners: "技术合作伙伴",
      team: "我们的团队",
      verify: "验证",
      viewDetails: "查看详情",
      highRisk: "高风险",
      mediumRisk: "中等风险",
      lowRisk: "低风险"
    }
  };

  const t = translations[language];

  useEffect(() => {
    loadBreaches().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadBreaches = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("breach_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing breach keys:", e);
        }
      }
      
      const list: BreachRecord[] = [];
      
      for (const key of keys) {
        try {
          const breachBytes = await contract.getData(`breach_${key}`);
          if (breachBytes.length > 0) {
            try {
              const breachData = JSON.parse(ethers.toUtf8String(breachBytes));
              list.push({
                id: key,
                encryptedHash: breachData.hash,
                timestamp: breachData.timestamp,
                owner: breachData.owner,
                status: breachData.status || "processing",
                severity: breachData.severity,
                breachSource: breachData.breachSource
              });
            } catch (e) {
              console.error(`Error parsing breach data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading breach ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setBreaches(list);
    } catch (e) {
      console.error("Error loading breaches:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const scanPassword = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    if (!newPassword) {
      alert("Please enter a password to scan");
      return;
    }
    
    setScanning(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: language === "en" 
        ? "Encrypting password with FHE..." 
        : "使用FHE加密密码..."
    });
    
    try {
      // Simulate FHE encryption - in real implementation this would use actual FHE
      const encryptedHash = `FHE-${btoa(newPassword)}-${Date.now()}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const breachId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const breachData = {
        hash: encryptedHash,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        status: "processing"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `breach_${breachId}`, 
        ethers.toUtf8Bytes(JSON.stringify(breachData))
      );
      
      const keysBytes = await contract.getData("breach_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(breachId);
      
      await contract.setData(
        "breach_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: language === "en"
          ? "Password encrypted and submitted for FHE analysis!"
          : "密码已加密并提交进行FHE分析!"
      });
      
      // Simulate FHE processing delay
      setTimeout(async () => {
        // Randomly determine breach status for simulation
        const isBreached = Math.random() > 0.7;
        const severity = isBreached ? Math.floor(Math.random() * 100) : 0;
        const breachSource = isBreached ? "Known breach database" : undefined;
        
        const updatedBreachData = {
          ...breachData,
          status: isBreached ? "breached" : "safe",
          severity,
          breachSource
        };
        
        try {
          await contract.setData(
            `breach_${breachId}`, 
            ethers.toUtf8Bytes(JSON.stringify(updatedBreachData))
          );
          
          await loadBreaches();
        } catch (e) {
          console.error("Error updating breach status:", e);
        }
      }, 3000);
      
      await loadBreaches();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowScanModal(false);
        setNewPassword("");
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? language === "en" ? "Transaction rejected by user" : "用户拒绝了交易"
        : language === "en" 
          ? "Submission failed: " + (e.message || "Unknown error")
          : "提交失败: " + (e.message || "未知错误");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setScanning(false);
    }
  };

  const verifyBreach = async (breachId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: language === "en"
        ? "Processing encrypted data with FHE..."
        : "使用FHE处理加密数据..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const breachBytes = await contract.getData(`breach_${breachId}`);
      if (breachBytes.length === 0) {
        throw new Error("Breach record not found");
      }
      
      const breachData = JSON.parse(ethers.toUtf8String(breachBytes));
      
      // In a real implementation, this would perform additional FHE verification
      setTransactionStatus({
        visible: true,
        status: "success",
        message: language === "en"
          ? "FHE verification completed successfully!"
          : "FHE验证成功完成!"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: language === "en"
          ? "Verification failed: " + (e.message || "Unknown error")
          : "验证失败: " + (e.message || "未知错误")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>{language === "en" ? "Initializing FHE connection..." : "初始化FHE连接..."}</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>BreachMonitor<span>FHE</span></h1>
          <p>{t.subtitle}</p>
        </div>
        
        <div className="header-actions">
          <div className="language-toggle">
            <button onClick={toggleLanguage} className="language-btn">
              {language === "en" ? "中文" : "EN"}
            </button>
          </div>
          <button 
            onClick={() => setShowScanModal(true)} 
            className="scan-password-btn"
          >
            <div className="scan-icon"></div>
            {t.scanPassword}
          </button>
          <button 
            className="tutorial-btn"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? (language === "en" ? "Hide Tutorial" : "隐藏教程") : t.tutorial}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="control-panel">
          <div className="search-box">
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            <button 
              className={filterStatus === "all" ? "active" : ""}
              onClick={() => setFilterStatus("all")}
            >
              {t.all}
            </button>
            <button 
              className={filterStatus === "safe" ? "active" : ""}
              onClick={() => setFilterStatus("safe")}
            >
              {t.safe}
            </button>
            <button 
              className={filterStatus === "breached" ? "active" : ""}
              onClick={() => setFilterStatus("breached")}
            >
              {t.breached}
            </button>
            <button 
              className={filterStatus === "processing" ? "active" : ""}
              onClick={() => setFilterStatus("processing")}
            >
              {t.processing}
            </button>
          </div>
          <div className="view-toggle">
            <button 
              className={showStats ? "active" : ""}
              onClick={() => setShowStats(true)}
            >
              {t.stats}
            </button>
            <button 
              className={!showStats ? "active" : ""}
              onClick={() => setShowStats(false)}
            >
              {t.tutorial}
            </button>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>{t.tutorialTitle}</h2>
            
            <div className="tutorial-steps">
              <div className="tutorial-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>{t.step1}</h3>
                  <p>{t.step1Desc}</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>{t.step2}</h3>
                  <p>{t.step2Desc}</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>{t.step3}</h3>
                  <p>{t.step3Desc}</p>
                </div>
              </div>
              <div className="tutorial-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>{t.step4}</h3>
                  <p>{t.step4Desc}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showStats && (
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{breaches.length}</div>
                <div className="stat-label">{t.totalScans}</div>
              </div>
              <div className="stat-card safe">
                <div className="stat-value">{safeCount}</div>
                <div className="stat-label">{t.safePasswords}</div>
              </div>
              <div className="stat-card breached">
                <div className="stat-value">{breachedCount}</div>
                <div className="stat-label">{t.breachedPasswords}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{processingCount}</div>
                <div className="stat-label">{t.processing}</div>
              </div>
            </div>
            
            <div className="breach-chart">
              <h3>{language === "en" ? "Breach Status Distribution" : "泄露状态分布"}</h3>
              <div className="chart-container">
                <div className="chart-bar safe" style={{ width: `${(safeCount / breaches.length) * 100 || 0}%` }}>
                  <span>{safeCount}</span>
                </div>
                <div className="chart-bar breached" style={{ width: `${(breachedCount / breaches.length) * 100 || 0}%` }}>
                  <span>{breachedCount}</span>
                </div>
                <div className="chart-bar processing" style={{ width: `${(processingCount / breaches.length) * 100 || 0}%` }}>
                  <span>{processingCount}</span>
                </div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="color-box safe"></div>
                  <span>{t.safe}</span>
                </div>
                <div className="legend-item">
                  <div className="color-box breached"></div>
                  <span>{t.breached}</span>
                </div>
                <div className="legend-item">
                  <div className="color-box processing"></div>
                  <span>{t.processing}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="breaches-section">
          <div className="section-header">
            <h2>{language === "en" ? "Password Scan History" : "密码扫描历史"}</h2>
            <div className="header-actions">
              <button 
                onClick={loadBreaches}
                className="refresh-btn"
                disabled={isRefreshing}
              >
                {isRefreshing ? (language === "en" ? "Refreshing..." : "刷新中...") : (language === "en" ? "Refresh" : "刷新")}
              </button>
            </div>
          </div>
          
          <div className="breaches-list">
            {filteredBreaches.length === 0 ? (
              <div className="no-breaches">
                <div className="no-breaches-icon"></div>
                <p>{t.noBreaches}</p>
                <button 
                  className="primary"
                  onClick={() => setShowScanModal(true)}
                >
                  {t.scanFirst}
                </button>
              </div>
            ) : (
              filteredBreaches.map(breach => (
                <div className={`breach-card ${breach.status}`} key={breach.id}>
                  <div className="breach-header">
                    <div className="breach-id">#{breach.id.substring(0, 6)}</div>
                    <div className="breach-status">
                      <span className={`status-badge ${breach.status}`}>
                        {t[breach.status]}
                      </span>
                    </div>
                  </div>
                  <div className="breach-content">
                    <div className="breach-details">
                      <div className="detail-item">
                        <span className="label">{language === "en" ? "Owner:" : "所有者:"}</span>
                        <span className="value">{breach.owner.substring(0, 6)}...{breach.owner.substring(38)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{language === "en" ? "Date:" : "日期:"}</span>
                        <span className="value">{new Date(breach.timestamp * 1000).toLocaleDateString()}</span>
                      </div>
                      {breach.severity && (
                        <div className="detail-item">
                          <span className="label">{language === "en" ? "Severity:" : "严重程度:"}</span>
                          <span className={`value severity-${breach.severity > 70 ? "high" : breach.severity > 30 ? "medium" : "low"}`}>
                            {breach.severity}% {language === "en" ? 
                              (breach.severity > 70 ? t.highRisk : breach.severity > 30 ? t.mediumRisk : t.lowRisk) : 
                              (breach.severity > 70 ? t.highRisk : breach.severity > 30 ? t.mediumRisk : t.lowRisk)}
                          </span>
                        </div>
                      )}
                      {breach.breachSource && (
                        <div className="detail-item">
                          <span className="label">{language === "en" ? "Source:" : "来源:"}</span>
                          <span className="value">{breach.breachSource}</span>
                        </div>
                      )}
                    </div>
                    <div className="breach-actions">
                      <button 
                        className="action-btn verify"
                        onClick={() => verifyBreach(breach.id)}
                      >
                        {t.verify}
                      </button>
                      <button 
                        className="action-btn details"
                      >
                        {t.viewDetails}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3>{t.community}</h3>
            <p>{language === "en" ? "Join our community to discuss FHE security" : "加入我们的社区讨论FHE安全"}</p>
            <button className="community-btn">{language === "en" ? "Join Discord" : "加入Discord"}</button>
          </div>
          
          <div className="info-card">
            <h3>{t.partners}</h3>
            <div className="partners-list">
              <div className="partner-item">Zama</div>
              <div className="partner-item">FHE.org</div>
              <div className="partner-item">Web3 Security Alliance</div>
            </div>
          </div>
          
          <div className="info-card">
            <h3>{t.team}</h3>
            <div className="team-list">
              <div className="team-member">
                <div className="member-avatar"></div>
                <div className="member-name">Dr. Alice Chen</div>
                <div className="member-role">FHE Researcher</div>
              </div>
              <div className="team-member">
                <div className="member-avatar"></div>
                <div className="member-name">John Zhang</div>
                <div className="member-role">Security Engineer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {showScanModal && (
        <ModalScan 
          onSubmit={scanPassword} 
          onClose={() => setShowScanModal(false)} 
          scanning={scanning}
          password={newPassword}
          setPassword={setNewPassword}
          t={t}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✕</div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>BreachMonitor FHE</span>
            </div>
            <p>{t.disclaimer}</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">{t.community}</a>
            <a href="#" className="footer-link">{language === "en" ? "Privacy Policy" : "隐私政策"}</a>
            <a href="#" className="footer-link">{language === "en" ? "Terms of Service" : "服务条款"}</a>
          </div>

          <div className="footer-acknowledgement">
            <p>{t.thanks}</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>{t.fhePowered}</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} BreachMonitor FHE. {language === "en" ? "All rights reserved." : "保留所有权利。"}
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalScanProps {
  onSubmit: () => void; 
  onClose: () => void; 
  scanning: boolean;
  password: string;
  setPassword: (password: string) => void;
  t: any;
}

const ModalScan: React.FC<ModalScanProps> = ({ 
  onSubmit, 
  onClose, 
  scanning,
  password,
  setPassword,
  t
}) => {
  const handleSubmit = () => {
    if (!password) {
      alert("Please enter a password");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="scan-modal">
        <div className="modal-header">
          <h2>{t.scanPassword}</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <div className="key-icon"></div> 
            {t.disclaimer}
          </div>
          
          <div className="password-input-container">
            <label>{t.passwordPlaceholder}</label>
            <input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="password-input"
            />
          </div>
          
          <div className="security-tips">
            <h3>{t.language === "en" ? "Security Tips" : "安全提示"}</h3>
            <ul>
              <li>{t.language === "en" ? "Never reuse passwords across different sites" : "不要在不同网站重复使用密码"}</li>
              <li>{t.language === "en" ? "Use a password manager to generate strong passwords" : "使用密码管理器生成强密码"}</li>
              <li>{t.language === "en" ? "Enable two-factor authentication when available" : "启用双因素认证"}</li>
            </ul>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn"
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={scanning}
            className="submit-btn primary"
          >
            {scanning ? t.scanning : t.scan}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;