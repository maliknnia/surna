// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Location Routes - Google Maps and geolocation API endpoints
import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { LocationService } from "../services/locationService";
import { geocodeQuery, geocodeVenueAddress, reverseGeocodeQuery } from "../services/geocodeService";
import { z } from "zod";
import { isValidEircode } from "@shared/venueAddress";

// Validation schemas
const geocodeSchema = z.object({
  address: z.string().min(1, "Address is required")
});

const reverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

const nearbySearchSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).optional().default(5000),
  type: z.string().optional().default('gym')
});

const placesSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  lat: z.number().optional(),
  lng: z.number().optional()
});

export function registerLocationRoutes(app: Express) {
  // Geocode address to coordinates
  app.post("/api/location/geocode", async (req, res) => {
    try {
      const { address } = geocodeSchema.parse(req.body);
      
      const hit = await geocodeQuery(address);
      
      if (!hit) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      res.json({
        address,
        location: { lat: hit.lat, lng: hit.lng },
        formattedAddress: hit.formattedAddress,
        provider: hit.provider,
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to geocode address" 
      });
    }
  });

  // Reverse geocode coordinates to address
  app.post("/api/location/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = reverseGeocodeSchema.parse(req.body);
      
      const address = await reverseGeocodeQuery(lat, lng);
      
      if (!address) {
        return res.status(404).json({ message: "Address not found for coordinates" });
      }
      
      res.json({ address, lat, lng });
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to reverse geocode" 
      });
    }
  });

  const venueAddressSchema = z.object({
    venueName: z.string().min(1).max(120),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional().default(""),
    townCity: z.string().min(1).max(100),
    county: z.string().min(1).max(80),
    eircode: z.string().min(1).max(12),
    country: z.string().max(80).optional().default("Ireland"),
  });

  app.post("/api/location/geocode-venue", async (req, res) => {
    try {
      const body = venueAddressSchema.parse(req.body);
      if (!isValidEircode(body.eircode)) {
        return res.status(400).json({ message: "Invalid Eircode format" });
      }
      const hit = await geocodeVenueAddress({
        ...body,
        addressLine2: body.addressLine2 ?? "",
      });
      if (!hit) {
        return res.status(404).json({ message: "Could not find this address on the map" });
      }
      res.json({
        lat: hit.lat,
        lng: hit.lng,
        formattedAddress: hit.formattedAddress,
        provider: hit.provider,
      });
    } catch (error) {
      console.error("Error geocoding venue:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to geocode venue",
      });
    }
  });

  // Find nearby places
  app.post("/api/location/nearby", async (req, res) => {
    try {
      const { lat, lng, radius, type } = nearbySearchSchema.parse(req.body);
      
      const places = await LocationService.findNearbyPlaces(
        { lat, lng },
        radius,
        type
      );
      
      res.json(places);
    } catch (error) {
      console.error("Error finding nearby places:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to find nearby places" 
      });
    }
  });

  // Search places by text
  app.post("/api/location/search", async (req, res) => {
    try {
      const { query, lat, lng } = placesSearchSchema.parse(req.body);
      
      const location = lat && lng ? { lat, lng } : undefined;
      const places = await LocationService.searchPlaces(query, location);
      
      res.json(places);
    } catch (error) {
      console.error("Error searching places:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to search places" 
      });
    }
  });

  // Get place details
  app.get("/api/location/place/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;
      
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }
      
      const place = await LocationService.getPlaceDetails(placeId);
      
      if (!place) {
        return res.status(404).json({ message: "Place not found" });
      }
      
      res.json(place);
    } catch (error) {
      console.error("Error getting place details:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get place details" 
      });
    }
  });

  // Find sports facilities near location
  app.post("/api/location/sports-facilities", async (req, res) => {
    try {
      const { lat, lng, radius } = nearbySearchSchema.parse(req.body);
      
      const facilities = await LocationService.findSportsFacilities(
        { lat, lng },
        radius
      );
      
      res.json(facilities);
    } catch (error) {
      console.error("Error finding sports facilities:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to find sports facilities" 
      });
    }
  });

  // Get directions between locations
  app.post("/api/location/directions", async (req, res) => {
    try {
      const schema = z.object({
        origin: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180)
        }),
        destination: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180)
        }),
        mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).optional().default('driving')
      });

      const { origin, destination, mode } = schema.parse(req.body);
      
      const directions = await LocationService.getDirections(origin, destination, mode);
      
      if (!directions) {
        return res.status(404).json({ message: "Directions not found" });
      }
      
      res.json(directions);
    } catch (error) {
      console.error("Error getting directions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get directions" 
      });
    }
  });

  // Calculate distance between two points
  app.post("/api/location/distance", async (req, res) => {
    try {
      const schema = z.object({
        origin: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180)
        }),
        destination: z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180)
        })
      });

      const { origin, destination } = schema.parse(req.body);
      
      const distance = LocationService.calculateDistance(origin, destination);
      
      res.json({ 
        distance_km: distance,
        distance_miles: distance * 0.621371 
      });
    } catch (error) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to calculate distance" 
      });
    }
  });
}