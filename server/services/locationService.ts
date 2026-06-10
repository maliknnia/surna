// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Location Service - Google Maps API integration for backend geocoding and places
import { Client } from '@googlemaps/google-maps-services-js';

const googleMapsClient = new Client({});

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  location: Location;
  types: string[];
  rating?: number;
  priceLevel?: number;
}

export interface GeocodingResult {
  address: string;
  location: Location;
  formattedAddress: string;
}

export class LocationService {
  private static apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Geocode an address to get coordinates
  static async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return null;
    }

    try {
      const response = await googleMapsClient.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          address,
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
          formattedAddress: result.formatted_address,
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to get address
  static async reverseGeocode(location: Location): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return null;
    }

    try {
      const response = await googleMapsClient.reverseGeocode({
        params: {
          latlng: `${location.lat},${location.lng}`,
          key: this.apiKey,
        },
      });

      if (response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Find places near a location
  static async findNearbyPlaces(
    location: Location,
    radius: number = 5000,
    type: string = 'gym'
  ): Promise<Place[]> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return [];
    }

    try {
      const response = await googleMapsClient.placesNearby({
        params: {
          location: `${location.lat},${location.lng}`,
          radius,
          type,
          key: this.apiKey,
        },
      });

      return response.data.results.map(place => ({
        placeId: place.place_id!,
        name: place.name!,
        address: place.vicinity || '',
        location: {
          lat: place.geometry!.location.lat,
          lng: place.geometry!.location.lng,
        },
        types: place.types || [],
        rating: place.rating,
        priceLevel: place.price_level,
      }));
    } catch (error) {
      console.error('Error finding nearby places:', error);
      return [];
    }
  }

  // Search for places by text query
  static async searchPlaces(query: string, location?: Location): Promise<Place[]> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return [];
    }

    try {
      const params: any = {
        query,
        key: this.apiKey,
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
        params.radius = 50000; // 50km radius
      }

      const response = await googleMapsClient.textSearch({
        params,
      });

      return response.data.results.map(place => ({
        placeId: place.place_id!,
        name: place.name!,
        address: place.formatted_address || '',
        location: {
          lat: place.geometry!.location.lat,
          lng: place.geometry!.location.lng,
        },
        types: place.types || [],
        rating: place.rating,
        priceLevel: place.price_level,
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  // Get place details
  static async getPlaceDetails(placeId: string): Promise<Place | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return null;
    }

    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
        },
      });

      const place = response.data.result;
      return {
        placeId: place.place_id!,
        name: place.name!,
        address: place.formatted_address || '',
        location: {
          lat: place.geometry!.location.lat,
          lng: place.geometry!.location.lng,
        },
        types: place.types || [],
        rating: place.rating,
        priceLevel: place.price_level,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  // Calculate distance between two points
  static calculateDistance(location1: Location, location2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(location2.lat - location1.lat);
    const dLon = this.toRadians(location2.lng - location1.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(location1.lat)) *
        Math.cos(this.toRadians(location2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Find sports facilities near a location
  static async findSportsFacilities(
    location: Location,
    radius: number = 10000
  ): Promise<Place[]> {
    const facilityTypes = ['gym', 'stadium', 'sports_complex', 'swimming_pool'];
    const allFacilities: Place[] = [];

    for (const type of facilityTypes) {
      try {
        const facilities = await this.findNearbyPlaces(location, radius, type);
        allFacilities.push(...facilities);
      } catch (error) {
        console.error(`Error finding ${type} facilities:`, error);
      }
    }

    // Remove duplicates based on place ID
    const uniqueFacilities = allFacilities.filter(
      (facility, index, self) =>
        index === self.findIndex(f => f.placeId === facility.placeId)
    );

    return uniqueFacilities;
  }

  // Get directions between two locations
  static async getDirections(
    origin: Location,
    destination: Location,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not provided');
      return null;
    }

    try {
      const response = await googleMapsClient.directions({
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode,
          key: this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }
}