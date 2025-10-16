import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google"; 
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId="310535372242-pcbc7o3o9mk2tbpvri4h8kl0cqaal68l.apps.googleusercontent.com"> 
        <App />
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
