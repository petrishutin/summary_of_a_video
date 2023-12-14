import React, {useState, useEffect} from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // New state to track authentication
  const [username, setUsername] = useState(''); // State for username
  const [password, setPassword] = useState(''); // State for password
  const headerHeight = 60;
  const footerHeight = 120;

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }

  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    setAuthHeader();
  }, [chatHistory]);

  const logout = () => {
    setUsername('');
    setPassword('');
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; // Clear the auth cookie
    delete axios.defaults.headers.common['Authorization']; // Remove auth header
    setIsAuthenticated(false); // Update authentication state
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    const encodedCredentials = btoa(`${username}:${password}`);
    // Make sure the cookie is set for the correct domain and path
    document.cookie = `auth=${encodedCredentials}; path=/; domain=${window.location.hostname};`;
    setAuthHeader(); // Immediately set the auth header
    setIsAuthenticated(true);
  };

  const setAuthHeader = () => {
    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(row => row.startsWith('auth='));
    if (authCookie) {
      const authToken = authCookie.split('=')[1];
      axios.defaults.headers.common['Authorization'] = `Basic ${authToken}`;
    }
  };

  const appendToChatHistory = (sender, text) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setChatHistory(prevHistory => [...prevHistory, {sender, timestamp, text}]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    appendToChatHistory('You', input);
    setInput('');
    if (!input.trim()) return;

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/invoke`, {"input": input});
      if (response.data && response.data.output) {
        // Assuming the response contains the text you want to display
        appendToChatHistory('Assistant', response.data.output);
      } else {
        // Handle the case where response.data.output is not available
        appendToChatHistory('Assistant', 'Received an unexpected response format.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setIsAuthenticated(false);
      } else {
        // Handle other kinds of errors
        appendToChatHistory('Assistant', `Error: ${error.message}`);
      }
      console.error('Error sending request to the backend:', error);
    }
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Check for 'Enter' key and not holding shift
      event.preventDefault(); // Prevent default to avoid newline in textarea
      handleSubmit(event); // Submit the form
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center"
           style={{height: '100vh', backgroundColor: '#919eaa'}}>
        <div className="card p-4">
          <div className="card-body">
            <h5 className="card-title text-center mb-4">Login Required</h5>
            <form onSubmit={handleAuthSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5" style={{maxWidth: '100%', padding: 0}}>
      {/* Fixed Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        backgroundColor: '#919eaa', padding: '10px',
        boxSizing: 'border-box', zIndex: 1,
        height: '50px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center'
      }}>
        {/* Clear History Button */}
        <button onClick={clearHistory} className="btn btn-danger" style={{marginRight: '10px'}}>
          Clear History
        </button>
        {/* Reset Credentials Button */}
        <button onClick={logout} className="btn btn-warning">
          Reset Credentials
        </button>
      </div>

      {/* Chat History */}
      <div className="chat-history" style={{
        marginTop: `${headerHeight}px`,
        marginBottom: `${footerHeight}px`,
        height: `calc(100vh - ${headerHeight + footerHeight}px)`,
        overflow: 'auto', width: '80%', marginLeft: 'auto', marginRight: 'auto'
      }}>
        {chatHistory.map((msg, index) => (
          <p key={index}>
            <strong>{msg.sender}</strong> {msg.timestamp}: <br/>
            {typeof msg.text === 'string' ? msg.text : <div dangerouslySetInnerHTML={msg.text}></div>}
          </p>
        ))}
      </div>

      {/* Fixed Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: '#919eaa', padding: '10px',
        boxSizing: 'border-box', zIndex: 1,
        height: `${footerHeight}px`
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          width: '100%'
        }}>
          <textarea
            className="form-control"
            style={{width: '80%', height: '40px', marginRight: '10px'}}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          ></textarea>
          <button type="submit" className="btn btn-primary">Submit</button>
        </form>
      </div>
    </div>
  );
}


export default App;
