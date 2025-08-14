// Public Transport Service for Israel
// Currently using static data with structure ready for API integration

class PublicTransportService {
  constructor() {
    // Static Israeli transport data - can be replaced with API calls
    this.railStations = {
      'Kfar Saba': {
        name: 'Kfar Saba',
        coordinates: { lat: 32.1814, lng: 34.9063 },
        lines: ['Tel Aviv - Kfar Saba/Hod Hasharon']
      },
      'Hod Hasharon': {
        name: 'Hod Hasharon',
        coordinates: { lat: 32.1581, lng: 34.8889 },
        lines: ['Tel Aviv - Kfar Saba/Hod Hasharon']
      },
      'Kfar Chabad': {
        name: 'Kfar Chabad',
        coordinates: { lat: 32.0167, lng: 34.8333 },
        lines: ['Tel Aviv - Rehovot/Ashkelon', 'Jerusalem - Tel Aviv']
      },
      'Tel Aviv Center': {
        name: 'Tel Aviv Center (Merkaz)',
        coordinates: { lat: 32.0758, lng: 34.7851 },
        lines: ['All lines']
      }
    };

    // Typical train schedule patterns (simplified)
    this.trainSchedule = {
      'Tel Aviv - Kfar Saba/Hod Hasharon': {
        weekday: {
          frequency: 30, // every 30 minutes
          firstTrain: '05:30',
          lastTrain: '23:30',
          rushHourFrequency: 15 // every 15 minutes during rush
        },
        weekend: {
          frequency: 60,
          firstTrain: '06:00',
          lastTrain: '23:00'
        }
      },
      'Tel Aviv - Rehovot/Ashkelon': {
        weekday: {
          frequency: 20,
          firstTrain: '05:00',
          lastTrain: '00:30',
          rushHourFrequency: 10
        },
        weekend: {
          frequency: 30,
          firstTrain: '06:00',
          lastTrain: '00:00'
        }
      }
    };

    // Bus routes (simplified - major intercity routes)
    this.busRoutes = {
      'Kfar Saba - Tel Aviv': {
        lines: ['531', '142'],
        frequency: 15,
        duration: 45
      },
      'Rishon Lezion - Tel Aviv': {
        lines: ['201', '202', '203'],
        frequency: 10,
        duration: 30
      },
      'Beit Dagan - Tel Aviv': {
        lines: ['240'],
        frequency: 20,
        duration: 25
      }
    };
  }

  // Get nearest train station to a location
  getNearestTrainStation(location) {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('kfar saba')) {
      return this.railStations['Kfar Saba'];
    } else if (locationLower.includes('hod hasharon')) {
      return this.railStations['Hod Hasharon'];
    } else if (locationLower.includes('beit dagan') || locationLower.includes('rishon')) {
      return this.railStations['Kfar Chabad'];
    } else if (locationLower.includes('tel aviv')) {
      return this.railStations['Tel Aviv Center'];
    }
    
    return null;
  }

  // Calculate train journey time and options
  calculateTrainJourney(fromLocation, toLocation, departureTime = new Date()) {
    const fromStation = this.getNearestTrainStation(fromLocation);
    const toStation = this.getNearestTrainStation(toLocation);
    
    if (!fromStation || !toStation || fromStation.name === toStation.name) {
      return null;
    }

    // Find common lines between stations
    const commonLines = fromStation.lines.filter(line => 
      toStation.lines.includes(line) || toStation.lines.includes('All lines')
    );

    if (commonLines.length === 0) {
      // Need to transfer via Tel Aviv Center
      return this.calculateJourneyWithTransfer(fromStation, toStation, departureTime);
    }

    const line = commonLines[0];
    const schedule = this.trainSchedule[line];
    const isWeekend = departureTime.getDay() === 0 || departureTime.getDay() === 6;
    const currentSchedule = isWeekend ? schedule.weekend : schedule.weekday;

    // Calculate journey time (simplified - based on typical Israeli rail speeds)
    const baseJourneyTime = this.calculateRailDistance(fromStation, toStation) * 1.5; // minutes
    
    // Add waiting time based on frequency
    const hour = departureTime.getHours();
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
    const frequency = isRushHour && !isWeekend ? currentSchedule.rushHourFrequency : currentSchedule.frequency;
    const averageWaitTime = frequency / 2;

    return {
      available: true,
      fromStation: fromStation.name,
      toStation: toStation.name,
      line: line,
      journeyTime: Math.round(baseJourneyTime),
      waitTime: Math.round(averageWaitTime),
      totalTime: Math.round(baseJourneyTime + averageWaitTime),
      frequency: frequency,
      cost: this.calculateTrainCost(fromStation, toStation),
      nextDepartures: this.getNextDepartures(line, currentSchedule, departureTime),
      transfer: false
    };
  }

  // Calculate journey with transfer (via Tel Aviv Center)
  calculateJourneyWithTransfer(fromStation, toStation, departureTime) {
    const telAvivCenter = this.railStations['Tel Aviv Center'];
    
    const leg1 = this.calculateTrainJourney(fromStation.name, telAvivCenter.name, departureTime);
    if (!leg1) return null;

    // Add transfer time
    const transferTime = 10; // minutes
    const secondLegDeparture = new Date(departureTime.getTime() + (leg1.totalTime + transferTime) * 60000);
    
    const leg2 = this.calculateTrainJourney(telAvivCenter.name, toStation.name, secondLegDeparture);
    if (!leg2) return null;

    return {
      available: true,
      fromStation: fromStation.name,
      toStation: toStation.name,
      journeyTime: leg1.journeyTime + leg2.journeyTime,
      waitTime: leg1.waitTime,
      transferTime: transferTime,
      totalTime: leg1.totalTime + transferTime + leg2.journeyTime,
      cost: leg1.cost + leg2.cost,
      transfer: true,
      transferStation: telAvivCenter.name,
      legs: [leg1, leg2]
    };
  }

  // Get bus options between locations
  getBusOptions(fromLocation, toLocation) {
    const route = `${fromLocation} - ${toLocation}`;
    const reverseRoute = `${toLocation} - ${fromLocation}`;
    
    let busInfo = this.busRoutes[route] || this.busRoutes[reverseRoute];
    
    if (!busInfo) {
      // Try partial matches
      for (const [routeKey, routeInfo] of Object.entries(this.busRoutes)) {
        if (routeKey.toLowerCase().includes(fromLocation.toLowerCase()) && 
            routeKey.toLowerCase().includes(toLocation.toLowerCase())) {
          busInfo = routeInfo;
          break;
        }
      }
    }

    if (!busInfo) {
      return {
        available: false,
        reason: 'No direct bus route found'
      };
    }

    return {
      available: true,
      lines: busInfo.lines,
      frequency: busInfo.frequency,
      duration: busInfo.duration,
      cost: 5.90 // Standard Israeli bus fare
    };
  }

  // Compare transport options for a journey
  compareTransportOptions(fromLocation, toLocation, departureTime = new Date()) {
    const options = {
      car: this.getCarOption(fromLocation, toLocation, departureTime),
      train: this.calculateTrainJourney(fromLocation, toLocation, departureTime),
      bus: this.getBusOptions(fromLocation, toLocation)
    };

    // Rank options by total time
    const availableOptions = Object.entries(options)
      .filter(([_, option]) => option && option.available !== false)
      .sort(([_, a], [__, b]) => {
        const timeA = a.totalTime || a.duration || 0;
        const timeB = b.totalTime || b.duration || 0;
        return timeA - timeB;
      });

    return {
      options,
      recommended: availableOptions.length > 0 ? availableOptions[0] : null,
      analysis: this.analyzeTransportOptions(options, departureTime)
    };
  }

  // Get car option (from existing logic)
  getCarOption(fromLocation, toLocation, departureTime) {
    // This would integrate with existing travel time calculation
    const hour = departureTime.getHours();
    const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 15 && hour <= 19);
    
    // Simplified car time calculation
    const baseTime = this.getBaseDrivingTime(fromLocation, toLocation);
    const multiplier = isRushHour ? 1.5 : 1.0;
    
    return {
      available: true,
      duration: Math.round(baseTime * multiplier),
      cost: this.calculateFuelCost(baseTime),
      parking: 'Consider parking availability and costs'
    };
  }

  // Helper methods
  calculateRailDistance(station1, station2) {
    // Simplified distance calculation - in reality would use proper coordinates
    const distances = {
      'Kfar Saba-Kfar Chabad': 45,
      'Kfar Saba-Tel Aviv Center': 30,
      'Kfar Chabad-Tel Aviv Center': 20
    };
    
    const key1 = `${station1.name}-${station2.name}`;
    const key2 = `${station2.name}-${station1.name}`;
    
    return distances[key1] || distances[key2] || 30;
  }

  calculateTrainCost(fromStation, toStation) {
    // Israeli rail pricing is zone-based
    const distance = this.calculateRailDistance(fromStation, toStation);
    if (distance <= 20) return 6.80;
    if (distance <= 40) return 10.50;
    return 15.30;
  }

  getBaseDrivingTime(from, to) {
    // Integrate with existing travel time data
    const fromNorm = this.normalizeLocation(from);
    const toNorm = this.normalizeLocation(to);
    
    const times = {
      'Kfar Saba-Beit Dagan': 30,
      'Kfar Saba-Rishon Lezion': 35,
      'Beit Dagan-Rishon Lezion': 5,
      'Kfar Saba-Nir Tzvi': 35,
      'Beit Dagan-Nir Tzvi': 15,
      'Rishon Lezion-Nir Tzvi': 15
    };
    
    const key1 = `${fromNorm}-${toNorm}`;
    const key2 = `${toNorm}-${fromNorm}`;
    
    return times[key1] || times[key2] || 30;
  }

  normalizeLocation(location) {
    const loc = location.toLowerCase();
    if (loc.includes('kfar saba')) return 'Kfar Saba';
    if (loc.includes('beit dagan')) return 'Beit Dagan';
    if (loc.includes('rishon')) return 'Rishon Lezion';
    if (loc.includes('nir tzvi') || loc.includes('tennis')) return 'Nir Tzvi';
    return location;
  }

  calculateFuelCost(durationMinutes) {
    // Rough estimate: 1 liter per 10km, 6 NIS per liter, 60 km/h average
    const distance = (durationMinutes / 60) * 60; // km
    const liters = distance / 10;
    return Math.round(liters * 6);
  }

  getNextDepartures(line, schedule, currentTime) {
    const departures = [];
    const frequency = schedule.frequency;
    const firstTrain = this.timeStringToMinutes(schedule.firstTrain);
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    let nextDeparture = Math.ceil((currentMinutes - firstTrain) / frequency) * frequency + firstTrain;
    
    for (let i = 0; i < 3; i++) {
      const hours = Math.floor(nextDeparture / 60);
      const minutes = nextDeparture % 60;
      departures.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      nextDeparture += frequency;
    }
    
    return departures;
  }

  timeStringToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  analyzeTransportOptions(options, departureTime) {
    const analysis = [];
    const hour = departureTime.getHours();
    const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 15 && hour <= 19);

    if (options.train && options.train.available) {
      if (isRushHour && options.car) {
        const timeSaving = (options.car.duration || 0) - options.train.totalTime;
        if (timeSaving > 10) {
          analysis.push(`Train saves ${timeSaving} minutes during rush hour`);
        }
      }
      if (options.train.transfer) {
        analysis.push('Train requires transfer - factor in extra time');
      }
    }

    if (options.bus && options.bus.available && options.car) {
      analysis.push('Bus is most economical but may take longer');
    }

    if (isRushHour) {
      analysis.push('Rush hour - public transport recommended');
    }

    return analysis;
  }

  // Method to get transport recommendations for AI
  getTransportRecommendation(fromLocation, toLocation, departureTime, preferences = {}) {
    const comparison = this.compareTransportOptions(fromLocation, toLocation, departureTime);
    
    let recommendation = {
      primary: comparison.recommended,
      alternatives: Object.entries(comparison.options)
        .filter(([key, _]) => key !== comparison.recommended?.[0])
        .map(([key, option]) => ({ type: key, ...option })),
      analysis: comparison.analysis,
      contextual_advice: []
    };

    // Add contextual advice
    if (preferences.avoidRushHour && this.isRushHour(departureTime)) {
      recommendation.contextual_advice.push("Consider departing earlier to avoid rush hour traffic");
    }

    if (comparison.options.train?.available) {
      recommendation.contextual_advice.push("Train offers predictable journey time and avoids traffic");
    }

    return recommendation;
  }

  isRushHour(time) {
    const hour = time.getHours();
    return (hour >= 7 && hour <= 10) || (hour >= 15 && hour <= 19);
  }
}

// Export singleton instance
export default new PublicTransportService();
