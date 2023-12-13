import React, {useState, useEffect} from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const headerHeight = 60; // Adjust as per your header's height
  const footerHeight = 120; // Adjust as per your footer's height

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const appendToChatHistory = (sender, text) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setChatHistory(prevHistory => [...prevHistory, {sender, timestamp, text}]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    appendToChatHistory('You', input);
    setInput('');
    if (!input.trim()) return; // Prevent empty input
    try {
      const response = await axios.post('http://localhost:8000/invoke', {"input": input});

      if (response.data && response.data.output) {
        // Transform each string in the array into an <li> element and join them
        const answer = response.data.output;
        appendToChatHistory('Assistant', {__html: answer});
      }
    } catch (error) {
      console.error('Error sending request to the backend:', error);
    }
  };


  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  return (
    <div className="container mt-5" style={{maxWidth: '100%', padding: 0}}>
      {/* Fixed Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        backgroundColor: '#f8f9fa', padding: '10px',
        boxSizing: 'border-box', zIndex: 1,
        height: '50px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center'
      }}>
        <button onClick={clearHistory} className="btn btn-danger" style={{height: '100%'}}>
          Clear History
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
            <strong>{msg.sender}</strong> {msg.timestamp}: <br />
            {typeof msg.text === 'string' ? msg.text : <div dangerouslySetInnerHTML={msg.text}></div>}
          </p>
        ))}
      </div>

      {/* Fixed Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: '#f8f9fa', padding: '10px',
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
          ></textarea>
          <button type="submit" className="btn btn-primary">Submit</button>
        </form>
      </div>
    </div>
  );
}


export default App;
