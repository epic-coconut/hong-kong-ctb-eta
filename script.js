// API Configuration (v2)
const API_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';
const COMPANY_CODE = 'CTB'; // Citybus Limited

// Main App Initialization
document.addEventListener('DOMContentLoaded', function() {
    const routeInput = document.getElementById('routeInput');
    const stopSelect = document.getElementById('stopSelect');
    const directionSelect = document.getElementById('directionSelect');
    const searchBtn = document.getElementById('searchBtn');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');

    // Event Listeners
    routeInput.addEventListener('change', async () => {
        const route = routeInput.value.trim();
        if (route) {
            await fetchRouteDirections(route);
        }
    });

    directionSelect.addEventListener('change', async () => {
        const route = routeInput.value.trim();
        const direction = directionSelect.value;
        if (route && direction) {
            await fetchStops(route, direction);
        }
    });

    searchBtn.addEventListener('click', fetchETA);

    // Fetch available directions for a route
    async function fetchRouteDirections(route) {
        loadingDiv.style.display = 'block';
        directionSelect.innerHTML = '<option value="">Loading directions...</option>';
        stopSelect.innerHTML = '<option value="">Select direction first</option>';
        resultsDiv.innerHTML = '';

        try {
            // First get route info to verify it exists
            const routeInfo = await fetch(`${API_BASE}/route/${COMPANY_CODE}/${route}`);
            if (!routeInfo.ok) throw new Error('Route not found');
            
            // Enable direction selection
            directionSelect.innerHTML = `
                <option value="">Select direction</option>
                <option value="inbound">Inbound (${(await routeInfo.json()).data.orig_en})</option>
                <option value="outbound">Outbound (${(await routeInfo.json()).data.dest_en})</option>
            `;
            directionSelect.disabled = false;
        } catch (error) {
            console.error('Direction fetch error:', error);
            directionSelect.innerHTML = '<option value="">Error loading directions</option>';
            resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Fetch stops for a route and direction (v2 compliant)
    async function fetchStops(route, direction) {
        loadingDiv.style.display = 'block';
        stopSelect.innerHTML = '<option value="">Loading stops...</option>';
        resultsDiv.innerHTML = '';

        try {
            // Get route-stop data
            const stopsRes = await fetch(`${API_BASE}/route-stop/${COMPANY_CODE}/${route}/${direction}`);
            if (!stopsRes.ok) throw new Error('Failed to fetch stops');
            
            const stopsData = await stopsRes.json();
            
            // Validate response
            if (!stopsData.data || !Array.isArray(stopsData.data)) {
                throw new Error('Invalid stops data format');
            }

            // Get stop details in parallel
            const allStopsRes = await fetch(`${API_BASE}/stop`);
            const allStopsData = await allStopsRes.json();

            // Process and combine data
            const enrichedStops = stopsData.data.map(routeStop => {
                const fullStop = allStopsData.data.find(s => s.stop === routeStop.stop);
                return {
                    ...routeStop,
                    name_en: fullStop?.name_en || 'Unknown',
                    name_tc: fullStop?.name_tc || '未知',
                    lat: fullStop?.lat,
                    long: fullStop?.long
                };
            });

            // Populate stop dropdown
            stopSelect.innerHTML = '<option value="">Select a stop</option>';
            enrichedStops.forEach(stop => {
                const option = document.createElement('option');
                option.value = stop.stop;
                option.dataset.seq = stop.seq;
                option.textContent = `${stop.seq}. ${stop.name_tc} (${stop.name_en})`;
                stopSelect.appendChild(option);
            });
            
            stopSelect.disabled = false;
        } catch (error) {
            console.error('Stop fetch error:', error);
            stopSelect.innerHTML = '<option value="">Error loading stops</option>';
            resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Fetch ETAs (v2 compliant)
    async function fetchETA() {
        const route = routeInput.value.trim();
        const stopId = stopSelect.value;
        const direction = directionSelect.value;
        
        if (!route || !stopId || !direction) {
            resultsDiv.innerHTML = '<p class="error">Please select route, direction and stop</p>';
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
            console.error('ETA fetch error:', error);
            resultsDiv.innerHTML = `<p class="error">${error.message}</p>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Display ETAs (v2 format)
    function displayETAs(etas) {
        // Group ETAs by destination
        const byDestination = etas.reduce((acc, eta) => {
            const key = `${eta.dest_tc}|${eta.dest_en}`;
            if (!acc[key]) {
                acc[key] = {
                    dest_tc: eta.dest_tc,
                    dest_en: eta.dest_en,
                    times: []
                };
            }
            acc[key].times.push(eta);
            return acc;
        }, {});

        let html = `
            <div class="eta-header">
                <h3>Route ${etas[0].route}</h3>
                <p>Stop: ${stopSelect.options[stopSelect.selectedIndex].text.split(') ')[1]}</p>
            </div>
        `;

        // Create a section for each destination
        Object.values(byDestination).forEach(destination => {
            html += `
                <div class="destination-group">
                    <h4>To: ${destination.dest_tc} (${destination.dest_en})</h4>
                    <div class="eta-container">
            `;

            // Sort times chronologically
            destination.times
                .sort((a, b) => new Date(a.eta) - new Date(b.eta))
                .forEach(eta => {
                    const etaTime = eta.eta ? new Date(eta.eta) : null;
                    const now = new Date();
                    const minsDiff = etaTime ? Math.floor((etaTime - now) / (1000 * 60)) : null;
                    
                    html += `
                        <div class="eta-card">
                            <div class="eta-time">${etaTime ? etaTime.toLocaleTimeString() : '--:--'}</div>
                            <div class="eta-minutes">
                                ${minsDiff !== null ? 
                                    (minsDiff > 0 ? `${minsDiff} mins` : 'Arriving') : 
                                    (eta.rmk_tc || eta.rmk_en || '--')}
                            </div>
                            ${eta.rmk_tc ? `<div class="eta-remark">${eta.rmk_tc}</div>` : ''}
                        </div>
                    `;
                });

            html += `</div></div>`;
        });

        resultsDiv.innerHTML = html;
    }
});
