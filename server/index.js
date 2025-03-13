const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');
require('dotenv').config(); // Load environment variables from .env file

// Add axios conditionally to prevent crashes
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.warn('axios module not found. AI integration will be disabled.');
}

const app = express();
const PORT = process.env.PORT || 5000;

// AI API configuration
const SEGMIND_API_KEY = process.env.SEGMIND_API_KEY || ''; // API key should be set in .env file
const SEGMIND_API_URL = 'https://api.segmind.com/v1/sdxl-video';  // Segmind API endpoint for video generation

// Add validation helper function
function isValidSegmindAPIKey(key) {
  // Check if key exists and has a valid format (likely starting with 'sm_')
  return key && typeof key === 'string' && key.trim() !== '';
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
// Explicitly serve files from memes directory
app.use('/memes', express.static(path.join(__dirname, '..', 'public', 'memes')));

// For debugging: log the requested URL
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, '..', 'public');
const memesDir = path.join(publicDir, 'memes');
const templatesDir = path.join(publicDir, 'templates');

// Create all required directories
[uploadsDir, publicDir, memesDir, templatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Template settings with information about each meme template
const memeTemplateSettings = {
  'lil-yachty': {
    templateVideo: path.join(templatesDir, 'lil-yachty.mp4'),
    description: 'Lil Yachty looking at the laptop meme',
    promptText: 'A person looking at a laptop screen with surprised expression, full body shot, realistic movement',
    faceX: 200,
    faceY: 50,
    faceWidth: 250,
    faceHeight: 250
  },
  'psy': {
    templateVideo: path.join(templatesDir, 'psy.mp4'),
    description: 'Psy Gangnam Style meme',
    promptText: 'A person dancing in Gangnam Style with energetic movements, full body motion, high quality',
    faceX: 220,
    faceY: 30,
    faceWidth: 200,
    faceHeight: 200
  }
};

// Function to generate video using Segmind API
async function generateVideoWithSegmind(userImagePath, outputPath, settings) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Generating video using Segmind API...');
      
      if (!isValidSegmindAPIKey(process.env.SEGMIND_API_KEY)) {
        throw new Error('Segmind API key is not configured or invalid. Please add a valid API key to your .env file.');
      }
      
      // Read the image file as base64
      const imageBuffer = fs.readFileSync(userImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare the API request
      const requestData = {
        image: `data:image/jpeg;base64,${base64Image}`,
        scheduler: "UniPC",
        num_inference_steps: 25,
        guidance_scale: 9,
        seed: Math.floor(Math.random() * 1000000),
        width: 512,
        height: 512,
        motion_bucket_id: 127, // Higher values = more motion
        fps: 24,
        augmentation_level: 0.5,
        duration: 2 // in seconds
      };
      
      console.log('Sending request to Segmind API...');
      
      // Send the API request
      const response = await axios.post(SEGMIND_API_URL, requestData, {
        headers: {
          'x-api-key': process.env.SEGMIND_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });
      
      console.log('Received response from Segmind API');
      
      // If we received a binary response, it should be the video file
      if (response.data) {
        // Write the video file to disk
        fs.writeFileSync(outputPath, response.data);
        console.log(`Segmind video saved to ${outputPath}`);
        
        // Verify the file exists and has content
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log('Segmind video generation successful');
          resolve(true);
        } else {
          throw new Error('Segmind API returned empty or invalid video data');
        }
      } else {
        throw new Error('Segmind API returned no data');
      }
    } catch (error) {
      console.error('Error in Segmind video generation:', error);
      // If we have a response error with status, log it
      if (error.response) {
        console.error(`Segmind API error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          try {
            // Try to parse the error data
            const errorData = JSON.parse(error.response.data.toString());
            console.error('Segmind API error details:', errorData);
          } catch (e) {
            console.error('Could not parse error data');
          }
        }
      }
      reject(error);
    }
  });
}

// Main API route for meme generation
app.post('/generate-meme', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { template, settings } = req.body;
    let parsedSettings;
    
    try {
      parsedSettings = JSON.parse(settings);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    const inputImage = req.file.path;
    const templateVideo = path.join(__dirname, '..', 'public', 'templates', template);
    
    // Check if template exists
    if (!fs.existsSync(templateVideo)) {
      return res.status(404).json({ error: `Template video not found: ${template}` });
    }

    // Create output filename with random string to prevent conflicts
    const outputFilename = `meme-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
    const outputPath = path.join(__dirname, '..', 'public', 'memes', outputFilename);
    
    // Create memes directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', 'public', 'memes');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Try to generate meme with Segmind first
    try {
      if (!process.env.SEGMIND_API_KEY) {
        throw new Error('SEGMIND_API_KEY is not configured in .env file');
      }
      
      console.log('Generating meme with Segmind AI...');
      await generateVideoWithSegmind(inputImage, outputPath, parsedSettings);
      
      // Get the public URL path for the generated meme
      const memeUrl = `/memes/${outputFilename}`;
      
      res.json({
        url: memeUrl,
        method: 'segmind',
        success: true
      });
    } catch (error) {
      console.error('Error generating meme with Segmind:', error.message);
      return res.status(500).json({ 
        error: 'Failed to generate meme with Segmind AI', 
        details: error.message,
        success: false
      });
    } finally {
      // Clean up the uploaded file
      if (fs.existsSync(inputImage)) {
        fs.unlinkSync(inputImage);
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// API endpoint to get the list of available meme templates
app.get('/meme-templates', (req, res) => {
  try {
    // Get template files from templates directory
    const templateFiles = fs.readdirSync(templatesDir)
      .filter(file => file.endsWith('.mp4') || file.endsWith('.mov'));
      
    const templates = templateFiles.map(file => ({
      id: file,
      name: file.replace(/\.(mp4|mov)$/, '').replace(/-/g, ' ')
    }));
    
    res.status(200).json({ templates });
  } catch (error) {
    console.error('Error getting meme templates:', error);
    res.status(500).json({ error: 'Failed to get meme templates' });
  }
});

// Add endpoint to check Segmind API status
app.get('/ai-status', (req, res) => {
  const hasValidKey = isValidSegmindAPIKey(process.env.SEGMIND_API_KEY);
  res.json({ 
    available: !!(axios && hasValidKey),
    message: (axios && hasValidKey) 
      ? 'Segmind API is configured and ready to use' 
      : 'Segmind API is not configured. Please add a valid API key to your .env file.'
  });
});

// Keep old endpoint for backward compatibility
app.get('/api/ai-status', (req, res) => {
  res.redirect('/ai-status');
});

// Redirect old generate-meme endpoint for backward compatibility
app.post('/api/generate-meme', (req, res) => {
  console.log('Redirecting from old /api/generate-meme endpoint to /generate-meme');
  req.url = '/generate-meme';
  app._router.handle(req, res);
});

// Redirect old meme-templates endpoint for backward compatibility
app.get('/api/meme-templates', (req, res) => {
  console.log('Redirecting from old /api/meme-templates endpoint to /meme-templates');
  res.redirect('/meme-templates');
});

// Redirect old check-file endpoint for backward compatibility
app.get('/api/check-file/:filename', (req, res) => {
  console.log('Redirecting from old /api/check-file endpoint to /check-file');
  res.redirect(`/check-file/${req.params.filename}`);
});

// Redirect old list-files endpoint for backward compatibility
app.get('/api/list-files', (req, res) => {
  console.log('Redirecting from old /api/list-files endpoint to /list-files');
  res.redirect('/list-files');
});

// Add diagnostic endpoint to check if meme files exist
app.get('/check-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(memesDir, filename);
  
  console.log(`Checking if file exists: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      size: stats.size,
      path: filePath,
      publicUrl: `/memes/${filename}`
    });
  } else {
    res.json({
      exists: false,
      checkedPath: filePath
    });
  }
});

// Add endpoint to list all meme files
app.get('/list-files', (req, res) => {
  try {
    const files = fs.readdirSync(memesDir);
    res.json({
      files,
      memesDir,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      memesDir
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});