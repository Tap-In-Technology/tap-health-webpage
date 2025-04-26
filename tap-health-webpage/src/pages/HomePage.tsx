import React from 'react';
import ExampleComponent from '../components/ExampleComponent';

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <h1 className="text-4xl font-bold mb-4">Welcome to Tap Health</h1>
            <p className="text-lg mb-8">
                Tap Health is dedicated to revolutionizing personal data sharing. Our software empowers users to control their health data securely and efficiently.
            </p>
            <ExampleComponent />
            <div className="mt-8">
                <h2 className="text-2xl font-semibold">Our Vision</h2>
                <p className="text-md mt-2">
                    We envision a future where individuals have complete ownership of their health information, enabling better healthcare outcomes and personalized experiences.
                </p>
            </div>
        </div>
    );
};

export default HomePage;