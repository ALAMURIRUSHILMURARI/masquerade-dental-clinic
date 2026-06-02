# Masquerade® Dental Hospital — Appointment Booking System

Welcome to the production-ready appointment booking system for **Masquerade® Dental Hospital** (formerly Confydentz), Guntur's premier NABH accredited centre. 

This is a modern, responsive web application built with **HTML, CSS, JavaScript** on the frontend and **Node.js, Express, MongoDB (Mongoose)** on the backend. 

> [!TIP]
> **No-Install Interactive Demo Fallback**
> If you do not have Node.js or MongoDB installed yet, **you can open `public/index.html` directly in any web browser!**
> The application will automatically detect that the backend server is offline and load into **Demo / Offline Mode** powered by `localStorage`. This allows you to explore the complete patient booking system, interactive calendar grid, statistics counters, and admin workflows instantly without compiling a single line of code!

---

## Technical Architecture & Features

- **Integrated Patient Portal**: Includes dynamic services, doctor profiles (Dr. Ranjit Kumar MDS FICOI), testimonials, blogs, and an inline booking section.
- **Dynamic Slot Availability**: Shows available slots in real-time, marks pending slots, and locks approved appointments.
- **Secure Admin Panel**: Protected by JWT authorization with custom tabular search, status toggles, and Excel-compatible CSV exports.
- **Interactive Calendar Grid**: Admins can view appointment count markers on days, click days, and approve/reject bookings from a detailed sidebar.
- **Blocked Closures Manager**: Admins can block public holidays, automatically rejecting conflicting pending bookings.
- **Console/Nodemailer notification fallbacks**: Fully functional SMTP configuration for patients.

---

## 📂 Project Structure

```
dental-clinic-booking/
├── .env                  # Configuration variables (ports, secrets, database)
├── package.json          # Node package dependencies
├── server.js             # Express core server initialization
├── test_endpoints.js    # Smoke testing & verification script
├── public/               # Public static directories
│   ├── index.html        # Patient Portal landing page & booking section
│   ├── admin.html        # Office admin dashboard panel & login
│   ├── css/
│   │   ├── styles.css    # Typography, root variables, navbar, footer
│   │   ├── patient.css   # Hero, services grid, slots selector HSL styling
│   │   └── admin.css     # Stats cards, calendar cells, pane layouts
│   └── js/
│       ├── patient.js    # Slots dynamic fetches, booking submissions, local fallback
│       └── admin.js      # Auth, stats count, calendar rendering, table search
└── src/
    ├── config/
    │   └── db.js         # Mongoose connection configuration
    ├── controllers/
    │   ├── appointmentController.js  # Patient bookings and slots mapping
    │   └── adminController.js        # Statistics, JWT login, blocked dates
    ├── models/
    │   ├── Appointment.js            # Mongoose Schema (indexed slots)
    │   └── BlockedDate.js            # Mongoose Schema (blocked dates)
    ├── routes/
    │   ├── appointmentRoutes.js      # Express patient routes
    │   └── adminRoutes.js            # Express secure admin routes
    └── utils/
        ├── referenceGenerator.js     # Unique reference generator (MD-YYYYMMDD-XXXX)
        └── emailService.js           # Nodemailer notification service (HTML template)
```

---

## 🚀 Local Installation & Setup

Follow these steps to run the live Node.js / Express / MongoDB server locally on your system:

### 1. Prerequisites
- **Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
- **MongoDB**: Download and install Community Server from [mongodb.com](https://www.mongodb.com/try/download/community) and ensure it is running on your system port `27017`.

### 2. Installation
Extract the project folder, open your command terminal in the folder directory, and run:
```bash
npm install
```

### 3. Environment Variables
Verify or edit the variables in the `.env` file in the root folder:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/masquerade_dental
JWT_SECRET=supersecret_masquerade_dental_token_key_12345
ADMIN_USERNAME=admin
ADMIN_PASSWORD=dentaladmin123

# SMTP parameters (Configure real credentials to send real emails, else defaults to console log mock)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
```

### 4. Running the Application
To boot up the Express server and database connection:
```bash
npm start
```
Your terminal will log:
```
MongoDB Connected: 127.0.0.1
Server running on port 5000
Open booking portal at: http://localhost:5000
Open admin dashboard at: http://localhost:5000/admin.html
```

---

## 💻 VPS & Cloud Hosting Deployment Guide

To deploy this project to a live production Linux VPS (e.g. DigitalOcean, AWS EC2, Linode) running Ubuntu:

### 1. Server Configuration & Setup
SSH into your VPS and install Node.js, Git, and MongoDB:
```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Deploy Project Code
Clone or transfer the repository, install dependencies, and setup variables:
```bash
cd /var/www
# clone or upload folder 'dental-clinic-booking'
cd dental-clinic-booking
npm install --production

# Create final production configuration
nano .env
```

### 3. Setup Process Manager (PM2)
Install and run PM2 to keep the Node application active in the background 24/7:
```bash
sudo npm install -g pm2
pm2 start server.js --name "masquerade-dental"
pm2 save
pm2 startup
```

### 4. Reverse Proxy Setup (Nginx) & SSL
Configure Nginx to serve the site on standard web ports (`80` / `443`) and proxy requests to `http://localhost:5000`:
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure block
sudo nano /etc/nginx/sites-available/masqueradedental.com
```

Insert the following server block:
```nginx
server {
    listen 80;
    server_name masqueradedental.com www.masqueradedental.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site block and secure it with Let's Encrypt SSL:
```bash
sudo ln -s /etc/nginx/sites-available/masqueradedental.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL Certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d masqueradedental.com -d www.masqueradedental.com
```

---

## 🔒 Security Practices Implemented
- **MongoDB indexing**: Compound indexes prevent double booking of identical approved slots.
- **Secure Admin URL**: Admin sections require authentication verification.
- **JWT Authorization**: Admin controllers verify token headers or secure cookies for all actions.
- **Sanitized Exports**: CSV generation escapes double quotes to prevent spreadsheet CSV injection.
