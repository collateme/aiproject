import React, { useEffect, useState } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import ReactAudioPlayer from "react-audio-player";
import './style.css'

function App() {
  const [isListening, setIsListening] = useState(false);  // Track if the user is speaking
  const [audioSrc, setAudioSrc] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);  // Store message history in state

  // Speech Recognition Hook
  const { transcript, resetTranscript, listening } = useSpeechRecognition();

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    // Attach event listener
    window.addEventListener("keydown", handleKeyPress);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isListening, transcript, messageHistory]);

  // Start listening
  const startListening = () => {
    resetTranscript();
    setIsListening(true);
    setAudioSrc(null)
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  };

  // Stop listening
  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
    sendTextToOpenAI(transcript); // Send the transcript to OpenAI when stopped
  };


  const sendTextToOpenAI = async (inputText) => {

    const apiKey = process.env.REACT_APP_API_URL
    try {
      const updatedMessageHistory = [...messageHistory, { role: 'user', content: inputText }];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',  // Endpoint for ChatGPT API
        {
          model: 'gpt-3.5-turbo',  // You can also use gpt-3.5 or any other supported model
          messages: updatedMessageHistory,
          max_tokens: 100,  // Adjust the max token count based on your needs
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,  // Include the API key here
          },
        }
      );

      messageHistory.push({ role: 'assistant', content: response.data.choices[0].message.content });
      setMessageHistory(prevHistory => [
        ...prevHistory,
        { role: 'assistant', content: response.data.choices[0].message.content }
      ]);
      handleConvertTextToSpeech(response.data.choices[0].message.content)
    } catch (error) {
      console.error('Error sending text to OpenAI:', error);
    }
  };




  const handleConvertTextToSpeech = async (text) => {
    if (!text) return;

    const apiKey = 'AIzaSyBO77q8v1mxvDgvF_nGVfxzYZXfhKvH6bU'; // Replace with your API key
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const requestData = {
      input: { text },
      voice: { languageCode: 'hi-IN', name: 'hi-IN-Standard-F' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        const audioBlob = new Blob([new Uint8Array(atob(data.audioContent).split("").map(char => char.charCodeAt(0)))], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioSrc(audioUrl);
      } else {
        const error = await response.json();
        console.error('Error from API:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };


  return (
    <div className="app">
      <div className="container">
        <h1>🎤 Voice Chat with OpenAI</h1>

        {/* Buttons */}
        <div className="button-group">
          <button onClick={startListening} disabled={isListening} className="button start">
            🎙️ Start Listening
          </button>
          <button onClick={stopListening} disabled={!isListening} className="button stop">
            ⏹️ Stop Listening
          </button>
        </div>

        {/* Transcript */}
        <div className="transcript-box">
          <h2>📝 Transcript:</h2>
          <p>{transcript || "No transcript available..."}</p>
        </div>

        {/* Audio Response */}
        <div className="audio-section">
          <h3>🔊 Audio Response:</h3>
          {audioSrc && <audio autoPlay controls src={audioSrc} className="audio-player" />}
        </div>
      </div>
    </div>
  );
}

export default App;
