/**
 * FuturePreppers Job Tracker - Background Script
 * 
 * This script runs in the background of the browser extension and handles:
 * - Communication between content scripts and popup
 * - Automatic job detection on supported sites
 * - Notification management
 */

// Store detected job information
let detectedJobs = {};

// Supported job listing domains
const supportedDomains = [
  'linkedin.com',
  'indeed.com',
  'zhaopin.com',
  '51job.com',
  'lagou.com',
  'boss.com',
  'glassdoor.com',
  'liepin.com'
];

// Initialize extension
function initExtension() {
  // Load settings
  chrome.storage.sync.get('settings', (data) => {
    // Default settings if none exist
    if (!data.settings) {
      const defaultSettings = {
        apiKey: '',
        dashboardUrl: 'http://localhost:8080/job-tracker.html',
        autoDetect: true
      };
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });
}

// Listen for installation or update events
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation
    showWelcomeNotification();
    
    // Open welcome page
    chrome.tabs.create({
      url: 'welcome.html'
    });
  } else if (details.reason === 'update') {
    // Extension updated
    showUpdateNotification();
  }
  
  // Initialize extension
  initExtension();
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script is ready on a page
  if (message.action === 'contentScriptReady') {
    handleContentScriptReady(message, sender);
    sendResponse({ received: true });
    return true;
  }
  
  // Content on the page has changed
  if (message.action === 'contentChanged') {
    handleContentChanged(message, sender);
    sendResponse({ received: true });
    return true;
  }
  
  // Request to analyze current page for job information
  if (message.action === 'analyzeJobPage') {
    analyzeJobPage(sender.tab.id);
    sendResponse({ analyzing: true });
    return true;
  }
  
  // Request to save job to dashboard
  if (message.action === 'saveJob') {
    saveJobToDashboard(message.jobData);
    sendResponse({ saved: true });
    return true;
  }
  
  // Return false to indicate no async response
  return false;
});

// Handle when a content script is ready
function handleContentScriptReady(message, sender) {
  const { url } = message;
  const { tab } = sender;
  
  // Check if the URL is from a supported job site
  if (isJobSite(url) && tab) {
    // Get settings to check if auto-detect is enabled
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings && data.settings.autoDetect) {
        // Analyze the page for job information
        setTimeout(() => {
          analyzeJobPage(tab.id);
        }, 1000); // Wait a bit for page to fully load
      }
    });
  }
}

// Handle when content on a page changes
function handleContentChanged(message, sender) {
  const { url } = message;
  const { tab } = sender;
  
  // Check if the URL is from a supported job site
  if (isJobSite(url) && tab) {
    // Get settings to check if auto-detect is enabled
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings && data.settings.autoDetect) {
        // Re-analyze the page for job information after a delay
        setTimeout(() => {
          analyzeJobPage(tab.id);
        }, 1500);
      }
    });
  }
}

// Check if the URL is from a supported job site
function isJobSite(url) {
  try {
    const hostname = new URL(url).hostname;
    
    // Check if the hostname contains any of the supported domains
    return supportedDomains.some(domain => hostname.includes(domain));
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

// Analyze the current page for job information
function analyzeJobPage(tabId) {
  // Execute content script to extract job information
  chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      // This function executes in the context of the page
      
      // Get page title
      const pageTitle = document.title;
      
      // Get page URL
      const pageUrl = window.location.href;
      
      // Try to extract job title
      let jobTitle = '';
      const titleSelectors = [
        'h1.job-title',
        'h1.posting-title',
        'h1.title',
        '.job-title',
        '.position-title',
        'h1:first-of-type',
        '[data-automation="job-detail-title"]',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.topcard__title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          jobTitle = element.textContent.trim();
          break;
        }
      }
      
      // Try to extract company name
      let companyName = '';
      const companySelectors = [
        '.company-name',
        '.employer-name',
        '.organization-name',
        '.company',
        '[data-automation="job-detail-company-name"]',
        '.topcard__org-name-link',
        '[data-testid="jobsearch-JobInfoHeader-companyName"]'
      ];
      
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          companyName = element.textContent.trim();
          break;
        }
      }
      
      // Return job information
      return {
        hasJobInfo: !!(jobTitle || companyName),
        jobTitle,
        companyName,
        pageTitle,
        pageUrl
      };
    }
  }, (results) => {
    // Handle the results of the script execution
    if (chrome.runtime.lastError) {
      console.error('Error executing script:', chrome.runtime.lastError);
      return;
    }
    
    if (results && results[0] && results[0].result) {
      const jobInfo = results[0].result;
      
      // Check if job information was detected
      if (jobInfo.hasJobInfo) {
        // Store the detected job information
        detectedJobs[tabId] = jobInfo;
        
        // Show the page action (icon) to indicate job information was found
        chrome.action.setIcon({
          tabId,
          path: {
            16: 'icons/icon16_active.png',
            48: 'icons/icon48_active.png',
            128: 'icons/icon128_active.png'
          }
        });
        
        // Show notification
        showJobDetectedNotification(jobInfo);
      }
    }
  });
}

// Save job to dashboard
function saveJobToDashboard(jobData) {
  // Get existing job applications
  chrome.storage.local.get('jobApplications', (data) => {
    const jobApplications = data.jobApplications || [];
    
    // Add new job application
    jobApplications.push({
      ...jobData,
      id: Date.now().toString(),
      savedAt: new Date().toISOString()
    });
    
    // Save updated job applications
    chrome.storage.local.set({ jobApplications }, () => {
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '职位已保存',
        message: `${jobData.jobTitle} @ ${jobData.companyName} 已添加到您的求职管理系统`
      });
    });
  });
}

// Show welcome notification
function showWelcomeNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '欢迎使用 FuturePreppers 求职助手',
    message: '您现在可以轻松跟踪求职进度，点击浏览招聘网站时的扩展图标以捕获职位信息。'
  });
}

// Show update notification
function showUpdateNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'FuturePreppers 求职助手已更新',
    message: '查看新增功能和改进，点击扩展图标了解更多。'
  });
}

// Show job detected notification
function showJobDetectedNotification(jobInfo) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '检测到职位信息',
    message: `${jobInfo.jobTitle} @ ${jobInfo.companyName}\n点击扩展图标添加到您的求职管理系统。`
  });
}
