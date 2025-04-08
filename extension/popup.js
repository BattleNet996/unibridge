/**
 * FuturePreppers Job Tracker - Browser Extension
 * 
 * This script handles the popup functionality of the browser extension
 * allowing users to extract job information from recruiting websites
 * and save them to the FuturePreppers job tracking system.
 */

// DOM Elements
const elements = {
  // Views
  jobExtractionView: document.getElementById('job-extraction-view'),
  loadingView: document.getElementById('loading-view'),
  noJobView: document.getElementById('no-job-view'),
  manualAddView: document.getElementById('manual-add-view'),
  settingsView: document.getElementById('settings-view'),
  successView: document.getElementById('success-view'),
  
  // Job extraction elements
  companyName: document.getElementById('company-name'),
  jobTitle: document.getElementById('job-title'),
  jobLocation: document.getElementById('job-location'),
  editBtn: document.getElementById('edit-btn'),
  saveJobBtn: document.getElementById('save-job-btn'),
  
  // Manual add elements
  manualAddBtn: document.getElementById('manual-add-btn'),
  backBtn: document.getElementById('back-btn'),
  companyInput: document.getElementById('company-input'),
  titleInput: document.getElementById('title-input'),
  locationInput: document.getElementById('location-input'),
  jobForm: document.getElementById('job-form'),
  
  // Loading elements
  loadingText: document.getElementById('loading-text'),
  
  // Settings elements
  settingsBtn: document.getElementById('settings-btn'),
  settingsBackBtn: document.getElementById('settings-back-btn'),
  apiKeyInput: document.getElementById('api-key-input'),
  dashboardUrlInput: document.getElementById('dashboard-url-input'),
  autoDetectToggle: document.getElementById('auto-detect-toggle'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  
  // Action buttons
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  viewJobsBtn: document.getElementById('view-jobs-btn')
};

// Extracted job data
let jobData = {
  company: '',
  title: '',
  location: '',
  description: '',
  url: '',
  dateExtracted: '',
};

// Default settings
const defaultSettings = {
  apiKey: '',
  dashboardUrl: 'http://localhost:8080/job-tracker.html',
  autoDetect: true
};

// Current settings
let settings = { ...defaultSettings };

// Initialize the popup
function initPopup() {
  // Load settings
  chrome.storage.sync.get('settings', (data) => {
    if (data.settings) {
      settings = { ...defaultSettings, ...data.settings };
    }
    
    // Set settings form values
    elements.apiKeyInput.value = settings.apiKey;
    elements.dashboardUrlInput.value = settings.dashboardUrl;
    elements.autoDetectToggle.checked = settings.autoDetect;
    
    // Setup dashboard links
    elements.openDashboardBtn.href = settings.dashboardUrl;
    elements.viewJobsBtn.href = settings.dashboardUrl;
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Start job extraction
  showLoadingView('正在提取职位信息...');
  extractJobInfo();
}

// Setup event listeners
function setupEventListeners() {
  // Edit button
  elements.editBtn.addEventListener('click', () => {
    showManualAddView();
    
    // Pre-fill form with extracted data
    elements.companyInput.value = jobData.company;
    elements.titleInput.value = jobData.title;
    elements.locationInput.value = jobData.location;
  });
  
  // Save job button
  elements.saveJobBtn.addEventListener('click', saveJobApplication);
  
  // Manual add button
  elements.manualAddBtn.addEventListener('click', showManualAddView);
  
  // Back button
  elements.backBtn.addEventListener('click', () => {
    if (jobData.company) {
      showJobExtractionView();
    } else {
      showNoJobView();
    }
  });
  
  // Job form submission
  elements.jobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Update job data with form values
    jobData.company = elements.companyInput.value;
    jobData.title = elements.titleInput.value;
    jobData.location = elements.locationInput.value;
    
    saveJobApplication();
  });
  
  // Settings button
  elements.settingsBtn.addEventListener('click', showSettingsView);
  
  // Settings back button
  elements.settingsBackBtn.addEventListener('click', () => {
    if (jobData.company) {
      showJobExtractionView();
    } else {
      showNoJobView();
    }
  });
  
  // Save settings button
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
}

// Extract job information from the current page
function extractJobInfo() {
  // Get the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Get current URL
    const currentUrl = tabs[0].url;
    jobData.url = currentUrl;
    jobData.dateExtracted = new Date().toISOString();
    
    // Execute content script to extract job information
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: scrapePageContent
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Error executing script: ', chrome.runtime.lastError);
        showNoJobView();
        return;
      }
      
      if (results && results[0] && results[0].result) {
        const scrapedData = results[0].result;
        
        // Use AI to extract job information
        processScrapedData(scrapedData);
      } else {
        showNoJobView();
      }
    });
  });
}

// Scrape page content (executed in the context of the page)
function scrapePageContent() {
  // Get page title
  const pageTitle = document.title;
  
  // Get page content
  const bodyText = document.body.innerText.substring(0, 10000); // Limit to 10K chars
  
  // Get meta tags
  const metaTags = {};
  document.querySelectorAll('meta').forEach(meta => {
    if (meta.name) {
      metaTags[meta.name] = meta.content;
    } else if (meta.property) {
      metaTags[meta.property] = meta.content;
    }
  });
  
  // Try to find job-specific elements
  let jobElements = {
    title: '',
    company: '',
    location: '',
    description: ''
  };
  
  // Common selectors for job titles
  const titleSelectors = [
    'h1.job-title',
    'h1.posting-title',
    'h1.title',
    '.job-title',
    '.position-title',
    'h1:first-of-type'
  ];
  
  // Common selectors for company names
  const companySelectors = [
    '.company-name',
    '.employer-name',
    '.organization-name',
    '.company'
  ];
  
  // Common selectors for job locations
  const locationSelectors = [
    '.job-location',
    '.location',
    '.posting-location',
    '.job-info .location'
  ];
  
  // Common selectors for job descriptions
  const descriptionSelectors = [
    '.job-description',
    '.description',
    '.posting-description',
    '#job-description'
  ];
  
  // Try each selector
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      jobElements.title = element.textContent.trim();
      break;
    }
  }
  
  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      jobElements.company = element.textContent.trim();
      break;
    }
  }
  
  for (const selector of locationSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      jobElements.location = element.textContent.trim();
      break;
    }
  }
  
  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      jobElements.description = element.textContent.trim().substring(0, 3000); // Limit length
      break;
    }
  }
  
  return {
    pageTitle,
    bodyText,
    metaTags,
    jobElements,
    url: window.location.href
  };
}

// Process scraped data (potentially using AI)
function processScrapedData(scrapedData) {
  // Check if we have access to Gemini API key
  if (settings.apiKey) {
    // In a real implementation, we would call the Gemini API here
    // For now, we'll simulate the AI processing
    simulateAIProcessing(scrapedData);
  } else {
    // Use basic extraction if no API key
    extractBasicJobInfo(scrapedData);
  }
}

// Simulate AI processing (to be replaced with actual Gemini API call)
function simulateAIProcessing(scrapedData) {
  // Simulate API delay
  setTimeout(() => {
    // Extract the job information from scraped data
    const { jobElements, pageTitle, url } = scrapedData;
    
    // If job elements were found via selectors, use them
    if (jobElements.title || jobElements.company) {
      jobData.title = jobElements.title || extractTitleFromPageTitle(pageTitle);
      jobData.company = jobElements.company || extractCompanyFromUrl(url);
      jobData.location = jobElements.location || '';
      jobData.description = jobElements.description || '';
      
      updateJobExtractionView();
      showJobExtractionView();
    } else {
      // Try to extract from page title
      const extractedTitle = extractTitleFromPageTitle(pageTitle);
      if (extractedTitle) {
        jobData.title = extractedTitle;
        jobData.company = extractCompanyFromUrl(url);
        
        updateJobExtractionView();
        showJobExtractionView();
      } else {
        // Failed to extract job information
        showNoJobView();
      }
    }
  }, 1000);
}

// Extract basic job information from scraped data
function extractBasicJobInfo(scrapedData) {
  const { jobElements, pageTitle, url } = scrapedData;
  
  // If job elements were found via selectors, use them
  if (jobElements.title || jobElements.company) {
    jobData.title = jobElements.title || extractTitleFromPageTitle(pageTitle);
    jobData.company = jobElements.company || extractCompanyFromUrl(url);
    jobData.location = jobElements.location || '';
    jobData.description = jobElements.description || '';
    
    updateJobExtractionView();
    showJobExtractionView();
  } else {
    // Try to extract from page title
    const extractedTitle = extractTitleFromPageTitle(pageTitle);
    if (extractedTitle) {
      jobData.title = extractedTitle;
      jobData.company = extractCompanyFromUrl(url);
      
      updateJobExtractionView();
      showJobExtractionView();
    } else {
      // Failed to extract job information
      showNoJobView();
    }
  }
}

// Extract job title from page title
function extractTitleFromPageTitle(pageTitle) {
  // Common patterns in job listing page titles
  // Example: "Software Engineer - Google Careers"
  // Example: "Google Careers: Software Engineer"
  // Example: "Software Engineer job at Google"
  
  // Try to match common patterns
  const patterns = [
    /^(.*?)\s+[\-\|]\s+.*?(?:Careers|Jobs|招聘|职位)/i,
    /^.*?(?:Careers|Jobs|招聘):\s+(.*?)$/i,
    /^(.*?)\s+job\s+at\s+/i,
    /^(.*?)$/i
  ];
  
  for (const pattern of patterns) {
    const match = pageTitle.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      return match[1].trim();
    }
  }
  
  return '';
}

// Extract company name from URL
function extractCompanyFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    
    // Remove www. and .com/.org/etc.
    let company = hostname.replace(/^www\./i, '')
                          .split('.')[0];
    
    // Capitalize first letter
    company = company.charAt(0).toUpperCase() + company.slice(1);
    
    return company;
  } catch (error) {
    return '';
  }
}

// Update job extraction view with current job data
function updateJobExtractionView() {
  elements.companyName.textContent = jobData.company;
  elements.jobTitle.textContent = jobData.title;
  elements.jobLocation.textContent = jobData.location || '未指定';
}

// Save job application
function saveJobApplication() {
  showLoadingView('正在保存职位信息...');
  
  // Format job data
  const jobApplication = {
    id: Date.now().toString(),
    companyName: jobData.company,
    jobTitle: jobData.title,
    jobLocation: jobData.location,
    jobDescription: jobData.description,
    sourceUrl: jobData.url,
    applyDate: new Date().toISOString().split('T')[0],
    jobStatus: 'wishlist',
    lastUpdated: new Date().toISOString()
  };
  
  // In a real implementation, we would send this to the main application
  // For now, we'll store it in Chrome storage
  chrome.storage.local.get('jobApplications', (data) => {
    const jobApplications = data.jobApplications || [];
    jobApplications.push(jobApplication);
    
    chrome.storage.local.set({ jobApplications }, () => {
      // Show success view after a short delay
      setTimeout(() => {
        showSuccessView();
      }, 1000);
    });
  });
}

// Save settings
function saveSettings() {
  // Update settings object
  settings.apiKey = elements.apiKeyInput.value;
  settings.dashboardUrl = elements.dashboardUrlInput.value;
  settings.autoDetect = elements.autoDetectToggle.checked;
  
  // Save to Chrome storage
  chrome.storage.sync.set({ settings }, () => {
    // Update dashboard links
    elements.openDashboardBtn.href = settings.dashboardUrl;
    elements.viewJobsBtn.href = settings.dashboardUrl;
    
    // Show previous view
    if (jobData.company) {
      showJobExtractionView();
    } else {
      showNoJobView();
    }
  });
}

// Show job extraction view
function showJobExtractionView() {
  hideAllViews();
  elements.jobExtractionView.classList.remove('hidden');
}

// Show loading view
function showLoadingView(message) {
  hideAllViews();
  elements.loadingText.textContent = message;
  elements.loadingView.classList.remove('hidden');
}

// Show no job view
function showNoJobView() {
  hideAllViews();
  elements.noJobView.classList.remove('hidden');
}

// Show manual add view
function showManualAddView() {
  hideAllViews();
  elements.manualAddView.classList.remove('hidden');
}

// Show settings view
function showSettingsView() {
  hideAllViews();
  elements.settingsView.classList.remove('hidden');
}

// Show success view
function showSuccessView() {
  hideAllViews();
  elements.successView.classList.remove('hidden');
}

// Hide all views
function hideAllViews() {
  elements.jobExtractionView.classList.add('hidden');
  elements.loadingView.classList.add('hidden');
  elements.noJobView.classList.add('hidden');
  elements.manualAddView.classList.add('hidden');
  elements.settingsView.classList.add('hidden');
  elements.successView.classList.add('hidden');
}

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', initPopup);
