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
  console.log('Request received:', req.body);
  
  try {
    const { companyName, description, formName } = req.body;
    console.log('Extracted fields:', { companyName, description, formName });
    
    // Get space and environment
    console.log('Connecting to Contentful...');
    const space = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
    console.log('Space connected, getting environment...');
    const environment = await space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
    console.log('Environment retrieved');
    
    // Create a form field entry (just a text field for now)
    console.log('Creating form field entry...');
    const formFieldEntry = await environment.createEntry('formField', {
      fields: {
        label: { 'en-US': 'Default Field' },
        type: { 'en-US': 'text' },
        required: { 'en-US': true }  // Added the required boolean field
      }
    });
    console.log('Form field created with ID:', formFieldEntry.sys.id);
    
    // Create a form entry
    console.log('Creating form entry...');
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
    console.log('Form entry created with ID:', formEntry.sys.id);
    
    // Create a company entry
    console.log('Creating company entry...');
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
    console.log('Company entry created with ID:', companyEntry.sys.id);
    
    // Publish all entries
    console.log('Publishing form field entry...');
    await formFieldEntry.publish();
    console.log('Publishing form entry...');
    await formEntry.publish();
    console.log('Publishing company entry...');
    await companyEntry.publish();
    console.log('All entries published successfully');
    
    const responseData = {
      message: 'Company created successfully',
      companyId: companyEntry.sys.id
    };
    console.log('Sending response:', JSON.stringify(responseData));
    
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error('Error creating content in Contentful:', error);
    const errorResponse = {
      error: 'Failed to create company',
      details: error.message
    };
    console.log('Sending error response:', JSON.stringify(errorResponse));
    res.status(500).json(errorResponse);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
