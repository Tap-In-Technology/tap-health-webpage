import React from 'react';

const ExampleComponent: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Example Component</h2>
            <p className="text-gray-700">
                This is an example component that describes a specific section of the Tap Health software.
            </p>
            <button className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                Learn More
            </button>
        </div>
    );
};

export default ExampleComponent;