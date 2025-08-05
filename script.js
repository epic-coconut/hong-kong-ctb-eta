// New function to fetch all stops data
async function fetchAllStops() {
    try {
        const response = await fetch('https://rt.data.gov.hk/v2/transport/citybus/stop');
        if (!response.ok) throw new Error('Failed to fetch stops data');
        return await response.json();
    } catch (error) {
        console.error('Error loading stops:', error);
        return null;
    }
}

// Modified fetchStops function
async function fetchStops(route) {
    loadingDiv.style.display = 'block';
    stopSelect.innerHTML = '<option value="">Loading stops...</option>';
    
    try {
        // First get route-stop data
        const routeResponse = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}`);
        const routeData = await routeResponse.json();
        
        if (!routeData.data || routeData.data.length === 0) {
            throw new Error('No stops found for this route');
        }

        // Then get all stops data
        const allStops = await fetchAllStops();
        if (!allStops) {
            throw new Error('Failed to load stop information');
        }

        // Combine the data
        routeStops = routeData.data.map(routeStop => {
            const fullStopInfo = allStops.data.find(stop => stop.stop === routeStop.stop);
            return {
                ...routeStop,
                ...fullStopInfo
            };
        });

        populateStopSelect();
    } catch (error) {
        console.error('Error:', error);
        stopSelect.innerHTML = '<option value="">Error loading stops</option>';
        resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Update populateStopSelect to show better stop information
function populateStopSelect() {
    stopSelect.innerHTML = '<option value="">Select a stop</option>';
    
    routeStops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop.stop;
        option.textContent = `${stop.name_tc} (${stop.name_en}) - ${stop.stop}`;
        stopSelect.appendChild(option);
    });
    
    stopSelect.disabled = false;
}
