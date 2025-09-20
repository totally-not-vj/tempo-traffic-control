import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  Car, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Radio,
  Settings,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface TrafficData {
  north: number;
  south: number;
  east: number;
  west: number;
  currentGreen: 'north' | 'south' | 'east' | 'west';
  lastUpdated: string;
  manualOverride: boolean;
}

interface FlaskApiResponse {
  counts: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  signal: 'north' | 'south' | 'east' | 'west';
  manual_override: boolean;
}

const TrafficDashboard = () => {
  const [trafficData, setTrafficData] = useState<TrafficData>({
    north: 0,
    south: 0,
    east: 0,
    west: 0,
    currentGreen: 'north',
    lastUpdated: new Date().toLocaleTimeString(),
    manualOverride: false
  });

  const [isLive, setIsLive] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [flaskBackendUrl] = useState('http://127.0.0.1:5000');

  // Fetch real data from Flask backend
  useEffect(() => {
    if (!isLive) return;

    const fetchTrafficData = async () => {
      try {
        const response = await fetch(`${flaskBackendUrl}/get_counts`);
        const data: FlaskApiResponse = await response.json();
        
        setTrafficData(prev => ({
          ...prev,
          north: data.counts.north,
          south: data.counts.south,
          east: data.counts.east,
          west: data.counts.west,
          currentGreen: data.signal,
          manualOverride: data.manual_override,
          lastUpdated: new Date().toLocaleTimeString()
        }));
        
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to fetch traffic data:', error);
        setIsConnected(false);
        // Fallback to simulation if backend is unavailable
        setTrafficData(prev => ({
          ...prev,
          north: Math.floor(Math.random() * 20) + 5,
          south: Math.floor(Math.random() * 15) + 3,
          east: Math.floor(Math.random() * 12) + 2,
          west: Math.floor(Math.random() * 18) + 4,
          lastUpdated: new Date().toLocaleTimeString()
        }));
      }
    };

    const interval = setInterval(fetchTrafficData, 500);
    fetchTrafficData(); // Initial fetch

    return () => clearInterval(interval);
  }, [isLive, flaskBackendUrl]);

  // Manual override functions
  const handleManualOverride = async (direction: 'north' | 'south' | 'east' | 'west') => {
    try {
      await fetch(`${flaskBackendUrl}/set_signal/${direction}`);
    } catch (error) {
      console.error('Failed to set signal:', error);
    }
  };

  const handleEndOverride = async () => {
    try {
      await fetch(`${flaskBackendUrl}/end_override`);
    } catch (error) {
      console.error('Failed to end override:', error);
    }
  };


  const getDirectionData = (direction: keyof Pick<TrafficData, 'north' | 'south' | 'east' | 'west'>) => {
    const icons = {
      north: ArrowUp,
      south: ArrowDown,
      east: ArrowRight,
      west: ArrowLeft
    };
    
    const Icon = icons[direction];
    const count = trafficData[direction];
    const isActive = trafficData.currentGreen === direction;
    
    return { Icon, count, isActive, direction };
  };

  const getTotalVehicles = () => {
    return trafficData.north + trafficData.south + trafficData.east + trafficData.west;
  };

  return (
    <div className="min-h-screen bg-dashboard-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Smart Traffic Control</h1>
              <p className="text-muted-foreground">Real-time Urban Congestion Management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={isLive && isConnected ? "default" : "secondary"} className="px-3 py-1">
              <Radio className="h-3 w-3 mr-1" />
              {isLive && isConnected ? "LIVE" : isConnected ? "PAUSED" : "OFFLINE"}
            </Badge>
            <Badge variant={trafficData.manualOverride ? "destructive" : "outline"}>
              <Settings className="h-3 w-3 mr-1" />
              {trafficData.manualOverride ? "MANUAL" : "AUTO"}
            </Badge>
            <Badge variant={isConnected ? "default" : "destructive"}>
              <Zap className="h-3 w-3 mr-1" />
              {isConnected ? "BACKEND CONNECTED" : "BACKEND OFFLINE"}
            </Badge>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Car className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Vehicles</p>
                  <p className="text-2xl font-bold">{getTotalVehicles()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  trafficData.currentGreen === 'north' || trafficData.currentGreen === 'south' 
                    ? 'bg-traffic-green traffic-light-green' 
                    : 'bg-traffic-red traffic-light-red'
                }`} />
                <div>
                  <p className="text-sm text-muted-foreground">N-S Signal</p>
                  <p className="text-lg font-semibold">
                    {trafficData.currentGreen === 'north' || trafficData.currentGreen === 'south' ? 'GREEN' : 'RED'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  trafficData.currentGreen === 'east' || trafficData.currentGreen === 'west' 
                    ? 'bg-traffic-green traffic-light-green' 
                    : 'bg-traffic-red traffic-light-red'
                }`} />
                <div>
                  <p className="text-sm text-muted-foreground">E-W Signal</p>
                  <p className="text-lg font-semibold">
                    {trafficData.currentGreen === 'east' || trafficData.currentGreen === 'west' ? 'GREEN' : 'RED'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Zap className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Update</p>
                  <p className="text-lg font-semibold">{trafficData.lastUpdated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Traffic Intersection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Traffic Count Display */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Navigation className="h-5 w-5" />
                  <span>Live Vehicle Count</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 h-80">
                  
                  {/* North */}
                  <div className="flex justify-center">
                    <Card className={`w-24 h-32 flex flex-col items-center justify-center transition-all duration-300 ${
                      getDirectionData('north').isActive 
                        ? 'bg-traffic-green/20 border-traffic-green shadow-lg' 
                        : 'bg-secondary border-border'
                    }`}>
                      <ArrowUp className={`h-8 w-8 mb-2 ${
                        getDirectionData('north').isActive ? 'text-traffic-green' : 'text-muted-foreground'
                      }`} />
                      <div className="text-center">
                        <p className="text-2xl font-bold">{trafficData.north}</p>
                        <p className="text-xs text-muted-foreground">NORTH</p>
                      </div>
                    </Card>
                  </div>
                  
                  <div /> {/* Empty space */}
                  <div /> {/* Empty space */}

                  {/* West */}
                  <div className="flex items-center justify-center">
                    <Card className={`w-32 h-24 flex flex-row items-center justify-center transition-all duration-300 ${
                      getDirectionData('west').isActive 
                        ? 'bg-traffic-green/20 border-traffic-green shadow-lg' 
                        : 'bg-secondary border-border'
                    }`}>
                      <ArrowLeft className={`h-8 w-8 mr-2 ${
                        getDirectionData('west').isActive ? 'text-traffic-green' : 'text-muted-foreground'
                      }`} />
                      <div className="text-center">
                        <p className="text-2xl font-bold">{trafficData.west}</p>
                        <p className="text-xs text-muted-foreground">WEST</p>
                      </div>
                    </Card>
                  </div>

                  {/* Center - Intersection */}
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-dashboard-control border-2 border-primary rounded-lg flex items-center justify-center">
                      <div className={`w-8 h-8 rounded-full ${
                        trafficData.currentGreen === 'north' ? 'bg-traffic-green' :
                        trafficData.currentGreen === 'south' ? 'bg-traffic-green' :
                        trafficData.currentGreen === 'east' ? 'bg-traffic-green' :
                        trafficData.currentGreen === 'west' ? 'bg-traffic-green' : 'bg-traffic-red'
                      } ${
                        trafficData.currentGreen ? 'traffic-light-green' : 'traffic-light-red'
                      }`} />
                    </div>
                  </div>

                  {/* East */}
                  <div className="flex items-center justify-center">
                    <Card className={`w-32 h-24 flex flex-row items-center justify-center transition-all duration-300 ${
                      getDirectionData('east').isActive 
                        ? 'bg-traffic-green/20 border-traffic-green shadow-lg' 
                        : 'bg-secondary border-border'
                    }`}>
                      <div className="text-center mr-2">
                        <p className="text-2xl font-bold">{trafficData.east}</p>
                        <p className="text-xs text-muted-foreground">EAST</p>
                      </div>
                      <ArrowRight className={`h-8 w-8 ${
                        getDirectionData('east').isActive ? 'text-traffic-green' : 'text-muted-foreground'
                      }`} />
                    </Card>
                  </div>

                  <div /> {/* Empty space */}
                  <div /> {/* Empty space */}

                  {/* South */}
                  <div className="flex justify-center">
                    <Card className={`w-24 h-32 flex flex-col items-center justify-center transition-all duration-300 ${
                      getDirectionData('south').isActive 
                        ? 'bg-traffic-green/20 border-traffic-green shadow-lg' 
                        : 'bg-secondary border-border'
                    }`}>
                      <div className="text-center mb-2">
                        <p className="text-2xl font-bold">{trafficData.south}</p>
                        <p className="text-xs text-muted-foreground">SOUTH</p>
                      </div>
                      <ArrowDown className={`h-8 w-8 ${
                        getDirectionData('south').isActive ? 'text-traffic-green' : 'text-muted-foreground'
                      }`} />
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Control Panel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={trafficData.manualOverride ? "destructive" : "outline"}
                    onClick={trafficData.manualOverride ? handleEndOverride : () => {}}
                    className="flex-1"
                    disabled={!isConnected}
                  >
                    {trafficData.manualOverride ? "End Manual Override" : "Auto Mode Active"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Manual Override</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={trafficData.currentGreen === 'north' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleManualOverride('north')}
                      disabled={!isConnected}
                    >
                      <ArrowUp className="h-4 w-4 mr-1" />
                      North
                    </Button>
                    <Button
                      variant={trafficData.currentGreen === 'south' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleManualOverride('south')}
                      disabled={!isConnected}
                    >
                      <ArrowDown className="h-4 w-4 mr-1" />
                      South
                    </Button>
                    <Button
                      variant={trafficData.currentGreen === 'east' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleManualOverride('east')}
                      disabled={!isConnected}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      East
                    </Button>
                    <Button
                      variant={trafficData.currentGreen === 'west' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleManualOverride('west')}
                      disabled={!isConnected}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      West
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">System Control</p>
                  <Button
                    variant={isLive ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsLive(!isLive)}
                    className="w-full"
                  >
                    <Radio className="h-4 w-4 mr-2" />
                    {isLive ? "Stop Live Feed" : "Start Live Feed"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alert Panel */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span>System Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-traffic-green' : 'bg-traffic-red'}`} />
                    <span>AI Detection: {isConnected ? 'Active' : 'Offline'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-traffic-green' : 'bg-traffic-red'}`} />
                    <span>Signal Controller: {isConnected ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-traffic-green' : 'bg-traffic-red'}`} />
                    <span>Flask Backend: {isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${trafficData.manualOverride ? 'bg-warning' : 'bg-traffic-green'}`} />
                    <span>Mode: {trafficData.manualOverride ? 'Manual Override' : 'AI Controlled'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Total Vehicles: {getTotalVehicles()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficDashboard;