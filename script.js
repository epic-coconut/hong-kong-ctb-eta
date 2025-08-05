document.getElementById('searchBtn').addEventListener('click', fetchETA);

// Global cache for stops data
let allStopsData = null;

async function initApp() {
    try {
        // Load all stops data first
        const response = await fetch('https://rt.data.gov.hk/v2/transport/citybus/stop');
        if (!response.ok) throw new Error('Failed to load stops data');
        allStopsData = await response.json();
        console.log('Successfully loaded stops data');
    } catch (error) {
        console.error('Error loading stops:', error);
    }
}

async function fetchStops(route) {
    const routeInput = document.getElementById('routeInput');
    const stopSelect = document.getElementById('stopSelect');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    if (!route || !route.trim()) {
        resultsDiv.innerHTML = '<p class="error">Please enter a route number</p>';
        return;
    }

    loadingDiv.style.display = 'block';
    stopSelect.innerHTML = '<option value="">Loading stops...</option>';
    resultsDiv.innerHTML = '';

    try {
        // First get route information
        const routeResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route/CTB/${route.trim().toUpperCase()}`);
        if (!routeResponse.ok) throw new Error('Route not found');
        
        // Then get route-stop mapping
        const stopsResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route.trim().toUpperCase()}`);
        if (!stopsResponse.ok) throw new Error('Failed to load stops for route');
        
        const stopsData = await stopsResponse.json();
        
        if (!stopsData.data || stopsData.data.length === 0) {
            throw new Error('No stops found for this route');
        }

        // Enrich with full stop data
        const enrichedStops = stopsData.data.map(routeStop => {
            const fullStop = allStopsData?.data?.find(s => s.stop === routeStop.stop);
            return {
                ...routeStop,
                name_tc: fullStop?.name_tc || routeStop.stop,
                name_en: fullStop?.name_en || routeStop.stop
            };
        });

        // Populate dropdown
        stopSelect.innerHTML = '<option value="">Select a stop</option>';
        enrichedStops.forEach(stop => {
            const option = document.createElement('option');
            option.value = stop.stop;
            option.textContent = `${stop.name_tc} (${stop.name_en})`;
            stopSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error:', error);
        stopSelect.innerHTML = '<option value="">Error loading stops</option>';
        resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

async function fetchETA() {
    const route = document.getElementById('routeInput').value.trim();
    const stopId = document.getElementById('stopSelect').value;
    const resultsDiv = document.getElementById('results');
    
    if (!route || !stopId) {
        resultsDiv.innerHTML = '<p class="error">Please select both a route and a stop</p>';
        return;
    }

    try {
        const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${stopId}/${route}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            let html = `<h3>Route ${route}</h3><ul>`;
            data.data.forEach(eta => {
                const etaTime = new Date(eta.eta);
                html += `<li>${etaTime.toLocaleTimeString()} (${eta.rmk_tc || ''})</li>`;
            });
            html += '</ul>';
            resultsDiv.innerHTML = html;
        } else {
            resultsDiv.innerHTML = '<p>No upcoming buses found</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Failed to load ETA: ${error.message}</p>`;
    }
}

// Initialize the app when loaded
window.addEventListener('DOMContentLoaded', initApp);
