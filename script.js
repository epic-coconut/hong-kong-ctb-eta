// Initialize with correct API endpoints
const API_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';

async function fetchStops(route) {
    const stopSelect = document.getElementById('stopSelect');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    
    loadingDiv.style.display = 'block';
    stopSelect.innerHTML = '<option value="">Loading stops...</option>';
    resultsDiv.innerHTML = '';

    try {
        // Step 1: Verify the route exists
        const routeCheck = await fetch(`${API_BASE}/route/CTB/${route}`);
        if (!routeCheck.ok) throw new Error('Invalid route number');
        
        // Step 2: Get stops for this route
        const stopsResponse = await fetch(`${API_BASE}/route-stop/CTB/${route}`);
        if (!stopsResponse.ok) throw new Error('Failed to load stops');
        
        const stopsData = await stopsResponse.json();
        
        // Step 3: Get detailed stop information
        const allStopsResponse = await fetch(`${API_BASE}/stop`);
        const allStopsData = await allStopsResponse.json();
        
        // Combine the data
        const enrichedStops = stopsData.data.map(routeStop => {
            const fullStop = allStopsData.data.find(s => s.stop === routeStop.stop);
            return {
                ...routeStop,
                name_tc: fullStop?.name_tc || 'Unknown',
                name_en: fullStop?.name_en || 'Unknown'
            };
        });

        // Populate the dropdown
        stopSelect.innerHTML = '<option value="">Select a stop</option>';
        enrichedStops.forEach(stop => {
            const option = document.createElement('option');
            option.value = stop.stop;
            option.textContent = `${stop.name_tc} (${stop.name_en})`;
            stopSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading stops:', error);
        stopSelect.innerHTML = '<option value="">Error loading stops</option>';
        resultsDiv.innerHTML = `<p class="error">${error.message}. Try routes like 1, 5B, or 104.</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}
