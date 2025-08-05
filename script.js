// Configuration
const API_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';
const COMPANY_CODE = 'CTB';

async function fetchStops(route) {
    try {
        // 1. First verify route exists
        const routeCheck = await fetch(`${API_BASE}/route/${COMPANY_CODE}/${route}`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!routeCheck.ok) throw new Error(`Route ${route} not found`);
        
        // 2. Get route-stop mapping
        const stopsRes = await fetch(`${API_BASE}/route-stop/${COMPANY_CODE}/${route}`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!stopsRes.ok) throw new Error('Failed to fetch stops');
        
        const stopsData = await stopsRes.json();
        
        // 3. Validate response structure
        if (!stopsData.data || !Array.isArray(stopsData.data)) {
            throw new Error('Invalid stops data format');
        }

        // 4. Get stop details (parallel request)
        const stopsInfoRes = await fetch(`${API_BASE}/stop`, {
            headers: { 'Accept': 'application/json' }
        });
        const stopsInfo = await stopsInfoRes.json();

        // Process data
        return stopsData.data.map(routeStop => {
            const stopInfo = stopsInfo.data.find(s => s.stop === routeStop.stop);
            return {
                ...routeStop,
                name_en: stopInfo?.name_en || 'Unknown',
                name_tc: stopInfo?.name_tc || '未知'
            };
        });
        
    } catch (error) {
        console.error('API Error:', error);
        throw error; // Re-throw for UI handling
    }
}
