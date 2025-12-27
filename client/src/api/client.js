// API Client for backend communication
import { APP_CONFIG } from '../config.js';

export async function sendMessage(message) {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${APP_CONFIG.apiEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function checkHealth() {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/health`);
  return await response.json();
}
