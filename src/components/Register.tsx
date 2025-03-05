import React, { useState } from 'react';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState(null);

    const handleRegister = (e) => {
        e.preventDefault();
        // Add registration logic here
    };

    return (
        <form onSubmit={handleRegister}>
            <input type='text' value={username} onChange={(e) => setUsername(e.target.value)} placeholder='Username' required />
            <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Email' required />
            <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Password' required />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type='submit'>Register</button>
        </form>
    );
};

export default Register;
