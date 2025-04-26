///TODO DELETE

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
    const { companyName, description } = req.body;
    console.log('Extracted fields:', { companyName, description });
    
    // Get space and environment
    console.log('Connecting to Contentful...');
    const space = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
    console.log('Space connected, getting environment...');
    const environment = await space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
    console.log('Environment retrieved');
    
    // Use existing form ID instead of creating a new form
    const EXISTING_FORM_ID = "7dT9dxsmMOtyBbujasLGMn"; // Replace with your actual form ID if needed
    
    // Create a company entry
    console.log('Creating company entry...');
    const companyPayload = {
      fields: {
        name: { 'en-US': companyName },
        description: { 'en-US': description },
        form: { 
          'en-US': { 
            sys: { type: 'Link', linkType: 'Entry', id: EXISTING_FORM_ID } 
          }
        }
      }
    };
    
    console.log('COMPANY PAYLOAD:', JSON.stringify(companyPayload, null, 2));
    console.log('This matches the curl format you provided:');
    console.log(`curl -X POST "https://api.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${process.env.CONTENTFUL_ENVIRONMENT}/entries" \\
    -H "Authorization: Bearer ${process.env.CONTENTFUL_MANAGEMENT_TOKEN}" \\
    -H "Content-Type: application/vnd.contentful.management.v1+json" \\
    -H "X-Contentful-Content-Type: company" \\
    -d '${JSON.stringify(companyPayload)}'`);
    
    const companyEntry = await environment.createEntry('company', companyPayload);
    console.log('Company entry created with ID:', companyEntry.sys.id);
    
    // Publish company entry
    console.log('Publishing company entry...');
    await companyEntry.publish();
    console.log('Company entry published successfully');
    
    const responseData = {
      message: 'Company created successfully',
      companyId: companyEntry.sys.id,
      formId: EXISTING_FORM_ID
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
