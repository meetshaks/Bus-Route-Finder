class BusRouteFinder {
    constructor() {
        this.graph = {};                  // adjacency list: stop -> [bus connections]
        this.busData = [];                // store bus data
        this.cache = {};                  // route cache for performance
        this.busByStop = {};              // bus lookup by stop
        this.allStops = new Set();        // all valid stops
        this.stopCoordinates = new Map(); // stop coordinates for reference
    }

    loadData(busData, places) {
        this.busData = busData;

        // Handle both array of objects and array of strings
        if (places.length > 0 && typeof places[0] === 'object') {
            // Array of place objects
            this.allStops = new Set(places.map(p => p.name || p));
            for (const place of places) {
                if (place.latitude && place.longitude) {
                    this.stopCoordinates.set(place.name, {
                        lat: place.latitude,
                        lng: place.longitude
                    });
                }
            }
        } else {
            // Array of strings
            this.allStops = new Set(places);
        }

        this.buildGraph(busData);
    }

    buildGraph(busData) {
        this.graph = {};
        this.busByStop = {};

        busData.forEach((bus, busIdx) => {
            const routes = [
                bus.routes?.inbound?.via || [],
                bus.routes?.outbound?.via || []
            ];

            routes.forEach(stops => {
                for (let i = 0; i < stops.length; i++) {
                    const stop = stops[i];
                    if (!this.graph[stop]) {
                        this.graph[stop] = [];
                        this.busByStop[stop] = [];
                    }

                    // Connect adjacent stops on same route
                    if (i > 0) {
                        const prevStop = stops[i - 1];
                        this.graph[stop].push({
                            next: prevStop,
                            bus: busIdx,
                            via: bus.busName.name
                        });
                    }
                    if (i < stops.length - 1) {
                        const nextStop = stops[i + 1];
                        this.graph[stop].push({
                            next: nextStop,
                            bus: busIdx,
                            via: bus.busName.name
                        });
                    }

                    if (!this.busByStop[stop].includes(busIdx)) {
                        this.busByStop[stop].push(busIdx);
                    }
                }
            });
        });
    }

    /**
     * DIJKSTRA'S ALGORITHM WITH TRANSFER MINIMIZATION
     * Prioritizes:
     * 1. Minimum transfers (STRICT)
     * 2. Priority buses (BRTC, VIP, Airport)
     * 3. Minimum stops
     */
    dijkstra(start, end) {
        if (!this.graph[start] || !this.graph[end]) return null;

        const distances = {};
        const transfers = {};
        const busPriority = {};
        const previous = {};
        const previousEdge = {};
        const pq = [];

        // Initialize
        for (const stop in this.graph) {
            distances[stop] = Infinity;
            transfers[stop] = Infinity;
            busPriority[stop] = Infinity;
            previous[stop] = null;
            previousEdge[stop] = null;
        }

        distances[start] = 0;
        transfers[start] = -1; // Start with -1 so first bus is transfer 0
        busPriority[start] = 0;
        pq.push([start, -1, 0, 0]); // [stop, transfers, busPriority, distance]

        while (pq.length > 0) {
            // STRICT sorting: transfers FIRST, then priority, then distance
            pq.sort((a, b) => {
                if (a[1] !== b[1]) return a[1] - b[1];  // Minimize transfers STRICTLY
                if (a[2] !== b[2]) return a[2] - b[2];  // Then prefer priority buses
                return a[3] - b[3];                      // Then minimize stops
            });

            const [current, trans, priority, dist] = pq.shift();

            if (current === end) break;

            // Skip if we've found a better path
            if (trans > transfers[current] ||
                (trans === transfers[current] && priority > busPriority[current]) ||
                (trans === transfers[current] && priority === busPriority[current] && dist > distances[current])) {
                continue;
            }

            const neighbors = this.graph[current] || [];

            // Group neighbors by bus
            const busMap = {};
            for (const edge of neighbors) {
                if (!busMap[edge.bus]) {
                    busMap[edge.bus] = [];
                }
                busMap[edge.bus].push(edge);
            }

            // Process each bus separately
            for (const busIdx in busMap) {
                const edges = busMap[busIdx];

                for (const edge of edges) {
                    const newDist = dist + 1;

                    // Count transfer ONLY when changing bus
                    const prevBusNum = previousEdge[current]?.bus ?? -1;
                    const currentBusNum = parseInt(edge.bus);
                    const newTrans = currentBusNum !== prevBusNum ? trans + 1 : trans;

                    // Priority cost (priority buses get lower cost)
                    const isPriority = typeof priorityBuses !== 'undefined' &&
                        priorityBuses.some(pBus => edge.via.includes(pBus) || pBus.includes(edge.via));
                    const busCost = isPriority ? 0.1 : 1;
                    const newPriority = priority + busCost;

                    // Update ONLY if fewer transfers, OR same transfers with better priority
                    const isBetter = newTrans < transfers[edge.next] ||
                        (newTrans === transfers[edge.next] && newPriority < busPriority[edge.next]) ||
                        (newTrans === transfers[edge.next] && newPriority === busPriority[edge.next] && newDist < distances[edge.next]);

                    if (isBetter) {
                        transfers[edge.next] = newTrans;
                        busPriority[edge.next] = newPriority;
                        distances[edge.next] = newDist;
                        previous[edge.next] = current;
                        previousEdge[edge.next] = edge;
                        pq.push([edge.next, newTrans, newPriority, newDist]);
                    }
                }
            }
        }

        if (distances[end] === Infinity) return null;

        // Reconstruct path
        const path = [];
        let current = end;
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }

        return { path, transfers: transfers[end], distances: distances[end], previousEdge };
    }

    /**
     * Find ALL direct buses between two stops
     */
    findAllDirectBuses(start, end) {
        const directBuses = [];

        for (const bus of this.busData) {
            const routes = [
                { stops: bus.routes?.inbound?.via || [], direction: 'inbound' },
                { stops: bus.routes?.outbound?.via || [], direction: 'outbound' }
            ];

            for (const route of routes) {
                const startIdx = route.stops.indexOf(start);
                const endIdx = route.stops.indexOf(end);

                // Check if both stops exist and start comes before end
                if (startIdx !== -1 && endIdx !== -1 && startIdx !== endIdx) {
                    let path;
                    if (startIdx < endIdx) {
                        path = route.stops.slice(startIdx, endIdx + 1);
                    } else {
                        path = route.stops.slice(endIdx, startIdx + 1).reverse();
                    }

                    directBuses.push({
                        bus_name: bus.busName.name,
                        path: path,
                        stops_count: path.length - 1,
                        estimated_time: (path.length - 1) * 2,
                        is_direct: true,
                        intermediate_stops: path.slice(1, -1),
                        direction: route.direction,
                        buses: [bus.busName.name]
                    });
                    break; // Found this bus in this direction, no need to check other direction
                }
            }
        }

        // Sort by priority buses first, then by stops count
        return directBuses.sort((a, b) => {
            const aIsPriority = typeof priorityBuses !== 'undefined' &&
                priorityBuses.some(pBus => a.bus_name.includes(pBus));
            const bIsPriority = typeof priorityBuses !== 'undefined' &&
                priorityBuses.some(pBus => b.bus_name.includes(pBus));

            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;

            return a.stops_count - b.stops_count;
        });
    }

    findRoute(start, end) {
        console.log('Finding route from', start, 'to', end);

        if (!this.allStops.has(start) || !this.allStops.has(end)) {
            console.log('Invalid stops:', { start, end });
            return null;
        }

        // Check cache first
        const cacheKey = `${start}|${end}`;
        if (this.cache[cacheKey]) {
            console.log('Route found in cache');
            return this.cache[cacheKey];
        }

        // PRIORITY 1: Check for direct routes FIRST
        console.log('Checking for direct routes...');
        const directBuses = this.findAllDirectBuses(start, end);
        if (directBuses && directBuses.length > 0) {
            console.log(`Found ${directBuses.length} direct bus(es)`);
            // Return the best direct route (first one after sorting by priority and stops)
            const bestDirect = directBuses[0];
            const route = {
                path: bestDirect.path,
                transfers: 0,
                total_cost: bestDirect.estimated_time,
                buses: [bestDirect.bus_name],
                is_direct: true,
                intermediate_stops: bestDirect.intermediate_stops
            };
            this.cache[cacheKey] = route;
            return route;
        }

        // PRIORITY 2: If no direct route, run Dijkstra for transfers
        console.log('No direct route found. Running Dijkstra for transfers...');
        const result = this.dijkstra(start, end);
        if (!result) {
            console.log('No route found');
            return null;
        }

        // Format and cache the result
        const route = this.formatRoute(result, start, end);
        this.cache[cacheKey] = route;

        return route;
    }

    formatRoute(result, start, end) {
        if (!result) return null;

        const path = result.path;
        if (path.length === 0) return null;

        // Check for direct bus
        for (const bus of this.busData) {
            const routes = [
                bus.routes?.inbound?.via || [],
                bus.routes?.outbound?.via || []
            ];
            for (const stops of routes) {
                const startIdx = stops.indexOf(start);
                const endIdx = stops.indexOf(end);
                if (startIdx !== -1 && endIdx !== -1 && startIdx !== endIdx) {
                    const minIdx = Math.min(startIdx, endIdx);
                    const maxIdx = Math.max(startIdx, endIdx);
                    let isValid = true;

                    for (let i = minIdx + 1; i < maxIdx; i++) {
                        if (!path.includes(stops[i])) {
                            isValid = false;
                            break;
                        }
                    }

                    if (isValid) {
                        return {
                            path: path,
                            transfers: 0,
                            total_cost: path.length * 2,
                            buses: [bus.busName.name],
                            is_direct: true,
                            intermediate_stops: path.slice(1, -1)
                        };
                    }
                }
            }
        }

        // Transfer route
        const segments = this.identifyBusSegments(path);

        if (!segments || segments.length === 0) {
            return null;
        }

        const transferCount = segments.length - 1;

        return {
            path: path,
            transfers: transferCount,
            total_cost: path.length * 2 + transferCount * 3,
            buses: segments.map(s => s.busName),
            is_direct: false,
            intermediate_stops: path.slice(1, -1),
            segments: segments
        };
    }

    identifyBusSegments(path) {
        const segments = [];

        if (path.length < 2) return segments;

        let i = 0;
        while (i < path.length - 1) {
            const fromStop = path[i];
            let bestSegment = null;
            let bestEndIdx = i + 1;
            let foundAnyBus = false;

            // Find a bus that takes us the farthest
            for (const bus of this.busData) {
                const routes = [
                    bus.routes?.inbound?.via || [],
                    bus.routes?.outbound?.via || []
                ];

                for (const stops of routes) {
                    const fromIdx = stops.indexOf(fromStop);
                    if (fromIdx === -1) continue;

                    foundAnyBus = true;

                    // Find how far this bus can take us
                    let maxEndIdx = i;
                    for (let j = i + 1; j < path.length; j++) {
                        const toStop = path[j];
                        const toIdx = stops.indexOf(toStop);

                        if (toIdx === -1) break;

                        // Verify all intermediate stops are on this bus
                        const minStopIdx = Math.min(fromIdx, toIdx);
                        const maxStopIdx = Math.max(fromIdx, toIdx);
                        let validSegment = true;

                        for (let pathIdx = i + 1; pathIdx < j; pathIdx++) {
                            const pathStop = path[pathIdx];
                            const pathStopIdx = stops.indexOf(pathStop);

                            if (pathStopIdx === -1 || pathStopIdx < minStopIdx || pathStopIdx > maxStopIdx) {
                                validSegment = false;
                                break;
                            }
                        }

                        if (validSegment) {
                            maxEndIdx = j;
                        } else {
                            break;
                        }
                    }

                    if (maxEndIdx > i) {
                        if (maxEndIdx > bestEndIdx || !bestSegment) {
                            bestEndIdx = maxEndIdx;
                            bestSegment = {
                                busName: bus.busName.name,
                                from: fromStop,
                                to: path[maxEndIdx],
                                stops: maxEndIdx - i + 1,
                                path: path.slice(i, maxEndIdx + 1)
                            };
                        }
                    }
                }
            }

            if (bestSegment) {
                segments.push(bestSegment);
                i = bestEndIdx;
            } else {
                if (foundAnyBus) {
                    console.warn(`Bus found at ${fromStop} but couldn't reach next stop`);
                } else {
                    console.warn(`No bus serves stop ${fromStop}`);
                }
                break;
            }
        }

        return segments;
    }

    formatRouteInstructions(route) {
        if (!route || !route.segments) return [];
        return route.segments;
    }
} 