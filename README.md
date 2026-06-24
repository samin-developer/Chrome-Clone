# Chrome Clone

A fully functional, meticulously designed Google Chrome-inspired web application built with a Python Flask backend and a vanilla JavaScript frontend. 

## ✨ Features

* **Authentic UI/UX:** A stunning, pixel-perfect recreation of the Chrome interface including the New Tab page, Settings, History, and Bookmarks.
* **Firebase Authentication:** Fully integrated Google Sign-In and Email/Password authentication. Includes advanced flows like "Choose an account", "Turn off sync", and dynamic profile avatars.
* **Omnibox Search:** Type a URL to navigate directly, or type text to search via Google.
* **Bookmarks Manager:** View, manage, and delete bookmarks dynamically.
* **Browser History:** Tracks and saves all navigation history, allowing users to clear browsing data directly from the Settings menu.
* **Live Knowledge Panels:** Integrates with free APIs to display live weather (Open-Meteo) and live crypto prices (CoinGecko) directly in the search results.
* **Customization:** Change browser themes, colors, and backgrounds.

## 🚀 Getting Started

You can run this project locally using native Python or via Docker.

### Option 1: Native Python
Ensure you have Python 3.11+ installed.
```bash
# Install dependencies
pip install -r requirements.txt

# Run the Flask backend
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`

### Option 2: Docker (Recommended)
Ensure you have Docker Desktop installed and running.
```bash
# Build the Docker image
docker build -t chrome-clone .

# Run the container
docker run -p 5000:5000 chrome-clone
```
Open your browser and navigate to `http://localhost:5000`

## 🧪 Testing

This project includes an **End-to-End (E2E) automated testing suite** using Jest and Puppeteer to programmatically test the UI and Firebase authentication flows.

To run the automated tests:
```bash
# Ensure you have installed the Node modules
npm install

# Run the test suite
node tests/run_e2e.js
```

## 🛠 Tech Stack
- **Backend:** Python, Flask
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Auth:** Firebase Authentication
- **Testing:** Node.js, Puppeteer, Jest
- **Deployment:** Docker


## License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for details.
