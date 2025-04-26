import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from 'contentful-management';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Needed because __dirname doesn't exist in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Route for index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize Contentful client
const contentfulClient = createClient({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

// API endpoint to handle form submissions
app.post('/submit', async (req, res) => {
  try {
    const { companyName, description, formName } = req.body;
    
    // Get space and environment
    const space = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
    const environment = await space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
    
    // Create a form field entry (just a text field for now)
    const formFieldEntry = await environment.createEntry('formField', {
      fields: {
        label: { 'en-US': 'Default Field' },
        type: { 'en-US': 'text' },
        required: { 'en-US': true }  // Added the required boolean field
      }
    });
    
    // Create a form entry
    const formEntry = await environment.createEntry('form', {
      fields: {
        name: { 'en-US': formName },
        formFields: { 
          'en-US': [
            { sys: { type: 'Link', linkType: 'Entry', id: formFieldEntry.sys.id } }
          ]
        }
      }
    });
    
    // Create a company entry
    const companyEntry = await environment.createEntry('company', {
      fields: {
        name: { 'en-US': companyName },
        description: { 'en-US': description },
        form: { 
          'en-US': { 
            sys: { type: 'Link', linkType: 'Entry', id: formEntry.sys.id } 
          }
        }
      }
    });
    
    // Publish all entries
    await formFieldEntry.publish();
    await formEntry.publish();
    await companyEntry.publish();
    
    res.status(201).json({
      message: 'Company created successfully',
      companyId: companyEntry.sys.id
    });
    
  } catch (error) {
    console.error('Error creating content in Contentful:', error);
    res.status(500).json({
      error: 'Failed to create company',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
