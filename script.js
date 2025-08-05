// Cache DOM elements
const routeInput = document.getElementById('routeInput');
const stopSelect = document.getElementById('stopSelect');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');

// Global variables
let allRoutes = [];
let routeStops = [];

// Initialize the app
async function initApp() {
    try {
        // Fetch all routes on app load
        const response = await fetch('https://rt.data.gov.hk/v2/transport/citybus/route/ctb');
        const data = await response.json();
        allRoutes = data.data;
        
        // Populate route suggestions
        setupRouteAutocomplete();
    } catch (error) {
        console.error('Failed to load routes:', error);
        resultsDiv.innerHTML = `<p class="error">Failed to load route data. Please try again later.</p>`;
    }
}

// Setup autocomplete for route input
function setupRouteAutocomplete() {
    const routeNames = allRoutes.map(route => route.route);
    new Awesomplete(routeInput, {
        list: routeNames,
        minChars: 1,
        autoFirst: true
    });
}

// Fetch stops for a route
async function fetchStops(route) {
    loadingDiv.style.display = 'block';
    stopSelect.innerHTML = '<option value="">Loading stops...</option>';
    
    try {
        const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/${route}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            routeStops = data.data;
            populateStopSelect();
        } else {
            throw new Error('No stops found for this route');
        }
    } catch (error) {
        stopSelect.innerHTML = `<option value="">Error loading stops</option>`;
        resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Populate stop dropdown
function populateStopSelect() {
    stopSelect.innerHTML = '<option value="">Select a stop</option>';
    
    routeStops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop.stop;
        option.textContent = `${stop.name_tc} (${stop.name_en})`;
        stopSelect.appendChild(option);
    });
    
    stopSelect.disabled = false;
}

// Fetch ETA data
async function fetchETA() {
    const route = routeInput.value.trim();
    const stopId = stopSelect.value;
    
    if (!route || !stopId) {
        resultsDiv.innerHTML = '<p class="error">Please select both a route and a stop</p>';
        return;
    }
    
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
        const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${stopId}/${route}`);
        const data = await response.json();
        
        displayETAResults(data.data, stopId);
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Failed to load ETA data: ${error.message}</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display ETA results
function displayETAResults(etaData, stopId) {
    const selectedStop = routeStops.find(stop => stop.stop === stopId);
    
    let html = `
        <h2>Route ${routeInput.value} - ${selectedStop.name_tc} (${selectedStop.name_en})</h2>
        <div class="eta-container">
    `;
    
    if (etaData && etaData.length > 0) {
        etaData.forEach(eta => {
            const etaTime = new Date(eta.eta);
            const now = new Date();
            const minsDiff = Math.floor((etaTime - now) / (1000 * 60));
            
            html += `
                <div class="eta-card">
                    <div class="eta-time">${etaTime.toLocaleTimeString()}</div>
                    <div class="eta-minutes">${minsDiff > 0 ? `${minsDiff} mins` : 'Arriving'}</div>
                    <div class="eta-remark">${eta.rmk_tc || ''}</div>
                    <div class="eta-dir">Direction: ${eta.dir === 'I' ? 'Inbound' : 'Outbound'}</div>
                </div>
            `;
        });
    } else {
        html += '<p>No upcoming buses found</p>';
    }
    
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Event listeners
routeInput.addEventListener('change', () => {
    const route = routeInput.value.trim();
    if (route) {
        fetchStops(route);
    }
});

searchBtn.addEventListener('click', fetchETA);

// Initialize the app
initApp();
