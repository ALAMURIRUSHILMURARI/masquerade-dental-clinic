const nodemailer = require('nodemailer');

// Setup Nodemailer transporter with dynamic configuration from .env
// If no credentials, we fallback to console logging
const getTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Return a mock transporter that logs to console
    return {
      sendMail: async (options) => {
        console.log('\n--- EMAIL NOTIFICATION (MOCK) ---');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`From: ${options.from || 'Masquerade Dental'}`);
        console.log(`Body (HTML length): ${options.html.length} characters`);
        console.log('--- END OF EMAIL ---\n');
        return { messageId: 'mock-id-' + Math.random().toString(36).substring(7) };
      }
    };
  }
};

/**
 * Sends a premium-designed appointment confirmation email
 */
const sendConfirmationEmail = async (appointment) => {
  try {
    const transporter = await getTransporter();
    const from = process.env.SMTP_FROM || '"Masquerade Dental Hospital" <appointments@masqueradedental.com>';
    
    const htmlContent = `
      <div style="font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f9; padding: 30px 15px; color: #2b3a4a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 35px 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Appointment Confirmed</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px;">Masquerade® Dental Hospital — NABH Accredited</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; line-height: 1.6;">
            <h2 style="color: #1e3c72; margin-top: 0; font-size: 20px;">Hello, ${appointment.patientName}!</h2>
            <p style="font-size: 15px; color: #4a5568;">Your appointment request at <strong>Masquerade® Dental Hospital</strong> has been approved and successfully booked. Below are your booking details:</p>
            
            <!-- Details Card -->
            <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4a5568; width: 40%;">Reference Number:</td>
                  <td style="padding: 6px 0; color: #2d3748; font-weight: 700; font-family: monospace; font-size: 16px;">${appointment.referenceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Date:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${appointment.date}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Time Slot:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${appointment.timeSlot}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4a5568;">Treatment:</td>
                  <td style="padding: 6px 0; color: #2d3748;">${appointment.treatment}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #718096; margin-bottom: 25px;">
              * Please arrive 10 minutes prior to your scheduled time slot for initial screening. If you need to reschedule or cancel, please call us directly at <strong>095422 76777</strong>.
            </p>

            <div style="text-align: center;">
              <a href="https://masqueradedental.com" style="background: #3182ce; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 3px 6px rgba(49, 130, 206, 0.3);">Visit Hospital Website</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #edf2f7; text-align: center; padding: 20px; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 5px 0;"><strong>Masquerade® Dental Hospital</strong></p>
            <p style="margin: 0;">Guntur, Andhra Pradesh, India | Phone: 095422 76777 | contact@masqueradedental.com</p>
            <p style="margin: 10px 0 0 0; font-size: 10px; opacity: 0.8;">© 2026 Masquerade Dental. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: appointment.email,
      subject: `Confirmed: Appointment booking reference ${appointment.referenceNumber} - Masquerade Dental`,
      html: htmlContent
    });
    console.log(`Confirmation email sent successfully to ${appointment.email}`);
  } catch (error) {
    console.error(`Error sending confirmation email: ${error.message}`);
  }
};

/**
 * Sends a premium-designed appointment rejection email
 */
const sendRejectionEmail = async (appointment) => {
  try {
    const transporter = await getTransporter();
    const from = process.env.SMTP_FROM || '"Masquerade Dental Hospital" <appointments@masqueradedental.com>';
    
    const htmlContent = `
      <div style="font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f9; padding: 30px 15px; color: #2b3a4a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 35px 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Appointment Reschedule Required</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px;">Masquerade® Dental Hospital — NABH Accredited</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; line-height: 1.6;">
            <h2 style="color: #c53030; margin-top: 0; font-size: 20px;">Hello, ${appointment.patientName}!</h2>
            <p style="font-size: 15px; color: #4a5568;">Thank you for requesting an appointment with <strong>Masquerade® Dental Hospital</strong>.</p>
            <p style="font-size: 15px; color: #4a5568;">We regret to inform you that we are unable to accommodate your booking for the requested slot: <strong>${appointment.date} at ${appointment.timeSlot}</strong>. This may be due to emergency surgeries, clinic schedules, or pre-existing bookings.</p>
            
            <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #7b341e;">
              <strong>Reference ID:</strong> ${appointment.referenceNumber}<br>
              <strong>Status:</strong> Not Available / Rejected
            </div>

            <p style="font-size: 15px; color: #4a5568; margin-bottom: 25px;">
              We value your oral health and would love to accommodate you at another time! Please visit our booking portal to select another date or time slot, or contact our support team.
            </p>

            <table style="width: 100%; margin-top: 25px;">
              <tr>
                <td style="text-align: center;">
                  <a href="https://masqueradedental.com/booking.html" style="background: #3182ce; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">Select New Slot</a>
                  <a href="tel:09542276777" style="background: #edf2f7; color: #2b3a4a; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: 600; display: inline-block; border: 1px solid #cbd5e0;">Call: 095422 76777</a>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #edf2f7; text-align: center; padding: 20px; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 5px 0;"><strong>Masquerade® Dental Hospital</strong></p>
            <p style="margin: 0;">Guntur, Andhra Pradesh, India | Phone: 095422 76777 | contact@masqueradedental.com</p>
            <p style="margin: 10px 0 0 0; font-size: 10px; opacity: 0.8;">© 2026 Masquerade Dental. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: appointment.email,
      subject: `Update: Appointment rescheduling request ${appointment.referenceNumber} - Masquerade Dental`,
      html: htmlContent
    });
    console.log(`Rejection/Reschedule email sent successfully to ${appointment.email}`);
  } catch (error) {
    console.error(`Error sending reschedule email: ${error.message}`);
  }
};

module.exports = {
  sendConfirmationEmail,
  sendRejectionEmail
};
