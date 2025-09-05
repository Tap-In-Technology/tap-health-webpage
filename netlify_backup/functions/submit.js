const { createClient } = require('contentful-management');
const axios = require('axios');
require('dotenv').config();

// Function to classify field labels using OpenAI
async function classifyFieldTypes(labels) {
  const prompt = `
Classify the following form field labels into types. Only reply with one word per label, matching the order. Possible types: text, number, date, email, url. Examples: "Name" → "text", "Age" → "number", "Date of Birth" → "date", "Website" → "url", "Email Address" → "email".

Labels:
${labels.map((label, index) => `${index + 1}. ${label}`).join('\n')}

Return the types in a comma-separated list, matching the order of the labels.
`;

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 100
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const typesText = response.data.choices[0].message.content.trim();
  const types = typesText.split(',').map(type => type.trim().toLowerCase());

  return types;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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

    // Connect to space and environment
    console.log('Connecting to space');
    const space = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
    const environment = await space.getEnvironment(process.env.CONTENTFUL_ENVIRONMENT);
    console.log('Connected to environment');

    // Step 1: Classify field types with OpenAI
    console.log('Classifying field types with OpenAI');
    const fieldLabels = fields.map(field => field.label);
    const classifiedTypes = await classifyFieldTypes(fieldLabels);

    const enrichedFields = fields.map((field, i) => ({
      ...field,
      contentType: classifiedTypes[i] || 'text'
    }));

    // Step 2: Create form field entries
    console.log('Creating form field entries');
    const fieldEntries = [];

    for (const field of enrichedFields) {
      const fieldPayload = {
        fields: {
          label: { 'en-US': field.label },
          contentType: { 'en-US': field.contentType },
          required: { 'en-US': field.required }
        }
      };

      const fieldEntry = await environment.createEntry('formField', fieldPayload);
      console.log(`Created field with ID: ${fieldEntry.sys.id}`);

      try {
        await fieldEntry.publish();
        console.log(`Published field with ID: ${fieldEntry.sys.id}`);
      } catch (publishErr) {
        console.warn(`Warning: Couldn't publish field: ${publishErr.message}`);
      }

      fieldEntries.push(fieldEntry);
    }

    // Step 3: Create form linking to the fields
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

    try {
      await formEntry.publish();
      console.log(`Published form with ID: ${formEntry.sys.id}`);
    } catch (publishErr) {
      console.warn(`Warning: Couldn't publish form: ${publishErr.message}`);
    }

    // Step 4: Create company linking to the form
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

    try {
      await companyEntry.publish();
      console.log(`Published company with ID: ${companyEntry.sys.id}`);
    } catch (publishErr) {
      console.warn(`Warning: Couldn't publish company: ${publishErr.message}`);
    }

    // Step 5: Return success response
    const responseData = {
      message: 'Company and related entries created successfully',
      companyId: companyEntry.sys.id,
      formId: formEntry.sys.id,
      fieldIds: fieldEntries.map(field => field.sys.id)
    };

    console.log('Operation completed successfully');

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
