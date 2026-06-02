document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const hamburgerBtn = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  const offlineBanner = document.getElementById('offline-banner');
  const bookingForm = document.getElementById('appointment-form');
  const bookingDateInput = document.getElementById('booking-date');
  const slotsGrid = document.getElementById('slots-grid');
  const slotsContainer = document.getElementById('slots-container');
  const successCard = document.getElementById('success-card');
  const successRef = document.getElementById('success-ref');
  const bookingFormCard = document.getElementById('booking-form-card');
  const newBookingBtn = document.getElementById('new-booking-btn');

  // Working State
  let isOfflineMode = false;
  const API_BASE = '/api/appointments';

  // Set minimum date to today in the date picker
  const today = new Date().toISOString().split('T')[0];
  bookingDateInput.min = today;
  bookingDateInput.value = today;

  // Initialize Mobile Menu Toggle
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      hamburgerBtn.classList.toggle('active');
    });
  }

  // Pre-seed localStorage Mock Data for Offline Demo fallback
  const preseedLocalStorage = () => {
    if (!localStorage.getItem('masquerade_appointments')) {
      const mockAppointments = [
        {
          id: 'mock-1',
          referenceNumber: 'MD-20260602-X9A2',
          patientName: 'Sarah Connor',
          phone: '0987654321',
          email: 'sarah@skynet.com',
          date: today,
          timeSlot: '10:00 - 11:00',
          treatment: 'Dental Checkup',
          notes: 'Routine checkup',
          status: 'Approved',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-2',
          referenceNumber: 'MD-20260602-B8F1',
          patientName: 'John Doe',
          phone: '09542276777',
          email: 'john.doe@example.com',
          date: today,
          timeSlot: '13:00 - 14:00',
          treatment: 'Root Canal Treatment',
          notes: 'Severe pain on lower molar',
          status: 'Pending',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('masquerade_appointments', JSON.stringify(mockAppointments));
    }

    if (!localStorage.getItem('masquerade_blocked_dates')) {
      const mockBlocked = [
        {
          id: 'block-1',
          date: '2026-12-25',
          reason: 'Christmas Holiday Closure',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('masquerade_blocked_dates', JSON.stringify(mockBlocked));
    }
  };

  // Helper: Get local storage collections
  const getLocalAppointments = () => JSON.parse(localStorage.getItem('masquerade_appointments') || '[]');
  const getLocalBlockedDates = () => JSON.parse(localStorage.getItem('masquerade_blocked_dates') || '[]');

  // Check connection health and determine mode
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        console.log('Connected to Masquerade Dental live backend API.');
        isOfflineMode = false;
        if (offlineBanner) offlineBanner.style.display = 'none';
      } else {
        throw new Error('Not Ok response');
      }
    } catch (error) {
      console.log('Backend API unreachable. Initializing Offline Demo/Local Storage mode.');
      isOfflineMode = true;
      preseedLocalStorage();
      if (offlineBanner) {
        offlineBanner.style.display = 'block';
        offlineBanner.innerHTML = '● Running in Demo Mode (Local Storage Fallback — No active server connection)';
      }
    }
    // Perform initial slots load for selected date
    loadAvailableSlots(bookingDateInput.value);
  };

  // Generate reference number inside Local Storage (Mock)
  const generateMockRef = (date) => {
    const cleanDate = date.replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `MD-${cleanDate}-${rand}`;
  };

  // Fetch and display available slots
  const loadAvailableSlots = async (selectedDate) => {
    if (!selectedDate) return;

    slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-neutral-600);">Loading available slots...</div>';

    if (isOfflineMode) {
      // MOCK LOCAL STORAGE SLOT CALCULATION
      setTimeout(() => {
        const blockedDates = getLocalBlockedDates();
        const isBlocked = blockedDates.some(b => b.date === selectedDate);

        if (isBlocked) {
          const blockInfo = blockedDates.find(b => b.date === selectedDate);
          slotsGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-danger); font-weight: 600;">Clinic Closed: ${blockInfo.reason}</div>`;
          return;
        }

        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay();
        
        // standard business slots
        const baseSlots = dayOfWeek === 0 
          ? ['10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00']
          : ['10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00'];

        const appointments = getLocalAppointments().filter(app => app.date === selectedDate);
        
        const approved = new Set(appointments.filter(a => a.status === 'Approved').map(a => a.timeSlot));
        const pending = new Set(appointments.filter(a => a.status === 'Pending').map(a => a.timeSlot));

        renderSlotsHTML(baseSlots.map(slot => {
          let status = 'Available';
          if (approved.has(slot)) status = 'Booked';
          else if (pending.has(slot)) status = 'Pending';
          return { timeSlot: slot, status };
        }));
      }, 300);

    } else {
      // LIVE BACKEND CALL
      try {
        const response = await fetch(`${API_BASE}/slots?date=${selectedDate}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.isBlocked) {
            slotsGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-danger); font-weight: 600;">Clinic Closed: ${data.reason}</div>`;
            return;
          }
          renderSlotsHTML(data.slots);
        } else {
          slotsGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-danger); font-weight: 600;">${data.message}</div>`;
        }
      } catch (error) {
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-danger); font-weight: 600;">Error retrieving available slots.</div>';
      }
    }
  };

  // Render Slots HTML Grid Helper
  const renderSlotsHTML = (slots) => {
    slotsGrid.innerHTML = '';
    
    if (slots.length === 0) {
      slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 20px; color: var(--clr-neutral-600);">No slots available on this date.</div>';
      return;
    }

    slots.forEach((slot, index) => {
      const isBooked = slot.status === 'Booked';
      const isPending = slot.status === 'Pending';
      const statusClass = slot.status.toLowerCase();
      const inputId = `slot-${index}`;

      const slotHTML = `
        <div class="slot-chip">
          <input 
            type="radio" 
            name="timeSlot" 
            value="${slot.timeSlot}" 
            id="${inputId}" 
            ${isBooked ? 'disabled' : ''}
            required
          >
          <label for="${inputId}" class="slot-chip-label ${statusClass}">
            <span>${slot.timeSlot}</span>
            <span class="slot-chip-status">${slot.status}</span>
          </label>
        </div>
      `;
      slotsGrid.insertAdjacentHTML('beforeend', slotHTML);
    });
  };

  // Event Listener: Date selection changed
  bookingDateInput.addEventListener('change', (e) => {
    loadAvailableSlots(e.target.value);
  });

  // Handle booking form submission
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedSlotInput = document.querySelector('input[name="timeSlot"]:checked');
    if (!selectedSlotInput) {
      alert('Please select an appointment time slot.');
      return;
    }

    const payload = {
      patientName: document.getElementById('patient-name').value.trim(),
      phone: document.getElementById('patient-phone').value.trim(),
      email: document.getElementById('patient-email').value.trim(),
      date: bookingDateInput.value,
      timeSlot: selectedSlotInput.value,
      treatment: document.getElementById('treatment-type').value,
      notes: document.getElementById('additional-notes').value.trim()
    };

    // Submit request loading state
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting Request...';

    if (isOfflineMode) {
      // OFFLINE STORAGE BOOKING SUBMISSION
      setTimeout(() => {
        const apps = getLocalAppointments();
        
        // Double check Approved status for double booking
        const doubleBooked = apps.some(a => a.date === payload.date && a.timeSlot === payload.timeSlot && a.status === 'Approved');
        if (doubleBooked) {
          alert('Cannot book: this slot was already booked and approved. Please pick another.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          return;
        }

        const ref = generateMockRef(payload.date);
        const newApp = {
          id: 'app-' + Math.random().toString(36).substring(7),
          referenceNumber: ref,
          ...payload,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };

        apps.push(newApp);
        localStorage.setItem('masquerade_appointments', JSON.stringify(apps));

        // Show Success card
        bookingFormCard.style.display = 'none';
        successCard.style.display = 'flex';
        successRef.textContent = ref;

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        bookingForm.reset();
      }, 500);

    } else {
      // ONLINE LIVE SERVER BOOKING SUBMISSION
      try {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.status === 201 && data.success) {
          bookingFormCard.style.display = 'none';
          successCard.style.display = 'flex';
          successRef.textContent = data.data.referenceNumber;
          bookingForm.reset();
        } else {
          alert(data.message || 'Error occurred while booking appointment.');
        }
      } catch (error) {
        alert('Server unreachable. Unable to complete live booking.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });

  // Handle "Book Another Appointment" click
  if (newBookingBtn) {
    newBookingBtn.addEventListener('click', () => {
      successCard.style.display = 'none';
      bookingFormCard.style.display = 'block';
      loadAvailableSlots(bookingDateInput.value);
    });
  }

  // Trigger initial check
  checkBackendHealth();
});
