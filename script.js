// API Configuration
const API_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';
const COMPANY_CODE = 'CTB'; // Citybus Limited

// DOM Elements
const routeInput = document.getElementById('routeInput');
const stopSelect = document.getElementById('stopSelect');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');

// Initialize the app
async function initApp() {
    searchBtn.addEventListener('click', fetchETA);
    routeInput.addEventListener('change', () => {
        const route = routeInput.value.trim();
        if (route) fetchStops(route);
    });
}

// Fetch stops for a route (v2 API compliant)
async function fetchStops(route) {
    loadingDiv.style.display = 'block';
    stopSelect.innerHTML = '<option value="">Loading stops...</option>';
    resultsDiv.innerHTML = '';

    try {
        // 1. Verify route exists
        const routeResponse = await fetch(`${API_BASE}/route/${COMPANY_CODE}/${route}`);
        if (!routeResponse.ok) throw new Error('Route not found');
        const routeData = await routeResponse.json();
        
        if (!routeData.data) throw new Error('Invalid route data');

        // 2. Get route-stop mapping
        const stopsResponse = await fetch(`${API_BASE}/route-stop/${COMPANY_CODE}/${route}`);
        if (!stopsResponse.ok) throw new Error('Failed to load stops');
        const stopsData = await stopsResponse.json();
        
        if (!stopsData.data || stopsData.data.length === 0) {
            throw new Error('No stops found for this route');
        }

        // 3. Get detailed stop info
        const allStopsResponse = await fetch(`${API_BASE}/stop`);
        const allStopsData = await allStopsResponse.json();

        // Combine data (v2 format)
        const enrichedStops = stopsData.data.map(routeStop => {
            const fullStop = allStopsData.data.find(s => s.stop === routeStop.stop);
            return {
                co: routeStop.co,
                route: routeStop.route,
                dir: routeStop.dir,
                seq: routeStop.seq,
                stop: routeStop.stop,
                name_en: fullStop?.name_en || 'Unknown',
                name_tc: fullStop?.name_tc || '未知',
                data_timestamp: routeStop.data_timestamp
            };
        });

        populateStopSelect(enrichedStops);
    } catch (error) {
        console.error('API Error:', error);
        stopSelect.innerHTML = '<option value="">Error loading stops</option>';
        resultsDiv.innerHTML = `<p class="error">${error.message}. Try routes like 1, 5B, or 104.</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Populate stop dropdown (v2 format)
function populateStopSelect(stops) {
    stopSelect.innerHTML = '<option value="">Select a stop</option>';
    
    stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop.stop;
        option.dataset.dir = stop.dir; // Store direction
        option.textContent = `${stop.seq}. ${stop.name_tc} (${stop.name_en}) - ${stop.dir === 'I' ? 'Inbound' : 'Outbound'}`;
        stopSelect.appendChild(option);
    });
    
    stopSelect.disabled = false;
}

// Fetch ETAs (v2 format)
async function fetchETA() {
    const route = routeInput.value.trim();
    const stopId = stopSelect.value;
    const direction = stopSelect.options[stopSelect.selectedIndex]?.dataset.dir;
    
    if (!route || !stopId) {
        resultsDiv.innerHTML = '<p class="error">Please select both a route and a stop</p>';
        return;
    }

    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/eta/${COMPANY_CODE}/${stopId}/${route}`);
        if (!response.ok) throw new Error('ETA data unavailable');
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            resultsDiv.innerHTML = '<p>No upcoming buses found</p>';
            return;
        }

        displayETAs(data.data);
    } catch (error) {
        console.error('ETA Error:', error);
        resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display ETAs (v2 format)
function displayETAs(etas) {
    let html = `
        <div class="eta-header">
            <h3>Route ${etas[0].route} - ${stopSelect.options[stopSelect.selectedIndex].text.split(' - ')[0]}</h3>
            <p>Direction: ${etas[0].dir === 'I' ? 'Inbound' : 'Outbound'} to ${etas[0].dest_tc} (${etas[0].dest_en})</p>
        </div>
        <div class="eta-container">
    `;

    etas.forEach(eta => {
        const etaTime = eta.eta ? new Date(eta.eta) : null;
        const now = new Date();
        const minsDiff = etaTime ? Math.floor((etaTime - now) / (1000 * 60)) : null;
        
        html += `
            <div class="eta-card">
                <div class="eta-time">${etaTime ? etaTime.toLocaleTimeString() : '--:--'}</div>
                <div class="eta-minutes">${minsDiff !== null ? (minsDiff > 0 ? `${minsDiff} mins` : 'Arriving') : eta.rmk_en}</div>
                <div class="eta-remark">${eta.rmk_tc || ''}</div>
            </div>
        `;
    });

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Initialize
window.addEventListener('DOMContentLoaded', initApp);
