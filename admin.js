document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const offlineBanner = document.getElementById('offline-banner');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const adminIndicator = document.getElementById('admin-indicator');

  // Tab Buttons
  const tabButtons = document.querySelectorAll('.dash-tab-btn');
  const tabViews = document.querySelectorAll('.dashboard-view');

  // Stats Counters
  const countTotal = document.getElementById('count-total');
  const countApproved = document.getElementById('count-approved');
  const countPending = document.getElementById('count-pending');
  const countRejected = document.getElementById('count-rejected');

  // Appointments View Elements
  const appSearch = document.getElementById('app-search');
  const appStatusFilter = document.getElementById('app-status-filter');
  const appDateFilter = document.getElementById('app-date-filter');
  const appTableBody = document.getElementById('app-table-body');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  // Calendar View Elements
  const calMonthYear = document.getElementById('cal-month-year');
  const calPrevBtn = document.getElementById('cal-prev');
  const calNextBtn = document.getElementById('cal-next');
  const calGrid = document.getElementById('cal-grid');
  const selectedDateLabel = document.getElementById('selected-date-label');
  const paneAppsContainer = document.getElementById('pane-apps-container');

  // Blocked Dates Elements
  const blockedForm = document.getElementById('blocked-form');
  const blockDateInput = document.getElementById('block-date');
  const blockReasonInput = document.getElementById('block-reason');
  const blockedListContainer = document.getElementById('blocked-list-container');

  // Modal Elements
  const detailModal = document.getElementById('detail-modal');
  const modalClose = document.getElementById('modal-close');
  const modalApproveBtn = document.getElementById('modal-approve-btn');
  const modalRejectBtn = document.getElementById('modal-reject-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Application State
  let isOfflineMode = false;
  let adminToken = localStorage.getItem('masquerade_admin_token') || '';
  let activeTab = 'appointments';
  let calendarDate = new Date(); // Tracks display month
  let selectedCalendarDateStr = new Date().toISOString().split('T')[0];

  const API_BASE = '/api/admin';

  // Format Helper: YYYY-MM-DD
  const formatDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Toast Generator
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  };

  // Pre-seed localStorage Mock Data for Offline Demo fallback
  const initLocalStorage = () => {
    if (!localStorage.getItem('masquerade_appointments')) {
      const todayStr = formatDateStr(new Date());
      const mockAppointments = [
        {
          id: 'mock-1',
          referenceNumber: 'MD-20260602-X9A2',
          patientName: 'Sarah Connor',
          phone: '0987654321',
          email: 'sarah@skynet.com',
          date: todayStr,
          timeSlot: '10:00 - 11:00',
          treatment: 'Dental Checkup',
          notes: 'Routine checkup and diagnosis.',
          status: 'Approved',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-2',
          referenceNumber: 'MD-20260602-B8F1',
          patientName: 'John Doe',
          phone: '09542276777',
          email: 'john.doe@example.com',
          date: todayStr,
          timeSlot: '13:00 - 14:00',
          treatment: 'Root Canal Treatment',
          notes: 'Severe pain on lower molar.',
          status: 'Pending',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('masquerade_appointments', JSON.stringify(mockAppointments));
    }

    if (!localStorage.getItem('masquerade_blocked_dates')) {
      localStorage.setItem('masquerade_blocked_dates', JSON.stringify([
        {
          id: 'block-1',
          date: '2026-12-25',
          reason: 'Christmas Holiday Closure',
          createdAt: new Date().toISOString()
        }
      ]));
    }
  };

  // Get local storage helpers
  const getLocalAppointments = () => JSON.parse(localStorage.getItem('masquerade_appointments') || '[]');
  const getLocalBlockedDates = () => JSON.parse(localStorage.getItem('masquerade_blocked_dates') || '[]');

  // Check connection health and determine mode
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        isOfflineMode = false;
        if (offlineBanner) offlineBanner.style.display = 'none';
        adminIndicator.className = 'admin-badge-indicator';
        adminIndicator.textContent = 'Administrator Live';
      } else {
        throw new Error('Not healthy');
      }
    } catch (error) {
      isOfflineMode = true;
      initLocalStorage();
      if (offlineBanner) {
        offlineBanner.style.display = 'block';
        offlineBanner.innerHTML = '● Running in Demo Mode (Local Storage Fallback — Operations fully simulated)';
      }
      adminIndicator.className = 'admin-badge-indicator demo-mode';
      adminIndicator.textContent = 'Demo Mode (Offline)';
    }

    // After deciding connection state, check if authenticated
    checkAuthState();
  };

  // Check authentication state
  const checkAuthState = () => {
    if (adminToken) {
      loginSection.style.display = 'none';
      dashboardSection.style.display = 'block';
      loadDashboardData();
    } else {
      loginSection.style.display = 'flex';
      dashboardSection.style.display = 'none';
    }
  };

  // Dashboard Stats Animator
  const animateCounter = (element, targetValue) => {
    let start = 0;
    const duration = 600;
    const stepTime = Math.abs(Math.floor(duration / (targetValue || 1)));
    
    if (targetValue === 0) {
      element.textContent = '0';
      return;
    }

    const timer = setInterval(() => {
      start++;
      element.textContent = start;
      if (start >= targetValue) {
        clearInterval(timer);
        element.textContent = targetValue;
      }
    }, stepTime);
  };

  // Fetch Dashboard Stats and Populate Cards
  const loadDashboardStats = async () => {
    if (isOfflineMode) {
      const apps = getLocalAppointments();
      const stats = {
        totalRequests: apps.length,
        approved: apps.filter(a => a.status === 'Approved').length,
        pending: apps.filter(a => a.status === 'Pending').length,
        rejected: apps.filter(a => a.status === 'Rejected').length
      };
      
      animateCounter(countTotal, stats.totalRequests);
      animateCounter(countApproved, stats.approved);
      animateCounter(countPending, stats.pending);
      animateCounter(countRejected, stats.rejected);
    } else {
      try {
        const response = await fetch(`${API_BASE}/stats`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        if (data.success) {
          animateCounter(countTotal, data.stats.totalRequests);
          animateCounter(countApproved, data.stats.approved);
          animateCounter(countPending, data.stats.pending);
          animateCounter(countRejected, data.stats.rejected);
        }
      } catch (error) {
        showToast('Error loading server stats.', 'error');
      }
    }
  };

  // Load and Render appointments lists
  const loadAppointmentsList = async () => {
    const searchVal = appSearch.value.toLowerCase().trim();
    const statusFilter = appStatusFilter.value;
    const dateFilter = appDateFilter.value;

    appTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Loading appointments...</td></tr>';

    if (isOfflineMode) {
      setTimeout(() => {
        let appointments = getLocalAppointments();
        
        // Filter elements
        if (statusFilter) {
          appointments = appointments.filter(a => a.status === statusFilter);
        }
        if (dateFilter) {
          appointments = appointments.filter(a => a.date === dateFilter);
        }
        if (searchVal) {
          appointments = appointments.filter(a => 
            a.patientName.toLowerCase().includes(searchVal) || 
            a.referenceNumber.toLowerCase().includes(searchVal) ||
            a.phone.includes(searchVal)
          );
        }

        // Sort by date then slot
        appointments.sort((a,b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));
        renderAppointmentsTable(appointments);
      }, 200);

    } else {
      try {
        let url = `${API_BASE}/appointments?`;
        if (searchVal) url += `search=${encodeURIComponent(searchVal)}&`;
        if (statusFilter) url += `status=${statusFilter}&`;
        if (dateFilter) url += `date=${dateFilter}&`;

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        if (data.success) {
          renderAppointmentsTable(data.appointments);
        } else {
          appTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--clr-danger);">${data.message}</td></tr>`;
        }
      } catch (error) {
        appTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--clr-danger);">Error fetching appointments from server.</td></tr>';
      }
    }
  };

  // Render Table helper
  const renderAppointmentsTable = (appointments) => {
    appTableBody.innerHTML = '';
    
    if (appointments.length === 0) {
      appTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--clr-neutral-600);">No appointments found matching your search.</td></tr>';
      return;
    }

    appointments.forEach(app => {
      const isPending = app.status === 'Pending';
      const statusClass = app.status.toLowerCase();

      const row = `
        <tr data-id="${app.id || app._id}">
          <td style="font-weight: 700; font-family: monospace;">${app.referenceNumber}</td>
          <td style="font-weight: 600; color: var(--clr-primary-900);">${app.patientName}</td>
          <td>${app.date}</td>
          <td style="font-weight: 600;">${app.timeSlot}</td>
          <td>${app.treatment}</td>
          <td><span class="status-badge ${statusClass}">${app.status}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-icon view-btn" title="View Details"><i class="fas fa-eye"></i></button>
              ${isPending ? `
                <button class="btn-icon approve-btn" title="Approve Request"><i class="fas fa-check"></i></button>
                <button class="btn-icon reject-btn" title="Reject Request"><i class="fas fa-times"></i></button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
      appTableBody.insertAdjacentHTML('beforeend', row);
    });

    // Add click listeners to row actions
    appTableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        openDetailModal(id);
      });
    });

    appTableBody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        handleApproveAppointment(id);
      });
    });

    appTableBody.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        handleRejectAppointment(id);
      });
    });
  };

  // Retrieve Appointment details by ID
  const getAppointmentById = async (id) => {
    if (isOfflineMode) {
      return getLocalAppointments().find(a => a.id === id);
    } else {
      try {
        const response = await fetch(`${API_BASE}/appointments?search=${id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        if (data.success) {
          return data.appointments.find(a => a._id === id);
        }
      } catch (error) {
        showToast('Error retrieving appointment details.', 'error');
      }
    }
    return null;
  };

  // Open Appointment details Modal
  const openDetailModal = async (id) => {
    const app = await getAppointmentById(id);
    if (!app) return;

    document.getElementById('modal-ref').textContent = app.referenceNumber;
    document.getElementById('modal-name').textContent = app.patientName;
    document.getElementById('modal-phone').textContent = app.phone;
    document.getElementById('modal-email').textContent = app.email;
    document.getElementById('modal-date').textContent = app.date;
    document.getElementById('modal-slot').textContent = app.timeSlot;
    document.getElementById('modal-treatment').textContent = app.treatment;
    
    const badge = document.getElementById('modal-status-badge');
    badge.className = `status-badge ${app.status.toLowerCase()}`;
    badge.textContent = app.status;

    document.getElementById('modal-notes').textContent = app.notes || 'No additional notes provided.';

    // Manage buttons visibility based on status
    if (app.status === 'Pending') {
      modalApproveBtn.style.display = 'block';
      modalRejectBtn.style.display = 'block';
      
      // Store current ID on buttons for click handlers
      modalApproveBtn.dataset.id = id;
      modalRejectBtn.dataset.id = id;
    } else {
      modalApproveBtn.style.display = 'none';
      modalRejectBtn.style.display = 'none';
    }

    detailModal.style.display = 'flex';
  };

  // Close Modal
  const closeDetailModal = () => {
    detailModal.style.display = 'none';
  };

  modalClose.addEventListener('click', closeDetailModal);
  window.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  // Action Click Handler: Approve Appointment
  const handleApproveAppointment = async (id) => {
    if (confirm('Are you sure you want to APPROVE this appointment? This permanently books the time slot.')) {
      if (isOfflineMode) {
        const apps = getLocalAppointments();
        const app = apps.find(a => a.id === id);
        if (!app) return;

        // Check if double booking
        const doubleBooked = apps.some(a => a.date === app.date && a.timeSlot === app.timeSlot && a.status === 'Approved' && a.id !== id);
        if (doubleBooked) {
          showToast('Cannot approve: Slot already approved for another patient.', 'error');
          return;
        }

        app.status = 'Approved';
        
        // Auto reject conflicting pending appointments
        apps.forEach(a => {
          if (a.date === app.date && a.timeSlot === app.timeSlot && a.status === 'Pending' && a.id !== id) {
            a.status = 'Rejected';
          }
        });

        localStorage.setItem('masquerade_appointments', JSON.stringify(apps));
        showToast('Appointment approved successfully. Notification logged to console.', 'success');
        closeDetailModal();
        loadDashboardData();
      } else {
        try {
          const response = await fetch(`${API_BASE}/appointments/${id}/approve`, {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          if (data.success) {
            showToast('Appointment approved. Confirmation email triggered.', 'success');
            closeDetailModal();
            loadDashboardData();
          } else {
            showToast(data.message, 'error');
          }
        } catch (error) {
          showToast('Server error processing approval.', 'error');
        }
      }
    }
  };

  // Action Click Handler: Reject Appointment
  const handleRejectAppointment = async (id) => {
    if (confirm('Are you sure you want to REJECT this appointment request?')) {
      if (isOfflineMode) {
        const apps = getLocalAppointments();
        const app = apps.find(a => a.id === id);
        if (!app) return;

        app.status = 'Rejected';
        localStorage.setItem('masquerade_appointments', JSON.stringify(apps));
        showToast('Appointment rejected. Notification logged to console.', 'error');
        closeDetailModal();
        loadDashboardData();
      } else {
        try {
          const response = await fetch(`${API_BASE}/appointments/${id}/reject`, {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          if (data.success) {
            showToast('Appointment rejected. Reschedule notification sent.', 'success');
            closeDetailModal();
            loadDashboardData();
          } else {
            showToast(data.message, 'error');
          }
        } catch (error) {
          showToast('Server error processing rejection.', 'error');
        }
      }
    }
  };

  // Modal Action Listeners
  modalApproveBtn.addEventListener('click', () => {
    handleApproveAppointment(modalApproveBtn.dataset.id);
  });

  modalRejectBtn.addEventListener('click', () => {
    handleRejectAppointment(modalRejectBtn.dataset.id);
  });

  // CUSTOM INTERACTIVE CALENDAR GENERATION
  const renderCalendar = async () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // Set Month Year Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    calMonthYear.textContent = `${monthNames[month]} ${year}`;

    calGrid.innerHTML = '';

    // First day of month offset
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday
    // Adjust index so Mon=0, Tue=1, ..., Sun=6
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    // Number of days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render offsets
    for (let i = 0; i < startOffset; i++) {
      calGrid.insertAdjacentHTML('beforeend', '<div class="calendar-cell empty"></div>');
    }

    // Load blocked dates and appointments for cell labeling
    let blockedDates = [];
    let appointments = [];

    if (isOfflineMode) {
      blockedDates = getLocalBlockedDates();
      appointments = getLocalAppointments();
    } else {
      try {
        const blResponse = await fetch(`${API_BASE}/blocked-dates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const blData = await blResponse.json();
        if (blData.success) blockedDates = blData.blockedDates;

        const appResponse = await fetch(`${API_BASE}/appointments`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const appData = await appResponse.json();
        if (appData.success) appointments = appData.appointments;
      } catch (error) {
        console.error('Error fetching data for calendar grid.');
      }
    }

    // Fill days
    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(year, month, day);
      const cellDateStr = formatDateStr(cellDate);

      // Check if blocked
      const isBlocked = blockedDates.some(b => b.date === cellDateStr);
      const blockInfo = blockedDates.find(b => b.date === cellDateStr);

      // Aggregate counts
      const dayApps = appointments.filter(a => a.date === cellDateStr);
      const approvedCount = dayApps.filter(a => a.status === 'Approved').length;
      const pendingCount = dayApps.filter(a => a.status === 'Pending').length;

      const isToday = cellDateStr === formatDateStr(new Date());
      const isSelected = cellDateStr === selectedCalendarDateStr;

      let cellHTML = `
        <div class="calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}" data-date="${cellDateStr}">
          <div class="day-number">${day}</div>
          <div class="cell-indicators">
      `;

      if (isBlocked) {
        cellHTML += `<span class="indicator-pill block-label" title="${blockInfo.reason}">BLOCKED</span>`;
      } else {
        if (approvedCount > 0) {
          cellHTML += `<span class="indicator-pill app">${approvedCount} Approved</span>`;
        }
        if (pendingCount > 0) {
          cellHTML += `<span class="indicator-pill pen">${pendingCount} Pending</span>`;
        }
      }

      cellHTML += `
          </div>
        </div>
      `;

      calGrid.insertAdjacentHTML('beforeend', cellHTML);
    }

    // Add click listeners to cells
    calGrid.querySelectorAll('.calendar-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const clickedCell = e.target.closest('.calendar-cell');
        
        calGrid.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
        clickedCell.classList.add('selected');
        
        selectedCalendarDateStr = clickedCell.dataset.date;
        loadCalendarDayDetails(selectedCalendarDateStr);
      });
    });

    // Populate Sidebar Details for initially selected date
    loadCalendarDayDetails(selectedCalendarDateStr);
  };

  // Load calendar Day Details pane (right side of calendar)
  const loadCalendarDayDetails = async (dateStr) => {
    selectedDateLabel.textContent = dateStr;
    paneAppsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--clr-neutral-600);">Loading...</div>';

    let dayApps = [];
    let isDateBlocked = false;
    let blockReason = '';

    if (isOfflineMode) {
      dayApps = getLocalAppointments().filter(a => a.date === dateStr);
      const blocked = getLocalBlockedDates().find(b => b.date === dateStr);
      if (blocked) {
        isDateBlocked = true;
        blockReason = blocked.reason;
      }
    } else {
      try {
        const response = await fetch(`${API_BASE}/appointments?date=${dateStr}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        if (data.success) dayApps = data.appointments;

        const blResponse = await fetch(`${API_BASE}/blocked-dates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const blData = await blResponse.json();
        if (blData.success) {
          const block = blData.blockedDates.find(b => b.date === dateStr);
          if (block) {
            isDateBlocked = true;
            blockReason = block.reason;
          }
        }
      } catch (error) {
        paneAppsContainer.innerHTML = '<div style="color: var(--clr-danger); padding: 10px;">Error fetching details.</div>';
        return;
      }
    }

    paneAppsContainer.innerHTML = '';

    if (isDateBlocked) {
      paneAppsContainer.innerHTML = `
        <div style="background-color: #fef2f2; border: 1.5px solid var(--clr-danger-bg); border-radius: var(--border-radius-sm); padding: 20px; text-align: center; color: var(--clr-danger);">
          <i class="fas fa-ban" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
          <strong>Date is Blocked</strong>
          <p style="font-size: 0.85rem; margin-top: 5px; color: var(--clr-neutral-800);">${blockReason}</p>
        </div>
      `;
      return;
    }

    if (dayApps.length === 0) {
      paneAppsContainer.innerHTML = `
        <div class="pane-empty-state">
          <i class="far fa-calendar-times"></i>
          <p>No appointments booked for this day.</p>
        </div>
      `;
      return;
    }

    // Sort day appointments by time slot
    dayApps.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot));

    dayApps.forEach(app => {
      const isPending = app.status === 'Pending';
      const statusClass = app.status.toLowerCase();
      
      const appCard = `
        <div class="pane-app-card" data-id="${app.id || app._id}">
          <div class="pane-app-header">
            <span class="pane-app-time"><i class="far fa-clock"></i> ${app.timeSlot}</span>
            <span class="status-badge ${statusClass}">${app.status}</span>
          </div>
          <div class="pane-app-body">
            <h5>${app.patientName}</h5>
            <p><strong>Treatment:</strong> ${app.treatment}</p>
            <p><strong>Contact:</strong> ${app.phone} | ${app.email}</p>
            <p><strong>Ref:</strong> ${app.referenceNumber}</p>
            ${app.notes ? `<div class="pane-app-notes"><strong>Notes:</strong> ${app.notes}</div>` : ''}
          </div>
          ${isPending ? `
            <div class="pane-app-actions">
              <button class="btn btn-primary approve-pane-btn" style="padding: 6px 14px; font-size: 0.8rem;"><i class="fas fa-check"></i> Approve</button>
              <button class="btn btn-outline reject-pane-btn" style="padding: 6px 14px; font-size: 0.8rem; border-width: 1px;"><i class="fas fa-times"></i> Reject</button>
            </div>
          ` : ''}
        </div>
      `;
      paneAppsContainer.insertAdjacentHTML('beforeend', appCard);
    });

    // Add Sidebar action click handlers
    paneAppsContainer.querySelectorAll('.approve-pane-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.pane-app-card').dataset.id;
        handleApproveAppointment(id);
      });
    });

    paneAppsContainer.querySelectorAll('.reject-pane-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.pane-app-card').dataset.id;
        handleRejectAppointment(id);
      });
    });
  };

  // Calendar display Month navigation
  calPrevBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });

  calNextBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // BLOCKED DATES PANEL MANAGEMENT
  const loadBlockedDates = async () => {
    blockedListContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--clr-neutral-600);">Loading blocked dates...</div>';

    let blockedDates = [];

    if (isOfflineMode) {
      blockedDates = getLocalBlockedDates();
    } else {
      try {
        const response = await fetch(`${API_BASE}/blocked-dates`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        if (data.success) blockedDates = data.blockedDates;
      } catch (error) {
        blockedListContainer.innerHTML = '<div style="color: var(--clr-danger); padding: 10px;">Error loading blocked dates.</div>';
        return;
      }
    }

    blockedListContainer.innerHTML = '';

    if (blockedDates.length === 0) {
      blockedListContainer.innerHTML = '<p style="text-align: center; color: var(--clr-neutral-600); padding: 20px;">No dates are currently blocked.</p>';
      return;
    }

    blockedDates.forEach(block => {
      const item = `
        <div class="blocked-date-item" data-date="${block.date}">
          <div class="blocked-date-text">
            <h5>${block.date}</h5>
            <p><strong>Reason:</strong> ${block.reason}</p>
          </div>
          <button class="btn btn-outline unblock-btn" style="padding: 6px 12px; font-size: 0.8rem; border-color: var(--clr-danger); color: var(--clr-danger);">
            <i class="fas fa-trash-alt"></i> Unblock
          </button>
        </div>
      `;
      blockedListContainer.insertAdjacentHTML('beforeend', item);
    });

    // Add unblock listeners
    blockedListContainer.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const date = e.target.closest('.blocked-date-item').dataset.date;
        handleUnblockDate(date);
      });
    });
  };

  // Action Click Handler: Block a new Date
  blockedForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = blockDateInput.value;
    const reasonVal = blockReasonInput.value.trim();

    if (!dateVal || !reasonVal) {
      alert('Please fill out all blocked date fields.');
      return;
    }

    if (isOfflineMode) {
      const blocked = getLocalBlockedDates();
      
      if (blocked.some(b => b.date === dateVal)) {
        showToast('This date is already blocked.', 'error');
        return;
      }

      const newBlock = {
        id: 'block-' + Math.random().toString(36).substring(7),
        date: dateVal,
        reason: reasonVal,
        createdAt: new Date().toISOString()
      };

      blocked.push(newBlock);
      localStorage.setItem('masquerade_blocked_dates', JSON.stringify(blocked));

      // Auto-reject conflicting pending appointments in localStorage
      const apps = getLocalAppointments();
      apps.forEach(a => {
        if (a.date === dateVal && a.status === 'Pending') {
          a.status = 'Rejected';
        }
      });
      localStorage.setItem('masquerade_appointments', JSON.stringify(apps));

      showToast(`Date ${dateVal} successfully blocked. Conflicting pending bookings auto-rejected.`, 'success');
      blockedForm.reset();
      loadDashboardData();
    } else {
      try {
        const response = await fetch(`${API_BASE}/blocked-dates`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date: dateVal, reason: reasonVal })
        });
        const data = await response.json();
        
        if (response.status === 201 && data.success) {
          showToast(`Date ${dateVal} blocked successfully. Conflicting bookings auto-rejected.`, 'success');
          blockedForm.reset();
          loadDashboardData();
        } else {
          showToast(data.message, 'error');
        }
      } catch (error) {
        showToast('Server error blocking date.', 'error');
      }
    }
  });

  // Action Click Handler: Unblock Date
  const handleUnblockDate = async (date) => {
    if (confirm(`Are you sure you want to unblock ${date}? Slots will become available again.`)) {
      if (isOfflineMode) {
        let blocked = getLocalBlockedDates();
        blocked = blocked.filter(b => b.date !== date);
        localStorage.setItem('masquerade_blocked_dates', JSON.stringify(blocked));
        showToast(`Date ${date} has been unblocked.`, 'success');
        loadDashboardData();
      } else {
        try {
          const response = await fetch(`${API_BASE}/blocked-dates/${date}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
          const data = await response.json();
          if (data.success) {
            showToast(`Date ${date} unblocked successfully.`, 'success');
            loadDashboardData();
          } else {
            showToast(data.message, 'error');
          }
        } catch (error) {
          showToast('Server error unblocking date.', 'error');
        }
      }
    }
  };

  // EXPORT APPOINTMENTS TO CSV / EXCEL FALLBACK
  exportCsvBtn.addEventListener('click', async () => {
    if (isOfflineMode) {
      const appointments = getLocalAppointments();
      appointments.sort((a,b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));

      let csv = 'Reference ID,Patient Name,Phone,Email,Date,Time Slot,Treatment,Status,Notes,Created At\n';
      
      appointments.forEach(app => {
        const name = `"${app.patientName.replace(/"/g, '""')}"`;
        const phone = `"${app.phone.replace(/"/g, '""')}"`;
        const email = `"${app.email.replace(/"/g, '""')}"`;
        const notes = `"${(app.notes || '').replace(/"/g, '""')}"`;
        csv += `${app.referenceNumber},${name},${phone},${email},${app.date},"${app.timeSlot}","${app.treatment}",${app.status},${notes},"${app.createdAt}"\n`;
      });

      // Browser local trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'masquerade_appointments_demo_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV downloaded successfully.', 'success');
    } else {
      // Live server CSV direct trigger
      try {
        // Since download is a GET attachment request, we can append token to query to authenticate
        window.location.href = `${API_BASE}/export-csv?Authorization=Bearer ${adminToken}`;
        showToast('CSV Export triggered from live server.', 'success');
      } catch (error) {
        showToast('Error exporting CSV.', 'error');
      }
    }
  });

  // Admin login request submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameVal = document.getElementById('username').value.trim();
    const passwordVal = document.getElementById('password').value;

    if (isOfflineMode) {
      // Simulated Local Storage auth
      setTimeout(() => {
        if (usernameVal === 'admin' && passwordVal === 'dentaladmin123') {
          adminToken = 'dummy-jwt-token-key-offline-' + Math.random().toString(36).substring(7);
          localStorage.setItem('masquerade_admin_token', adminToken);
          showToast('Authenticated as Admin (Demo Mode)', 'success');
          loginForm.reset();
          checkAuthState();
        } else {
          showToast('Invalid credentials. Use admin / dentaladmin123.', 'error');
        }
      }, 300);
    } else {
      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameVal, password: passwordVal })
        });
        const data = await response.json();

        if (response.ok && data.success) {
          adminToken = data.token;
          localStorage.setItem('masquerade_admin_token', adminToken);
          showToast('Login successful.', 'success');
          loginForm.reset();
          checkAuthState();
        } else {
          showToast(data.message || 'Login failed.', 'error');
        }
      } catch (error) {
        showToast('Server connection failed.', 'error');
      }
    }
  });

  // Log Out Btn Action
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      adminToken = '';
      localStorage.removeItem('masquerade_admin_token');
      // If live, clear token cookie as well
      document.cookie = "adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      showToast('Logged out of Admin Portal.', 'info');
      checkAuthState();
    });
  }

  // Load All Active view data
  const loadDashboardData = () => {
    loadDashboardStats();

    if (activeTab === 'appointments') {
      loadAppointmentsList();
    } else if (activeTab === 'calendar') {
      renderCalendar();
    } else if (activeTab === 'blocked-dates') {
      loadBlockedDates();
    }
  };

  // Nav Tab Bar Click Listener
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      const targetTab = e.target.dataset.tab;
      activeTab = targetTab;
      
      e.target.classList.add('active');
      document.getElementById(`${targetTab}-view`).classList.add('active');

      loadDashboardData();
    });
  });

  // Event Listeners: Filters
  appSearch.addEventListener('input', loadAppointmentsList);
  appStatusFilter.addEventListener('change', loadAppointmentsList);
  appDateFilter.addEventListener('change', loadAppointmentsList);

  // Trigger initial check
  checkBackendHealth();
});
