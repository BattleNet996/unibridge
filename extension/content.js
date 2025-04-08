/**
 * FuturePreppers Job Tracker - Content Script
 * 
 * This script runs in the context of web pages and is responsible for 
 * extracting job information from the page when requested.
 */

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is requesting job information extraction
  if (request.action === 'extractJobInfo') {
    // Extract job information from the page
    const jobInfo = extractJobInfo();
    
    // Send the extracted information back
    sendResponse(jobInfo);
    return true;
  }
  
  // Check if the message is requesting to highlight job elements
  if (request.action === 'highlightJobElements') {
    // Highlight job elements on the page
    highlightJobElements();
    sendResponse({ success: true });
    return true;
  }
  
  // Check if the message is requesting to remove highlights
  if (request.action === 'removeHighlights') {
    // Remove highlights from the page
    removeHighlights();
    sendResponse({ success: true });
    return true;
  }
});

// Extract job information from the current page
function extractJobInfo() {
  // Get page title
  const pageTitle = document.title;
  
  // Get page URL
  const pageUrl = window.location.href;
  
  // Extract job title
  const jobTitle = extractJobTitle();
  
  // Extract company name
  const companyName = extractCompanyName();
  
  // Extract job location
  const jobLocation = extractJobLocation();
  
  // Extract job description
  const jobDescription = extractJobDescription();
  
  // Return extracted information
  return {
    pageTitle,
    pageUrl,
    jobTitle,
    companyName,
    jobLocation,
    jobDescription,
    timestamp: new Date().toISOString()
  };
}

// Extract job title from the page
function extractJobTitle() {
  // Common selectors for job titles
  const selectors = [
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
  
  // Try each selector
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }
  
  // If selectors fail, try to extract from the page title
  const pageTitle = document.title;
  
  // Common patterns in job listing page titles
  const titlePatterns = [
    /^(.*?)\s+[\-\|]\s+.*?(?:Careers|Jobs|招聘|职位)/i,
    /^.*?(?:Careers|Jobs|招聘):\s+(.*?)$/i,
    /^(.*?)\s+job\s+at\s+/i,
    /^(.*?)$/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = pageTitle.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      return match[1].trim();
    }
  }
  
  // Return empty string if no job title found
  return '';
}

// Extract company name from the page
function extractCompanyName() {
  // Common selectors for company names
  const selectors = [
    '.company-name',
    '.employer-name',
    '.organization-name',
    '.company',
    '[data-automation="job-detail-company-name"]',
    '.topcard__org-name-link',
    '[data-testid="jobsearch-JobInfoHeader-companyName"]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }
  
  // If selectors fail, try to extract from the URL
  try {
    const hostname = new URL(window.location.href).hostname;
    
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

// Extract job location from the page
function extractJobLocation() {
  // Common selectors for job locations
  const selectors = [
    '.job-location',
    '.location',
    '.posting-location',
    '.job-info .location',
    '[data-automation="job-detail-location"]',
    '.topcard__flavor--bullet',
    '[data-testid="jobsearch-JobInfoHeader-locationRaw"]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }
  
  // Return empty string if no location found
  return '';
}

// Extract job description from the page
function extractJobDescription() {
  // Common selectors for job descriptions
  const selectors = [
    '.job-description',
    '.description',
    '.posting-description',
    '#job-description',
    '[data-automation="job-detail-description"]',
    '.description__text',
    '[data-testid="jobDescriptionText"]'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim().substring(0, 5000); // Limit to 5000 chars
    }
  }
  
  // If no dedicated description element found, try to extract from the page content
  // This is a fallback and may not be accurate
  const bodyText = document.body.innerText;
  const commonDescStartMarkers = ['Job Description', 'About the role', 'Responsibilities', 'What you'll do', '岗位职责', '职位描述'];
  
  for (const marker of commonDescStartMarkers) {
    const index = bodyText.indexOf(marker);
    if (index !== -1) {
      return bodyText.substring(index, index + 3000);
    }
  }
  
  // Return empty string if no description found
  return '';
}

// Highlight job elements on the page
function highlightJobElements() {
  // Remove any existing highlights first
  removeHighlights();
  
  // Create a style element for our highlights
  const style = document.createElement('style');
  style.id = 'futurepreppersHighlightStyles';
  style.textContent = `
    .futurepreppersHighlight {
      background-color: rgba(14, 165, 233, 0.2) !important;
      border: 2px solid rgba(14, 165, 233, 0.8) !important;
      border-radius: 4px !important;
      position: relative !important;
    }
    
    .futurepreppersHighlight::before {
      content: attr(data-fp-label);
      position: absolute;
      top: -20px;
      left: 0;
      background-color: rgba(14, 165, 233, 0.9);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
  
  // Common selectors to highlight
  const elementsToHighlight = [
    { selector: 'h1.job-title, h1.posting-title, h1.title, .job-title, .position-title, h1:first-of-type', label: '职位名称' },
    { selector: '.company-name, .employer-name, .organization-name, .company', label: '公司名称' },
    { selector: '.job-location, .location, .posting-location, .job-info .location', label: '工作地点' },
    { selector: '.job-description, .description, .posting-description, #job-description', label: '职位描述' }
  ];
  
  // Apply highlights
  elementsToHighlight.forEach(({ selector, label }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.textContent.trim()) {
        el.classList.add('futurepreppersHighlight');
        el.setAttribute('data-fp-label', label);
      }
    });
  });
}

// Remove highlights from the page
function removeHighlights() {
  // Remove the style element
  const style = document.getElementById('futurepreppersHighlightStyles');
  if (style) {
    style.remove();
  }
  
  // Remove highlight classes
  const highlightedElements = document.querySelectorAll('.futurepreppersHighlight');
  highlightedElements.forEach(el => {
    el.classList.remove('futurepreppersHighlight');
    el.removeAttribute('data-fp-label');
  });
}

// Initial setup when content script loads
function initialize() {
  // Send a message to the background script to indicate that the content script is ready
  chrome.runtime.sendMessage({ action: 'contentScriptReady', url: window.location.href });
  
  // Listen for page mutations (for dynamically loaded content)
  setupMutationObserver();
}

// Set up mutation observer to detect dynamically loaded content
function setupMutationObserver() {
  // Create an observer instance
  const observer = new MutationObserver((mutations) => {
    let shouldNotify = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // If significant content has been added, notify background script
        shouldNotify = true;
      }
    });
    
    if (shouldNotify) {
      chrome.runtime.sendMessage({ 
        action: 'contentChanged',
        url: window.location.href
      });
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { 
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

// Initialize the content script
initialize();
