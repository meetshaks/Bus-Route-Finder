/**
 * Main Application Module - Full Screen Glassmorphism Edition
 * Handles initialization, map interactions, and panel logic
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize app after all resources are loaded
    window.addEventListener('load', async () => {
        try {
            // Wait a moment for all scripts (Select2, Leaflet) to be ready
            setTimeout(async () => {
                await initializeApp();
            }, 100);
        } catch (error) {
            console.error('Error initializing app:', error);
            showToast('error', 'Critical Error', 'Failed to load application');
        }
    });

    // Close results panel handler
    document.getElementById('btn-close-results').addEventListener('click', () => {
        closeResultsPanel();
    });

    // Reset button
    document.getElementById('btn-reset').addEventListener('click', () => {
        location.reload();
    });
    // Search Panel Toggle
    document.getElementById('toggle-search-panel').addEventListener('click', () => {
        const panel = document.querySelector('.search-panel');
        panel.classList.toggle('minimized');
    });

    // Results Panel Toggle
    document.getElementById('toggle-results-panel').addEventListener('click', () => {
        const panel = document.getElementById('results-panel');
        panel.classList.toggle('minimized');
    });
});

/**
 * Main app initialization
 */
async function initializeApp() {
    try {
        if (typeof places === 'undefined' || typeof BusRouteFinder === 'undefined') {
            throw new Error('Required data or modules not loaded');
        }

        // Load bus data
        const busDataResponse = await fetch('data/bus_data_v2.json');
        const busData = await busDataResponse.json();

        // Initialize route finder
        const routeFinder = new BusRouteFinder();
        routeFinder.loadData(busData, places);
        window.routeFinder = routeFinder;

        // Populate and Init Dropdowns
        populateDropdowns(places);
        initializeSelect2(places);

        // Setup Map
        setupMap(routeFinder, places);

        // Setup Form Logic
        setupRouteForm(routeFinder);

        // Show Welcome Notice
        if (typeof setupWelcomeNotice === 'function') {
            setupWelcomeNotice();
        }

        console.log('Premium App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error: ' + error.message);
    }
}

/**
 * Populate start and end stop dropdowns
 */
function populateDropdowns(placesData) {
    const startSelect = document.getElementById('startStop');
    const endSelect = document.getElementById('endStop');

    startSelect.innerHTML = '<option value="">Select Starting Point...</option>';
    endSelect.innerHTML = '<option value="">Select Destination...</option>';

    const sortedPlaces = [...placesData].sort((a, b) => a.name.localeCompare(b.name));

    sortedPlaces.forEach(place => {
        startSelect.appendChild(new Option(place.name, place.name));
        endSelect.appendChild(new Option(place.name, place.name));
    });
}

/**
 * Initialize Select2 with Custom Glass Theme
 */
function initializeSelect2(placesData) {
    if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') return;

    const commonConfig = {
        theme: 'default', // Using our custom CSS overrides
        width: '100%',
        allowClear: true,
        minimumResultsForSearch: 0
    };

    $('#startStop').select2({
        ...commonConfig,
        placeholder: 'Select Starting Point',
        dropdownParent: $('#startStop').parent()
    });

    $('#endStop').select2({
        ...commonConfig,
        placeholder: 'Select Destination',
        dropdownParent: $('#endStop').parent()
    });

    // Map Sync Logic
    $('#startStop').on('change', function () {
        const start = $(this).val();
        const end = $('#endStop').val();
        if (start && end) updateMapDisplay(start, end);
    });

    $('#endStop').on('change', function () {
        const start = $('#startStop').val();
        const end = $(this).val();
        if (start && end) updateMapDisplay(start, end);
    });

    // Integrated Search Focus Handling
    $(document).on('select2:open', (e) => {
        // Delay slightly to ensure Select2 has rendered the search box in our custom parent
        setTimeout(() => {
            const searchField = document.querySelector('.select2-container--open .select2-search__field');
            if (searchField) {
                searchField.focus();
            }
        }, 10);
    });
}

/**
 * Setup Map Logic
 */
function setupMap(routeFinder, placesData) {
    // Reverting to Standard Colorful OSM as requested
    // This provides better road visibility and familiar aesthetics

    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([23.777176, 90.399452], 12);

    // Standard OpenStreetMap (Colorful)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    window.currentMap = map;
    window.mapState = {
        startMarker: null,
        endMarker: null,
        routeLine: null,
        markerCluster: null
    };

    // Clean, Simple Markers with Pulse Rings (Eyecatchy & Formal)
    window.startIcon = L.divIcon({
        className: 'custom-map-marker-container',
        html: `
            <div class="marker-pulse-ring ring-start"></div>
            <div class="marker-core" style="background: #0F172A;"></div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    window.endIcon = L.divIcon({
        className: 'custom-map-marker-container',
        html: `
            <div class="marker-pulse-ring ring-end"></div>
            <div class="marker-core" style="background: #EF4444;"></div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    // Disable clustering - add markers directly to map
    // This removes the numbered cluster circles
    const markers = L.layerGroup();

    placesData.forEach(place => {
        const marker = L.marker([place.latitude, place.longitude], {
            icon: L.divIcon({
                className: 'custom-map-marker-container',
                html: `<div class="marker-circle stop-marker-color" style="width:12px; height:12px; border-width:2px;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            })
        }).bindTooltip(`<div style="color:#0f172a; font-weight:600;">${place.name}</div>`, {
            direction: 'top',
            className: 'glass-tooltip'
        });
        markers.addLayer(marker);
    });

    map.addLayer(markers);
    window.mapState.markerCluster = markers;
}

/**
 * Handle Route Form Submission
 */
function setupRouteForm(routeFinder) {
    document.getElementById('routeForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const start = document.getElementById('startStop').value;
        const end = document.getElementById('endStop').value;

        if (!start || !end) {
            // Show toast error
            alert('Please select both locations');
            return;
        }

        // Show Loading
        const loading = document.getElementById('loading-overlay');
        loading.classList.remove('hidden');
        loading.classList.add('active');

        // Reset panel states for new search
        document.querySelector('.search-panel').classList.remove('minimized');
        document.getElementById('results-panel').classList.remove('minimized');

        // Hide previous results
        closeResultsPanel();

        // Simulate calculation time for effect
        setTimeout(() => {
            try {
                const route = routeFinder.findRoute(start, end);

                loading.classList.remove('active');
                loading.classList.add('hidden');

                if (!route) {
                    throw new Error('No route found between these locations.');
                }

                displayRouteResults(route, routeFinder);

            } catch (error) {
                loading.classList.remove('active');
                loading.classList.add('hidden');
                alert(error.message);
            }
        }, 800);
    });
}

/**
 * Display Results in the Glass Panel
 */
function displayRouteResults(route, routeFinder) {
    const panel = document.getElementById('results-panel');
    const container = document.getElementById('routeInstructions');

    // Update Meta
    document.getElementById('totalStops').textContent = route.transfers === 0 && route.is_direct ? route.path.length : 'N/A'; // Simplify for direct
    document.getElementById('totalTransfers').textContent = route.transfers;

    container.innerHTML = ''; // Clear previous

    if (route.is_direct) {
        // Direct Route Logic
        const directRoutes = window.routeFinder.findAllDirectBuses(route.path[0], route.path[route.path.length - 1]);

        if (directRoutes.length > 0) {
            directRoutes.forEach(opt => {
                const card = createDirectBusCard(opt);
                container.appendChild(card);
            });
        }
    } else {
        // Transfer Route Logic
        const segments = route.segments || routeFinder.formatRouteInstructions(route);
        if (segments) {
            segments.forEach((seg, idx) => {
                const card = createTransferSegmentCard(seg, idx, segments.length);
                container.appendChild(card);
            });
        }
    }

    // Show Panel
    panel.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.add('active');
    }, 10); // Trigger transition
}

/**
 * Create HTML for a Direct Bus Card
 */
function createDirectBusCard(routeOpt) {
    const div = document.createElement('div');
    div.className = 'route-card';
    const stopsCount = routeOpt.path.length - 1;

    div.innerHTML = `
        <div class="card-header">
            <div class="bus-badge">
                <i class="fas fa-bus"></i>
                ${routeOpt.bus_name}
            </div>
            <span class="stops-badge">${stopsCount} Stops</span>
        </div>
        
        <div class="route-segment">
            <div class="segment-line"></div>
            
            <div class="segment-dot start"></div>
            <span class="location-name">
                Start <strong>${routeOpt.path[0]}</strong>
            </span>

            <div class="segment-dot end"></div>
            <span class="location-name" style="margin-bottom:0">
                End <strong>${routeOpt.path[routeOpt.path.length - 1]}</strong>
            </span>
        </div>

        <div class="action-row">
            <button class="btn-text-glass toggle-stops">
                <i class="fas fa-list"></i> View Stops
            </button>
        </div>
        
        <div class="stops-dropdown">
            <ul class="stops-ul">
                ${routeOpt.path.map((stop, idx) => {
        let className = '';
        if (idx === 0) className = 'first-stop';
        else if (idx === routeOpt.path.length - 1) className = 'last-stop';
        return `<li class="${className}">${stop}</li>`;
    }).join('')}
            </ul>
        </div>
    `;

    // Toggle Logic
    const btn = div.querySelector('.toggle-stops');
    const dropdown = div.querySelector('.stops-dropdown');

    btn.addEventListener('click', () => {
        const isHidden = getComputedStyle(dropdown).display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
        if (isHidden) dropdown.classList.add('show');
    });

    return div;
}

/**
 * Create HTML for a Transfer Segment
 */
function createTransferSegmentCard(segment, index, total) {
    const div = document.createElement('div');
    div.className = 'route-card';
    div.innerHTML = `
        <div class="card-header">
            <div class="bus-badge">
                <i class="fas fa-bus"></i>
                ${segment.busName}
            </div>
            <span class="stops-badge">Step ${index + 1} of ${total}</span>
        </div>
        
        <div class="route-segment">
            <div class="segment-line"></div>
            <div class="segment-dot start"></div>
            <span class="location-name">
                Board <strong>${segment.from}</strong>
            </span>
            <div class="segment-dot end"></div>
            <span class="location-name" style="margin-bottom:0">
                Drop <strong>${segment.to}</strong>
            </span>
        </div>

        <div class="action-row">
            <button class="btn-text-glass toggle-stops">
                <i class="fas fa-list"></i> View Stops
            </button>
        </div>
        
        <div class="stops-dropdown">
            <ul class="stops-ul">
                ${segment.path ? segment.path.map((stop, idx) => {
        let className = '';
        if (idx === 0) className = 'first-stop';
        else if (idx === segment.path.length - 1) className = 'last-stop';
        return `<li class="${className}">${stop}</li>`;
    }).join('') : '<li>No stops info</li>'}
            </ul>
        </div>
    `;

    // Toggle Logic
    const btn = div.querySelector('.toggle-stops');
    const dropdown = div.querySelector('.stops-dropdown');

    btn.addEventListener('click', () => {
        const isHidden = getComputedStyle(dropdown).display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
        if (isHidden) dropdown.classList.add('show');
    });

    return div;
}

function closeResultsPanel() {
    const panel = document.getElementById('results-panel');
    panel.classList.remove('active');
    panel.classList.remove('minimized');
}

/**
 * Map Interactions
 */
async function updateMapDisplay(startPlace, endPlace) {
    const map = window.currentMap;
    const { startMarker, endMarker, routeLine } = window.mapState;

    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (routeLine) map.removeLayer(routeLine);

    const startCoords = getPlaceCoordinates(startPlace, places);
    const endCoords = getPlaceCoordinates(endPlace, places);

    if (startCoords && endCoords) {
        window.mapState.startMarker = L.marker(startCoords, { icon: window.startIcon }).addTo(map)
            .bindTooltip(createCustomTooltipContent('Start', startPlace), {
                permanent: true,
                direction: 'top',
                className: 'custom-tooltip-box',
                offset: [0, -20] // Adjusted for larger 32px marker
            })
            .openTooltip();

        window.mapState.endMarker = L.marker(endCoords, { icon: window.endIcon }).addTo(map)
            .bindTooltip(createCustomTooltipContent('Destination', endPlace), {
                permanent: true,
                direction: 'top',
                className: 'custom-tooltip-box',
                offset: [0, -20]
            })
            .openTooltip();

        // Fetch OSRM Route
        try {
            const coordinates = await fetchRoutePolyline(startCoords, endCoords);

            // Draw smooth curve using OSRM geometry with Animation
            window.mapState.routeLine = L.polyline(coordinates, {
                color: '#06b6d4', // Cyan-500
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'animated-route-line' // CSS Animation Class
            }).addTo(map);

            map.fitBounds(window.mapState.routeLine.getBounds(), { padding: [50, 50] });

        } catch (e) {
            console.warn('Routing failed, falling back to straight line', e);

            // Fallback to straight line
            window.mapState.routeLine = L.polyline([startCoords, endCoords], {
                color: '#06b6d4',
                weight: 4,
                opacity: 0.6,
                dashArray: '10, 10'
            }).addTo(map);

            const bounds = L.latLngBounds([startCoords, endCoords]);
            map.fitBounds(bounds.pad(0.3));
        }
    }
}

async function fetchRoutePolyline(start, end) {
    // OSRM Public API (Demo server)
    // Note: In production, you should use your own OSRM instance or a paid service like Mapbox

    // start and end are [lat, lng] arrays
    const startLon = start[1];
    const startLat = start[0];
    const endLon = end[1];
    const endLat = end[0];

    // OSRM expects: longitude,latitude
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM request failed');

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
    }

    // OSRM returns [lon, lat], Leaflet needs [lat, lon]
    const geojson = data.routes[0].geometry.coordinates;
    return geojson.map(coord => [coord[1], coord[0]]);
}

function createCustomTooltipContent(label, name) {
    return `
        <div class="tooltip-label">${label}:</div>
        <div class="tooltip-name">${name}</div>
        <i class="fas fa-times tooltip-close" onclick="this.parentElement.parentElement.style.display='none'"></i>
    `;
}
