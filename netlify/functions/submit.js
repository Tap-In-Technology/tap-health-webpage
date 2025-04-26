const { createClient } = require('contentful-management');
require('dotenv').config();

exports.handler = async function (event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    console.log('Function started');

    // Handle OPTIONS request (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Successful preflight call' })
        };
    }

    try {
        console.log('Raw request body:', event.body);
        const body = JSON.parse(event.body);
        console.log('Parsed request body:', body);

        const { companyName, description, formName, fields } = body;

        if (!companyName || !description || !formName || !fields || !fields.length) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    details: 'Company name, description, form name, and at least one field are required'
                })
            };
        }

        // Initialize Contentful client
        console.log('Initializing Contentful client');
        const contentfulClient = createClient({
            accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
        });

        // Get space and environment
        console.log('Connecting to space');
        const space = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
        console.log('Connected to environment');

        // STEP 1: Create form fields
        console.log('Creating form fields');
        const fieldEntries = [];

        for (const field of fields) {
            console.log(`Creating field: ${field.label}`);
            const fieldPayload = {
                fields: {
                    label: { 'en-US': field.label },
                    contentType: { 'en-US': field.contentType || 'text' },
                    required: { 'en-US': field.required }
                }
            };

            const fieldEntry = await environment.createEntry('formField', fieldPayload);
            console.log(`Created field with ID: ${fieldEntry.sys.id}`);

            // Publish the field
            try {
                await fieldEntry.publish();
                console.log(`Published field with ID: ${fieldEntry.sys.id}`);
            } catch (publishErr) {
                console.warn(`Warning: Couldn't publish field: ${publishErr.message}`);
            }

            fieldEntries.push(fieldEntry);
        }

        // STEP 2: Create form with references to fields
        console.log('Creating form');
        const fieldReferences = fieldEntries.map(fieldEntry => ({
            sys: {
                type: 'Link',
                linkType: 'Entry',
                id: fieldEntry.sys.id
            }
        }));

        const formPayload = {
            fields: {
                formName: { 'en-US': formName },
                field: { 'en-US': fieldReferences }
            }
        };

        const formEntry = await environment.createEntry('form', formPayload);
        console.log(`Created form with ID: ${formEntry.sys.id}`);

        // Publish the form
        try {
            await formEntry.publish();
            console.log(`Published form with ID: ${formEntry.sys.id}`);
        } catch (publishErr) {
            console.warn(`Warning: Couldn't publish form: ${publishErr.message}`);
        }

        // STEP 3: Create company with reference to form
        console.log('Creating company');
        const companyPayload = {
            fields: {
                name: { 'en-US': companyName },
                description: { 'en-US': description },
                form: {
                    'en-US': {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: formEntry.sys.id
                        }
                    }
                }
            }
        };

        const companyEntry = await environment.createEntry('company', companyPayload);
        console.log(`Created company with ID: ${companyEntry.sys.id}`);

        // Publish the company
        try {
            await companyEntry.publish();
            console.log(`Published company with ID: ${companyEntry.sys.id}`);
        } catch (publishErr) {
            console.warn(`Warning: Couldn't publish company: ${publishErr.message}`);
        }

        // Return success response
        const responseData = {
            message: 'Company and related entries created successfully',
            companyId: companyEntry.sys.id,
            formId: formEntry.sys.id,
            fieldIds: fieldEntries.map(field => field.sys.id)
        };

        console.log('Operation completed successfully');

        const qrCodeContainer = document.getElementById('qrCodeContainer');

        // Create QR code for the company ID
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(result.companyId)}&size=200x200`;

        qrCodeContainer.innerHTML = `
  <div class="text-center">
    <p class="text-gray-700 mb-2">Scan to copy Company ID:</p>
    <img src="${qrCodeUrl}" alt="QR Code for Company ID" class="mx-auto rounded shadow-md">
  </div>
`;
        qrCodeContainer.classList.remove('hidden');


        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create company and related entries',
                details: error.message,
                errorName: error.name
            })
        };
    }
};