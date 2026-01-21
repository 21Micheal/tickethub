// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
// const fileUpload = require('express-fileupload');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tickethub.co.ke', 'https://www.tickethub.co.ke']
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.set('trust proxy', 1); // Trust first proxy

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
// app.use(fileUpload({
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
//   abortOnLimit: true,
//   createParentPath: true
// }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Tickethub API'
  });
});

// API routes
// app.use('/api', routes);
// ✅ FIX: Serve static files from uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Serving static files from:', uploadsPath);

// Create directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('Created uploads directory');
}

// Serve static files with proper headers
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper cache headers for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || 
        filePath.endsWith('.png') || filePath.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
    }
  }
}));

// Log static file requests for debugging
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.path);
  next();
});

// Import routes
// const routes = require('./routes');
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Tickethub API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
}

module.exports = app;