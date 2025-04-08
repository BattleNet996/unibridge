/**
 * FuturePreppers - Job Tracker Module
 * Handles job application tracking and AI-powered job description parsing
 */

// Application data store
let applications = JSON.parse(localStorage.getItem('job-applications') || '[]');
let currentApplicationId = null;

// API Configuration
const API_CONFIG = {
    baseUrl: 'http://localhost:3007',
    endpoints: {
        parseJobDescription: '/api/parse-job',
        generateTips: '/api/generate-tips',
        createReminders: '/api/create-reminders',
        status: '/api/status'
    }
};

// DOM Elements
const elements = {
    // Dashboard elements
    totalApplications: document.getElementById('total-applications'),
    appliedCount: document.getElementById('applied-count'),
    interviewCount: document.getElementById('interview-count'),
    offerCount: document.getElementById('offer-count'),
    
    // Table elements
    applicationsTableBody: document.getElementById('applications-table-body'),
    searchInput: document.getElementById('search-input'),
    statusFilter: document.getElementById('status-filter'),
    
    // Add/Edit application elements
    addApplicationBtn: document.getElementById('add-application-btn'),
    applicationModal: document.getElementById('application-modal'),
    applicationForm: document.getElementById('application-form'),
    applicationId: document.getElementById('application-id'),
    companyName: document.getElementById('company-name'),
    jobTitle: document.getElementById('job-title'),
    jobLocation: document.getElementById('job-location'),
    applyDate: document.getElementById('apply-date'),
    deadlineDate: document.getElementById('deadline-date'),
    jobStatus: document.getElementById('job-status'),
    jobDescription: document.getElementById('job-description'),
    jobNotes: document.getElementById('job-notes'),
    saveApplication: document.getElementById('save-application'),
    cancelApplication: document.getElementById('cancel-application'),
    
    // AI parsing elements
    jobDescriptionInput: document.getElementById('job-description-input'),
    parseJobDescription: document.getElementById('parse-job-description')
};

// Status badge styling
const statusStyles = {
    wishlist: 'bg-gray-100 text-gray-800',
    applied: 'bg-blue-100 text-blue-800',
    phone_screen: 'bg-yellow-100 text-yellow-800',
    interview: 'bg-purple-100 text-purple-800',
    offer: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
};

// Status display names
const statusNames = {
    wishlist: '未申请',
    applied: '已申请',
    phone_screen: '电话面试',
    interview: '面试',
    offer: '录取',
    rejected: '已拒绝'
};

// Initialize the tracker
function initJobTracker() {
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    elements.applyDate.value = today;
    
    // Setup event listeners
    setupEventListeners();
    
    // Render applications table and update stats
    renderApplications();
    updateDashboardStats();
}

// Setup event listeners
function setupEventListeners() {
    // Open modal to add new application
    elements.addApplicationBtn.addEventListener('click', () => {
        resetApplicationForm();
        elements.applicationModal.classList.remove('hidden');
    });
    
    // Close modal
    elements.cancelApplication.addEventListener('click', () => {
        elements.applicationModal.classList.add('hidden');
    });
    
    // Save application
    elements.saveApplication.addEventListener('click', saveApplicationData);
    
    // Search and filter
    elements.searchInput.addEventListener('input', renderApplications);
    elements.statusFilter.addEventListener('change', renderApplications);
    
    // AI job description parsing
    elements.parseJobDescription.addEventListener('click', parseJobDescription);
    
    // Export to CSV
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
    
    // Check deadlines
    document.getElementById('check-deadlines-btn').addEventListener('click', checkDeadlines);
    
    // Get application tips
    document.getElementById('get-tips-btn').addEventListener('click', getTipsFromDescription);
    
    // Sort by deadline
    document.getElementById('sort-by-deadline-btn').addEventListener('click', toggleDeadlineSort);
}

// Render applications table
function renderApplications() {
    // Get filtered applications
    const filteredApplications = filterApplications();
    
    // Clear table
    elements.applicationsTableBody.innerHTML = '';
    
    // Show empty state if no applications
    if (filteredApplications.length === 0) {
        elements.applicationsTableBody.innerHTML = `
            <tr class="text-center">
                <td colspan="7" class="px-6 py-8 text-gray-500">
                    <p>暂无申请数据</p>
                    <p class="text-sm mt-2">点击上方"添加申请"按钮或使用AI助手解析职位描述</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render each application
    filteredApplications.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="ml-0">
                        <div class="text-sm font-medium text-gray-900">${app.companyName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${app.jobTitle}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${app.jobLocation || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${app.applyDate || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${app.deadlineDate || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[app.jobStatus]}">
                    ${statusNames[app.jobStatus]}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-primary-600 hover:text-primary-900 mr-3 edit-btn" data-id="${app.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-btn" data-id="${app.id}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="text-primary-600 hover:text-primary-900 mr-3 tips-btn" data-id="${app.id}" title="获取申请技巧">
                    <i class="fas fa-lightbulb"></i>
                </button>
            </td>
        `;
        
        elements.applicationsTableBody.appendChild(row);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editApplication(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteApplication(btn.dataset.id));
    });
    
    document.querySelectorAll('.tips-btn').forEach(btn => {
        btn.addEventListener('click', () => showApplicationTips(applications.find(app => app.id === btn.dataset.id)));
    });
}

// Filter applications based on search and status filter
function filterApplications() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const statusFilter = elements.statusFilter.value;
    
    return applications.filter(app => {
        // Filter by status
        if (statusFilter !== 'all' && app.jobStatus !== statusFilter) {
            return false;
        }
        
        // Filter by search term
        const matchesSearch = 
            app.companyName.toLowerCase().includes(searchTerm) ||
            app.jobTitle.toLowerCase().includes(searchTerm) ||
            (app.jobLocation && app.jobLocation.toLowerCase().includes(searchTerm));
            
        return matchesSearch;
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    elements.totalApplications.textContent = applications.length;
    
    const applied = applications.filter(app => app.jobStatus === 'applied').length;
    const interview = applications.filter(app => 
        app.jobStatus === 'phone_screen' || app.jobStatus === 'interview'
    ).length;
    const offer = applications.filter(app => app.jobStatus === 'offer').length;
    
    elements.appliedCount.textContent = applied;
    elements.interviewCount.textContent = interview;
    elements.offerCount.textContent = offer;
}

// Reset application form
function resetApplicationForm() {
    elements.applicationId.value = '';
    elements.companyName.value = '';
    elements.jobTitle.value = '';
    elements.jobLocation.value = '';
    elements.applyDate.value = new Date().toISOString().split('T')[0];
    elements.deadlineDate.value = '';
    elements.jobStatus.value = 'wishlist';
    elements.jobDescription.value = '';
    elements.jobNotes.value = '';
    currentApplicationId = null;
}

// Save application data
function saveApplicationData() {
    // Get form data
    const application = {
        id: currentApplicationId || Date.now().toString(),
        companyName: elements.companyName.value,
        jobTitle: elements.jobTitle.value,
        jobLocation: elements.jobLocation.value,
        applyDate: elements.applyDate.value,
        deadlineDate: elements.deadlineDate.value,
        jobStatus: elements.jobStatus.value,
        jobDescription: elements.jobDescription.value,
        jobNotes: elements.jobNotes.value,
        lastUpdated: new Date().toISOString()
    };
    
    // Validate required fields
    if (!application.companyName || !application.jobTitle) {
        alert('请填写公司名称和职位名称');
        return;
    }
    
    // Add or update application
    if (currentApplicationId) {
        // Update existing application
        const index = applications.findIndex(app => app.id === currentApplicationId);
        if (index !== -1) {
            applications[index] = application;
        }
    } else {
        // Add new application
        applications.push(application);
    }
    
    // Save to localStorage
    localStorage.setItem('job-applications', JSON.stringify(applications));
    
    // Update UI
    renderApplications();
    updateDashboardStats();
    
    // Close modal
    elements.applicationModal.classList.add('hidden');
}

// Edit application
function editApplication(id) {
    const application = applications.find(app => app.id === id);
    if (!application) return;
    
    // Set form values
    elements.applicationId.value = application.id;
    elements.companyName.value = application.companyName;
    elements.jobTitle.value = application.jobTitle;
    elements.jobLocation.value = application.jobLocation || '';
    elements.applyDate.value = application.applyDate || '';
    elements.deadlineDate.value = application.deadlineDate || '';
    elements.jobStatus.value = application.jobStatus;
    elements.jobDescription.value = application.jobDescription || '';
    elements.jobNotes.value = application.jobNotes || '';
    
    // Set current application ID
    currentApplicationId = application.id;
    
    // Open modal
    elements.applicationModal.classList.remove('hidden');
}

// Delete application
function deleteApplication(id) {
    if (!confirm('确定要删除这个申请吗？')) return;
    
    applications = applications.filter(app => app.id !== id);
    
    // Save to localStorage
    localStorage.setItem('job-applications', JSON.stringify(applications));
    
    // Update UI
    renderApplications();
    updateDashboardStats();
}

// Parse job description using Google Gemini AI
async function parseJobDescription() {
    const jobDescription = elements.jobDescriptionInput.value.trim();
    
    if (!jobDescription) {
        alert('请先粘贴职位描述');
        return;
    }
    
    // Show loading state
    elements.parseJobDescription.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 处理中...';
    elements.parseJobDescription.disabled = true;
    
    try {
        // Call the API server to parse the job description with Gemini
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.parseJobDescription}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jobDescription })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const parsedData = await response.json();
        
        // Check if the response has the expected format
        if (!parsedData.companyName && !parsedData.jobTitle) {
            // Fallback to simulated parsing if API response is incomplete
            console.warn('API response incomplete, using fallback parsing');
            const fallbackData = simulateJobDescriptionParsing(jobDescription);
            
            // Merge API data with fallback data for missing fields
            Object.keys(fallbackData).forEach(key => {
                if (!parsedData[key]) {
                    parsedData[key] = fallbackData[key];
                }
            });
        }
        
        // Populate the form with parsed data
        resetApplicationForm();
        elements.companyName.value = parsedData.companyName || '';
        elements.jobTitle.value = parsedData.jobTitle || '';
        elements.jobLocation.value = parsedData.location || '';
        elements.jobDescription.value = jobDescription;
        
        // Set deadline if available
        if (parsedData.deadline) {
            try {
                // Try to parse the deadline into a date
                const deadlineDate = new Date(parsedData.deadline);
                if (!isNaN(deadlineDate.getTime())) {
                    elements.deadlineDate.value = deadlineDate.toISOString().split('T')[0];
                }
            } catch (error) {
                console.warn('Could not parse deadline date', error);
            }
        }
        
        // Set status to wishlist by default
        elements.jobStatus.value = 'wishlist';
        
        // Open modal with pre-filled data
        elements.applicationModal.classList.remove('hidden');
        
        // Clear the job description input
        elements.jobDescriptionInput.value = '';
        
        // Log AI analysis for debugging
        console.info('AI Analysis Result:', parsedData);
    } catch (error) {
        console.error('Error parsing job description:', error);
        alert(`解析职位描述时出错: ${error.message}`);
        
        // Fallback to simulated parsing if API fails
        const fallbackData = simulateJobDescriptionParsing(jobDescription);
        
        // Populate the form with fallback parsed data
        resetApplicationForm();
        elements.companyName.value = fallbackData.companyName;
        elements.jobTitle.value = fallbackData.jobTitle;
        elements.jobLocation.value = fallbackData.location;
        elements.jobDescription.value = jobDescription;
        
        // Set status to wishlist by default
        elements.jobStatus.value = 'wishlist';
        
        // Open modal with pre-filled data
        elements.applicationModal.classList.remove('hidden');
        
        // Clear the job description input
        elements.jobDescriptionInput.value = '';
    } finally {
        // Reset button state
        elements.parseJobDescription.innerHTML = '<i class="fas fa-magic mr-2"></i> 解析职位信息';
        elements.parseJobDescription.disabled = false;
    }
}

// Get application tips from description
async function getTipsFromDescription() {
    const description = elements.jobDescriptionInput.value.trim();
    
    if (!description) {
        alert('请输入职位描述');
        return;
    }
    
    try {
        showLoadingOverlay('正在生成申请技巧...');
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.generateTips}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jobDescription: description })
        });
        
        const data = await response.json();
        
        hideLoadingOverlay();
        
        if (data.tips) {
            showTipsModal('申请技巧', data.tips);
        } else {
            alert('生成申请技巧时出错，请稍后重试');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('生成申请技巧时出错:', error);
        alert('生成申请技巧时出错，请稍后重试');
    }
}

// Get application tips for specific application
async function showApplicationTips(application) {
    if (!application.jobDescription) {
        alert('没有职位描述信息，无法生成技巧');
        return;
    }
    
    try {
        showLoadingOverlay('正在生成申请技巧...');
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.generateTips}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                jobDescription: application.jobDescription,
                company: application.companyName,
                position: application.jobTitle 
            })
        });
        
        const data = await response.json();
        
        hideLoadingOverlay();
        
        if (data.tips) {
            showTipsModal(`${application.jobTitle} - ${application.companyName} 申请技巧`, data.tips);
        } else {
            alert('生成申请技巧时出错，请稍后重试');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('生成申请技巧时出错:', error);
        alert('生成申请技巧时出错，请稍后重试');
    }
}

// Create calendar reminders
async function createReminders(applications) {
    try {
        showLoadingOverlay('正在创建提醒...');
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createReminders}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ applications })
        });
        
        const data = await response.json();
        
        hideLoadingOverlay();
        
        if (data.success || data.message) {
            alert('提醒创建成功！您将在截止日期前收到通知。');
        } else {
            alert('创建提醒时出错，请稍后再试');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('创建提醒时出错:', error);
        alert('创建提醒时出错，请稍后再试');
    }
}

// Show tips modal
function showTipsModal(title, content) {
    const template = document.getElementById('tips-modal-template');
    const clone = document.importNode(template.content, true);
    
    clone.querySelector('#tips-modal-title').textContent = title;
    clone.querySelector('#tips-modal-content').innerHTML = content;
    
    document.body.appendChild(clone);
    
    // Add event listener to close button
    document.querySelector('.close-tips').addEventListener('click', () => {
        document.querySelector('.fixed.z-20.inset-0').remove();
    });
}

// Generate deadline reminders
async function generateReminders() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createReminders}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ applications })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.reminders && Array.isArray(data.reminders)) {
            // Store reminders locally
            localStorage.setItem('job-reminders', JSON.stringify(data.reminders));
            
            // Show reminders in UI
            showReminders(data.reminders);
        }
    } catch (error) {
        console.error('Error generating reminders:', error);
    }
}

// Show reminders in UI
function showReminders(reminders) {
    // Implementation depends on UI design
    console.log('Reminders generated:', reminders);
    
    // Example: show notification for first reminder
    if (reminders.length > 0) {
        const firstReminder = reminders[0];
        alert(`提醒: ${firstReminder.message}`);
    }
}

// Export applications to CSV
function exportToCSV() {
    if (applications.length === 0) {
        alert('没有可导出的申请数据');
        return;
    }
    
    // Define CSV headers
    const headers = [
        '公司名称',
        '职位名称',
        '地点',
        '申请日期',
        '截止日期',
        '状态',
        '备注'
    ];
    
    // Convert applications to CSV format
    const csvContent = [
        headers.join(','),
        ...applications.map(app => [
            `"${app.companyName.replace(/"/g, '""')}"`,
            `"${app.jobTitle.replace(/"/g, '""')}"`,
            `"${(app.jobLocation || '').replace(/"/g, '""')}"`,
            app.applyDate || '',
            app.deadlineDate || '',
            statusNames[app.jobStatus] || app.jobStatus,
            `"${(app.jobNotes || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `futurepreppersapp_职位申请_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Check for upcoming deadlines
function checkDeadlines() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingDeadlines = applications
        .filter(app => app.deadlineDate && new Date(app.deadlineDate) >= today)
        .sort((a, b) => new Date(a.deadlineDate) - new Date(b.deadlineDate))
        .slice(0, 3); // Get top 3 upcoming deadlines
    
    if (upcomingDeadlines.length > 0) {
        showDeadlineReminders(upcomingDeadlines);
    }
}

// Show deadline reminders
function showDeadlineReminders(deadlines) {
    const reminderContainer = document.createElement('div');
    reminderContainer.className = 'fixed bottom-0 right-0 m-4 z-50';
    
    deadlines.forEach(deadline => {
        const deadlineDate = new Date(deadline.deadlineDate);
        const daysUntil = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
        
        const reminderCard = document.createElement('div');
        reminderCard.className = 'bg-yellow-50 rounded-lg shadow-lg p-4 mb-2 border-l-4 border-yellow-500 max-w-sm';
        reminderCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-medium text-yellow-800">${deadline.companyName} - ${deadline.jobTitle}</h3>
                    <p class="text-sm text-yellow-600">
                        截止日期: ${deadline.deadlineDate} (${daysUntil}天后)
                    </p>
                </div>
                <button class="text-yellow-500 hover:text-yellow-700 close-reminder">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mt-2 text-sm text-gray-600">
                截止日期: ${deadline.deadlineDate}
            </div>
        `;
        
        reminderContainer.appendChild(reminderCard);
    });
    
    document.body.appendChild(reminderContainer);
    
    // Add event listeners to close buttons
    reminderContainer.querySelectorAll('.close-reminder').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.bg-yellow-50').remove();
            if (reminderContainer.children.length === 0) {
                reminderContainer.remove();
            }
        });
    });
}

// Toggle deadline sort
function toggleDeadlineSort() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    currentSortField = 'deadline';
    
    // Update sort button text
    const sortBtn = document.getElementById('sort-by-deadline-btn');
    sortBtn.innerHTML = `<i class="fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} mr-2"></i> 按截止${sortDirection === 'asc' ? '早→晚' : '晚→早'}`;
    
    renderApplications();
}

// Helper functions for loading overlay
function showLoadingOverlay(message = '加载中...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
            <div class="loading-spinner mb-3"></div>
            <div class="text-white">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

// Initialize the job tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initJobTracker();
    
    // Add event listeners for additional functionality
    document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
    document.getElementById('check-deadlines-btn')?.addEventListener('click', checkDeadlines);
    
    // Check deadlines on page load
    setTimeout(checkDeadlines, 1000);
});
